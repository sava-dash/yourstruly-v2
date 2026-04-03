import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/postscripts/[id]/gifts/[giftId] - Remove a specific gift
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; giftId: string }> }
) {
  const supabase = await createClient()
  const { id, giftId } = await params
  
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

  // Delete the specific gift
  const { error } = await supabase
    .from('postscript_gifts')
    .delete()
    .eq('id', giftId)
    .eq('postscript_id', id)

  if (error) {
    console.error('Error deleting postscript gift:', error)
    return NextResponse.json({ error: 'Failed to remove gift' }, { status: 500 })
  }

  // Check if there are any remaining gifts
  const { data: remainingGifts } = await supabase
    .from('postscript_gifts')
    .select('id')
    .eq('postscript_id', id)
    .limit(1)

  // Update postscript has_gift flag if no gifts remain
  if (!remainingGifts || remainingGifts.length === 0) {
    await supabase
      .from('postscripts')
      .update({ has_gift: false })
      .eq('id', id)
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/postscripts/[id]/gifts/[giftId] - Update a gift (status, delivery timing, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; giftId: string }> }
) {
  const supabase = await createClient()
  const { id, giftId } = await params
  
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

  const body = await request.json()
  const {
    status,
    delivery_timing,
    delivery_date,
    delivery_event,
    delivery_offset_days,
    quantity
  } = body

  // Build update object with only provided fields
  const updateData: Record<string, any> = {}
  if (status !== undefined) updateData.status = status
  if (delivery_timing !== undefined) updateData.delivery_timing = delivery_timing
  if (delivery_date !== undefined) updateData.delivery_date = delivery_date
  if (delivery_event !== undefined) updateData.delivery_event = delivery_event
  if (delivery_offset_days !== undefined) updateData.delivery_offset_days = delivery_offset_days
  if (quantity !== undefined) updateData.quantity = quantity

  // Set timestamps based on status changes
  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString()
  } else if (status === 'ordered') {
    updateData.ordered_at = new Date().toISOString()
  } else if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { data: gift, error } = await supabase
    .from('postscript_gifts')
    .update(updateData)
    .eq('id', giftId)
    .eq('postscript_id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating postscript gift:', error)
    return NextResponse.json({ error: 'Failed to update gift' }, { status: 500 })
  }

  return NextResponse.json({ gift })
}

// GET /api/postscripts/[id]/gifts/[giftId] - Get a specific gift
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; giftId: string }> }
) {
  const supabase = await createClient()
  const { id, giftId } = await params
  
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

  const { data: gift, error } = await supabase
    .from('postscript_gifts')
    .select('*')
    .eq('id', giftId)
    .eq('postscript_id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
    }
    console.error('Error fetching postscript gift:', error)
    return NextResponse.json({ error: 'Failed to load gift' }, { status: 500 })
  }

  return NextResponse.json({ gift })
}
