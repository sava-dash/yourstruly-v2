import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

// ============================================
// STEP: READY
// ============================================

export function ReadyStep({
  name,
  location,
  onContinue,
}: {
  name: string;
  location: string;
  onContinue: () => void;
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <motion.div
        style={{ display: 'inline-flex', marginBottom: 32 }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
      >
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2D5A3D, #8DACAB)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 16px rgba(64, 106, 86, 0.08), 0 0 0 32px rgba(64, 106, 86, 0.04), 0 20px 60px rgba(64, 106, 86, 0.3)',
        }}>
          <Check size={48} color="white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: '#2d2d2d',
          margin: '0 0 16px',
          fontFamily: 'var(--font-playfair), Georgia, serif',
          letterSpacing: '-0.5px',
          lineHeight: 1.2,
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        You&apos;re all set.
      </motion.h1>

      <motion.p
        style={{
          fontSize: 18,
          color: 'rgba(45, 45, 45, 0.6)',
          lineHeight: 1.6,
          margin: '0 0 40px',
          maxWidth: 420,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        You&apos;ve already started building something meaningful.
        <br />From here, your story grows naturally, one moment at a time.
      </motion.p>

      <motion.button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 44px',
          background: '#2D5A3D',
          border: 'none',
          borderRadius: 20,
          color: 'white',
          fontSize: 20,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 12px 40px rgba(64, 106, 86, 0.35)',
          letterSpacing: '-0.2px',
        }}
        whileHover={{ y: -3, boxShadow: '0 20px 50px rgba(64, 106, 86, 0.45)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        onClick={onContinue}
      >
        Go to my dashboard <ChevronRight size={20} />
      </motion.button>
    </div>
  );
}
