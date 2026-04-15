/**
 * Quarterly time capsule aggregation + HTML rendering (F3).
 *
 * `aggregateQuarter` reads memories / wisdom / photos / postscripts from
 * Supabase for the given window and returns a compact SummaryData payload
 * suitable for emailing AND for storing in `time_capsules.summary_json`.
 *
 * `renderHtmlSummary` turns the payload into a standalone HTML page used
 * by /dashboard/timecapsule.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SummaryItem {
  id: string;
  title: string;
  excerpt?: string;
  thumbnailUrl?: string | null;
  createdAt?: string;
}

export interface SummaryData {
  userId: string;
  period: string; // "Q1 2026"
  periodStart: string; // ISO date
  periodEnd: string;
  memoriesCount: number;
  photosCount: number;
  wisdomCount: number;
  postscriptsCount: number;
  topMemories: SummaryItem[];
  topWisdom: SummaryItem[];
  topPhotos: SummaryItem[];
}

export function quarterLabel(d: Date): { period: string; start: Date; end: Date } {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const q = Math.floor(month / 3) + 1;
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1));
  const end = new Date(Date.UTC(year, q * 3, 0, 23, 59, 59));
  return { period: `Q${q} ${year}`, start, end };
}

/** Returns the *previous* quarter window relative to `now`. */
export function previousQuarter(now: Date = new Date()): { period: string; start: Date; end: Date } {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 15));
  return quarterLabel(prev);
}

export async function aggregateQuarter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  period: string,
): Promise<SummaryData> {
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();

  const [memoriesRes, photosRes, wisdomRes, postscriptsRes] = await Promise.all([
    supabase
      .from('memories')
      .select('id, title, content, created_at')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('memories')
      .select('id, title, photo_url, created_at')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('wisdom')
      .select('id, title, content, created_at')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('postscripts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  const [memoriesCountRes, photosCountRes, wisdomCountRes] = await Promise.all([
    supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .not('photo_url', 'is', null),
    supabase
      .from('wisdom')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toItem = (row: any, photo = false): SummaryItem => ({
    id: row.id,
    title: row.title || (row.content ? String(row.content).slice(0, 60) : 'Untitled'),
    excerpt: row.content ? String(row.content).slice(0, 180) : undefined,
    thumbnailUrl: photo ? row.photo_url ?? null : null,
    createdAt: row.created_at,
  });

  return {
    userId,
    period,
    periodStart: startISO,
    periodEnd: endISO,
    memoriesCount: memoriesCountRes.count ?? 0,
    photosCount: photosCountRes.count ?? 0,
    wisdomCount: wisdomCountRes.count ?? 0,
    postscriptsCount: postscriptsRes.count ?? 0,
    topMemories: ((memoriesRes.data ?? []) as unknown[]).map((r) => toItem(r)),
    topWisdom: ((wisdomRes.data ?? []) as unknown[]).map((r) => toItem(r)),
    topPhotos: ((photosRes.data ?? []) as unknown[]).map((r) => toItem(r, true)),
  };
}

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

export function renderHtmlSummary(data: SummaryData): string {
  const stat = (label: string, value: number) => `
    <div style="background:${CREAM};border-radius:14px;padding:18px;text-align:center;flex:1;">
      <div style="font-family:Playfair Display,Georgia,serif;font-size:30px;font-weight:700;color:${YT_GREEN};">${value}</div>
      <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${label}</div>
    </div>`;

  const section = (title: string, items: SummaryItem[]) => {
    if (!items.length) return '';
    const rows = items
      .map(
        (it) => `<li style="padding:12px 0;border-top:1px solid ${GREEN_LIGHT};list-style:none;">
        <div style="font-weight:600;color:${INK};">${escapeHtml(it.title)}</div>
        ${it.excerpt ? `<div style="font-size:13px;color:${MUTED};margin-top:4px;">${escapeHtml(it.excerpt)}</div>` : ''}
      </li>`,
      )
      .join('');
    return `<section style="margin-top:28px;">
      <h2 style="font-family:Playfair Display,Georgia,serif;color:${YT_GREEN};font-size:22px;margin:0 0 8px;">${escapeHtml(title)}</h2>
      <ul style="margin:0;padding:0;">${rows}</ul>
    </section>`;
  };

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(data.period)} Time Capsule</title></head>
<body style="margin:0;background:${CREAM};font-family:Inter Tight,system-ui,sans-serif;color:${INK};padding:32px 16px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid ${GREEN_LIGHT};border-radius:20px;padding:36px;">
    <h1 style="font-family:Playfair Display,Georgia,serif;color:${YT_GREEN};font-size:32px;margin:0 0 4px;">${escapeHtml(data.period)} time capsule</h1>
    <p style="color:${MUTED};margin:0 0 24px;">A quiet look back at what you captured.</p>
    <div style="display:flex;gap:12px;margin-bottom:8px;">
      ${stat('Memories', data.memoriesCount)}
      ${stat('Photos', data.photosCount)}
      ${stat('Wisdom', data.wisdomCount)}
      ${stat('Postscripts', data.postscriptsCount)}
    </div>
    ${section('Memories worth remembering', data.topMemories)}
    ${section('Photos that stayed with you', data.topPhotos)}
    ${section('Wisdom you shared', data.topWisdom)}
    <p style="margin-top:28px;color:${MUTED};font-size:13px;">Generated by YoursTruly · <a style="color:${TERRA};" href="/dashboard">Back to dashboard</a></p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}
