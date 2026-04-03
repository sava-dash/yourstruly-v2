'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CreditCard,
  Truck,
  Shield,
  Lock,
  Check,
  Loader2,
  MapPin,
  User,
  Mail,
  Phone,
  Gift,
  ChevronDown,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe - we'll use the live key but test mode is controlled server-side
// For test mode to work fully, you need NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
const getStripePromise = (testMode: boolean) => {
  const key = testMode 
    ? (process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return loadStripe(key || '');
};

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const EMPTY_ADDRESS: ShippingAddress = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartTotal, isLoaded, clearCart } = useCart();
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(true); // Default to test mode for safety

  const shipping = cartTotal > 50 ? 0 : 5.99;
  const tax = cartTotal * 0.08;
  const total = cartTotal + shipping + tax;

  // Redirect if cart is empty
  useEffect(() => {
    if (isLoaded && items.length === 0 && !orderComplete) {
      router.push('/marketplace/cart');
    }
  }, [isLoaded, items, router, orderComplete]);

  // Create payment intent when moving to payment step
  const handleProceedToPayment = async () => {
    // Validate shipping address
    const required = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode'];
    const missing = required.filter(field => !shippingAddress[field as keyof ShippingAddress]);
    if (missing.length > 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreatingPayment(true);
    try {
      const response = await fetch('/api/marketplace/checkout/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            variant: i.variant,
          })),
          shippingAddress,
          isGift,
          giftMessage: isGift ? giftMessage : undefined,
          testMode,
        }),
      });

      if (!response.ok) throw new Error('Failed to create payment');
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (error) {
      console.error('Payment creation error:', error);
      alert('Failed to initialize payment. Please try again.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (paymentIntentId: string) => {
    setOrderId(paymentIntentId);
    setOrderComplete(true);
    setStep('confirmation');
    clearCart();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
      </div>
    );
  }

  // Order Confirmation
  if (step === 'confirmation' && orderComplete) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check size={40} className="text-white" />
          </div>
          <h1 className="font-playfair text-2xl font-bold text-[#2d2d2d] mb-2">
            Order Confirmed!
          </h1>
          <p className="text-[#2D5A3D]/70 mb-6">
            Thank you for your purchase. We&apos;ll send you an email confirmation shortly.
          </p>
          {orderId && (
            <p className="text-sm text-[#2D5A3D]/50 mb-6">
              Order ID: {orderId.slice(-8).toUpperCase()}
            </p>
          )}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234A31] transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="block w-full py-3 border border-[#2D5A3D] text-[#2D5A3D] rounded-xl font-medium hover:bg-[#2D5A3D]/5 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Test Mode Banner */}
      {testMode && (
        <div className="bg-orange-500 text-white text-center py-2 text-sm font-medium">
          🧪 Test Mode Active — Use card: 4242 4242 4242 4242, any future date, any CVC
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-[#2D5A3D]/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => step === 'payment' ? setStep('shipping') : router.back()}
              className="flex items-center gap-2 text-[#2D5A3D] hover:text-[#234A31]"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">
                {step === 'payment' ? 'Back to Shipping' : 'Back to Cart'}
              </span>
            </button>
            
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'shipping' ? 'bg-[#2D5A3D] text-white' : 'bg-[#2D5A3D]/20 text-[#2D5A3D]'
              }`}>
                1
              </div>
              <div className="w-8 h-0.5 bg-[#2D5A3D]/20" />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'payment' ? 'bg-[#2D5A3D] text-white' : 'bg-[#2D5A3D]/20 text-[#2D5A3D]'
              }`}>
                2
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Test Mode Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className={`text-xs font-medium ${testMode ? 'text-orange-600' : 'text-[#2D5A3D]/50'}`}>
                  {testMode ? '🧪 Test Mode' : 'Live'}
                </span>
                <button
                  onClick={() => setTestMode(!testMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    testMode ? 'bg-orange-500' : 'bg-[#2D5A3D]'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    testMode ? 'left-0.5' : 'left-5'
                  }`} />
                </button>
              </label>
              
              <div className="flex items-center gap-1 text-sm text-[#2D5A3D]/60">
                <Lock size={14} />
                Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {step === 'shipping' ? (
              <ShippingForm
                address={shippingAddress}
                onChange={setShippingAddress}
                isGift={isGift}
                onGiftChange={setIsGift}
                giftMessage={giftMessage}
                onGiftMessageChange={setGiftMessage}
                onSubmit={handleProceedToPayment}
                isSubmitting={isCreatingPayment}
              />
            ) : clientSecret ? (
              <Elements stripe={getStripePromise(testMode)} options={{ clientSecret }}>
                <PaymentForm onSuccess={handlePaymentSuccess} total={total} />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2D5A3D]/10 sticky top-4">
              <h2 className="font-playfair text-lg font-bold text-[#2d2d2d] mb-4">
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.variant?.id}`} className="flex gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={item.thumbnail} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2d2d2d] line-clamp-1">{item.name}</p>
                      <p className="text-xs text-[#2D5A3D]/60">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium text-[#2D5A3D]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#2D5A3D]/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#2D5A3D]/70">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#2D5A3D]/70">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-[#2D5A3D]/70">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#2D5A3D]/10 text-lg font-bold text-[#2D5A3D]">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[#2D5A3D]/10">
                <div className="flex items-center gap-1 text-xs text-[#2D5A3D]/60">
                  <Shield size={14} />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#2D5A3D]/60">
                  <Truck size={14} />
                  <span>Fast Shipping</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shipping Form Component
function ShippingForm({
  address,
  onChange,
  isGift,
  onGiftChange,
  giftMessage,
  onGiftMessageChange,
  onSubmit,
  isSubmitting,
}: {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  isGift: boolean;
  onGiftChange: (isGift: boolean) => void;
  giftMessage: string;
  onGiftMessageChange: (message: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const updateField = (field: keyof ShippingAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2D5A3D]/10">
      <h2 className="font-playfair text-xl font-bold text-[#2d2d2d] mb-6 flex items-center gap-2">
        <MapPin size={20} className="text-[#2D5A3D]" />
        Shipping Information
      </h2>

      <div className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">First Name *</label>
            <input
              type="text"
              value={address.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Last Name *</label>
            <input
              type="text"
              value={address.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Contact row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Email *</label>
            <input
              type="email"
              value={address.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Phone</label>
            <input
              type="tel"
              value={address.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Street Address *</label>
          <input
            type="text"
            value={address.address1}
            onChange={(e) => updateField('address1', e.target.value)}
            className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
            placeholder="123 Main Street"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Apt, Suite, Unit (optional)</label>
          <input
            type="text"
            value={address.address2}
            onChange={(e) => updateField('address2', e.target.value)}
            className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
            placeholder="Apt 4B"
          />
        </div>

        {/* City, State, Zip */}
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">City *</label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              placeholder="New York"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">State *</label>
            <select
              value={address.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 bg-white"
            >
              <option value="">Select</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>{state.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">ZIP Code *</label>
            <input
              type="text"
              value={address.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
              className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              placeholder="10001"
            />
          </div>
        </div>

        {/* Gift option */}
        <div className="pt-4 border-t border-[#2D5A3D]/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isGift}
              onChange={(e) => onGiftChange(e.target.checked)}
              className="w-5 h-5 rounded border-[#2D5A3D]/30 text-[#2D5A3D] focus:ring-[#2D5A3D]/30"
            />
            <span className="flex items-center gap-2 text-[#2D5A3D]">
              <Gift size={18} />
              This is a gift
            </span>
          </label>

          {isGift && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Gift Message (optional)</label>
              <textarea
                value={giftMessage}
                onChange={(e) => onGiftMessageChange(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 resize-none"
                placeholder="Add a personal message..."
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full mt-6 py-4 bg-[#2D5A3D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#234A31] transition-colors disabled:opacity-70"
      >
        {isSubmitting ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <>
            Continue to Payment
            <CreditCard size={18} />
          </>
        )}
      </button>
    </div>
  );
}

// Payment Form Component
function PaymentForm({
  onSuccess,
  total,
}: {
  onSuccess: (paymentIntentId: string) => void;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/marketplace/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2D5A3D]/10">
      <h2 className="font-playfair text-xl font-bold text-[#2d2d2d] mb-6 flex items-center gap-2">
        <CreditCard size={20} className="text-[#2D5A3D]" />
        Payment Details
      </h2>

      <form onSubmit={handleSubmit}>
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full mt-6 py-4 bg-[#2D5A3D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#234A31] transition-colors disabled:opacity-70"
        >
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Lock size={18} />
              Pay ${total.toFixed(2)}
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-center text-[#2D5A3D]/50">
          Your payment is secured by Stripe. We never store your card details.
        </p>
      </form>
    </div>
  );
}
