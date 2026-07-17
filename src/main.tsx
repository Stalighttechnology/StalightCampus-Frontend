import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import App from './App.tsx';
import './index.css';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().then(() => {
    // Optionally hide splash screen here or keep it in App.tsx
  }).catch(console.error);
}

// Global cache to map created Blob URLs directly to their corresponding Blob binaries.
// This allows Capacitor WebView to access the file contents instantly without blocked fetch requests.
const blobMap = new Map<string, Blob>();

if (typeof window !== 'undefined') {
  const originalCreateObjectURL = window.URL.createObjectURL;
  window.URL.createObjectURL = function (obj: any) {
    const url = originalCreateObjectURL.call(window.URL, obj);
    if (obj instanceof Blob) {
      blobMap.set(url, obj);
    }
    return url;
  };

  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  window.URL.revokeObjectURL = function (url: string) {
    // Delay removing from map to allow click events and storage processes to complete
    setTimeout(() => {
      blobMap.delete(url);
    }, 15000);
    try {
      originalRevokeObjectURL.call(window.URL, url);
    } catch (e) {
      // Ignore invalid or already revoked URLs
    }
  };
}

// Helper to convert Blob to base64
const blobToBase64Helper = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(blob);
  });
};

// Global Mobile/PWA/Capacitor Download & View Interceptor
if (typeof window !== 'undefined') {
  // 1. Intercept all simulated or direct <a> clicks with download attributes on mobile
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor || anchor.dataset.bypassIntercept === 'true') return;

    const href = anchor.href;
    const downloadAttr = anchor.getAttribute('download');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if ((isMobile || Capacitor.isNativePlatform()) && downloadAttr && (href.startsWith('blob:') || href.startsWith('data:'))) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        let fileBlob: Blob | undefined;
        let mimeType = 'application/pdf';
        
        if (href.startsWith('blob:')) {
          // Look up in our local blobMap first to bypass WebView fetch blockages
          fileBlob = blobMap.get(href);
          if (!fileBlob) {
            const res = await fetch(href);
            fileBlob = await res.blob();
          }
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
        
        // Handle Capacitor Native Platform
        if (Capacitor.isNativePlatform()) {
          try {
            const base64Data = await blobToBase64Helper(fileBlob);
            const savedFile = await Filesystem.writeFile({
              path: downloadAttr,
              data: base64Data,
              directory: Directory.Cache,
            });

            await Share.share({
              title: downloadAttr,
              url: savedFile.uri,
            });
            return;
          } catch (nativeErr) {
            console.error("Native write/share failed in global click interceptor:", nativeErr);
          }
        }

        const file = new File([fileBlob], downloadAttr, { type: mimeType });

        if (event.isTrusted && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: downloadAttr,
            text: `Download ${downloadAttr}`
          });
        } else {
          // Fallback: trigger normal download by bypassing the click interceptor
          anchor.dataset.bypassIntercept = 'true';
          anchor.click();
          delete anchor.dataset.bypassIntercept;
        }
      } catch (err) {
        console.error("Global mobile download intercept failed:", err);
        // Fallback: trigger normal download by bypassing the click interceptor
        anchor.dataset.bypassIntercept = 'true';
        anchor.click();
        delete anchor.dataset.bypassIntercept;
      }
    }
  }, true);

  // 2. Monkey-patch window.open to intercept blob/data URIs on mobile, avoiding WebView crashes/reloads
  const originalWindowOpen = window.open;
  window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if ((isMobile || Capacitor.isNativePlatform()) && url) {
      const urlStr = url.toString();
      if (urlStr.startsWith('blob:') || urlStr.startsWith('data:')) {
        (async () => {
          let filename = 'document.pdf';
          try {
            let fileBlob: Blob | undefined;
            let mimeType = 'application/pdf';

            if (urlStr.startsWith('blob:')) {
              // Retrieve Blob directly from our custom mapping first
              fileBlob = blobMap.get(urlStr);
              if (!fileBlob) {
                const res = await fetch(urlStr);
                fileBlob = await res.blob();
              }
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

            // Handle Capacitor Native Platform
            if (Capacitor.isNativePlatform()) {
              try {
                const base64Data = await blobToBase64Helper(fileBlob);
                const savedFile = await Filesystem.writeFile({
                  path: filename,
                  data: base64Data,
                  directory: Directory.Cache,
                });

                await Share.share({
                  title: filename,
                  url: savedFile.uri,
                });
                return;
              } catch (nativeErr) {
                console.error("Native write/share failed in global window.open interceptor:", nativeErr);
              }
            }

            const file = new File([fileBlob], filename, { type: mimeType });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: filename,
                text: `View ${filename}`
              });
            } else {
              // Safe fallback: simulate download instead of using window.open which reloads/crashes
              const link = document.createElement("a");
              link.href = urlStr;
              link.setAttribute("download", filename);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }
          } catch (e) {
            console.error("Global window.open share intercept failed:", e);
            // Safe fallback: simulate download instead of using window.open which reloads/crashes
            const link = document.createElement("a");
            link.href = urlStr;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
          }
        })();
        return null;
      }
    }
    return originalWindowOpen.call(window, url, target, features);
  };

  // 3. Monkey-patch URL.revokeObjectURL to delay revocation on mobile devices.
  // This prevents the system download manager from failing with "Failed - Network error"
  // due to premature revocation of blob URLs.
  const originalRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = function (url: string) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setTimeout(() => {
        try {
          originalRevoke.call(URL, url);
        } catch (e) {
          // Ignore if already revoked or invalid
        }
      }, 60000); // Delay by 60 seconds
    } else {
      originalRevoke.call(URL, url);
    }
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
        registration.update().catch((error) => {
          console.warn('Service worker update check failed:', error);
        });
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}