import { Step } from 'react-joyride';

export const hodTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus!',
    content:
      'Let\'s show you around your HOD dashboard to help you manage your department efficiently.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#hod-stats-cards',
    title: 'Department Statistics',
    content:
      'Get a comprehensive overview of your department\'s key metrics and performance indicators.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hod/dashboard',
  },
  {
    target: '#hod-leave-table',
    title: 'Leave Requests',
    content:
      'Review and approve leave requests from your faculty members with ease.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/hod/dashboard',
  },
  {
    target: '#sidebar-faculty-attendance',
    title: 'Faculty Attendance',
    content:
      'Monitor attendance records for all faculty members in your department.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/faculty-attendance',
  },
  {
    target: '#sidebar-timetable',
    title: 'Timetable Management',
    content:
      'View and manage the complete academic schedule for your department.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/timetable',
  },
  {
    target: '#sidebar-users-management',
    title: 'User Management',
    content:
      'Manage faculty and student profiles, assign roles, and control access permissions.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/students',
  },
];

