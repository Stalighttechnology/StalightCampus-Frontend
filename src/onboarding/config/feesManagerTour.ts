import { Step } from 'react-joyride';

export const feesManagerTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your Fees Manager dashboard to help you manage financial operations.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'Financial Overview',
    content:
      'View key financial metrics including total collections, pending payments, and revenue.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/fees-manager',
  },
  {
    target: '#admin-search-bar',
    title: 'Search Students',
    content:
      'Quickly find student records and their fee payment status.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/fees-manager',
  },
  {
    target: '#admin-charts',
    title: 'Financial Analytics',
    content:
      'Track payment trends, fee collection patterns, and financial forecasts.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/fees-manager',
  },
  {
    target: '#sidebar-reports',
    title: 'Generate Reports',
    content:
      'Create detailed financial reports and fee collection summaries.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/fees-manager/reports',
  },
];

