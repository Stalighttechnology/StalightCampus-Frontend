import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import Profile from "../common/Profile";

import TransportOverview from "../transport/admin/TransportOverview";
import TransportBuses from "../transport/admin/TransportBuses";
import TransportRoutes from "../transport/admin/TransportRoutes";
import TransportDrivers from "../transport/admin/TransportDrivers";
import TransportAllocations from "../transport/admin/TransportAllocations";
import TransportTracking from "../transport/admin/TransportTracking";
import TransportIncidents from "../transport/admin/TransportIncidents";
import ApplyLeaveDepartmentAdmin from "../admin/ApplyLeaveDepartmentAdmin";
import DriverLeavesManagement from "../transport/admin/LeaveManagement";
import { TutorialController } from "../../onboarding/components/TutorialController";

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
        return <TransportOverview />;
      case "transport-buses":
        return <TransportBuses />;
      case "transport-routes":
        return <TransportRoutes />;
      case "transport-drivers":
        return <TransportDrivers />;
      case "transport-allocations":
        return <TransportAllocations />;
      case "transport-tracking":
        return <TransportTracking />;
      case "transport-incidents":
        return <TransportIncidents />;
      case "apply-leave":
        return <ApplyLeaveDepartmentAdmin />;
      case "manage-leaves":
        return <DriverLeavesManagement />;
      case "profile":
        return <Profile role="transport_admin" user={user} />;
      default:
        return <TransportOverview />;
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

export default TransportAdminDashboard;
