// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { refreshToken, fetchWithTokenRefresh } from "../utils/authService";
import { API_ENDPOINT } from "../utils/config";
import { useNavigate } from "react-router-dom";

interface AuthContextProps {
  /** JWT access token stored in memory only – never in localStorage */
  accessToken: string | null;
  role: string | null;
  user: Record<string, any> | null;
  /** true while the initial silent-refresh is running (avoids flash of login) */
  isInitializing: boolean;
  isAuthenticated: boolean;
  /**
   * Called by loginUser / verifyOTP flows to hydrate the context after the
   * backend returns a fresh access token + role + profile.
   */
  setTokens: (
    accessToken: string,
    role: string,
    user: Record<string, any>
  ) => void;
  /** Clears all auth state and sessionStorage (does NOT hit the backend). */
  clearAuth: () => void;
  /** Attempts a silent refresh via the HttpOnly cookie. Returns new token or null. */
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<Record<string, any> | null>(null);
  // Start as true so ProtectedRoute shows a spinner instead of the login page
  const [isInitializing, setIsInitializing] = useState(true);

  const isAuthenticated = !!accessToken && !!role;

  // ─── Silent refresh on mount ────────────────────────────────────────────────
  useEffect(() => {
    const silentRefresh = async () => {
      const storedRole = sessionStorage.getItem("role");
      const storedUserRaw = sessionStorage.getItem("user");
      const hasSession = localStorage.getItem("has_session");

      if (!hasSession && (!storedRole || !storedUserRaw)) {
        // No previous session – skip refresh attempt immediately
        setIsInitializing(false);
        return;
      }

      try {
        const result = await refreshToken();
        if (result.success && result.access) {
          setAccessToken(result.access);
          sessionStorage.setItem("access_token", result.access);
          
          try {
             const profileRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
                headers: { 'Content-Type': 'application/json' }
             }).then(res => res.json());
             
             if (profileRes.success && profileRes.profile) {
                setRole(profileRes.profile.role);
                setUser(profileRes.profile);
                sessionStorage.setItem("role", profileRes.profile.role);
                sessionStorage.setItem("user", JSON.stringify(profileRes.profile));
             } else {
                if (storedRole && storedUserRaw) {
                   setRole(storedRole);
                   setUser(JSON.parse(storedUserRaw));
                }
             }
          } catch (e) {
             if (storedRole && storedUserRaw) {
                 setRole(storedRole);
                 setUser(JSON.parse(storedUserRaw));
             }
          }
        } else {
          // HttpOnly cookie expired or invalid – clear stale session
          localStorage.removeItem("has_session");
          sessionStorage.removeItem("role");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("access_token");
        }
      } catch {
        // Network error during silent refresh – don't break the app
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("access_token");
      } finally {
        setIsInitializing(false);
      }
    };

    silentRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Proactive periodic refresh (every 14 min, access tokens expire at 15) ──
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(async () => {
      try {
        const result = await refreshToken();
        if (result.success && result.access) {
          setAccessToken(result.access);
          sessionStorage.setItem("access_token", result.access);
        } else {
          // Refresh failed (cookie expired) – log the user out silently
          setAccessToken(null);
          setRole(null);
          setUser(null);
          sessionStorage.clear();
          navigate("/", { replace: true });
        }
      } catch {
        // Ignore transient network errors during background refresh
      }
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, navigate]);

  // ─── setTokens ──────────────────────────────────────────────────────────────
  /** Called immediately after a successful login or OTP verification. */
  const setTokens = useCallback(
    (newToken: string, newRole: string, newUser: Record<string, any>) => {
      setAccessToken(newToken);
      setRole(newRole);
      setUser(newUser);
    },
    []
  );

  // ─── clearAuth ──────────────────────────────────────────────────────────────
  /** Wipes all auth state without hitting the backend. */
  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setRole(null);
    setUser(null);
    sessionStorage.clear();
    localStorage.removeItem("has_session");
  }, []);

  // ─── refreshAccessToken ─────────────────────────────────────────────────────
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const result = await refreshToken();
      if (result.success && result.access) {
        setAccessToken(result.access);
        sessionStorage.setItem("access_token", result.access);
        return result.access;
      }
    } catch {
      // Swallow network errors
    }
    return null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        role,
        user,
        isAuthenticated,
        isInitializing,
        setTokens,
        clearAuth,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
