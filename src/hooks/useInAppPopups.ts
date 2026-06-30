import { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../utils/authService';
import { API_ENDPOINT } from '../utils/config';
import { CURRENT_TOUR_VERSION } from '../onboarding/constants/tutorialConfig';
import { getUserScopedSeenKey } from '../onboarding/constants/tutorialKeys';
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

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchPopups = async () => {
      // Don't fetch if not authenticated
      if (!isAuthenticated) return;

      try {
        const userStr = sessionStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.id || user?.user_id || null;
        const role = sessionStorage.getItem("role") || localStorage.getItem("role") || "";
        
        const userScopedSeenKey = getUserScopedSeenKey(userId, CURRENT_TOUR_VERSION);
        const hasSeenTour = localStorage.getItem(userScopedSeenKey) === 'true';
        const legacyCompleted = localStorage.getItem(`tutorial_${role.toLowerCase()}_completed`) === 'true';

        // If the user hasn't completed the tour guide, wait and retry.
        // This completely prevents the popup from clashing with the onboarding tour.
        if (!hasSeenTour && !legacyCompleted) {
          timer = setTimeout(fetchPopups, 3000);
          return;
        }

        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/core/popups/`);
        if (!response.ok) return;

        const popups: InAppPopupData[] = await response.json();
        
        const userKeySuffix = getUserKey();
        
        // Find the first popup (highest priority due to backend ordering)
        // that the user hasn't seen the current version of.
        for (const popup of popups) {
          const storedVersion = localStorage.getItem(`popup_version_${popup.id}${userKeySuffix}`);
          if (storedVersion !== String(popup.version)) {
            setActivePopup(popup);
            break; // Show only one at a time
          }
        }
      } catch (error) {
        console.error("Failed to fetch popups:", error);
      }
    };

    fetchPopups();

    return () => clearTimeout(timer);
  }, [isAuthenticated, authUser]);

  const dismissPopup = () => {
    if (activePopup) {
      const userKeySuffix = getUserKey();
      localStorage.setItem(`popup_version_${activePopup.id}${userKeySuffix}`, String(activePopup.version));
      setActivePopup(null);
    }
  };

  return { activePopup, dismissPopup };
}
