import { Step } from 'react-joyride';

export const coeTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your COE dashboard to help you manage academic quality assurance.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'Quality Metrics',
    content:
      'View key quality assurance metrics and compliance indicators across the institution.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
  },
  {
    target: '#admin-charts',
    title: 'Compliance Analytics',
    content:
      'Monitor compliance with academic standards and quality benchmarks.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
  },
  {
    target: '#sidebar-reports',
    title: 'Generate Reports',
    content:
      'Create comprehensive academic quality reports and compliance documentation.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/reports',
  },
  {
    target: '#sidebar-users-management',
    title: 'User Management',
    content:
      'Manage user roles and permissions for quality assurance activities.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/users-management',
  },
];

