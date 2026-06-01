/**
 * Step transform for the Faculty / Teacher role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function facultyTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-timetable') {
    return [
      {
        ...step,
        target: isMobile ? '#timetable-card' : '#timetable-card-header',
        title: 'Weekly Timetable',
        content: 'View your complete class and exam schedule here.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-take-attendance') {
    return [
      {
        ...step,
        target: '#take-attendance-header-section',
        title: 'Take Attendance',
        content:
          'Record student attendance for your classes manually or using the AI attendance mode.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-attendance-records') {
    return [
      {
        ...step,
        target: '#attendance-records-header',
        title: 'Attendance Logs',
        content:
          'Search, view, and export historical student attendance logs for any date range.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-faculty-attendance') {
    return [
      {
        ...step,
        target: '#today-attendance-toggle-section',
        title: "Today's Attendance",
        content: 'Mark your daily attendance check-in as Present or Absent.',
        placement: isMobile ? step.placement : 'top',
      },
      {
        ...step,
        target: '#faculty-attendance-history-header',
        title: 'Attendance History',
        content: 'Review your monthly attendance logs and history.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-upload-marks') {
    return [
      {
        ...step,
        target: '#upload-marks-header-section',
        title: 'Upload Marks',
        content:
          'Select the Subject, Branch, Semester, Section, and Test Type. You can configure and view the Question Paper format details from this active tab.',
        placement: isMobile ? step.placement : 'top',
      },
      {
        ...step,
        target: '#upload-marks-tab-manual',
        title: 'Marks Entry',
        content: 'Marks Entry (to enter grades manually)',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-upload-qp') {
    return [
      {
        ...step,
        target: '#upload-qp-header-section',
        title: 'Upload QP Pattern',
        content:
          '• Select the Branch, Subject, and Test Type.\n• Use these tabs to manage the question paper:\n  - Question Format: configure questions and max marks.\n  - Question Paper: preview and submit for approval.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-co-attainment') {
    return [
      {
        ...step,
        target: '#co-attainment-selectors',
        title: 'Calculate CO Attainment',
        content:
          '• Select a Subject to view and calculate Course Outcome (CO) attainment levels.\n• Configure the Target Threshold percentage (default 60%) to establish student grade targets.\n• Once a subject is selected, overall attainment results and reports will display below.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-statistics') {
    return [
      {
        ...step,
        target: '#statistics-attendance-overview-card',
        title: 'Attendance Overview',
        content: 'View real-time line charts for student attendance tracking.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#statistics-average-marks-card',
        title: 'Average Marks',
        content: 'View interactive bar charts for average marks analysis.',
        placement: isMobile ? step.placement : 'left',
      },
      {
        ...step,
        target: '#statistics-table-header',
        title: 'Proctor Students & Export PDF',
        content:
          '• Proctor Students: Review complete proctor student details in the summary table.\n• Export PDF: Use this button to download a comprehensive proctor student statistics report.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-faculty-announcement-management') {
    return [
      {
        ...step,
        target: '#announcement-header-section',
        title: 'Announcements for Proctor Students',
        content:
          '• Announcements for Proctor Students: View and manage announcements for your proctor group.\n• New Announcement: Click this button to create a new announcement.\n• My Announcements: View all the announcements that you have created.\n• Received: View the announcements that you have received.\n• Show Archive: Toggle this button to show or hide expired/archived announcements.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-faculty-profile') {
    return [
      {
        ...step,
        target: '#faculty-profile-header-section',
        title: 'Faculty Profile',
        content:
          '• Faculty Profile: Manage your profile and academic details.\n• Edit Profile: Click this button to modify your details.\n• Change Password: Click this button to update your account password.',
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

  if (target === '#sidebar-student-leave') {
    return [
      {
        ...step,
        target: '#manage-student-leave-header-section',
        title: 'Leave Approvals',
        content:
          '• Search student: Search for student leave applications by name or USN.\n• Filter status: Filter applications by Pending, Approved, or Rejected.\n• Actions: Review the details, view the leave reasons, and approve or reject requests directly.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-faculty-assignments') {
    return [
      {
        ...step,
        target: '#faculty-assignments-header',
        title: 'Assignment Management',
        content: 'Create, track, and grade student assignments with a unified view.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-exam-applications') {
    return [
      {
        ...step,
        target: '#exam-applications-header',
        title: 'Exam Applications',
        content: 'Apply or review exam applications for proctored students.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-revaluation') {
    return [
      {
        ...step,
        target: '#revaluation-header',
        title: 'Exam Revaluation & Photocopy',
        content: 'Apply for revaluation of exam papers or request photocopies.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-makeupexam') {
    return [
      {
        ...step,
        target: '#makeupexam-header',
        title: 'Makeup Exam Requests',
        content: 'Submit or review makeup exam requests for students.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-proctor-students') {
    return [
      {
        ...step,
        target: '#proctor-students-header',
        title: 'Proctor Students',
        content: 'View and export proctor student details.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-scan-student-info') {
    return [
      {
        ...step,
        target: '#hod-search-student-card',
        title: 'Search Student Profile',
        content: 'Search student information by entering USN or using scanners.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-study-materials') {
    return [
      {
        ...step,
        target: '#study-materials-header',
        title: 'Study Materials',
        content: 'View and upload course-related study materials for your assigned subjects.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-schedule-class') {
    return [
      {
        ...step,
        target: '#schedule-class-header',
        title: 'Schedule a New Class',
        content: 'Schedule online/offline classes for your assigned subjects.',
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

  return null;
}
