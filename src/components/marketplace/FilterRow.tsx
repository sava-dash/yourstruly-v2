'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { MarketplaceView } from './types';

interface FilterRowProps {
  view: MarketplaceView;
  onViewChange: (view: MarketplaceView) => void;
  priceMin: number;
  priceMax: number;
  onPriceChange: (min: number, max: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onOpenMobileCategories?: () => void;
}


export default function FilterRow({
  view,
  onViewChange,
  priceMin,
  priceMax,
  onPriceChange,
  search,
  onSearchChange,
  onOpenMobileCategories,
}: FilterRowProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [showPrice, setShowPrice] = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (localSearch === search) return;
    const id = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(id);
  }, [localSearch, onSearchChange, search]);

  // Click-away for price popover
  useEffect(() => {
    if (!showPrice) return;
    function onDocClick(e: MouseEvent) {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setShowPrice(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showPrice]);

  const priceLabel =
    priceMin === 0 && priceMax >= 500
      ? 'Price'
      : `$${priceMin}–$${priceMax >= 500 ? '500+' : priceMax}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Mobile Categories button */}
      {onOpenMobileCategories && (
        <button
          type="button"
          onClick={onOpenMobileCategories}
          className="lg:hidden flex items-center gap-1.5 min-h-[44px] px-3 rounded-full border border-[#406A56]/20 text-sm text-[#406A56] hover:bg-[#D3E1DF]/40"
        >
          <SlidersHorizontal size={16} /> Categories
        </button>
      )}

      {/* Brands ↔ Products toggle */}
      <div className="inline-flex rounded-full border border-[#406A56]/20 p-1 bg-white">
        {(['brands', 'products'] as MarketplaceView[]).map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`min-h-[40px] px-4 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#406A56] text-white'
                  : 'text-[#406A56] hover:bg-[#D3E1DF]/50'
              }`}
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              {v === 'brands' ? 'Brands' : 'Products'}
            </button>
          );
        })}
      </div>

      {/* Price dropdown */}
      <div ref={priceRef} className="relative">
        <button
          type="button"
          onClick={() => setShowPrice((s) => !s)}
          className="min-h-[40px] px-4 rounded-full border border-[#406A56]/20 bg-white text-sm text-[#2d2d2d] hover:border-[#406A56]/40"
        >
          {priceLabel} ▾
        </button>
        {showPrice && (
          <div className="absolute left-0 top-full mt-2 z-20 w-72 p-4 rounded-xl bg-white border border-gray-200 shadow-lg">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>${priceMin}</span>
              <span>{priceMax >= 500 ? '$500+' : `$${priceMax}`}</span>
            </div>
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={priceMin}
              onChange={(e) =>
                onPriceChange(Math.min(Number(e.target.value), priceMax - 10), priceMax)
              }
              className="w-full accent-[#406A56] mb-3"
            />
            <label className="block text-xs text-gray-500 mb-1">Maximum</label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={priceMax}
              onChange={(e) =>
                onPriceChange(priceMin, Math.max(Number(e.target.value), priceMin + 10))
              }
              className="w-full accent-[#406A56]"
            />
            <button
              type="button"
              onClick={() => onPriceChange(0, 500)}
              className="mt-3 text-xs text-[#C35F33] hover:underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px] ml-auto">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search gifts, brands…"
          className="w-full pl-9 pr-9 min-h-[40px] rounded-full border border-[#406A56]/20 bg-white text-sm focus:outline-none focus:border-[#406A56] focus:ring-2 focus:ring-[#406A56]/20"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch('');
              onSearchChange('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
