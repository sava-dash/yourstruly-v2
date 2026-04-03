'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PillSelectorProps {
  selected: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  maxSelections?: number;
}

export function PillSelector({
  selected,
  onChange,
  suggestions,
  placeholder = "Or add a custom option...",
  maxSelections = 20
}: PillSelectorProps) {
  const [customInput, setCustomInput] = useState('');

  const addItem = (item: string) => {
    const normalized = item.trim();
    if (normalized && !selected.includes(normalized) && selected.length < maxSelections) {
      onChange([...selected, normalized]);
    }
  };

  const removeItem = (item: string) => {
    onChange(selected.filter(i => i !== item));
  };

  const addCustom = () => {
    if (customInput.trim()) {
      addItem(customInput.trim());
      setCustomInput('');
    }
  };

  const availableSuggestions = suggestions.filter(s => !selected.includes(s));

  return (
    <div className="space-y-4">
      {/* Selected items */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {selected.map(item => (
              <motion.span
                key={item}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A3D]/15 text-[#2D5A3D] text-sm rounded-full"
              >
                {item}
                <button 
                  onClick={() => removeItem(item)} 
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Click to add label */}
      {availableSuggestions.length > 0 && (
        <p className="text-xs text-gray-400">Click to add:</p>
      )}

      {/* Suggestions grid */}
      <div className="max-h-[200px] overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {availableSuggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => addItem(suggestion)}
              disabled={selected.length >= maxSelections}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-[#2D5A3D]/10 
                         text-gray-600 hover:text-[#2D5A3D] text-sm rounded-full transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:border-[#2D5A3D]/30"
            >
              <Plus size={12} />
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#2d2d2d]
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/40"
          placeholder={placeholder}
        />
        <button 
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#355a48] text-white text-sm font-medium rounded-xl 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
