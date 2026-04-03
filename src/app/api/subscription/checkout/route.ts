import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getStripeServer } from '@/lib/stripe'

const CheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  seats: z.number().int().min(1).max(100).optional().default(2),
  billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
})

// Stripe Price IDs
const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_1T4lnyH94XbyUkwA9PV0uiIz',
  yearly: process.env.STRIPE_PRICE_YEARLY || 'price_1T4ltlH94XbyUkwABUSWR6f7',
}

// Seat pricing
const PREMIUM_BASE_PRICE = 20 // $20/mo includes 2 seats
const SEAT_PRICE_TIER_1 = 8   // $8/seat for seats 3-5
const SEAT_PRICE_TIER_2 = 6   // $6/seat for seats 6-10
const INCLUDED_SEATS = 2

function calculateSeatPrice(seats: number): number {
  let additionalCost = 0
  
  if (seats > INCLUDED_SEATS) {
    // Seats 3-5: $8 each
    const tier1Seats = Math.min(seats - INCLUDED_SEATS, 3)
    additionalCost += tier1Seats * SEAT_PRICE_TIER_1
    
    // Seats 6-10: $6 each
    if (seats > 5) {
      const tier2Seats = seats - 5
      additionalCost += tier2Seats * SEAT_PRICE_TIER_2
    }
  }
  
  return PREMIUM_BASE_PRICE + additionalCost
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CheckoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const { seats, billingCycle } = parsed.data

    // Calculate price
    const monthlyTotal = calculateSeatPrice(seats)
    const yearlyTotal = Math.round(monthlyTotal * 12 * 0.917) // ~8.3% discount

    // Get user profile for customer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, stripe_customer_id')
      .eq('id', user.id)
      .single()

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await getStripeServer().customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // For seat-based pricing, we need to use a custom amount
    // Create a checkout session with line items
    const session = await getStripeServer().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: process.env.STRIPE_PRODUCT_ID || 'prod_U2rXLfgtPvpmfE',
            unit_amount: billingCycle === 'monthly' 
              ? monthlyTotal * 100 // cents
              : Math.round(yearlyTotal * 100 / 12), // monthly amount for yearly
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/settings/subscription?success=true`,
      cancel_url: `${baseUrl}/dashboard/settings/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        seats: seats.toString(),
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          seats: seats.toString(),
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
