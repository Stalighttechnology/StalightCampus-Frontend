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

  if (target === '#sidebar-driver-history') {
    return [
      {
        ...step,
        target: '#driver-trip-history-header',
        placement: isMobile ? step.placement : 'bottom',
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
