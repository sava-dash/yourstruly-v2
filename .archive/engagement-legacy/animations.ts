import { Variants } from 'framer-motion';

// ============================================================================
// BUBBLE COLORS BY TYPE
// ============================================================================

export const BUBBLE_COLORS: Record<string, {
  accent: string;
  bgFrom: string;
  bgTo: string;
}> = {
  photo_backstory: {
    accent: '#f59e0b',
    bgFrom: 'rgba(245, 158, 11, 0.15)',
    bgTo: 'rgba(245, 158, 11, 0.05)',
  },
  tag_person: {
    accent: '#3b82f6',
    bgFrom: 'rgba(59, 130, 246, 0.15)',
    bgTo: 'rgba(59, 130, 246, 0.05)',
  },
  missing_info: {
    accent: '#10b981',
    bgFrom: 'rgba(16, 185, 129, 0.15)',
    bgTo: 'rgba(16, 185, 129, 0.05)',
  },
  memory_prompt: {
    accent: '#8b5cf6',
    bgFrom: 'rgba(139, 92, 246, 0.15)',
    bgTo: 'rgba(139, 92, 246, 0.05)',
  },
  knowledge: {
    accent: '#ec4899',
    bgFrom: 'rgba(236, 72, 153, 0.15)',
    bgTo: 'rgba(236, 72, 153, 0.05)',
  },
  connect_dots: {
    accent: '#06b6d4',
    bgFrom: 'rgba(6, 182, 212, 0.15)',
    bgTo: 'rgba(6, 182, 212, 0.05)',
  },
  highlight: {
    accent: '#eab308',
    bgFrom: 'rgba(234, 179, 8, 0.15)',
    bgTo: 'rgba(234, 179, 8, 0.05)',
  },
  quick_question: {
    accent: '#6366f1',
    bgFrom: 'rgba(99, 102, 241, 0.15)',
    bgTo: 'rgba(99, 102, 241, 0.05)',
  },
};

// ============================================================================
// BUBBLE ANIMATIONS
// ============================================================================

export const bubbleAnimations = {
  // Container animation with staggered children
  container: {
    hidden: {
      opacity: 0,
      scale: 0.3,
      y: 20,
    },
    visible: (index: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.08,
      },
    }),
    exit: {
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  } as Variants,

  // Gentle floating animation for idle bubbles
  float: {
    initial: { y: 0 },
    animate: {
      y: [-2, 2, -2],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  } as Variants,

  // Expand animation when clicked
  expand: {
    collapsed: {
      width: 180,
      height: 'auto',
    },
    expanded: {
      width: 340,
      height: 'auto',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  } as Variants,

  // Success/complete animation
  complete: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.1, 0],
      opacity: [1, 1, 0],
      transition: {
        duration: 0.5,
        times: [0, 0.3, 1],
        ease: 'easeOut',
      },
    },
  } as Variants,

  // Skip animation (slide out right)
  skip: {
    initial: { x: 0, opacity: 1 },
    animate: {
      x: 50,
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  } as Variants,

  // Dismiss animation (fade out)
  dismiss: {
    initial: { opacity: 1, filter: 'blur(0px)' },
    animate: {
      opacity: 0,
      filter: 'blur(4px)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  } as Variants,
};

// ============================================================================
// SPARKLE/CONFETTI PARTICLES
// ============================================================================

export interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  velocity: { x: number; y: number };
  rotation: number;
  rotationVelocity: number;
}

export function createParticles(
  centerX: number,
  centerY: number,
  count: number = 12,
  colors: string[] = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6']
): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const velocity = 2 + Math.random() * 3;
    
    return {
      id: i,
      x: centerX,
      y: centerY,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocity: {
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity - 2, // Slight upward bias
      },
      rotation: Math.random() * 360,
      rotationVelocity: (Math.random() - 0.5) * 20,
    };
  });
}

export const particleAnimation = {
  initial: (particle: Particle) => ({
    x: particle.x,
    y: particle.y,
    rotate: particle.rotation,
    scale: 1,
    opacity: 1,
  }),
  animate: (particle: Particle) => ({
    x: particle.x + particle.velocity.x * 50,
    y: particle.y + particle.velocity.y * 50 + 30, // Gravity
    rotate: particle.rotation + particle.rotationVelocity * 10,
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
};

// ============================================================================
// HOVER EFFECTS
// ============================================================================

export const hoverEffects = {
  lift: {
    scale: 1.02,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  glow: {
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25), 0 0 20px var(--accent-color)',
  },
};

// ============================================================================
// MOBILE-SPECIFIC ANIMATIONS
// ============================================================================

export const mobileAnimations = {
  // Simpler animations for better mobile performance
  container: {
    hidden: { opacity: 0, y: 10 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        delay: index * 0.05,
      },
    }),
    exit: {
      opacity: 0,
      transition: { duration: 0.15 },
    },
  } as Variants,
};

// ============================================================================
// UTILITY: Check if reduced motion is preferred
// ============================================================================

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============================================================================
// UTILITY: Get animation variant based on device/preferences
// ============================================================================

export function getAnimationVariant(isMobile: boolean = false) {
  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  
  return isMobile ? mobileAnimations.container : bubbleAnimations.container;
}
