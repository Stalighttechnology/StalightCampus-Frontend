import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import App from './App.tsx';
import './index.css';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().then(() => {
    // Optionally hide splash screen here or keep it in App.tsx
  }).catch(console.error);
}



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10
    }
  }
});

createRoot(document.getElementById("root")!).render(
  import.meta.env.PROD ?
  <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode> :

  <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>

);

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        // Clean registration
        registration.update();
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}