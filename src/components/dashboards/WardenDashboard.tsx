import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import WardenDashboardOverview from "../warden/WardenDashboard";
import WardenIssueManagement from "../warden/WardenIssueManagement";
import WardenHostelOverview from "../warden/WardenHostelOverview";
import WardenProfile from "../warden/WardenProfile";
import { HMSProvider } from "../../context/HMSContext";
import { AcademicProvider } from "../../context/AcademicContext";

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      case "profile":
        return <WardenProfile user={user} />;
      default:
        return <WardenDashboardOverview />;
    }
  };

  return (
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
  );
};

const WardenDashboard = (props: WardenDashboardProps) => (
  <HMSProvider>
    <AcademicProvider>
      <WardenDashboardContent {...props} />
    </AcademicProvider>
  </HMSProvider>
);

export default WardenDashboard;
