
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
  'payment-settings': 2,
  'billing': 2,
  'finance': 2,
  'revaluation': 2,
  'makeupexam': 2,
  'fees': 2,
  'reports': 2,
  'student-reports': 2,
  'leave': 2,
  'apply-leave': 2,
  'hod-leaves': 2,
  'department-admin-leaves': 2,
  'leaves': 2,
  'apply-leaves': 2,
  'student-leave': 2,
  'admin-leaves': 2,
  'promotion-management': 2,
  'study-materials': 2,
  'student-study-material': 2,
  'proctors': 2,
  'proctor-students': 2,
  'student-enrollment': 2,

  // Advance Features (Tier 3)
  'hms-dashboard': 3,
  'hostels': 3,
  'rooms': 3,
  'hostel-students': 3,
  'enrollment': 3,
  'staff': 3,
  'menu-management': 3,
  'student-meals': 3,
  'issues': 3,
  'visitor_logs': 3,
  'manage-warden-leaves': 3,
  'residents': 3,
  'student-hostel-details': 3,
  'transport-buses': 3,
  'transport-routes': 3,
  'transport-drivers': 3,
  'transport-allocations': 3,
  'transport-tracking': 3,
  'transport-incidents': 3,
  'manage-leaves': 3,
  'driver-history': 3,
  'driver-complaints': 3,
  'transportation': 3,
  'library': 3,
  'library-books': 3,
  'library-circulation': 3,
  'library-fines': 3,
  'admission-dashboard': 3,
  'campus-builder': 3,
  'admission-enquiries': 3,
  'admission-applications': 3,
  'admission-students': 3,
  'admission-courses': 3,
  'seat-matrix': 3,
  'admission-fees': 3,
  'admission-documents': 3,
  'admission-communication': 3,
  'admission-reports': 3,
  'admission-settings': 3,
  'student-status': 3,
  'course-statistics': 3,
  'makeup-requests': 3,
  'revaluation-requests': 3,
  'publish-results': 3,
  'publish-results-reval-makeup': 3,
  'exam-scheduling': 3,
  'fee-settings': 3,
  'attendance-filters': 3,
  'campus-locations': 3,
  'bulk-upload': 3,
  'scan-student-info': 3,
  'co-attainment': 3,
  'statistics': 3,
};

export const isPageAllowed = (page: string, orgPlan: string): boolean => {
  if (page === 'dashboard') return true;

  const userTier = PLAN_TIERS[(orgPlan || 'basic').toLowerCase()] || 1;
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