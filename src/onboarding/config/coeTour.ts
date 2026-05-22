import { Step } from 'react-joyride';

export const coeTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
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
    target: '#coe-charts-container',
    title: 'Compliance Analytics',
    content:
      'Monitor compliance with academic standards and quality benchmarks.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/coe/dashboard',
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
    target: '#sidebar-publish-results',
    title: 'Publish Results',
    content:
      'Announce and publish examination results officially to the student portal.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/coe/publish-results',
  },
];

