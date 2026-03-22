'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, Calendar, MapPin, Heart, User, Sparkles, Loader2, Check } from 'lucide-react';
import type { EngagementPrompt, PromptResponse } from '@/types/engagement';

interface ContactInfoModalProps {
  prompt: EngagementPrompt;
  onComplete: (result: {
    contactUpdated: boolean;
    xpAwarded: number;
    contactId?: string;
  }) => void;
  onClose: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

// Field configuration with icons and input types
const FIELD_CONFIG: Record<string, { 
  icon: typeof Phone; 
  label: string; 
  placeholder: string;
  inputType: string;
  pattern?: string;
}> = {
  phone: { 
    icon: Phone, 
    label: 'Phone Number', 
    placeholder: '(555) 123-4567',
    inputType: 'tel',
  },
  email: { 
    icon: Mail, 
    label: 'Email Address', 
    placeholder: 'email@example.com',
    inputType: 'email',
  },
  date_of_birth: { 
    icon: Calendar, 
    label: 'Birthday', 
    placeholder: 'MM/DD/YYYY',
    inputType: 'date',
  },
  birth_date: { 
    icon: Calendar, 
    label: 'Birthday', 
    placeholder: 'MM/DD/YYYY',
    inputType: 'date',
  },
  address: { 
    icon: MapPin, 
    label: 'Address', 
    placeholder: '123 Main St, City, State',
    inputType: 'text',
  },
  relationship: { 
    icon: Heart, 
    label: 'Relationship', 
    placeholder: 'How are they related to you?',
    inputType: 'text',
  },
  relationship_type: { 
    icon: Heart, 
    label: 'Relationship', 
    placeholder: 'How are they related to you?',
    inputType: 'text',
  },
};

// Common relationship options for quick selection
const RELATIONSHIP_OPTIONS = [
  'Mother', 'Father', 'Sister', 'Brother', 
  'Grandmother', 'Grandfather', 'Aunt', 'Uncle',
  'Cousin', 'Spouse', 'Child', 'Friend', 'Colleague'
];

// XP for completing missing info
const XP_REWARD = 5;

export function ContactInfoModal({
  prompt,
  onComplete,
  onClose,
  onSkip,
  onDismiss,
}: ContactInfoModalProps) {
  const [fieldValue, setFieldValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Determine which field we're collecting
  const missingField = prompt.missingField || 'phone';
  const fieldConfig = FIELD_CONFIG[missingField] || FIELD_CONFIG.phone;
  const FieldIcon = fieldConfig.icon;
  const isRelationship = missingField === 'relationship' || missingField === 'relationship_type';

  // Get contact name
  const contactName = prompt.contactName || prompt.metadata?.contact?.name || 'Contact';

  const handleSubmit = useCallback(async () => {
    if (!fieldValue.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Submit using the same API as regular prompts
      const res = await fetch(`/api/engagement/prompts/${prompt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseType: 'text',
          responseText: fieldValue.trim(),
          responseData: { value: fieldValue.trim(), field: missingField },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Failed to save contact info:', error);
        throw new Error(error.error || 'Failed to save');
      }

      const result = await res.json();
      
      // Show success animation
      setShowSuccess(true);
      
      // Wait for animation then close
      setTimeout(() => {
        onComplete({
          contactUpdated: result.contactUpdated,
          xpAwarded: result.xpAwarded || XP_REWARD,
          contactId: result.contactId,
        });
      }, 1200);

    } catch (err) {
      console.error('Error saving contact info:', err);
      setIsSubmitting(false);
    }
  }, [fieldValue, prompt.id, missingField, onComplete]);

  const handleQuickSelect = useCallback((value: string) => {
    setFieldValue(value);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay-page"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="modal-content-page max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            /* Success State */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-[#406A56]/10 flex items-center justify-center mb-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                >
                  <Check size={40} className="text-[#406A56]" />
                </motion.div>
              </motion.div>
              <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">Updated!</h3>
              <p className="text-[#666] text-sm mb-4">{contactName}'s info has been saved</p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D9C61A]/20 rounded-full"
              >
                <Sparkles size={14} className="text-[#8a7c08]" />
                <span className="text-sm font-medium text-[#8a7c08]">+{XP_REWARD} XP</span>
              </motion.div>
            </motion.div>
          ) : (
            /* Form State */
            <motion.div key="form">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#406A56]/20 to-[#D9C61A]/20 flex items-center justify-center">
                    <FieldIcon size={20} className="text-[#406A56]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">Add {fieldConfig.label}</h2>
                    <p className="text-xs text-[#666]">for {contactName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-[#406A56]/50 hover:text-[#406A56] hover:bg-[#406A56]/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contact Avatar Card */}
              <div className="flex items-center gap-4 p-4 bg-[#F2F1E5] rounded-xl mb-6">
                <div className="w-14 h-14 rounded-full bg-[#406A56]/10 text-[#406A56] flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {prompt.contactPhotoUrl ? (
                    <img 
                      src={prompt.contactPhotoUrl} 
                      alt="" 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    contactName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#2d2d2d] font-semibold truncate">{contactName}</h3>
                  <p className="text-sm text-[#666]">
                    {prompt.metadata?.contact?.relationship_type || 'Family member'}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-[#D9C61A]/20 rounded-full">
                  <Sparkles size={12} className="text-[#8a7c08]" />
                  <span className="text-xs font-medium text-[#8a7c08]">+{XP_REWARD}</span>
                </div>
              </div>

              {/* Input Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#666] mb-2">
                  What is {contactName}'s {fieldConfig.label.toLowerCase()}?
                </label>
                
                {/* Quick select for relationship */}
                {isRelationship && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleQuickSelect(option)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          fieldValue === option
                            ? 'bg-[#406A56] text-white'
                            : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#406A56]/50">
                    <FieldIcon size={18} />
                  </div>
                  <input
                    type={fieldConfig.inputType}
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={fieldConfig.placeholder}
                    className="form-input !pl-12"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && fieldValue.trim()) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#406A56]/10">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onSkip}
                    className="px-3 py-1.5 text-sm text-[#666] hover:text-[#406A56] transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="px-3 py-1.5 text-sm text-[#666] hover:text-[#C35F33] transition-colors"
                  >
                    Don't ask again
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!fieldValue.trim() || isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
