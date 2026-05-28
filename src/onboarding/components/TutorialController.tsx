import { useEffect, useRef, useState, useCallback } from 'react';
import { Joyride, ACTIONS, STATUS, EVENTS } from 'react-joyride';
import { useNavigate } from 'react-router-dom';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialTooltip } from './TutorialTooltip';
import { TutorialModal } from './TutorialModal';
import { TUTORIAL_CONFIG } from '../constants/tutorialConfig';
import { useTheme } from '../../context/ThemeContext';

const console = {
  ...window.console,
  log: (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[ONBOARDING DEBUG]')) return;
    window.console.log(...args);
  },
  warn: (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[ONBOARDING DEBUG]')) return;
    window.console.warn(...args);
  },
  error: (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[ONBOARDING DEBUG]')) return;
    window.console.error(...args);
  }
};

const DummyBeacon = () => null;

const scrollTargetIntoView = (selector: string) => {
  try {
    if (selector === 'body') return;
    const el = document.querySelector(selector);
    if (!el) return;

    // Scroll to top for top-level stats grids, header elements, or filters cards to avoid being cut off by the sticky topbar.
    // Exclude selectors that contain 'stats-grid' but are nested BELOW a header (e.g. faculty stats, which are inside a profile card).
    const isNestedStatsGrid =
      selector === '#dean-faculty-stats-grid';

    const isTopElement =
      (!isNestedStatsGrid && selector.includes('stats-grid')) ||
      selector.includes('filters-card') ||
      selector.includes('filters-header-wrapper') ||
      selector.includes('locations-header') ||
      selector === '#feesmanager-invoices-header' ||
      selector === '#feesmanager-payments-header';

    if (isTopElement) {
      // Find scroll parent and scroll it to top
      const scrollParent = (() => {
        let parent = el.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            return parent;
          }
          parent = parent.parentElement;
        }
        return null;
      })();

      if (scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('[ONBOARDING DEBUG] Scrolled parent and window to top for element:', selector);
      return;
    }

    // Use smooth centering scroll to ensure targets are fully visible and centered
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    console.log('[ONBOARDING DEBUG] Programmatically scrolled target into view:', selector);
  } catch (err) {
    console.error('[ONBOARDING DEBUG] Failed to scroll target into view:', err);
  }
};

const shouldScrollStep = (targetStep: any): boolean => {
  const isMobile = window.innerWidth < 768;
  const target = targetStep.target;

  if (isMobile) {
    // 1. Dashboard Chart Containers
    const isChart =
      target === '#feesmanager-charts-container' ||
      target === '#dean-finance-charts-container' ||
      target === '#dean-branch-distribution-card' ||
      target === '#dean-role-distribution-card' ||
      target === '#warden-charts-container' ||
      target === '#statistics-charts-container' ||
      target === '#admin-charts' ||
      target === '#hod-attendance-trends' ||
      target === '#hod-member-distribution';

    // 2. Dashboard Card/Content components
    const isDashboardCard =
      target === '#feesmanager-recent-transactions' ||
      target === '#feesmanager-action-cards' ||
      target === '#student-schedule-card' ||
      target === '#student-attendance-card' ||
      target === '#student-timeline-card' ||
      target === '#student-performance-card' ||
      target === '#hod-leave-header' ||
      target === '#admin-search-bar' ||
      target === '#hod-search-student-card' ||
      target === '#dean-attendance-filters-card' ||
      target === '#dean-faculty-filters-header-wrapper' ||
      target === '#dean-campus-locations-header' ||
      target === '#dean-profile-card' ||
      target === '#dean-branch-summary-card' ||
      target === '#dean-recent-leaves';

    // 3. Stats grids & headers (which are at top of pages or dashboard)
    const isStats =
      typeof target === 'string' &&
      (target.includes('stats') ||
       target === '#feesmanager-invoices-header' ||
       target === '#feesmanager-payments-header');

    // 4. Recent Leave Applications lists (below forms)
    const isRecentLeaves =
      typeof target === 'string' &&
      (target.includes('recent-leave') || target.includes('recent-leaves') || target.includes('pending-leaves') || target.includes('admin-leaves'));

    // 5. HMS Admin tour targets
    const isHMS =
      typeof target === 'string' && target.startsWith('#hms-');

    // 6. Warden tour targets
    const isWarden =
      typeof target === 'string' &&
      (target.startsWith('#warden-') || target === '#admin-profile-header');

    // 7. Transport & Driver tour targets
    const isTransport =
      typeof target === 'string' &&
      (target.startsWith('#transport-') || target.startsWith('#driver-') || target === '#sidebar-transport-');

    // 8. Library tour targets
    const isLibrary =
      typeof target === 'string' &&
      (target.startsWith('#library-') || target.startsWith('#sidebar-library-') || target === '#sidebar-library');

    return isChart || isDashboardCard || isStats || isRecentLeaves || isHMS || isWarden || isTransport || isLibrary;
  }
  return !targetStep.disableScrolling;
};

// CRITICAL: Check if element is actually visible (not just in DOM)
const isElementActuallyVisible = (selector: string): boolean => {
  if (selector === 'body') return true;

  const el = document.querySelector(selector);
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  // Basic visibility checks: must be in DOM, have size, and not be hidden via CSS
  const hasSizeAndNotHidden =
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity || '1') > 0;

  if (!hasSizeAndNotHidden) return false;

  // For sidebar steps, we must also ensure they are inside the viewport horizontally
  // to verify that the sidebar has actually finished opening/sliding in.
  if (selector.startsWith('#sidebar-')) {
    return rect.left >= -5 && rect.right <= window.innerWidth + 5;
  }

  // For main page elements, we don't enforce viewport check, because
  // Joyride will automatically scroll to them when it resumes.
  return true;
};

// Returns the correct home path for each role so tour completion never
// lands a non-student user on the student-only /dashboard route.
const getHomePath = (role: string): string => {
  const roleMap: Record<string, string> = {
    student: '/dashboard',
    hod: '/hod',
    teacher: '/faculty',
    faculty: '/faculty',
    admin: '/admin',
    principal: '/admin',
    coe: '/coe',
    dean: '/dean',
    fees_manager: '/fees-manager',
    feesmanager: '/fees-manager',
    warden: '/warden',
    hms: '/hms',
    hms_admin: '/hms',
    transport_admin: '/transport-admin',
    library_admin: '/library-admin',
    org_admin: '/org-admin',
    orgadmin: '/org-admin',
    driver: '/driver',
  };
  return roleMap[role.toLowerCase()] || '/dashboard';
};

export const TutorialController = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const {
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
  } = useTutorial();

  console.log('[ONBOARDING DEBUG] Current steps list in controller:', steps);

  const [isNavigating, setIsNavigating] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [transitioningStep, setTransitioningStep] = useState<any>(null);
  const transitionLockRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const prevTargetRef = useRef<string | null>(null);

  // Dynamic class toggling for highlighted elements
  useEffect(() => {
    // Remove class from previous target
    if (prevTargetRef.current) {
      const prevEl = document.querySelector(prevTargetRef.current);
      if (prevEl) {
        prevEl.classList.remove('joyride-highlighted-target');
      }
    }

    // Add class to current target
    const currentStep = steps[stepIndex];
    if (isActive && currentStep && typeof currentStep.target === 'string') {
      const currentEl = document.querySelector(currentStep.target);
      if (currentEl) {
        currentEl.classList.add('joyride-highlighted-target');
        prevTargetRef.current = currentStep.target;
      }
    } else {
      prevTargetRef.current = null;
    }

    return () => {
      if (prevTargetRef.current) {
        const prevEl = document.querySelector(prevTargetRef.current);
        if (prevEl) {
          prevEl.classList.remove('joyride-highlighted-target');
        }
      }
    };
  }, [stepIndex, isActive, steps]);

  // Wait for element to become visible with polling and timeout
  const waitForElementVisible = useCallback(
    (targetStep: any, onReady: () => void, onTimeout: () => void) => {
      const selector = targetStep.target;
      console.log('[ONBOARDING DEBUG] 🔄 waitForElementVisible started', { selector });
      const startTime = Date.now();
      const timeoutMs = 6000; // Hardcoded timeout for stability
      pollCountRef.current = 0;

      const poll = () => {
        const now = Date.now();
        const elapsed = now - startTime;

        // If the target step requires a tab switch, dispatch it on every poll iteration
        // to handle cases where a route transition unmounts and remounts the component.
        if (targetStep && (targetStep as any).switchTab) {
          window.dispatchEvent(new CustomEvent('neurocampus_switch_tab', { detail: { tab: (targetStep as any).switchTab } }));
        }

        const el = document.querySelector(selector);
        const exists = !!el;
        const visible = isElementActuallyVisible(selector);
        const rect = el ? el.getBoundingClientRect() : null;

        let computedStyles = null;
        if (el) {
          const style = window.getComputedStyle(el);
          computedStyles = {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
          };
        }

        // Determine sidebar state by inspecting common sidebar containers
        const sidebarEl =
          document.querySelector('[data-sidebar]') ||
          document.querySelector('.sidebar') ||
          document.querySelector('aside') ||
          document.getElementById('sidebar');

        const sidebarState = sidebarEl
          ? {
              present: true,
              className: sidebarEl.className,
              rect: {
                left: sidebarEl.getBoundingClientRect().left,
                right: sidebarEl.getBoundingClientRect().right,
                width: sidebarEl.getBoundingClientRect().width,
              },
            }
          : { present: false };

        console.log(
          `[ONBOARDING DEBUG] poll #${pollCountRef.current} for selector "${selector}" (elapsed: ${elapsed}ms)`,
          {
            selector,
            exists,
            visible,
            rectValues: rect
              ? {
                  left: rect.left,
                  top: rect.top,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                }
              : null,
            computedStyles,
            sidebarState,
            pollCount: pollCountRef.current,
          }
        );

        if (visible) {
          console.log(
            `[ONBOARDING DEBUG] ✅ visible=true after ${pollCountRef.current} polls — transition allowed`
          );
          if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
          onReady();
          return;
        }

        if (elapsed > timeoutMs) {
          console.log(
            `[ONBOARDING DEBUG] ⏱️ timeout after ${pollCountRef.current} polls — skipping to next step`
          );
          if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
          onTimeout();
          return;
        }

        pollCountRef.current += 1;
        pollTimeoutRef.current = setTimeout(poll, TUTORIAL_CONFIG.POLL_INTERVAL_MS);
      };

      poll();
    },
    []
  );

  // Transition to a new step
  const performTransition = useCallback((targetIndex: number) => {
    console.log('[ONBOARDING DEBUG] performTransition called', { targetIndex });
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (loaderTimerRef.current) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }
    
    // Hide the loader so the user can see the smooth scroll
    setShowLoader(false);
    setTransitioningStep(null);

    const targetStep = steps[targetIndex];
    if (targetStep) {
      // 1. Scroll first, while Joyride is still paused (isNavigating is true)
      if (shouldScrollStep(targetStep)) {
        scrollTargetIntoView(targetStep.target);
      }
      
      // 2. Wait for the smooth scroll to finish (600ms)
      setTimeout(() => {
        console.log('[ONBOARDING DEBUG] Smooth scroll finished, resuming Joyride for step:', targetIndex);
        setIsNavigating(false);
        handleStepChange(targetIndex);
        
        // Trigger a post-scroll resize to ensure charts/components align correctly
        window.dispatchEvent(new Event('resize'));
      }, 600);
    } else {
      setIsNavigating(false);
      handleStepChange(targetIndex);
    }
  }, [handleStepChange, steps]);

  // Start deferred transition (handle sidebar, routing, polling)
  const startDeferredTransition = useCallback(
    (targetIndex: number) => {
      console.log('[ONBOARDING DEBUG] 🚀 startDeferredTransition CALLED', { targetIndex, transitionLocked: transitionLockRef.current });
      if (transitionLockRef.current) {
        console.log('[ONBOARDING DEBUG] ⚠️ transitionLock already active, skipping');
        return;
      }
      transitionLockRef.current = true;

      const targetStep = steps[targetIndex];
      if (!targetStep) {
        console.log('[ONBOARDING DEBUG] ❌ No target step found at index', targetIndex);
        transitionLockRef.current = false;
        return;
      }

      setTransitioningStep(targetStep);

      const isSidebarStep = typeof targetStep.target === 'string' && targetStep.target.startsWith('#sidebar-');
      const needsRouteTransition = targetStep.route && targetStep.route !== window.location.pathname;

      console.log('[ONBOARDING DEBUG] 📍 startDeferredTransition starting', {
        targetIndex,
        selector: targetStep.target,
        isSidebarStep,
        needsNav: needsRouteTransition,
      });

      setShowLoader(false);

      // Fast Path: if same page, not sidebar, and element is already visible, transition instantly without loader
      if (!needsRouteTransition && !isSidebarStep && isElementActuallyVisible(targetStep.target)) {
        console.log('[ONBOARDING DEBUG] Fast Path: same route and element is already visible. Directly changing step index.');
        
        // Pause Joyride (hide spotlight) during the scroll
        setIsNavigating(true);
        
        // 1. Scroll first
        if (shouldScrollStep(targetStep)) {
          scrollTargetIntoView(targetStep.target);
        }
        
        // 2. Wait for the smooth scroll to finish (600ms)
        setTimeout(() => {
          console.log('[ONBOARDING DEBUG] Fast Path scroll finished, resuming Joyride for step:', targetIndex);
          setIsNavigating(false);
          handleStepChange(targetIndex);
          window.dispatchEvent(new Event('resize'));
          transitionLockRef.current = false;
        }, 600);
        return;
      }

      if (isSidebarStep) {
        // Dispatch sidebar open and immediately start polling
        console.log('[ONBOARDING DEBUG] dispatching neurocampus_open_sidebar');
        window.dispatchEvent(new Event('neurocampus_open_sidebar'));
        
        // scroll sidebarItem into view and freeze sidebar scroll after
        setTimeout(() => {
          try {
            const sidebarItem = document.querySelector(targetStep.target) as HTMLElement;
            if (sidebarItem) {
              sidebarItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
            const sidebarEl = document.querySelector('[data-sidebar], .sidebar, aside, #sidebar') as HTMLElement;
            if (sidebarEl) {
              sidebarEl.style.overflow = 'hidden';
            }
          } catch (e) {
            console.error('[ONBOARDING DEBUG] Failed to scroll/freeze sidebar:', e);
          }
        }, 100);
      } else {
        // Close sidebar for non-sidebar steps
        window.dispatchEvent(new Event('neurocampus_close_sidebar'));
        const sidebarEl = document.querySelector('[data-sidebar], .sidebar, aside, #sidebar') as HTMLElement;
        if (sidebarEl) {
          sidebarEl.style.overflow = '';
        }
      }

      // If the step requires switching an in-page tab, dispatch the event now
      // so the target element is rendered before the visibility poll starts.
      if ((targetStep as any).switchTab) {
        console.log('[ONBOARDING DEBUG] dispatching neurocampus_switch_tab:', (targetStep as any).switchTab);
        window.dispatchEvent(new CustomEvent('neurocampus_switch_tab', { detail: { tab: (targetStep as any).switchTab } }));
      }

      // Navigate if needed
      if (needsRouteTransition) {
        console.log('[ONBOARDING DEBUG] navigating to', targetStep.route);
        navigate(targetStep.route);
      }

      // Pause Joyride and start polling
      setIsNavigating(true);
      console.log('[ONBOARDING DEBUG] pausing Joyride — polling for visibility...');

      // Start the 200ms deferred loader timer to avoid flashing for fast loads
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = setTimeout(() => {
        console.log('[ONBOARDING DEBUG] Deferred loader timeout fired, showing loader');
        setShowLoader(true);
      }, 200);

      waitForElementVisible(
        targetStep,
        () => {
          console.log('[ONBOARDING DEBUG] ✅ Element visible! Calling performTransition');
          performTransition(targetIndex);
          transitionLockRef.current = false;
        },
        () => {
          console.log('[ONBOARDING DEBUG] ⏱️ Element visibility timeout! Skipping to next step');
          if (loaderTimerRef.current) {
            clearTimeout(loaderTimerRef.current);
            loaderTimerRef.current = null;
          }
          setShowLoader(false);
          transitionLockRef.current = false;
          // Timeout: skip to next step
          if (targetIndex + 1 < steps.length) {
            setTransitioningStep(null);
            startDeferredTransition(targetIndex + 1);
          } else {
            // Last step, finish tour
            handleCompleteTour();
            setTransitioningStep(null);
            navigate(getHomePath(role));
          }
        }
      );
    },
    [steps, navigate, waitForElementVisible, performTransition, handleStepChange, handleCompleteTour]
  );

  // Handle Joyride callbacks
  const handleJoyrideCallback = useCallback(
    (data: any) => {
      const { action, type, index, status } = data;

      console.log('[ONBOARDING DEBUG] 📞 Joyride callback FIRED', {
        action,
        type,
        index,
        status,
        allData: JSON.stringify(data, null, 2)
      });

      if (type === EVENTS.STEP_AFTER) {
        console.log('[ONBOARDING DEBUG] ➡️ STEP_AFTER detected', { action, index });
        
        // Prevent overlay clicks or close actions from advancing/disrupting steps
        if (action === ACTIONS.CLOSE) {
          console.log('[ONBOARDING DEBUG] 🛑 Ignoring CLOSE action on STEP_AFTER to remain in current state');
          return;
        }

        // Move to next step
        let nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        console.log('[ONBOARDING DEBUG] calculated nextIndex:', nextIndex);
        // Don't allow going back to step 0 (the body welcome step)
        if (nextIndex === 0 && action === ACTIONS.PREV) {
          console.log('[ONBOARDING DEBUG] prevented going back to step 0');
          return;
        }
        if (nextIndex < steps.length) {
          console.log('[ONBOARDING DEBUG] ✅ Calling startDeferredTransition with nextIndex:', nextIndex);
          startDeferredTransition(nextIndex);
        } else {
          console.log('[ONBOARDING DEBUG] 🏁 Reached end, calling handleCompleteTour');
          handleCompleteTour();
          navigate(getHomePath(role));
        }
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        console.warn(
          `[ONBOARDING DEBUG] target not found at index ${index}, skipping...`
        );
        if (index + 1 < steps.length) {
          handleStepChange(index + 1);
        } else {
          handleCompleteTour();
          navigate(getHomePath(role));
        }
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        console.log('[ONBOARDING DEBUG] Tour finished/skipped with status:', status);
        window.dispatchEvent(new Event('neurocampus_close_sidebar'));
        const sidebarEl = document.querySelector('[data-sidebar], .sidebar, aside, #sidebar') as HTMLElement;
        if (sidebarEl) {
          sidebarEl.style.overflow = '';
        }
        // Reset window scroll to make sure topbar is visible
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        handleCompleteTour();
        navigate(getHomePath(role));
      }

      if (action === ACTIONS.CLOSE) {
        console.log('[ONBOARDING DEBUG] Close action detected (ignored to prevent closing on outside clicks)');
        return;
      }
    },
    [steps, startDeferredTransition, handleStepChange, handleCompleteTour, handleSkipTour, role]
  );

  // Toggle body class based on isActive state
  useEffect(() => {
    if (isActive) {
      document.body.classList.add('tutorial-active');
      document.documentElement.classList.add('tutorial-active');
    } else {
      document.body.classList.remove('tutorial-active');
      document.documentElement.classList.remove('tutorial-active');
      // Reset window scroll when tutorial deactivated to restore navbar visibility
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    return () => {
      document.body.classList.remove('tutorial-active');
      document.documentElement.classList.remove('tutorial-active');
    };
  }, [isActive]);

  // Handle startup and resume states with double requestAnimationFrame to ensure layout readiness
  useEffect(() => {
    if (isActive) {
      if (!hasInitializedRef.current && steps.length > 0) {
        hasInitializedRef.current = true;
        const targetStep = stepIndex === 0 ? 1 : stepIndex;
        console.log(`[ONBOARDING DEBUG] ✅ Tour activated/resumed! Performing initial checks before transitioning to step ${targetStep}`);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            startDeferredTransition(targetStep);
          });
        });
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [isActive, stepIndex, steps.length, startDeferredTransition]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
    };
  }, []);

  /**
   * neurocampus_restart_tour — Custom event listener for Profile page "Take Tour Again" button.
   *
   * Restart flow (must work from ANY route):
   *  1. Close sidebar if open
   *  2. Navigate to role home route (e.g. /dashboard, /faculty, /hod...)
   *  3. Wait 300ms for DOM to settle after navigation
   *  4. Call startTourAgain() → clears runtime state → shows welcome modal
   *
   * NO page refresh. Cleans up listener on unmount (no memory leaks).
   */
  useEffect(() => {
    const handleRestartTourEvent = (e: Event) => {
      const source = (e as CustomEvent).detail?.source || 'unknown';
      console.log(`[ONBOARDING DEBUG] neurocampus_restart_tour received from source: ${source}`);

      // Step 1: Close sidebar if open
      window.dispatchEvent(new Event('neurocampus_close_sidebar'));
      const sidebarEl = document.querySelector('[data-sidebar], .sidebar, aside, #sidebar') as HTMLElement | null;
      if (sidebarEl) sidebarEl.style.overflow = '';

      // Step 2: Stop any in-flight transitions
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
      transitionLockRef.current = false;
      hasInitializedRef.current = false;
      setIsNavigating(false);
      setShowLoader(false);
      setTransitioningStep(null);

      // Step 3: Navigate to role home route
      const homePath = getHomePath(role || sessionStorage.getItem('role') || '');
      navigate(homePath);

      // Step 4: Wait for DOM stabilization then restart
      setTimeout(() => {
        startTourAgain();
      }, 300);
    };

    window.addEventListener('neurocampus_restart_tour', handleRestartTourEvent);
    return () => {
      window.removeEventListener('neurocampus_restart_tour', handleRestartTourEvent);
    };
  }, [role, navigate, startTourAgain]);

  if (!isActive || steps.length === 0) {
    return (
      <TutorialModal
        isOpen={showWelcomeModal}
        onStart={handleStartTour}
        onSkip={handleSkipTour}
        role={role}
      />
    );
  }

  return (
    <>
      <TutorialModal
        isOpen={showWelcomeModal}
        onStart={handleStartTour}
        onSkip={handleSkipTour}
        role={role}
      />

      {showLoader && isNavigating && transitioningStep && (
        <div className="fixed inset-0 bg-slate-950/50 flex flex-col items-center justify-center z-[999999] animate-fadeIn">
          <div className="bg-white/80 dark:bg-slate-900/80 border border-purple-200/50 dark:border-purple-800/50 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center gap-6">
            <div className="relative w-16 h-16">
              {/* Spinning gradient border */}
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 dark:border-t-purple-400 animate-spin"></div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 m-0 leading-tight">
                Opening {transitioningStep.title || 'Page'}
              </h3>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
                Preparing page elements, please wait...
              </p>
            </div>
          </div>
        </div>
      )}

      <Joyride
        steps={steps}
        run={isActive && !isNavigating}
        stepIndex={stepIndex}
        continuous
        hideCloseButton
        disableOverlayClose={true}
        overlayClickAction={false}
        spotlightClicks={false}
        showSkipButton
        disableScrolling={true} // Disable internal Joyride scrolling to prevent conflicts and ensure ultra-smooth centering scroll
        options={{
          skipBeacon: true,
          overlayClickAction: false,
          disableOverlayClose: true,
        }} // Make sure all steps default to skipping beacons and ignoring overlay clicks
        beaconComponent={DummyBeacon} // Completely suppress all beacons/dots
        debug={false}
        tooltipComponent={TutorialTooltip}
        onEvent={handleJoyrideCallback}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#a855f7',
            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
            textColor: theme === 'dark' ? '#f3f4f6' : '#1f2937',
            overlayColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
          },
        }}
        floaterProps={{
          disableAnimation: true,
          styles: {
            floater: {
              filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15))',
            },
          },
        }}
      />
    </>
  );
};
