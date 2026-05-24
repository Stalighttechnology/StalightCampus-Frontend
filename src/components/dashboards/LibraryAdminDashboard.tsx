import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import LibraryAdminPanel from "../library/LibraryAdminPanel";
import Profile from "../common/Profile";

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
        return <LibraryAdminPanel initialTab="overview" />;
      case "library-books":
        return <LibraryAdminPanel initialTab="catalog" />;
      case "library-circulation":
        return <LibraryAdminPanel initialTab="circulation" />;
      case "library-reserves":
        return <LibraryAdminPanel initialTab="reserves" />;
      case "library-fines":
        return <LibraryAdminPanel initialTab="fines" />;
      case "profile":
        return <Profile role="library_admin" user={user} />;
      default:
        return <LibraryAdminPanel initialTab="overview" />;
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
