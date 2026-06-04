import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: ReactNode;}> = ({ children }) => {
  // Initialize with value from localStorage immediately (synchronously)
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('user-theme-preference');

    if (savedTheme) {
      return savedTheme;
    }
    // Default to light theme, fallback to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return 'light';
  };

  const [theme, setTheme] = useState<string>(getInitialTheme());

  useEffect(() => {

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

    // Apply Capacitor native Status Bar & Navigation Bar styling if running in a native mobile environment
    if (Capacitor.isNativePlatform()) {
      // Prevent overlay to keep solid colors on older Android versions, or let Android handle overlay automatically
      StatusBar.setOverlaysWebView({ overlay: false }).catch((err) => console.warn(err));

      StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light
      }).catch((err) => console.warn('Failed to set native status bar style:', err));

      StatusBar.setBackgroundColor({
        color: theme === 'dark' ? '#0a0a0c' : '#ffffff'
      }).catch((err) => console.warn('Failed to set native status bar background color:', err));

      // Style bottom navigation bar (Android)
      NavigationBar.setNavigationBarColor({
        color: theme === 'dark' ? '#0a0a0c' : '#ffffff',
        darkButtons: theme === 'light'
      }).catch((err) => console.warn('Failed to set native navigation bar color:', err));
    }

    // Save theme preference (persists across login sessions)
    localStorage.setItem('user-theme-preference', theme);

  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>);

};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};