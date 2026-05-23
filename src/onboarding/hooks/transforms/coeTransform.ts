/**
 * Step transform for the COE (Controller of Examinations) role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function coeTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-apply-leave') {
    return [
      {
        ...step,
        target: '#coe-leave-application-form',
        title: 'Leave Application Form',
        content: 'Fill in the leave details (title, dates, and reason) to submit a new leave request.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#coe-recent-leave-applications',
        title: 'Recent Leave Applications',
        content: 'Track and review the status of your submitted leave requests here.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-student-status') {
    return [
      {
        ...step,
        target: '#coe-student-status-filters',
        title: 'Student Application Status',
        content:
          '• Batch: Select batch\n• Exam Period: Select exam period\n• Branch: Select branch\n• Semester: Select semester',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-course-statistics') {
    return [
      {
        ...step,
        target: '#coe-course-statistics-filters',
        title: 'Course Statistics',
        content:
          '• Batch: Select batch\n• Exam Period: Select exam period\n• Branch: Select branch\n• Semester: Select semester',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-makeup-requests') {
    return [
      {
        ...step,
        target: '#coe-makeup-requests-filters',
        title: 'Makeup Exam Requests',
        content:
          '• Batch: Select batch\n• Branch: Select branch\n• Semester: Select semester\n• Exam Period: Select exam period\n• Status: Select status\n• Search: Search by name, USN, subject...',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-revaluation-requests') {
    return [
      {
        ...step,
        target: '#coe-revaluation-requests-filters',
        title: 'Revaluation Requests',
        content:
          '• Batch: Select batch\n• Branch: Select branch\n• Semester: Select semester\n• Exam Period: Select exam period\n• Status: Select status\n• Search: Search by name, USN, subject...',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-qp-approvals') {
    return [
      {
        ...step,
        target: '#coe-qp-approvals-card',
        title: 'Question Paper Final Approvals',
        content: 'Review and approve submitted question papers for examinations.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-publish-results') {
    return [
      {
        ...step,
        target: '#coe-publish-results-filters',
        title: 'Filter And Create Upload Batch',
        content:
          '• Batch: Select batch\n• Branch: Select branch\n• Semester: Select semester\n• Exam Period: Select exam period\n• Create Upload Batch: Click to initialize or load results upload form.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-publish-results-reval-makeup') {
    return [
      {
        ...step,
        target: '#coe-publish-results-reval-makeup-filters',
        title: 'Filter And Create Upload Batch',
        content:
          '• Batch: Select batch\n• Branch: Select branch\n• Semester: Select semester\n• Exam Period: Select exam period\n• Request Type: Select request type\n• Create Upload Batch: Click to initialize or load results upload form.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-exam-scheduling') {
    return [
      {
        ...step,
        target: '#coe-exam-scheduling-header',
        title: 'Exam Scheduling',
        content:
          '• Title: Exam Scheduling\n• Info: Manage and schedule examinations across batches and branches.\n• Button: Schedule New Exam',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#coe-profile-card',
        title: 'COE Profile',
        content:
          '• Title: COE Profile\n• Info: Manage your profile and account details\n• Buttons: Edit Profile, Change Password',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
