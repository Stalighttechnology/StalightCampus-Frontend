/**
 * Step transform for the HOD (Head of Department) role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function hodTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-timetable') {
    return [
      {
        ...step,
        target: '#timetable-header-filters-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-faculty-attendance') {
    return [
      {
        ...step,
        target: '#hod-faculty-attendance-header-section',
        title: 'Faculty Attendance',
        content:
          "Monitor today's faculty attendance summary and toggle between Today's Attendance and Attendance Records.",
        placement: isMobile ? step.placement : 'top',
        switchTab: 'today',
      },
      {
        ...step,
        target: '#hod-faculty-attendance-filters',
        title: 'Attendance Records',
        content:
          'Select the Start Date and End Date range, then click Apply Filter to view attendance records or click Export Report to download as PDF.',
        placement: isMobile ? step.placement : 'top',
        switchTab: 'records',
      },
    ];
  }

  if (target === '#sidebar-semesters') {
    return [
      {
        ...step,
        target: '#semester-list-header',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-students') {
    return [
      {
        ...step,
        target: '#add-student-manually-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-student-enrollment') {
    return [
      {
        ...step,
        target: '#elective-enrollment-filters-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-subjects') {
    return [
      {
        ...step,
        target: '#courses-header-filters-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-faculty-assignments') {
    return [
      {
        ...step,
        target: '#add-faculty-assignment-card',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-qp-approvals') {
    return [
      {
        ...step,
        target: '#qp-approvals-header-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-proctors') {
    return [
      {
        ...step,
        target: '#proctors-stats-cards',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  // Mobile-only placement fix for Proctor Assignments header (step 14).
  // On mobile, 'top' clips the tooltip — override to 'bottom' so it stays visible.
  // On desktop, fall through to the default handler (step is used as-is).
  if (target === '#proctors-header-filters-section' && isMobile) {
    return [
      {
        ...step,
        placement: 'bottom' as const,
      },
    ];
  }

  if (target === '#sidebar-low-attendance') {
    return [
      {
        ...step,
        target: '#low-attendance-stats-cards',
        title: 'Low Attendance Overview',
        content:
          'Quickly see Total Students, how many have Low Attendance, and the Average Attendance percentage for the selected section.',
        placement: isMobile ? ('bottom' as const) : ('top' as const),
      },
      {
        ...step,
        target: '#low-attendance-dashboard-header',
        title: 'Low Attendance Management',
        content:
          'Identify students below the attendance threshold. Use the filters to select a semester and section, then export a PDF report or notify students directly.',
        placement: isMobile ? ('bottom' as const) : ('top' as const),
      },
    ];
  }

  if (target === '#sidebar-co-attainment') {
    return [
      {
        ...step,
        target: '#co-attainment-header',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-exam-applications') {
    return [
      {
        ...step,
        target: '#exam-applications-header',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-my-attendance') {
    return [
      {
        ...step,
        target: '#today-attendance-toggle-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-promotion-management') {
    return [
      {
        ...step,
        target: '#hod-promotion-cards-wrapper',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-leaves') {
    return [
      {
        ...step,
        target: '#hod-leave-approvals-header-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-apply-leaves') {
    return [
      {
        ...step,
        target: '#hod-leave-application-form',
        title: 'Leave Application Form',
        content:
          'Fill in the leave details (title, dates, and reason) to submit a new leave request.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#hod-recent-leave-applications',
        title: 'Recent Leave Applications',
        content: 'Track and review the approval status of your submitted leave requests here.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-study-materials') {
    return [
      {
        ...step,
        target: '#hod-study-materials-header-section',
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

  if (target === '#sidebar-hod-announcement-management') {
    return [
      {
        ...step,
        target: '#announcement-header-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-hod-profile') {
    return [
      {
        ...step,
        target: '#hod-profile-header-section',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-notifications') {
    return [
      {
        ...step,
        target: '#hod-notifications-container',
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

  if (target === '#sidebar-syllabus-status') {
    return [
      {
        ...step,
        target: '#hod-syllabus-tracker-header',
        title: 'Syllabus Status Management',
        content: 'Configure and manage week-wise syllabus templates for subjects in your department.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-syllabus-monitor') {
    return [
      {
        ...step,
        target: '#hod-semester-monitor-header',
        title: 'Semester Syllabus Monitoring',
        content: 'Track and monitor week-by-week teaching progress across all subjects in real time.',
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

  if (target === '#sidebar-reimbursements') {
    return [
      {
        ...step,
        target: '#reimbursements-header-section',
        title: 'Reimbursements & Claims',
        content: 'Submit reimbursement claims, track claim approvals, and check statements.',
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

  if (target === '#sidebar-act-as-teacher') {
    return [
      {
        ...step,
        target: '#faculty-stats-cards',
        title: 'Act as Faculty',
        content: 'Switch interface context to review schedules or perform actions as a teacher.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  return null;
}
