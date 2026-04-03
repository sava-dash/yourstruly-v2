'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  CreditCard,
  Truck,
  Shield,
  Gift,
  Loader2,
} from 'lucide-react';
import { useCart, CartItem } from '@/hooks/useCart';

export default function CartPage() {
  const router = useRouter();
  const { items, cartTotal, updateQuantity, removeItem, clearCart, isLoaded } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const shipping = cartTotal > 50 ? 0 : 5.99;
  const tax = cartTotal * 0.08; // Estimate 8% tax
  const total = cartTotal + shipping + tax;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    // Navigate to checkout
    router.push('/marketplace/checkout');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F3EE]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#2D5A3D] hover:text-[#234A31] mb-8"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Continue Shopping</span>
          </button>

          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
              <ShoppingBag size={40} className="text-[#2D5A3D]/50" />
            </div>
            <h1 className="font-playfair text-2xl font-bold text-[#2d2d2d] mb-2">
              Your cart is empty
            </h1>
            <p className="text-[#2D5A3D]/60 mb-6">
              Looks like you haven&apos;t added anything yet.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234A31] transition-colors"
            >
              <ShoppingBag size={18} />
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#2D5A3D] hover:text-[#234A31]"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-playfair text-2xl font-bold text-[#2d2d2d]">
              Shopping Cart
            </h1>
            <span className="text-[#2D5A3D]/60">({items.length} items)</span>
          </div>
          
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 size={14} />
            Clear Cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <CartItemCard
                  key={`${item.id}-${item.variant?.id}`}
                  item={item}
                  onUpdateQuantity={(qty) => updateQuantity(item.id, item.variant?.id, qty)}
                  onRemove={() => removeItem(item.id, item.variant?.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2D5A3D]/10 sticky top-4">
              <h2 className="font-playfair text-lg font-bold text-[#2d2d2d] mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#2D5A3D]/70">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#2D5A3D]/70">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-[#2D5A3D]/70">
                  <span>Estimated Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-[#2D5A3D]/10 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold text-[#2D5A3D]">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {cartTotal < 50 && (
                <p className="mt-4 text-xs text-[#2D5A3D]/60 text-center">
                  Add ${(50 - cartTotal).toFixed(2)} more for free shipping!
                </p>
              )}

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full mt-6 py-4 bg-[#2D5A3D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#234A31] transition-colors disabled:opacity-70"
              >
                {isCheckingOut ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <CreditCard size={20} />
                    Proceed to Checkout
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-[#2D5A3D]/10">
                <div className="flex items-center gap-1 text-xs text-[#2D5A3D]/60">
                  <Shield size={14} />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#2D5A3D]/60">
                  <Truck size={14} />
                  <span>Fast Shipping</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#2D5A3D]/60">
                  <Gift size={14} />
                  <span>Gift Options</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-[#2D5A3D]/10 flex gap-4"
    >
      {/* Image */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
        <Image
          src={item.thumbnail}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link 
          href={`/marketplace/${item.provider}/${item.id}`}
          className="font-medium text-[#2d2d2d] hover:text-[#2D5A3D] line-clamp-2"
        >
          {item.name}
        </Link>
        
        {item.variant && (
          <p className="text-sm text-[#2D5A3D]/60 mt-1">
            {item.variant.name}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          {/* Quantity */}
          <div className="flex items-center gap-2 bg-[#F5F3EE] rounded-lg p-1">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="p-1.5 hover:bg-white rounded transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="p-1.5 hover:bg-white rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Price */}
          <span className="font-bold text-[#2D5A3D]">
            ${(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="self-start p-2 text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
}
