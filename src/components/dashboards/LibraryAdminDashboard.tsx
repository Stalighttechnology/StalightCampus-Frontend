import FacultyPayroll from "../faculty/FacultyPayroll";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import LibraryOverview from "../library/LibraryOverview";
import LibraryBooksCatalog from "../library/LibraryBooksCatalog";
import LibraryCirculation from "../library/LibraryCirculation";
import LibraryFineManagement from "../library/LibraryFineManagement";
import ApplyLeaveDepartmentAdmin from "../faculty/ApplyLeave";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import Profile from "../common/Profile";
import FacultyAttendance from "../faculty/FacultyAttendance";
import { TutorialController } from "../../onboarding/components/TutorialController";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import StaffTaskTracker from "../common/StaffTaskTracker";
import ScheduleMeeting from "../common/ScheduleMeeting";
import StudentAnnouncements from "../student/StudentAnnouncements";

interface DashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const LibraryAdminDashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/library-admin', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/library-admin' : `/library-admin/${page}`;
    navigate(path);
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "":
        return <LibraryOverview />;
      case "announcements":
        return <StudentAnnouncements />;
      case "library-books":
        return <LibraryBooksCatalog />;
      case "library-circulation":
        return <LibraryCirculation />;
      case "library-fines":
        return <LibraryFineManagement />;
      case "apply-leave":
        return <ApplyLeaveDepartmentAdmin />;
      case "reimbursements":
        return <EmployeeReimbursements />;
      case "my-attendance":
        return <FacultyAttendance />;
            case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="library_admin" />;
      case "profile":
        return <Profile role="library_admin" user={user} />;
      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "student"} />;
      default:
        return <LibraryOverview />;
    }
  };

  return (
    <DashboardLayout
      role="library_admin"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Library Admin Dashboard"
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

export default LibraryAdminDashboard;
