import FacultyPayroll from "../faculty/FacultyPayroll";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import AdminStats from "../admin/AdminStats";
import AdminHODAttendance from "../admin/HODAttendanceView";
import EnrollUser from "../admin/EnrollUser";
import BulkUpload from "../admin/BulkUpload";
import BranchesManagement from "../admin/BranchesManagement";
import BatchManagement from "../admin/BatchManagement";
import HODLeavesManagement from "../admin/HODLeavesManagement";
import UsersManagement from "../admin/UsersManagement";
import AdminProfile from "../admin/AdminProfile";
import AdminQPApprovals from "../admin/AdminQPApprovals";
import TeacherBranchAssignment from "../admin/TeacherBranchAssignment";
import StudentBranchTransfer from "../admin/StudentBranchTransfer";
import AnnouncementManagement from "../admin/AnnouncementManagement";
import AdminCOAttainment from "../common/AdminCOAttainment";
import { useToast } from "../../hooks/use-toast";
import AdminAttendance from "../admin/AdminAttendance";
import AdminFacultyAttendanceView from "../admin/AdminFacultyAttendanceView";
import ApplyLeaveAdmin from "../faculty/ApplyLeave";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import StudentInfoScanner from "../hod/StudentInfoScanner";
import GoogleSetup from "../admin/GoogleSetup";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import BillingManagement from "../org_admin/BillingManagement";
import CampusLocationManager from "../dean/CampusLocationManager";
import CampusMonitoring from "../admin/CampusMonitoring";
import AlumniDirectory from "../common/AlumniDirectory";
import PrincipalTimetableSettings from "../admin/PrincipalTimetableSettings";
import DeanFinance from "../dean/DeanFinance";
import Reports from "../FeesManager/Reports";
import ComplianceReports from "../admin/ComplianceReports";

import {
  Users,
  User,
  ClipboardList,
  Bell,
  GitBranch,
  UserCheck } from
"lucide-react";
import { logoutUser } from "../../utils/authService";
import { useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import ScheduleMeeting from "../common/ScheduleMeeting";
import StaffTaskTracker from "../common/StaffTaskTracker";

interface AdminDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const AdminDashboard = ({ user, setPage }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { theme } = useTheme();

  const getActivePageFromPath = (pathname: string) => {
    const pathParts = pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';
    if (lastPart === 'admin') return 'dashboard';
    return lastPart;
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/admin' : `/admin/${page}`;
    navigate(path);
    setError(null);
  };



  const handleNotificationClick = () => {
    navigate('/admin/notifications');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/", { replace: true });
    } catch (error) {

      setError("Failed to log out. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again."
      });
    }
  };



  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";

    if (!activePage.includes('dashboard') && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <AdminStats setError={setError} onNavigate={handlePageChange} />
          </div>);

      case "enroll-user":
        return (
          <div>
            <EnrollUser setError={setError} toast={toast} />
          </div>);

      case "bulk-upload":
        return (
          <div>
            <BulkUpload setError={setError} toast={toast} />
          </div>);

      case "billing":
        return <BillingManagement />;

      case "branches":
        return (
          <div>
            <BranchesManagement setError={setError} toast={toast} />
          </div>);

      case "teacher-assignments":
        return (
          <div>
            <TeacherBranchAssignment setError={setError} toast={toast} />
          </div>);

      case "student-transfer":
        return (
          <div>
            <StudentBranchTransfer />
          </div>);
          
      case "co-attainment":
        return <AdminCOAttainment />;

      case "batches":
        return (
          <div>
            <BatchManagement setError={setError} toast={toast} />
          </div>);

      case "holiday-calendar":
        return (
          <div>
            <HolidayCalendar showLeaves={true} userRole={user?.role || "principal"} />
          </div>);

      case "hod-leaves":
        return (
          <div>
            <HODLeavesManagement setError={setError} toast={toast} />
          </div>);

      case "hod-attendance":
        return (
          <div>
            <AdminHODAttendance setError={setError} />
          </div>);

      case "faculty-attendance":
        return (
          <div>
            <AdminFacultyAttendanceView />
          </div>);

      case "my-attendance":
        return (
          <div>
            <AdminAttendance />
          </div>);

      case "apply-leave":
        return (
          <div>
            <ApplyLeaveAdmin />
          </div>);

      case "users":
        return (
          <div>
            <UsersManagement setError={setError} toast={toast} />
          </div>);

      case "qp-approvals":
        return (
          <div>
            <AdminQPApprovals />
          </div>);


      case "announcement-management":
        return (
          <div>
            <AnnouncementManagement />
          </div>);


      case "profile":
        return (
          <div>
            <AdminProfile user={user} setError={setError} />
          </div>);

      case "scan-student-info":
        return (
          <div>
            <StudentInfoScanner />
          </div>);

      case "campus-locations":
        return (
          <div>
            <CampusLocationManager />
          </div>);

      case "campus-monitoring":
        return (
          <div>
            <CampusMonitoring />
          </div>);

      case "google-setup":
        return (
          <div>
            <GoogleSetup setError={setError} toast={toast} />
          </div>);

      case "alumni-directory":
        return (
          <div>
            <AlumniDirectory userRole={user?.role || "principal"} />
          </div>);
          
      case "timetable-config":
        return (
          <div>
            <PrincipalTimetableSettings />
          </div>);

      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "finance":
        return <DeanFinance isReadOnly={true} />;
      case "reports":
        return <Reports isReadOnly={true} />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "compliance-reports":
        return <ComplianceReports />;
      default:
        return <Navigate to="/not-found" replace />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role={user?.role || "admin"}
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={handleNotificationClick}
        pageTitle="Principal Dashboard">
      
      <div key={activePage}>
        {renderContent()}
      </div>
    </DashboardLayout>
    </>);

};

export default AdminDashboard;