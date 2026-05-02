import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with value from localStorage immediately (synchronously)
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('user-theme-preference');
    console.log('ThemeContext - getInitialTheme:', { savedTheme });
    if (savedTheme) {
      return savedTheme;
    }
    // Default to light theme, fallback to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return 'light';
  };
  
  const [theme, setTheme] = useState<string>(getInitialTheme());

  useEffect(() => {
    console.log('ThemeContext - Applying theme:', theme);
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    
    // Apply theme to root element for scrollbar styling
    const rootElement = document.getElementById('root');
    if (rootElement) {
      if (theme === 'dark') {
        rootElement.classList.add('dark');
        rootElement.classList.remove('light');
      } else {
        rootElement.classList.remove('dark');
        rootElement.classList.add('light');
      }
    }
    
    // Save theme preference (persists across login sessions)
    localStorage.setItem('user-theme-preference', theme);
    console.log('ThemeContext - Saved to localStorage:', theme, 'Current value:', localStorage.getItem('user-theme-preference'));
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};