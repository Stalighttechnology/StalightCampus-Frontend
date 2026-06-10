/**
 * Step transform for the Fees Manager role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function feesManagerTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-components') {
    return [
      {
        ...step,
        target: '#feesmanager-components-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-templates') {
    return [
      {
        ...step,
        target: '#feesmanager-templates-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-assignments') {
    return [
      {
        ...step,
        target: '#feesmanager-assignments-filters',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-individual-fees') {
    return [
      {
        ...step,
        target: '#feesmanager-individual-assignments-filters',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-bulk-assignment') {
    return [
      {
        ...step,
        target: '#feesmanager-bulk-assignment-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-invoices') {
    return [
      {
        ...step,
        target: '#feesmanager-invoices-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-payments') {
    return [
      {
        ...step,
        target: '#feesmanager-payments-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-payment-settings') {
    return [
      {
        ...step,
        target: '#feesmanager-payment-settings-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-leave') {
    return [
      {
        ...step,
        target: '#feesmanager-leave-form',
        title: 'Leave Application Form',
        content: 'Fill in the leave details (title, dates, and reason) to submit a new leave request.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#feesmanager-recent-leaves',
        title: 'Recent Leave Applications',
        content: 'Track and review the status of your submitted leave requests here.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-reports') {
    return [
      {
        ...step,
        target: '#feesmanager-reports-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-student-reports') {
    return [
      {
        ...step,
        target: '#feesmanager-student-reports-search-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-my-attendance') {
    return [
      {
        ...step,
        target: '#today-attendance-toggle-section',
        title: 'My Attendance',
        content:
          'Mark your attendance as present or absent for today and optionally add notes.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#feesmanager-profile-header',
        title: 'Fees Manager Profile',
        content: 'Manage your profile details, change passwords, and configure settings.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
