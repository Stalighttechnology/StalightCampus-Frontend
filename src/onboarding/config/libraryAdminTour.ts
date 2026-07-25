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
    target: '#sidebar-announcements',
    title: 'Announcements',
    content:
      'View system-wide news, library notices, and announcements.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/announcements',
  },
  {
    target: '#sidebar-library-books',
    title: 'Books Catalog',
    content:
      'Add and manage library books, assign ISBNs, organize shelves, view barcode details, and export titles as PDF.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/library-books',
  },
  {
    target: '#sidebar-library-circulation',
    title: 'Circulation',
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
    target: '#sidebar-schedule-meeting',
    title: 'Meetings',
    content:
      'Schedule and organize meetings across library staff and campus roles.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/schedule-meeting',
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
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content:
      'Check your daily attendance logs and records.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/my-attendance',
  },
  {
    target: '#sidebar-holiday-calendar',
    title: 'Calendar',
    content:
      'View institutional holiday calendar and scheduled events.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/holiday-calendar',
  },
  {
    target: '#sidebar-reimbursements',
    title: 'Reimbursements & Claims',
    content:
      'Submit and monitor status of expense reimbursement claims.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/reimbursements',
  },
  {
    target: '#sidebar-my-payroll',
    title: 'My Salary & Payroll',
    content:
      'View your monthly salary statements, pay slips, and statutory deductions.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/library-admin/my-payroll',
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
