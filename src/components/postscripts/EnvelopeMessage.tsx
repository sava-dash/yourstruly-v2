'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Heart, Lock } from 'lucide-react';

interface EnvelopeMessageProps {
  senderName: string;
  message: string;
  onOpen?: () => void;
  isOpenable?: boolean;
}

export function EnvelopeMessage({ 
  senderName, 
  message, 
  onOpen,
  isOpenable = true 
}: EnvelopeMessageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleOpen = () => {
    if (!isOpenable || isOpen) return;
    
    setIsOpen(true);
    onOpen?.();
    
    // Show letter after flap animation
    setTimeout(() => {
      setShowLetter(true);
      // Start typewriter effect
      setIsTyping(true);
    }, 600);
  };

  // Typewriter effect
  useEffect(() => {
    if (!isTyping) return;

    let index = 0;
    const text = message;
    setDisplayedText('');

    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
      }
    }, 30); // Speed of typing

    return () => clearInterval(typeInterval);
  }, [isTyping, message]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      {/* Envelope Container */}
      <div 
        className={`envelope-container ${!isOpenable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleOpen}
      >
        {/* Envelope Body */}
        <div className="envelope-body">
          {/* Paper texture overlay */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundBlendMode: 'multiply'
          }} />
        </div>

        {/* Letter (slides out when opened) */}
        <AnimatePresence>
          {showLetter && (
            <motion.div 
              className="envelope-letter paper-texture-cream"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -80, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Letter content */}
              <div className="relative z-10 h-full flex flex-col">
                {/* Letterhead */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/50">
                  <span className="text-sm text-gray-500 font-handwritten">From {senderName}</span>
                  <Mail size={16} className="text-[#2D5A3D]" />
                </div>

                {/* Message with typewriter effect */}
                <div className="flex-1 overflow-y-auto">
                  <p className="text-gray-700 leading-relaxed font-playfair text-lg">
                    {displayedText}
                    {isTyping && (
                      <span className="typewriter-cursor" />
                    )}
                  </p>
                </div>

                {/* Signature */}
                <div className="mt-4 pt-4 border-t border-gray-200/50">
                  <p className="signature-handwritten">With love,</p>
                  <p className="signature-handwritten mt-1">{senderName}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Envelope Flap */}
        <div className={`envelope-flap ${isOpen ? 'open' : ''}`}>
          {/* Flap texture */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Wax Seal */}
        <motion.div 
          className={`envelope-wax-seal ${isOpen ? 'open' : ''}`}
          animate={!isOpen ? {
            scale: [1, 1.05, 1],
            boxShadow: [
              '0 2px 8px rgba(195, 95, 51, 0.4)',
              '0 4px 16px rgba(195, 95, 51, 0.5)',
              '0 2px 8px rgba(195, 95, 51, 0.4)'
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Heart size={20} className="text-white/90" fill="currentColor" />
        </motion.div>

        {/* Click hint */}
        <AnimatePresence>
          {!isOpen && isOpenable && (
            <motion.div 
              className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-sm text-gray-500 font-handwritten">
                Click to open
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Closed state hint */}
      {!isOpen && !isOpenable && (
        <div className="mt-8 flex items-center gap-2 text-gray-400">
          <Lock size={16} />
          <span className="text-sm">This message is not yet available</span>
        </div>
      )}
    </div>
  );
}
