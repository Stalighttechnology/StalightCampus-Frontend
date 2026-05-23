/**
 * Step transform for the Dean role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function deanTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-attendance') {
    return [
      {
        ...step,
        target: '#dean-attendance-container',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-attendance-filters') {
    return [
      {
        ...step,
        target: '#dean-attendance-filters-container',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-finance') {
    return [
      {
        ...step,
        target: '#dean-finance-stats-grid',
        title: 'Financial Overview',
        content: 'Monitor key financial analytics and metrics at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#dean-finance-charts-container',
        title: 'Financial Trends',
        content: 'Analyze historical revenue and trend data.',
        placement: isMobile ? step.placement : 'top',
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
