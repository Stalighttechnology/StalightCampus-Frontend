import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Overview from "./pages/Overview";
import Organizations from "./pages/Organizations";
import Billing from "./pages/Billing";
import Subscriptions from "./pages/Subscriptions";
import UserAnalytics from "./pages/UserAnalytics";
import Support from "./pages/Support";
import Monitoring from "./pages/Monitoring";
import Reports from "./pages/Reports";
import { useTheme } from "../context/ThemeContext";

interface Props {
  setIsAuthenticated: (val: boolean) => void;
}

const SuperAdminDashboard = ({ setIsAuthenticated }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const getActivePage = () => {
    const path = location.pathname.split("/").pop();
    return path || "dashboard";
  };

  const activePage = getActivePage();

  const handlePageChange = (page: string) => {
    navigate(`/stalightcampus/admin/${page}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("superadmin_token");
    localStorage.removeItem("superadmin_refresh");
    localStorage.removeItem("superadmin_role");
    setIsAuthenticated(false);
    navigate("/stalightcampus/admin");
  };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar
        activePage={activePage}
        setActivePage={handlePageChange}
        onLogout={handleLogout}
        collapsed={collapsed}
        toggleCollapse={() => setCollapsed(!collapsed)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Navbar */}
        <header className={`h-16 flex-shrink-0 border-b flex items-center justify-between px-6 sticky top-0 z-20 ${theme === 'dark' ? 'bg-zinc-950/80 backdrop-blur-md border-zinc-800' : 'bg-white/80 backdrop-blur-md border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold capitalize">
              {activePage === 'dashboard' ? 'Overview' : activePage.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">Super Admin</p>
                <p className="text-xs text-muted-foreground">HQ Access</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                SA
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Overview />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="billing" element={<Billing />} />
                <Route path="subscriptions" element={<Subscriptions />} />
                <Route path="users" element={<UserAnalytics />} />
                <Route path="support" element={<Support />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="reports" element={<Reports />} />
                <Route path="*" element={
                  <div className="flex flex-col items-center justify-center h-[60vh]">
                    <h2 className="text-2xl font-bold text-muted-foreground mb-4">Coming Soon</h2>
                    <p className="text-gray-500">This module is currently under development.</p>
                  </div>
                } />
              </Routes>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
