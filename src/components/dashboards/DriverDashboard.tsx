import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import DriverDashboardContent from "../transport/driver/DriverDashboard";
import DriverTripHistory from "../transport/driver/DriverTripHistory";
import DriverComplaints from "../transport/driver/DriverComplaints";
import ApplyLeaveDriver from "../transport/driver/ApplyLeave";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import Profile from "../common/Profile";
import FacultyAttendance from "../faculty/FacultyAttendance";
import { TutorialController } from "../../onboarding/components/TutorialController";
import { HolidayCalendar } from "../admin/HolidayCalendar";

interface DashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const DriverDashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/driver', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/driver' : `/driver/${page}`;
    navigate(path);
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "":
        return <DriverDashboardContent />;
      case "driver-history":
        return <DriverTripHistory />;
      case "driver-complaints":
        return <DriverComplaints />;
      case "apply-leave":
        return <ApplyLeaveDriver />;
      case "reimbursements":
        return <EmployeeReimbursements />;
      case "my-attendance":
        return <FacultyAttendance />;
            case "holiday-calendar":
        return <HolidayCalendar readOnly />;
      case "profile":
        return <Profile role="driver" user={user} />;
      default:
        return <DriverDashboardContent />;
    }
  };

  return (
    <DashboardLayout
      role="driver"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Driver Dashboard"
    >
      <TutorialController />
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
  );
};

export default DriverDashboard;
