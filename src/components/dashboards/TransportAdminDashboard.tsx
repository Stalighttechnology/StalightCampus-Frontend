import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import TransportAdminDashboardContent from "../transport/TransportAdminDashboard";
import Profile from "../common/Profile";

interface DashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const TransportAdminDashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/transport-admin', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/transport-admin' : `/transport-admin/${page}`;
    navigate(path);
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "":
        return <TransportAdminDashboardContent initialTab="overview" />;
      case "transport-buses":
        return <TransportAdminDashboardContent initialTab="buses" />;
      case "transport-routes":
        return <TransportAdminDashboardContent initialTab="routes" />;
      case "transport-drivers":
        return <TransportAdminDashboardContent initialTab="drivers" />;
      case "transport-allocations":
        return <TransportAdminDashboardContent initialTab="allocations" />;
      case "transport-tracking":
        return <TransportAdminDashboardContent initialTab="tracking" />;
      case "transport-incidents":
        return <TransportAdminDashboardContent initialTab="incidents" />;
      case "profile":
        return <Profile role="transport_admin" user={user} />;
      default:
        return <TransportAdminDashboardContent initialTab="overview" />;
    }
  };

  return (
    <DashboardLayout
      role="transport_admin"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Transport Admin Dashboard"
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

export default TransportAdminDashboard;
