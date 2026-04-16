/**
 * Marketplace cart — localStorage-backed cart state.
 *
 * All functions are pure (read/compute/write) so they work from both
 * React hooks and plain utility code.
 */

import type { MarketplaceProduct } from '@/components/marketplace/types';

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
  addedAt: string; // ISO timestamp
  selectedVariant?: { id: string; name: string };
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'yt-marketplace-cart';

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/* ─── Read / Write ──────────────────────────────────────────────────────── */

export function getCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked — silently degrade
  }
}

/* ─── Mutations (each returns the new cart) ─────────────────────────────── */

/**
 * Add a product (or increment if already present with the same variant).
 */
export function addToCart(
  product: MarketplaceProduct,
  variant?: { id: string; name: string },
): CartItem[] {
  const cart = getCart();
  const idx = cart.findIndex(
    (item) =>
      item.product.id === product.id &&
      (item.selectedVariant?.id ?? null) === (variant?.id ?? null),
  );

  if (idx >= 0) {
    cart[idx].quantity += 1;
  } else {
    cart.push({
      product,
      quantity: 1,
      addedAt: new Date().toISOString(),
      selectedVariant: variant,
    });
  }

  setCart(cart);
  return cart;
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart().filter((item) => item.product.id !== productId);
  setCart(cart);
  return cart;
}

export function updateQuantity(productId: string, qty: number): CartItem[] {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((item) => item.product.id !== productId);
  } else {
    const idx = cart.findIndex((item) => item.product.id === productId);
    if (idx >= 0) cart[idx].quantity = qty;
  }
  setCart(cart);
  return cart;
}

export function clearCart(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ─── Computed ──────────────────────────────────────────────────────────── */

/** Total in cents. Uses sale price when available, else base price. */
export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const unitPrice =
      item.product.salePriceCents ?? item.product.basePriceCents;
    return sum + unitPrice * item.quantity;
  }, 0);
}
