import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import HMSOverview from "../hms/HMSOverview";
import HostelManagement from "../hms/HostelManagement";
import RoomManagement from "../hms/RoomManagement";
import StudentManagement from "../hms/StudentManagement";
import OutsideStudentManagement from "../hms/OutsideStudentManagement";
import Enrollment from "../hms/Enrollment";
import StaffManagementOverview from "../hms/StaffManagementOverview";
import MenuManagement from "../hms/MenuManagement";
import IssueTracking from "../hms/IssueTracking";
import HMSProfile from "../hms/HMSProfile";
import StudentMealManagement from "../hms/StudentMealManagement";
import HmsVisitorLogs from "../hms/HmsVisitorLogs";
import ApplyLeaveDepartmentAdmin from "../common/ApplyLeaveDepartmentAdmin";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import WardenLeaveManagement from "../hms/WardenLeaveManagement";
import FacultyAttendance from "../faculty/FacultyAttendance";
import AnnouncementManagement from "../admin/AnnouncementManagement";
import { useToast } from "../../hooks/use-toast";
import { logoutUser } from "../../utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { HMSProvider, useHMSContext } from "../../context/HMSContext";
import { AcademicProvider } from "../../context/AcademicContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { HolidayCalendar } from "../admin/HolidayCalendar";

interface HMSDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const HMSDashboardContent = ({ user, setPage }: HMSDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hostels, loading, skeletonMode, setSkeletonMode, refreshData } = useHMSContext();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);

  // Set initial selected hostel if not set or if current selection is invalid
  useEffect(() => {
    if (hostels.length > 0) {
      const isValid = hostels.some(h => h.id === selectedHostelId);
      if (!isValid) {
        setSelectedHostelId(hostels[0].id);
      }
    } else {
      setSelectedHostelId(null);
    }
  }, [hostels, selectedHostelId]);

  // Get active page from URL path
  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/hms', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/hms' : `/hms/${page}`;
    navigate(path);
  };

  const handleNotificationClick = () => {
    navigate('/hms/notifications');
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "":
        return <HMSOverview />;
      case "hostels":
        return <HostelManagement />;
      case "rooms":
        return <RoomManagement />;
      case "students":
        return <StudentManagement />;
      case "outside-students":
        return <OutsideStudentManagement />;
      case "enrollment":
        return <Enrollment />;
      case "staff":
        return <StaffManagementOverview />;
      case "menu-management":
        return <MenuManagement />;
      case "student-meals":
        return <StudentMealManagement hostelId={selectedHostelId} />;
      case "issues":
        return <IssueTracking hostelId={selectedHostelId} />;
      case "visitor_logs":
        return <HmsVisitorLogs />;
      case "manage-warden-leaves":
        return <WardenLeaveManagement setError={() => {}} toast={toast} />;
      case "apply-leave":
        return <ApplyLeaveDepartmentAdmin />;
      case "reimbursements":
        return <EmployeeReimbursements />;
      case "announcement-management":
        return <AnnouncementManagement />;
      case "my-attendance":
        return <FacultyAttendance />;
            case "holiday-calendar":
        return <HolidayCalendar readOnly />;
      case "profile":
        return <HMSProfile user={user} />;
      default:
        return <HMSOverview />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="hms"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={handleNotificationClick}
        pageTitle="HMS Dashboard"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div key={activePage}>
            {renderContent()}
          </div>
        </motion.div>
      </DashboardLayout>
    </>
  );
};

const HMSDashboard = (props: HMSDashboardProps) => (
  <AcademicProvider>
    <HMSDashboardContent {...props} />
  </AcademicProvider>
);

export default HMSDashboard;