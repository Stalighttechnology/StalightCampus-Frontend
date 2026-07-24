import { Step } from 'react-joyride';

export const studentTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to StalightCampus!',
    content: "Let's show you around your student portal and help you get started.",
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#student-schedule-card',
    title: "Today's Schedule",
    content:
      'Stay on top of your classes with your daily schedule displayed right here. See all your upcoming sessions at a glance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dashboard',
  },
  {
    target: '#student-attendance-card',
    title: 'Your Attendance Rating',
    content:
      'Track your attendance record here. Maintaining good attendance is essential for academic success.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dashboard',
  },
  {
    target: '#student-timeline-card',
    title: 'Live Session Timeline',
    content:
      'View ongoing and upcoming live sessions in real-time. Click to join any active session.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dashboard',
  },
  {
    target: '#student-performance-card',
    title: 'Performance Overview',
    content:
      'Monitor your academic performance with this comprehensive overview of your marks and progress.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/dashboard',
  },
  {
    target: '#sidebar-timetable',
    title: 'View Your Timetable',
    content:
      'Check your complete class schedule, exam timings, and important academic dates.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/timetable',
  },
  {
    target: '#sidebar-class-schedule',
    title: 'Class Schedule',
    content:
      'View complete and detailed daily/weekly schedule and location of all lectures.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/class-schedule',
  },
  {
    target: '#sidebar-attendance',
    title: 'Track Attendance',
    content:
      'Click here to view and manage your attendance records across all subjects.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/attendance',
  },
  {
    target: '#sidebar-student-study-material',
    title: 'Access Study Materials',
    content:
      'Find lecture notes, reference books, and class materials uploaded by your faculty.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/student-study-material',
  },
  {
    target: '#sidebar-student-assignment',
    title: 'Manage Assignments',
    content:
      'View pending assignments, submit your coursework, and check grades or feedback.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/student-assignment',
  },
  {
    target: '#sidebar-student-syllabus',
    title: 'Syllabus Tracker',
    content: 'Track the week-by-week syllabus completion status of all your enrolled courses.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/student-syllabus',
  },
  {
    target: '#sidebar-marks',
    title: 'Check Your Marks',
    content:
      'Review all your exam scores, grades, and performance metrics in one place.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/marks',
  },
  {
    target: '#sidebar-revaluation',
    title: 'Revaluation Requests',
    content:
      'Apply for marks revaluation or photocopy of answer scripts for your semester exams.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/revaluation',
  },
  {
    target: '#sidebar-makeupexam',
    title: 'Makeup Exam Requests',
    content:
      'Apply for makeup or remedial exams if you missed a regular exam due to valid reasons.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/makeupexam',
  },
  {
    target: '#sidebar-fees',
    title: 'Manage Fees',
    content:
      'View your fee details, payment status, and make online payments securely.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/fees',
  },
  {
    target: '#sidebar-announcements',
    title: 'View Announcements',
    content:
      'Stay updated with the latest college notices, event details, and official circulars.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/announcements',
  },
  {
    target: '#sidebar-library',
    title: 'Library Services',
    content:
      'Search catalog, check borrowed books list, track return dates, and view pending fines.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/library',
  },
  {
    target: '#sidebar-student-hostel-details',
    title: 'Hostel Details',
    content:
      'View your hostel room allocation, mess details, warden contact information, and rules.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/student-hostel-details',
  },
  {
    target: '#sidebar-transportation',
    title: 'Transportation Info',
    content:
      'Track your assigned college bus route, view stop details, schedules, and driver contacts.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/transportation',
  },
  {
    target: '#sidebar-leave-request',
    title: 'Apply for Leave',
    content:
      'Submit leave requests, track their status, and view your leave balance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/leave-request',
  },
  {
    target: '#sidebar-profile',
    title: 'Manage Your Profile',
    content:
      'Update your contact details, personal details, academic details, and set up your face recognition for attendance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/profile',
  },
];
