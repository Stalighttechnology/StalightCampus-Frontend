import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  headerActions
}) => {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024); // Start expanded on desktop, collapsed on mobile
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();
  const mainContentRef = useRef<HTMLElement>(null);

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

  // Use React Query to cache bootstrap/unread counts per role.
  const queryClient = useQueryClient();

  const studentQuery = useQuery({
    queryKey: ["dashboard", "student", "overview"],
    queryFn: getDashboardOverview,
    enabled: role === 'student',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000
  });

  const facultyQuery = useQuery({
    queryKey: ["dashboard", "faculty", "bootstrap"],
    queryFn: getFacultyDashboardBootstrap,
    enabled: role === 'faculty',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000
  });

  const hodQuery = useQuery({
    queryKey: ["dashboard", "hod", (user as any)?.extra?.branch_id || (user as any)?.branch_id || ''],
    queryFn: () => getHODStats((user as any)?.extra?.branch_id || (user as any)?.branch_id || ''),
    enabled: role === 'hod',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000
  });

  const adminQuery = useQuery({
    queryKey: ["dashboard", "admin", "stats"],
    queryFn: getAdminStats,
    enabled: role === 'admin' || role === 'principal',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000
  });

  // Derive unreadCount from whichever query is active for the role
  useEffect(() => {
    try {
      let count = 0;
      if (role === 'student' && studentQuery.data?.success && studentQuery.data.data) {
        count = studentQuery.data.data.unread_announcement_count || 0;
      } else if (role === 'faculty' && facultyQuery.data?.success && facultyQuery.data.data) {
        count = facultyQuery.data.data.unread_announcement_count || 0;
      } else if (role === 'hod' && hodQuery.data?.success && hodQuery.data.data) {
        count = hodQuery.data.data.unread_announcement_count || 0;
      } else if ((role === 'admin' || role === 'principal') && adminQuery.data?.success && adminQuery.data.data) {
        count = adminQuery.data.data.unread_announcement_count || 0;
      }
      setUnreadCount(count);
    } catch (e) {

    }
  }, [role, studentQuery.data, facultyQuery.data, hodQuery.data, adminQuery.data]);

  // Listen for manual refresh events — invalidate relevant queries instead of calling APIs directly
  useEffect(() => {
    const handleRefresh = (e: any) => {
      if (e.detail?.decrement) {
        setUnreadCount((prev) => Math.max(0, prev - (e.detail.decrement || 1)));
        return;
      }
      // Invalidate all dashboard queries so they refetch according to React Query rules
      queryClient.invalidateQueries(["dashboard"]);
    };
    window.addEventListener('refresh-unread-count', handleRefresh);
    return () => window.removeEventListener('refresh-unread-count', handleRefresh);
  }, [queryClient]);

  // Close sidebar when page changes on mobile/tablet only
  useEffect(() => {
    const isTutorialActive = document.body.classList.contains('tutorial-active');
    if (window.innerWidth < 1024 && !isTutorialActive) {
      setSidebarCollapsed(true);
    }
    // Always scroll to top when page changes
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activePage]);

  // Listen for onboarding system events to open/close sidebar drawer on mobile/tablet
  useEffect(() => {
    const handleOpen = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
      }
    };
    const handleClose = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('neurocampus_open_sidebar', handleOpen);
    window.addEventListener('neurocampus_close_sidebar', handleClose);
    return () => {
      window.removeEventListener('neurocampus_open_sidebar', handleOpen);
      window.removeEventListener('neurocampus_close_sidebar', handleClose);
    };
  }, []);

  const toggleSidebar = () => {
    // Only allow toggling on mobile/tablet (< 1024px)
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handlePageChange = (page: string) => {
    onPageChange(page);
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {

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
    return title.
      split("-").
      map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
      join(" ");
  };

  const isNoAnimation = role === 'admin' || role === 'principal' || role === 'hms' || role === 'warden';

  return (
    <motion.div
      className={`flex h-screen h-[100dvh] overflow-hidden ${theme === "dark" ?
        "dark bg-background text-foreground" :
        "bg-gray-50 text-gray-900"}`
      }
      initial={isNoAnimation ? false : { opacity: 0 }}
      animate={isNoAnimation ? false : { opacity: 1 }}
      transition={{ duration: 0.5 }}>

      {/* Sidebar */}
      <Sidebar
        role={role}
        setPage={handlePageChange}
        activePage={activePage}
        logout={handleLogout}
        collapsed={sidebarCollapsed}
        toggleCollapse={toggleSidebar} />


      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-screen h-[100dvh] overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-64'}`
        }>

        {/* Navbar */}
        <div
          className={`z-10 shadow-sm transition-all duration-300 w-full`}>

          <Navbar
            role={role}
            user={user}
            onNotificationClick={onNotificationClick}
            setPage={handlePageChange}
            showHamburger={sidebarCollapsed && window.innerWidth < 1024}
            onHamburgerClick={toggleSidebar}
            unreadCount={unreadCount} />

        </div>

        {/* Page Content */}
        <motion.main
          ref={mainContentRef}
          className={`flex-1 min-w-0 p-4 pb-32 md:pb-8 overflow-y-auto overflow-x-hidden thin-scrollbar ${theme === "dark" ? "bg-background" : "bg-gray-50"}`
          }
          initial={isNoAnimation ? false : { opacity: 0, y: 20 }}
          animate={isNoAnimation ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}>

          {/* Page Header */}


          {/* Error Message */}
          {error &&
            <motion.div
              className={`p-3 rounded-lg mb-4 ${theme === "dark" ?
                "bg-destructive/10 border border-destructive/20 text-destructive-foreground" :
                "bg-red-100 border border-red-200 text-red-700"}`
              }
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onAnimationComplete={() => setTimeout(() => setError(null), 3000)}>

              {error}
            </motion.div>
          }

          {isNoAnimation ?
            <div className="w-full">{children}</div> :

            <AnimatePresence mode="popLayout">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full">

                {children}
              </motion.div>
            </AnimatePresence>
          }
        </motion.main>
      </div>
    </motion.div>);

};

export default DashboardLayout;