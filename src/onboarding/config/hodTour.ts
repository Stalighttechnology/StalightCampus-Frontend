import { Step } from 'react-joyride';

export const hodTour: Step[] = [
  {
    target: 'body',
    title: 'Welcome to StalightCampus!',
    content:
      'Let\'s show you around your HOD dashboard to help you manage your department efficiently.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  // ── Dashboard ────────────────────────────────────────────────
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
    target: '#hod-attendance-trends',
    title: 'Attendance Trends',
    content:
      'Track and analyze weekly attendance trends for your department.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/dashboard',
  },
  {
    target: '#hod-member-distribution',
    title: 'Member Distribution',
    content:
      'View the proportion of faculty members and students in your department.',
    placement: 'left' as const,
    disableBeacon: false,
    route: '/hod/dashboard',
  },
  {
    target: '#hod-leave-header',
    title: 'Leave Requests',
    content:
      'Review and approve leave requests from your faculty members with ease.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hod/dashboard',
  },
  // ── Academic Management ──────────────────────────────────────
  {
    target: '#sidebar-semesters',
    title: 'Semester Management',
    content:
      'Add, edit, and manage semesters and sections for your department. Keep your academic calendar organized.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/semesters',
  },
  {
    target: '#sidebar-students',
    title: 'Student Enrollment',
    content:
      'View and manage student profiles, enrollment status, and assignments across all semesters.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/students',
  },
  {
    target: '#student-list-header-section',
    title: 'Student List & Search',
    content:
      'View enrolled students, perform bulk uploads, search for specific students, and filter by semester/section.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/hod/students',
  },
  {
    target: '#sidebar-student-enrollment',
    title: 'Elective Course Enrollment',
    content:
      'Manage elective and open-elective course enrollment for students in your department.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/student-enrollment',
  },
  {
    target: '#sidebar-subjects',
    title: 'Courses / Subjects',
    content:
      'Add and manage courses and subjects offered by your department, including subject codes and credits.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/subjects',
  },
  {
    target: '#sidebar-faculty-assignments',
    title: 'Faculty Assignments',
    content:
      'Assign faculty members to subjects, sections, and semesters. Manage teaching loads across your department.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/faculty-assignments',
  },
  {
    target: '#sidebar-qp-approvals',
    title: 'Question Paper Approvals',
    content:
      'Review and approve question papers submitted by faculty before they are forwarded to administration.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/qp-approvals',
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
    target: '#sidebar-proctors',
    title: 'Proctors',
    content:
      'Assign and manage faculty proctors for student mentorship and academic guidance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/proctors',
  },
  {
    target: '#proctors-header-filters-section',
    title: 'Manage Proctor Assignments',
    content:
      'Filter students by semester and section, search by name or USN, and assign them to proctors.',
    placement: 'top' as const,
    disableBeacon: false,
    route: '/hod/proctors',
  },
  // ── Attendance & Marks ───────────────────────────────────────
  {
    target: '#sidebar-low-attendance',
    title: 'Low Attendance',
    content:
      'Identify students with attendance below the required threshold and take corrective action.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/low-attendance',
  },
  {
    target: '#sidebar-co-attainment',
    title: 'CO Attainment',
    content:
      'Calculate and analyze Course Outcome (CO) attainment levels for your courses.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/co-attainment',
  },
  {
    target: '#sidebar-exam-applications',
    title: 'Exam Applications',
    content:
      'Manage and review student exam applications, periods, and statuses.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/exam-applications',
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
    target: '#sidebar-my-attendance',
    title: 'My Attendance',
    content:
      'View and track your own personal attendance records.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/my-attendance',
  },
  {
    target: '#sidebar-promotion-management',
    title: 'Promotion Management',
    content:
      'Promote or demote students between semesters based on their academic performance.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/promotion-management',
  },
  // ── Leaves ────────────────────────────────────────────────────
  {
    target: '#sidebar-leaves',
    title: 'Faculty Leaves',
    content:
      'Review and approve leave requests submitted by faculty members in your department.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/leaves',
  },
  {
    target: '#sidebar-apply-leaves',
    title: 'Apply Leaves',
    content:
      'Submit your own leave applications and track their approval status.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/apply-leaves',
  },
  // ── Resources & Communication ────────────────────────────────
  {
    target: '#sidebar-study-materials',
    title: 'Study Material',
    content:
      'Upload and manage study resources, notes, and reference materials for students.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/study-materials',
  },
  {
    target: '#sidebar-scan-student-info',
    title: 'Scan for Student Info',
    content:
      'Quickly look up student information by scanning QR codes or searching by name/USN.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/scan-student-info',
  },
  {
    target: '#sidebar-hod-announcement-management',
    title: 'Branch Announcements',
    content:
      'Create and broadcast announcements to students and faculty within your branch.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/hod-announcement-management',
  },
  {
    target: '#hod-syllabus-tracker-header',
    title: 'Syllabus Status Management',
    content: 'Configure and manage week-wise syllabus templates for subjects in your department.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hod/syllabus-status',
  },
  {
    target: '#hod-semester-monitor-header',
    title: 'Semester Syllabus Monitoring',
    content: 'Track and monitor week-by-week teaching progress across all subjects in real time.',
    placement: 'bottom' as const,
    disableBeacon: false,
    route: '/hod/syllabus-monitor',
  },
  // ── Profile ───────────────────────────────────────────────────
  {
    target: '#sidebar-hod-profile',
    title: 'HOD Profile',
    content:
      'View and update your personal information, change your password, and manage your profile picture.',
    placement: 'right' as const,
    disableBeacon: false,
    route: '/hod/hod-profile',
  },
];


