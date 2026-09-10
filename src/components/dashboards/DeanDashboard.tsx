import FacultyPayroll from "../faculty/FacultyPayroll";
import FacultyAttendance from "../faculty/FacultyAttendance";
import ApplyLeave from "../faculty/ApplyLeave";
import AdminFacultyAttendanceView from "../admin/AdminFacultyAttendanceView";
import { useState, useEffect, Component, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import DeanStats from "../dean/DeanStats";
import DeanAttendance from "../dean/DeanAttendance";
import DeanAttendanceFilters from "../dean/DeanAttendanceFilters";
import CampusLocationManager from "../dean/CampusLocationManager";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import DeanExams from "../dean/DeanExams";
import DeanFacultyProfile from "../dean/DeanFacultyProfile";
import DeanFinance from "../dean/DeanFinance";
import DeanAlerts from "../dean/DeanAlerts";
import AdminCOAttainment from "../common/AdminCOAttainment";
import DeanAttendanceRecords from "../dean/DeanAttendanceRecords";
import DeanProfile from "../dean/DeanProfile";
import HODLeavesManagement from "../admin/HODLeavesManagement";
import EnrollUser from "../admin/EnrollUser";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import BillingManagement from "../org_admin/BillingManagement";
import AnnouncementManagement from "../admin/AnnouncementManagement";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import AlumniDirectory from "../common/AlumniDirectory";
import ScheduleMeeting from "../common/ScheduleMeeting";
import StaffTaskTracker from "../common/StaffTaskTracker";
import AdminQPApprovals from "../admin/AdminQPApprovals";
import ComplianceReports from "../admin/ComplianceReports";
import Reports from "../FeesManager/Reports";
import { InventoryHub } from "../inventory/InventoryHub";

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
    'dean': 'dashboard',
    'my-payroll': 'my-payroll',
    'my-attendance': 'my-attendance',
    'staff-tasks': 'staff-tasks',
    'apply-leave': 'apply-leave',
    'leaves': 'apply-leave',
    'dashboard': 'dashboard',
    'inventory': 'inventory',
    'holiday-calendar': 'holiday-calendar',
    'profile': 'profile',
    'campus-locations': 'campus-locations',
    'attendance': 'attendance',
    'reports': 'reports',
    'scan-student-info': 'scan-student-info',
    'exams': 'exams',
    'faculty': 'faculty',
    'finance': 'finance',
    'alerts': 'alerts',
    'attendance-records': 'attendance-records',
    'faculty-attendance': 'faculty-attendance',
    'admin-leaves': 'admin-leaves',
    'enroll-user': 'enroll-user',
    'billing': 'billing',
    'announcements': 'announcement-management',
    'announcement-management': 'announcement-management',
    'schedule-meeting': 'schedule-meeting',
    'alumni-directory': 'alumni-directory',
    'co-attainment': 'co-attainment',
    'qp-approvals': 'qp-approvals',
    'compliance-reports': 'compliance-reports',
    'external-links': 'external-links',
  };
  return pathMap[lastPart] || lastPart || 'dashboard';
};

const DeanDashboard = ({ user, setPage }: { user: DeanUser; setPage: (p: string) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePage, setActivePage] = useState<string>(getActivePageFromPath(location.pathname));
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    setActivePage(getActivePageFromPath(location.pathname));
  }, [location.pathname]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    // Navigate to the corresponding dean route. Default to `/dean/{page}`
    const path = page === 'dashboard' ? '/dean/dashboard' : `/dean/${page}`;
    navigate(path);
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
      case 'faculty-attendance':
        return <AdminFacultyAttendanceView />;
      case 'reports':
        return <div><Reports isReadOnly={true} /></div>;
      case 'campus-locations':
        return <div><CampusLocationManager /></div>;
      case 'scan-student-info':
        return <div><StudentInfoScanner /></div>;

      case 'exams':
        return <div><DeanExams /></div>;
      case 'co-attainment':
        return <div><AdminCOAttainment /></div>;
      case 'qp-approvals':
        return <div><AdminQPApprovals role="dean" /></div>;
      case 'faculty':
        return <div><DeanFacultyProfile /></div>;
      case 'finance':
        return <div><DeanFinance /></div>;
      case 'alerts':
        return <div><DeanAlerts /></div>;
      case 'profile':
        return <div><DeanProfile /></div>;
      case 'apply-leave':
      case 'leaves':
        return <ApplyLeave />;
      case 'admin-leaves':
        return <HODLeavesManagement setError={setError} toast={toast} userRole="dean" />;
      case 'enroll-user':
        return <div><EnrollUser setError={setError} toast={toast} /></div>;
      case 'billing':
        return <BillingManagement />;
      case 'announcement-management':
        return <AnnouncementManagement />;
      case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="dean" />;
      case "alumni-directory":
        return <AlumniDirectory />;
      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "my-attendance":
        return <FacultyAttendance />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "compliance-reports":
        return <ComplianceReports />;
      case "inventory":
        return <InventoryHub role="dean" />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "dean"} />;
      default:
        return <div>Welcome, Dean.</div>;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role={"dean" as any}
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={() => { }}
        pageTitle={undefined}
        headerActions={undefined}
      >
        {renderContent()}
      </DashboardLayout>
    </>
  );
};

export default DeanDashboard;
