import { Step } from 'react-joyride';

export const adminTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to Stalight Campus!',
    content:
      'Let\'s show you around your admin dashboard to help you manage the entire institution.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '#admin-stats-grid',
    title: 'System Statistics',
    content:
      'Monitor overall system health and key institutional metrics at a glance.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#branch-distribution-chart',
    title: 'Branch Distribution',
    content:
      'Analyze the count of students and faculty members distributed across various branches.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#role-distribution-chart',
    title: 'Role Distribution',
    content:
      'Monitor the system user count distribution grouped by their roles.',
    placement: 'left' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#branch-statistics-table',
    title: 'Branch Statistics',
    content:
      'View the detailed breakdown of student and faculty numbers for each branch.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#admin-action-cards',
    title: 'Quick Actions',
    content:
      'Use these quick shortcuts to perform key administrative actions like enrolling users, managing branches, and assigning faculty.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/admin',
  },
  {
    target: '#sidebar-enroll-user',
    title: 'Enroll Users',
    content:
      'Add and manage student and faculty enrollments across the institution.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/enroll-user',
  },
  {
    target: '#sidebar-bulk-upload',
    title: 'Bulk Upload Faculty',
    content:
      'Quickly import large numbers of faculty members using standard CSV or Excel files.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/bulk-upload',
  },
  {
    target: '#sidebar-billing',
    title: 'Billing & Plans',
    content:
      'View your active plan details, organization administrative metadata, technical POC details, invoice receipt history, and raise support tickets.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/billing',
  },
  {
    target: '#sidebar-branches',
    title: 'Branch Management',
    content:
      'Manage different branches or campuses and their respective configurations.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/branches',
  },
  {
    target: '#sidebar-teacher-assignments',
    title: 'Faculty Assignments',
    content:
      'Assign primary branches and departments to faculty members across the institution.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/teacher-assignments',
  },
  {
    target: '#sidebar-qp-approvals',
    title: 'Question Paper Approvals',
    content:
      'Review and approve question papers pending administrative oversight.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/qp-approvals',
  },
  {
    target: '#sidebar-batches',
    title: 'Batches Management',
    content:
      'Set up and configure academic cohorts, terms, and sections.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/batches',
  },
  {
    target: '#sidebar-announcement-management',
    title: 'Announcement Management',
    content:
      'Broadcast institutional news, alerts, and general updates to students and staff.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/announcement-management',
  },
  {
    target: '#sidebar-hod-leaves',
    title: 'Leave Requests',
    content:
      'Review, approve, or reject leave applications submitted by staff members.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/hod-leaves',
  },
  {
    target: '#sidebar-hod-attendance',
    title: 'HOD Attendance',
    content:
      'Monitor and track HOD attendance records, checks-in, and statuses.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/hod-attendance',
  },
  {
    target: '#sidebar-faculty-attendance',
    title: 'Faculty Attendance',
    content:
      'Monitor and track faculty attendance records across different branches.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/faculty-attendance',
  },
  {
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content:
      'Check your personal attendance logs and administrative schedule tracking.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/my-attendance',
  },
  {
    target: '#sidebar-apply-leave',
    title: 'Apply Leave',
    content:
      'Submit your own leave requests and view your leave applications history.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/apply-leave',
  },
  {
    target: '#sidebar-users',
    title: 'Users Directory',
    content:
      'View, edit, deactivate, or delete any user profile within the institution.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/users',
  },
  {
    target: '#sidebar-scan-student-info',
    title: 'Scan Student Info',
    content: 'Quickly scan or search for student information across the organization.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/scan-student-info',
  },
  {
    target: '#sidebar-profile',
    title: 'Admin Profile',
    content:
      'Manage your personal details, credentials, and configuration settings.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/admin/profile',
  },
];
