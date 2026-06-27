import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import AdmissionDashboard from "../admission/AdmissionDashboard";
import CampusPageBuilder from "../admission/CampusPageBuilder";
import LeadPipeline from "../admission/LeadPipeline";
import AdmissionCourses from "../admission/AdmissionCourses";
import AdmissionApplications from "../admission/AdmissionApplications";
import AdmissionSeatMatrix from "../admission/AdmissionSeatMatrix";
import AdmissionDocuments from "../admission/AdmissionDocuments";
import AdmissionSettings from "../admission/AdmissionSettings";
import AdmissionStudents from "../admission/AdmissionStudents";
import AdmissionFees from "../admission/AdmissionFees";
import AdmissionCommunication from "../admission/AdmissionCommunication";
import AdmissionReports from "../admission/AdmissionReports";
import Profile from "../common/Profile";
import FacultyAttendance from "../faculty/FacultyAttendance";
import { TutorialController } from "../../onboarding/components/TutorialController";
import { HolidayCalendar } from "../admin/HolidayCalendar";

interface DashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const AdmissionManagerDashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/admission-manager', '').split('/').filter(Boolean)[0];
    return path || 'admission-dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'admission-dashboard' ? '/admission-manager' : `/admission-manager/${page}`;
    navigate(path);
  };

    const renderContent = () => {
    switch (activePage) {
      case "admission-dashboard":
      case "":
        return <AdmissionDashboard />;
      case "campus-builder":
        return <CampusPageBuilder />;
      case "admission-enquiries":
        return <LeadPipeline />;
      case "admission-applications":
        return <AdmissionApplications />;
      case "admission-students":
        return <AdmissionStudents />;
      case "admission-courses":
        return <AdmissionCourses />;
      case "seat-matrix":
        return <AdmissionSeatMatrix />;
      case "admission-fees":
        return <AdmissionFees />;
      case "admission-documents":
        return <AdmissionDocuments />;
      case "admission-communication":
        return <AdmissionCommunication />;
      case "admission-reports":
        return <AdmissionReports />;
      case "admission-settings":
        return <AdmissionSettings />;
            case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="admission_manager" />;
      case "profile":
        return <Profile role="admission_manager" user={user} />;
      case "my-attendance":
        return <FacultyAttendance />;
      default:
        return <AdmissionDashboard />;
    }
  };

  return (
    <>
      <DashboardLayout
        role="admission_manager"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        pageTitle="Admission Manager Dashboard"
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
      <TutorialController />
    </>
  );
};

export default AdmissionManagerDashboard;
