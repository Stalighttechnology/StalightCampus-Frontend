import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import AdminStats from "../admin/AdminStats";
import AdminHODAttendance from "../admin/HODAttendanceView";
import EnrollUser from "../admin/EnrollUser";
import BulkUpload from "../admin/BulkUpload";
import BranchesManagement from "../admin/BranchesManagement";
import BatchManagement from "../admin/BatchManagement";
import NotificationsManagement from "../admin/NotificationsManagement";
import HODLeavesManagement from "../admin/HODLeavesManagement";
import UsersManagement from "../admin/UsersManagement";
import AdminProfile from "../admin/AdminProfile";
import AdminQPApprovals from "../admin/AdminQPApprovals";
import TeacherBranchAssignment from "../admin/TeacherBranchAssignment";
import AnnouncementManagement from "../admin/AnnouncementManagement";
import { useToast } from "../../hooks/use-toast";
import AdminAttendance from "../admin/AdminAttendance";
import ApplyLeaveAdmin from "../admin/ApplyLeaveAdmin";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";

import {
  Users,
  User,
  ClipboardList,
  Bell,
  GitBranch,
  UserCheck,
} from "lucide-react";
import { logoutUser } from "../../utils/authService";
import { useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";


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

  // Get active page from URL path
  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/admin', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/admin' : `/admin/${page}`;
    navigate(path);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  const handleNotificationClick = () => {
    navigate('/admin/notifications');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to log out. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
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
          </div>
        );
      case "enroll-user":
        return (
          <div>
            <EnrollUser setError={setError} toast={toast} />
          </div>
        );
      case "bulk-upload":
        return (
          <div>
            <BulkUpload setError={setError} toast={toast} />
          </div>
        );
      case "branches":
        return (
          <div>
            <BranchesManagement setError={setError} toast={toast} />
          </div>
        );
      case "teacher-assignments":
        return (
          <div>
            <TeacherBranchAssignment setError={setError} toast={toast} />
          </div>
        );
      case "batches":
        return (
          <div>
            <BatchManagement setError={setError} toast={toast} />
          </div>
        );
      case "notifications":
        return (
          <div>
            <NotificationsManagement setError={setError} toast={toast} />
          </div>
        );
      case "hod-leaves":
        return (
          <div>
            <HODLeavesManagement setError={setError} toast={toast} />
          </div>
        );
      case "hod-attendance":
        return (
          <div>
            <AdminHODAttendance setError={setError} />
          </div>
        );
      case "my-attendance":
        return(
          <div>
            <AdminAttendance />
          </div> 
        )
      case "apply-leave":
        return (
          <div>
            <ApplyLeaveAdmin />
          </div>
        );
      case "users":
        return (
          <div>
            <UsersManagement setError={setError} toast={toast} />
          </div>
        );
      case "qp-approvals":
        return (
          <div>
            <AdminQPApprovals />
          </div>
        );
      
      case "announcement-management":
        return (
          <div>
            <AnnouncementManagement />
          </div>
        );
      
      case "profile":
        return (
          <div>
            <AdminProfile user={user} setError={setError} />
          </div>
        );
      default:
        return <AdminStats setError={setError} />;
    }
  };

  return (
    <DashboardLayout
      role="admin"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      onNotificationClick={handleNotificationClick}
      pageTitle="Principal Dashboard"
    >
      <div key={activePage}>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;