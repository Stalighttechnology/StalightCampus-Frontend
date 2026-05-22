import { API_ENDPOINT, TOKEN_REFRESH_TIMEOUT, API_BASE_URL } from "./config";

// Type definitions for request and response data
interface AuthResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  username?: string;
  email?: string;
  role?: "admin" | "principal" | "hod" | "teacher" | "faculty" | "student" | "fees_manager" | "coe" | "dean" | "hms" | "warden" | "caretaker";
  department?: string | null;
  profile_image?: string | null;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse extends AuthResponse {
  access?: string;
  refresh?: string;
  password_reset_required?: boolean;
  profile?: {
    user_id?: string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    department?: string | null;
    profile_image?: string | null;
    branch?: string;
    semester?: number;
    section?: string;
  };
}

interface VerifyOTPRequest {
  user_id: string;
  otp: string;
}

interface ResendOTPRequest {
  user_id: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  user_id: string;
  otp: string;
  new_password: string;
  confirm_password: string;
}

interface LogoutRequest {
  refresh: string | null;
}

// Generic response type for API calls
interface GenericResponse {
  success: boolean;
  message?: string;
  user_id?: string;
}

// Token refresh response type
interface RefreshTokenResponse {
  success: boolean;
  access?: string;
  refresh?: string;
  message?: string;
}

// Helper to check if a JWT token is expired
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const { exp } = JSON.parse(jsonPayload);
    // Refresh 30 seconds before actual expiration to be safe
    return Date.now() >= exp * 1000 - 30000;
  } catch (error) {
    return true;
  }
};

// Wrapper function to handle token refresh on 401 errors or proactively
export const fetchWithTokenRefresh = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Access token is now managed by AuthContext (in‑memory). We retrieve it from sessionStorage if available.
    // Note: AuthContext will populate sessionStorage with a refreshed token via its refreshAccessToken method.
    let accessToken = sessionStorage.getItem("access_token");

    // Ensure Authorization header is set only when we have a token.
    const safeHeaders = {
      ...(options.headers as Record<string, string | undefined>),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
    options.headers = safeHeaders as Record<string, string>;
    options.credentials = 'include'; // Include cookies
    const response = await fetch(url, options);

    if (response.status === 401) {
      const refreshResult = await refreshToken();
      if (refreshResult.success && refreshResult.access) {
        sessionStorage.setItem("access_token", refreshResult.access);
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${refreshResult.access}`
        } as any;
        return fetch(url, options);
      } else {
        sessionStorage.clear();
        stopTokenRefresh();
        window.location.href = "/"; // Redirect to home
        throw new Error("Failed to refresh token");
      }
    }

    if (response.status === 403) {
      // Check for trial expiration or account inactivity
      const clone = response.clone();
      try {
        const result = await clone.json();
        if (result.trial_expired || result.subscription_expired || result.org_inactive) {
          window.location.href = "/trial-expired";
          return response;
        }
      } catch (e) {
        // Not a JSON response or doesn't have the flag
      }
    }

    return response;
  } catch (error) {
    sessionStorage.clear();
    stopTokenRefresh();
    window.location.href = "/"; // Redirect to home
    throw error;
  }
};

let refreshPromise: Promise<RefreshTokenResponse> | null = null;

// Refresh token function for /api/token/refresh/
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include", // Send HttpOnly refresh_token cookie
        body: JSON.stringify({}), // Body can be empty as token is in cookie
        signal: AbortSignal.timeout(TOKEN_REFRESH_TIMEOUT)
      });

      const result: RefreshTokenResponse = await response.json();


      if (!response.ok) {
        throw new Error(result.message || "Token refresh failed");
      }
      return {
        success: true,
        access: result.access,
        refresh: result.refresh
      };
    } catch (error: any) {

      sessionStorage.clear();
      stopTokenRefresh();
      return { success: false, message: error.message || "Network error" };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Proactive token refresh logic
let refreshInterval: NodeJS.Timeout | null = null;

export const startTokenRefresh = () => {
  stopTokenRefresh();
  refreshInterval = setInterval(async () => {
    const refreshResult = await refreshToken();
    if (refreshResult.success && refreshResult.access) {
      sessionStorage.setItem("access_token", refreshResult.access);
    } else {

      sessionStorage.clear();
      stopTokenRefresh();
      window.location.href = "/"; // Redirect to home
    }
  }, 900000); // 15 minutes
};

export const stopTokenRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

export const loginUser = async ({ username, password }: LoginRequest): Promise<LoginResponse> => {
  if (!username?.trim() || !password?.trim()) {

    return { success: false, message: "Username and password required" };
  }
  try {

    const response = await fetch(`${API_ENDPOINT}/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // Receive HttpOnly refresh_token cookie
      body: JSON.stringify({ username, password })
    });
    const result: LoginResponse = await response.json();

    if (response.ok && result.success) {
      if (result.message === "OTP sent") {
        return result; // Frontend handles OTP input
      }

      // Convert relative profile_image URL to absolute URL
      if (result.profile && result.profile.profile_image && result.profile.profile_image.startsWith('/media/')) {
        result.profile.profile_image = `${API_BASE_URL}${result.profile.profile_image}`;
      }

      // Store token in sessionStorage (non‑sensitive) for page reloads – actual access token lives in AuthContext memory
      if (result.access) sessionStorage.setItem("access_token", result.access);
      if (result.role) sessionStorage.setItem("role", result.role);
      if (result.profile) sessionStorage.setItem("user", JSON.stringify(result.profile));
      // AuthContext will start its own refresh interval based on the HttpOnly cookie
      // No localStorage usage or startTokenRefresh here
    }
    return result;
  } catch (error: any) {

    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const verifyOTP = async ({ user_id, otp }: VerifyOTPRequest): Promise<LoginResponse> => {
  if (!user_id?.trim() || !otp?.trim()) {

    return { success: false, message: "User ID and OTP required" };
  }
  try {

    const response = await fetch(`${API_ENDPOINT}/verify-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // Receive HttpOnly refresh_token cookie
      body: JSON.stringify({ user_id, otp })
    });
    const result: LoginResponse = await response.json();

    if (response.ok && result.success) {
      // Convert relative profile_image URL to absolute URL
      if (result.profile && result.profile.profile_image && result.profile.profile_image.startsWith('/media/')) {
        result.profile.profile_image = `${API_BASE_URL}${result.profile.profile_image}`;
      }

      // Save refreshed token and user data to sessionStorage (access token stays in AuthContext memory)
      if (result.access) sessionStorage.setItem("access_token", result.access);
      if (result.role) sessionStorage.setItem("role", result.role);
      if (result.profile) sessionStorage.setItem("user", JSON.stringify(result.profile));
      // AuthContext will manage periodic refresh; no need to startTokenRefresh here

    }
    return result;
  } catch (error: any) {

    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const resendOTP = async ({ user_id }: ResendOTPRequest): Promise<GenericResponse> => {
  if (!user_id?.trim()) {

    return { success: false, message: "User ID required" };
  }
  try {

    const response = await fetch(`${API_ENDPOINT}/resend-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user_id })
    });
    const result = await response.json();

    return result;
  } catch (error: any) {

    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const forgotPassword = async ({ email }: ForgotPasswordRequest): Promise<GenericResponse> => {
  if (!email?.trim()) {

    return { success: false, message: "Email required" };
  }
  try {

    const response = await fetch(`${API_ENDPOINT}/forgot-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });
    const result = await response.json();

    return result;
  } catch (error: any) {

    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const resetPassword = async ({
  user_id,
  otp,
  new_password,
  confirm_password
}: ResetPasswordRequest): Promise<GenericResponse> => {
  if (!user_id?.trim() || !otp?.trim() || !new_password?.trim() || !confirm_password?.trim()) {

    return { success: false, message: "All fields required" };
  }
  try {

    const response = await fetch(`${API_ENDPOINT}/reset-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id,
        otp,
        new_password,
        confirm_password
      })
    });
    const result = await response.json();

    return result;
  } catch (error: any) {

    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const logoutUser = async (): Promise<GenericResponse> => {
  try {
    // Logout endpoint clears the HttpOnly refresh token cookie on the server.
    const response = await fetch(`${API_ENDPOINT}/logout/`, {
      method: "POST",
      headers: {
        // No Authorization header needed – the server uses the HttpOnly cookie.
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({})
    });
    // Clear any persisted non‑sensitive data.
    sessionStorage.clear();
    // AuthContext will stop its refresh interval after logout.
    if (!response.ok) {
      return { success: true, message: "Logged out successfully (server error ignored)" };
    }
    const result = await response.json();
    return result;
  } catch (error: any) {

    sessionStorage.clear();
    stopTokenRefresh();
    return { success: true, message: "Logged out successfully (error ignored)" };
  }
};