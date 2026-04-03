'use client';

import { motion } from 'framer-motion';
import { Flower2, Gift, Image, Sparkles } from 'lucide-react';
import { ProviderType } from '@/types/marketplace';

interface ProviderTabsProps {
  activeProvider: ProviderType | 'all';
  onChange: (provider: ProviderType | 'all') => void;
  counts?: Record<ProviderType | 'all', number>;
  variant?: 'pills' | 'cards' | 'minimal';
}

const providers = [
  {
    id: 'flowers' as ProviderType,
    name: 'Flowers',
    description: 'Fresh bouquets',
    icon: Flower2,
    color: '#B8562E',
    bgColor: 'bg-[#B8562E]/10',
    borderColor: 'border-[#B8562E]/30',
    hoverBg: 'hover:bg-[#B8562E]/20',
    activeBg: 'bg-[#B8562E]',
  },
  {
    id: 'gifts' as ProviderType,
    name: 'Gifts',
    description: 'Thoughtful presents',
    icon: Gift,
    color: '#2D5A3D',
    bgColor: 'bg-[#2D5A3D]/10',
    borderColor: 'border-[#2D5A3D]/30',
    hoverBg: 'hover:bg-[#2D5A3D]/20',
    activeBg: 'bg-[#2D5A3D]',
  },
  {
    id: 'prints' as ProviderType,
    name: 'Prints',
    description: 'Photo keepsakes',
    icon: Image,
    color: '#4A3552',
    bgColor: 'bg-[#4A3552]/10',
    borderColor: 'border-[#4A3552]/30',
    hoverBg: 'hover:bg-[#4A3552]/20',
    activeBg: 'bg-[#4A3552]',
  },
];

export default function ProviderTabs({
  activeProvider,
  onChange,
  counts,
  variant = 'pills',
}: ProviderTabsProps) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
          const isActive = activeProvider === provider.id;
          const count = counts?.[provider.id] ?? 0;

          return (
            <motion.button
              key={provider.id}
              onClick={() => onChange(provider.id)}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                isActive
                  ? `${provider.borderColor} ${provider.bgColor}`
                  : 'border-transparent bg-white hover:bg-gray-50'
              }`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeProviderCard"
                  className="absolute inset-0 rounded-2xl border-2"
                  style={{ borderColor: provider.color }}
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <div className="relative z-10">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    isActive ? provider.activeBg : provider.bgColor
                  }`}
                >
                  <Icon
                    size={24}
                    className={isActive ? 'text-white' : ''}
                    style={{ color: isActive ? undefined : provider.color }}
                  />
                </div>

                <h3 className="font-playfair text-lg font-semibold text-[#2d2d2d] mb-1">
                  {provider.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{provider.description}</p>
                
                {count > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                    <Sparkles size={10} />
                    {count} items
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl">
        <button
          onClick={() => onChange('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeProvider === 'all'
              ? 'bg-white text-[#2d2d2d] shadow-sm'
              : 'text-gray-500 hover:text-[#2d2d2d]'
          }`}
        >
          All
        </button>
        {providers.map((provider) => {
          const isActive = activeProvider === provider.id;
          return (
            <button
              key={provider.id}
              onClick={() => onChange(provider.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#2d2d2d] shadow-sm'
                  : 'text-gray-500 hover:text-[#2d2d2d]'
              }`}
            >
              {provider.name}
            </button>
          );
        })}
      </div>
    );
  }

  // Pills variant (default)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange('all')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
          activeProvider === 'all'
            ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A3D]/50'
        }`}
      >
        All Items
        {counts && counts.all > 0 && (
          <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
            {counts.all}
          </span>
        )}
      </button>

      {providers.map((provider) => {
        const Icon = provider.icon;
        const isActive = activeProvider === provider.id;
        const count = counts?.[provider.id] ?? 0;

        return (
          <motion.button
            key={provider.id}
            onClick={() => onChange(provider.id)}
            className={`group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
              isActive
                ? `${provider.activeBg} text-white border-transparent`
                : `bg-white text-gray-600 border-gray-200 ${provider.hoverBg} hover:border-[${provider.color}]/50`
            }`}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon
              size={16}
              className={`transition-colors ${
                isActive ? 'text-white' : `text-[${provider.color}]`
              }`}
              style={{ color: isActive ? undefined : provider.color }}
            />
            <span>{provider.name}</span>
            {count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// Horizontal scrollable variant for mobile
export function ProviderTabsScrollable({
  activeProvider,
  onChange,
  counts,
}: ProviderTabsProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        <button
          onClick={() => onChange('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
            activeProvider === 'all'
              ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          All
          {counts && counts.all > 0 && (
            <span className="ml-2 text-xs opacity-70">({counts.all})</span>
          )}
        </button>

        {providers.map((provider) => {
          const Icon = provider.icon;
          const isActive = activeProvider === provider.id;
          const count = counts?.[provider.id] ?? 0;

          return (
            <button
              key={provider.id}
              onClick={() => onChange(provider.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                isActive
                  ? `${provider.activeBg} text-white border-transparent`
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              <Icon size={16} />
              <span>{provider.name}</span>
              {count > 0 && (
                <span className={`ml-1 text-xs ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
