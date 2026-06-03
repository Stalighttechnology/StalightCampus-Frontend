import { Step } from 'react-joyride';

export const deanTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your Dean dashboard to help you oversee academic and institutional operations.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#dean-stats-grid',
    title: 'Institution Overview',
    content:
      'Get a comprehensive view of key institutional metrics and performance indicators.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#dean-branch-distribution-card',
    title: 'Branch Distribution',
    content:
      'Analyze the enrollment distribution of members across each branch.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#dean-role-distribution-card',
    title: 'Role Distribution',
    content:
      'Monitor the distribution of different user roles active in the system.',
    placement: 'left' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#dean-branch-summary-card',
    title: 'Branch Summary',
    content:
      'View a detailed summary of student and faculty counts across all branches.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/dean/dashboard',
  },
  {
    target: '#sidebar-attendance',
    title: 'Today\'s Attendance',
    content:
      'View real-time student attendance percentages and snapshots across departments.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/attendance',
  },
  {
    target: '#sidebar-attendance-filters',
    title: 'Attendance Filters',
    content:
      'Filter and analyze attendance data historically by date, branch, and section.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/attendance-filters',
  },
  {
    target: '#hod-search-student-card',
    title: 'Scan for Student Info',
    content:
      'Quickly search for student details or use barcode and face scanner to retrieve their academic profile.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/dean/scan-student-info',
  },
  {
    target: '#sidebar-exams',
    title: 'Exams',
    content:
      'Monitor scheduled exams, track active sessions, and publish exam results.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/exams',
  },
  {
    target: '#sidebar-faculty',
    title: 'Faculty Profiles',
    content:
      'View faculty assignments, schedules, leave history, and track weekly teaching hours.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/faculty',
  },
  {
    target: '#sidebar-finance',
    title: 'Finance',
    content:
      'Monitor institutional fee collections, outstanding amounts, and payment trends.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/finance',
  },
  {
    target: '#sidebar-campus-locations',
    title: 'Campus Locations',
    content:
      'Set and manage geolocation boundaries for automatic mobile attendance check-ins.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/campus-locations',
  },
  {
    target: '#sidebar-admin-leaves',
    title: 'Admin Leaves',
    content:
      'Review and manage leave applications from administrative staff and other team members.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/admin-leaves',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile',
    content:
      'Manage your account details, edit contact information, and change passwords.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/dean/profile',
  },
];
