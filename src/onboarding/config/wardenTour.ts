import { Step } from 'react-joyride';

export const wardenTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to StalightCampus!',
    content:
      'Let\'s show you around your Warden dashboard to help you manage hostel operations.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#warden-stats-grid',
    title: 'Hostel Overview',
    content:
      'View occupancy status, allocations, and key hostel management metrics.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/warden',
  },
  {
    target: '#warden-charts-container',
    title: 'Occupancy Analytics',
    content:
      'Monitor hostel utilization, room allocations, and resident management statistics.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/warden',
  },
  {
    target: '#sidebar-residents',
    title: 'Resident Management',
    content:
      'Manage hostel resident profiles, allocations, and permissions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/residents',
  },
  {
    target: '#sidebar-issues',
    title: 'Issue Tracking',
    content:
      'Track and manage complaints, maintenance issues, and resident tickets.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/issues',
  },
  {
    target: '#sidebar-visitor-logs',
    title: 'Visitor Logs',
    content:
      'Monitor visitor logs, register new visitors, and export visitor records as PDF.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/visitor_logs',
  },
  {
    target: '#sidebar-apply-leave',
    title: 'Apply Leave',
    content:
      'Submit leave requests and track your application history.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/apply-leave',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile',
    content:
      'Manage your account details, edit contact information, and change passwords.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/profile',
  },
];

