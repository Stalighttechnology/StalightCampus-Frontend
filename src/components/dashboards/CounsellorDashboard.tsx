import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import ExternalLinksPage from "../admin/ExternalLinksPage";
import DashboardLayout from "../common/DashboardLayout";
import AdmissionDashboard from "../admission/AdmissionDashboard";
import LeadPipeline from "../admission/LeadPipeline";
import Profile from "../common/Profile";
import ApplyLeave from "../faculty/ApplyLeave";
import FacultyAttendance from "../faculty/FacultyAttendance";
import FacultyPayroll from "../faculty/FacultyPayroll";
import AdmissionApplications from "../admission/AdmissionApplications";
import AdmissionDocuments from "../admission/AdmissionDocuments";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import { TutorialController } from "../../onboarding/components/TutorialController";

import AnnouncementManagement from "../admin/AnnouncementManagement";

interface DashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const CounsellorDashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/counsellor', '').split('/').filter(Boolean)[0];
    return path || 'admission-dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'admission-dashboard' ? '/counsellor' : `/counsellor/${page}`;
    navigate(path);
  };

  const renderContent = () => {
    switch (activePage) {
      case "admission-dashboard":
      case "":
        return <AdmissionDashboard />;
      case "announcements":
        return <AnnouncementManagement />;
      case "admission-enquiries":
        return <LeadPipeline />;
      case "admission-applications":
        return <AdmissionApplications />;
      case "admission-documents":
        return <AdmissionDocuments />;
      case "apply-leave":
        return <ApplyLeave />;
      case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="counsellor" />;
      case "profile":
        return <Profile role="counsellor" user={user} />;
      case "my-attendance":
        return <FacultyAttendance />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "external-links":
        return <ExternalLinksPage userRole={user?.role || "counsellor"} />;
      default:
        return <AdmissionDashboard />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="counsellor"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        pageTitle="Counsellor Dashboard"
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

export default CounsellorDashboard;
