import { Step } from 'react-joyride';

export const transportAdminTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Stalight Campus!',
    content:
      'Let\'s guide you through the Transport Admin portal to manage fleet, routes, drivers, and allocations.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#sidebar-dashboard',
    title: 'Transport Overview',
    content:
      'Monitor key fleet statistics, active routes, drivers, and view live active trip statuses at a glance.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin',
  },
  {
    target: '#sidebar-transport-buses',
    title: 'Fleet Management',
    content:
      'Manage school buses, add new buses, track capacities, status, and export the fleet list as PDF.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/transport-buses',
  },
  {
    target: '#sidebar-transport-routes',
    title: 'Routes & Stops',
    content:
      'Configure bus routes, start and end points, morning and evening timings, link buses, and manage stops.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/transport-routes',
  },
  {
    target: '#sidebar-transport-drivers',
    title: 'Driver Assignments',
    content:
      'Enroll transport drivers and allocate them to buses and routes.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/transport-drivers',
  },
  {
    target: '#sidebar-transport-allocations',
    title: 'Student Allocations',
    content:
      'Allocate students to specific routes and boarding stops, search allocations, and filter records.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/transport-allocations',
  },
  {
    target: '#sidebar-transport-tracking',
    title: 'Live Tracking',
    content:
      'Track active trips in real time with integrated live GPS maps.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/transport-tracking',
  },
  {
    target: '#sidebar-transport-incidents',
    title: 'Complaints & Incidents',
    content:
      'Manage issues, breakdowns, and complaints reported by drivers or users, and log resolutions.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/transport-incidents',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile Settings',
    content:
      'Manage your personal details, credentials, and settings.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/transport-admin/profile',
  },
];
