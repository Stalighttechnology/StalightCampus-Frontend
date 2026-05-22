import { Step } from 'react-joyride';

export const deanTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your Dean dashboard to help you oversee academic and institutional operations.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#dean-stats-grid',
    title: 'Institution Overview',
    content:
      'Get a comprehensive view of key institutional metrics and performance indicators.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#dean-charts-container',
    title: 'Academic Analytics',
    content:
      'Analyze trends in academic performance, enrollment, and institutional health.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#sidebar-attendance',
    title: 'Today\'s Attendance',
    content:
      'View real-time student attendance percentages and snapshots across departments.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/attendance',
  },
  {
    target: '#sidebar-attendance-filters',
    title: 'Attendance Filters',
    content:
      'Filter and analyze attendance data historically by date, branch, and section.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/attendance-filters',
  },
  {
    target: '#sidebar-finance',
    title: 'Finance',
    content:
      'Monitor institutional fee collections, outstanding amounts, and payment trends.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/finance',
  },
];

