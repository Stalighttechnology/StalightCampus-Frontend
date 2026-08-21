import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import FacultyStats from "../faculty/FacultyStats";
import TakeAttendance from "../faculty/TakeAttendance";
import UploadMarks from "../faculty/UploadMarks";
import UploadQP from "../faculty/UploadQP";
import COAttainment from "../faculty/COAttainment";
import ApplyLeave from "../faculty/ApplyLeave";
import AttendanceRecords from "../faculty/AttendanceRecords";
import ProctorStudents from "../faculty/ProctorStudents";
import ExamApplication from "../faculty/ExamApplication";
import ManageStudentLeave from "../faculty/ManageStudentLeave";
import Timetable from "../faculty/Timetable";
import Chat from "../common/Chat";
import FacultyProfile from "../faculty/facultyProfile";
import GenerateStatistics from "../faculty/GenerateStatistics";
import FacultyAttendance from "../faculty/FacultyAttendance";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import StudyMaterial from "../faculty/StudyMaterial";
import { logoutUser, fetchWithTokenRefresh } from "../../utils/authService";
import FacultyAnnouncementManagement from "../faculty/FacultyAnnouncementManagement";
import FacultyAssignments from "../faculty/FacultyAssignments";
import ScheduleClass from "../faculty/ScheduleClass";
import SyllabusTracker from "../faculty/SyllabusTracker";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import { API_ENDPOINT } from "../../utils/config";
import { useTheme } from "../../context/ThemeContext";
import { useProctorStudentsQuery } from "../../hooks/useApiQueries";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import { useAuth } from "../../context/AuthContext";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import ScheduleMeeting from "../common/ScheduleMeeting";
import FacultyPayroll from "../faculty/FacultyPayroll";
import StaffTaskTracker from "../common/StaffTaskTracker";

interface FacultyDashboardProps {
  user: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    profile_picture?: string | null;
    branch?: string;
  };
  setPage: (page: string) => void;
}

const FacultyDashboard = ({ user, setPage }: FacultyDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);
  const branchName = (currentUser?.branch_name || currentUser?.branch || '').toString().toLowerCase();
  const deptName = (currentUser?.department || '').toString().toLowerCase();
  const isNonTeaching = branchName.includes('non-teaching') || branchName.includes('non teaching') || deptName.includes('non-teaching') || deptName.includes('non teaching');

  const getActivePageFromPath = (pathname: string): string => {
    const pathParts = pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';

    // Map URL paths to page names
    const pathMap: {[key: string]: string;} = {
      'dashboard': 'dashboard',
      'holiday-calendar': '/faculty/holiday-calendar',
      'holiday-calendar': 'holiday-calendar',
      'take-attendance': 'take-attendance',
      'upload-marks': 'upload-marks',
      'upload-qp': 'upload-qp',
      'co-attainment': 'co-attainment',
      'apply-leave': 'apply-leave',
      'attendance-records': 'attendance-records',
      'faculty-attendance': 'faculty-attendance',
      'announcements': 'faculty-announcement-management',
      'proctor-students': 'proctor-students',
      'exam-applications': 'exam-applications',
      'student-leave': 'student-leave',
      'timetable': 'timetable',
      'chat': 'chat',
      'faculty-profile': 'faculty-profile',
      'statistics': 'statistics',
      'scan-student-info': 'scan-student-info',
      'study-materials': 'study-materials',
      'assignments': 'faculty-assignments',
      'schedule-class': 'schedule-class',
      'syllabus-status': 'syllabus-status',
      'reimbursements': 'reimbursements',
      'schedule-meeting': 'schedule-meeting',
      'my-payroll': 'my-payroll',
      'staff-tasks': 'staff-tasks'
    };

    // Add direct mappings for additional top-level routes
    pathMap['study-materials'] = 'study-materials';
    pathMap['faculty-announcement-management'] = 'faculty-announcement-management';

    return pathMap[lastPart] || 'dashboard';
  };

  const [activePage, setActivePage] = useState(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  // Update active page when location changes
  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  // Note: Profile fetching is handled by the profile page component itself

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setError(null);

    // Navigate to the corresponding URL path
    const pathMap: {[key: string]: string;} = {
      'dashboard': '/faculty/dashboard',
      'holiday-calendar': '/faculty/holiday-calendar',
      'take-attendance': '/faculty/take-attendance',
      'upload-marks': '/faculty/upload-marks',
      'upload-qp': '/faculty/upload-qp',
      'co-attainment': '/faculty/co-attainment',
      'apply-leave': '/faculty/apply-leave',
      'attendance-records': '/faculty/attendance-records',
      'faculty-attendance': '/faculty/faculty-attendance',
      'announcements': '/faculty/announcements',
      'proctor-students': '/faculty/proctor-students',
      'exam-applications': '/faculty/exam-applications',
      'student-leave': '/faculty/student-leave',
      'timetable': '/faculty/timetable',
      'chat': '/faculty/chat',
      'faculty-profile': '/faculty/faculty-profile',
      'statistics': '/faculty/statistics',
      'scan-student-info': '/faculty/scan-student-info',
      'study-materials': '/faculty/study-materials',
      'faculty-announcement-management': '/faculty/announcements',
      'faculty-assignments': '/faculty/assignments',
      'schedule-class': '/faculty/schedule-class',
      'syllabus-status': '/faculty/syllabus-status',
      'reimbursements': '/faculty/reimbursements',
      'schedule-meeting': '/faculty/schedule-meeting',
      'my-payroll': '/faculty/my-payroll',
      'staff-tasks': '/faculty/staff-tasks',
      'return-to-hod': '/hod/dashboard'
    };

    const path = pathMap[page] || '/faculty/dashboard';
    navigate(path);
  };

  const handleNotificationClick = () => {
    setActivePage("faculty-announcement-management");
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearAuth();
      navigate("/", { replace: true });
    } catch (error) {

      setError("Failed to log out. Please try again.");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";

    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <FacultyStats setActivePage={handlePageChange} />;
      case "take-attendance":
        return <TakeAttendance />;
      case "upload-marks":
        return <UploadMarks />;
      case "upload-qp":
        return <UploadQP />;
      case "co-attainment":
        return <COAttainment />;
      case "apply-leave":
        return <ApplyLeave />;
      case "attendance-records":
        return <AttendanceRecords />;
      case "faculty-attendance":
        return <FacultyAttendance />;
      case "announcements":
      case "faculty-announcement-management":
        return <FacultyAnnouncementManagement />;
      case "proctor-students":
        return <ProctorStudents />;
      case "exam-applications":
        return <ExamApplication />;
      case "student-leave":
        return <ManageStudentLeave />;
      case "timetable":
        return <Timetable role="faculty" />;
      case "chat":
        return <Chat role="faculty" />;
      case "faculty-profile":
        return <FacultyProfile user={currentUser} />;
      case "statistics":
        return <GenerateStatistics />;
      case "scan-student-info":
        return <StudentInfoScanner />;
      case "study-materials":
        return <StudyMaterial />;
      case "faculty-assignments":
        return <FacultyAssignments />;
      case "schedule-class":
        return <ScheduleClass user={user} setError={setError} toast={null} />;
      case "syllabus-status":
        return <SyllabusTracker />;
      case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="teacher" />;
      case "reimbursements":
        return <EmployeeReimbursements />;
      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll user={user} />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "student"} />;
      default:
        return <FacultyStats setActivePage={handlePageChange} />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="faculty"
        user={currentUser}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={handleNotificationClick}
        pageTitle="Faculty Dashboard">
      
      {error &&
      <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-destructive/10 border border-destructive/20 text-destructive-foreground' : 'bg-red-100 border border-red-200 text-red-700'}`}>
          {error}
        </div>
      }
      {renderContent()}
    </DashboardLayout>
    </>);

};

export default FacultyDashboard;