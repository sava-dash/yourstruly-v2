'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Star, 
  Truck, 
  Shield, 
  RotateCcw,
  ShoppingBag,
  Gift,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Calendar,
  Loader2,
  Minus,
  Plus
} from 'lucide-react';
import { Product } from '@/types/marketplace';
import { useCart } from '@/hooks/useCart';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.provider as string;
  const productId = params.productId as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const { addItem, cartCount } = useCart();

  // Fetch product data
  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try curated endpoint first
        const response = await fetch(`/api/marketplace/curated?productId=${productId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.products && data.products.length > 0) {
            setProduct(data.products[0]);
            setSelectedVariant(data.products[0].variants?.[0]);
            return;
          }
        }

        // Fallback to provider-specific endpoint
        const fallbackResponse = await fetch(`/api/marketplace/products/${productId}?provider=${providerId}`);
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setProduct(data.product);
          setSelectedVariant(data.product?.variants?.[0]);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
  }, [productId, providerId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D] mx-auto mb-4" />
          <p className="text-[#2D5A3D]/60">Loading product...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-playfair text-2xl font-bold text-[#2d2d2d] mb-2">
            Product Not Found
          </h1>
          <p className="text-gray-500 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link 
            href="/marketplace"
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#2D5A3D] text-white rounded-xl font-medium"
          >
            <ArrowLeft size={18} />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images || [product.thumbnail || product.image];
  const currentPrice = selectedVariant?.price || product.price;
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)
    : null;

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    try {
      addItem({
        id: product.id,
        name: product.name,
        price: currentPrice,
        quantity,
        thumbnail: product.thumbnail || images[0],
        provider: product.provider,
        variant: selectedVariant,
      });
      
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSendAsGift = () => {
    // Navigate to PostScript creation with this product pre-selected
    router.push(`/dashboard/postscripts/new?giftId=${product.id}`);
  };

  const providerInfo: Record<string, { name: string; color: string; icon: string; delivery: string }> = {
    floristone: { 
      name: 'Fresh Flowers', 
      color: '#B8562E',
      icon: '🌸',
      delivery: 'Same-day delivery available'
    },
    prodigi: { 
      name: 'Personalized Prints', 
      color: '#4A3552',
      icon: '🖼️',
      delivery: 'Made to order, ships in 3-5 days'
    },
    goody: {
      name: 'Curated Gifts',
      color: '#2D5A3D',
      icon: '🎁',
      delivery: 'Ships within 1-2 business days'
    },
    gifts: {
      name: 'Curated Gifts',
      color: '#2D5A3D',
      icon: '🎁',
      delivery: 'Ships within 1-2 business days'
    },
  };

  const info = providerInfo[product.provider] || providerInfo.goody;

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Navigation */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-[#2D5A3D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#2D5A3D] hover:text-[#234A31] transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back</span>
            </button>
            
            <Link href="/marketplace/cart" className="relative p-2">
              <ShoppingBag size={24} className="text-[#2D5A3D]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#B8562E] text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setSelectedImage(i => (i + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isBestseller && (
                  <span className="px-3 py-1 bg-[#C4A235] text-[#2d2d2d] text-sm font-medium rounded-full flex items-center gap-1">
                    <Sparkles size={14} />
                    Bestseller
                  </span>
                )}
                {discount && (
                  <span className="px-3 py-1 bg-[#B8562E] text-white text-sm font-medium rounded-full">
                    {discount}% OFF
                  </span>
                )}
              </div>
              
              {/* Favorite button */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
              >
                <Heart 
                  size={20} 
                  className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                />
              </button>
            </div>
            
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === i 
                        ? 'border-[#2D5A3D] shadow-md' 
                        : 'border-transparent hover:border-[#2D5A3D]/30'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Provider badge */}
            <div className="flex items-center gap-2">
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${info.color}15`, color: info.color }}
              >
                {info.icon} {info.name}
              </span>
            </div>
            
            {/* Title */}
            <h1 className="font-playfair text-3xl font-bold text-[#2d2d2d]">
              {product.name}
            </h1>
            
            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.floor(product.rating!) ? 'fill-[#C4A235] text-[#C4A235]' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm text-[#2D5A3D]/70">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </div>
            )}
            
            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#2D5A3D]">
                ${currentPrice.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            
            {/* Description */}
            <p className="text-[#2D5A3D]/80 leading-relaxed">
              {product.description}
            </p>
            
            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#2D5A3D]">
                  Select Option:
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant: any) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'border-[#2D5A3D] bg-[#2D5A3D]/10 text-[#2D5A3D]'
                          : 'border-gray-200 hover:border-[#2D5A3D]/30 text-gray-700'
                      }`}
                    >
                      {variant.name}
                      {variant.price !== product.price && (
                        <span className="ml-2 text-[#2D5A3D]">
                          ${variant.price.toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quantity */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-[#2D5A3D]">Quantity:</label>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-[#2D5A3D]/20 p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  addedToCart
                    ? 'bg-green-500 text-white'
                    : 'bg-[#2D5A3D] text-white hover:bg-[#234A31]'
                } disabled:opacity-70`}
              >
                {isAddingToCart ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : addedToCart ? (
                  <>
                    <Check size={20} />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag size={20} />
                    Add to Cart
                  </>
                )}
              </button>
              
              <button
                onClick={handleSendAsGift}
                className="px-6 py-4 border-2 border-[#2D5A3D] text-[#2D5A3D] rounded-xl font-semibold flex items-center gap-2 hover:bg-[#2D5A3D]/5 transition-colors"
              >
                <Gift size={20} />
                Send as Gift
              </button>
            </div>
            
            {/* Shipping Info */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#2D5A3D]/10">
              <div className="text-center">
                <Truck size={24} className="mx-auto text-[#2D5A3D] mb-2" />
                <p className="text-xs text-[#2D5A3D]/70">{info.delivery}</p>
              </div>
              <div className="text-center">
                <Shield size={24} className="mx-auto text-[#2D5A3D] mb-2" />
                <p className="text-xs text-[#2D5A3D]/70">Quality Guaranteed</p>
              </div>
              <div className="text-center">
                <RotateCcw size={24} className="mx-auto text-[#2D5A3D] mb-2" />
                <p className="text-xs text-[#2D5A3D]/70">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
