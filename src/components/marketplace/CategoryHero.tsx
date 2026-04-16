'use client';

import type { CategoryNode } from './types';

interface CategoryHeroProps {
  category: CategoryNode;
  selectedChildSlug?: string;
  onSelectChild: (slug: string | undefined) => void;
}

export default function CategoryHero({
  category,
  selectedChildSlug,
  onSelectChild,
}: CategoryHeroProps) {
  const children = category.children || [];

  return (
    <section className="rounded-2xl bg-[#D3E1DF]/50 border border-[#406A56]/15 p-5 md:p-6 mb-6">
      <div className="flex items-start gap-3">
        {category.icon && (
          <span className="text-3xl leading-none mt-0.5" aria-hidden>
            {category.icon}
          </span>
        )}
        <div>
          <h2
            className="text-2xl md:text-3xl font-semibold text-[#406A56] leading-tight"
            style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
          >
            {category.name}
          </h2>
          <p className="text-sm text-[#666] mt-1">
            {children.length > 0
              ? 'Browse by sub-category or scroll for all'
              : 'Curated picks, hand-selected by our team'}
          </p>
        </div>
      </div>

      {children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectChild(undefined)}
            className={`min-h-[36px] px-3 rounded-full text-xs font-medium transition-colors ${
              !selectedChildSlug
                ? 'bg-[#406A56] text-white'
                : 'bg-white text-[#406A56] border border-[#406A56]/20 hover:bg-[#D3E1DF]'
            }`}
          >
            All {category.name}
          </button>
          {children.map((child) => {
            const active = selectedChildSlug === child.slug;
            return (
              <button
                key={child.slug}
                type="button"
                onClick={() => onSelectChild(child.slug)}
                className={`min-h-[36px] px-3 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#406A56] text-white'
                    : 'bg-white text-[#406A56] border border-[#406A56]/20 hover:bg-[#D3E1DF]'
                }`}
              >
                {child.icon ? `${child.icon} ` : ''}
                {child.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
