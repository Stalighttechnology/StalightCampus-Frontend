/**
 * Step transform for the Admission Manager role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function admissionManagerTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-campus-builder') {
    return [
      {
        ...step,
        target: '#campus-builder-header',
        placement: isMobile ? step.placement : 'top',
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

  if (target === '#sidebar-admission-courses') {
    return [
      {
        ...step,
        target: '#admission-courses-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-seat-matrix') {
    return [
      {
        ...step,
        target: '#admission-seat-matrix-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-admission-fees') {
    return [
      {
        ...step,
        target: '#admission-fees-header',
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

  if (target === '#sidebar-admission-settings') {
    return [
      {
        ...step,
        target: '#admission-settings-header',
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
