/**
 * Step transform for the HMS Admin role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function hmsTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#hms-occupancy-matrix') {
    return [
      {
        ...step,
        disableScrolling: !isMobile,
      },
    ];
  }

  if (target === '#sidebar-hostels') {
    return [
      {
        ...step,
        target: '#hms-hostels-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-rooms') {
    return [
      {
        ...step,
        target: '#hms-rooms-header',
        title: 'Room Management',
        content: 'Configure hostel block filters, edit/add room records, and review the occupancy color legend.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-enrollment') {
    return [
      {
        ...step,
        target: '#hms-enrollment-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-students') {
    return [
      {
        ...step,
        target: '#hms-students-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-outside-students') {
    return [
      {
        ...step,
        target: '#hms-outside-students-card',
        title: 'Outside Students',
        content: 'View and manage non-hostel student amenity registrations.',
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

  if (target === '#sidebar-issues') {
    return [
      {
        ...step,
        target: '#hms-issues-stats-grid',
        title: 'Issue Statistics',
        content: 'Monitor total raised, pending, in-progress, and resolved issues at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#hms-issues-card',
        title: 'Issue List & Filters',
        content: 'Select the hostel block and filter issues by status to track complaints and maintenance tickets.',
        placement: isMobile ? step.placement : 'right',
      },
    ];
  }

  if (target === '#sidebar-visitor-logs') {
    return [
      {
        ...step,
        target: '#hms-visitor-logs-header',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-staff') {
    if (isMobile) {
      return [
        {
          ...step,
          target: '#hms-staff-stats-grid',
          placement: step.placement,
        },
      ];
    }
    return [
      {
        ...step,
        target: '#hms-staff-stats-grid',
        placement: 'bottom',
      },
      {
        ...step,
        target: '#hms-staff-lists-container',
        title: 'Staff Directory',
        content: 'View and manage registered Wardens and Caretakers in this grid.',
        placement: 'top',
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

  if (target === '#sidebar-manage-warden-leaves') {
    return [
      {
        ...step,
        target: '#Warden-leaves-header-section',
        title: 'Warden Leave Requests',
        content: 'Review, approve, or reject leave requests submitted by hostel wardens.',
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
        target: '#hms-profile-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  return null;
}
