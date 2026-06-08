import { Step } from 'react-joyride';

export const facultyTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to StalightCampus!',
    content:
      'Let\'s show you around your faculty dashboard and help you get the most out of your teaching tools.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#faculty-stats-cards',
    title: 'Quick Statistics',
    content:
      'View key metrics about your classes, students, and attendance all at a glance.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/faculty/dashboard',
  },
  {
    target: '#faculty-charts-header',
    title: 'Performance Charts',
    content:
      'Analyze student performance trends and class engagement through interactive charts.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/faculty/dashboard',
  },
  {
    target: '#live-session-timer-header',
    title: 'Live Session Timer',
    content:
      'Monitor your active live sessions with real-time timing and student participation.',
    placement: 'left' as const,
    disableBeacon: false,
    route: '/faculty/dashboard',
  },
  {
    target: '#faculty-action-cards',
    title: 'Quick Actions',
    content:
      'Use these shortcuts to quickly perform tasks like marking attendance, scheduling classes, mentoring students, and viewing reports.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/faculty/dashboard',
  },
  {
    target: '#sidebar-take-attendance',
    title: 'Take Attendance',
    content:
      'Mark attendance for your students during or after class sessions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/take-attendance',
  },
  {
    target: '#sidebar-attendance-records',
    title: 'Attendance Records',
    content:
      'Access and review historical student attendance logs and generated records.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/attendance-records',
  },
  {
    target: '#sidebar-faculty-attendance',
    title: 'My Attendance',
    content:
      'Mark your own daily attendance and check your personal attendance history.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/faculty-attendance',
  },
  {
    target: '#sidebar-upload-marks',
    title: 'Upload Marks',
    content:
      'Record and manage academic internal assessment marks for your students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/upload-marks',
  },
  {
    target: '#sidebar-upload-qp',
    title: 'Upload Question Papers',
    content:
      'Upload class tests or end-of-semester question papers for review and printing.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/upload-qp',
  },
  {
    target: '#sidebar-co-attainment',
    title: 'CO Attainment',
    content:
      'Calculate and analyze Course Outcome (CO) attainment levels for your courses.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/co-attainment',
  },
  {
    target: '#sidebar-statistics',
    title: 'Generate Statistics',
    content:
      'Generate and view academic statistics, charts, and reports for your proctor students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/statistics',
  },
  {
    target: '#sidebar-apply-leave',
    title: 'Apply Leave',
    content:
      'Apply for leave requests and track your leave approvals status.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/apply-leave',
  },
  {
    target: '#sidebar-student-leave',
    title: 'Manage Student Leave',
    content:
      'Review and approve or reject leave requests submitted by your proctor students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/student-leave',
  },
  {
    target: '#sidebar-timetable',
    title: 'View Timetable',
    content:
      'Check your complete teaching schedule, class timings, and exam supervision duties.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/timetable',
  },
  {
    target: '#sidebar-faculty-assignments',
    title: 'Assignments',
    content: 'Manage and grade student assignment submissions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/assignments',
  },
  {
    target: '#sidebar-exam-applications',
    title: 'Exam Applications',
    content: 'Review and manage exam registration applications.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/exam-applications',
  },

  {
    target: '#sidebar-proctor-students',
    title: 'Proctor Students',
    content: 'Access records and view profiles of students assigned to you as proctored mentees.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/proctor-students',
  },
  {
    target: '#sidebar-scan-student-info',
    title: 'Scan for Student Info',
    content: 'Quickly search and lookup detailed academic profile of any student.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/scan-student-info',
  },
  {
    target: '#sidebar-study-materials',
    title: 'Study Material',
    content: 'Upload and distribute syllabus materials and documents for your subjects.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/study-materials',
  },
  {
    target: '#sidebar-schedule-class',
    title: 'Schedule Class',
    content: 'Create and schedule extra classes or makeup sessions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/schedule-class',
  },
  {
    target: '#sidebar-faculty-announcement-management',
    title: 'Student Announcements',
    content:
      'Broadcast updates, event notices, or academic news directly to your proctor students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/announcements',
  },
  {
    target: '#faculty-syllabus-tracker-header',
    title: 'Syllabus Tracker',
    content: 'Track weekly teaching progress based on department master templates.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/faculty/syllabus-status',
  },
  {
    target: '#sidebar-faculty-profile',
    title: 'Profile Management',
    content:
      'Manage your personal details, office hours, designation, and security settings.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/faculty-profile',
  },
];
