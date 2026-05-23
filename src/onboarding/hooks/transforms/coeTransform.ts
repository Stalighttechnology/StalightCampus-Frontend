/**
 * Step transform for the COE (Controller of Examinations) role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function coeTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-student-status') {
    return [
      {
        ...step,
        target: '#coe-student-status-container',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-course-statistics') {
    return [
      {
        ...step,
        target: '#coe-course-statistics-container',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-publish-results') {
    return [
      {
        ...step,
        target: '#coe-publish-results-container',
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
