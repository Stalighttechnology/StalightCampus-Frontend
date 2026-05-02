import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import Chat from "../common/Chat";
import { logoutUser } from "../../utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonCard } from "../ui/skeleton";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";

// Lazy load student components for code splitting
const StudentStats = lazy(() => import("../student/StudentStats"));
const StudentTimetable = lazy(() => import("../student/StudentTimetable"));
const StudentAttendance = lazy(() => import("../student/StudentAttendance"));
const InternalMarks = lazy(() => import("../student/InternalMarks"));
const SubmitLeaveRequest = lazy(() => import("../student/SubmitLeaveRequest"));
const StudentProfile = lazy(() => import("../student/StudentProfile"));
const StudentAnnouncements = lazy(() => import("../student/StudentAnnouncements"));
const StudentNotifications = lazy(() => import("../student/StudentNotifications"));
const FaceRecognition = lazy(() => import("../student/FaceRecognition"));
const StudentDashboardOverview = lazy(() => import("../student/StudentDashboardOverview"));
const StudyMaterialsStudent = lazy(() => import("../student/StudyMaterial"));
const StudentAssignments = lazy(() => import("../student/StudentAssignments"));
const AIInterview = lazy(() => import("../student/AIInterview"));
const StudentHostelDetails = lazy(() => import("../student/StudentHostelDetails"));
const StudentFees = lazy(() => import("../student/StudentFees"));
import PaymentSuccess from "../common/PaymentSuccess";
import PaymentCancel from "../common/PaymentCancel";
import Revaluation from "../common/Revaluation";
import MakeupExam from "../common/MakeupExam";

// Loading fallback component
const LoadingFallback = () => (
  <div className="p-6 space-y-6">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
);

interface StudentDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const StudentDashboard = ({ user, setPage }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  // Get active page from URL path
  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/', '');
    if (path === '' || path === 'dashboard') return 'dashboard';
    return path;
  };

  const activePage = getActivePageFromPath(location.pathname);

  // Handle page changes by updating URL
  const handlePageChange = (page: string) => {
    console.log("Changing page to:", page); // Debug log
    const path = page === 'dashboard' ? '/dashboard' : `/${page}`;
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to log out. Please try again.");
    }
  };

  const handleNotificationClick = () => {
    navigate('/announcements');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";
    
    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <StudentDashboardOverview setPage={handlePageChange} user={user} />;
      case "timetable":
        return <StudentTimetable />;
      case "attendance":
        return <StudentAttendance />;
      case "marks":
        return <InternalMarks />;
      case "leave-request":
        return <SubmitLeaveRequest />;
      case "leave-status":
        return <SubmitLeaveRequest />;
      case "leave":
        return <SubmitLeaveRequest />;
      case "fees":
        return <StudentFees user={user} />;
      case "payment-success":
        return <PaymentSuccess setPage={handlePageChange} />;
      case "payment-cancel":
        return <PaymentCancel setPage={handlePageChange} />;
      case "profile":
        return <StudentProfile />;
      case "announcements":
        return <StudentAnnouncements />;
      case "notifications":
        return <StudentNotifications />;
      case "face-recognition":
        return <FaceRecognition />;
      case "student-study-material":
        return <StudyMaterialsStudent />;
      case "student-assignment":
        return <StudentAssignments />;
      case "study-mode":
        return <Chat role="student" />;
      case "ai-interview":
        return <AIInterview />;
      case "revaluation":
        return <Revaluation />;
      case "makeupexam":
        return <MakeupExam />;
      case "student-hostel-details":
        return <StudentHostelDetails />;
      default:
        return <StudentDashboardOverview setPage={handlePageChange} user={user} />;
    }
  };

  return (
    <DashboardLayout
      role="student"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      onNotificationClick={handleNotificationClick}
      pageTitle="Student Dashboard"
    >
      {error && (
        <div className={`p-3 rounded-lg mb-4 shadow ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {error}
        </div>
      )}
      <Suspense fallback={<LoadingFallback />}>
        <div className="grid gap-6">{renderContent()}</div>
      </Suspense>
    </DashboardLayout>
  );
};

export default StudentDashboard;