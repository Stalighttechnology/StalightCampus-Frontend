import { fetchWithTokenRefresh } from './authService';
import { showErrorAlert } from './sweetalert';
import { API_ENDPOINT, API_BASE_URL } from './config';

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

      const isExternal = finalUrl.startsWith('http') && !finalUrl.includes(API_ENDPOINT);
      if (isExternal) {
        // Since this is an external URL (e.g. Cloudflare R2), calling fetch in JavaScript
        // violates the site's CSP (Content Security Policy) and CORS policies.
        // We open the URL directly using the native browser to trigger download/preview.
        if (isMobile) {
          window.open(finalUrl, '_blank');
        } else {
          const link = document.createElement("a");
          link.href = finalUrl;
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noreferrer");
          link.setAttribute("download", defaultFilename);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
        return; // Exit early as we have handled the download
      } else {
        response = await fetchWithTokenRefresh(finalUrl);
      }
    } else {
      response = source;
    }

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error("Received HTML error page instead of PDF");
    }

    const blob = await response.blob();
    
    // Enforce correct application/pdf MIME type if downloading a PDF
    const mimeType = defaultFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type;
    const file = new Blob([blob], { type: mimeType });
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
