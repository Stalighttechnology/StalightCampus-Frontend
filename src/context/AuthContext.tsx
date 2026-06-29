// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { refreshToken, fetchWithTokenRefresh, setInMemoryAccessToken, logoutUser } from "../utils/authService";
import { API_ENDPOINT } from "../utils/config";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

interface AuthContextProps {
  /** JWT access token stored in memory only – never in localStorage */
  accessToken: string | null;
  role: string | null;
  user: Record<string, any> | null;
  /** true while the initial silent-refresh is running (avoids flash of login) */
  isInitializing: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
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
  /** Logs out hitting the backend and clearing auth state. */
  logout: () => Promise<void>;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAuthenticated = !!accessToken && !!role;

  // ─── Silent refresh on mount ────────────────────────────────────────────────
  useEffect(() => {
    const silentRefresh = async () => {
      const storedRole = sessionStorage.getItem("role");
      const storedUserRaw = sessionStorage.getItem("user");
      const storedAccessToken = sessionStorage.getItem("access_token");
      const hasSession = localStorage.getItem("has_session");

      if (!hasSession && (!storedRole || !storedUserRaw)) {
        // No previous session – skip refresh attempt immediately
        setIsInitializing(false);
        return;
      }

      // Optimistic UI: If we already have the user data in sessionStorage, load it INSTANTLY
      // so the user doesn't have to wait for the background network requests.
      if (storedRole && storedUserRaw && storedAccessToken) {
        try {
          const parsedUser = JSON.parse(storedUserRaw);
          setRole(storedRole);
          setUser(parsedUser);
          setAccessToken(storedAccessToken);
          setIsInitializing(false); // Stop the loading spinner immediately
        } catch (e) {
          sessionStorage.removeItem("role");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("access_token");
        }
      }

      try {
        const result = await refreshToken();
        if (result.success && result.access) {
          setAccessToken(result.access);
          sessionStorage.setItem("access_token", result.access);
          setInMemoryAccessToken(result.access);
          
          try {
             const profileRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
                headers: { 
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${result.access}`
                }
             }).then(res => res.json());
             
             if (profileRes.success && profileRes.profile) {
                setRole(profileRes.profile.role);
                setUser(profileRes.profile);
                sessionStorage.setItem("role", profileRes.profile.role);
                sessionStorage.setItem("user", JSON.stringify(profileRes.profile));
             } else {
                if (storedRole && storedUserRaw) {
                   try {
                      setRole(storedRole);
                      setUser(JSON.parse(storedUserRaw));
                   } catch {
                      sessionStorage.removeItem("role");
                      sessionStorage.removeItem("user");
                      sessionStorage.removeItem("access_token");
                   }
                }
             }
          } catch (e) {
             if (storedRole && storedUserRaw) {
                 try {
                     setRole(storedRole);
                     setUser(JSON.parse(storedUserRaw));
                 } catch {
                     sessionStorage.removeItem("role");
                     sessionStorage.removeItem("user");
                     sessionStorage.removeItem("access_token");
                 }
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
        localStorage.removeItem("has_session");
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
          setInMemoryAccessToken(result.access);
        } else {
          // Refresh failed (cookie expired) – log the user out silently
          setAccessToken(null);
          setRole(null);
          setUser(null);
          sessionStorage.clear();
          setInMemoryAccessToken(null);
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
      setInMemoryAccessToken(newToken);
    },
    []
  );

  // ─── clearAuth ──────────────────────────────────────────────────────────────
  /** Wipes all auth state without hitting the backend. */
  const clearAuth = useCallback(() => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setAccessToken(null);
      setRole(null);
      setUser(null);
      sessionStorage.clear();
      setInMemoryAccessToken(null);
      localStorage.removeItem("has_session");
      setIsLoggingOut(false);
      navigate("/", { replace: true });
    }, 300);
  }, [navigate]);

  // ─── logout ─────────────────────────────────────────────────────────────────
  /** Logs out hitting the backend and clearing auth state. */
  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (e) {
      // ignore network errors
    } finally {
      setTimeout(() => {
        setAccessToken(null);
        setRole(null);
        setUser(null);
        sessionStorage.clear();
        setInMemoryAccessToken(null);
        localStorage.removeItem("has_session");
        setIsLoggingOut(false);
        navigate("/", { replace: true });
      }, 300);
    }
  }, [navigate]);

  // ─── refreshAccessToken ─────────────────────────────────────────────────────
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const result = await refreshToken();
      if (result.success && result.access) {
        setAccessToken(result.access);
        sessionStorage.setItem("access_token", result.access);
        setInMemoryAccessToken(result.access);
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
        isLoggingOut,
        setTokens,
        clearAuth,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 w-[90%] max-w-sm text-center">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/5 text-red-600 dark:text-red-400 mb-2">
              <div className="absolute inset-0 rounded-full border-4 border-red-500/20 border-t-red-600 dark:border-t-red-400 animate-spin"></div>
              <LogOut className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Logging out...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Clearing secure session and redirecting you safely.
            </p>
          </div>
        </div>
      )}
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
