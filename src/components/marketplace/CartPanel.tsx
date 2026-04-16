'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';

import type { CartItem } from '@/lib/marketplace/cart';
import { formatCents } from './types';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface CartPanelProps {
  open: boolean;
  items: CartItem[];
  total: number; // cents
  onClose: () => void;
  onRemove: (productId: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onClear: () => void;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function CartPanel({
  open,
  items,
  total,
  onClose,
  onRemove,
  onUpdateQty,
  onClear,
}: CartPanelProps) {
  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );

  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = useCallback(async () => {
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            priceCents: i.product.salePriceCents ?? i.product.basePriceCents,
            image: i.product.images[0],
            variant: i.selectedVariant?.name,
          })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || 'Checkout failed. Please try again.');
        setCheckingOut(false);
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.');
      setCheckingOut(false);
    }
  }, [items]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="cart-overlay"
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="cart-drawer"
            className="fixed right-0 top-0 h-full w-[90vw] max-w-md bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#406A56]/10 shrink-0">
              <div className="flex items-center gap-3">
                <h2
                  className="text-xl font-semibold text-[#406A56]"
                  style={{
                    fontFamily:
                      'var(--font-playfair, Playfair Display, serif)',
                  }}
                >
                  Your Cart
                </h2>
                {count > 0 && (
                  <span className="text-sm text-[#666]">
                    ({count} item{count !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[#D3E1DF]/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <EmptyState onClose={onClose} />
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <CartRow
                      key={item.product.id + (item.selectedVariant?.id ?? '')}
                      item={item}
                      onRemove={onRemove}
                      onUpdateQty={onUpdateQty}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer — sticky */}
            {items.length > 0 && (
              <div className="border-t border-[#406A56]/10 px-5 py-4 shrink-0 space-y-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-base font-medium text-[#2d2d2d]"
                    style={{
                      fontFamily:
                        'var(--font-inter-tight, Inter Tight, sans-serif)',
                    }}
                  >
                    Subtotal
                  </span>
                  <span className="text-lg font-bold text-[#406A56]">
                    {formatCents(total)}
                  </span>
                </div>

                {/* Checkout */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full min-h-[52px] bg-[#C35F33] text-white text-base font-medium rounded-full flex items-center justify-center gap-2 hover:bg-[#a84f2a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Redirecting to checkout...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>

                {/* Checkout error */}
                {checkoutError && (
                  <p className="text-sm text-[#C35F33] text-center">
                    {checkoutError}
                  </p>
                )}

                {/* Continue + Clear */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-sm text-[#406A56] hover:underline min-h-[44px]"
                  >
                    Continue Shopping
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-sm text-[#999] hover:text-[#C35F33] min-h-[44px]"
                  >
                    Clear cart
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Cart Row ──────────────────────────────────────────────────────────── */

function CartRow({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  const { product, quantity, selectedVariant } = item;
  const unitPrice = product.salePriceCents ?? product.basePriceCents;
  const img = product.images[0];

  return (
    <li className="flex gap-3 py-3 border-b border-[#406A56]/5 last:border-b-0">
      {/* Image */}
      <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden bg-[#F2F1E5] shrink-0 border border-[#406A56]/10">
        {img ? (
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="60px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={20} className="text-[#406A56]/20" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-[#2d2d2d] truncate"
          style={{
            fontFamily:
              'var(--font-inter-tight, Inter Tight, sans-serif)',
          }}
        >
          {product.name}
        </p>
        {product.brand && (
          <p className="text-xs text-[#888] truncate">{product.brand}</p>
        )}
        {selectedVariant && (
          <p className="text-xs text-[#888]">{selectedVariant.name}</p>
        )}
        <p className="text-sm font-semibold text-[#406A56] mt-0.5">
          {formatCents(unitPrice)}
        </p>

        {/* Quantity stepper + remove */}
        <div className="flex items-center gap-2 mt-1.5">
          <button
            type="button"
            onClick={() =>
              quantity <= 1
                ? onRemove(product.id)
                : onUpdateQty(product.id, quantity - 1)
            }
            className="w-8 h-8 rounded-full border border-[#406A56]/20 flex items-center justify-center hover:bg-[#D3E1DF]/40 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={14} />
          </button>

          <span
            className="w-6 text-center text-sm font-medium text-[#2d2d2d]"
            style={{
              fontFamily:
                'var(--font-inter-tight, Inter Tight, sans-serif)',
            }}
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => onUpdateQty(product.id, quantity + 1)}
            className="w-8 h-8 rounded-full border border-[#406A56]/20 flex items-center justify-center hover:bg-[#D3E1DF]/40 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus size={14} />
          </button>

          <button
            type="button"
            onClick={() => onRemove(product.id)}
            className="ml-auto p-1.5 rounded-full hover:bg-red-50 text-[#999] hover:text-[#C35F33] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={`Remove ${product.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}

/* ─── Empty State ───────────────────────────────────────────────────────── */

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShoppingBag size={56} className="text-[#406A56]/20 mb-4" />
      <p
        className="text-lg font-semibold text-[#2d2d2d] mb-1"
        style={{
          fontFamily: 'var(--font-playfair, Playfair Display, serif)',
        }}
      >
        Your cart is empty
      </p>
      <p className="text-sm text-[#666] mb-6">
        Browse our marketplace to find the perfect gift.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[52px] px-8 bg-[#406A56] text-white text-base font-medium rounded-full hover:bg-[#355a49] transition-colors"
      >
        Browse gifts
      </button>
    </div>
  );
}
