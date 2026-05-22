import React from "react";
import { TutorialController } from "../../onboarding/components/TutorialController";
import FeesManagerDashboard from "../FeesManager/FeesManagerDashboard";

interface FeesManagerDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const FeesManagerDashboardWrapper: React.FC<FeesManagerDashboardProps> = ({ user, setPage }) => {
  return (
    <>
      <TutorialController />
      <FeesManagerDashboard user={user} setPage={setPage} />
    </>
  );
};

export default FeesManagerDashboardWrapper;