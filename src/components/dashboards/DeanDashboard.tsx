import { useState, useEffect, Component, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import DeanStats from "../dean/DeanStats";
import DeanAttendance from "../dean/DeanAttendance";
import DeanAttendanceFilters from "../dean/DeanAttendanceFilters";
import CampusLocationManager from "../dean/CampusLocationManager";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import DeanExams from "../dean/DeanExams";
import DeanFacultyProfile from "../dean/DeanFacultyProfile";
import DeanFinance from "../dean/DeanFinance";
import DeanAlerts from "../dean/DeanAlerts";
import DeanAttendanceRecords from "../dean/DeanAttendanceRecords";
import DeanProfile from "../dean/DeanProfile";
import ManageAdminLeavesDean from "../dean/ManageAdminLeavesDean";
import { useTheme } from "../../context/ThemeContext";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";

interface DeanUser {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
}

const getActivePageFromPath = (pathname: string): string => {
  const pathParts = pathname.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1] || '';
  const pathMap: { [key: string]: string } = {
    'dashboard': 'dashboard',
    'profile': 'profile',
      'campus-locations': 'campus-locations',
    'attendance': 'attendance',
    'attendance-filters': 'attendance-filters',
    'performance': 'performance',
    'exams': 'exams',
    'faculty': 'faculty',
    'finance': 'finance',
    'alerts': 'alerts',
    'attendance-records': 'attendance-records',
    'admin-leaves': 'admin-leaves',
  };
  return pathMap[lastPart] || 'dashboard';
};

const DeanDashboard = ({ user, setPage }: { user: DeanUser; setPage: (p: string) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePage, setActivePage] = useState<string>(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    // Navigate to the corresponding dean route. Default to `/dean/{page}`
    const path = page === 'dashboard' ? '/dean/dashboard' : `/dean/${page}`;
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";
    
    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case 'dashboard':
        return <div><DeanStats /></div>;
      case 'attendance':
        return <div><DeanAttendance /></div>;
      case 'attendance-filters':
        return <div><DeanAttendanceFilters /></div>;
      case 'campus-locations':
        return <div><CampusLocationManager /></div>;
      case 'performance':
        return <div><StudentInfoScanner /></div>;

      case 'exams':
        return <div><DeanExams /></div>;
      case 'faculty':
        return <div><DeanFacultyProfile /></div>;
      case 'finance':
        return <div><DeanFinance /></div>;
      case 'alerts':
        return <div><DeanAlerts /></div>;
      case 'attendance-records':
        return <div><DeanAttendanceRecords /></div>;
      case 'profile':
        return <div><DeanProfile /></div>;
      case 'admin-leaves':
        return <ManageAdminLeavesDean />;
      default:
        return <div>Welcome, Dean.</div>;
    }
  };

  return (
    <DashboardLayout
      role={"dean" as any}
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      onNotificationClick={() => {}}
      pageTitle={undefined}
      headerActions={undefined}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default DeanDashboard;
