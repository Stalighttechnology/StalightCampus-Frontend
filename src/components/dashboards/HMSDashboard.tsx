import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { TutorialController } from "../../onboarding/components/TutorialController";
import HMSOverview from "../hms/HMSOverview";
import HostelManagement from "../hms/HostelManagement";
import RoomManagement from "../hms/RoomManagement";
import StudentManagement from "../hms/StudentManagement";
import Enrollment from "../hms/Enrollment";
import StaffManagementOverview from "../hms/StaffManagementOverview";
import MenuManagement from "../hms/MenuManagement";
import IssueTracking from "../hms/IssueTracking";
import HMSProfile from "../hms/HMSProfile";
import StudentMealManagement from "../hms/StudentMealManagement";
import HmsVisitorLogs from "../hms/HmsVisitorLogs";
import { useToast } from "../../hooks/use-toast";
import { logoutUser } from "../../utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { HMSProvider, useHMSContext } from "../../context/HMSContext";
import { AcademicProvider } from "../../context/AcademicContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

interface HMSDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const HMSDashboardContent = ({ user, setPage }: HMSDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hostels, loading, skeletonMode, setSkeletonMode, refreshData } = useHMSContext();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);

  // Set initial selected hostel if not set or if current selection is invalid
  useEffect(() => {
    if (hostels.length > 0) {
      const isValid = hostels.some(h => h.id === selectedHostelId);
      if (!isValid) {
        setSelectedHostelId(hostels[0].id);
      }
    } else {
      setSelectedHostelId(null);
    }
  }, [hostels, selectedHostelId]);

  // Get active page from URL path
  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/hms', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/hms' : `/hms/${page}`;
    navigate(path);
  };

  const handleNotificationClick = () => {
    navigate('/hms/notifications');
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "":
        return <HMSOverview />;
      case "hostels":
        return <HostelManagement />;
      case "rooms":
        return <RoomManagement />;
      case "students":
        return <StudentManagement />;
      case "enrollment":
        return <Enrollment />;
      case "staff":
        return <StaffManagementOverview />;
      case "menu-management":
        return <MenuManagement />;
      case "student-meals":
        return <StudentMealManagement hostelId={selectedHostelId} />;
      case "issues":
        if (selectedHostelId) {
          return <IssueTracking hostelId={selectedHostelId} />;
        }
        if (!loading) {
          return (
            <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-muted-foreground/20 rounded-2xl bg-muted/5 max-w-xl mx-auto text-center mt-8">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Building2 className="w-10 h-10 text-muted-foreground/70" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No Hostels Found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                No hostels are registered in your organization yet. Register a hostel to start tracking issues.
              </p>
              <Button 
                onClick={() => handlePageChange('hostels')}
                className="mt-6 bg-primary text-white hover:bg-primary/90"
              >
                Go to Hostel Management
              </Button>
            </div>
          );
        }
        return null;
      case "visitor_logs":
        return <HmsVisitorLogs />;
      case "profile":
        return <HMSProfile user={user} />;
      default:
        return <HMSOverview />;
    }
  };

  return (
    <>
      <TutorialController />
      <DashboardLayout
        role="hms"
        user={user}
        activePage={activePage}
        onPageChange={handlePageChange}
        onNotificationClick={handleNotificationClick}
        pageTitle="HMS Dashboard"
      >
      <div className="space-y-4">
        {/* Page content rendered below */}

        {/* Header - Only show for non-dashboard pages */}
        {(activePage !== '' && activePage !== 'dashboard') && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Page specific header content can go here if needed in future */}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="mt-4">
          <div key={activePage}>
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
    </>
  );
};

const HMSDashboard = (props: HMSDashboardProps) => (
  <AcademicProvider>
    <HMSDashboardContent {...props} />
  </AcademicProvider>
);

export default HMSDashboard;