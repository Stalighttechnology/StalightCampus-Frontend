/**
 * Step transform for the Driver role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function driverTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-dashboard') {
    return [
      {
        ...step,
        target: '#driver-metrics-grid',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#driver-trip-controls') {
    if (isMobile) {
      return [];
    }
    return [step];
  }

  if (target === '#sidebar-driver-history') {
    return [
      {
        ...step,
        target: '#driver-trip-history-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-announcements') {
    return [
      {
        ...step,
        target: '#announcement-header-section',
        title: 'Announcements',
        content: 'View announcements and notices from campus administration.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-driver-complaints') {
    return [
      {
        ...step,
        target: '#driver-complaints-header',
        placement: isMobile ? step.placement : 'bottom',
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
        target: '#driver-profile-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
