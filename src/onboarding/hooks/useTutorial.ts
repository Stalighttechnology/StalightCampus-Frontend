import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TUTORIAL_KEYS, getUserScopedSeenKey } from '../constants/tutorialKeys';
import { CURRENT_TOUR_VERSION } from '../constants/tutorialConfig';
import { tutorialAnalytics } from '../services/tutorialAnalytics';
import { studentTour } from '../config/studentTour';
import { facultyTour } from '../config/facultyTour';
import { hodTour } from '../config/hodTour';
import { adminTour } from '../config/adminTour';
import { coeTour } from '../config/coeTour';
import { deanTour } from '../config/deanTour';
import { feesManagerTour } from '../config/feesManagerTour';
import { wardenTour } from '../config/wardenTour';
import { hmsTour } from '../config/hmsTour';
import { transportAdminTour } from '../config/transportAdminTour';
import { applyRoleTransform, applyMobileLabels } from './transforms';

const ROLE_TO_TOUR_MAP: Record<string, any> = {
  student: { steps: studentTour, keys: TUTORIAL_KEYS.STUDENT },
  faculty: { steps: facultyTour, keys: TUTORIAL_KEYS.FACULTY },
  teacher: { steps: facultyTour, keys: TUTORIAL_KEYS.FACULTY },
  hod: { steps: hodTour, keys: TUTORIAL_KEYS.HOD },
  admin: { steps: adminTour, keys: TUTORIAL_KEYS.ADMIN },
  principal: { steps: adminTour, keys: TUTORIAL_KEYS.ADMIN },
  coe: { steps: coeTour, keys: TUTORIAL_KEYS.COE },
  dean: { steps: deanTour, keys: TUTORIAL_KEYS.DEAN },
  feesmanager: { steps: feesManagerTour, keys: TUTORIAL_KEYS.FEES },
  fees_manager: { steps: feesManagerTour, keys: TUTORIAL_KEYS.FEES },
  warden: { steps: wardenTour, keys: TUTORIAL_KEYS.WARDEN },
  hms: { steps: hmsTour, keys: TUTORIAL_KEYS.HMS },
  hms_admin: { steps: hmsTour, keys: TUTORIAL_KEYS.HMS },
  transport_admin: { steps: transportAdminTour, keys: TUTORIAL_KEYS.TRANSPORT_ADMIN },
};

const transformStepsForHighlights = (originalSteps: any[], isMobile: boolean, role: string): any[] => {
  const steps: any[] = [];

  for (const step of originalSteps) {
    const target = step.target;

    if (typeof target === 'string') {
      // Delegate to the per-role transform for this step's sidebar target
      const transformed = applyRoleTransform(step, isMobile, role);
      if (transformed !== null) {
        steps.push(...transformed);
        continue;
      }

      // Fallback for any unhandled sidebar targets
      if (target.startsWith('#sidebar-')) {
        steps.push({ ...step, target: 'body' });
        continue;
      }
    }

    // Default handler for non-sidebar steps: apply mobile wording improvements
    if (isMobile) {
      const { title, content } = applyMobileLabels(step);
      steps.push({ ...step, title, content });
    } else {
      steps.push({ ...step });
    }
  }

  return steps;
};

/**
 * Resolves the user ID from the auth context or sessionStorage.
 * The user object stored in sessionStorage contains user_id from the login response.
 * Falls back to 'anonymous' if not available (e.g. during hydration).
 */
const resolveUserId = (authUser: Record<string, any> | null): string | null => {
  if (authUser?.user_id) return String(authUser.user_id);
  try {
    const stored = sessionStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.user_id) return String(parsed.user_id);
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

export const useTutorial = () => {
  const { role: authRole, user: authUser } = useAuth();
  const [role, setRole] = useState<string>(authRole || '');
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine the tour config and keys for the current role
  const { steps, keys } = useMemo(() => {
    const currentRole = role.toLowerCase();
    const tourConfig = ROLE_TO_TOUR_MAP[currentRole] || {
      steps: [],
      keys: TUTORIAL_KEYS.STUDENT,
    };

    // Transform steps for both mobile and laptop to highlight actual page sections
    const processedSteps = transformStepsForHighlights(tourConfig.steps, isMobile, role);

    // Force skipBeacon: true on all steps to avoid pulsing dots (beacons)
    const stepsWithDisabledBeacons = processedSteps.map((step: any) => ({
      ...step,
      disableBeacon: true,
      skipBeacon: true,
      disableOverlayClose: true,
      overlayClickAction: false,
      spotlightClicks: false,
    }));

    return {
      steps: stepsWithDisabledBeacons,
      keys: tourConfig.keys,
    };
  }, [role, isMobile]);

  /**
   * ACCOUNT-SCOPED ONBOARDING TRIGGER
   *
   * Auto-show logic uses TWO layers:
   *  1. User-scoped seen key: tutorial_seen_{userId}_{version}
   *     → Account-level. Different users on same machine get independent flags.
   *     → This is the PRIMARY source of truth.
   *
   *  2. Role-scoped COMPLETED key (legacy backward compat):
   *     → If a user already has tutorial_student_completed=true from before this
   *       refactor, we respect that and never show again. No regressions.
   *
   * No browser-generic flags. No cross-user contamination.
   *
   * TODO: Replace with backend user.onboardingCompleted when API adds this field.
   */
  useEffect(() => {
    const resolvedRole = authRole || sessionStorage.getItem('role') || localStorage.getItem('role') || '';
    if (!resolvedRole) return;

    setRole(resolvedRole);

    const tourConfig = ROLE_TO_TOUR_MAP[resolvedRole.toLowerCase()] || {
      steps: [],
      keys: TUTORIAL_KEYS.STUDENT,
    };

    const userId = resolveUserId(authUser);
    const userScopedSeenKey = getUserScopedSeenKey(userId, CURRENT_TOUR_VERSION);

    // Primary check: has this specific user already seen this version of the tour?
    const hasSeenCurrentVersion = localStorage.getItem(userScopedSeenKey) === 'true';

    // Legacy backward compatibility: respect old completed flag from pre-refactor users
    const isLegacyCompleted = localStorage.getItem(tourConfig.keys.COMPLETED) === 'true';

    if (hasSeenCurrentVersion || isLegacyCompleted) {
      // Returning user — do NOT show onboarding automatically.
      // Handle version mismatch: if legacy completed but older version, show once
      if (isLegacyCompleted && !hasSeenCurrentVersion) {
        const storedVersion = parseInt(localStorage.getItem(tourConfig.keys.VERSION) || '0', 10);
        if (storedVersion < CURRENT_TOUR_VERSION) {
          // New version released — clear stale step cache to prevent corruption
          localStorage.removeItem(tourConfig.keys.STEP);
          // Show modal once for the new version
          setShowWelcomeModal(true);
        }
      }
      return;
    }

    // NEW USER: neither user-scoped seen key nor legacy completed flag exists
    // Check if tour was in progress (resume from saved step)
    const savedStep = parseInt(localStorage.getItem(tourConfig.keys.STEP) || '0', 10);

    if (savedStep > 0) {
      // Resume in-progress tour (persisted step only, active is runtime-only)
      setIsActive(true);
      setStepIndex(savedStep);
    } else {
      // Brand new user — show welcome modal
      setShowWelcomeModal(true);
    }
  }, [authRole, authUser]);

  const handleStartTour = useCallback(() => {
    setShowWelcomeModal(false);
    setIsActive(true);
    setStepIndex(1);
    // Store step for resume (NO active flag in localStorage — runtime only)
    localStorage.setItem(keys.STEP, '1');
    tutorialAnalytics.trackTourStart(role);
  }, [keys, role]);

  const handleSkipTour = useCallback(() => {
    const userId = resolveUserId(authUser);
    const userScopedSeenKey = getUserScopedSeenKey(userId, CURRENT_TOUR_VERSION);

    setShowWelcomeModal(false);
    setIsActive(false);

    // Mark as seen (user-scoped) so it never auto-shows again for this account
    localStorage.setItem(userScopedSeenKey, 'true');
    localStorage.setItem(keys.VERSION, String(CURRENT_TOUR_VERSION));

    // Clear resume state
    localStorage.removeItem(keys.STEP);

    tutorialAnalytics.trackTourSkip(role);
  }, [authUser, keys, role]);

  const handleCompleteTour = useCallback(() => {
    const userId = resolveUserId(authUser);
    const userScopedSeenKey = getUserScopedSeenKey(userId, CURRENT_TOUR_VERSION);

    setIsActive(false);

    // Mark as seen (user-scoped) so it never auto-shows again for this account
    localStorage.setItem(userScopedSeenKey, 'true');
    localStorage.setItem(keys.VERSION, String(CURRENT_TOUR_VERSION));

    // Also set legacy completed for backward compat (future rollback safety)
    localStorage.setItem(keys.COMPLETED, 'true');

    // Clear resume state
    localStorage.removeItem(keys.STEP);

    tutorialAnalytics.trackTourComplete(role);
  }, [authUser, keys, role]);

  const handleStepChange = useCallback((index: number) => {
    setStepIndex(index);
    // Persist step for resume after page refresh (runtime active state is NOT persisted)
    localStorage.setItem(keys.STEP, index.toString());
    tutorialAnalytics.trackStepView(role, index);
  }, [keys, role]);

  /**
   * startTourAgain — called when user clicks "Take Product Tour Again" on Profile page.
   *
   * This is a MANUAL relaunch. It:
   *  1. Clears runtime step (resume cache)
   *  2. Resets stepIndex to 0
   *  3. Does NOT clear the user-scoped seen key — completed stays true
   *  4. Shows the welcome modal
   *  5. Route navigation is handled by TutorialController after receiving the event
   *
   * Does NOT require a page refresh.
   */
  const startTourAgain = useCallback(() => {
    // Clear stale resume state
    localStorage.removeItem(keys.STEP);

    // Reset runtime state
    setIsActive(false);
    setStepIndex(0);

    // Show welcome modal to re-enter the tour
    setShowWelcomeModal(true);
  }, [keys]);

  return {
    role,
    steps,
    isActive,
    setIsActive,
    stepIndex,
    setStepIndex,
    showWelcomeModal,
    setShowWelcomeModal,
    handleStartTour,
    handleSkipTour,
    handleCompleteTour,
    handleStepChange,
    startTourAgain,
  };
};
