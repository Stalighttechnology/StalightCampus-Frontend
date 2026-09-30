import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../common/DashboardLayout";
import { RecordSchoolVisitForm } from "../field_visitor/RecordSchoolVisitForm";
import { FieldVisitHistory } from "../field_visitor/FieldVisitHistory";
import { SchoolDatabaseView } from "../field_visitor/SchoolDatabaseView";
import { FieldVisitorProfileView } from "../field_visitor/FieldVisitorProfileView";
import Profile from "../common/Profile";

interface FieldVisitorDashboardProps {
  user: any;
  setPage?: (page: string) => void;
}

const FieldVisitorDashboard: React.FC<FieldVisitorDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedOrgIdForVisit, setSelectedOrgIdForVisit] = useState<number | undefined>(undefined);

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/field-visitor', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/field-visitor' : `/field-visitor/${page}`;
    navigate(path);
  };

  const handleStartVisitForSchool = (orgId?: number) => {
    setSelectedOrgIdForVisit(orgId);
    handlePageChange("new-visit");
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      case "new-visit":
      case "":
        return (
          <div className="space-y-6">
            <RecordSchoolVisitForm
              initialOrgId={selectedOrgIdForVisit}
              onSuccess={() => {
                setSelectedOrgIdForVisit(undefined);
                handlePageChange("visit-history");
              }}
            />
          </div>
        );

      case "visit-history":
        return (
          <div className="space-y-6">
            <FieldVisitHistory onStartNewVisit={handleStartVisitForSchool} />
          </div>
        );

      case "school-database":
        return (
          <div className="space-y-6">
            <SchoolDatabaseView onSelectSchoolForVisit={handleStartVisitForSchool} />
          </div>
        );

      case "profile":
      case "officer-profile":
        return (
          <div className="space-y-6">
            <FieldVisitorProfileView />
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <RecordSchoolVisitForm
              initialOrgId={selectedOrgIdForVisit}
              onSuccess={() => {
                setSelectedOrgIdForVisit(undefined);
                handlePageChange("visit-history");
              }}
            />
          </div>
        );
    }
  };

  return (
    <DashboardLayout
      role="field_visitor"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Field Visitor Mobile ERP"
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

export default FieldVisitorDashboard;
