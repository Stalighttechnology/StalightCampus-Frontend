import { fetchWithTokenRefresh } from './authService';
import { showErrorAlert } from './sweetalert';
import { API_ENDPOINT, API_BASE_URL } from './config';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Converts a Blob to a raw base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
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

/**
 * Reusable utility to handle file downloads (specifically PDFs) across
 * web browsers, PWAs, and mobile app webviews.
 * 
 * @param source The Response object or string URL to download
 * @param defaultFilename The filename to save the document as
 */
export const downloadFile = async (source: Response | string, defaultFilename: string) => {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let response: Response;

    if (typeof source === 'string') {
      let finalUrl = source;
      if (source.startsWith('/')) {
        finalUrl = `${API_BASE_URL}${source}`;
      }

      const isExternal = finalUrl.startsWith('http') && !finalUrl.includes(API_BASE_URL);
      if (isExternal) {
        // Since this is an external URL (e.g. Cloudflare R2), calling fetch in JavaScript
        // violates the site's CSP (Content Security Policy) and CORS policies.
        // We route it through our Django backend's R2 download proxy, which returns the file
        // from our own API domain with the appropriate Content-Disposition headers.
        finalUrl = `${API_ENDPOINT}/r2/download/?file_url=${encodeURIComponent(finalUrl)}`;
      }
      
      response = await fetchWithTokenRefresh(finalUrl);
    } else {
      response = source;
    }

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
      throw new Error("Received error response instead of document binary");
    }

    const blob = await response.blob();
    
    // Enforce correct application/pdf MIME type if downloading a PDF
    const mimeType = defaultFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type;
    const file = new Blob([blob], { type: mimeType });

    // Handle Capacitor Native Platform download
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await blobToBase64(file);
        
        // Write the file to device's Cache directory
        const savedFile = await Filesystem.writeFile({
          path: defaultFilename,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Use native OS sharing to open / save file
        await Share.share({
          title: defaultFilename,
          url: savedFile.uri,
        });
        return;
      } catch (nativeError) {
        console.error("Native download or sharing failed, trying web fallback:", nativeError);
      }
    }

    const downloadUrl = window.URL.createObjectURL(file);
    
    if (isMobile) {
      // For mobile devices and PWAs, try to use the Web Share API first.
      // This is the most reliable way to save/export files within native WebView contexts
      // (like Capacitor or Safari/Chrome iOS/Android) where window.open of blobs is restricted.
      if (navigator.share && navigator.canShare) {
        try {
          const fileToShare = new File([blob], defaultFilename, { type: mimeType });
          if (navigator.canShare({ files: [fileToShare] })) {
            await navigator.share({
              files: [fileToShare],
              title: defaultFilename,
              text: `Download ${defaultFilename}`
            });
            // Successfully shared/saved, clean up and return
            setTimeout(() => {
              window.URL.revokeObjectURL(downloadUrl);
            }, 1500);
            return;
          }
        } catch (shareError) {
          console.warn("Navigator share failed, falling back to window.open:", shareError);
        }
      }

      // Fallback: Use simulated anchor click to download/save instead of window.open (which reloads WebViews)
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", defaultFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      // On desktop, simulate an anchor click to save directly with the correct filename.
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", defaultFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    // Clean up memory after a short delay
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1500);

  } catch (error) {
    showErrorAlert("Download Failed", "Failed to download document.");
    throw error;
  }
};
