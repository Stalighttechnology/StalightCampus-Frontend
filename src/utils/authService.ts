import { API_ENDPOINT, TOKEN_REFRESH_TIMEOUT, API_BASE_URL } from "./config";

// Persist a client-side device identifier used to group sessions per device.
const DEVICE_ID_KEY = 'device_id';

// In-memory cache fallback for WebView environment stability
let _inMemoryAccessToken: string | null = null;
export let isLoggingOutFlag = false;

const extractAppVersion = (response: Response) => {
  const versionData = response.headers.get('X-App-Version');
  if (versionData) {
    try {
      const decoded = atob(versionData);
      const parsed = JSON.parse(decoded);
      const event = new CustomEvent('app_version_update', { detail: parsed });
      window.dispatchEvent(event);
    } catch (e) {
      // Silently ignore decode/parse errors
    }
  }
};

export const setInMemoryAccessToken = (token: string | null) => {
  _inMemoryAccessToken = token;
};

export const setIsLoggingOutFlag = (value: boolean) => {
  isLoggingOutFlag = value;
};

export const getOrCreateDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `dev-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch (e) {
    return `dev-${Math.random().toString(36).slice(2, 10)}`;
  }
};

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
  otp?: string;
  token?: string;
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
  token?: string;
}

// Token refresh response type
interface RefreshTokenResponse {
  success: boolean;
  access?: string;
  refresh?: string;
  message?: string;
}

// Helper to check if a JWT token is expired
export const isTokenExpired = (token: string | null): boolean => {
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
    let accessToken = sessionStorage.getItem("access_token") || _inMemoryAccessToken || localStorage.getItem("superadmin_token");

    // Ensure Authorization header is set only when we have a token. Also include session/device identifiers.
    const sessionId = (typeof window !== 'undefined') ? localStorage.getItem('session_id') : undefined;
    const deviceId = getOrCreateDeviceId();
    const selectedStudentId = (typeof window !== 'undefined') ? localStorage.getItem('selectedStudentId') : undefined;
    
    const safeHeaders = {
      ...(options.headers as Record<string, string | undefined>),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
      ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
      ...(selectedStudentId && selectedStudentId !== 'null' && selectedStudentId !== 'undefined' ? { 'X-Student-ID': selectedStudentId } : {}),
    };
    options.headers = safeHeaders as Record<string, string>;
    options.credentials = 'include'; // Include cookies

    // Add a default timeout of 10 seconds for standard requests, or 60 seconds for file exports and Google Meet API calls
    const isExportRequest = url.includes('export-pdf') || url.includes('export_pdf') || url.includes('export-csv') || url.includes('/receipt/') || url.includes('/download/') || url.includes('export-payments-pdf');
    const isMeetingCreate = url.includes('/meetings/') && options.method === 'POST';
    if (!options.signal && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      options.signal = (isExportRequest || isMeetingCreate) ? AbortSignal.timeout(60000) : AbortSignal.timeout(10000);
    }

    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (e: any) {
      if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
        // Silent retry once after 1.5s to handle OS/Browser wake-up lag
        await new Promise(resolve => setTimeout(resolve, 1500));
        response = await fetch(url, options);
      } else {
        throw e;
      }
    }

    if (response.status === 401) {
      if (isLoggingOutFlag) {
        // Silently ignore 401s during intentional logout to avoid race conditions
        return response;
      }

      let isRevoked = false;
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json.session_revoked) isRevoked = true;
      } catch (e) {
        // Ignore JSON parse error
      }

      if (isRevoked) {
        sessionStorage.clear();
        _inMemoryAccessToken = null;
        localStorage.removeItem("has_session");
        localStorage.removeItem("session_id");
        stopTokenRefresh();
        
        // Dynamically import SweetAlert to avoid blocking initial load
        const Swal = (await import('sweetalert2')).default;
        await Swal.fire({
          title: 'Session Terminated',
          text: 'Your session has been logged out from another device for security reasons.',
          icon: 'warning',
          confirmButtonText: 'Login Again',
          confirmButtonColor: '#3085d6',
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        window.location.href = "/";
        throw new Error("Session revoked");
      }

      const refreshResult = await refreshToken();
      if (refreshResult.success && refreshResult.access) {
        sessionStorage.setItem("access_token", refreshResult.access);
        _inMemoryAccessToken = refreshResult.access;
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${refreshResult.access}`
        } as any;
        response = await fetch(url, options);
      } else {
        sessionStorage.clear();
        _inMemoryAccessToken = null;
        localStorage.removeItem("has_session");
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
          if (window.location.pathname !== "/trial-expired") {
            window.location.href = "/trial-expired";
          }
          return response;
        }
      } catch (e) {
        // Not a JSON response or doesn't have the flag
      }
    }

    // Intercept PDF/file downloads that return HTML (indicates redirect or server template issue)
    const isFileExport = url.includes('export-pdf') || url.includes('export_pdf') || url.includes('export-csv') || url.includes('/receipt/') || url.includes('/download/') || url.includes('export-payments-pdf');
    if (isFileExport && response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error("Server returned HTML instead of PDF binary.");
      }
    }

    // Extract app version if present
    extractAppVersion(response);

    return response;

  } catch (error) {
    // Just propagate the network/timeout/abort error so the calling component can show a proper error UI
    // Do NOT clear session or redirect to home for transient network failures
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
      if (result.access) {
        _inMemoryAccessToken = result.access;
      }
      return {
        success: true,
        access: result.access,
        refresh: result.refresh
      };
    } catch (error: any) {

      sessionStorage.clear();
      _inMemoryAccessToken = null;
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
      _inMemoryAccessToken = refreshResult.access;
    } else {

      sessionStorage.clear();
      _inMemoryAccessToken = null;
      localStorage.removeItem("has_session");
      stopTokenRefresh();
      if (window.location.pathname !== "/") {
        window.location.href = "/"; // Redirect to home
      }
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

    const deviceId = getOrCreateDeviceId();
    const response = await fetch(`${API_ENDPOINT}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
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
      // Store server-provided session id (used to identify current session)
      if ((result as any).session_id) {
        try { localStorage.setItem('session_id', (result as any).session_id); } catch (e) { /* ignore */ }
      }

      // Store token in sessionStorage (non‑sensitive) for page reloads – actual access token lives in AuthContext memory
      if (result.access) {
        sessionStorage.setItem("access_token", result.access);
        _inMemoryAccessToken = result.access;
      }
      if (result.role) sessionStorage.setItem("role", result.role);
      if (result.profile) sessionStorage.setItem("user", JSON.stringify(result.profile));
      localStorage.setItem("has_session", "true");
      // AuthContext will start its own refresh interval based on the HttpOnly cookie
      // No localStorage usage or startTokenRefresh here
    }
    return result;
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      return { success: false, message: "Campus servers unreachable. Please check your network connection." };
    }
    const errorDetails = error instanceof Error ? error.message : JSON.stringify(error);
    return { success: false, message: `Oops! Something went wrong: ${errorDetails}` };
  }
};

export const verifyOTP = async ({ user_id, otp }: VerifyOTPRequest): Promise<LoginResponse> => {
  if (!user_id?.trim() || !otp?.trim()) {

    return { success: false, message: "User ID and OTP required" };
  }
  try {

    const deviceId = getOrCreateDeviceId();
    const response = await fetch(`${API_ENDPOINT}/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
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
      if (result.access) {
        sessionStorage.setItem("access_token", result.access);
        _inMemoryAccessToken = result.access;
      }
      if (result.role) sessionStorage.setItem("role", result.role);
      if (result.profile) sessionStorage.setItem("user", JSON.stringify(result.profile));
      localStorage.setItem("has_session", "true");
      // AuthContext will manage periodic refresh; no need to startTokenRefresh here

        // Store server-provided session id (used to identify current session)
        if ((result as any).session_id) {
          try { localStorage.setItem('session_id', (result as any).session_id); } catch (e) { /* ignore */ }
        }
    }
    return result;
  } catch (error: any) {
    console.error("VERIFY OTP ERROR:", error);
    const errorDetails = error instanceof Error ? `${error.name}: ${error.message}` : JSON.stringify(error);
    return { success: false, message: `Failed to connect: ${errorDetails}` };
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
  token,
  new_password,
  confirm_password
}: ResetPasswordRequest): Promise<GenericResponse> => {
  if (!user_id?.trim() || (!otp?.trim() && !token?.trim()) || !new_password?.trim() || !confirm_password?.trim()) {

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
        token,
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
  isLoggingOutFlag = true;
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
    _inMemoryAccessToken = null;
    localStorage.removeItem("has_session");
    localStorage.removeItem("session_id");
    // AuthContext will stop its refresh interval after logout.
    if (!response.ok) {
      return { success: true, message: "Logged out successfully (server error ignored)" };
    }
    const result = await response.json();
    return result;
  } catch (error: any) {

    sessionStorage.clear();
    _inMemoryAccessToken = null;
    localStorage.removeItem("has_session");
    stopTokenRefresh();
    return { success: true, message: "Logged out successfully (error ignored)" };
  }
};
export const verifyCoupon = async (code: string): Promise<any> => {
  const response = await fetch(`${API_ENDPOINT}/verify-coupon/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  return response.json();
};

export const refreshSuperadminToken = async (): Promise<{ success: boolean; access?: string; message?: string }> => {
  try {
    const refresh = localStorage.getItem("superadmin_refresh");
    if (!refresh) {
      return { success: false, message: "No refresh token" };
    }
    
    const response = await fetch(`${API_ENDPOINT}/superadmin/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh })
    });
    
    const data = await response.json();
    if (response.ok && data.access) {
      localStorage.setItem("superadmin_token", data.access);
      if (data.refresh) {
        localStorage.setItem("superadmin_refresh", data.refresh);
      }
      return { success: true, access: data.access };
    } else {
      return { success: false, message: data.detail || data.message || "Failed to refresh token" };
    }
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const fetchWithSuperadminTokenRefresh = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let accessToken = localStorage.getItem("superadmin_token");
  const safeHeaders = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  let response = await fetch(url, { ...options, headers: safeHeaders });

  if (response.status === 401) {
    const refreshData = await refreshSuperadminToken();
    if (refreshData?.success) {
      accessToken = refreshData.access;
      const newHeaders = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      const role = localStorage.getItem("superadmin_role");
      localStorage.removeItem("superadmin_token");
      localStorage.removeItem("superadmin_refresh");
      localStorage.removeItem("superadmin_role");
      if (role === "developer") {
        window.location.href = "/stalightcampus/developer";
      } else {
        window.location.href = "/stalightcampus/admin";
      }
    }
  }

  extractAppVersion(response);

  return response;
};

export const manageCoupons = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', data?: any, id?: number): Promise<any> => {
  let url = `${API_ENDPOINT}/admin/coupons/`;
  if (id) {
    url += `${id}/`;
  }
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetchWithSuperadminTokenRefresh(url, options);
  return response.json();
};
