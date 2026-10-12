import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithTokenRefresh } from '../utils/authService';
import { API_ENDPOINT } from '../utils/config';
import { useAuth } from '../context/AuthContext';

export interface InAppPopupData {
  id: number;
  popup_type: 'feature' | 'offer' | 'maintenance' | 'update';
  title: string;
  message: string;
  image: string | null;
  button_text: string | null;
  action: string | null;
  version: number;
}

export function useInAppPopups() {
  const [activePopup, setActivePopup] = useState<InAppPopupData | null>(null);
  const fetchedUserRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const getUserKey = () => {
    try {
      const userStr = sessionStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userId = user.user_id || user.id;
        if (userId) return `_user_${userId}`;
      }
    } catch (e) {}
    return "_guest";
  };

  const { isAuthenticated, user: authUser } = useAuth();

  const fetchPopups = useCallback(async (force = false) => {
    // Don't fetch if not authenticated or user data isn't loaded yet
    if (!isAuthenticated || !authUser) {
      fetchedUserRef.current = null;
      return;
    }

    const currentUserId = String(authUser.id || authUser.user_id);
    const now = Date.now();

    // Prevent concurrent requests
    if (isFetchingRef.current) return;

    // Deduplicate: If already fetched for this user within cooldown (30s) and not forced, skip
    if (!force && fetchedUserRef.current === currentUserId && (now - lastFetchTimeRef.current < 30000)) {
      return;
    }

    // Check if an onboarding tour is actively open on screen right now.
    // If Joyride or tour modal is visible, defer fetch so we don't cover it.
    const isTourActiveOnScreen = Boolean(
      document.querySelector('.react-joyride__overlay') ||
      document.querySelector('[data-tour-modal]') ||
      document.querySelector('.react-joyride')
    );

    if (isTourActiveOnScreen) {
      setTimeout(() => fetchPopups(force), 3000);
      return;
    }

    isFetchingRef.current = true;

    try {
      fetchedUserRef.current = currentUserId;
      lastFetchTimeRef.current = now;

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/core/popups/`);
      if (!response.ok) return;

      const popups: InAppPopupData[] = await response.json();
      const userKeySuffix = getUserKey();

      // Find the first popup (highest priority due to backend ordering)
      // that the user hasn't seen the current version of.
      let foundPopup: InAppPopupData | null = null;
      for (const popup of popups) {
        const storedVersion = localStorage.getItem(`popup_version_${popup.id}${userKeySuffix}`);
        if (storedVersion !== String(popup.version)) {
          foundPopup = popup;
          break; // Show only one at a time
        }
      }

      setActivePopup(foundPopup);
    } catch (error) {
      console.error("Failed to fetch popups:", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    if (!isAuthenticated || !authUser) {
      fetchedUserRef.current = null;
      setActivePopup(null);
      return;
    }

    // Initial fetch when user/auth is ready
    fetchPopups(true);

    // Event 1: Same-window popup updates (e.g. admin actions)
    const handlePopupRefresh = () => {
      fetchPopups(true);
    };
    window.addEventListener('popup_refresh', handlePopupRefresh);

    // Event 2: Cross-tab popup updates via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stalight_popup_updated_at') {
        fetchPopups(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Event 3: Tab switching / focus — re-check if cooldown has passed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPopups(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Event 4: Periodic background check (every 5 minutes)
    const interval = setInterval(() => {
      fetchPopups(false);
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('popup_refresh', handlePopupRefresh);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [isAuthenticated, authUser, fetchPopups]);

  const dismissPopup = () => {
    if (activePopup) {
      const userKeySuffix = getUserKey();
      localStorage.setItem(`popup_version_${activePopup.id}${userKeySuffix}`, String(activePopup.version));
      setActivePopup(null);
    }
  };

  return { activePopup, dismissPopup };
}
