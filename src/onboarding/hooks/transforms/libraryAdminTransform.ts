/**
 * Step transform for the Library Admin role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function libraryAdminTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-dashboard') {
    return [
      {
        ...step,
        target: '#library-stats-grid',
        title: 'Library Overview',
        content: 'Monitor key statistics such as total books, active borrow counts, overall circulation, and overdue fines at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#library-issue-card',
        title: 'Book Issue Desk',
        content: 'Quickly issue books to students or teachers by scanning their barcode and searching borrower profiles.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#library-return-card',
        title: 'Book Return Desk',
        content: 'Scan returned book barcodes to check them back in and automatically calculate any overdue fine details.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-library-books') {
    return [
      {
        ...step,
        target: '#library-books-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-library-circulation') {
    return [
      {
        ...step,
        target: '#library-circulation-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-library-fines') {
    return [
      {
        ...step,
        target: '#library-fines-action-header',
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

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#library-profile-action-header',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
