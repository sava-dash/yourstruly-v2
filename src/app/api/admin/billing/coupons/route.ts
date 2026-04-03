import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/auth/admin';

// GET /api/admin/billing/coupons
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch coupons:', error);
    return NextResponse.json({ error: 'Failed to load coupons' }, { status: 500 });
  }

  return NextResponse.json({ coupons: coupons || [] });
}

// POST /api/admin/billing/coupons
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert({
      code: body.code,
      description: body.description || null,
      discount_type: body.discount_type,
      discount_value: body.discount_value,
      currency: body.currency || 'USD',
      max_redemptions: body.max_redemptions || null,
      min_purchase_cents: body.min_purchase_cents || null,
      applicable_plans: body.applicable_plans || [],
      starts_at: body.starts_at || new Date().toISOString(),
      expires_at: body.expires_at || null,
      is_active: body.is_active ?? true,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create coupon:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }

  return NextResponse.json({ coupon });
}
