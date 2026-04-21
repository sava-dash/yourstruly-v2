import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractedData {
  location?: string;
  date?: string;
  description?: string;
  people?: string[];
  mood?: string;
  personalPlace?: { id: string; name: string; lat: number | null; lng: number | null } | null;
  needsLocationClarification?: boolean;
  rawLocationText?: string;
}

interface ResolvedPerson {
  name: string;
  contactId: string | null;
  contactName: string | null;
  relationship: string | null;
  isNew: boolean;
  /** True when the match was made via a relationship word ("my father"
      → user's father contact). The client should confirm before
      auto-selecting, since the spoken word might refer to someone
      other than the default relationship holder. */
  matchedByRelation?: boolean;
  /** True when the spoken name is itself a relation word (e.g. "father",
      "mom") rather than a proper name. Used by the client to skip the
      "create a new contact called Father" flow when no match is found. */
  isRelationWord?: boolean;
}

const SYSTEM_PROMPT = `You are a structured data extractor for a personal memory/story app. Given a voice transcript and optional context, extract the following fields as JSON:

- location: The place name or address mentioned (string or null)
- date: Any date or time reference, normalized to ISO format if possible, otherwise keep as spoken (string or null)
- description: A concise 1-2 sentence summary of what happened (string or null)
- people: Array of people's names mentioned (string[] or empty array)
- mood: The emotional tone — one of: happy, sad, nostalgic, excited, peaceful, bittersweet, proud, grateful, funny, reflective, loving, anxious (string or null)
- rawLocationText: The exact location text as spoken in the transcript, before any normalization (string or null)
- needsLocationClarification: true if the location is ambiguous or informal (e.g. "grandma's house", "the lake") and would benefit from the user confirming a specific address (boolean)

RULES:
1. Output ONLY valid JSON, no markdown, no explanation.
2. If a field cannot be determined, set it to null (or empty array for people).
3. For location, preserve informal place names like "grandma's house" or "the cabin" — these may match a personal place.
4. For date, accept relative references like "last summer" or "when I was 10" — normalize if possible.
5. For people, extract first names and relationships (e.g. "Mom", "Uncle Joe", "Sarah").
6. For mood, pick the single best match from the list above.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transcript, context } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript is required and must be a string' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Cap transcript length to keep the Anthropic call fast and avoid
    // ALB idle-timeout 503s on very long stories.
    const cappedTranscript = transcript.length > 4000 ? transcript.slice(0, 4000) : transcript;

    const userMessage = context
      ? `Context: ${context}\n\nTranscript: ${cappedTranscript}`
      : `Transcript: ${cappedTranscript}`;

    let rawText = '{}';
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      rawText = textBlock?.type === 'text' ? textBlock.text : '{}';
    } catch (claudeErr: any) {
      console.error('[voice/extract] Anthropic call failed:', {
        name: claudeErr?.name,
        message: claudeErr?.message,
        status: claudeErr?.status,
        error: claudeErr?.error,
      });
      return NextResponse.json(
        { error: 'AI service unavailable', detail: claudeErr?.message || 'unknown' },
        { status: 502 }
      );
    }

    // Strip optional markdown fences defensively — some models add them
    // even when asked not to.
    const cleanedText = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

    let extracted: ExtractedData;
    try {
      extracted = JSON.parse(cleanedText);
    } catch {
      console.error('[voice/extract] JSON parse failed. raw text:', cleanedText.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: cleanedText.slice(0, 500) },
        { status: 502 }
      );
    }

    // Look up personal place if a location was extracted
    let personalPlace: ExtractedData['personalPlace'] = null;

    if (extracted.rawLocationText || extracted.location) {
      const locationText = (extracted.rawLocationText || extracted.location || '').toLowerCase();

      const { data: places } = await supabase
        .from('personal_places')
        .select('id, name, aliases, lat, lng, use_count')
        .eq('user_id', user.id);

      if (places && places.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = places.find((place: any) => {
          const nameLower = (place.name as string).toLowerCase();
          const aliases = (place.aliases as string[] | null) ?? [];
          const nameMatch = nameLower === locationText;
          const aliasMatch = aliases.some(
            (alias: string) => alias.toLowerCase() === locationText
          );
          const partialNameMatch = locationText.includes(nameLower);
          const partialAliasMatch = aliases.some(
            (alias: string) => locationText.includes(alias.toLowerCase())
          );
          return nameMatch || aliasMatch || partialNameMatch || partialAliasMatch;
        });

        if (match) {
          personalPlace = {
            id: match.id,
            name: match.name,
            lat: match.lat,
            lng: match.lng,
          };

          // Increment use_count
          const currentCount = (match.use_count as number) ?? 1;
          await supabase
            .from('personal_places')
            .update({ use_count: currentCount + 1, updated_at: new Date().toISOString() })
            .eq('id', match.id);
        }
      }
    }

    // Resolve mentioned people against user's contacts
    let resolvedPeople: ResolvedPerson[] = [];
    const peopleNames = extracted.people ?? [];

    if (peopleNames.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, nickname, relationship_type')
        .eq('user_id', user.id);

      const allContacts = contacts || [];

      // Nickname → canonical relationship_type.
      // Both sides are canonical (mother/father/etc.), so we can also look
      // up by the canonical form directly below.
      const relationshipMap: Record<string, string> = {
        'mom': 'mother', 'mama': 'mother', 'ma': 'mother', 'mommy': 'mother', 'mother': 'mother', 'mum': 'mother', 'mummy': 'mother',
        'dad': 'father', 'papa': 'father', 'pa': 'father', 'daddy': 'father', 'father': 'father', 'pop': 'father', 'pops': 'father',
        'grandma': 'grandmother', 'nana': 'grandmother', 'granny': 'grandmother', 'gram': 'grandmother', 'grandmother': 'grandmother', 'grammy': 'grandmother',
        'grandpa': 'grandfather', 'granddad': 'grandfather', 'gramps': 'grandfather', 'grandfather': 'grandfather',
        'wife': 'spouse', 'husband': 'spouse', 'hubby': 'spouse', 'spouse': 'spouse', 'partner': 'partner',
        'bro': 'brother', 'brother': 'brother',
        'sis': 'sister', 'sister': 'sister',
        'son': 'son', 'daughter': 'daughter', 'kid': 'child', 'child': 'child',
        'uncle': 'uncle', 'aunt': 'aunt', 'auntie': 'aunt',
        'cousin': 'cousin',
        'nephew': 'nephew', 'niece': 'niece',
        'mother-in-law': 'mother_in_law', 'father-in-law': 'father_in_law',
        'brother-in-law': 'brother_in_law', 'sister-in-law': 'sister_in_law',
        'stepmom': 'stepmother', 'stepdad': 'stepfather', 'stepmother': 'stepmother', 'stepfather': 'stepfather',
        'stepbrother': 'stepbrother', 'stepsister': 'stepsister',
        'boyfriend': 'partner', 'girlfriend': 'partner',
        'friend': 'friend', 'bff': 'friend', 'bestie': 'friend',
      };

      // Strip leading articles / possessives Claude sometimes emits
      // ("my mother", "The father") so we can key the map cleanly.
      const normalizeSpoken = (s: string): string =>
        s.toLowerCase().trim().replace(/^(my|our|the|a|an)\s+/i, '').trim();

      resolvedPeople = peopleNames.map((spokenName: string) => {
        const nameLower = normalizeSpoken(spokenName);
        const isRelationWord = nameLower in relationshipMap;

        // 1. Exact match on full_name or nickname
        const exact = allContacts.find(c =>
          c.full_name?.toLowerCase() === nameLower || c.nickname?.toLowerCase() === nameLower
        );
        if (exact) {
          return {
            name: spokenName,
            contactId: exact.id,
            contactName: exact.full_name,
            relationship: exact.relationship_type,
            isNew: false,
          };
        }

        // 2. First-name / nickname match (skip if the spoken name is a
        //    pure relation word — we don't want "mother" colliding with
        //    a random person whose first name happens to be Mother)
        if (!isRelationWord) {
          const firstName = allContacts.find(c => {
            const fn = c.full_name?.split(' ')[0]?.toLowerCase();
            return fn === nameLower || c.nickname?.toLowerCase() === nameLower;
          });
          if (firstName) {
            return {
              name: spokenName,
              contactId: firstName.id,
              contactName: firstName.full_name,
              relationship: firstName.relationship_type,
              isNew: false,
            };
          }
        }

        // 3. Relation word → canonical type → find contact by relationship_type
        if (isRelationWord) {
          const canonical = relationshipMap[nameLower];
          const rel = allContacts.find(c => c.relationship_type?.toLowerCase() === canonical);
          if (rel) {
            return {
              name: spokenName,
              contactId: rel.id,
              contactName: rel.full_name,
              relationship: rel.relationship_type,
              isNew: false,
              matchedByRelation: true, // flag → client shows "Did you mean?" confirmation
              isRelationWord: true,
            };
          }
          // Relation word with no contact → flag so the client skips the
          // "create a new contact called Father" flow entirely.
          return {
            name: spokenName,
            contactId: null,
            contactName: null,
            relationship: canonical,
            isNew: true,
            isRelationWord: true,
          };
        }

        // 4. Proper name not in contacts → normal "new contact" flow
        return {
          name: spokenName,
          contactId: null,
          contactName: null,
          relationship: null,
          isNew: true,
        };
      });
    }

    return NextResponse.json({
      location: extracted.location ?? null,
      date: extracted.date ?? null,
      description: extracted.description ?? null,
      people: extracted.people ?? [],
      resolvedPeople,
      mood: extracted.mood ?? null,
      personalPlace,
      needsLocationClarification: extracted.needsLocationClarification ?? false,
      rawLocationText: extracted.rawLocationText ?? null,
      hasNewPeople: resolvedPeople.some(p => p.isNew),
    });
  } catch (error) {
    console.error('Voice extract error:', error);
    return NextResponse.json(
      { error: 'Failed to extract data from transcript' },
      { status: 500 }
    );
  }
}
