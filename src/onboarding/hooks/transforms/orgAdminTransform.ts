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
        target: isMobile ? '#billing-plan-card-header' : '#billing-plan-card',
        title: 'Current Subscription',
        content: 'View your active plan, price, and current subscription status.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: isMobile ? '#billing-org-details-card-header' : '#billing-org-details-card',
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

  if (target === '#sidebar-scan-student-info') {
    return [
      {
        ...step,
        target: '#hod-search-student-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-branches') {
    return [
      {
        ...step,
        target: '#branches-management-header-section',
        title: 'Branch Management',
        content: 'View and manage all institutional branches, assign department heads, and export records.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-batches') {
    return [
      {
        ...step,
        target: '#existing-batches-header',
        title: 'Batches Management',
        content: 'Configure academic batches, cohort details, and sections.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-announcement-management') {
    return [
      {
        ...step,
        target: '#announcement-header-section',
        title: 'Announcement Management',
        content: 'Broadcast campus news and updates to students and staff.',
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

  if (target === '#sidebar-reports') {
    return [
      {
        ...step,
        target: '#feesmanager-reports-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-schedule-meeting') {
    return [
      {
        ...step,
        target: '#schedule-meetings-header-console',
        title: 'Schedule Meetings',
        content: 'Plan, configure, and coordinate interactive meetings with HODs, faculty, or students.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-campus-locations') {
    return [
      {
        ...step,
        target: '#dean-campus-locations-header',
        title: 'Campus Locations',
        content: 'View and manage physical campus boundaries, departments, and geolocation configurations.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-alumni-directory') {
    return [
      {
        ...step,
        target: '#alumni-directory-header',
        title: 'Alumni Directory',
        content: 'Search, audit, and stay connected with graduated cohorts and manage alumni relationships.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-staff-tasks') {
    return [
      {
        ...step,
        target: '#staff-tasks-tracker-header',
        title: 'Staff Tasks',
        content: 'Assign academic tasks, monitor progress, and manage department workflows.',
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
        content: 'Check scheduled holidays, exam dates, and upcoming academic events.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-my-payroll') {
    return [
      {
        ...step,
        target: '#faculty-payroll-header',
        title: 'Payroll Logs',
        content: 'Access payslips, check salary statements, and track financial transactions.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  return null;
}
