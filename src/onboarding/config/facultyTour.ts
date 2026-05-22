import { Step } from 'react-joyride';

export const facultyTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
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
    target: '#faculty-charts',
    title: 'Performance Charts',
    content:
      'Analyze student performance trends and class engagement through interactive charts.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/faculty/dashboard',
  },
  {
    target: '#faculty-live-timer',
    title: 'Live Session Timer',
    content:
      'Monitor your active live sessions with real-time timing and student participation.',
    placement: 'left' as const,
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
    target: '#sidebar-timetable',
    title: 'View Timetable',
    content:
      'Check your complete teaching schedule, class timings, and exam supervision duties.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/faculty/timetable',
  },
];

