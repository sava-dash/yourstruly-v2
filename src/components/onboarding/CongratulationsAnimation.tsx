'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Heart, Trophy, ArrowRight } from 'lucide-react';

interface CongratulationsAnimationProps {
  onComplete: () => void;
  title?: string;
  message?: string;
  delay?: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
}

const COLORS = ['#C4A235', '#2D5A3D', '#B8562E', '#8DACAB', '#4A3552'];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360
  }));
}

export function CongratulationsAnimation({ 
  onComplete, 
  title = "Welcome. Let's capture what matters.",
  message = "Your space is ready. Start with a memory, a photo, or a story worth keeping.",
  delay = 2000
}: CongratulationsAnimationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  // Generate confetti on mount
  useEffect(() => {
    setConfetti(generateConfetti(50));
    
    // Show content after a brief delay
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    // Enable continue button after delay
    const continueTimer = setTimeout(() => {
      setCanContinue(true);
    }, delay);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(continueTimer);
    };
  }, [delay]);

  // Auto-continue after extended delay
  useEffect(() => {
    const autoTimer = setTimeout(() => {
      onComplete();
    }, delay + 5000);

    return () => clearTimeout(autoTimer);
  }, [delay, onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#fefefe] to-[#f5f0e6] z-50 overflow-hidden">
      {/* Confetti Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute"
            style={{
              left: `${piece.x}%`,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
            initial={{ 
              y: -20, 
              opacity: 1, 
              rotate: piece.rotation 
            }}
            animate={{ 
              y: '110vh', 
              opacity: 0,
              rotate: piece.rotation + 720
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: 'linear',
              repeat: Infinity
            }}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            className="relative z-10 text-center px-6 max-w-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Celebration Icon */}
            <motion.div 
              className="mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: 0.2 
              }}
            >
              <div className="relative inline-flex items-center justify-center">
                {/* Glow effect */}
                <motion.div 
                  className="absolute inset-0 rounded-full bg-[#C4A235]/30 blur-xl"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                
                {/* Icon */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#C4A235] to-[#B8562E] flex items-center justify-center shadow-lg">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  >
                    <Trophy size={48} className="text-white" />
                  </motion.div>
                </div>

                {/* Sparkles around icon */}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles size={24} className="text-[#C4A235]" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 -left-1"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                >
                  <Star size={20} className="text-[#2D5A3D]" />
                </motion.div>
                <motion.div
                  className="absolute top-1/2 -left-4"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                >
                  <Heart size={18} className="text-[#B8562E]" fill="currentColor" />
                </motion.div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2 
              className="text-3xl font-bold text-gray-800 mb-4 font-playfair"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {title}
            </motion.h2>

            {/* Message */}
            <motion.p 
              className="text-gray-600 text-lg mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {message}
            </motion.p>

            {/* Features unlocked */}
            <motion.div 
              className="grid grid-cols-2 gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {[
                { icon: '📸', label: 'Capture Memories' },
                { icon: '💭', label: 'Share Stories' },
                { icon: '👨‍👩‍👧‍👦', label: 'Connect Family' },
                { icon: '📚', label: 'Build Legacy' },
              ].map((feature, index) => (
                <motion.div
                  key={feature.label}
                  className="flex items-center gap-2 p-3 bg-white/80 rounded-xl shadow-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Continue Button */}
            <motion.button
              onClick={onComplete}
              disabled={!canContinue}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium
                         transition-all duration-300 ${
                           canContinue
                             ? 'bg-[#2D5A3D] text-white hover:bg-[#355a48] shadow-lg hover:shadow-xl'
                             : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                         }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={canContinue ? { scale: 1.02 } : {}}
              whileTap={canContinue ? { scale: 0.98 } : {}}
            >
              {canContinue ? (
                <>
                  Enter Your Dashboard
                  <ArrowRight size={18} />
                </>
              ) : (
                'Preparing your space...'
              )}
            </motion.button>

            {/* Auto-continue hint */}
            {canContinue && (
              <motion.p 
                className="mt-4 text-sm text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Continuing automatically in a few seconds...
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
