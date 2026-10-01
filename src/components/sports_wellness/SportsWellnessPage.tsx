import React from "react";
import SportsWellnessHub from "./SportsWellnessHub";

interface SportsWellnessPageProps {
  userRole?: string;
  readOnly?: boolean;
}

export const SportsWellnessPage: React.FC<SportsWellnessPageProps> = ({
  userRole = "counsellor",
  readOnly = false,
}) => {
  return (
    <div className="w-full max-w-none mx-auto min-w-0">
      <SportsWellnessHub userRole={userRole} readOnly={readOnly} />
    </div>
  );
};

export default SportsWellnessPage;
