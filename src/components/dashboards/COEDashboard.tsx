import StaffTaskTracker from "../common/StaffTaskTracker";
import FacultyPayroll from "../faculty/FacultyPayroll";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import StudentStatus from "../coe/StudentStatus";
import CourseStatistics from "../coe/CourseStatistics";
import COEDashboardStats from "../coe/COEDashboardStats";
import COEProfile from "../coe/COEProfile";
import COEQPApprovals from "../coe/COEQPApprovals";
import PublishResults from "../coe/PublishResults";
import PublishResultsRevalMakeup from "../coe/PublishResultsRevalMakeup";
import ApplyLeave from "../faculty/ApplyLeave";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import MakeupRequests from "../coe/MakeupRequests";
import RevaluationRequests from "../coe/RevaluationRequests";
import ExamScheduling from "../coe/ExamScheduling";
import COEFeeSettings from "../coe/COEFeeSettings";
import AdminCOAttainment from "../common/AdminCOAttainment";
import { API_ENDPOINT } from "../../utils/config";
import { useTheme } from "../../context/ThemeContext";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import { logoutUser } from "../../utils/authService";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import FacultyAttendance from "../faculty/FacultyAttendance";
import AnnouncementManagement from "../admin/AnnouncementManagement";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import ScheduleMeeting from "../common/ScheduleMeeting";

interface COEDashboardProps {
  user: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    profile_picture?: string | null;
  };
}

const COEDashboard = ({ user }: COEDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getActivePageFromPath = (pathname: string): string => {
    const pathParts = pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';

    // Map URL paths to page names
    const pathMap: {[key: string]: string;} = {
      'my-payroll': 'my-payroll',
      'fee-settings': 'fee-settings',
      'dashboard': 'dashboard',
      'holiday-calendar': '/coe/holiday-calendar',
      'holiday-calendar': 'holiday-calendar',
      'student-status': 'student-status',
      'course-statistics': 'course-statistics',
      'makeup-requests': 'makeup-requests',
      'revaluation-requests': 'revaluation-requests',
      'publish-results': 'publish-results',
      'publish-results-reval-makeup': 'publish-results-reval-makeup',
      'exam-scheduling': 'exam-scheduling',
      'qp-approvals': 'qp-approvals',
      'apply-leave': 'apply-leave',
      'reimbursements': 'reimbursements',
      'scan-student-info': 'scan-student-info',
      'my-attendance': 'my-attendance',
      'announcement-management': 'announcement-management',
      'profile': 'profile',
      'co-attainment': 'co-attainment',
      'schedule-meeting': 'schedule-meeting',
      'staff-tasks': 'staff-tasks',
      'external-links': 'external-links'
    };

    return pathMap[lastPart] || lastPart || 'dashboard';
  };

  const [activePage, setActivePage] = useState(getActivePageFromPath(location.pathname));

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

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
      'my-payroll': '/coe/my-payroll',
      'dashboard': '/coe/dashboard',
      'holiday-calendar': '/coe/holiday-calendar',
      'student-status': '/coe/student-status',
      'course-statistics': '/coe/course-statistics',
      'makeup-requests': '/coe/makeup-requests',
      'revaluation-requests': '/coe/revaluation-requests',
      'publish-results': '/coe/publish-results',
      'publish-results-reval-makeup': '/coe/publish-results-reval-makeup',
      'exam-scheduling': '/coe/exam-scheduling',
      'qp-approvals': '/coe/qp-approvals',
      'apply-leave': '/coe/apply-leave',
      'reimbursements': '/coe/reimbursements',
      'scan-student-info': '/coe/scan-student-info',
      'my-attendance': '/coe/my-attendance',
      'announcement-management': '/coe/announcement-management',
      'profile': '/coe/profile',
      'fee-settings': '/coe/fee-settings',
      'co-attainment': '/coe/co-attainment',
      'schedule-meeting': '/coe/schedule-meeting',
      'staff-tasks': '/coe/staff-tasks',
      'external-links': '/coe/external-links'
    };

    navigate(pathMap[page] || `/coe/${page}`);
  };

  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/', { replace: true });
    } catch (error) {

    }
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";

    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case 'dashboard':
        return <COEDashboardStats />;
      case 'student-status':
        return <StudentStatus />;
      case 'course-statistics':
        return <CourseStatistics />;
      case 'co-attainment':
        return <AdminCOAttainment />;
      case 'makeup-requests':
        return <MakeupRequests />;
      case 'revaluation-requests':
        return <RevaluationRequests />;
      case 'publish-results':
        return <PublishResults />;
      case 'publish-results-reval-makeup':
        return <PublishResultsRevalMakeup />;
      case 'exam-scheduling':
        return <ExamScheduling />;
      case 'qp-approvals':
        return <COEQPApprovals />;
      case 'apply-leave':
        return <ApplyLeave />;
      case 'reimbursements':
        return <EmployeeReimbursements />;
      case 'profile':
        return <COEProfile />;
      case 'fee-settings':
        return <COEFeeSettings />;
      case 'scan-student-info':
        return <StudentInfoScanner />;
      case 'my-attendance':
        return <FacultyAttendance />;
      case 'announcement-management':
        return <AnnouncementManagement />;
      case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="coe" />;
      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "coe"} />;
      default:
        return <COEDashboardStats />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="coe"
        user={currentUser}
        activePage={activePage}
        onPageChange={handlePageChange}
        pageTitle="COE Dashboard">
      
      {error &&
      <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      }
      {renderContent()}
    </DashboardLayout>
    </>);

};

export default COEDashboard;