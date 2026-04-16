import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

interface IncomingProduct {
  name: string;
  brand_name: string;
  brand_slug?: string;
  description?: string;
  base_price_cents: number;
  sale_price_cents?: number;
  images?: string[];
  categories?: string[];
  scope?: string[];
  occasions?: string[];
  in_stock?: boolean;
  is_active?: boolean;
  is_curated?: boolean;
  curated_score?: number;
  why_we_love_it?: string;
  emotional_impact?: 'high' | 'medium' | 'low';
  external_id?: string;
}

interface BulkImportResult {
  inserted: number;
  skipped: number;
  errors: Array<{ index: number; name?: string; reason: string }>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function isValidEntry(raw: unknown): raw is IncomingProduct {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.trim().length === 0) return false;
  if (typeof r.brand_name !== 'string' || r.brand_name.trim().length === 0) return false;
  if (typeof r.base_price_cents !== 'number' || !Number.isFinite(r.base_price_cents)) return false;
  if (r.base_price_cents < 0) return false;
  return true;
}

/**
 * POST /api/admin/marketplace/bulk-import
 *
 * Body: { products: IncomingProduct[] }
 *
 * Response: { inserted, skipped, errors }
 *
 * Auto-behavior:
 *   - brand_slug defaults to slugify(brand_name) when missing
 *   - starting_price_cents = base_price_cents when no variants
 *   - is_active/in_stock default to true
 *   - is_curated defaults to true with curated_score = 75
 */
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const products = (body as { products?: unknown })?.products;
  if (!Array.isArray(products)) {
    return NextResponse.json(
      { error: 'Expected body shape { products: [...] }' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const result: BulkImportResult = { inserted: 0, skipped: 0, errors: [] };

  for (let i = 0; i < products.length; i += 1) {
    const raw = products[i];
    if (!isValidEntry(raw)) {
      result.skipped += 1;
      result.errors.push({
        index: i,
        name: typeof (raw as { name?: unknown })?.name === 'string'
          ? ((raw as { name: string }).name)
          : undefined,
        reason: 'Missing required fields (name, brand_name, base_price_cents)',
      });
      continue;
    }

    const brandSlug = raw.brand_slug?.trim() || slugify(raw.brand_name);
    const row = {
      name: raw.name.trim(),
      brand_name: raw.brand_name.trim(),
      brand_slug: brandSlug,
      description: raw.description ?? null,
      provider: 'goody',
      base_price_cents: Math.round(raw.base_price_cents),
      sale_price_cents: typeof raw.sale_price_cents === 'number'
        ? Math.round(raw.sale_price_cents)
        : null,
      starting_price_cents: Math.round(raw.base_price_cents),
      images: Array.isArray(raw.images) ? raw.images : [],
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      scope: Array.isArray(raw.scope) ? raw.scope : [],
      occasions: Array.isArray(raw.occasions) ? raw.occasions : [],
      in_stock: raw.in_stock ?? true,
      is_active: raw.is_active ?? true,
      is_curated: raw.is_curated ?? true,
      curated_score: typeof raw.curated_score === 'number' ? raw.curated_score : 75,
      why_we_love_it: raw.why_we_love_it ?? null,
      emotional_impact: raw.emotional_impact ?? 'medium',
      external_id: raw.external_id ?? null,
      created_by: auth.userId,
    };

    const { error } = await supabase.from('marketplace_products').insert(row);
    if (error) {
      result.skipped += 1;
      result.errors.push({ index: i, name: row.name, reason: error.message });
      continue;
    }
    result.inserted += 1;
  }

  return NextResponse.json(result);
}
