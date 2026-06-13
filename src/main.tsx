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

// Global Mobile/PWA/Capacitor Download & View Interceptor
if (typeof window !== 'undefined') {
  // 1. Intercept all simulated or direct <a> clicks with download attributes on mobile
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.href;
    const downloadAttr = anchor.getAttribute('download');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && downloadAttr && (href.startsWith('blob:') || href.startsWith('data:'))) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        let fileBlob: Blob;
        let mimeType = 'application/pdf';
        
        if (href.startsWith('blob:')) {
          const res = await fetch(href);
          fileBlob = await res.blob();
          mimeType = fileBlob.type;
        } else {
          // data: URL
          const parts = href.split(',');
          const byteString = atob(parts[1]);
          const mimeString = parts[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          fileBlob = new Blob([ab], { type: mimeString });
          mimeType = mimeString;
        }

        if (downloadAttr.toLowerCase().endsWith('.pdf')) {
          mimeType = 'application/pdf';
        }
        
        const file = new File([fileBlob], downloadAttr, { type: mimeType });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: downloadAttr,
            text: `Download ${downloadAttr}`
          });
        } else {
          window.open(href, '_blank');
        }
      } catch (err) {
        console.error("Global mobile download intercept failed:", err);
        window.open(href, '_blank');
      }
    }
  }, true);

  // 2. Monkey-patch window.open to intercept blob/data URIs on mobile, avoiding WebView crashes/reloads
  const originalWindowOpen = window.open;
  window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && url) {
      const urlStr = url.toString();
      if (urlStr.startsWith('blob:') || urlStr.startsWith('data:')) {
        (async () => {
          try {
            let fileBlob: Blob;
            let filename = 'document.pdf';
            let mimeType = 'application/pdf';

            if (urlStr.startsWith('blob:')) {
              const res = await fetch(urlStr);
              fileBlob = await res.blob();
              mimeType = fileBlob.type;
            } else {
              const parts = urlStr.split(',');
              const byteString = atob(parts[1]);
              const mimeString = parts[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              fileBlob = new Blob([ab], { type: mimeString });
              mimeType = mimeString;
            }

            if (mimeType.includes('pdf')) filename = 'document.pdf';
            else if (mimeType.includes('image/png')) filename = 'image.png';
            else if (mimeType.includes('image/jpeg')) filename = 'image.jpg';
            else if (mimeType.includes('msword') || mimeType.includes('wordprocessingml')) filename = 'document.docx';

            const file = new File([fileBlob], filename, { type: mimeType });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: filename,
                text: `View ${filename}`
              });
            } else {
              originalWindowOpen.call(window, url, target, features);
            }
          } catch (e) {
            console.error("Global window.open share intercept failed:", e);
            originalWindowOpen.call(window, url, target, features);
          }
        })();
        return null;
      }
    }
    return originalWindowOpen.call(window, url, target, features);
  };
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