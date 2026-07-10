// API configuration - supports both development and production
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || "";
  
  // If it's a production URL (not localhost/127.0.0.1), use it directly
  if (envUrl && !envUrl.includes("127.0.0.1") && !envUrl.includes("localhost")) {
    return envUrl;
  }
  
  // For local development, dynamically match the frontend's current hostname.
  // This ensures same-site cookie behavior whether accessing via localhost or 127.0.0.1.
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Only append :8000 and force http if we are on localhost/127.0.0.1/local IPs
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
      return `http://${hostname}:8000`;
    }
    
    // Default to the dedicated backend API server in production
    return "https://campusapi.stalight.in";
  }
  
  return envUrl || "https://campusapi.stalight.in";
};

const API_BASE_URL = getApiBaseUrl().replace(/\/+$/, '');
const API_ENDPOINT = `${API_BASE_URL}/api`; // Add /api suffix for all API calls

const TOKEN_REFRESH_TIMEOUT = 10000; // 10 seconds timeout for token refresh requests

export { API_BASE_URL, API_ENDPOINT, TOKEN_REFRESH_TIMEOUT };

// Global configuration settings
export const APP_CONFIG = {
  // Whether to show the floating AI assistant widget
  SHOW_FLOATING_ASSISTANT: false, // Set to false to hide globally
};

// Helper function to check if assistant should be shown
export const shouldShowFloatingAssistant = (): boolean => {
  return APP_CONFIG.SHOW_FLOATING_ASSISTANT;
};