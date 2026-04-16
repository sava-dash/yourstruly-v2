'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { BrandCard as BrandCardData } from './types';
import { formatCents } from './types';

interface BrandCardProps {
  brand: BrandCardData;
}

export default function BrandCard({ brand }: BrandCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const image = !imgErr && brand.sampleImage ? brand.sampleImage : '/placeholder-product.png';

  return (
    <Link href={`/marketplace/brand/${brand.slug}`}>
      <div className="group bg-white rounded-2xl border border-[#406A56]/10 overflow-hidden transition-all duration-200 hover:border-[#406A56]/30 hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-[#F2F1E5]">
          <Image
            src={image}
            alt={brand.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgErr(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3
              className="text-white text-xl font-semibold leading-tight drop-shadow-sm"
              style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
            >
              {brand.name}
            </h3>
          </div>
        </div>
        <div className="p-4">
          {brand.blurb && (
            <p className="text-sm text-[#666] line-clamp-2 mb-2">{brand.blurb}</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#406A56] font-medium">
              {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
            </span>
            <span className="text-[#2d2d2d]">
              starts at <span className="font-semibold">{formatCents(brand.startingPriceCents)}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
