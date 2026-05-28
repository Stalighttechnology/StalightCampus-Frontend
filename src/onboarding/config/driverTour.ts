import { Step } from 'react-joyride';

export const driverTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Stalight Driver Portal!',
    content: 'Let\'s guide you through the Driver portal to manage your daily routes, start trips, and mark student attendance.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#sidebar-dashboard',
    title: 'Assigned Route & Details',
    content: 'Here you can view your Assigned Route (e.g., Hulimavu → Rajajinagar), Assigned Bus number and registration plates, Morning & Evening Start times, and Bus Capacity (total seats).',
    placement: 'bottom' as const,
    disableBeacon: true,
    route: '/driver',
  },
  {
    target: '#driver-trip-controls',
    title: "Start Today's Trip",
    content: 'Start your Morning Trip or Evening Trip here. Once started, student boarding and live GPS tracking options will become active.',
    placement: 'bottom' as const,
    disableBeacon: true,
    route: '/driver',
  },
  {
    target: '#sidebar-driver-history',
    title: 'Trip Records',
    content: 'Access and review historical trip attendance records, total boarding stats, and passenger logs.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/driver/driver-history',
  },
  {
    target: '#sidebar-driver-complaints',
    title: 'Incidents & Alerts',
    content: 'View all emergency alerts and incidents logged by you during transport routes.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/driver/driver-complaints',
  },
  {
    target: '#sidebar-profile',
    title: 'Profile Settings',
    content: 'Manage your driver account details, security credentials, and preferences.',
    placement: 'right' as const,
    disableBeacon: true,
    route: '/driver/profile',
  },
];
