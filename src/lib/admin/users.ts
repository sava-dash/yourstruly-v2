/**
 * Helper for looking up auth users by email without hitting the
 * silent 1000-row cap on `admin.auth.admin.listUsers()`.
 *
 * Strategy:
 *   1. Try the `profiles` table (which mirrors auth user ids and carries
 *      `email`). This is the cheapest and most reliable path.
 *   2. Fall back to paginated listUsers (1000/page) until we find the
 *      email or run out of pages. This handles edge cases where a
 *      profile row wasn't created (e.g. legacy users).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findAuthUserIdByEmail(admin: any, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  // (1) profiles table — has email on all modern rows.
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', normalized)
      .maybeSingle();
    if (profile?.id) return profile.id as string;
  } catch {
    // non-blocking; fall through
  }

  // (2) Paginated listUsers fallback.
  try {
    const perPage = 1000;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const users = data?.users ?? [];
      const found = users.find((u: { email?: string | null }) =>
        (u.email || '').toLowerCase() === normalized
      );
      if (found) return found.id as string;
      if (users.length < perPage) break; // last page
    }
  } catch {
    // swallow; caller treats null as "not found" and will create
  }

  return null;
}
