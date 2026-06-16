import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import WardenDashboardOverview from "../warden/WardenDashboard";
import WardenIssueManagement from "../warden/WardenIssueManagement";
import WardenHostelOverview from "../warden/WardenHostelOverview";
import WardenProfile from "../warden/WardenProfile";
import WardenVisitorLogs from "../warden/WardenVisitorLogs";
import ApplyLeaveDepartmentAdmin from "../common/ApplyLeaveDepartmentAdmin";
import FacultyAttendance from "../faculty/FacultyAttendance";
import { HMSProvider } from "../../context/HMSContext";
import { AcademicProvider } from "../../context/AcademicContext";
import { HolidayCalendar } from "../admin/HolidayCalendar";

interface WardenDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const WardenDashboardContent = ({ user }: WardenDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/warden', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/warden' : `/warden/${page}`;
    navigate(path);
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "":
        return <WardenDashboardOverview />;
      case "issues":
        return <WardenIssueManagement />;
      case "students":
      case "rooms":
      case "residents":
        return <WardenHostelOverview />;
      case "apply-leave":
        return <ApplyLeaveDepartmentAdmin />;
      case "my-attendance":
        return <FacultyAttendance />;
            case "holiday-calendar":
        return <HolidayCalendar readOnly />;
      case "profile":
        return <WardenProfile user={user} />;
      case "visitor_logs":
        return <WardenVisitorLogs />;
      default:
        return <WardenDashboardOverview />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="warden"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        pageTitle="Warden Dashboard"
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

const WardenDashboard = (props: WardenDashboardProps) => (
  <AcademicProvider>
    <WardenDashboardContent {...props} />
  </AcademicProvider>
);

export default WardenDashboard;
