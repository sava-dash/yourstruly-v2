/**
 * Multi-source book search.
 *
 * Google Books alone returns narrow/misleading results for short one-word
 * queries (e.g., "Bible" surfaces books ABOUT the Bible, not the text itself).
 * We broaden results by:
 *   1. Prepending matches from a curated canonical list (sacred texts, etc.)
 *   2. Dual Google Books queries: plain free-text AND `intitle:"..."`
 *   3. Merging Open Library results (better for classic / academic titles)
 *   4. De-duping by lowercase(title + firstAuthor)
 *   5. Capping at 20 results
 *
 * Provider failures are silently skipped so one network error doesn't nuke
 * the whole list.
 */

import { matchCanonicalBooks } from './canonical-books'

export interface BookResult {
  name: string
  artist?: string // author (keeps shape consistent with ListItemCard's search results)
  year?: string
  imageUrl?: string
  externalUrl?: string
}

function dedupeKey(r: BookResult): string {
  const title = r.name.trim().toLowerCase()
  const author = (r.artist || '').split(',')[0].trim().toLowerCase()
  return `${title}|${author}`
}

async function fetchGoogleBooks(query: string): Promise<BookResult[]> {
  try {
    const plain = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&orderBy=relevance&printType=books`
    const intitle = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:"${query}"`)}&maxResults=40&orderBy=relevance&printType=books`

    const [plainRes, titleRes] = await Promise.all([
      fetch(plain).then(r => r.json()).catch(() => null),
      fetch(intitle).then(r => r.json()).catch(() => null),
    ])

    const merge: any[] = []
    if (plainRes?.items) merge.push(...plainRes.items)
    if (titleRes?.items) merge.push(...titleRes.items)

    return merge
      .filter((r: any) => r.volumeInfo?.title)
      .map((r: any) => {
        const authors = r.volumeInfo?.authors || []
        const authorStr = authors.length > 0 ? authors.slice(0, 2).join(', ') : 'Unknown author'
        const pubDate = r.volumeInfo?.publishedDate || ''
        const pubYear = pubDate.slice(0, 4)
        const thumb = r.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:')
        return {
          name: r.volumeInfo.title as string,
          artist: authorStr,
          year: pubYear,
          imageUrl: thumb,
          externalUrl: r.volumeInfo?.previewLink || r.volumeInfo?.infoLink,
        } as BookResult
      })
  } catch {
    return []
  }
}

async function fetchOpenLibrary(query: string): Promise<BookResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,first_publish_year,cover_i`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const docs: any[] = data?.docs || []
    return docs
      .filter(d => d.title)
      .map(d => {
        const author = Array.isArray(d.author_name) && d.author_name.length > 0
          ? d.author_name.slice(0, 2).join(', ')
          : 'Unknown author'
        const cover = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined
        return {
          name: d.title as string,
          artist: author,
          year: d.first_publish_year ? String(d.first_publish_year) : undefined,
          imageUrl: cover,
          externalUrl: d.key ? `https://openlibrary.org${d.key}` : undefined,
        } as BookResult
      })
  } catch {
    return []
  }
}

export async function searchBooks(rawQuery: string): Promise<BookResult[]> {
  const query = rawQuery.trim()
  if (query.length < 2) return []

  // 1. Canonical curated hits — prepended so Bible/Quran/etc. are guaranteed top.
  const canonical = matchCanonicalBooks(query).map(c => ({
    name: c.title,
    artist: c.author,
    year: c.year,
    imageUrl: c.imageUrl,
    externalUrl: c.externalUrl,
  } as BookResult))

  // 2. Parallel external sources (silent on failure)
  const [googleResults, openLibResults] = await Promise.all([
    fetchGoogleBooks(query),
    fetchOpenLibrary(query),
  ])

  // 3. Merge + de-dupe
  const seen = new Set<string>()
  const out: BookResult[] = []

  for (const r of [...canonical, ...googleResults, ...openLibResults]) {
    const key = dedupeKey(r)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
    if (out.length >= 20) break
  }

  return out
}
