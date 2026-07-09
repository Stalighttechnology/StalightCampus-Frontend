import { useState, useEffect } from "react";
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
import Profile from "./pages/Profile";
import EnrollDeveloper from "./pages/EnrollDeveloper";
import Coupons from "./pages/Coupons";
import NDASubmissions from "./pages/NDASubmissions";
import Popups from "./pages/Popups";
import BulkEmailer from "./pages/BulkEmailer";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Menu } from "lucide-react";
import { Button } from "../components/ui/button";
import { Capacitor } from "@capacitor/core";
import CertificateManagement from "../components/admin/CertificateManagement";

interface Props {
  setIsAuthenticated: (val: boolean) => void;
}

const SuperAdminDashboard = ({ setIsAuthenticated }: Props) => {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1024);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setCollapsed(false);
      } else {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    window.location.href = "/stalightcampus/admin";
  };

  return (
    <div className={`flex h-screen h-[100dvh] overflow-hidden ${theme === 'dark' ? 'dark bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar
        activePage={activePage}
        setActivePage={handlePageChange}
        onLogout={handleLogout}
        collapsed={collapsed}
        toggleCollapse={() => setCollapsed(!collapsed)}
      />

      <main className="flex-1 flex flex-col h-screen h-[100dvh] overflow-hidden relative">
        {/* Top Navbar */}
        <header 
          className={`w-full flex-shrink-0 border-b flex items-center justify-between px-4 pb-3 lg:pb-0 relative z-20 transition-all duration-500 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'}`}
          style={{
            height: window.innerWidth >= 1024 ? '5rem' : undefined,
            paddingTop: Capacitor.isNativePlatform()
              ? 'calc(env(safe-area-inset-top, 24px) + 2px)'
              : window.innerWidth < 1024 ? '16px' : '0px'
          }}
        >
          <div className="flex items-center gap-4">
            {/* Hamburger for mobile view */}
            <div className="block lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className={theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}
                onClick={() => setCollapsed(!collapsed)}
              >
                <Menu size={20} />
              </Button>
            </div>
            <div className="flex flex-col">
              <h2 className={`font-semibold text-base leading-tight capitalize ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {activePage === 'dashboard' ? 'Overview' : activePage === 'nda' ? 'NDA & Consents' : activePage.replace('-', ' ')}
              </h2>
              <p className={`text-[9px] uppercase tracking-wider font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Super Admin Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={theme === 'dark' ? 'text-yellow-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">Super Admin</p>
                <p className="text-xs text-muted-foreground">HQ Access</p>
              </div>
              <button
                onClick={() => handlePageChange('profile')}
                title="My Profile"
                className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm hover:bg-primary/20 transition-colors"
              >
                SA
              </button>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-4 pb-6 md:pb-8 thin-scrollbar ${theme === "dark" ? "bg-background" : "bg-gray-50"}`}>
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Overview />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="billing" element={<Billing />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="users" element={<UserAnalytics />} />
              <Route path="support" element={<Support />} />
              <Route path="enroll-developer" element={<EnrollDeveloper />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="popups" element={<Popups />} />
              <Route path="reports" element={<Reports />} />
              <Route path="nda" element={<NDASubmissions />} />
              <Route path="marketing" element={<BulkEmailer />} />
              <Route path="profile" element={<Profile />} />
              <Route path="certificates" element={<CertificateManagement />} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-[60vh]">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-4">Coming Soon</h2>
                  <p className="text-gray-500">This module is currently under development.</p>
                </div>
              } />
            </Routes>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
