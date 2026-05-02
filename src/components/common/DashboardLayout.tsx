import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useIsMobile } from "../../hooks/use-mobile";
import { useTheme } from "../../context/ThemeContext";
import { stopTokenRefresh, logoutUser } from "../../utils/authService";
import { getDashboardOverview } from "../../utils/student_api";
import { getFacultyDashboardBootstrap } from "../../utils/faculty_api";
import { getHODStats } from "../../utils/hod_api";
import { getAdminStats } from "../../utils/admin_api";

interface User {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  branch?: string;
}

interface DashboardLayoutProps {
  role: "admin" | "principal" | "hod" | "faculty" | "student" | "fees_manager" | "coe" | "dean" | "hms" | "warden";
  user: User;
  activePage: string;
  onPageChange: (page: string) => void;
  onNotificationClick?: () => void;
  children: React.ReactNode;
  pageTitle?: string;
  headerActions?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  role,
  user,
  activePage,
  onPageChange,
  onNotificationClick,
  children,
  pageTitle,
  headerActions,
}) => {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024); // Start expanded on desktop, collapsed on mobile
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();

  // Lock sidebar open on desktop, collapsible only on mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false); // Force expand on desktop - no collapsing allowed
      } else {
        setSidebarCollapsed(true); // Allow collapse on mobile/tablet
      }
    };

    // Set initial state
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch unread announcement count based on role
  const fetchUnreadCount = useCallback(async () => {
    if (!role) return;

    try {
      let count = 0;
      if (role === 'student') {
        const res = await getDashboardOverview();
        if (res.success && res.data) {
          count = res.data.unread_announcement_count || 0;
        }
      } else if (role === 'faculty') {
        const res = await getFacultyDashboardBootstrap();
        if (res.success && res.data) {
          count = res.data.unread_announcement_count || 0;
        }
      } else if (role === 'hod') {
        // branch_id is determined server-side — the query param is optional validation only
        const branchId = (user as any)?.extra?.branch_id || (user as any)?.branch_id || '';
        const res = await getHODStats(branchId);
        if (res.success && res.data) {
          count = res.data.unread_announcement_count || 0;
        }
      } else if (role === 'admin' || role === 'principal') {
        const res = await getAdminStats();
        if (res.success && res.data) {
          count = res.data.unread_announcement_count || 0;
        }
      }
      setUnreadCount(count);
    } catch (e) {
      console.error("Error fetching unread count:", e);
    }
  }, [role, user]);

  useEffect(() => {
    fetchUnreadCount();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000);
    
    // Add event listener for manual refreshes from child components
    window.addEventListener('refresh-unread-count', fetchUnreadCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-unread-count', fetchUnreadCount);
    };
  }, [fetchUnreadCount]);

  // Close sidebar when page changes on mobile/tablet only
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, [activePage]);

  const toggleSidebar = () => {
    // Only allow toggling on mobile/tablet (< 1024px)
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handlePageChange = (page: string) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout backend error:", err);
    } finally {
      localStorage.clear();
      stopTokenRefresh();
      // Use client-side navigation to avoid reloading from backend server
      try {
        navigate("/", { replace: true });
      } catch (e) {
        // Fallback to full reload if router not available
        window.location.href = "/";
      }
    }
  };

  // Format page title
  const formatTitle = (title: string) => {
    if (title === "dashboard") return `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`;
    return title
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isNoAnimation = role === 'admin' || role === 'principal' || role === 'hms' || role === 'warden';

  return (
    <motion.div
      className={`flex h-screen overflow-hidden ${
        theme === "dark"
          ? "dark bg-background text-foreground"
          : "bg-gray-50 text-gray-900"
      }`}
      initial={isNoAnimation ? false : { opacity: 0 }}
      animate={isNoAnimation ? false : { opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Sidebar */}
      <Sidebar
        role={role}
        setPage={handlePageChange}
        activePage={activePage}
        logout={handleLogout}
        collapsed={sidebarCollapsed}
        toggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0' : 'ml-64'
        }`}
      >
        {/* Navbar */}
        <div
          className={`z-10 shadow-sm transition-all duration-300 w-full`}
        >
          <Navbar
            role={role}
            user={user}
            onNotificationClick={onNotificationClick}
            setPage={handlePageChange}
            showHamburger={sidebarCollapsed && window.innerWidth < 1024}
            onHamburgerClick={toggleSidebar}
            unreadCount={unreadCount}
          />
        </div>

        {/* Page Content */}
        <motion.main
          className={`flex-1 min-w-0 p-4 mb-2 overflow-y-auto overflow-x-hidden thin-scrollbar ${
            theme === "dark" ? "bg-background" : "bg-gray-50"
          }`}
          initial={isNoAnimation ? false : { opacity: 0, y: 20 }}
          animate={isNoAnimation ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Page Header */}
          

          {/* Error Message */}
          {error && (
            <motion.div
              className={`p-3 rounded-lg mb-4 ${
                theme === "dark"
                  ? "bg-destructive/10 border border-destructive/20 text-destructive-foreground"
                  : "bg-red-100 border border-red-200 text-red-700"
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onAnimationComplete={() => setTimeout(() => setError(null), 3000)}
            >
              {error}
            </motion.div>
          )}

          {/* Children Content */}
          {isNoAnimation ? (
            <div className="h-full w-full">{children}</div>
          ) : (
            <AnimatePresence mode="popLayout">{children}</AnimatePresence>
          )}
        </motion.main>
      </div>
    </motion.div>
  );
};

export default DashboardLayout;
