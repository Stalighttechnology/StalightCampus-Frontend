import { Step } from 'react-joyride';

export const hmsTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to NeuroCampus HMS!',
    content:
      "Let's show you around your Hostel Management System dashboard to help you manage hostels, rooms, students, and staff.",
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#hms-stats-grid',
    title: 'Overview Statistics',
    content:
      'View total hostels, rooms, student counts, active wardens, and overall occupancy rate in real-time.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hms',
  },
  {
    target: '#hms-occupancy-matrix',
    title: 'Room Occupancy Matrix',
    content:
      'Monitor availability per hostel and floor visually. Color-coded grids indicate full, partial, or empty occupancy.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/hms',
  },
  {
    target: '#sidebar-hostels',
    title: 'Hostel Management',
    content:
      'Add new hostels, allocate wardens and caretakers, and view the list of registered hostels.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/hostels',
  },
  {
    target: '#sidebar-rooms',
    title: 'Room Management',
    content:
      'Add rooms, edit capacity and room types, and check current residents.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/rooms',
  },
  {
    target: '#sidebar-students',
    title: 'Student Management',
    content:
      'Filter and search registered hostel students, assign them to rooms, and manage no-dues clearance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/students',
  },
  {
    target: '#sidebar-enrollment',
    title: 'Staff Enrollment',
    content:
      'Register new wardens and caretakers into the system with their professional credentials.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/enrollment',
  },
  {
    target: '#sidebar-staff',
    title: 'Staff Directory',
    content:
      'View, update, and manage the list of registered wardens and caretakers.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/staff',
  },
  {
    target: '#sidebar-menu-management',
    title: 'Mess Menu Management',
    content:
      'Plan breakfast, lunch, snacks, and dinner menu items weekly or schedule special menus.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/menu-management',
  },
  {
    target: '#sidebar-student-meals',
    title: "Today's Menu",
    content:
      "Check today's scheduled meals, timings, and dietary info for the hostel.",
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/student-meals',
  },
  {
    target: '#sidebar-issues',
    title: 'Issue Tracking',
    content:
      'Track and update complaints, maintenance requests, and student issues.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/issues',
  },
  {
    target: '#sidebar-profile',
    title: 'HMS Profile',
    content:
      'Manage your personal details, contact information, and change passwords.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hms/profile',
  },
];
