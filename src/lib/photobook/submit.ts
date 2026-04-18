/**
 * Shared Prodigi submission — used by both the user-facing confirm_payment
 * action (when the browser stays open after Stripe payment) and the
 * payment_intent.succeeded webhook (when it doesn't). Keeps behaviour and
 * error mapping identical in both paths.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrder as createProdigiOrder } from '@/lib/marketplace/providers/prodigi'
import {
  normalizeAddOns,
  normalizeProductOptions,
} from '@/lib/photobook/product-options'

type PageRow = {
  page_number: number
  page_type: string
  content_json: { rendered_url?: string; image_url?: string } | null
}

export interface SubmitResult {
  ok: true
  prodigiOrderId: string
}

export interface SubmitFailure {
  ok: false
  code:
    | 'not_found'
    | 'not_pending'
    | 'assets_missing'
    | 'prodigi_error'
    | 'already_submitted'
  message: string
  rawMessage?: string
}

/**
 * Submit a photobook order to Prodigi. Idempotent: if the order is no longer
 * pending_payment (e.g. already submitted), returns `already_submitted`
 * without re-calling Prodigi.
 */
export async function submitOrderToProdigi(
  orderId: string,
  userEmail?: string | null,
): Promise<SubmitResult | SubmitFailure> {
  const admin = createAdminClient()

  const { data: order, error: orderErr } = await admin
    .from('photobook_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    return { ok: false, code: 'not_found', message: 'Order not found' }
  }

  if (order.status !== 'pending_payment') {
    return {
      ok: false,
      code: 'already_submitted',
      message: `Order already in status ${order.status}`,
    }
  }

  const { data: project } = await admin
    .from('photobook_projects')
    .select(`
      *,
      photobook_pages (
        id,
        page_number,
        page_type,
        content_json
      )
    `)
    .eq('id', order.project_id)
    .single()

  if (!project) {
    return { ok: false, code: 'not_found', message: 'Project not found' }
  }

  const sortedPages: PageRow[] = (project.photobook_pages || [])
    .slice()
    .sort((a: PageRow, b: PageRow) => a.page_number - b.page_number)

  const assets = sortedPages
    .map((page) => ({
      printArea:
        page.page_type === 'front_cover'
          ? 'cover'
          : page.page_type === 'back_cover'
            ? 'backCover'
            : `page${page.page_number}`,
      url: page.content_json?.rendered_url || page.content_json?.image_url || '',
    }))
    .filter((asset) => asset.url)

  if (assets.length === 0 || assets.length < sortedPages.length) {
    return {
      ok: false,
      code: 'assets_missing',
      message: 'Some pages are missing rendered assets',
    }
  }

  const productOptions = normalizeProductOptions(project.product_options)
  const selectedAddOns = normalizeAddOns(project.add_ons)

  try {
    const prodigiOrder = await createProdigiOrder({
      items: [
        {
          sku: project.product_sku,
          copies: 1,
          assets,
          attributes: {
            pageCount: project.page_count,
            coverType: productOptions.coverType,
            paperFinish: productOptions.paperFinish,
            binding: productOptions.binding,
            addOns: selectedAddOns,
          },
        },
      ],
      recipient: {
        name: order.shipping_name,
        address: {
          line1: order.shipping_line1,
          line2: order.shipping_line2 || undefined,
          townOrCity: order.shipping_city,
          stateOrCounty: order.shipping_state || undefined,
          postalOrZipCode: order.shipping_zip,
          countryCode: order.shipping_country,
        },
        email: userEmail || undefined,
      },
      shippingMethod: order.shipping_method as 'standard' | 'express' | 'overnight',
      merchantReference: order.id,
      idempotencyKey: order.idempotency_key,
    })

    await admin
      .from('photobook_orders')
      .update({
        status: 'processing',
        prodigi_order_id: prodigiOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return { ok: true, prodigiOrderId: prodigiOrder.id }
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : 'Unknown error'

    await admin
      .from('photobook_orders')
      .update({
        status: 'error',
        error_message: rawMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return { ok: false, code: 'prodigi_error', message: rawMessage, rawMessage }
  }
}
