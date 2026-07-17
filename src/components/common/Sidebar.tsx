import { translateTerminology, getTerm, hasFeature } from "@/utils/institutionConfig";
//sidebar.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
// Use public directory asset via URL
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { isPageAllowed, PLAN_TIERS } from "../../utils/planGating";
import { API_BASE_URL } from "../../utils/config";
import {
  LayoutDashboard,
  Users,
  User,
  Calendar,
  FileText,
  Bell,
  BarChart2,
  Settings,
  LogOut,
  GitBranch,
  UserCheck,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Upload,
  CreditCard,
  IndianRupee,
  Receipt,
  ReceiptText,
  Search,
  Mic,
  Home,
  Utensils,
  AlertCircle,
  Shield,
  Bus,
  Smartphone,
  UserPlus, UploadCloud, Briefcase, FileWarning, AlertTriangle, CalendarDays,
  FilePlus, CheckSquare, Award, ScanLine, ShieldCheck, Target, ListChecks,
  CalendarCheck, Megaphone, ListTodo, RefreshCcw, FileQuestion, PieChart,
  Clock, LineChart, List, Activity, MonitorPlay, BookCopy, PenTool, DoorOpen,
  UtensilsCrossed, ClipboardSignature, Ticket, BusFront, Map, Navigation, History, Library, Repeat, FileCode, CheckCircle2, TrendingUp
} from "lucide-react";
import { useIsMobile } from "../../hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface SidebarProps {
  role: string;
  setPage: (page: string) => void;
  activePage: string;
  logout?: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
}

const Sidebar = ({ role, setPage, activePage, logout, collapsed, toggleCollapse }: SidebarProps) => {
  const isMobile = useIsMobile();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPwaBadge, setShowPwaBadge] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const { theme } = useTheme();

  const initialUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const initialUser = initialUserStr ? JSON.parse(initialUserStr) : null;
  const [orgLogo, setOrgLogo] = useState(initialUser?.org_logo || "/logo.jpeg");

  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(localStorage.getItem('selectedStudentId'));

  useEffect(() => {
    if (role === 'parent') {
      const fetchChildren = async () => {
        try {
          const { fetchWithTokenRefresh } = await import("../../utils/authService");
          const { fetchParentChildrenCached } = await import("../../utils/student_api");
          const data = await fetchParentChildrenCached(fetchWithTokenRefresh, API_BASE_URL);
          if (data.success && data.children) {
            setChildrenList(data.children);
            const currentSavedId = localStorage.getItem('selectedStudentId');
            if (data.children.length > 0 && (!currentSavedId || currentSavedId === 'null' || currentSavedId === 'undefined')) {
              localStorage.setItem('selectedStudentId', data.children[0].id.toString());
              setSelectedChildId(data.children[0].id.toString());
            }
          }
        } catch (error) {
          console.error("Failed to fetch children in sidebar", error);
        }
      };
      fetchChildren();
    }
  }, [role]);

  useEffect(() => {
    const handleUpdate = () => {
      const updatedUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      const updatedUser = updatedUserStr ? JSON.parse(updatedUserStr) : null;
      setOrgLogo(updatedUser?.org_logo || "/logo.jpeg");
    };
    window.addEventListener("userProfileUpdated", handleUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleUpdate);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsNotificationsEnabled((typeof Notification !== 'undefined' && Notification.permission === 'granted'));

      const interval = setInterval(() => {
        setIsNotificationsEnabled((typeof Notification !== 'undefined' && Notification.permission === 'granted'));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Check if the user has completed PWA setup
    const hasSeenWizard = localStorage.getItem('hasSeenPwaWizard');
    if (!hasSeenWizard) {
      setShowPwaBadge(true);
    }

    // Also listen for when they finish the setup to remove the badge immediately
    const handlePwaDone = () => setShowPwaBadge(false);
    window.addEventListener('pwa_setup_complete', handlePwaDone);
    return () => window.removeEventListener('pwa_setup_complete', handlePwaDone);
  }, []);

  // Event listener for onboarding system to control sidebar visibility
  useEffect(() => {
    const openHandler = () => setPage('dashboard');  // Trigger open
    const closeHandler = () => {
      // Could implement close logic if needed
    };
    window.addEventListener('stalightcampus_open_sidebar', openHandler);
    window.addEventListener('stalightcampus_close_sidebar', closeHandler);
    return () => {
      window.removeEventListener('stalightcampus_open_sidebar', openHandler);
      window.removeEventListener('stalightcampus_close_sidebar', closeHandler);
    };
  }, [setPage]);

  const handlePageChange = (page: string) => {
    setPage(page);
    if (isMobile) {
      toggleCollapse();
    }
  };

  // Helper function to generate sidebar item ID from page name
  const getSidebarId = (page: string): string => {
    return `sidebar-${page.toLowerCase().replace(/_/g, '-')}`;
  };

  // Helper function to determine if a sidebar item should be highlighted as active
  const isItemActive = (page: string): boolean => {
    if (activePage === page) return true;
    if (role === "student" && page === "leave-request" && ["leave", "leave-status"].includes(activePage)) {
      return true;
    }
    return false;
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    if (logout) {
      logout();
    }
    setShowLogoutDialog(false);
  };

  const getIcon = (page: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'exam-applications': <FileText size={20} />,
      dashboard: <LayoutDashboard size={20} />,
      overview: <LayoutDashboard size={20} />,
      components: <List size={20} />,
      templates: <FileCode size={20} />,
      assignments: <ClipboardList size={20} />,
      "individual-fees": <User size={20} />,
      "bulk-assignment": <Users size={20} />,
      invoices: <Receipt size={20} />,
      payments: <CreditCard size={20} />,
      "promotion-management": <TrendingUp size={20} />,
      "enroll-user": <UserPlus size={20} />,
      "bulk-upload": <UploadCloud size={20} />,
      branches: <GitBranch size={20} />,
      "teacher-assignments": <Briefcase size={20} />,
      notifications: <Bell size={20} />,
      "hod-leaves": <FileWarning size={20} />,
      users: <Users size={20} />,
      profile: <User size={20} />,
      "admin-profile": <User size={20} />,
      "hod-profile": <User size={20} />,
      "faculty-profile": <User size={20} />,
      "low-attendance": <AlertTriangle size={20} />,
      semesters: <CalendarDays size={20} />,
      students: <GraduationCap size={20} />,
      subjects: <BookOpen size={20} />,
      "faculty-assignments": <ClipboardList size={20} />,
      timetable: <CalendarDays size={20} />,
      "timetable-config": <Settings size={20} />,
      leaves: <LogOut size={20} />,
      "apply-leaves": <FilePlus size={20} />,
      attendance: <CheckSquare size={20} />,
      payroll: <IndianRupee size={20} />,
      marks: <Award size={20} />,
      "study-materials": <Library size={20} />,
      "scan-student-info": <ScanLine size={20} />,
      proctors: <ShieldCheck size={20} />,

      "take-attendance": <CheckCircle2 size={20} />,
      "upload-marks": <Upload size={20} />,
      "co-attainment": <Target size={20} />,
      "apply-leave": <FilePlus size={20} />,
      "reimbursements": <ReceiptText size={20} />,
      "my-payroll": <IndianRupee size={20} />,
      "attendance-records": <ListChecks size={20} />,
      "faculty-attendance": <CalendarCheck size={20} />,
      announcements: <Megaphone size={20} />,
      "staff-tasks": <ListTodo size={20} />,
      revaluation: <RefreshCcw size={20} />,
      makeupexam: <FileQuestion size={20} />,
      "proctor-students": <Users size={20} />,
      "student-leave": <FileWarning size={20} />,
      statistics: <PieChart size={20} />,
      "leave-request": <FileQuestion size={20} />,
      "leave-status": <Clock size={20} />,
      certificates: <Award size={20} />,
      fees: <CreditCard size={20} />,
      "exam-schedule": <CalendarDays size={20} />,
      reports: <LineChart size={20} />,
      "syllabus-status": <List size={20} />,
      "syllabus-monitor": <Activity size={20} />,
      "student-syllabus": <BookOpen size={20} />,
      "study-mode": <MonitorPlay size={20} />,
      "ai-interview": <Mic size={20} />,
      "student-study-material": <BookCopy size={20} />,
      "student-assignment": <PenTool size={20} />,
      "admin-leaves": <LogOut size={20} />,
      "hms-dashboard": <LayoutDashboard size={20} />,
      "hostels": <Home size={20} />,
      "rooms": <DoorOpen size={20} />,
      "hostel-students": <GraduationCap size={20} />,
      "enrollment": <UserPlus size={20} />,
      "menu-management": <Utensils size={20} />,
      "issues": <AlertCircle size={20} />,
      "staff": <Users size={20} />,
      "wardens": <Shield size={20} />,
      "student-meals": <UtensilsCrossed size={20} />,
      "visitor_logs": <ClipboardSignature size={20} />,
      "gate-passes": <Ticket size={20} />,

      "announcement-management": <Megaphone size={20} />,
      "hod-announcement-management": <Megaphone size={20} />,
      "student-hostel-details": <Home size={20} />,
      "residents": <Users size={20} />,
      "transportation": <Bus size={20} />,
      "transport-buses": <BusFront size={20} />,
      "transport-routes": <Map size={20} />,
      "transport-drivers": <UserCheck size={20} />,
      "transport-allocations": <Users size={20} />,
      "transport-tracking": <Navigation size={20} />,
      "transport-incidents": <AlertTriangle size={20} />,
      "department-admin-leaves": <LogOut size={20} />,
      "manage-warden-leaves": <LogOut size={20} />,
      "driver-history": <History size={20} />,
      "driver-complaints": <AlertCircle size={20} />,
      "library": <Library size={20} />,
      "library-books": <BookCopy size={20} />,
      "library-circulation": <Repeat size={20} />,
      "upload-qp": <FilePlus size={20} />,
      "qp-approvals": <CheckSquare size={20} />,
      "library-fines": <CreditCard size={20} />,

      "admission-dashboard": <LayoutDashboard size={20} />,
      "campus-builder": <LayoutDashboard size={20} />,
      "admission-enquiries": <Users size={20} />,
      "admission-applications": <FileText size={20} />,
      "admission-students": <GraduationCap size={20} />,
      "admission-courses": <BookOpen size={20} />,
      "seat-matrix": <BarChart2 size={20} />,
      "admission-fees": <CreditCard size={20} />,
      "admission-documents": <FileText size={20} />,
      "admission-communication": <Bell size={20} />,
      "admission-reports": <BarChart2 size={20} />,
      "admission-settings": <Settings size={20} />,
      "counsellor-management": <UserCheck size={20} />,
      "google-setup": <Settings size={20} />,
      "schedule-class": <Calendar size={20} />,
      "schedule-meeting": <Calendar size={20} />,
      "holiday-calendar": <Calendar size={20} />,
      "class-schedule": <Calendar size={20} />,
      "act-as-teacher": <UserCheck size={20} />,
      "return-to-hod": <LogOut size={20} />,
      "alumni-directory": <GraduationCap size={20} />,
    };
    return iconMap[page] || <LayoutDashboard size={20} />;
  };

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";

  const userTier = PLAN_TIERS[(orgPlan || 'basic').toLowerCase()] || 1;
  const advanceRoles = ['transport_admin', 'driver', 'library_admin', 'admission_manager', 'hms', 'warden', 'counsellor'];

  const isRoleAllowed = !(advanceRoles.includes(role) && userTier < 3);

  const menuItems: { [key: string]: { name: string; page: string }[] } = {
    fees_manager: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Components", page: "components" },
      { name: "Templates", page: "templates" },
      { name: "Assignments", page: "assignments" },
      { name: "Bulk Assignment", page: "bulk-assignment" },
      { name: "Individual Fees", page: "individual-fees" },
      { name: "Invoices", page: "invoices" },
      { name: "Payments", page: "payments" },
      { name: "Student Fee Reports", page: "student-reports" },
      { name: "Reports", page: "reports" },
      { name: "Payroll Management", page: "payroll" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Payment Settings", page: "payment-settings" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Leave", page: "leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    principal: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Timetable Configuration", page: "timetable-config" },
      { name: getTerm("branches"), page: "branches" },
      { name: "Batches", page: "batches" },
      { name: "Faculty Assignments", page: "teacher-assignments" },
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Users", page: "users" },
      { name: "Bulk Upload Faculty", page: "bulk-upload" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: translateTerminology("CO/PO Attainment"), page: "co-attainment" },
      { name: "HOD Attendance", page: "hod-attendance" },
      { name: "Faculty Attendance", page: "faculty-attendance" },
      { name: "HOD Leaves", page: "hod-leaves" },
      { name: "Department Admin Leaves", page: "department-admin-leaves" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Reports", page: "reports" },
      { name: "Finance", page: "finance" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Staff Tasks", page: "staff-tasks" },
      { name: "Campus Locations", page: "campus-locations" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Alumni Directory", page: "alumni-directory" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Billing & Plans", page: "billing" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    org_admin: [
      { name: "Dashboard", page: "dashboard" },
      { name: getTerm("branches"), page: "branches" },
      { name: "Batches", page: "batches" },
      { name: "Faculty", page: "faculty" },
      { name: "Users", page: "users" },
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Today's Attendance", page: "attendance" },
      { name: "Exams", page: "exams" },
      { name: "Finance", page: "finance" },
      { name: "Payments", page: "payments" },
      { name: "Invoices", page: "invoices" },
      { name: "Reports", page: "reports" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Campus Locations", page: "campus-locations" },
      { name: "Billing & Plans", page: "billing" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Alumni Directory", page: "alumni-directory" },
      { name: "Staff Tasks", page: "staff-tasks" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    admin: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Timetable Configuration", page: "timetable-config" },
      { name: getTerm("branches"), page: "branches" },
      { name: "Batches", page: "batches" },
      { name: "Faculty Assignments", page: "teacher-assignments" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Users", page: "users" },
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Bulk Upload Faculty", page: "bulk-upload" },
      { name: "HOD Attendance", page: "hod-attendance" },
      { name: "Faculty Attendance", page: "faculty-attendance" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "HOD Leaves", page: "hod-leaves" },
      { name: "Department Admin Leaves", page: "department-admin-leaves" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Billing & Plans", page: "billing" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Staff Tasks", page: "staff-tasks" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Profile", page: "profile" },
    ],
    hod: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Semester Management", page: "semesters" },
      { name: "Courses", page: "subjects" },
      { name: "Elective Course Enrollment", page: "student-enrollment" },
      { name: "Faculty Assignments", page: "faculty-assignments" },
      { name: "Timetable", page: "timetable" },
      { name: "Students Enrollment", page: "students" },
      { name: translateTerminology("Proctors"), page: "proctors" },
      { name: "Syllabus Status", page: "syllabus-status" },
      { name: "Syllabus Monitor", page: "syllabus-monitor" },
      { name: "Low Attendance", page: "low-attendance" },
      { name: "Exam Applications", page: "exam-applications" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: translateTerminology("CO/PO Attainment"), page: "co-attainment" },
      { name: "Promotion Management", page: "promotion-management" },
      { name: "Study Material", page: "study-materials" },
      { name: `${getTerm("branch")} Announcements`, page: "hod-announcement-management" },
      { name: "Faculty Attendance", page: "faculty-attendance" },
      { name: "Faculty Leaves", page: "leaves" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Apply Leaves", page: "apply-leaves" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Staff Tasks", page: "staff-tasks" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Alumni Directory", page: "alumni-directory" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "hod-profile" },
      { name: "Act as Faculty", page: "act-as-teacher" },
    ],
    faculty: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Timetable", page: "timetable" },
      { name: "Take Attendance", page: "take-attendance" },
      { name: "Attendance Records", page: "attendance-records" },
      { name: "Upload Marks", page: "upload-marks" },
      { name: "Assignments", page: "faculty-assignments" },
      { name: "Study Material", page: "study-materials" },
      { name: "Syllabus Status", page: "syllabus-status" },
      { name: translateTerminology("CO/PO Attainment"), page: "co-attainment" },
      { name: "Exam Applications", page: "exam-applications" },
      { name: "Upload QP", page: "upload-qp" },
      { name: "Proctor Students", page: "proctor-students" },
      { name: "Manage Student Leave", page: "student-leave" },
      { name: "Announcements for Students", page: "faculty-announcement-management" },
      { name: "Schedule Class", page: "schedule-class" },
      { name: "Generate Statistics", page: "statistics" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "My Attendance", page: "faculty-attendance" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Staff Tasks", page: "staff-tasks" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "faculty-profile" },
    ],
    student: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Timetable", page: "timetable" },
      { name: "Class Schedule", page: "class-schedule" },
      { name: "Attendance", page: "attendance" },
      { name: "Study Materials", page: "student-study-material" },
      { name: "Assignments", page: "student-assignment" },
      { name: "Syllabus Status", page: "student-syllabus" },
      { name: "Internal Marks", page: "marks" },
      { name: "Revaluation", page: "revaluation" },
      { name: "Makeup Exam", page: "makeupexam" },
      { name: "Fees", page: "fees" },
      { name: "Announcements", page: "announcements" },
      { name: "Library", page: "library" },
      { name: "Hostel Details", page: "student-hostel-details" },
      { name: "Transportation", page: "transportation" },
      { name: "Leaves", page: "leave-request" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Profile", page: "profile" },
    ],
    parent: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Timetable", page: "timetable" },
      { name: "Syllabus Status", page: "student-syllabus" },
      { name: "Attendance", page: "attendance" },
      { name: "Assignments", page: "student-assignment" },
      { name: "Internal Marks", page: "marks" },
      { name: "Fees", page: "fees" },
      { name: "Hostel Details", page: "student-hostel-details" },
      { name: "Transportation", page: "transportation" },
      { name: "Announcements", page: "announcements" },
      { name: "Calendar", page: "holiday-calendar" },
    ],
    coe: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Exam Scheduling", page: "exam-scheduling" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: "Publish Results", page: "publish-results" },
      { name: "Publish Results (Reval/Makeup)", page: "publish-results-reval-makeup" },
      { name: "Revaluation Requests", page: "revaluation-requests" },
      { name: "Makeup Requests", page: "makeup-requests" },
      { name: "Student Status", page: "student-status" },
      { name: "Course Statistics", page: "course-statistics" },
      { name: translateTerminology("CO/PO Attainment"), page: "co-attainment" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Fee Settings", page: "fee-settings" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    dean: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Exams", page: "exams" },
      { name: translateTerminology("CO/PO Attainment"), page: "co-attainment" },
      { name: "Faculty", page: "faculty" },
      { name: "Today's Attendance", page: "attendance" },
      { name: "Attendance Filters", page: "attendance-filters" },
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Finance", page: "finance" },
      { name: "Campus Locations", page: "campus-locations" },
      { name: "Billing & Plans", page: "billing" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Alumni Directory", page: "alumni-directory" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Staff Tasks", page: "staff-tasks" },
      { name: "Admin Leaves", page: "admin-leaves" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Profile", page: "profile" },
    ],
    hms: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Hostels", page: "hostels" },
      { name: "Rooms", page: "rooms" },
      { name: "Enrollment", page: "enrollment" },
      { name: "Students", page: "students" },
      { name: "Outside Students", page: "outside-students" },
      { name: "Today's Menu", page: "student-meals" },
      { name: "Menu Management", page: "menu-management" },
      { name: "Issue Tracking", page: "issues" },
      { name: "Visitor Logs", page: "visitor_logs" },
      { name: "Staff", page: "staff" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "Warden Leaves", page: "manage-warden-leaves" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    warden: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Resident Management", page: "residents" },
      { name: "Gate Pass Requests", page: "gate-passes" },
      { name: "Issue Tracking", page: "issues" },
      { name: "Visitor Logs", page: "visitor_logs" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Meetings", page: "schedule-meeting" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    transport_admin: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Buses", page: "transport-buses" },
      { name: "Drivers", page: "transport-drivers" },
      { name: "Routes & Stops", page: "transport-routes" },
      { name: "Allocations", page: "transport-allocations" },
      { name: "Live Tracking", page: "transport-tracking" },
      { name: "Complaints", page: "transport-incidents" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Meetings", page: "schedule-meeting" },
      { name: "Driver Leaves", page: "manage-leaves" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    driver: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Trip History", page: "driver-history" },
      { name: "Announcements", page: "announcements" },
      { name: "Complaints", page: "driver-complaints" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    library_admin: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Announcements", page: "announcements" },
      { name: "Books Catalog", page: "library-books" },
      { name: "Circulation", page: "library-circulation" },
      { name: "Fine Management", page: "library-fines" },
      { name: "Meetings", page: "schedule-meeting" },
      { name: "Apply Leave", page: "apply-leave" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "Reimbursements & Claims", page: "reimbursements" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    admission_manager: [
      { name: "Dashboard", page: "admission-dashboard" },
      { name: "Courses", page: "admission-courses" },
      { name: "Enquiries", page: "admission-enquiries" },
      { name: "Applications", page: "admission-applications" },
      { name: "Students", page: "admission-students" },
      { name: "Documents", page: "admission-documents" },
      { name: "Counsellors", page: "counsellor-management" },
      { name: "Communication", page: "admission-communication" },
      { name: "Reports", page: "admission-reports" },
      { name: "Campus Page Management", page: "campus-builder" },
      { name: "Schedule Meeting", page: "schedule-meeting" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    counsellor: [
      { name: "Dashboard", page: "admission-dashboard" },
      { name: "Enquiries", page: "admission-enquiries" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Calendar", page: "holiday-calendar" },
      { name: "My Salary & Payroll", page: "my-payroll" },
      { name: "Profile", page: "profile" },
    ],
    outside_student: [
      { name: "Hostel Details", page: "student-hostel-details" },
      { name: "Profile", page: "profile" },
    ],
  };

  if (user?.role === 'hod') {
    if (role === 'faculty') {
      menuItems['faculty'] = menuItems['faculty'].filter(item => item.page !== 'apply-leave' && item.page !== 'faculty-attendance' && item.page !== 'reimbursements' && item.page !== 'my-payroll' && item.page !== 'staff-tasks');
      menuItems['faculty'].push({ name: "Return to HOD", page: "return-to-hod" });
    }
  }

  // Automatically scroll active sidebar item into view
  useEffect(() => {
    const roleItems = menuItems[role];
    if (!roleItems) return;

    const activeItem = roleItems.find((item) => isItemActive(item.page));
    if (!activeItem) return;

    const scrollTimeout = setTimeout(() => {
      try {
        const activeElement = document.getElementById(getSidebarId(activeItem.page));
        if (activeElement) {
          activeElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      } catch (err) {
        console.error("Failed to scroll active sidebar item into view:", err);
      }
    }, 150);

    return () => clearTimeout(scrollTimeout);
  }, [activePage, role]);

  const sidebarContent = (
    <motion.div
      className={`h-full w-64 flex flex-col border-r pb-[env(safe-area-inset-bottom,0px)] ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}
      initial={isMobile ? false : { x: -100, opacity: 0 }}
      animate={isMobile ? false : { x: 0, opacity: 1 }}
      transition={isMobile ? undefined : { duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        className={`px-4 pb-3 lg:pb-0 flex items-center border-b ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}
        style={{
          height: window.innerWidth >= 1024 ? '5rem' : undefined,
          paddingTop: Capacitor.isNativePlatform()
            ? 'calc(env(safe-area-inset-top, 24px) + 2px)'
            : window.innerWidth < 1024 ? '16px' : '0px'
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-lg border-2 border-primary ${theme === 'dark' ? 'bg-white' : ''}`}
            style={{ borderRadius: 8 }}
          >
            <img
              src={orgLogo}
              alt="Organization Logo"
              className="w-full h-full object-contain"
              style={{ borderRadius: '0.5rem' }}
            />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0"
              >
                <h3 className={`font-semibold text-lg whitespace-nowrap leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Campus ERP</h3>
                <p className={`text-[10px]  tracking-wider font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>By Stalight Technologies</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Child Switcher for Parents on Mobile */}
      {role === "parent" && childrenList.length > 1 && isMobile && (
        <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
          <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-2 px-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Select Student
          </label>
          <Select
            value={selectedChildId || undefined}
            onValueChange={(val) => {
              localStorage.setItem('selectedStudentId', val);
              setSelectedChildId(val);
              window.location.reload();
            }}
          >
            <SelectTrigger className={`w-full text-xs h-9 ${theme === 'dark'
              ? 'bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-1 focus:ring-primary'
              : 'bg-white border-gray-200 text-gray-700 focus:ring-1 focus:ring-primary'
              }`}>
              <SelectValue placeholder="Select Student" />
            </SelectTrigger>
            <SelectContent className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
              {childrenList.map((child: any) => (
                <SelectItem key={child.id} value={child.id.toString()} className="text-xs">
                  {child.name} ({child.usn || child.enrollment_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Menu Items */}
      <motion.div
        className="flex-1 overflow-y-auto py-4 thin-scrollbar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="space-y-1 px-3">
          {isRoleAllowed && menuItems[role]
            ?.filter(item => isPageAllowed(item.page, orgPlan, role) && (item.page === 'co-attainment' ? hasFeature('coAttainment') : true) && (item.page === 'student-enrollment' ? hasFeature('electives') : true))
            ?.map((item, index) => (
              <motion.div
                key={item.page}
                initial={isMobile ? false : { opacity: 0, x: -20 }}
                animate={isMobile ? false : { opacity: 1, x: 0 }}
                transition={isMobile ? undefined : { duration: 0.3, delay: 0.1 * index }}
              >
                <Button
                  id={getSidebarId(item.page)}
                  variant={isItemActive(item.page) ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 h-10 transition-all duration-200 ${isItemActive(item.page)
                    ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                    : theme === 'dark'
                      ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    } ${collapsed ? "px-2" : "px-3"}`}
                  onClick={() => handlePageChange(item.page)}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.1 }}
                  >
                    {getIcon(item.page)}
                  </motion.div>
                  <AnimatePresence>
                    {!collapsed && (
                      isMobile ? (
                        <span className="truncate">{item.name}</span>
                      ) : (
                        <motion.span
                          className="truncate"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.name}
                        </motion.span>
                      )
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            ))}
        </div>
      </motion.div>


      {/* Footer Actions (App Setup & Logout) */}
      <motion.div
        className={`p-3 border-t flex flex-col gap-1 ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >


        {/* Logout Button */}
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 h-10 transition-all duration-200 ${collapsed ? "px-2" : "px-3"} ${theme === 'dark'
            ? "text-red-400 hover:text-red-100 hover:bg-red-900/50"
            : "text-red-700 hover:text-red-800 hover:bg-red-200"
            }`}
          onClick={handleLogoutClick}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.1 }}
          >
            <LogOut size={20} />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </motion.div>
  );

  // For mobile/tablet - use overlay approach
  if (window.innerWidth < 1024) {
    return (
      <>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="fixed top-0 right-0 bottom-0 left-0 bg-black/50 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={toggleCollapse}
            />
          )}
        </AnimatePresence>
        <motion.div
          className={`fixed top-0 bottom-0 left-0 z-40 shadow-2xl w-64 ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}
          initial={{ x: "-100%" }}
          animate={{ x: collapsed ? "-100%" : "0%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ bottom: 0, left: 0, position: 'fixed' }}
        >
          {sidebarContent}
        </motion.div>
        {/* Logout Dialog - rendered at root level for proper z-index */}
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
          <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
            <DialogContent
              className={`w-[90%] sm:w-full max-w-md mx-auto rounded-lg ${theme === 'dark'
                ? "bg-background border-border text-foreground"
                : "bg-white border-gray-200 text-gray-900"
                }`}
            >
              <DialogHeader className="space-y-2">
                <DialogTitle className={`text-lg md:text-xl font-semibold ${theme === 'dark' ? "text-foreground" : "text-gray-900"
                  }`}>
                  Confirm Logout
                </DialogTitle>
                <DialogDescription className={`text-sm md:text-base ${theme === 'dark' ? "text-muted-foreground" : "text-gray-500"
                  }`}>
                  Are you sure you want to log out?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowLogoutDialog(false)}
                  className={`w-full sm:w-auto ${theme === 'dark'
                    ? "border-border text-foreground hover:bg-accent"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmLogout}
                  className={`w-full sm:w-auto ${theme === 'dark'
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                >
                  Logout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </>
    );
  }

  // For desktop - show collapsible sidebar
  return (
    <>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="fixed top-0 bottom-0 left-0 w-64 z-30 shadow-xl overflow-hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Logout Dialog - rendered at root level for proper z-index */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogContent
            className={`w-[90%] sm:w-full max-w-md mx-auto rounded-lg ${theme === 'dark'
              ? "bg-background border-border text-foreground"
              : "bg-white border-gray-200 text-gray-900"
              }`}
          >
            <DialogHeader className="space-y-2">
              <DialogTitle className={`text-lg md:text-xl font-semibold ${theme === 'dark' ? "text-foreground" : "text-gray-900"
                }`}>
                Confirm Logout
              </DialogTitle>
              <DialogDescription className={`text-sm md:text-base ${theme === 'dark' ? "text-muted-foreground" : "text-gray-500"
                }`}>
                Are you sure you want to log out?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowLogoutDialog(false)}
                className={`w-full sm:w-auto ${theme === 'dark'
                  ? "border-border text-foreground hover:bg-accent"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmLogout}
                className={`w-full sm:w-auto ${theme === 'dark'
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Sidebar;