/**
 * Step transform for the Admission Manager role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function admissionManagerTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#admission-stats-grid') {
    return [
      {
        ...step,
        target: '#all-admission-stats-grid',
        title: 'Admission Overview & Task Metrics',
        content: 'Monitor pipeline health metrics and task follow-ups in real-time.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-courses') {
    return [
      {
        ...step,
        target: '#admission-courses-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-enquiries') {
    return [
      {
        ...step,
        target: '#lead-pipeline-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-applications') {
    return [
      {
        ...step,
        target: '#admission-applications-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-students') {
    return [
      {
        ...step,
        target: '#admission-students-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-documents') {
    return [
      {
        ...step,
        target: '#admission-documents-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-counsellor-management') {
    return [
      {
        ...step,
        target: '#counsellor-management-header',
        title: 'Counsellors Management',
        content: 'Assign admission counsellors and manage team targets and performance.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-communication') {
    return [
      {
        ...step,
        target: '#admission-communication-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-reports') {
    return [
      {
        ...step,
        target: '#admission-reports-cards',
        title: 'Reports Overview Cards',
        content: 'Quickly monitor summary statistics: total enquiries, total submitted applications, and lead-to-application conversion rates.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#admission-reports-header',
        title: 'Export & Filter Custom Reports',
        content: 'Select the report type and date ranges to generate and download custom CSV data reports.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-campus-builder') {
    return [
      {
        ...step,
        target: '#campus-builder-header',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-schedule-meeting') {
    return [
      {
        ...step,
        target: '#schedule-meetings-header-console',
        title: 'Meetings & Schedules',
        content: 'Schedule and manage online meetings across staff roles.',
        placement: isMobile ? step.placement : 'top',
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
        target: '#admission-profile-action-header',
        title: 'Profile Settings',
        content: 'View and update your personal information, manage security credentials, and view login activity.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
