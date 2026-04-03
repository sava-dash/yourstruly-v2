/**
 * Example: Using GiftSelectionModal in PostScript Editor
 * 
 * This file demonstrates how to integrate the GiftSelectionModal
 * into the PostScript creation/editing flow.
 */

'use client';

import { useState } from 'react';
import { GiftSelectionModal, InlineGiftSelector } from '@/components/marketplace';
import { Product, GiftSelectionContext } from '@/types/marketplace';

// Example 1: Using the full modal in a separate step
export function PostScriptGiftStep() {
  const [selectedGift, setSelectedGift] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const context: GiftSelectionContext = {
    eventType: 'birthday',
    budget: { min: 20, max: 100 },
    // contactId and postscriptId would come from your PostScript state
  };

  return (
    <div className="p-6">
      <h2 className="font-playfair text-2xl font-bold mb-4">Add a Gift</h2>
      
      {selectedGift ? (
        <div className="bg-white p-4 rounded-xl border border-[#2D5A3D]/20">
          <div className="flex items-center gap-4">
            <img 
              src={selectedGift.thumbnail} 
              alt={selectedGift.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold">{selectedGift.name}</h3>
              <p className="text-[#2D5A3D] font-bold">${selectedGift.price.toFixed(2)}</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="ml-auto px-4 py-2 text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-12 border-2 border-dashed border-[#2D5A3D]/30 rounded-xl text-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-colors"
        >
          <span className="font-handwritten text-xl">+ Select a Gift</span>
        </button>
      )}

      <GiftSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectGift={setSelectedGift}
        context={context}
        title="Choose a Birthday Gift"
      />
    </div>
  );
}

// Example 2: Using the inline selector (recommended for compact forms)
export function PostScriptEditorCompact() {
  const [attachedGift, setAttachedGift] = useState<Product | null>(null);

  return (
    <div className="space-y-4 p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Message
        </label>
        <textarea 
          className="w-full p-4 border border-gray-200 rounded-xl"
          rows={6}
          placeholder="Write your heartfelt message..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attach a Gift (Optional)
        </label>
        <InlineGiftSelector
          selectedGift={attachedGift}
          onSelectGift={setAttachedGift}
          onRemoveGift={() => setAttachedGift(null)}
        />
      </div>

      <button className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-semibold">
        Save PostScript
      </button>
    </div>
  );
}

// Example 3: Pre-filtered by provider
export function FlowerSelectionExample() {
  const [selectedFlowers, setSelectedFlowers] = useState<Product | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Choose Flowers
      </button>

      <GiftSelectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectGift={(product) => {
          setSelectedFlowers(product);
          setIsOpen(false);
        }}
        // The modal will start with 'flowers' provider pre-selected
        // based on the context or the parent can set initial state
      />
    </div>
  );
}
