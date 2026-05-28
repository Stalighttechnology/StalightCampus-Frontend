import { Step } from 'react-joyride';

export const orgAdminTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome, Organization Admin!',
    content:
      'Let\'s take a quick tour to guide you through managing your institution, users, enrollments, and billing settings.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'System Statistics',
    content:
      'Monitor overall institutional counts such as active branches, total students, faculty, and principals.',
    placement: 'bottom' as const,
    disableBeacon: true,
    route: '/org-admin',
  },
  {
    target: '#admission-overview-grid',
    title: 'Admission Overview',
    content:
      'Track total admissions enquiries, application forms submitted, seats allocated, and enrolled students at a glance.',
    placement: 'bottom' as const,
    disableBeacon: true,
    route: '/org-admin',
  },
  {
    target: '#branch-distribution-chart',
    title: 'Branch Distribution',
    content:
      'Analyze the count of students and faculty members\ndistributed across various branches using the bar chart.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/org-admin',
  },
  {
    target: '#role-distribution-chart',
    title: 'Role Distribution',
    content:
      'Monitor the system user count distribution grouped by their roles using the pie chart.',
    placement: 'left' as const,
    disableBeacon: true,
    route: '/org-admin',
  },
  {
    target: '#branch-statistics-table',
    title: 'Branch Statistics',
    content:
      'View the detailed breakdown of student and faculty numbers for each branch.',
    placement: 'top' as const,
    disableBeacon: true,
    route: '/org-admin',
  },
  {
    target: '#admin-action-cards',
    title: 'Action Cards Console',
    content:
      'Quick shortcuts to:\n• Enroll User: Add new HOD or faculty\n• Bulk Upload Faculty: Upload faculty list\n• Manage Branches: View or edit branches\n• Faculty Assignments: Assign teachers to branches & subjects\n• Manage Batches: View or manage batches\n• Notifications: Send or view notifications\n• HOD Leaves: Manage HOD leave requests\n• Users Management: Manage all system users',
    placement: 'top' as const,
    disableBeacon: true,
    route: '/org-admin',
  },
  {
    target: '#sidebar-users',
    title: 'Users Directory',
    content:
      'Search, filter, view, edit, or deactivate student, faculty, HOD, and staff profiles inside your organization.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/org-admin/users',
  },
  {
    target: '#sidebar-enroll-user',
    title: 'Enroll Staff',
    content:
      'Enroll and onboard new institutional roles (HODs, faculty members, Deans, COE, or Fees Managers) easily.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/org-admin/enroll-user',
  },
  {
    target: '#sidebar-billing',
    title: 'Billing & Plans',
    content:
      'View your active plan details, organization administrative metadata, technical POC details, invoice receipt history, and raise support tickets.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/org-admin/billing',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile Settings',
    content:
      'Manage your personal admin profile settings, security credentials, and preferences.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/org-admin/profile',
  },
];
