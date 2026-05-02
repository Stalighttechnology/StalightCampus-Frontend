import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import StudentStatus from "../coe/StudentStatus";
import CourseStatistics from "../coe/CourseStatistics";
import COEDashboardStats from "../coe/COEDashboardStats";
import COEProfile from "../coe/COEProfile";
import COEQPApprovals from "../coe/COEQPApprovals";
import PublishResults from "../coe/PublishResults";
import PublishResultsRevalMakeup from "../coe/PublishResultsRevalMakeup";
import ApplyLeave from "../coe/ApplyLeave";
import MakeupRequests from "../coe/MakeupRequests";
import RevaluationRequests from "../coe/RevaluationRequests";
import ExamScheduling from "../coe/ExamScheduling";
import { API_ENDPOINT } from "../../utils/config";
import { useTheme } from "../../context/ThemeContext";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import { logoutUser } from "../../utils/authService";

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
    const pathMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'student-status': 'student-status',
      'course-statistics': 'course-statistics',
      'makeup-requests': 'makeup-requests',
      'revaluation-requests': 'revaluation-requests',
      'publish-results': 'publish-results',
      'publish-results-reval-makeup': 'publish-results-reval-makeup',
      'exam-scheduling': 'exam-scheduling',
      'qp-approvals': 'qp-approvals',
      'apply-leave': 'apply-leave',
      'profile': 'profile',
    };

    return pathMap[lastPart] || 'dashboard';
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
    const pathMap: { [key: string]: string } = {
      'dashboard': '/coe/dashboard',
      'student-status': '/coe/student-status',
      'course-statistics': '/coe/course-statistics',
      'makeup-requests': '/coe/makeup-requests',
      'revaluation-requests': '/coe/revaluation-requests',
      'publish-results': '/coe/publish-results',
      'publish-results-reval-makeup': '/coe/publish-results-reval-makeup',
      'exam-scheduling': '/coe/exam-scheduling',
      'qp-approvals': '/coe/qp-approvals',
      'apply-leave': '/coe/apply-leave',
      'profile': '/coe/profile',
    };

    navigate(pathMap[page] || '/coe/dashboard');
  };

  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
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
      case 'profile':
        return <COEProfile />;
      default:
        return <COEDashboardStats />;
    }
  };

  return (
    <DashboardLayout
      role="coe"
      user={currentUser}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="COE Dashboard"
    >
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {renderContent()}
    </DashboardLayout>
  );
};

export default COEDashboard;