import React from "react";
import FacultyAttendance from "../faculty/FacultyAttendance";
import { useTheme } from "../../context/ThemeContext";

const AdminAttendance: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div className={` ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <FacultyAttendance />
    </div>
  );
};

export default AdminAttendance;
