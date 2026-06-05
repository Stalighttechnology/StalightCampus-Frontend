/**
 * Step transform for the Admin / Principal role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function adminTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-enroll-user') {
    return [
      {
        ...step,
        target: '#enroll-user-header',
        title: 'Enroll Staff',
        content:
          'Fill out this form to enroll new HODs, faculty members, Deans, COE, or Fees Managers.',
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
        content:
          'View and manage all institutional branches, assign department heads, and export records.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-bulk-upload') {
    return [
      {
        ...step,
        target: '#bulk-upload-form-section',
        title: 'Bulk Upload Faculty',
        content:
          'Upload CSV or Excel files to bulk enroll faculty members into the system.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-teacher-assignments') {
    return [
      {
        ...step,
        target: '#teacher-assignments-header-section',
        title: 'Faculty Assignments',
        content: 'Assign primary branches and departments to faculty members.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-qp-approvals') {
    return [
      {
        ...step,
        target: '#qp-approvals-header-section',
        title: 'Question Paper Approvals',
        content:
          'Review and approve question papers pending administrative oversight.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-batches') {
    return [
      {
        ...step,
        target: '#add-new-batch-card',
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

  if (target === '#sidebar-hod-leaves') {
    return [
      {
        ...step,
        target: '#hod-leaves-header-section',
        title: 'HOD Leave Requests',
        content:
          'Review and manage leave applications submitted by department heads.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-department-admin-leaves') {
    return [
      {
        ...step,
        target: '#department-admin-leaves-header-section',
        title: 'Leave Requests',
        content:
          "Review and approve leave requests from Department",
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-hod-attendance') {
    return [
      {
        ...step,
        target: '#hod-attendance-stats-grid',
        title: "Today's HOD Attendance",
        content:
          "View today's attendance snapshot — total HODs, present, absent, and unmarked counts at a glance.",
        placement: isMobile ? step.placement : 'top',
        switchTab: 'today',
      },
      {
        ...step,
        target: '#hod-attendance-records-section',
        title: 'Attendance Records Filter',
        content:
          'Select a start and end date, then apply the filter to view historical HOD attendance records.',
        placement: isMobile ? step.placement : 'top',
        switchTab: 'records',
      },
    ];
  }

  if (target === '#sidebar-faculty-attendance') {
    return [
      {
        ...step,
        target: '#admin-faculty-attendance-header-select',
        title: 'Select Branch',
        content:
          'Choose a branch from the dropdown to load and view faculty attendance data for that department.',
        placement: isMobile ? step.placement : 'bottom',
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

  if (target === '#sidebar-users') {
    return [
      {
        ...step,
        target: '#users-management-header-filters',
        title: 'Users Directory',
        content: 'View, edit, or deactivate any user profile within the institution.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-student-leave') {
    return [
      {
        ...step,
        target: '#manage-student-leave-header-section',
        title: 'Manage Student Leave',
        content:
          '• Search student: Search for student leave applications by name or USN.\n• Filter status: Filter applications by Pending, Approved, or Rejected.\n• Actions: Review the details, view the leave reasons, and approve or reject requests directly.',
        placement: isMobile ? step.placement : 'top',
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
        target: '#admin-profile-header',
        title: 'Admin Profile Information',
        content: 'Manage your profile details, change passwords, and configure settings.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  return null;
}
