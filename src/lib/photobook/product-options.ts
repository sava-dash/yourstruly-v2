/**
 * Photobook product options + add-ons + pricing math.
 *
 * Single source of truth so editor + checkout never disagree about the running
 * total. All UI labels are written in plain language for our 50+ readers
 * (e.g. "Pages stay open flat" instead of the printer-jargon "lay-flat
 * binding").
 */

export type CoverTypeId = 'hard' | 'soft'
export type PaperFinishId = 'matte' | 'glossy' | 'pearl'
export type BindingId = 'standard' | 'layflat'
export type AddOnId = 'gift_box' | 'premium_print' | 'logo_removal' | 'color_pop'

export interface OptionChoice<TId extends string> {
  id: TId
  label: string
  description: string
  priceDelta: number
}

export interface AddOn {
  id: AddOnId
  label: string
  description: string
  price: number
  /** Used for the recommendation badge on the most popular cards. */
  recommended?: boolean
}

export const COVER_TYPES: OptionChoice<CoverTypeId>[] = [
  {
    id: 'hard',
    label: 'Hard Cover',
    description: 'Sturdy, classic finish. Built to last.',
    priceDelta: 0,
  },
  {
    id: 'soft',
    label: 'Soft Cover',
    description: 'Lighter and easier to mail. Saves $10.',
    priceDelta: -10,
  },
]

export const PAPER_FINISH: OptionChoice<PaperFinishId>[] = [
  {
    id: 'matte',
    label: 'Matte',
    description: 'No glare. Easy to read in any light.',
    priceDelta: 0,
  },
  {
    id: 'glossy',
    label: 'Glossy',
    description: 'Bright, vivid photos with a shiny finish.',
    priceDelta: 3,
  },
  {
    id: 'pearl',
    label: 'Pearl',
    description: 'Soft shimmer. Photo-album feel.',
    priceDelta: 5,
  },
]

export const BINDING: OptionChoice<BindingId>[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Classic book binding.',
    priceDelta: 0,
  },
  {
    id: 'layflat',
    label: 'Lay-Flat',
    description: 'Pages stay open flat. Great for full-spread photos.',
    priceDelta: 8,
  },
]

export const ADD_ONS: AddOn[] = [
  {
    id: 'gift_box',
    label: 'Gift box',
    description: 'Arrives in a keepsake gift box. Perfect for gifting.',
    price: 12,
    recommended: true,
  },
  {
    id: 'premium_print',
    label: 'Premium printing',
    description: 'Richer colors and deeper blacks via 4-color professional print.',
    price: 18,
  },
  {
    id: 'logo_removal',
    label: 'Logo removal',
    description: 'Remove the YoursTruly logo from the back cover for a cleaner look.',
    price: 5,
  },
  {
    id: 'color_pop',
    label: 'Color pop',
    description:
      'Print the book in black & white but keep ONE color visible (great for sentimental tributes).',
    price: 15,
  },
]

export const DEFAULT_PRODUCT_OPTIONS: ProductOptions = {
  coverType: 'hard',
  paperFinish: 'matte',
  binding: 'standard',
}

export interface ProductOptions {
  coverType: CoverTypeId
  paperFinish: PaperFinishId
  binding: BindingId
}

export interface PricingInput {
  basePrice: number
  pricePerPage: number
  minPages: number
  pageCount: number
  options: ProductOptions
  addOns: AddOnId[]
  /** Flat shipping default. Overridable from caller (e.g. expedited). */
  shipping?: number
  /** Tax rate as a decimal. Defaults to 8% as a labelled estimate. */
  taxRate?: number
  /** Internal markup applied to the print subtotal. Mirrors API math. */
  markupPercent?: number
}

export interface PricingLineItem {
  id: string
  label: string
  amount: number
  /** When true, render as "incl" rather than the dollar amount. */
  included?: boolean
}

export interface PricingBreakdown {
  base: PricingLineItem
  extraPages: PricingLineItem | null
  cover: PricingLineItem
  binding: PricingLineItem
  finish: PricingLineItem
  addOns: PricingLineItem[]
  subtotal: number
  shipping: number
  estimatedTax: number
  total: number
}

const DEFAULT_SHIPPING = 5.99
const DEFAULT_TAX_RATE = 0.08
const DEFAULT_MARKUP = 0.3

export function getCoverType(id: CoverTypeId): OptionChoice<CoverTypeId> {
  return COVER_TYPES.find((c) => c.id === id) ?? COVER_TYPES[0]
}
export function getPaperFinish(id: PaperFinishId): OptionChoice<PaperFinishId> {
  return PAPER_FINISH.find((c) => c.id === id) ?? PAPER_FINISH[0]
}
export function getBinding(id: BindingId): OptionChoice<BindingId> {
  return BINDING.find((c) => c.id === id) ?? BINDING[0]
}
export function getAddOn(id: AddOnId): AddOn | undefined {
  return ADD_ONS.find((a) => a.id === id)
}

/**
 * Pure pricing function shared by the editor PricingRail, the Save Project
 * write-through, and the /api/photobook/order POST handler. Keep all money
 * math here so we never duplicate formulas.
 */
export function computePricing(input: PricingInput): PricingBreakdown {
  const shipping = input.shipping ?? DEFAULT_SHIPPING
  const taxRate = input.taxRate ?? DEFAULT_TAX_RATE
  const markupPercent = input.markupPercent ?? DEFAULT_MARKUP

  const cover = getCoverType(input.options.coverType)
  const finish = getPaperFinish(input.options.paperFinish)
  const binding = getBinding(input.options.binding)

  const extraPageCount = Math.max(0, input.pageCount - input.minPages)
  const extraPagesAmount = extraPageCount * input.pricePerPage

  const printSubtotal =
    input.basePrice +
    extraPagesAmount +
    cover.priceDelta +
    finish.priceDelta +
    binding.priceDelta
  const printWithMarkup = printSubtotal * (1 + markupPercent)

  const addOnItems: PricingLineItem[] = input.addOns
    .map((id) => getAddOn(id))
    .filter((a): a is AddOn => Boolean(a))
    .map((a) => ({ id: `addon_${a.id}`, label: a.label, amount: a.price }))

  const addOnsTotal = addOnItems.reduce((sum, item) => sum + item.amount, 0)
  const subtotal = printWithMarkup + addOnsTotal
  const estimatedTax = (subtotal + shipping) * taxRate
  const total = subtotal + shipping + estimatedTax

  return {
    base: {
      id: 'base',
      label: 'Photo book',
      amount: input.basePrice,
    },
    extraPages:
      extraPageCount > 0
        ? {
            id: 'extra_pages',
            label: `${input.pageCount} pages (${extraPageCount} over min)`,
            amount: extraPagesAmount,
          }
        : null,
    cover: {
      id: 'cover',
      label: cover.label,
      amount: cover.priceDelta,
      included: cover.priceDelta === 0,
    },
    binding: {
      id: 'binding',
      label: `${binding.label} binding`,
      amount: binding.priceDelta,
      included: binding.priceDelta === 0,
    },
    finish: {
      id: 'finish',
      label: `${finish.label} finish`,
      amount: finish.priceDelta,
      included: finish.priceDelta === 0,
    },
    addOns: addOnItems,
    subtotal: round2(subtotal),
    shipping: round2(shipping),
    estimatedTax: round2(estimatedTax),
    total: round2(total),
  }
}

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Validate a stored ProductOptions blob coming from JSONB. Falls back to
 *  defaults when fields are missing/unknown so old projects keep working. */
export function normalizeProductOptions(raw: unknown): ProductOptions {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<ProductOptions>
  return {
    coverType: COVER_TYPES.some((c) => c.id === o.coverType)
      ? (o.coverType as CoverTypeId)
      : DEFAULT_PRODUCT_OPTIONS.coverType,
    paperFinish: PAPER_FINISH.some((c) => c.id === o.paperFinish)
      ? (o.paperFinish as PaperFinishId)
      : DEFAULT_PRODUCT_OPTIONS.paperFinish,
    binding: BINDING.some((c) => c.id === o.binding)
      ? (o.binding as BindingId)
      : DEFAULT_PRODUCT_OPTIONS.binding,
  }
}

export function normalizeAddOns(raw: unknown): AddOnId[] {
  if (!Array.isArray(raw)) return []
  const valid = new Set<string>(ADD_ONS.map((a) => a.id))
  return raw.filter((id): id is AddOnId => typeof id === 'string' && valid.has(id))
}
