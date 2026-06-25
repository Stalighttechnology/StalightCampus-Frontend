import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import AssignedIssues from "./pages/AssignedIssues";
import HQMonitor from "./pages/HQMonitor";
import Profile from "./pages/DeveloperProfile";
import { useTheme } from "../context/ThemeContext";

interface Props {
  setIsAuthenticated: (val: boolean) => void;
}

const DeveloperDashboard = ({ setIsAuthenticated }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-[#0B0F19]' : 'bg-gray-50'}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} setIsAuthenticated={setIsAuthenticated} />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Animated Background Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute top-40 -left-40 w-96 h-96 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Header / Navbar equivalent */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md z-10 flex items-center justify-end px-6 shadow-sm">
           <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Developer Mode</span>
           </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full max-w-7xl mx-auto"
          >
            <Routes>
                <Route path="/" element={<Navigate to="assigned-issues" replace />} />
                <Route path="assigned-issues" element={<AssignedIssues />} />
                <Route path="monitoring" element={<HQMonitor />} />
                <Route path="profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="assigned-issues" replace />} />
            </Routes>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
