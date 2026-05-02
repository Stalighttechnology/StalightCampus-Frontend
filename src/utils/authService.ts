import { API_ENDPOINT, TOKEN_REFRESH_TIMEOUT } from "./config";

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

// Wrapper function to handle token refresh on 401 errors
export const fetchWithTokenRefresh = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      throw new Error("No access token available");
    }
    const safeHeaders = {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${accessToken}`,
    };
    options.headers = safeHeaders;
    const response = await fetch(url, options);

    if (response.status === 401) {
      const refreshResult = await refreshToken();
      if (refreshResult.success && refreshResult.access) {
        localStorage.setItem("access_token", refreshResult.access);
        if (refreshResult.refresh) {
          localStorage.setItem("refresh_token", refreshResult.refresh);
        }
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${refreshResult.access}`,
        };
        return fetch(url, options);
      } else {
        localStorage.clear();
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
        if (result.trial_expired) {
          window.location.href = "/trial-expired";
          return response;
        }
      } catch (e) {
        // Not a JSON response or doesn't have the flag
      }
    }

    return response;
  } catch (error) {
    console.error("Fetch with token refresh error:", error);
    localStorage.clear();
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
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        throw new Error("No refresh token available");
      }

      console.log("Sending token refresh request:", { refresh });
      const response = await fetch(`${API_ENDPOINT}/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
        signal: AbortSignal.timeout(TOKEN_REFRESH_TIMEOUT),
      });

      const result: RefreshTokenResponse = await response.json();
      console.log("Token refresh response:", result);

      if (!response.ok) {
        throw new Error(result.message || "Token refresh failed");
      }
      return {
        success: true,
        access: result.access,
        refresh: result.refresh,
      };
    } catch (error: any) {
      console.error("Refresh Token Error:", error);
      localStorage.clear();
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
      localStorage.setItem("access_token", refreshResult.access);
      if (refreshResult.refresh) {
        localStorage.setItem("refresh_token", refreshResult.refresh);
      }
      console.log("Access token refreshed proactively");
    } else {
      console.error("Proactive token refresh failed:", refreshResult.message);
      localStorage.clear();
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
    console.warn("Login attempt with empty fields:", { username, password });
    return { success: false, message: "Username and password required" };
  }
  try {
    console.log("Sending login request:", { username });
    const response = await fetch(`${API_ENDPOINT}/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const result: LoginResponse = await response.json();
    console.log("Login response:", result);
    if (response.ok && result.success) {
      if (result.message === "OTP sent") {
        return result; // Frontend handles OTP input
      }

      // Convert relative profile_image URL to absolute URL
      if (result.profile && result.profile.profile_image && result.profile.profile_image.startsWith('/media/')) {
        result.profile.profile_image = `http://127.0.0.1:8000${result.profile.profile_image}`;
      }

      localStorage.setItem("access_token", result.access || "");
      localStorage.setItem("refresh_token", result.refresh || "");
      localStorage.setItem("role", result.role || "");
      localStorage.setItem("user", JSON.stringify(result.profile || {}));
      startTokenRefresh();
    }
    return result;
  } catch (error: any) {
    console.error("Login Error:", error);
    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const verifyOTP = async ({ user_id, otp }: VerifyOTPRequest): Promise<LoginResponse> => {
  if (!user_id?.trim() || !otp?.trim()) {
    console.warn("Verify OTP attempt with empty fields:", { user_id, otp });
    return { success: false, message: "User ID and OTP required" };
  }
  try {
    console.log("Sending OTP verification request:", { user_id, otp });
    const response = await fetch(`${API_ENDPOINT}/verify-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id, otp }),
    });
    const result: LoginResponse = await response.json();
    console.log("OTP verification response:", result);
    if (response.ok && result.success) {
      // Convert relative profile_image URL to absolute URL
      if (result.profile && result.profile.profile_image && result.profile.profile_image.startsWith('/media/')) {
        result.profile.profile_image = `http://127.0.0.1:8000${result.profile.profile_image}`;
      }

      localStorage.setItem("access_token", result.access || "");
      localStorage.setItem("refresh_token", result.refresh || "");
      localStorage.setItem("role", result.role || "");
      localStorage.setItem("user", JSON.stringify(result.profile || {}));
      startTokenRefresh();
    }
    return result;
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const resendOTP = async ({ user_id }: ResendOTPRequest): Promise<GenericResponse> => {
  if (!user_id?.trim()) {
    console.warn("Resend OTP attempt with empty user_id:", { user_id });
    return { success: false, message: "User ID required" };
  }
  try {
    console.log("Sending resend OTP request:", { user_id });
    const response = await fetch(`${API_ENDPOINT}/resend-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id }),
    });
    const result = await response.json();
    console.log("Resend OTP response:", result);
    return result;
  } catch (error: any) {
    console.error("Resend OTP Error:", error);
    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const forgotPassword = async ({ email }: ForgotPasswordRequest): Promise<GenericResponse> => {
  if (!email?.trim()) {
    console.warn("Forgot password attempt with empty email:", { email });
    return { success: false, message: "Email required" };
  }
  try {
    console.log("Sending forgot password request:", { email });
    const response = await fetch(`${API_ENDPOINT}/forgot-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    console.log("Forgot password response:", result);
    return result;
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const resetPassword = async ({
  user_id,
  otp,
  new_password,
  confirm_password,
}: ResetPasswordRequest): Promise<GenericResponse> => {
  if (!user_id?.trim() || !otp?.trim() || !new_password?.trim() || !confirm_password?.trim()) {
    console.warn("Reset password attempt with empty fields:", { user_id, otp, new_password });
    return { success: false, message: "All fields required" };
  }
  try {
    console.log("Sending reset password request:", { user_id, otp });
    const response = await fetch(`${API_ENDPOINT}/reset-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        otp,
        new_password,
        confirm_password,
      }),
    });
    const result = await response.json();
    console.log("Reset password response:", result);
    return result;
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return { success: false, message: error.response?.data?.message || "Failed to connect to the server" };
  }
};

export const logoutUser = async (): Promise<GenericResponse> => {
  try {
    const refresh = localStorage.getItem("refresh_token");
    const accessToken = localStorage.getItem("access_token");
    if (!refresh) {
      console.warn("Logout attempt with no refresh token");
      localStorage.clear();
      stopTokenRefresh();
      return { success: true, message: "Logged out successfully (no refresh token)" };
    }
    console.log("Sending logout request:", { refresh });
    const response = await fetch(`${API_ENDPOINT}/logout/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    });
    localStorage.clear();
    stopTokenRefresh();
    if (!response.ok) {
      console.warn(`Logout request failed with status ${response.status}`);
      return { success: true, message: "Logged out successfully (server error ignored)" };
    }
    const result = await response.json();
    console.log("Logout response:", result);
    return result;
  } catch (error: any) {
    console.error("Logout Error:", error);
    localStorage.clear();
    stopTokenRefresh();
    return { success: true, message: "Logged out successfully (error ignored)" };
  }
};