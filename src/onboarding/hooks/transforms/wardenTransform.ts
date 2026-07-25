/**
 * Step transform for the Warden role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function wardenTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#warden-stats-grid') {
    return [
      {
        ...step,
        target: '#warden-all-stats-container',
        title: 'Hostel Overview',
        content: 'View occupancy status, allocations, and key hostel management metrics.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-residents') {
    return [
      {
        ...step,
        target: '#warden-residents-container',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-student-meals') {
    return [
      {
        ...step,
        target: '#hms-meals-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-menu-management') {
    return [
      {
        ...step,
        target: '#hms-menu-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-gate-passes') {
    return [
      {
        ...step,
        target: '#warden-gate-passes-header',
        title: 'Gate Pass Requests',
        content: 'Review and process student out-pass and gate pass requests.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-issues') {
    return [
      {
        ...step,
        target: '#warden-issues-container',
        title: 'Issue Statistics',
        content: 'Monitor total raised, pending, in-progress, and resolved issues at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#warden-issues-list-header',
        title: 'Recent Issues & Filters',
        content: 'Filter the list by status to track recent resident tickets and maintenance requests.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-visitor-logs') {
    return [
      {
        ...step,
        target: '#warden-visitor-logs-header',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-announcement-management') {
    return [
      {
        ...step,
        target: '#announcement-header-section',
        title: 'Announcement Management',
        content: 'Create and manage system announcements.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-schedule-meeting') {
    return [
      {
        ...step,
        target: '#schedule-meetings-header-console',
        title: 'Meetings & Schedules',
        content: 'Schedule and manage online meetings across staff roles.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-apply-leave') {
    return [
      {
        ...step,
        target: '#apply-leave-form-card',
        title: 'Apply for Leave',
        content: 'Fill out this form and submit your leave requests.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#recent-leaves-card',
        title: 'Recent Leaves',
        content: 'Track the status of your submitted leave requests.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-my-attendance') {
    return [
      {
        ...step,
        target: '#today-attendance-toggle-section',
        title: "Today's Attendance",
        content: 'Mark your daily attendance check-in or check-out here.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-holiday-calendar') {
    return [
      {
        ...step,
        target: '#holiday-calendar-header',
        title: 'Institutional Calendar',
        content: 'View upcoming holidays, events, exams, and approved leaves.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-reimbursements') {
    return [
      {
        ...step,
        target: '#reimbursements-header-section',
        title: 'Reimbursements & Claims',
        content: 'Submit and track your expense reimbursement requests.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-my-payroll') {
    return [
      {
        ...step,
        target: '#faculty-payroll-header',
        title: 'My Salary & Payroll',
        content: 'View your payslips, statutory deductions, and salary history.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#admin-profile-header',
        title: 'Admin Profile Information',
        content: 'Manage your profile details, change passwords, and configure settings.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  return null;
}
