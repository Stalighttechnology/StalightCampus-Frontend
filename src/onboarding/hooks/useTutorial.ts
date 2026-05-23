import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TUTORIAL_KEYS } from '../constants/tutorialKeys';
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

export const useTutorial = () => {
  const { role: authRole } = useAuth();
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

  // Initialize and track role updates from context
  useEffect(() => {
    const resolvedRole = authRole || sessionStorage.getItem('role') || localStorage.getItem('role') || '';
    if (!resolvedRole) return;

    setRole(resolvedRole);

    const tourConfig = ROLE_TO_TOUR_MAP[resolvedRole.toLowerCase()] || {
      steps: [],
      keys: TUTORIAL_KEYS.STUDENT,
    };

    const isCompleted = localStorage.getItem(tourConfig.keys.COMPLETED) === 'true';
    const isSaved = localStorage.getItem(tourConfig.keys.ACTIVE) === 'true';
    const savedStep = parseInt(
      localStorage.getItem(tourConfig.keys.STEP) || '0',
      10
    );

    if (!isCompleted && !isSaved) {
      setShowWelcomeModal(true);
    } else if (isSaved) {
      setIsActive(true);
      setStepIndex(savedStep === 0 ? 1 : savedStep);
    }
  }, [authRole]);

  const handleStartTour = () => {
    setShowWelcomeModal(false);
    setIsActive(true);
    setStepIndex(1);
    localStorage.setItem(keys.ACTIVE, 'true');
    localStorage.setItem(keys.STEP, '1');
    tutorialAnalytics.trackTourStart(role);
  };

  const handleSkipTour = () => {
    setShowWelcomeModal(false);
    setIsActive(false);
    localStorage.removeItem(keys.ACTIVE);
    localStorage.removeItem(keys.STEP);
    tutorialAnalytics.trackTourSkip(role);
  };

  const handleCompleteTour = () => {
    setIsActive(false);
    localStorage.setItem(keys.COMPLETED, 'true');
    localStorage.removeItem(keys.ACTIVE);
    localStorage.removeItem(keys.STEP);
    tutorialAnalytics.trackTourComplete(role);
  };

  const handleStepChange = (index: number) => {
    setStepIndex(index);
    localStorage.setItem(keys.STEP, index.toString());
    tutorialAnalytics.trackStepView(role, index);
  };

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
  };
};
