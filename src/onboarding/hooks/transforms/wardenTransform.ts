/**
 * Step transform for the Warden role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function wardenTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-residents') {
    return [
      {
        ...step,
        target: '#warden-residents-container',
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
