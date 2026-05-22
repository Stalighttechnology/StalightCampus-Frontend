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
    target: '#feesmanager-stats-grid',
    title: 'Financial Overview',
    content:
      'View key financial metrics including total collections, pending payments, and revenue.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/fees-manager',
  },
  {
    target: '#feesmanager-charts-container',
    title: 'Financial Analytics',
    content:
      'Track payment trends, fee collection patterns, and financial forecasts.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/fees-manager',
  },
  {
    target: '#sidebar-invoices',
    title: 'Invoice Management',
    content:
      'Track and manage student fee payments, collections, and issue invoices.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/fees-manager/invoices',
  },
  {
    target: '#sidebar-payments',
    title: 'Payment Monitoring',
    content:
      'Track and manage all fee payments, methods, and transaction history.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/fees-manager/payments',
  },
];

