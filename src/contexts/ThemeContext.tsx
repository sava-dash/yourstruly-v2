'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'classic' | 'heroui';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('classic');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('app-theme') as Theme;
    if (stored === 'heroui' || stored === 'classic') {
      setThemeState(stored);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    // Update CSS variables
    if (newTheme === 'heroui') {
      document.documentElement.classList.add('theme-heroui');
      document.documentElement.classList.remove('theme-classic');
    } else {
      document.documentElement.classList.add('theme-classic');
      document.documentElement.classList.remove('theme-heroui');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'classic' ? 'heroui' : 'classic');
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
