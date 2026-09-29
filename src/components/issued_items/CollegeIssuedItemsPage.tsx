import React from "react";
import { CollegeIssuedItemsList } from "./CollegeIssuedItemsList";

interface CollegeIssuedItemsPageProps {
  userRole?: string;
  readOnly?: boolean;
}

export const CollegeIssuedItemsPage: React.FC<CollegeIssuedItemsPageProps> = ({
  userRole = "counsellor",
  readOnly = false,
}) => {
  return (
    <div className="space-y-6">
      <CollegeIssuedItemsList userRole={userRole} readOnly={readOnly} />
    </div>
  );
};

export default CollegeIssuedItemsPage;
