import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/postscripts/[id]/gifts - List gifts attached to a postscript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify postscript ownership
  const { data: postscript } = await supabase
    .from('postscripts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!postscript) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  const { data: gifts, error } = await supabase
    .from('postscript_gifts')
    .select('*')
    .eq('postscript_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching postscript gifts:', error)
    return NextResponse.json({ error: 'Failed to load gifts' }, { status: 500 })
  }

  return NextResponse.json({ gifts })
}

// POST /api/postscripts/[id]/gifts - Attach a gift to a postscript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify postscript ownership
  const { data: postscript } = await supabase
    .from('postscripts')
    .select('id, recipient_contact_id, recipient_name, delivery_type, delivery_date, delivery_event')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!postscript) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  const body = await request.json()
  const {
    product_id,
    provider,
    name,
    description,
    image_url,
    price,
    original_price,
    currency = 'USD',
    quantity = 1,
    provider_data = {},
    delivery_timing = 'with_postscript',
    delivery_date,
    delivery_event,
    delivery_offset_days = 0
  } = body

  // Validate required fields
  if (!product_id || !provider || !name || !price) {
    return NextResponse.json(
      { error: 'Product ID, provider, name, and price are required' },
      { status: 400 }
    )
  }

  // Create the gift attachment
  const { data: gift, error } = await supabase
    .from('postscript_gifts')
    .insert({
      postscript_id: id,
      user_id: user.id, // Required by legacy NOT NULL + RLS
      product_id,
      // provider column omitted — defaults at DB level; avoids PGRST204
      // when PostgREST schema cache is stale.
      name,
      title: name, // Legacy NOT NULL column
      code: product_id || 'goody', // Legacy NOT NULL column
      market: 'goody', // Legacy NOT NULL column
      description,
      image_url,
      price,
      original_price,
      // currency defaults to 'USD' at the DB level; omit to avoid PGRST204
      // when the PostgREST schema cache is briefly stale post-migration.
      quantity,
      qty: quantity, // Legacy NOT NULL column alongside quantity
      provider_data,
      delivery_timing,
      delivery_date,
      delivery_event,
      delivery_offset_days,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating postscript gift:', error)
    return NextResponse.json({ error: 'Failed to attach gift' }, { status: 500 })
  }

  // Update postscript has_gift flag if not already set
  await supabase
    .from('postscripts')
    .update({ has_gift: true })
    .eq('id', id)

  return NextResponse.json({ gift }, { status: 201 })
}

// DELETE /api/postscripts/[id]/gifts - Remove all gifts from a postscript (bulk delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify postscript ownership
  const { data: postscript } = await supabase
    .from('postscripts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!postscript) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('postscript_gifts')
    .delete()
    .eq('postscript_id', id)

  if (error) {
    console.error('Error deleting postscript gifts:', error)
    return NextResponse.json({ error: 'Failed to remove gifts' }, { status: 500 })
  }

  // Update postscript has_gift flag
  await supabase
    .from('postscripts')
    .update({ has_gift: false })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
