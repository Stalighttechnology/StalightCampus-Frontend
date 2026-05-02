
export const PLAN_TIERS: Record<string, number> = {
  'basic': 1,
  'pro': 2,
  'advance': 3
};

export const PAGE_REQUIRED_TIERS: Record<string, number> = {
  // Pro Features (Tier 2)
  'components': 2,
  'templates': 2,
  'assignments': 2,
  'individual-fees': 2,
  'bulk-assignment': 2,
  'invoices': 2,
  'payments': 2,
  'reports': 2,
  'student-reports': 2,
  'promotion-management': 2,
  'course-statistics': 2,
  'fees': 2,
  'qp-approvals': 2,
  'proctors': 2,
  'faculty-assignments': 2,
  'teacher-assignments': 2,
  'leaves': 2,
  'student-leave': 2,
  'finance': 2,
  'admin-leaves': 2,
  'hod-leaves': 2,
  'hod-attendance': 2,

  // Advance Features (Tier 3)
  'bulk-upload': 3,
  'co-attainment': 3,
  'hms-dashboard': 3,
  'hostels': 3,
  'rooms': 3,
  'hostel-students': 3,
  'enrollment': 3,
  'staff': 3,
  'menu-management': 3,
  'issues': 3,
  'performance': 3,
  'scan-student-info': 3,
  'ai-interview': 3,
  'student-hostel-details': 3,
  'exam-scheduling': 1,
};

export const isPageAllowed = (page: string, orgPlan: string): boolean => {
  if (page === 'dashboard') return true;

  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;
  const requiredTier = PAGE_REQUIRED_TIERS[page] || 1;

  return userTier >= requiredTier;
};


//1. The Rule
// The number you assign represents the minimum plan needed to see that page:

// 1 = Basic (or just don't list it at all, as it defaults to 1)
// 2 = Pro
// 3 = Advance
// 2. How to Edit
// The "Key" (e.g., 'fees') must exactly match the page name used in the Sidebar.tsx menu items.

// To make a feature BASIC: Either delete its line from this list or change its number to 1.
// Example: Remove 'leaves': 2 $\rightarrow$ Leaves are now available to everyone.
// To make a feature PRO: Add it to the list with a : 2.
// Example: 'attendance-records': 2 $\rightarrow$ Only Pro and Advance can see attendance history.
// To make a feature ADVANCE: Add it to the list with a : 3.
// Example: 'exams': 3 $\rightarrow$ Only Advance users can access the Exams page.