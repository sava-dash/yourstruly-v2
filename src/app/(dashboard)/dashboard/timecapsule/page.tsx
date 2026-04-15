/**
 * /dashboard/timecapsule — list past quarterly time capsules and let the
 * user trigger an ad-hoc generation. Server component for the list; the
 * "Send me one now" button is a client subcomponent below.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GenerateNowButton from './GenerateNowButton';

const YT_GREEN = '#406A56';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

interface CapsuleRow {
  id: string;
  period: string;
  generated_at: string;
  summary_json: {
    memoriesCount?: number;
    photosCount?: number;
    wisdomCount?: number;
    postscriptsCount?: number;
  } | null;
}

export const dynamic = 'force-dynamic';

export default async function TimeCapsulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard/timecapsule');

  const { data: capsules } = await supabase
    .from('time_capsules')
    .select('id, period, generated_at, summary_json')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(40);

  const list = (capsules ?? []) as CapsuleRow[];

  return (
    <main style={{ background: CREAM, minHeight: '100vh', padding: '32px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: YT_GREEN, fontSize: 36, margin: '0 0 6px' }}>
          Your time capsules
        </h1>
        <p style={{ color: MUTED, margin: '0 0 24px', fontSize: 16 }}>
          A quiet quarterly look back at the memories you captured. Future you will thank present you.
        </p>

        <GenerateNowButton />

        <div style={{ marginTop: 24 }}>
          {list.length === 0 ? (
            <div
              style={{
                background: '#fff', border: `1px solid ${GREEN_LIGHT}`, borderRadius: 16,
                padding: 28, textAlign: 'center', color: MUTED,
              }}
            >
              No time capsules yet. The next one will arrive at the start of the quarter.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {list.map((c) => {
                const s = c.summary_json ?? {};
                return (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/timecapsule/${c.id}`}
                      style={{
                        display: 'block', background: '#fff', border: `1px solid ${GREEN_LIGHT}`,
                        borderRadius: 16, padding: 20, textDecoration: 'none', color: INK,
                        minHeight: 88,
                      }}
                    >
                      <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 22, color: YT_GREEN }}>
                        {c.period}
                      </div>
                      <div style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>
                        {(s.memoriesCount ?? 0)} memories · {(s.photosCount ?? 0)} photos · {(s.wisdomCount ?? 0)} wisdom · {(s.postscriptsCount ?? 0)} postscripts
                      </div>
                      <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
                        Generated {new Date(c.generated_at).toLocaleDateString()}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
