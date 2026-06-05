/**
 * Step transform for the Transport Admin role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function transportAdminTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-dashboard') {
    return [
      {
        ...step,
        target: '#transport-stats-grid',
        title: 'System Statistics',
        content: 'Monitor overall system fleet, active routes, drivers, and pending complaints at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#transport-live-trips-title',
        title: 'Live Trip Status',
        content: 'Check the real-time active trips status currently running on campus.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-transport-buses') {
    return [
      {
        ...step,
        target: '#transport-buses-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-transport-routes') {
    return [
      {
        ...step,
        target: '#transport-routes-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-transport-drivers') {
    return [
      {
        ...step,
        target: '#transport-drivers-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-transport-allocations') {
    return [
      {
        ...step,
        target: '#transport-allocation-form-card',
        title: 'Allocate Student',
        content: 'Use this form to specify a student and assign them to a transport route and stop.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#transport-allocations-table-header',
        title: 'Active Transport Allocations',
        content: 'Review assigned student records and filter the list by routes, status, or search names/USNs.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-transport-tracking') {
    return [
      {
        ...step,
        target: '#transport-tracking-title-row',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-transport-incidents') {
    return [
      {
        ...step,
        target: '#transport-incidents-title-row',
        placement: isMobile ? step.placement : 'bottom',
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

  if (target === '#sidebar-manage-leaves') {
    return [
      {
        ...step,
        target: '#hod-leaves-header-section',
        title: 'Driver Leave Requests',
        content: 'Review and manage leave applications submitted by drivers.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#transport-profile-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
