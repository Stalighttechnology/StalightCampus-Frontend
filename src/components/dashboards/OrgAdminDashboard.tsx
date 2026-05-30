import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import AdminStats from "../admin/AdminStats";
import EnrollUser from "../admin/EnrollUser";
import UsersManagement from "../admin/UsersManagement";
import AdminProfile from "../admin/AdminProfile";
import BillingManagement from "../org_admin/BillingManagement";
import { useToast } from "../../hooks/use-toast";
import { isPageAllowed } from "../../utils/planGating";
import UpgradeRequired from "../common/UpgradeRequired";
import StudentInfoScanner from "../hod/StudentInfoScanner";

interface OrgAdminDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const OrgAdminDashboard = ({ user, setPage }: OrgAdminDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/org-admin', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/org-admin' : `/org-admin/${page}`;
    navigate(path);
    setError(null);
  };

  const renderContent = () => {
    const orgPlan = (user as any)?.org_plan || "basic";

    if (!activePage.includes('dashboard') && activePage !== 'billing' && !isPageAllowed(activePage, orgPlan)) {
      return <UpgradeRequired featureName={activePage} role={user.role} onBack={() => handlePageChange('dashboard')} />;
    }

    switch (activePage) {
      case "dashboard":
        return <AdminStats setError={setError} onNavigate={handlePageChange} />;

      case "users":
        return <UsersManagement setError={setError} toast={toast} />;

      case "enroll-user":
        return <EnrollUser setError={setError} toast={toast} />;

      case "billing":
        return <BillingManagement />;

      case "profile":
        return <AdminProfile user={user} setError={setError} />

      case "scan-student-info":
        return <StudentInfoScanner />

      default:
        return <AdminStats setError={setError} onNavigate={handlePageChange} />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="org_admin"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        pageTitle="Organization Admin Dashboard"
      >
        <div key={activePage}>
          {renderContent()}
        </div>
      </DashboardLayout>
    </>
  );
};

export default OrgAdminDashboard;
