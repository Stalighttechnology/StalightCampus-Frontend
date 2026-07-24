/**
 * Step transform for the Student role.
 * Maps sidebar targets to the actual DOM elements highlighted on each page.
 *
 * Returns an array of transformed steps if the target is handled, or null to fall
 * through to the shared default handler in useTutorial.ts.
 */
export function studentTransform(step: any, isMobile: boolean): any[] | null {
  const target = step.target;

  if (target === '#sidebar-attendance') {
    return [
      {
        ...step,
        target: '#attendance-trends-card',
        title: 'Attendance Trends',
        content: 'View your monthly attendance trends and tracking here.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#attendance-overview-card',
        title: 'Attendance Overview',
        content: 'Check your overall attendance statistics and percentage.',
        placement: isMobile ? step.placement : 'left',
      },
      {
        ...step,
        target: isMobile ? '#attendance-subject-card' : '#attendance-subject-card-header',
        title: 'Subject-wise Attendance',
        content: 'Review detailed attendance records for each subject.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-timetable') {
    return [
      {
        ...step,
        target: '#timetable-card-header',
        title: 'Weekly Timetable',
        content: 'View your complete class and exam schedule here.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-student-syllabus') {
    return [
      {
        ...step,
        target: '#student-syllabus-header',
        title: 'Syllabus Tracker',
        content: 'Track the week-by-week syllabus completion status of all your enrolled courses.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-marks') {
    return [
      {
        ...step,
        target: '#marks-overview-card-header',
        title: 'Performance Overview',
        content: 'Track your internal assessment/test marks and averages.',
        placement: isMobile ? step.placement : 'top',
      },
      {
        ...step,
        target: '#marks-table-card',
        title: 'Subject-wise Marks',
        content: 'Detailed IA marks and grade breakdown for each subject.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-fees') {
    return [
      {
        ...step,
        target: '#fees-details-card',
        title: 'Student Details',
        content: 'Check your student profile and fee allocation status.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: '#fees-summary-card',
        title: 'Fee Summary',
        content: 'See your total, paid, and remaining fees at a glance.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: isMobile ? '#fees-invoices-card' : '#fees-invoices-card-header',
        title: 'Fee Invoices',
        content: 'View and pay individual semester fee invoices.',
        placement: isMobile ? step.placement : 'bottom',
      },
      {
        ...step,
        target: isMobile ? '#fees-history-card' : '#fees-history-card-header',
        title: 'Payment History',
        content: 'Check your transaction history and download payment receipts.',
        placement: isMobile ? step.placement : 'bottom',
      },
    ];
  }

  if (target === '#sidebar-leave-request') {
    return [
      {
        ...step,
        target: '#leave-form-card',
        title: 'Apply for Leave',
        content: 'Fill out and submit leave requests to your department.',
        placement: isMobile ? step.placement : 'right',
      },
      {
        ...step,
        target: '#leave-status-list',
        title: 'Leave Status',
        content: 'Track and monitor the status of your submitted leave requests.',
        placement: isMobile ? step.placement : 'left',
      },
    ];
  }

  if (target === '#sidebar-student-study-material') {
    return [
      {
        ...step,
        target: '#study-materials-header',
        title: 'Study Materials',
        content: 'Access and download study materials shared by your professors.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-student-assignment') {
    return [
      {
        ...step,
        target: '#student-assignments-header-stats',
        title: 'Assignments',
        content: 'Track, view, and submit your academic assignments and projects.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-revaluation') {
    return [
      {
        ...step,
        target: '#revaluation-header',
        title: 'Exam Revaluation',
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
        title: 'Makeup Exams',
        content: 'Submit makeup exam requests and check status here.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-student-hostel-details') {
    return [
      {
        ...step,
        target: '#hostel-details-header',
        title: 'Hostel Details',
        content: 'View your hostel room allocation, mess menu, and report issues.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-transportation') {
    return [
      {
        ...step,
        target: '#transport-header',
        title: 'Transportation',
        content: 'View bus details, track live location, and submit complaints.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-library') {
    return [
      {
        ...step,
        target: '#library-header',
        title: 'Library',
        content: 'Search book catalog, track borrows, and view unpaid fines.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-announcements') {
    return [
      {
        ...step,
        target: '#announcements-header-stats',
        title: 'Announcements',
        content: 'Stay updated with the latest news, notices, and alerts from campus.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-class-schedule') {
    return [
      {
        ...step,
        target: '#class-schedule-header',
        title: 'Class Schedule',
        content: 'View your live and upcoming sessions. Join online sessions directly.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  if (target === '#sidebar-profile') {
    return [
      {
        ...step,
        target: '#student-profile-header',
        title: 'Manage Your Profile',
        content:
          'Update your contact details, personal details, academic details, and set up your face recognition for attendance.',
        placement: isMobile ? step.placement : 'top',
      },
    ];
  }

  return null;
}
