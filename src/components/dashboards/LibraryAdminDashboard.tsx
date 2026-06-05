import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import LibraryOverview from "../library/LibraryOverview";
import LibraryBooksCatalog from "../library/LibraryBooksCatalog";
import LibraryCirculation from "../library/LibraryCirculation";
import LibraryFineManagement from "../library/LibraryFineManagement";
import ApplyLeaveDepartmentAdmin from "../common/ApplyLeaveDepartmentAdmin";
import Profile from "../common/Profile";
import { TutorialController } from "../../onboarding/components/TutorialController";

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
      case "library-books":
        return <LibraryBooksCatalog />;
      case "library-circulation":
        return <LibraryCirculation />;
      case "library-fines":
        return <LibraryFineManagement />;
      case "apply-leave":
        return <ApplyLeaveDepartmentAdmin />;
      case "profile":
        return <Profile role="library_admin" user={user} />;
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
      <div>
        <div key={activePage}>
          {renderContent()}
        </div>
      </div>
      <TutorialController />
    </DashboardLayout>
  );
};

export default LibraryAdminDashboard;
