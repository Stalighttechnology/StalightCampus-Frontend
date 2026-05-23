/**
 * Step transform for the Fees Manager role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function feesManagerTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-invoices') {
    return [
      {
        ...step,
        target: '#feesmanager-invoices-container',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-payments') {
    return [
      {
        ...step,
        target: '#feesmanager-payments-container',
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
