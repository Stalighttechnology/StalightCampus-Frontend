import FacultyPayroll from "../faculty/FacultyPayroll";
import AdminFacultyAttendanceView from "../admin/AdminFacultyAttendanceView";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import AdminStats from "../admin/AdminStats";
import AlumniDirectory from "../common/AlumniDirectory";
import EnrollUser from "../admin/EnrollUser";
import UsersManagement from "../admin/UsersManagement";
import AdminProfile from "../admin/AdminProfile";
import BillingManagement from "../org_admin/BillingManagement";
import { useToast } from "../../hooks/use-toast";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import { HolidayCalendar } from "../admin/HolidayCalendar";

import BranchesManagement from "../admin/BranchesManagement";
import BatchManagement from "../admin/BatchManagement";
import AnnouncementManagement from "../admin/AnnouncementManagement";

import DeanAttendance from "../dean/DeanAttendance";
import DeanExams from "../dean/DeanExams";
import DeanFacultyProfile from "../dean/DeanFacultyProfile";
import DeanFinance from "../dean/DeanFinance";

import InvoiceManagement from "../FeesManager/InvoiceManagement";
import PaymentMonitoring from "../FeesManager/PaymentMonitoring";
import Reports from "../FeesManager/Reports";
import CampusLocationManager from "../dean/CampusLocationManager";
import ScheduleMeeting from "../common/ScheduleMeeting";
import StaffTaskTracker from "../common/StaffTaskTracker";
import ComplianceReports from "../admin/ComplianceReports";
import { InventoryHub } from "../inventory/InventoryHub";

interface OrgAdminDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const OrgAdminDashboard = ({ user, setPage }: OrgAdminDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/org-admin', '').replace(/^\//, '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/org-admin' : `/org-admin/${page}`;
    navigate(path);
    setError(null);
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";

    if (!activePage.includes('dashboard') && activePage !== 'billing' && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <AdminStats setError={setError} onNavigate={handlePageChange} />;

      case "users":
        return <UsersManagement setError={setError} toast={toast} />;

      case "enroll-user":
        return <EnrollUser setError={setError} toast={toast} />;

      case "billing":
        return <BillingManagement />;

      case "holiday-calendar":
        return <HolidayCalendar />;
      case "profile":
        return <AdminProfile user={user} setError={setError} />

      case "scan-student-info":
        return <StudentInfoScanner />

      case "branches":
        return <BranchesManagement setError={setError} toast={toast} isReadOnly={true} />;
      case "batches":
        return <BatchManagement setError={setError} toast={toast} isReadOnly={true} />;
      case "announcement-management":
        return <AnnouncementManagement />;

      case "attendance":
        return <DeanAttendance isReadOnly={true} />;
      case "faculty-attendance":
        return <AdminFacultyAttendanceView />;
      case "exams":
        return <DeanExams isReadOnly={true} />;
      case "faculty":
        return <DeanFacultyProfile isReadOnly={true} />;
      case "finance":
        return <DeanFinance isReadOnly={true} />;

      case "invoices":
        return <InvoiceManagement isReadOnly={true} />;
      case "payments":
        return <PaymentMonitoring isReadOnly={true} />;
      case "reports":
        return <Reports isReadOnly={true} />;
      case "campus-locations":
        return <CampusLocationManager />;

      case "alumni-directory":
        return <AlumniDirectory />;

      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "compliance-reports":
        return <ComplianceReports />;
      case "inventory":
        return <InventoryHub role="org_admin" />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "org_admin"} />;
      default:
        return <AdminStats setError={setError} onNavigate={handlePageChange} />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="org_admin"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        pageTitle="Organization Admin Dashboard"
      >
        <div key={activePage}>
          {renderContent()}
        </div>
      </DashboardLayout>
    </>
  );
};

export default OrgAdminDashboard;
