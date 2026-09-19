import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { InventoryAnalytics } from "../inventory/dashboard/InventoryAnalytics";
import { InventoryList } from "../inventory/items/InventoryList";
import { ProcurementRequests } from "../inventory/procurement/ProcurementRequests";
import { QuotationManager } from "../inventory/procurement/QuotationManager";
import { MaintenanceTickets } from "../inventory/tickets/MaintenanceTickets";
import { CategoryManagement } from "../inventory/settings/CategoryManagement";
import { LocationManagement } from "../inventory/settings/LocationManagement";
import ApplyLeaveDepartmentAdmin from "../faculty/ApplyLeave";
import FacultyAttendance from "../faculty/FacultyAttendance";
import FacultyAnnouncementManagement from "../faculty/FacultyAnnouncementManagement";
import { HolidayCalendar } from "../admin/HolidayCalendar";
import ScheduleMeeting from "../common/ScheduleMeeting";
import FacultyPayroll from "../faculty/FacultyPayroll";
import EmployeeReimbursements from "../faculty/EmployeeReimbursements";
import StaffTaskTracker from "../common/StaffTaskTracker";
import Profile from "../common/Profile";

interface DashboardProps {
  user: any;
  setPage?: (page: string) => void;
}

const InventoryManagerDashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace("/inventory-manager", "").replace("/inventory-admin", "").replace("/", "");
    return path || "dashboard";
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const basePath = "/inventory-manager";
    const path = page === "dashboard" ? basePath : `${basePath}/${page}`;
    navigate(path);
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "overview":
      case "":
        return <InventoryAnalytics role="inventory_manager" />;
      case "inventory-items":
      case "inventory-assets":
      case "items":
        return <InventoryList role="inventory_manager" />;
      case "inventory-procurement":
      case "procurement":
        return <ProcurementRequests role="inventory_manager" />;
      case "inventory-quotations":
      case "quotations":
        return <QuotationManager role="inventory_manager" />;
      case "inventory-tickets":
      case "tickets":
      case "maintenance":
        return <MaintenanceTickets role="inventory_manager" />;
      case "inventory-categories":
      case "categories":
        return <CategoryManagement role="inventory_manager" />;
      case "inventory-locations":
      case "locations":
        return <LocationManagement role="inventory_manager" />;
      case "apply-leave":
      case "leave":
        return <ApplyLeaveDepartmentAdmin />;
      case "my-attendance":
      case "faculty-attendance":
        return <FacultyAttendance />;
      case "announcements":
      case "faculty-announcement-management":
        return <FacultyAnnouncementManagement />;
      case "holiday-calendar":
        return <HolidayCalendar readOnly showLeaves userRole="inventory_manager" />;
      case "schedule-meeting":
        return <ScheduleMeeting />;
      case "my-payroll":
        return <FacultyPayroll />;
      case "reimbursements":
        return <EmployeeReimbursements />;
      case "staff-tasks":
        return <StaffTaskTracker />;
      case "profile":
        return <Profile role="inventory_manager" user={user} />;
      default:
        return <InventoryAnalytics role="inventory_manager" />;
    }
  };

  return (
    <DashboardLayout
      role="inventory_manager"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Inventory Operations Hub"
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div key={activePage}>
          {renderContent()}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default InventoryManagerDashboard;
