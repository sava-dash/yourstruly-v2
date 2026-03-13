'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Palette } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'floating' | 'inline';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ThemeToggle({ 
  variant = 'floating',
  position = 'top-right' 
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          fixed ${positionClasses[position]} z-50
          flex items-center gap-2 px-4 py-2
          bg-white/90 backdrop-blur-sm rounded-full
          text-xs font-medium
          border shadow-lg
          transition-all hover:shadow-xl hover:scale-105
          ${theme === 'heroui' 
            ? 'border-[#52325d]/20 text-[#52325d] hover:bg-[#52325d]/5' 
            : 'border-[#406A56]/20 text-[#406A56] hover:bg-[#406A56]/5'
          }
        `}
        title={`Switch to ${theme === 'classic' ? 'HeroUI' : 'Classic'} theme`}
      >
        <Palette size={14} />
        <span>{theme === 'heroui' ? '🎨 HeroUI' : '⚡ Classic'}</span>
        <span className="text-[10px] opacity-60">• Click to switch</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5
        bg-white rounded-full text-xs font-medium
        border transition-all
        ${theme === 'heroui'
          ? 'border-[#52325d]/20 text-[#52325d] hover:bg-[#52325d]/5'
          : 'border-[#406A56]/20 text-[#406A56] hover:bg-[#406A56]/5'
        }
      `}
    >
      <Palette size={12} />
      {theme === 'heroui' ? 'HeroUI' : 'Classic'}
    </button>
  );
}
