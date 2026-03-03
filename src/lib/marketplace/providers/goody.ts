/**
 * Goody Commerce API Service
 * Gift and physical product marketplace integration
 * API Documentation: https://developer.ongoody.com/commerce-api/overview
 * 
 * The Commerce API allows you to:
 * - Access product catalog from brands like Brooklinen, Apple, Bose, etc.
 * - Send gifts without an address (gift links)
 * - Ship orders directly to addresses
 * - Earn revenue share on sales
 */

import type {
  Product,
  PaginatedProducts,
  ShippingRate,
  ShippingAddress,
  ShippingItem,
} from '../types';
import { getMarketplaceCache, setMarketplaceCache } from '../cache';

// Goody API configuration
const GOODY_API_BASE_URL = process.env.GOODY_COMMERCE_SANDBOX === 'true'
  ? 'https://api.sandbox.ongoody.com'
  : 'https://api.ongoody.com';

// Goody product categories we want to support
export const GOODY_CATEGORIES = [
  { id: 'food', name: 'Food & Treats', description: 'Gourmet food, snacks, and sweets' },
  { id: 'home', name: 'Home & Living', description: 'Home decor, candles, and cozy items' },
  { id: 'wellness', name: 'Wellness & Self-Care', description: 'Spa, wellness, and self-care products' },
  { id: 'tech', name: 'Tech & Gadgets', description: 'Electronics and tech accessories' },
  { id: 'drink', name: 'Drinks & Beverages', description: 'Coffee, tea, wine, and spirits' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Books, journals, and lifestyle accessories' },
] as const;

// Goody API types
interface GoodyProduct {
  id: string;
  name: string;
  description: string | null;
  price: number; // in cents
  currency: string;
  images: {
    id: string;
    url: string;
    thumbnail_url?: string;
  }[];
  brand: {
    id: string;
    name: string;
    logo_url?: string;
  } | null;
  categories: {
    id: string;
    name: string;
  }[];
  variants?: {
    id: string;
    name: string;
    options: Record<string, string>;
    price?: number;
  }[];
  in_stock: boolean;
  allow_shipping: boolean;
  allow_gifting: boolean;
  metadata?: Record<string, unknown>;
}

interface GoodyOrderBatch {
  id: string;
  send_status: 'pending' | 'complete' | 'failed';
  from_name: string;
  message?: string;
  orders_count: number;
  orders_preview: GoodyOrder[];
  recipients_count: number;
  cart: {
    id: string;
    items: {
      id: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        brand?: {
          id: string;
          name: string;
        };
      };
    }[];
  };
  send_method: 'email_and_link' | 'link_multiple_custom_list' | 'direct_send';
  individual_gift_link?: string;
  is_scheduled_send: boolean;
  scheduled_send_on?: string;
  expires_at?: string;
}

interface GoodyOrder {
  id: string;
  status: 'created' | 'opened' | 'accepted' | 'shipped' | 'delivered' | 'canceled';
  recipient_first_name: string;
  recipient_last_name?: string;
  recipient_email?: string;
  individual_gift_link: string;
  card_id?: string;
  message?: string;
  thank_you_note?: string | null;
  view_count_recipient: number;
  is_swapped: boolean;
  order_batch_id: string;
  cart: {
    id: string;
    items: {
      id: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        brand?: {
          id: string;
          name: string;
        };
      };
    }[];
  };
  shipments: {
    id: string;
    status: string;
    tracking_number?: string;
    tracking_url?: string;
    carrier?: string;
    shipped_at?: string;
    delivered_at?: string;
  }[];
  amounts: {
    amount_product: number;
    amount_shipping: number;
    amount_processing_fee: number;
    amount_pre_tax_total: number;
    amount_tax: number | null;
    amount_total: number | null;
    amount_global_relay_cost: number | null;
  };
  sender: {
    first_name: string;
    last_name: string;
    email: string;
  };
  workspace_id: string;
  workspace_name: string;
  reference_id: string;
}

interface GoodyRecipient {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mailing_address?: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

// Helper to get Authorization header
function getAuthHeader(): string {
  const apiKey = process.env.GOODY_COMMERCE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOODY_COMMERCE_API_KEY not configured');
  }
  
  return `Bearer ${apiKey}`;
}

/**
 * Convert Goody product to unified Product type
 */
function normalizeProduct(gProduct: GoodyProduct): Product {
  const mainImage = gProduct.images?.[0];
  
  return {
    id: gProduct.id,
    name: gProduct.name,
    description: gProduct.description || '',
    price: gProduct.price / 100, // Convert cents to dollars
    currency: gProduct.currency || 'USD',
    images: gProduct.images?.map(img => img.url) || [],
    thumbnail: mainImage?.thumbnail_url || mainImage?.url || '',
    provider: 'goody',
    category: gProduct.categories?.[0]?.name || 'gifts',
    inStock: gProduct.in_stock,
    brand: gProduct.brand?.name,
    providerData: {
      goodyId: gProduct.id,
      brand: gProduct.brand,
      categories: gProduct.categories,
      variants: gProduct.variants,
      allowShipping: gProduct.allow_shipping,
      allowGifting: gProduct.allow_gifting,
    },
  };
}

/**
 * Check if Goody API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.GOODY_COMMERCE_API_KEY;
}

/**
 * Get the base API URL
 */
export function getApiUrl(): string {
  return GOODY_API_BASE_URL;
}

/**
 * Fetch products from database (curated products)
 * Note: Goody doesn't have a public product catalog endpoint in the Commerce API.
 * Products are curated and stored in our marketplace_products table.
 */
export async function getProducts(
  category?: string,
  search?: string,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedProducts> {
  // Check cache first
  const cacheKey = `goody_products_${category || 'all'}_${search || ''}_${page}_${perPage}`;
  const cached = getMarketplaceCache(cacheKey);
  if (cached) return cached;

  try {
    // Import Supabase client dynamically to avoid build issues
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('marketplace_products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .or('provider.eq.goody,provider.eq.internal,provider.is.null');
    
    // Filter by search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Filter by category (occasion)
    if (category) {
      query = query.contains('occasions', [category.toLowerCase()]);
    }
    
    // Order by curated score
    query = query.order('curated_score', { ascending: false, nullsFirst: false });
    
    // Pagination
    const start = (page - 1) * perPage;
    query = query.range(start, start + perPage - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Database query error:', error);
      return { products: [], total: 0, page, perPage, hasMore: false };
    }
    
    // Normalize products
    const products: Product[] = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      price: row.sale_price_cents ? row.sale_price_cents / 100 : row.base_price_cents / 100,
      originalPrice: row.sale_price_cents ? row.base_price_cents / 100 : undefined,
      currency: row.currency || 'USD',
      images: row.images || [],
      thumbnail: row.images?.[0] || '',
      provider: 'goody',
      category: row.occasions?.[0] || 'gifts',
      inStock: row.in_stock,
      brand: row.provider,
      providerData: {
        goodyId: row.external_id,
        occasions: row.occasions,
        emotionalImpact: row.emotional_impact,
        whyWeLoveIt: row.why_we_love_it,
        curatedScore: row.curated_score,
      },
    }));
    
    const total = count || 0;
    const result: PaginatedProducts = {
      products,
      total,
      page,
      perPage,
      hasMore: start + products.length < total,
    };
    
    // Cache for 5 minutes
    setMarketplaceCache(cacheKey, result, 300000);
    
    return result;
  } catch (error) {
    console.error('Failed to fetch products from database:', error);
    return { products: [], total: 0, page, perPage, hasMore: false };
  }
}

/**
 * Get product details by ID
 * Note: Goody doesn't have a direct product details endpoint in Commerce API.
 * Product details are typically managed through the dashboard.
 */
export async function getProductDetails(productId: string): Promise<Product | null> {
  // Goody Commerce API doesn't expose a product details endpoint
  // Product information should be cached from order creation responses
  // or fetched via the dashboard
  
  console.log('Goody Commerce API: Product details not available via API.');
  console.log('Product info should be stored when creating orders or from dashboard.');
  
  return null;
}

/**
 * Get available categories
 */
export async function getCategories(): Promise<{ id: string; name: string }[]> {
  return GOODY_CATEGORIES.map(cat => ({ id: cat.id, name: cat.name }));
}

/**
 * Calculate price for an order batch
 * This helps determine costs before creating an order
 */
export async function calculatePrice(params: {
  sendMethod: 'email_and_link' | 'link_multiple_custom_list' | 'direct_send';
  recipients: GoodyRecipient[];
  cartItems: { productId: string; quantity: number }[];
}): Promise<{
  amountProduct: number;
  amountShipping: number;
  amountProcessingFee: number;
  amountPreTaxTotal: number;
  amountTax: number | null;
  amountTotal: number | null;
} | null> {
  try {
    const response = await fetch(`${GOODY_API_BASE_URL}/v1/order_batches/price`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_method: params.sendMethod,
        recipients: params.recipients,
        cart: {
          items: params.cartItems.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Goody API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      amountProduct: data.amount_product,
      amountShipping: data.amount_shipping,
      amountProcessingFee: data.amount_processing_fee,
      amountPreTaxTotal: data.amount_pre_tax_total,
      amountTax: data.amount_tax,
      amountTotal: data.amount_total,
    };
  } catch (error) {
    console.error('Goody calculate price error:', error);
    return null;
  }
}

/**
 * Create a gift order batch
 * This is the main method for sending gifts through Goody
 * 
 * @param params Order batch parameters
 * @returns Created order batch with gift links
 */
export async function createOrderBatch(params: {
  fromName: string;
  sendMethod: 'email_and_link' | 'link_multiple_custom_list' | 'direct_send';
  recipients: GoodyRecipient[];
  cartItems: { productId: string; quantity: number }[];
  message?: string;
  cardId?: string;
  scheduledSendOn?: string; // ISO 8601 date string
  expiresAt?: string; // ISO 8601 date string
}): Promise<GoodyOrderBatch> {
  const response = await fetch(`${GOODY_API_BASE_URL}/v1/order_batches`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from_name: params.fromName,
      send_method: params.sendMethod,
      recipients: params.recipients,
      cart: {
        items: params.cartItems.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      payment_method_id: 'COMMERCE_STORED_VALUE',
      message: params.message,
      card_id: params.cardId,
      scheduled_send_on: params.scheduledSendOn,
      expires_at: params.expiresAt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Retrieve an order batch by ID
 */
export async function getOrderBatch(orderBatchId: string): Promise<GoodyOrderBatch> {
  const response = await fetch(`${GOODY_API_BASE_URL}/v1/order_batches/${orderBatchId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Retrieve orders for an order batch
 */
export async function getOrderBatchOrders(
  orderBatchId: string,
  page: number = 1,
  perPage: number = 50
): Promise<GoodyOrder[]> {
  const response = await fetch(
    `${GOODY_API_BASE_URL}/v1/order_batches/${orderBatchId}/orders?page=${page}&per_page=${perPage}`,
    {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Retrieve a single order by ID
 */
export async function getOrder(orderId: string): Promise<GoodyOrder> {
  const response = await fetch(`${GOODY_API_BASE_URL}/v1/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * List all order batches
 */
export async function listOrderBatches(
  page: number = 1,
  perPage: number = 50
): Promise<GoodyOrderBatch[]> {
  const response = await fetch(
    `${GOODY_API_BASE_URL}/v1/order_batches?page=${page}&per_page=${perPage}`,
    {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<GoodyOrder> {
  const response = await fetch(`${GOODY_API_BASE_URL}/v1/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Refund an order
 */
export async function refundOrder(orderId: string): Promise<GoodyOrder> {
  const response = await fetch(`${GOODY_API_BASE_URL}/v1/orders/${orderId}/refund`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Goody API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Verify API connection
 */
export async function verifyConnection(): Promise<{ publicAppId: string } | null> {
  try {
    const response = await fetch(`${GOODY_API_BASE_URL}/v1/me`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { publicAppId: data.public_app_id };
  } catch (error) {
    console.error('Goody connection verification failed:', error);
    return null;
  }
}

// Re-export types for use in other modules
export type {
  GoodyProduct,
  GoodyOrder,
  GoodyOrderBatch,
  GoodyRecipient,
};
