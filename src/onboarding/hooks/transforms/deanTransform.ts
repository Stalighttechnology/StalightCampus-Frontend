/**
 * Step transform for the Dean role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function deanTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-enroll-user') {
    return [
      {
        ...step,
        target: '#enroll-user-header',
        title: 'Enroll Staff',
        content:
          'Fill out this form to enroll new HODs, faculty members, Deans, COE, or Fees Managers.',
        placement: isMobile ? step.placement : 'bottom',
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
        target: '#billing-support-tickets-header',
        title: 'HQ Support Desk',
        content: 'Track existing support logs, communicate with Super HQ, or raise direct support tickets.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-attendance') {
    return [
      {
        ...step,
        target: '#dean-attendance-stats-grid',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-attendance-filters') {
    return [
      {
        ...step,
        target: '#dean-attendance-filters-card',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-performance') {
    return [
      {
        ...step,
        target: '#hod-search-student-card',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-exams') {
    return [
      {
        ...step,
        target: '#dean-exams-stats-grid',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-faculty') {
    return [
      {
        ...step,
        target: '#dean-faculty-filters-header-wrapper',
        title: 'Filter Faculty Profiles',
        content: 'Select a branch and faculty member to load their detailed academic dashboard.',
        placement: isMobile ? step.placement : 'bottom',
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
        disableScrolling: !isMobile,
      },
    ];
  }

  if (target === '#sidebar-campus-locations') {
    return [
      {
        ...step,
        target: '#dean-campus-locations-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admin-leaves') {
    return [
      {
        ...step,
        target: '#dean-pending-leaves',
        title: 'Pending Leave Requests',
        content: 'Review and approve or reject leave applications submitted by administrative staff.',
        placement: isMobile ? step.placement : 'top',
      },
      {
        ...step,
        target: '#dean-recent-leaves',
        title: 'Recent Leave History',
        content: 'Track and review the status of processed leave requests here.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#dean-profile-card',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
