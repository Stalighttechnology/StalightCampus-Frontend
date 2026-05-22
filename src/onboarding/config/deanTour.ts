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
    target: '#admin-stats-grid',
    title: 'Institution Overview',
    content:
      'Get a comprehensive view of key institutional metrics and performance indicators.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#admin-charts',
    title: 'Academic Analytics',
    content:
      'Analyze trends in academic performance, enrollment, and institutional health.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#sidebar-reports',
    title: 'Generate Reports',
    content:
      'Create executive reports on academic performance and institutional operations.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/reports',
  },
  {
    target: '#sidebar-users-management',
    title: 'User Management',
    content:
      'Manage administrators, faculty, and staff roles across the institution.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/users-management',
  },
];

