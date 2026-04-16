'use client';

import { SCOPE_PILLS, type MarketplaceScope } from './types';

interface ScopePillsProps {
  scope: MarketplaceScope;
  onChange: (scope: MarketplaceScope) => void;
  className?: string;
}

export default function ScopePills({ scope, onChange, className = '' }: ScopePillsProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="tablist"
      aria-label="Marketplace scope"
    >
      {SCOPE_PILLS.map((pill) => {
        const active = pill.id === scope;
        return (
          <button
            key={pill.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(pill.id)}
            className={`min-h-[44px] px-5 rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-[#406A56] text-white shadow-sm'
                : 'bg-[#D3E1DF] text-[#406A56] hover:bg-[#D3E1DF]/70'
            }`}
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
