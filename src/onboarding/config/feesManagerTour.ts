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
    disableBeacon: true,
    route: '/fees-manager',
  },
  {
    target: '#feesmanager-charts-container',
    title: 'Financial Analytics',
    content:
      'Track payment trends, fee collection patterns, and financial forecasts.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager',
    disableScrolling: true,
  },
  {
    target: '#feesmanager-recent-transactions',
    title: 'Recent Transactions',
    content:
      'View the most recent successful fee collections and transaction details.',
    placement: 'top' as const,
    disableBeacon: true,
    route: '/fees-manager',
  },
  {
    target: '#feesmanager-action-cards',
    title: 'Quick Actions',
    content:
      'Use these quick links to navigate to key pages such as templates, assignments, settings, and reports.',
    placement: 'top' as const,
    disableBeacon: true,
    route: '/fees-manager',
  },
  {
    target: '#sidebar-components',
    title: 'Fee Components',
    content:
      'Manage basic fee building blocks such as Tuition Fee, Library Fee, or Transport Fee.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/components',
  },
  {
    target: '#sidebar-templates',
    title: 'Fee Templates',
    content:
      'Combine multiple fee components into reusable templates for batches and semesters.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/templates',
  },
  {
    target: '#sidebar-assignments',
    title: 'Fee Assignments',
    content:
      'Structure student cohorts and assign templates to selected students in bulk.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/assignments',
  },
  {
    target: '#sidebar-individual-fees',
    title: 'Individual Fees',
    content:
      'Review, manage, or delete specific student fee assignments.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/individual-fees',
  },
  {
    target: '#sidebar-bulk-assignment',
    title: 'Bulk Assignment',
    content:
      'Mass assign fee templates to entire batches and branches with duplicate checks.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/bulk-assignment',
  },
  {
    target: '#sidebar-invoices',
    title: 'Invoice Management',
    content:
      'Track and manage student fee payments, collections, and issue invoices.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/invoices',
  },
  {
    target: '#sidebar-payments',
    title: 'Payment Monitoring',
    content:
      'Track and manage all fee payments, methods, and transaction history.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/payments',
  },
  {
    target: '#sidebar-payment-settings',
    title: 'Payment Settings',
    content:
      'Configure Razorpay API Keys to enable seamless online fee payments for students.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/payment-settings',
  },
  {
    target: '#sidebar-leave',
    title: 'Leave Management',
    content:
      'Apply for leaves and track your submitted leave requests.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/leave',
  },
  {
    target: '#sidebar-reports',
    title: 'Attendance Reports',
    content:
      'Monitor and generate staff attendance audit reports and download them as PDF/Excel.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/reports',
  },
  {
    target: '#sidebar-student-reports',
    title: 'Student Fee Reports',
    content:
      'Access individual student fee ledgers, cohort statistics, and send payment reminders.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/student-reports',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile Settings',
    content:
      'Manage your personal details, view login activity, or update your password.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/fees-manager/profile',
  },
];
