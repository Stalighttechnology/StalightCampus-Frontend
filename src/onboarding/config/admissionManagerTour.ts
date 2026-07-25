import { Step } from 'react-joyride';

export const admissionManagerTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Admission Manager Dashboard!',
    content:
      'Let\'s show you around the Admission Manager portal to help you set up campaigns, publish campus pages, track leads, and manage admissions.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admission-stats-grid',
    title: 'Admission Overview',
    content:
      'Monitor pipeline health metrics including total enquiries, active applications, confirmed admissions, and successfully enrolled students.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/admission-manager',
  },
  {
    target: '#admission-charts-container',
    title: 'Analytics & Pipeline Visualizer',
    content:
      'Analyze student distribution across pipeline stages and course preference breakdowns using interactive charts.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/admission-manager',
  },
  {
    target: '#sidebar-admission-courses',
    title: 'Academic Program Catalog',
    content:
      'Add, manage, and configure academic programs, duration, codes, and courses offered by your campus.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-courses',
  },
  {
    target: '#sidebar-admission-enquiries',
    title: 'Enquiry Leads Pipeline',
    content:
      'Track prospective student leads and transition their status using a drag-and-drop Kanban pipeline.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-enquiries',
  },
  {
    target: '#sidebar-admission-applications',
    title: 'Submitted Applications',
    content:
      'Review complete application forms, check candidate grades, verify uploaded documents, and confirm admissions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-applications',
  },
  {
    target: '#sidebar-admission-students',
    title: 'Enrolled Students',
    content:
      'Access the directories of successfully enrolled students and export data directly to Department Heads (HODs).',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-students',
  },
  {
    target: '#sidebar-admission-documents',
    title: 'Document Verification',
    content:
      'Audit and verify academic certificates, transfer documents, and identity proofs uploaded by applicants.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-documents',
  },
  {
    target: '#sidebar-counsellor-management',
    title: 'Counsellors Management',
    content:
      'Assign admission counsellors and manage team targets and performance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/counsellor-management',
  },
  {
    target: '#sidebar-admission-communication',
    title: 'Applicant Communication',
    content:
      'Send announcements, important timeline alerts, and bulk emails to specific pipeline target groups.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-communication',
  },
  {
    target: '#sidebar-admission-reports',
    title: 'Reports Exporter',
    content:
      'Generate and download custom CSV reports for course preferences, status pipelines, and custom date timelines.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/admission-reports',
  },
  {
    target: '#sidebar-campus-builder',
    title: 'Campus Page Builder',
    content:
      'Create and customize your public-facing admissions landing page, configure campus features, test page designs, and adjust style themes.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/campus-builder',
  },
  {
    target: '#sidebar-schedule-meeting',
    title: 'Schedule Meeting',
    content:
      'Schedule and organize meetings across institutional staff and counsellors.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/schedule-meeting',
  },
  {
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content: 'Check your personal attendance logs and administrative schedule tracking.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/my-attendance',
  },
  {
    target: '#sidebar-holiday-calendar',
    title: 'Calendar',
    content:
      'View institutional holiday calendar and scheduled events.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/holiday-calendar',
  },
  {
    target: '#sidebar-my-payroll',
    title: 'My Salary & Payroll',
    content:
      'View your monthly salary statements, pay slips, and compensation details.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/my-payroll',
  },
  {
    target: '#sidebar-profile',
    title: 'Account Settings',
    content:
      'Manage profile details, configure contact data, and manage account security credentials.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admission-manager/profile',
  },
];
