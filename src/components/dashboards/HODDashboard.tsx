import FacultyPayroll from "../faculty/FacultyPayroll";
//HODDashboard.tsx

import { useState, useEffect, Component, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import HODStats from "../hod/HODStats";
import LowAttendance from "../hod/LowAttendance";
import SemesterManagement from "../hod/SemesterManagement";
import StudentManagement from "../hod/StudentManagement";
import SubjectManagement from "../hod/SubjectManagement";
import FacultyAssignments from "../hod/FacultyAssignments";
import Timetable from "../hod/Timetable";
import LeaveManagement from "../hod/LeaveManagement";
import ApplyLeave from "../faculty/ApplyLeave";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import AttendanceView from "../hod/AttendanceView";
import MarksView from "../hod/MarksView";
import NotificationsManagement from "../hod/NotificationsManagement";
import ProctorManagement from "../hod/ProctorManagement";
import Chat from "../common/Chat";
import HodProfile from "../hod/HodProfile";
import { logoutUser } from "../../utils/authService";
import StudyMaterial from "../hod/StudyMaterial";
import PromotionManagement from "../hod/PromotionManagement";
import AdminFacultyAttendanceView from "../admin/AdminFacultyAttendanceView";
import HODMyAttendance from "../hod/HODMyAttendance";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import StudentEnrollment from "../hod/StudentEnrollment";
import QPApprovals from "../hod/QPApprovals";
import HODAnnouncementManagement from "../hod/HODAnnouncementManagement";
import ExamApplication from "../hod/ExamApplication";
import COAttainment from "../hod/COAttainment";
import HODSyllabusTracker from "../hod/HODSyllabusTracker";
import HODSemesterMonitor from "../hod/HODSemesterMonitor";
import { HODBootstrapProvider } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";
import { isPageAllowed } from "../../utils/planGating";
import { getHODDashboardBootstrap } from "../../utils/hod_api";
import UpgradeRequired from "../common/UpgradeRequired";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import ScheduleMeeting from "../common/ScheduleMeeting";
import StaffTaskTracker from "../common/StaffTaskTracker";
import AlumniDirectory from "../common/AlumniDirectory";
import { InventoryHub } from "../inventory/InventoryHub";

interface HODUser {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  branch?: string;
  branch_id?: string;
}

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface BootstrapData {
  branch_id?: string;
  semesters?: Semester[];
  sections?: Section[];
}

interface HODDashboardProps {
  user: HODUser;
  setPage: (page: string) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-6 text-red-500">
          <h2>Error: {this.state.errorMessage}</h2>
          <p>Please try refreshing the page or contact support.</p>
        </div>);

    }
    return this.props.children;
  }
}

const validateUser = (user: HODUser): boolean => {
  return !!(user && user.role === "hod"); // Only require role to be 'hod'
};

const HODDashboard = ({ user, setPage }: HODDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth } = useAuth();

  const getActivePageFromPath = (pathname: string): string => {
    const pathParts = pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';

    // Map URL paths to page names
    const pathMap: {[key: string]: string;} = {
      'hod': 'dashboard',
      'my-payroll': 'my-payroll',
      'staff-tasks': 'staff-tasks',
      'dashboard': 'dashboard',
      'holiday-calendar': 'holiday-calendar',
      'promotion-management': 'promotion-management',
      'low-attendance': 'low-attendance',
      'student-enrollment': 'student-enrollment',
      'semesters': 'semesters',
      'students': 'students',
      'subjects': 'subjects',
      'faculty-assignments': 'faculty-assignments',
      'timetable': 'timetable',
      'leaves': 'leaves',
      'apply-leaves': 'apply-leaves',
      'reimbursements': 'reimbursements',
      'attendance': 'attendance',
      'faculty-attendance': 'faculty-attendance',
      'my-attendance': 'my-attendance',
      'marks': 'marks',
      'notifications': 'notifications',
      'proctors': 'proctors',
      'chat': 'chat',
      'study-materials': 'study-materials',
      'scan-student-info': 'scan-student-info',
      'hod-profile': 'hod-profile',
      'qp-approvals': 'qp-approvals',
      'hod-announcement-management': 'hod-announcement-management',
      'co-attainment': 'co-attainment',
      'exam-applications': 'exam-applications',
      'syllabus-status': 'syllabus-status',
      'syllabus-monitor': 'syllabus-monitor',
      'schedule-meeting': 'schedule-meeting',
      'alumni-directory': 'alumni-directory',
      'external-links': 'external-links'
    };

    return pathMap[lastPart] || lastPart || 'dashboard';
  };

  const [activePage, setActivePage] = useState<string>(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const { theme } = useTheme();

  // Update active page when location changes
  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setError(null);

    // Navigate to the corresponding URL path
    const pathMap: {[key: string]: string;} = {
      'my-payroll': '/hod/my-payroll',
      'dashboard': '/hod/dashboard',
      'holiday-calendar': '/hod/holiday-calendar',
      'promotion-management': '/hod/promotion-management',
      'low-attendance': '/hod/low-attendance',
      'semesters': '/hod/semesters',
      'students': '/hod/students',
      'student-enrollment': '/hod/student-enrollment',
      'subjects': '/hod/subjects',
      'faculty-assignments': '/hod/faculty-assignments',
      'timetable': '/hod/timetable',
      'leaves': '/hod/leaves',
      'apply-leaves': '/hod/apply-leaves',
      'reimbursements': '/hod/reimbursements',
      'attendance': '/hod/attendance',
      'faculty-attendance': '/hod/faculty-attendance',
      'my-attendance': '/hod/my-attendance',
      'marks': '/hod/marks',
      'notifications': '/hod/notifications',
      'proctors': '/hod/proctors',
      'chat': '/hod/chat',
      'study-materials': '/hod/study-materials',
      'scan-student-info': '/hod/scan-student-info',
      'hod-profile': '/hod/hod-profile',
      'qp-approvals': '/hod/qp-approvals',
      'hod-announcement-management': '/hod/hod-announcement-management',
      'co-attainment': '/hod/co-attainment',
      'exam-applications': '/hod/exam-applications',
      'syllabus-status': '/hod/syllabus-status',
      'syllabus-monitor': '/hod/syllabus-monitor',
      'act-as-teacher': '/faculty/dashboard',
      'schedule-meeting': '/hod/schedule-meeting',
      'staff-tasks': '/hod/staff-tasks',
      'alumni-directory': '/hod/alumni-directory',
      'external-links': '/hod/external-links'
    };

    const path = pathMap[page] || `/hod/${page}`;
    navigate(path);
  };

  const handleNotificationClick = () => {
    setActivePage("notifications");
  };

  const handleLogout = async () => {
    try {
      const response = await logoutUser();
      if (response.success) {
        clearAuth();
        navigate("/", { replace: true }); // Redirect to home
      } else {
        setError(response.message || "Failed to log out. Please try again.");
      }
    } catch (error) {

      setError("Failed to log out. Please try again.");
    }
  };



  // ... (inside HODDashboard component)
  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";

    // Plan Gating Check
    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <HODStats setError={setError} setPage={handlePageChange} />;
      case "promotion-management":
        return <PromotionManagement />;
      case "low-attendance":
        return <LowAttendance setError={setError} />;
      case "semesters":
        return <SemesterManagement />;
      case "students":
        return <StudentManagement />;
      case "student-enrollment":
        return <StudentEnrollment />;
      case "subjects":
        return <SubjectManagement />;
      case "faculty-assignments":
        return <FacultyAssignments setError={setError} />;
      case "timetable":
        return <Timetable />;
      case "leaves":
        return <LeaveManagement />;
      case "apply-leaves":
        return <ApplyLeave />;
      case "reimbursements":
        return <EmployeeReimbursements />;
      case "attendance":
        return <AttendanceView />;
      case "faculty-attendance":
        return <AdminFacultyAttendanceView />;
      case "my-attendance":
        return <HODMyAttendance />;
      case "marks":
        return <MarksView />;
      case "notifications":
        return <NotificationsManagement />;
      case "proctors":
        return <ProctorManagement />;
      case "chat":
        return <Chat role="hod" />;
      case "study-materials":
        return <StudyMaterial />;
      case "scan-student-info":
        return <StudentInfoScanner />;
      case "alumni-directory":
        console.log("HODDashboard user object:", user);
        return <AlumniDirectory userRole="hod" userBranchId={user.branch || (user as any).department || (user as any)?.extra?.branch_id?.toString() || user.branch_id?.toString() || (user as any).hod_profile?.branch?.id?.toString()} />;
      case "hod-announcement-management":
        return <HODAnnouncementManagement />;
      case "hod-profile":
        return <HodProfile user={user} setError={setError} />;
      case "qp-approvals":
        return <QPApprovals />;
      case "co-attainment":
        return <COAttainment />;
      case "exam-applications":
        return <ExamApplication />;
      case "syllabus-status":
        return <HODSyllabusTracker />;
      case "syllabus-monitor":
        return <HODSemesterMonitor />;
            case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="hod" />;
      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "inventory":
        return <InventoryHub role="hod" />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "hod"} />;
      default:
        return <HODStats setError={setError} setPage={handlePageChange} />;
    }
  };

  return (
    <HODBootstrapProvider value={bootstrap}>
      <TutorialController />
      <DashboardLayout
        role="hod"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={handleNotificationClick}
        pageTitle="HOD Dashboard">
        
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </DashboardLayout>
    </HODBootstrapProvider>);

};

export default HODDashboard;