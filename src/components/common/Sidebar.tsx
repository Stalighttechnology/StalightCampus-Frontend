//sidebar.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Use public directory asset via URL
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { isPageAllowed } from "../../utils/planGating";
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
  Receipt,
  Search,
  Mic,
  Home,
  Utensils,
  AlertCircle,
  Shield,
  Bus,
  Smartphone,
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
      'exam-applications': <ClipboardList size={20} />,
      dashboard: <LayoutDashboard size={20} />,
      overview: <LayoutDashboard size={20} />,
      components: <ClipboardList size={20} />,
      templates: <FileText size={20} />,
      assignments: <UserCheck size={20} />,
      "individual-fees": <UserCheck size={20} />,
      "bulk-assignment": <Users size={20} />,
      invoices: <Receipt size={20} />,
      payments: <CreditCard size={20} />,
      "promotion-management": <UserCheck size={20} />,
      "enroll-user": <User size={20} />,
      "bulk-upload": <Upload size={20} />,
      branches: <GitBranch size={20} />,
      "teacher-assignments": <UserCheck size={20} />,
      notifications: <Bell size={20} />,
      "hod-leaves": <UserCheck size={20} />,
      users: <Users size={20} />,
      profile: <User size={20} />,
      "admin-profile": <User size={20} />,
      "hod-profile": <User size={20} />,
      "faculty-profile": <User size={20} />,
      "low-attendance": <BarChart2 size={20} />,
      semesters: <Calendar size={20} />,
      students: <GraduationCap size={20} />,
      subjects: <BookOpen size={20} />,
      "faculty-assignments": <ClipboardList size={20} />,
      timetable: <Calendar size={20} />,
      leaves: <FileText size={20} />,
      "apply-leaves": <FileText size={20} />,
      attendance: <BarChart2 size={20} />,
      marks: <BarChart2 size={20} />,
      "study-materials": <BookOpen size={20} />,
      "scan-student-info": <Search size={20} />,
      proctors: <UserCheck size={20} />,

      "take-attendance": <BarChart2 size={20} />,
      "upload-marks": <Upload size={20} />,
      "co-attainment": <BarChart2 size={20} />,
      "apply-leave": <FileText size={20} />,
      "attendance-records": <BarChart2 size={20} />,
      "faculty-attendance": <UserCheck size={20} />,
      announcements: <Bell size={20} />,
      revaluation: <ClipboardList size={20} />,
      makeupexam: <FileText size={20} />,
      "proctor-students": <UserCheck size={20} />,
      "student-leave": <FileText size={20} />,
      statistics: <BarChart2 size={20} />,
      "leave-request": <FileText size={20} />,
      "leave-status": <FileText size={20} />,
      certificates: <FileText size={20} />,
      fees: <CreditCard size={20} />,
      "exam-schedule": <Calendar size={20} />,
      reports: <BarChart2 size={20} />,
      "study-mode": <BookOpen size={20} />,
      "ai-interview": <Mic size={20} />,
      "student-study-material": <FileText size={20} />,
      "student-assignment": <ClipboardList size={20} />,
      "admin-leaves": <FileText size={20} />,
      "hms-dashboard": <LayoutDashboard size={20} />,
      "hostels": <GitBranch size={20} />,
      "rooms": <UserCheck size={20} />,
      "hostel-students": <GraduationCap size={20} />,
      "enrollment": <UserCheck size={20} />,
      "menu-management": <Utensils size={20} />,
      "issues": <AlertCircle size={20} />,
      "staff": <Users size={20} />,
      "wardens": <Shield size={20} />,
      "student-meals": <Utensils size={20} />,
      "visitor_logs": <FileText size={20} />,

      "announcement-management": <Bell size={20} />,
      "hod-announcement-management": <Bell size={20} />,
      "student-hostel-details": <Home size={20} />,
      "residents": <Users size={20} />,
      "transportation": <Bus size={20} />,
      "transport-buses": <Bus size={20} />,
      "transport-routes": <GitBranch size={20} />,
      "transport-drivers": <UserCheck size={20} />,
      "transport-allocations": <Users size={20} />,
      "transport-tracking": <BarChart2 size={20} />,
      "transport-incidents": <AlertCircle size={20} />,
      "driver-history": <Calendar size={20} />,
      "driver-complaints": <AlertCircle size={20} />,
      "library": <BookOpen size={20} />,
      "library-books": <BookOpen size={20} />,
      "library-circulation": <Users size={20} />,
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
      "google-setup": <Settings size={20} />,
      "schedule-class": <Calendar size={20} />,
      "class-schedule": <Calendar size={20} />,
    };
    return iconMap[page] || <LayoutDashboard size={20} />;
  };

  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";

  const menuItems: { [key: string]: { name: string; page: string }[] } = {
    fees_manager: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Components", page: "components" },
      { name: "Templates", page: "templates" },
      { name: "Assignments", page: "assignments" },
      { name: "Individual Fees", page: "individual-fees" },
      { name: "Bulk Assignment", page: "bulk-assignment" },
      { name: "Invoices", page: "invoices" },
      { name: "Payments", page: "payments" },
      { name: "Payment Settings", page: "payment-settings" },
      { name: "Leave", page: "leave" },
      { name: "Reports", page: "reports" },
      { name: "Student Fee Reports", page: "student-reports" },
      { name: "Profile", page: "profile" },
    ],
    principal: [
      // Main
      { name: "Dashboard", page: "dashboard" },

      // User Management
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Bulk Upload Faculty", page: "bulk-upload" },

      // Academic Structure
      { name: "Branches", page: "branches" },
      { name: "Faculty Assignments", page: "teacher-assignments" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: "Batches", page: "batches" },

      // Communication
      { name: "Announcement Management", page: "announcement-management" },

      // Leaves
      { name: "HOD Leaves", page: "hod-leaves" },
      { name: "HOD Attendance", page: "hod-attendance" },
      { name: "Faculty Attendance", page: "faculty-attendance" },

      { name: "My Attendance", page: "my-attendance" },
      { name: "Apply Leave", page: "apply-leave" },

      // Integrations
      { name: "Google Setup", page: "google-setup" },

      // User & Profile
      { name: "Users", page: "users" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Profile", page: "profile" },
    ],
    org_admin: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Users", page: "users" },
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Billing & Plans", page: "billing" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Branches", page: "branches" },
      { name: "Batches", page: "batches" },
      { name: "Announcement Management", page: "announcement-management" },
      { name: "Today's Attendance", page: "attendance" },
      { name: "Exams", page: "exams" },
      { name: "Faculty", page: "faculty" },
      { name: "Finance", page: "finance" },
      { name: "Invoices", page: "invoices" },
      { name: "Payments", page: "payments" },
      { name: "Reports", page: "reports" },
      { name: "Profile", page: "profile" },
    ],
    admin: [
      // Main
      { name: "Dashboard", page: "dashboard" },

      // User Management
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Bulk Upload Faculty", page: "bulk-upload" },

      // Academic Structure
      { name: "Branches", page: "branches" },
      { name: "Faculty Assignments", page: "teacher-assignments" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: "Batches", page: "batches" },

      // Communication
      { name: "Announcement Management", page: "announcement-management" },

      // Leaves
      { name: "HOD Leaves", page: "hod-leaves" },
      { name: "HOD Attendance", page: "hod-attendance" },
      { name: "Faculty Attendance", page: "faculty-attendance" },

      { name: "My Attendance", page: "my-attendance" },
      { name: "Apply Leave", page: "apply-leave" },

      // Integrations


      // User & Profile
      { name: "Users", page: "users" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Profile", page: "profile" },
    ],

    hod: [
      // Main
      { name: "Dashboard", page: "dashboard" },

      // Academic Management
      { name: "Semester Management", page: "semesters" },
      { name: "Students Enrollment", page: "students" },
      { name: "Elective Course Enrollment", page: "student-enrollment" },
      { name: "Courses", page: "subjects" },
      { name: "Faculty Assignments", page: "faculty-assignments" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: "Timetable", page: "timetable" },
      { name: "Proctors", page: "proctors" },

      // Attendance & Marks
      // { name: "Attendance", page: "attendance" },

      { name: "Low Attendance", page: "low-attendance" },
      { name: "CO Attainment", page: "co-attainment" },
      { name: "Exam Applications", page: "exam-applications" },
      { name: "Faculty Attendance", page: "faculty-attendance" },
      { name: "My Attendance", page: "my-attendance" },
      { name: "Promotion Management", page: "promotion-management" },

      // Leaves
      { name: "Faculty Leaves", page: "leaves" },
      { name: "Apply Leaves", page: "apply-leaves" },

      // Resources & Communication
      { name: "Study Material", page: "study-materials" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Branch Announcements", page: "hod-announcement-management" },

      // Profile
      { name: "Profile", page: "hod-profile" },
    ],

    faculty: [
      // Main
      { name: "Dashboard", page: "dashboard" },

      // Attendance & Marks
      { name: "Take Attendance", page: "take-attendance" },
      { name: "Attendance Records", page: "attendance-records" },
      { name: "My Attendance", page: "faculty-attendance" },
      { name: "Upload Marks", page: "upload-marks" },
      { name: "Upload QP", page: "upload-qp" },
      { name: "CO Attainment", page: "co-attainment" },
      { name: "Generate Statistics", page: "statistics" },

      // Leave Management
      { name: "Apply Leave", page: "apply-leave" },
      { name: "Manage Student Leave", page: "student-leave" },

      // Academic
      { name: "Timetable", page: "timetable" },
      { name: "Assignments", page: "faculty-assignments" },
      { name: "Exam Applications", page: "exam-applications" },
      // { name: "Revaluation", page: "revaluation" },
      // { name: "Makeup Exam", page: "makeupexam" },
      { name: "Proctor Students", page: "proctor-students" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Study Material", page: "study-materials" },
      { name: "Announcements for Students", page: "faculty-announcement-management" },
      { name: "Schedule Class", page: "schedule-class" },

      // Profile
      { name: "Profile", page: "faculty-profile" },
    ],

    student: [
      // Main
      { name: "Dashboard", page: "dashboard" },
      // Academic
      { name: "Timetable", page: "timetable" },
      { name: "Attendance", page: "attendance" },
      { name: "Internal Marks", page: "marks" },
      { name: "Study Materials", page: "student-study-material" },
      { name: "Assignments", page: "student-assignment" },
      { name: "Revaluation", page: "revaluation" },
      { name: "Makeup Exam", page: "makeupexam" },
      { name: "Fees", page: "fees" },
      // Hostel Details
      { name: "Hostel Details", page: "student-hostel-details" },
      // Transportation
      { name: "Transportation", page: "transportation" },
      // Library
      { name: "Library", page: "library" },

      // Communication
      { name: "Announcements", page: "announcements" },

      // Leave Management
      { name: "Leaves", page: "leave-request" },
      { name: "Class Schedule", page: "class-schedule" },

      // Profile
      { name: "Profile", page: "profile" },
    ],

    coe: [
      // Main
      { name: "Dashboard", page: "dashboard" },

      // Leave Management
      { name: "Apply Leave", page: "apply-leave" },

      // Exam Management
      { name: "Student Status", page: "student-status" },
      { name: "Course Statistics", page: "course-statistics" },
      { name: "Makeup Requests", page: "makeup-requests" },
      { name: "Revaluation Requests", page: "revaluation-requests" },
      { name: "Question Paper Approvals", page: "qp-approvals" },
      { name: "Publish Results", page: "publish-results" },
      { name: "Publish Results (Reval/Makeup)", page: "publish-results-reval-makeup" },
      { name: "Exam Scheduling", page: "exam-scheduling" },

      { name: "Scan for Student Info", page: "scan-student-info" },

      // Profile
      { name: "Fee Settings", page: "fee-settings" },
      { name: "Profile", page: "profile" },
    ],
    dean: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Enroll Staff", page: "enroll-user" },
      { name: "Today's Attendance", page: "attendance" },
      { name: "Attendance Filters", page: "attendance-filters" },
      { name: "Scan for Student Info", page: "scan-student-info" },
      { name: "Exams", page: "exams" },
      { name: "Faculty", page: "faculty" },
      { name: "Finance", page: "finance" },
      { name: "Campus Locations", page: "campus-locations" },
      { name: "Admin Leaves", page: "admin-leaves" },
      { name: "Profile", page: "profile" },
    ],
    hms: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Hostels", page: "hostels" },
      { name: "Rooms", page: "rooms" },
      { name: "Students", page: "students" },
      { name: "Enrollment", page: "enrollment" },
      { name: "Staff", page: "staff" },
      { name: "Menu Management", page: "menu-management" },
      { name: "Today's Menu", page: "student-meals" },
      { name: "Issue Tracking", page: "issues" },
      { name: "Visitor Logs", page: "visitor_logs" },
      { name: "Profile", page: "profile" },
    ],
    warden: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Resident Management", page: "residents" },
      { name: "Issue Tracking", page: "issues" },
      { name: "Visitor Logs", page: "visitor_logs" },
      { name: "Profile", page: "profile" },
    ],
    transport_admin: [
      { name: "Overview", page: "dashboard" },
      { name: "Buses", page: "transport-buses" },
      { name: "Routes & Stops", page: "transport-routes" },
      { name: "Drivers", page: "transport-drivers" },
      { name: "Allocations", page: "transport-allocations" },
      { name: "Live Tracking", page: "transport-tracking" },
      { name: "Complaints", page: "transport-incidents" },
      { name: "Profile", page: "profile" },
    ],
    driver: [
      { name: "Dashboard", page: "dashboard" },
      { name: "Trip History", page: "driver-history" },
      { name: "Complaints", page: "driver-complaints" },
      { name: "Profile", page: "profile" },
    ],
    library_admin: [
      { name: "Overview", page: "dashboard" },
      { name: "Books Catalog", page: "library-books" },
      { name: "Circulation", page: "library-circulation" },
      { name: "Fine Management", page: "library-fines" },
      { name: "Profile", page: "profile" },
    ],
    admission_manager: [
      { name: "Dashboard", page: "admission-dashboard" },
      { name: "Campus Page Management", page: "campus-builder" },
      { name: "Enquiries", page: "admission-enquiries" },
      { name: "Applications", page: "admission-applications" },
      { name: "Students", page: "admission-students" },
      { name: "Courses", page: "admission-courses" },
      { name: "Seat Matrix", page: "seat-matrix" },
      { name: "Fees", page: "admission-fees" },
      { name: "Documents", page: "admission-documents" },
      { name: "Communication", page: "admission-communication" },
      { name: "Reports", page: "admission-reports" },
      { name: "Settings", page: "admission-settings" },
      { name: "Profile", page: "profile" },
    ],
  };

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
      className={`h-full flex flex-col border-r pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}
      initial={isMobile ? false : { x: -100, opacity: 0 }}
      animate={isMobile ? false : { x: 0, opacity: 1 }}
      transition={isMobile ? undefined : { duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        className={`h-20 px-4 flex items-center border-b ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}
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
              src="/logo.jpeg"
              alt="Logo"
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
                <h3 className={`font-bold text-lg whitespace-nowrap leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Campus ERP</h3>
                <p className={`text-[10px] uppercase tracking-wider font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>By Stalight</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        className="flex-1 overflow-y-auto py-4 thin-scrollbar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="space-y-1 px-3">
          {menuItems[role]
            ?.filter(item => isPageAllowed(item.page, orgPlan))
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
        {/* App Setup Button */}
        {!isNotificationsEnabled && (
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-10 relative transition-all duration-200 ${collapsed ? "px-2" : "px-3"} ${theme === 'dark'
              ? "text-blue-400 hover:text-blue-100 hover:bg-blue-900/50"
              : "text-blue-700 hover:text-blue-800 hover:bg-blue-100"
              }`}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open_pwa_installer'));
              setShowPwaBadge(false); // Optimistically hide the badge when they click
            }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.1 }}
              className="relative"
            >
              <Smartphone size={20} />
              {showPwaBadge && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  App Setup
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )}

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
              className="fixed inset-0 bg-black/50 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={toggleCollapse}
            />
          )}
        </AnimatePresence>
        <motion.div
          className={`fixed top-0 left-0 h-full z-40 shadow-2xl ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}
          initial={{ x: "-100%" }}
          animate={{ x: collapsed ? "-100%" : "0%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
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
            className="fixed top-0 left-0 h-screen w-64 z-30 shadow-xl overflow-hidden"
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