import { Step } from 'react-joyride';

export const studentTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content: 'Let\'s show you around your student portal and help you get started.',
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
    target: '#sidebar-attendance',
    title: 'Track Attendance',
    content:
      'Click here to view and manage your attendance records across all subjects.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/attendance',
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
    target: '#sidebar-marks',
    title: 'Check Your Marks',
    content:
      'Review all your exam scores, grades, and performance metrics in one place.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/marks',
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
