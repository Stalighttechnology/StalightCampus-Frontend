export const TUTORIAL_KEYS = {
  STUDENT: {
    COMPLETED: 'tutorial_student_completed',
    ACTIVE: 'tutorial_student_active',
    STEP: 'tutorial_student_step',
    VERSION: 'tutorial_student_version',
  },
  FACULTY: {
    COMPLETED: 'tutorial_faculty_completed',
    ACTIVE: 'tutorial_faculty_active',
    STEP: 'tutorial_faculty_step',
    VERSION: 'tutorial_faculty_version',
  },
  HOD: {
    COMPLETED: 'tutorial_hod_completed',
    ACTIVE: 'tutorial_hod_active',
    STEP: 'tutorial_hod_step',
    VERSION: 'tutorial_hod_version',
  },
  ADMIN: {
    COMPLETED: 'tutorial_admin_completed',
    ACTIVE: 'tutorial_admin_active',
    STEP: 'tutorial_admin_step',
    VERSION: 'tutorial_admin_version',
  },
  COE: {
    COMPLETED: 'tutorial_coe_completed',
    ACTIVE: 'tutorial_coe_active',
    STEP: 'tutorial_coe_step',
    VERSION: 'tutorial_coe_version',
  },
  DEAN: {
    COMPLETED: 'tutorial_dean_completed',
    ACTIVE: 'tutorial_dean_active',
    STEP: 'tutorial_dean_step',
    VERSION: 'tutorial_dean_version',
  },
  FEES: {
    COMPLETED: 'tutorial_fees_completed',
    ACTIVE: 'tutorial_fees_active',
    STEP: 'tutorial_fees_step',
    VERSION: 'tutorial_fees_version',
  },
  WARDEN: {
    COMPLETED: 'tutorial_warden_completed',
    ACTIVE: 'tutorial_warden_active',
    STEP: 'tutorial_warden_step',
    VERSION: 'tutorial_warden_version',
  },
  HMS: {
    COMPLETED: 'tutorial_hms_completed',
    ACTIVE: 'tutorial_hms_active',
    STEP: 'tutorial_hms_step',
    VERSION: 'tutorial_hms_version',
  },
  TRANSPORT_ADMIN: {
    COMPLETED: 'tutorial_transport_admin_completed',
    ACTIVE: 'tutorial_transport_admin_active',
    STEP: 'tutorial_transport_admin_step',
    VERSION: 'tutorial_transport_admin_version',
  },
};

/**
 * Returns a user-and-version-scoped localStorage key.
 * Pattern: tutorial_seen_{userId}_{version}
 * Example: tutorial_seen_42_1
 *
 * This prevents cross-user onboarding bugs on shared devices.
 * If userId is unavailable during auth hydration, falls back to 'anonymous'.
 *
 * TODO: Replace with backend user.onboardingCompleted when API exposes this field.
 */
export const getUserScopedSeenKey = (userId: string | number | undefined | null, version: number): string => {
  const safeId = userId ? String(userId) : 'anonymous';
  return `tutorial_seen_${safeId}_${version}`;
};

export const TUTORIAL_SELECTORS = {
  // Sidebar nav items
  SIDEBAR_DASHBOARD: '#sidebar-dashboard',
  SIDEBAR_ATTENDANCE: '#sidebar-attendance',
  SIDEBAR_TIMETABLE: '#sidebar-timetable',
  SIDEBAR_MARKS: '#sidebar-marks',
  SIDEBAR_FEES: '#sidebar-fees',
  SIDEBAR_LEAVE: '#sidebar-leave-request',
  SIDEBAR_PROFILE: '#sidebar-profile',
  SIDEBAR_CHAT: '#sidebar-chat',
  SIDEBAR_ANNOUNCEMENTS: '#sidebar-announcements',
  SIDEBAR_TAKE_ATTENDANCE: '#sidebar-take-attendance',
  SIDEBAR_PROCTOR_STUDENTS: '#sidebar-proctor-students',
  SIDEBAR_FACULTY_ATTENDANCE: '#sidebar-faculty-attendance',
  SIDEBAR_USERS_MANAGEMENT: '#sidebar-users-management',
  SIDEBAR_ENROLL_USER: '#sidebar-enroll-user',
  SIDEBAR_BRANCH_MANAGEMENT: '#sidebar-branch-management',
  SIDEBAR_REPORTS: '#sidebar-reports',

  // Dashboard overview cards — Student
  STUDENT_SCHEDULE_CARD: '#student-schedule-card',
  STUDENT_ATTENDANCE_CARD: '#student-attendance-card',
  STUDENT_TIMELINE_CARD: '#student-timeline-card',
  STUDENT_PERFORMANCE_CARD: '#student-performance-card',

  // Dashboard overview cards — Faculty
  FACULTY_STATS_CARDS: '#faculty-stats-cards',
  FACULTY_CHARTS: '#faculty-charts-header',
  FACULTY_LIVE_TIMER: '#faculty-live-timer',
  FACULTY_ACTION_CARDS: '#faculty-action-cards',

  // Dashboard overview cards — HOD
  HOD_STATS_CARDS: '#hod-stats-cards',
  HOD_LEAVE_TABLE: '#hod-leave-table',

  // Dashboard overview cards — Admin
  ADMIN_STATS_GRID: '#admin-stats-grid',
  ADMIN_SEARCH_BAR: '#admin-search-bar',
  ADMIN_CHARTS: '#admin-charts',
};
