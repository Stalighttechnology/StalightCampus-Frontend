import { isPageAllowed } from "@/utils/planGating";

/**
 * Canonical Frontend Route Registry for Stalight Campus Copilot.
 * Maps trusted `route_key` identifiers to exact verified App.tsx routes per role,
 * respecting plan/module gating.
 */
const ROUTE_MAP: Record<string, Record<string, string>> = {
  dashboard: {
    student: "/dashboard",
    parent: "/dashboard",
    outside_student: "/student-hostel-details",
    teacher: "/faculty",
    faculty: "/faculty",
    group_d: "/faculty",
    security: "/faculty",
    hod: "/hod",
    principal: "/admin",
    admin: "/admin",
    org_admin: "/org-admin",
    dean: "/dean",
    coe: "/coe",
    fees_manager: "/fees-manager",
    hms_admin: "/hms",
    warden: "/warden",
    transport_admin: "/transport-admin",
    driver: "/driver",
    library_admin: "/library-admin",
    admission_manager: "/admission-manager",
    counsellor: "/counsellor",
    inventory_manager: "/inventory-manager",
  },
  profile: {
    student: "/profile",
    outside_student: "/profile",
    parent: "/profile",
    teacher: "/faculty/faculty-profile",
    faculty: "/faculty/faculty-profile",
    group_d: "/faculty/faculty-profile",
    security: "/faculty/faculty-profile",
    hod: "/hod/hod-profile",
    principal: "/admin/profile",
    admin: "/admin/profile",
    org_admin: "/org-admin/profile",
    dean: "/dean/profile",
    coe: "/coe/profile",
    fees_manager: "/fees-manager/profile",
    hms_admin: "/hms/profile",
    warden: "/warden/profile",
    transport_admin: "/transport-admin/profile",
    driver: "/driver/profile",
    library_admin: "/library-admin/profile",
    admission_manager: "/admission-manager/profile",
    counsellor: "/counsellor/profile",
    inventory_manager: "/inventory-manager/profile",
  },
  timetable: {
    student: "/timetable",
    parent: "/timetable",
    teacher: "/faculty/timetable",
    faculty: "/faculty/timetable",
    hod: "/hod/timetable",
    principal: "/admin/timetable",
    admin: "/admin/timetable",
  },
  attendance: {
    student: "/attendance",
    parent: "/attendance",
    teacher: "/faculty/take-attendance",
    faculty: "/faculty/take-attendance",
    hod: "/hod/attendance-records",
    principal: "/admin/attendance-records",
    admin: "/admin/attendance-records",
    org_admin: "/org-admin/attendance",
    dean: "/dean/attendance",
  },
  low_attendance: {
    hod: "/hod/low-attendance",
    principal: "/admin/low-attendance",
    admin: "/admin/low-attendance",
    org_admin: "/org-admin/low-attendance",
  },
  marks: {
    student: "/marks",
    parent: "/marks",
    teacher: "/faculty/upload-marks",
    faculty: "/faculty/upload-marks",
    hod: "/hod/marks",
  },
  exams: {
    student: "/marks",
    parent: "/marks",
    coe: "/coe/exam-scheduling",
    dean: "/dean/exams",
    org_admin: "/org-admin/exams",
  },
  leaves: {
    student: "/leave-status",
    teacher: "/faculty/apply-leave",
    faculty: "/faculty/apply-leave",
    hod: "/hod/leaves",
    principal: "/admin/hod-leaves",
    admin: "/admin/hod-leaves",
    dean: "/dean/admin-leaves",
    hms_admin: "/hms/manage-warden-leaves",
    transport_admin: "/transport-admin/manage-leaves",
    fees_manager: "/fees-manager/leave",
  },
  proctor_students: {
    teacher: "/faculty/proctor-students",
    faculty: "/faculty/proctor-students",
    hod: "/hod/proctors",
    principal: "/admin/users",
    admin: "/admin/users",
  },
  students: {
    hod: "/hod/students",
    principal: "/admin/users",
    admin: "/admin/users",
  },
  subjects: {
    hod: "/hod/subjects",
  },
  faculty_assignments: {
    hod: "/hod/faculty-assignments",
    principal: "/admin/teacher-assignments",
    admin: "/admin/teacher-assignments",
  },
  promotion_management: {
    hod: "/hod/promotion-management",
  },
  syllabus_status: {
    hod: "/hod/syllabus-status",
    teacher: "/faculty/syllabus-status",
    student: "/student-syllabus",
  },
  study_materials: {
    hod: "/hod/study-materials",
    teacher: "/faculty/study-materials",
    student: "/student-study-material",
  },
  co_attainment: {
    hod: "/hod/co-attainment",
    teacher: "/faculty/co-attainment",
    coe: "/coe/co-attainment",
    dean: "/dean/co-attainment",
    principal: "/admin/co-attainment",
  },
  student_enrollment: {
    hod: "/hod/student-enrollment",
  },
  auditorium_booking: {
    hod: "/hod/auditorium-booking",
    dean: "/dean/auditoriums",
    principal: "/admin/auditoriums",
  },
  alumni_directory: {
    hod: "/hod/alumni-directory",
    dean: "/dean/alumni-directory",
    principal: "/admin/alumni-directory",
  },
  fees: {
    student: "/fees",
    parent: "/fees",
    fees_manager: "/fees-manager/invoices",
    org_admin: "/org-admin/finance",
    principal: "/admin/finance",
    dean: "/dean/finance",
  },
  invoices: {
    student: "/fees",
    parent: "/fees",
    fees_manager: "/fees-manager/invoices",
    org_admin: "/org-admin/invoices",
  },
  hostel: {
    student: "/student-hostel-details",
    outside_student: "/student-hostel-details",
    parent: "/student-hostel-details",
    hms_admin: "/hms/hostels",
    warden: "/warden/residents",
  },
  transport: {
    student: "/transportation",
    parent: "/transportation",
    transport_admin: "/transport-admin/transport-buses",
    driver: "/driver/driver-history",
  },
  library: {
    student: "/library",
    parent: "/library",
    library_admin: "/library-admin/library-books",
  },
  admissions_enquiries: {
    admission_manager: "/admission-manager/admission-enquiries",
    counsellor: "/counsellor/admission-enquiries",
  },
  inventory: {
    inventory_manager: "/inventory-manager/inventory-items",
    principal: "/admin/inventory",
    admin: "/admin/inventory",
    org_admin: "/org-admin/inventory",
    dean: "/dean/inventory",
    hod: "/hod/inventory",
    teacher: "/faculty/inventory",
    faculty: "/faculty/inventory",
  },
  announcements: {
    student: "/announcements",
    parent: "/announcements",
    teacher: "/faculty/faculty-announcement-management",
    faculty: "/faculty/faculty-announcement-management",
    group_d: "/faculty/faculty-announcement-management",
    security: "/faculty/faculty-announcement-management",
    hod: "/hod/hod-announcement-management",
    principal: "/admin/announcement-management",
    admin: "/admin/announcement-management",
    org_admin: "/org-admin/announcement-management",
    dean: "/dean/announcement-management",
    coe: "/coe/announcement-management",
    fees_manager: "/fees-manager/announcement-management",
    hms_admin: "/hms/announcement-management",
    warden: "/warden/announcement-management",
    transport_admin: "/transport-admin/announcement-management",
    driver: "/driver/announcements",
    library_admin: "/library-admin/announcements",
    admission_manager: "/admission-manager/announcements",
    counsellor: "/counsellor/announcements",
    inventory_manager: "/inventory-manager/announcements",
  },
  payroll: {
    fees_manager: "/fees-manager/payroll",
    teacher: "/faculty/my-payroll",
    faculty: "/faculty/my-payroll",
    hod: "/hod/my-payroll",
    principal: "/admin/my-payroll",
    org_admin: "/org-admin/my-payroll",
    dean: "/dean/my-payroll",
    coe: "/coe/my-payroll",
    hms_admin: "/hms/my-payroll",
    warden: "/warden/my-payroll",
    transport_admin: "/transport-admin/my-payroll",
    driver: "/driver/my-payroll",
    library_admin: "/library-admin/my-payroll",
    admission_manager: "/admission-manager/my-payroll",
    counsellor: "/counsellor/my-payroll",
    inventory_manager: "/inventory-manager/my-payroll",
  },
  auditorium_booking: {
    hod: "/hod/auditorium-booking",
    teacher: "/faculty/auditorium-booking",
    faculty: "/faculty/auditorium-booking",
    principal: "/admin/auditorium-booking",
    org_admin: "/org-admin/auditorium-booking",
  },
  alumni_directory: {
    hod: "/hod/alumni-directory",
    teacher: "/faculty/alumni-directory",
    faculty: "/faculty/alumni-directory",
    principal: "/admin/alumni-directory",
    org_admin: "/org-admin/alumni-directory",
  },
  scan_student_info: {
    hod: "/hod/scan-student-info",
  },
  exam_applications: {
    hod: "/hod/exam-applications",
    principal: "/admin/exam-applications",
  },
  student_enrollment: {
    hod: "/hod/student-enrollment",
  },
};

export function resolveCopilotRoute(
  routeKey: string,
  role?: string | null,
  orgPlan?: string | null
): string | null {
  const r = (role || "").toLowerCase();
  const normalizedRole = r === "hms" ? "hms_admin" : r;
  const mapping = ROUTE_MAP[routeKey];
  if (!mapping) return null;
  const path = mapping[normalizedRole] || null;
  if (!path) return null;

  const pageSegment = path.split("/").filter(Boolean).pop() || "dashboard";
  if (orgPlan && !isPageAllowed(pageSegment, orgPlan, normalizedRole)) {
    return null;
  }
  return path;
}
