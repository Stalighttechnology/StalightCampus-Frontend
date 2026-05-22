import { Step } from 'react-joyride';

export const hmsTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your HMS dashboard to help you manage health and wellness services.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'Health Services Overview',
    content:
      'View key health metrics, appointments, and medical services utilization.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hms',
  },
  {
    target: '#admin-search-bar',
    title: 'Search Records',
    content:
      'Quickly find patient records and health service information.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hms',
  },
  {
    target: '#admin-charts',
    title: 'Health Analytics',
    content:
      'Analyze health trends, appointment schedules, and service utilization patterns.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/hms',
  },
  {
    target: '#sidebar-reports',
    title: 'Generate Reports',
    content:
      'Create comprehensive health services reports and medical statistics.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/reports',
  },
];

