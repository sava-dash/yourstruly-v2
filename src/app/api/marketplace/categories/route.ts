import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── Legacy provider-based category lists (kept for back-compat) ────────────
const GIFT_CATEGORIES = [
  { id: 'all', name: 'All Gifts', slug: 'all', provider: 'gifts' },
  { id: 'food', name: 'Food & Treats', slug: 'food', provider: 'gifts' },
  { id: 'home', name: 'Home & Living', slug: 'home', provider: 'gifts' },
  { id: 'wellness', name: 'Wellness & Self-Care', slug: 'wellness', provider: 'gifts' },
  { id: 'tech', name: 'Tech & Gadgets', slug: 'tech', provider: 'gifts' },
  { id: 'drink', name: 'Drinks & Beverages', slug: 'drink', provider: 'gifts' },
  { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', provider: 'gifts' },
];

const FLOWER_CATEGORIES = [
  { id: 'all', name: 'All Flowers', slug: 'all', provider: 'flowers' },
  { id: 'birthday', name: 'Birthday', slug: 'birthday', provider: 'flowers' },
  { id: 'anniversary', name: 'Anniversary', slug: 'anniversary', provider: 'flowers' },
  { id: 'sympathy', name: 'Sympathy', slug: 'sympathy', provider: 'flowers' },
  { id: 'get-well', name: 'Get Well', slug: 'get-well', provider: 'flowers' },
  { id: 'love-romance', name: 'Love & Romance', slug: 'love-romance', provider: 'flowers' },
];

const PRINT_CATEGORIES = [
  { id: 'all', name: 'All Prints', slug: 'all', provider: 'prints' },
  { id: 'canvas', name: 'Canvas Prints', slug: 'canvas', provider: 'prints' },
  { id: 'wall-art', name: 'Wall Art', slug: 'wall-art', provider: 'prints' },
  { id: 'mugs', name: 'Photo Mugs', slug: 'mugs', provider: 'prints' },
  { id: 'pillows', name: 'Photo Pillows', slug: 'pillows', provider: 'prints' },
  { id: 'blankets', name: 'Photo Blankets', slug: 'blankets', provider: 'prints' },
];

interface CategoryRow {
  slug: string;
  name: string;
  icon: string | null;
  parent_slug: string | null;
  sort_order: number;
  is_occasion: boolean;
}

interface CategoryNode {
  slug: string;
  name: string;
  icon: string | null;
  children: CategoryNode[];
}

// In-memory cache (10 minutes)
const TAB_CACHE = new Map<string, { expiresAt: number; nodes: CategoryNode[] }>();
const TAB_TTL_MS = 10 * 60 * 1000;

async function loadCategoryTree(tab: 'categories' | 'occasions'): Promise<CategoryNode[]> {
  const cached = TAB_CACHE.get(tab);
  if (cached && cached.expiresAt > Date.now()) return cached.nodes;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('slug, name, icon, parent_slug, sort_order, is_occasion')
    .eq('is_occasion', tab === 'occasions')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('categories query error:', error);
    return [];
  }

  // Build tree keyed by slug
  const bySlug = new Map<string, CategoryNode>();
  for (const row of data as CategoryRow[]) {
    bySlug.set(row.slug, { slug: row.slug, name: row.name, icon: row.icon, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const row of data as CategoryRow[]) {
    const node = bySlug.get(row.slug)!;
    if (row.parent_slug && bySlug.has(row.parent_slug)) {
      bySlug.get(row.parent_slug)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  TAB_CACHE.set(tab, { expiresAt: Date.now() + TAB_TTL_MS, nodes: roots });
  return roots;
}

/**
 * GET /api/marketplace/categories
 *
 * New (ongoody-IA) usage:
 *   ?tab=categories  → returns the Categories-tab tree
 *   ?tab=occasions   → returns the Occasions-tab tree
 *
 * Legacy usage (kept for back-compat with existing UI):
 *   ?provider=gifts|flowers|prints|all → flat list
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tab = searchParams.get('tab');

    // New tree API
    if (tab === 'categories' || tab === 'occasions') {
      const tree = await loadCategoryTree(tab);
      return NextResponse.json(
        { tab, categories: tree },
        { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=300' } }
      );
    }

    // Legacy provider API
    const providerParam = searchParams.get('provider') || 'all';
    let categories: typeof GIFT_CATEGORIES = [];

    switch (providerParam) {
      case 'gifts':
      case 'goody':
        categories = GIFT_CATEGORIES;
        break;
      case 'flowers':
      case 'floristone':
        categories = FLOWER_CATEGORIES;
        break;
      case 'prints':
      case 'prodigi':
        categories = PRINT_CATEGORIES;
        break;
      case 'all':
      default:
        categories = [
          ...GIFT_CATEGORIES.map(c => ({ ...c, id: `gifts-${c.id}` })),
          ...FLOWER_CATEGORIES.map(c => ({ ...c, id: `flowers-${c.id}` })),
          ...PRINT_CATEGORIES.map(c => ({ ...c, id: `prints-${c.id}` })),
        ];
        break;
    }

    return NextResponse.json({ provider: providerParam, categories });
  } catch (err) {
    console.error('Marketplace categories API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
