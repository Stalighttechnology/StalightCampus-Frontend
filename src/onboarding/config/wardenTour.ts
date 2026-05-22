import { Step } from 'react-joyride';

export const wardenTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your Warden dashboard to help you manage hostel operations.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'Hostel Overview',
    content:
      'View occupancy status, allocations, and key hostel management metrics.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/warden',
  },
  {
    target: '#admin-charts',
    title: 'Occupancy Analytics',
    content:
      'Monitor hostel utilization, room allocations, and resident management statistics.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/warden',
  },
  {
    target: '#sidebar-users-management',
    title: 'Resident Management',
    content:
      'Manage hostel resident profiles, allocations, and permissions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/users-management',
  },
  {
    target: '#sidebar-reports',
    title: 'Generate Reports',
    content:
      'Create reports on occupancy, complaints, and hostel operations.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/reports',
  },
];

