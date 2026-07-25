import { Step } from 'react-joyride';

export const counsellorTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Counsellor Portal!',
    content:
      'Let\'s show you around your Counsellor portal to help you manage student lead enquiries and track follow-ups.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admission-stats-grid',
    title: 'Admission Overview',
    content:
      'Monitor pipeline health metrics including total enquiries, active applications, confirmed admissions, and follow-up tasks.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/counsellor',
  },
  {
    target: '#admission-charts-container',
    title: 'Analytics & Pipeline Visualizer',
    content:
      'Analyze student distribution across pipeline stages and course preference breakdowns using interactive charts.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/counsellor',
  },
  {
    target: '#sidebar-admission-enquiries',
    title: 'Enquiry Leads Pipeline',
    content:
      'Track prospective student leads and transition their status using a drag-and-drop Kanban pipeline.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/counsellor/admission-enquiries',
  },
  {
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content:
      'Check your personal attendance logs and administrative schedule tracking.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/counsellor/my-attendance',
  },
  {
    target: '#sidebar-holiday-calendar',
    title: 'Calendar',
    content:
      'View institutional holiday calendar and scheduled events.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/counsellor/holiday-calendar',
  },
  {
    target: '#sidebar-my-payroll',
    title: 'My Salary & Payroll',
    content:
      'View your monthly salary statements, pay slips, and compensation details.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/counsellor/my-payroll',
  },
  {
    target: '#sidebar-profile',
    title: 'Account Settings',
    content:
      'Manage profile details, configure contact data, and manage account security credentials.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/counsellor/profile',
  },
];
