'use client';

import { useCallback, useMemo, useState } from 'react';

import type { MarketplaceProduct } from '@/components/marketplace/types';
import {
  addToCart,
  clearCart,
  getCart,
  getCartTotal,
  removeFromCart,
  updateQuantity,
  type CartItem,
} from './cart';

export type { CartItem } from './cart';

export interface UseCartReturn {
  items: CartItem[];
  count: number;
  total: number; // cents
  add: (product: MarketplaceProduct, variant?: { id: string; name: string }) => void;
  remove: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>(() => getCart());

  const add = useCallback(
    (product: MarketplaceProduct, variant?: { id: string; name: string }) => {
      const updated = addToCart(product, variant);
      setItems(updated);
    },
    [],
  );

  const remove = useCallback((productId: string) => {
    const updated = removeFromCart(productId);
    setItems(updated);
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    const updated = updateQuantity(productId, qty);
    setItems(updated);
  }, []);

  const clear = useCallback(() => {
    clearCart();
    setItems([]);
  }, []);

  const total = useMemo(() => getCartTotal(items), [items]);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, count, total, add, remove, updateQty, clear };
}
