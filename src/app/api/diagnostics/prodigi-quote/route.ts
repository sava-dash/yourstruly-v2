/**
 * Diagnostic endpoint: builds the SAME payload the photobook confirm_payment
 * handler would send to Prodigi (SKU, copies, attributes, per-page assets)
 * but hits Prodigi's `/v4/quotes` endpoint instead of `/orders`. No real
 * paid order is placed. Also runs `validateAssets()` for asset print-area
 * coverage.
 *
 * Gated by `Bearer $CRON_SECRET` (same pattern as /api/diagnostics/test-email).
 *
 * Usage:
 *   curl "https://app.yourstruly.love/api/diagnostics/prodigi-quote?projectId=<uuid>" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Response:
 *   {
 *     ok: true,
 *     project: { id, title, sku, pageCount },
 *     payload: { items, recipient, shippingMethod },   // what createOrder() would send
 *     quote: { subtotal, shipping, tax, total, currency, rates },
 *     assetValidation: { valid, errors? },
 *     missingAssets: [{ pageNumber, pageType }],
 *     renderedAssets: [{ pageNumber, pageType, url }],
 *     warnings: string[]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  estimateOrder as prodigiEstimateOrder,
  validateAssets as prodigiValidateAssets,
  isConfigured as isProdigiConfigured,
} from '@/lib/marketplace/providers/prodigi';
import {
  normalizeAddOns,
  normalizeProductOptions,
} from '@/lib/photobook/product-options';

type PageRow = {
  id: string;
  page_number: number;
  page_type: string;
  content_json: { rendered_url?: string; image_url?: string } | null;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isProdigiConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'PRODIGI_API_KEY not configured' },
      { status: 500 }
    );
  }

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: 'Query param `projectId` is required' },
      { status: 400 }
    );
  }

  const warnings: string[] = [];
  const supabase = createAdminClient();

  // Fetch project + pages — same select shape as confirm_payment.
  const { data: project, error: projectError } = await supabase
    .from('photobook_projects')
    .select(
      `
        id,
        title,
        product_sku,
        product_name,
        product_options,
        add_ons,
        page_count,
        photobook_pages (
          id,
          page_number,
          page_type,
          content_json
        )
      `
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { ok: false, error: 'Project not found', detail: projectError?.message },
      { status: 404 }
    );
  }

  const sortedPages: PageRow[] = (project.photobook_pages || [])
    .slice()
    .sort((a: PageRow, b: PageRow) => a.page_number - b.page_number);

  const renderedAssets: Array<{ pageNumber: number; pageType: string; url: string }> = [];
  const missingAssets: Array<{ pageNumber: number; pageType: string }> = [];

  const assets = sortedPages
    .map((page) => {
      const url = page.content_json?.rendered_url || page.content_json?.image_url || '';
      const printArea =
        page.page_type === 'front_cover'
          ? 'cover'
          : page.page_type === 'back_cover'
            ? 'backCover'
            : `page${page.page_number}`;
      if (!url) {
        missingAssets.push({ pageNumber: page.page_number, pageType: page.page_type });
      } else {
        renderedAssets.push({
          pageNumber: page.page_number,
          pageType: page.page_type,
          url,
        });
      }
      return { printArea, url };
    })
    .filter((asset) => asset.url);

  if (missingAssets.length > 0) {
    warnings.push(
      `${missingAssets.length} page(s) missing rendered_url — Prodigi would reject this order as partial/blank.`
    );
  }
  if (!project.product_sku) {
    warnings.push('Project has no product_sku — Prodigi would reject the item.');
  }

  const productOptions = normalizeProductOptions(project.product_options);
  const selectedAddOns = normalizeAddOns(project.add_ons);

  // Mirror the exact payload createOrder() would receive from confirm_payment.
  const createOrderPayload = {
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
    // Synthetic recipient for quote — /quotes doesn't consume this but we
    // include it so the diagnostic mirrors the real payload shape.
    recipient: {
      name: 'Diagnostic Quote',
      address: {
        line1: '1 Test Street',
        townOrCity: 'New York',
        stateOrCounty: 'NY',
        postalOrZipCode: '10001',
        countryCode: 'US',
      },
    },
    shippingMethod: 'standard' as const,
  };

  // Run asset validation against the product's content-layer requirements.
  // This hits Prodigi for product details but does NOT create an order.
  let assetValidation: { valid: boolean; errors?: Array<{ printArea: string; error: string }> } = {
    valid: true,
  };
  try {
    assetValidation = await prodigiValidateAssets(
      project.product_sku,
      project.product_sku,
      assets.map((a) => ({ printArea: a.printArea, url: a.url }))
    );
  } catch (err) {
    warnings.push(
      `validateAssets failed: ${err instanceof Error ? err.message : 'unknown error'}`
    );
  }

  // Fetch a real quote from Prodigi. `/v4/quotes` accepts sku+copies+attributes
  // (no assets) and returns pricing + shipping options.
  let quote:
    | {
        subtotal: number;
        shipping: number;
        tax: number;
        total: number;
        currency: string;
        rates: Array<{ id: string; name: string; price: number; currency: string; minDays: number; maxDays: number }>;
      }
    | null = null;
  try {
    quote = await prodigiEstimateOrder(
      [
        {
          productId: project.product_sku,
          variantId: project.product_sku,
          quantity: 1,
          attributes: {
            coverType: productOptions.coverType,
            paperFinish: productOptions.paperFinish,
            binding: productOptions.binding,
          },
        },
      ],
      {
        line1: '1 Test Street',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        countryCode: 'US',
      }
    );
  } catch (err) {
    warnings.push(
      `Prodigi /quotes failed: ${err instanceof Error ? err.message : 'unknown error'}`
    );
  }

  return NextResponse.json({
    ok: warnings.length === 0 && missingAssets.length === 0 && assetValidation.valid,
    project: {
      id: project.id,
      title: project.title,
      sku: project.product_sku,
      productName: project.product_name,
      pageCount: project.page_count,
      totalPagesInDb: sortedPages.length,
    },
    payload: createOrderPayload,
    quote,
    assetValidation,
    renderedAssets,
    missingAssets,
    warnings,
  });
}
