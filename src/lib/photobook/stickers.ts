/**
 * Sticker library manifest.
 *
 * SVGs live in `public/stickers/<category>/<id>.svg`. Keep each file ≤8 KB and
 * prefer line-art / simple fills that read well on any background. Brand palette
 * colors are preferred but not required.
 */

export type StickerCategoryId =
  | "milestones"
  | "seasons"
  | "love"
  | "family"
  | "travel"
  | "abstract"

export interface StickerCategory {
  id: StickerCategoryId
  label: string
}

export interface StickerMeta {
  id: string
  category: StickerCategoryId
  label: string
  svgPath: string
}

export const STICKER_CATEGORIES: readonly StickerCategory[] = [
  { id: "milestones", label: "Milestones" },
  { id: "seasons", label: "Seasons" },
  { id: "love", label: "Love" },
  { id: "family", label: "Family" },
  { id: "travel", label: "Travel" },
  { id: "abstract", label: "Abstract" },
]

function def(
  category: StickerCategoryId,
  id: string,
  label: string
): StickerMeta {
  return { id: `${category}/${id}`, category, label, svgPath: `/stickers/${category}/${id}.svg` }
}

export const STICKERS: readonly StickerMeta[] = [
  // Milestones (7)
  def("milestones", "wedding-rings", "Wedding rings"),
  def("milestones", "baby-carriage", "Baby carriage"),
  def("milestones", "graduation-cap", "Graduation cap"),
  def("milestones", "trophy", "Trophy"),
  def("milestones", "cake", "Birthday cake"),
  def("milestones", "champagne", "Champagne"),
  def("milestones", "gift", "Gift"),

  // Seasons (4)
  def("seasons", "snowflake", "Snowflake"),
  def("seasons", "autumn-leaf", "Autumn leaf"),
  def("seasons", "flower", "Spring flower"),
  def("seasons", "sun", "Summer sun"),

  // Love (4)
  def("love", "heart-filled", "Heart (filled)"),
  def("love", "heart-outline", "Heart (outline)"),
  def("love", "cupid-arrow", "Cupid's arrow"),
  def("love", "bouquet", "Bouquet"),

  // Family (4)
  def("family", "house", "Home"),
  def("family", "paw-print", "Paw print"),
  def("family", "tree", "Family tree"),
  def("family", "handprints", "Handprints"),

  // Travel (5)
  def("travel", "globe", "Globe"),
  def("travel", "airplane", "Airplane"),
  def("travel", "compass", "Compass"),
  def("travel", "suitcase", "Suitcase"),
  def("travel", "map-pin", "Map pin"),

  // Abstract (7)
  def("abstract", "ornate-frame", "Ornate frame"),
  def("abstract", "laurel-wreath", "Laurel wreath"),
  def("abstract", "ribbon-banner", "Ribbon banner"),
  def("abstract", "scroll", "Scroll"),
  def("abstract", "star-burst", "Star burst"),
  def("abstract", "star-cluster", "Star cluster"),
  def("abstract", "divider", "Divider"),
]

export function getStickerById(id: string): StickerMeta | undefined {
  return STICKERS.find((s) => s.id === id)
}

export function getStickersByCategory(category: StickerCategoryId): StickerMeta[] {
  return STICKERS.filter((s) => s.category === category)
}

export function searchStickers(query: string): StickerMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...STICKERS]
  return STICKERS.filter(
    (s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  )
}
