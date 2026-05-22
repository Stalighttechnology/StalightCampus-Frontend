import { useState, useEffect, useMemo } from 'react';
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

const ROLE_TO_TOUR_MAP: Record<string, any> = {
  student: { steps: studentTour, keys: TUTORIAL_KEYS.STUDENT },
  faculty: { steps: facultyTour, keys: TUTORIAL_KEYS.FACULTY },
  hod: { steps: hodTour, keys: TUTORIAL_KEYS.HOD },
  admin: { steps: adminTour, keys: TUTORIAL_KEYS.ADMIN },
  coe: { steps: coeTour, keys: TUTORIAL_KEYS.COE },
  dean: { steps: deanTour, keys: TUTORIAL_KEYS.DEAN },
  feesmanager: { steps: feesManagerTour, keys: TUTORIAL_KEYS.FEES },
  warden: { steps: wardenTour, keys: TUTORIAL_KEYS.WARDEN },
  hms: { steps: hmsTour, keys: TUTORIAL_KEYS.HMS },
};

const transformStepsForHighlights = (originalSteps: any[], isMobile: boolean): any[] => {
  const steps: any[] = [];

  for (const step of originalSteps) {
    const target = step.target;

    if (typeof target === 'string') {
      if (target === '#sidebar-attendance') {
        steps.push(
          {
            ...step,
            target: '#attendance-trends-card',
            title: 'Attendance Trends',
            content: 'View your monthly attendance trends and tracking here.',
            placement: isMobile ? step.placement : 'right',
          },
          {
            ...step,
            target: '#attendance-overview-card',
            title: 'Attendance Overview',
            content: 'Check your overall attendance statistics and percentage.',
            placement: isMobile ? step.placement : 'left',
          },
          {
            ...step,
            target: isMobile ? '#attendance-subject-card' : '#attendance-subject-card-header',
            title: 'Subject-wise Attendance',
            content: 'Review detailed attendance records for each subject.',
            placement: isMobile ? step.placement : 'left',
          }
        );
        continue;
      }

      if (target === '#sidebar-timetable') {
        steps.push({
          ...step,
          target: isMobile ? '#timetable-card' : '#timetable-card-header',
          title: 'Weekly Timetable',
          content: 'View your complete class and exam schedule here.',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-marks') {
        steps.push(
          {
            ...step,
            target: isMobile ? '#marks-overview-card' : '#marks-overview-card-header',
            title: 'Performance Overview',
            content: 'Track your internal assessment/test marks and averages.',
            placement: isMobile ? step.placement : 'top',
          },
          {
            ...step,
            target: '#marks-table-card',
            title: 'Subject-wise Marks',
            content: 'Detailed IA marks and grade breakdown for each subject.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-fees') {
        steps.push(
          {
            ...step,
            target: '#fees-details-card',
            title: 'Student Details',
            content: 'Check your student profile and fee allocation status.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: '#fees-summary-card',
            title: 'Fee Summary',
            content: 'See your total, paid, and remaining fees at a glance.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: isMobile ? '#fees-invoices-card' : '#fees-invoices-card-header',
            title: 'Fee Invoices',
            content: 'View and pay individual semester fee invoices.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: isMobile ? '#fees-history-card' : '#fees-history-card-header',
            title: 'Payment History',
            content: 'Check your transaction history and download payment receipts.',
            placement: isMobile ? step.placement : 'bottom',
          }
        );
        continue;
      }

      if (target === '#sidebar-leave-request') {
        steps.push(
          {
            ...step,
            target: '#leave-form-card',
            title: 'Apply for Leave',
            content: 'Fill out and submit leave requests to your department.',
            placement: isMobile ? step.placement : 'right',
          },
          {
            ...step,
            target: '#leave-status-list',
            title: 'Leave Status',
            content: 'Track and monitor the status of your submitted leave requests.',
            placement: isMobile ? step.placement : 'left',
          }
        );
        continue;
      }

      // Fallback for other sidebar items if any
      if (target.startsWith('#sidebar-')) {
        steps.push({
          ...step,
          target: 'body',
        });
        continue;
      }
    }

    // Default mapping for non-sidebar steps (wording improvements ONLY for mobile)
    let newTitle = step.title;
    let newContent = step.content;

    if (isMobile) {
      const lowercaseTitle = step.title.toLowerCase();

      if (lowercaseTitle.includes('welcome')) {
        newTitle = 'Welcome!';
        newContent = 'Let\'s show you around your portal.';
      } else if (lowercaseTitle.includes('schedule') || lowercaseTitle.includes('timetable')) {
        newTitle = 'Check Classes';
        newContent = 'Check today\'s classes here.';
      } else if (lowercaseTitle.includes('attendance')) {
        newTitle = 'Track Attendance';
        newContent = 'See your attendance here.';
      } else if (lowercaseTitle.includes('performance') || lowercaseTitle.includes('marks') || lowercaseTitle.includes('stats') || lowercaseTitle.includes('metrics') || lowercaseTitle.includes('overview') || lowercaseTitle.includes('charts') || lowercaseTitle.includes('analytics')) {
        newTitle = 'Track Performance';
        newContent = 'Track your performance and grades here.';
      } else if (lowercaseTitle.includes('timeline') || lowercaseTitle.includes('timer')) {
        newTitle = 'Live Sessions';
        newContent = 'Monitor active live sessions here.';
      } else if (lowercaseTitle.includes('fees') || lowercaseTitle.includes('financial')) {
        newTitle = 'Manage Fees';
        newContent = 'View and pay your fees here.';
      } else if (lowercaseTitle.includes('leave')) {
        newTitle = 'Apply Leave';
        newContent = 'Submit and track leave requests.';
      } else if (lowercaseTitle.includes('notifications') || lowercaseTitle.includes('announcement')) {
        newTitle = 'Read Updates';
        newContent = 'Important updates appear here.';
      } else if (lowercaseTitle.includes('profile')) {
        newTitle = 'Manage Profile';
        newContent = 'Check and update your profile details.';
      } else if (lowercaseTitle.includes('users') || lowercaseTitle.includes('resident') || lowercaseTitle.includes('enroll')) {
        newTitle = 'Manage Users';
        newContent = 'Add and manage user profiles here.';
      } else if (lowercaseTitle.includes('branch')) {
        newTitle = 'Manage Branches';
        newContent = 'Configure institution campuses here.';
      } else if (lowercaseTitle.includes('report')) {
        newTitle = 'Generate Reports';
        newContent = 'Create and download summary reports.';
      } else if (lowercaseTitle.includes('search')) {
        newTitle = 'Global Search';
        newContent = 'Search records across the system.';
      }
    }

    steps.push({
      ...step,
      title: newTitle,
      content: newContent,
    });
  }

  return steps;
};

export const useTutorial = () => {
  const [role, setRole] = useState<string>('');
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
    const processedSteps = transformStepsForHighlights(tourConfig.steps, isMobile);

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

  // Initialize on mount: read role, check completed status, set modal
  useEffect(() => {
    const storedRole = localStorage.getItem('role') || 'student';
    setRole(storedRole);

    const tourConfig = ROLE_TO_TOUR_MAP[storedRole.toLowerCase()] || {
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
  }, []);

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
