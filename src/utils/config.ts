// API configuration - supports both development and production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
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