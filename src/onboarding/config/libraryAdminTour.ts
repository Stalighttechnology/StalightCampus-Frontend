import { Step } from 'react-joyride';

export const libraryAdminTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Stalight Library!',
    content:
      'Let\'s guide you through the Library Admin portal to manage book catalogs, track student borrowings, and process fines.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#sidebar-dashboard',
    title: 'Library Overview',
    content:
      'Monitor key statistics such as total books, active borrow counts, overall circulation, and overdue fines at a glance.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin',
  },
  {
    target: '#sidebar-library-books',
    title: 'Book Catalog',
    content:
      'Add and manage library books, assign ISBNs, organize shelves, view barcode details, and export titles as PDF.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/library-books',
  },
  {
    target: '#sidebar-library-circulation',
    title: 'Active Circulation',
    content:
      'Track checked-out books, view borrower information, manage due dates, and renew return deadlines.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/library-circulation',
  },
  {
    target: '#sidebar-library-fines',
    title: 'Fine Management',
    content:
      'Log overdue fines collected from borrowers, settle fine payments, and manage pending statuses.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/library-fines',
  },
  {
    target: '#sidebar-apply-leave',
    title: 'Apply Leave',
    content:
      'Submit leave requests and track your application history.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/apply-leave',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile Settings',
    content:
      'Manage your personal details, credentials, and settings.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/profile',
  },
];
