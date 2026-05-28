/**
 * Step transform for the Org Admin role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function orgAdminTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-dashboard') {
    return [
      {
        ...step,
        target: '#admin-stats-grid',
        title: 'System Statistics',
        content: 'Monitor overall institution stats, registration counts, and metrics at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-users') {
    return [
      {
        ...step,
        target: '#users-management-header-filters',
        title: 'Users Directory',
        content: 'Filter users by role or search profiles. You can edit, update, or deactivate any account.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-enroll-user') {
    return [
      {
        ...step,
        target: '#enroll-user-header',
        title: 'Enroll Staff',
        content: 'Onboard HODs, faculty members, Deans, COE, or Fees Managers from this enrollment console.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-billing') {
    return [
      {
        ...step,
        target: '#billing-plan-card',
        title: 'Current Subscription',
        content: 'View your active plan, price, and current subscription status.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#billing-org-details-card',
        title: 'Organization Profile',
        content: 'Manage tax details, technical point of contact (POC), and accreditation records.',
        placement: isMobile ? step.placement : 'left',
      },
      {
        ...step,
        target: '#billing-payment-history',
        title: 'Transactions Log',
        content: 'Review past transaction receipts, download details, and track statuses.',
        placement: isMobile ? step.placement : 'top',
      },
      {
        ...step,
        target: '#billing-support-tickets',
        title: 'HQ Support Desk',
        content: 'Track existing support logs, communicate with Super HQ, or raise direct support tickets.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#admin-profile-header',
        title: 'Admin Credentials',
        content: 'Keep your login profile details, passwords, and organization admin roles secure.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  return null;
}
