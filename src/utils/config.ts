// API configuration - supports both development and production
const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? "https://gleamator-erp-backend-1ac2.onrender.com"
  : "http://localhost:8000";

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const isLocalApiBaseUrl = ENV_API_BASE_URL === "http://localhost:8000" || ENV_API_BASE_URL === "http://127.0.0.1:8000";
const API_BASE_URL = import.meta.env.PROD && isLocalApiBaseUrl
  ? DEFAULT_API_BASE_URL
  : ENV_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/api`; // Add /api suffix for all API calls

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
