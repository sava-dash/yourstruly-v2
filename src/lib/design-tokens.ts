/**
 * Design Tokens - YoursTruly V2
 * Centralized design system tokens for consistency across the app
 * Ogilvy "Modern Sanctuary" palette — Evergreen, Amber Clay, Heirloom Gold
 */

export const colors = {
  // Primary — Evergreen scale
  primary: {
    50: '#E6F0EA',
    100: '#C2D9CC',
    200: '#9BC1AB',
    300: '#74A88A',
    400: '#539672',
    500: '#2D5A3D', // Main brand Evergreen
    600: '#274F36',
    700: '#234A31',
    800: '#1B3926',
    900: '#122518',
    DEFAULT: '#2D5A3D',
  },

  // Functional colors
  success: {
    light: '#E6F0EA',
    DEFAULT: '#2D7A4F',
    dark: '#234A31',
  },
  warning: {
    light: '#FAF5E4',
    DEFAULT: '#CC8B18',
    dark: '#A67014',
  },
  error: {
    light: '#FBEAE8',
    DEFAULT: '#C23B2E',
    dark: '#9A2F24',
  },
  info: {
    light: '#E6F0EA',
    DEFAULT: '#2D5A3D',
    dark: '#234A31',
  },

  // Secondary — Amber Clay
  secondary: {
    light: '#FBF0EB',
    DEFAULT: '#B8562E',
    dark: '#934525',
  },

  // Accent — Heirloom Gold
  accent: {
    light: '#FAF5E4',
    DEFAULT: '#C4A235',
    dark: '#9D822A',
  },

  // Prompt type colors (semantic, not raw hex)
  promptTypes: {
    photo: {
      bg: '#FAF5E4',
      text: '#7A6520',
      border: '#C4A235',
    },
    memory: {
      bg: '#E6F0EA',
      text: '#1B3926',
      border: '#7A9B88',
    },
    wisdom: {
      bg: '#FBF0EB',
      text: '#6B3A1E',
      border: '#B8562E',
    },
    contact: {
      bg: '#E6F0EA',
      text: '#1B3926',
      border: '#2D7A4F',
    },
    connect: {
      bg: '#E6F0EA',
      text: '#234A31',
      border: '#7A9B88',
    },
  },

  // Neutral scale
  neutral: {
    50: '#FAFAF7',
    100: '#F5F3EE',
    200: '#DDE3DF',
    300: '#B8C4BD',
    400: '#94A09A',
    500: '#5A6660',
    600: '#404A45',
    700: '#2E3632',
    800: '#1F2522',
    900: '#1A1F1C',
  },

  // Background & Surface
  background: {
    DEFAULT: '#FAFAF7',
    secondary: '#F5F3EE',
    tertiary: '#FFFFFF',
  },

  // Text colors
  text: {
    primary: '#1A1F1C',
    secondary: '#5A6660',
    muted: '#94A09A',
    inverse: '#FFFFFF',
  },
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(45, 90, 61, 0.08)',
  lg: '0 8px 40px rgba(45, 90, 61, 0.12)',
  xl: '0 12px 48px rgba(45, 90, 61, 0.16)',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Touch target minimum (44x44pt for iOS, 48x48dp for Android)
export const touchTarget = {
  min: '44px',
  comfortable: '48px',
} as const;

export const breakpoints = {
  sm: '375px',
  md: '768px',
  lg: '1024px',
  xl: '1440px',
} as const;

/**
 * Helper to get prompt type color config
 */
export function getPromptTypeColors(type: string) {
  const typeMap: Record<string, keyof typeof colors.promptTypes> = {
    photo_backstory: 'photo',
    memory_prompt: 'memory',
    knowledge: 'wisdom',
    favorites_firsts: 'wisdom',
    recipes_wisdom: 'wisdom',
    missing_info: 'contact',
    quick_question: 'contact',
    contact_info: 'contact',
    tag_person: 'connect',
    connect_dots: 'connect',
    highlight: 'photo',
    postscript: 'memory',
  };
  
  return colors.promptTypes[typeMap[type] || 'contact'];
}
