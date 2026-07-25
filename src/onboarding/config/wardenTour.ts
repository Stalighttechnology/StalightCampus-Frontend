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
    target: '#sidebar-student-meals',
    title: "Today's Menu",
    content:
      "Check today's scheduled meals and mess menu timings for residents.",
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/student-meals',
  },
  {
    target: '#sidebar-menu-management',
    title: 'Mess Menu Management',
    content:
      'Plan weekly mess meal menus and schedule special dining menus.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/menu-management',
  },
  {
    target: '#sidebar-gate-passes',
    title: 'Gate Pass Requests',
    content:
      'Review and process student out-pass and gate pass requests.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/gate-passes',
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
    target: '#sidebar-announcement-management',
    title: 'Announcement Management',
    content:
      'Create and broadcast announcements to hostel residents and staff.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/announcement-management',
  },
  {
    target: '#sidebar-schedule-meeting',
    title: 'Meetings',
    content:
      'Schedule and organize administrative meetings.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/schedule-meeting',
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
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content:
      'Check your personal daily attendance logs and records.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/my-attendance',
  },
  {
    target: '#sidebar-holiday-calendar',
    title: 'Calendar',
    content:
      'View institutional holiday calendar and scheduled events.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/holiday-calendar',
  },
  {
    target: '#sidebar-reimbursements',
    title: 'Reimbursements & Claims',
    content:
      'Submit and monitor status of expense reimbursement claims.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/reimbursements',
  },
  {
    target: '#sidebar-my-payroll',
    title: 'My Salary & Payroll',
    content:
      'View your monthly salary statements, pay slips, and statutory deductions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/warden/my-payroll',
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
