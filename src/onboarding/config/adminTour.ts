import { Step } from 'react-joyride';

export const adminTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your admin dashboard to help you manage the entire institution.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'System Statistics',
    content:
      'Monitor overall system health and key institutional metrics at a glance.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#admin-search-bar',
    title: 'Global Search',
    content:
      'Quickly find users, courses, and resources across the entire system.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#admin-charts',
    title: 'Analytics Dashboard',
    content:
      'View comprehensive analytics and reports about institutional performance.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#sidebar-enroll-user',
    title: 'Enroll Users',
    content:
      'Add and manage student and faculty enrollments across the institution.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/enroll-user',
  },
  {
    target: '#sidebar-branch-management',
    title: 'Branch Management',
    content:
      'Manage different branches or campuses and their respective configurations.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/branch-management',
  },
];

