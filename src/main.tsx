import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  import.meta.env.PROD ? (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  ) : (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  )
);

// Service worker with cache busting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `/sw.js?v=${Date.now()}`
    
    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);
        registration.update()
        setInterval(() => {
          registration.update()
        }, 5000)
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}