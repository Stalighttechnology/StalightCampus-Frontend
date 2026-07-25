import { Step } from 'react-joyride';

export const coeTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to StalightCampus!',
    content:
      'Let\'s show you around your COE dashboard to help you manage academic quality assurance.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#coe-stats-grid',
    title: 'Quality Metrics',
    content:
      'View key quality assurance metrics and compliance indicators across the institution.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
  },
  {
    target: '#coe-application-trends-chart',
    title: 'Application Trends',
    content:
      'Monitor the weekly volume of exam application submissions to identify trends.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
  },
  {
    target: '#coe-application-status-chart',
    title: 'Application Status',
    content:
      'View the real-time distribution of approved, pending, and rejected exam applications.',
    placement: 'left' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
  },
  {
    target: '#coe-recent-results-table',
    title: 'Recent Published Results',
    content:
      'View recently published examination results, open public result links directly, or copy them to your clipboard.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
  },
  {
    target: '#sidebar-exam-scheduling',
    title: 'Exam Scheduling',
    content:
      'Create, view, and organize timetables for upcoming campus examinations.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/exam-scheduling',
  },
  {
    target: '#sidebar-qp-approvals',
    title: 'Question Paper Approvals',
    content:
      'Review, finalize, and give approval for academic examination papers.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/qp-approvals',
  },
  {
    target: '#sidebar-publish-results',
    title: 'Publish Results',
    content:
      'Announce and publish examination results officially to the student portal.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/publish-results',
  },
  {
    target: '#sidebar-publish-results-reval-makeup',
    title: 'Publish Results (Reval/Makeup)',
    content:
      'Publish result batches for revaluation and makeup examinations.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/publish-results-reval-makeup',
  },
  {
    target: '#sidebar-revaluation-requests',
    title: 'Revaluation Requests',
    content:
      'Process student applications for mark revaluation and photocopy requests.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/revaluation-requests',
  },
  {
    target: '#sidebar-makeup-requests',
    title: 'Makeup Requests',
    content:
      'Review and manage makeup exam requests submitted by students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/makeup-requests',
  },
  {
    target: '#sidebar-student-status',
    title: 'Student Status',
    content:
      'View and verify the graduation/examination eligibility and status of students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/student-status',
  },
  {
    target: '#sidebar-course-statistics',
    title: 'Course Statistics',
    content:
      'Check academic performance statistics and grade distributions across courses.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/course-statistics',
  },
  {
    target: '#sidebar-co-attainment',
    title: 'CO/PO Attainment',
    content:
      'Track and evaluate Course Outcome and Program Outcome attainment levels.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/co-attainment',
  },
  {
    target: '#sidebar-announcement-management',
    title: 'Announcement Management',
    content:
      'Create and manage institution-wide announcements and updates.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/announcement-management',
  },
  {
    target: '#sidebar-fee-settings',
    title: 'Fee Settings',
    content:
      'Configure and manage student fees for revaluation, photocopy, and makeup exams.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/fee-settings',
  },
  {
    target: '#sidebar-scan-student-info',
    title: 'Scan for Student Info',
    content:
      'Quickly search for student details or use barcode and face scanner to retrieve their academic profile.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/scan-student-info',
  },
  {
    target: '#sidebar-schedule-meeting',
    title: 'Schedule Meeting',
    content:
      'Schedule and organize academic or administrative meetings.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/schedule-meeting',
  },
  {
    target: '#sidebar-apply-leave',
    title: 'Apply Leave',
    content:
      'Submit your leave applications and view recent request histories here.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/apply-leave',
  },
  {
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content:
      'Check your personal daily attendance logs and records.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/my-attendance',
  },
  {
    target: '#sidebar-holiday-calendar',
    title: 'Calendar',
    content:
      'View the institutional holiday calendar and scheduled events.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/holiday-calendar',
  },
  {
    target: '#sidebar-reimbursements',
    title: 'Reimbursements & Claims',
    content:
      'Submit and monitor status of reimbursement and expense claims.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/reimbursements',
  },
  {
    target: '#sidebar-my-payroll',
    title: 'My Salary & Payroll',
    content:
      'View your monthly salary statements, pay slips, and compensation details.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/my-payroll',
  },
  {
    target: '#sidebar-profile',
    title: 'COE Profile',
    content:
      'Manage your account settings, personal details, and security passwords.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/profile',
  },
];
