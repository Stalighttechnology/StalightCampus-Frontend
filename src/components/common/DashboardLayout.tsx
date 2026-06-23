import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useIsMobile } from "../../hooks/use-mobile";
import { useTheme } from "../../context/ThemeContext";
import { logoutUser } from "../../utils/authService";
import { useAuth } from "../../context/AuthContext";
import { getDashboardOverview, getUnreadNotificationCount } from "../../utils/student_api";
import { getFacultyDashboardBootstrap } from "../../utils/faculty_api";
import { getHODStats } from "../../utils/hod_api";
import { getAdminStats } from "../../utils/admin_api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFCM } from "../../hooks/useFCM";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { NavigationBar } from "@capgo/capacitor-navigation-bar";

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
  role: "admin" | "principal" | "org_admin" | "hod" | "faculty" | "student" | "fees_manager" | "coe" | "dean" | "hms" | "warden" | "transport_admin" | "driver" | "library_admin";
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
  const { clearAuth } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();
  const mainContentRef = useRef<HTMLElement>(null);

  // Lock document viewport and scroll when library admin dashboard is active to prevent double scrolling
  useEffect(() => {
    if (role === 'library_admin') {
      document.documentElement.classList.add("dashboard-active");
      document.body.classList.add("dashboard-active");
    }
    return () => {
      document.documentElement.classList.remove("dashboard-active");
      document.body.classList.remove("dashboard-active");
    };
  }, [role]);

  // Synchronize native Status Bar and Navigation Bar colors when Dashboard mounts or theme updates
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light
      }).catch(() => {});
      StatusBar.setBackgroundColor({
        color: '#00000000'
      }).catch(() => {});
      NavigationBar.setNavigationBarColor({
        color: theme === 'dark' ? '#0a0a0c' : '#ffffff',
        darkButtons: theme === 'light'
      }).catch(() => {});

      const setStatusBarHeight = () => {
        const totalHeight = window.screen.height;
        const availHeight = window.innerHeight;
        const diff = totalHeight - availHeight;
        const dpr = window.devicePixelRatio || 1;
        const statusBarPx = Math.round(diff / dpr);
        
        if (statusBarPx > 0 && statusBarPx < 120) {
          document.documentElement.style.setProperty(
            '--sat', `${statusBarPx}px`
          );
        }
        console.log('Status bar height calculated:', statusBarPx);
      };

      // Run immediately and after short delay
      setStatusBarHeight();
      setTimeout(setStatusBarHeight, 300);
      setTimeout(setStatusBarHeight, 800);
    }
  }, [theme]);

  // Mount FCM listener for all roles — keeps bell count real-time
  const accessToken = sessionStorage.getItem('access_token');
  useFCM(accessToken);

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
    refetchOnWindowFocus: false
  });

  const facultyQuery = useQuery({
    queryKey: ["dashboard", "faculty", "bootstrap"],
    queryFn: getFacultyDashboardBootstrap,
    enabled: role === 'faculty',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const hodQuery = useQuery({
    queryKey: ["dashboard", "hod", (user as any)?.extra?.branch_id || (user as any)?.branch_id || ''],
    queryFn: () => getHODStats((user as any)?.extra?.branch_id || (user as any)?.branch_id || ''),
    enabled: role === 'hod',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const adminQuery = useQuery({
    queryKey: ["dashboard", "admin", "stats"],
    queryFn: getAdminStats,
    enabled: role === 'admin' || role === 'principal' || role === 'org_admin',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Dedicated lightweight query for the unread notification count
  const unreadCountQuery = useQuery({
    queryKey: ["unreadCount"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true, // It's okay to poll this fast endpoint on focus
  });

  useEffect(() => {
    if (unreadCountQuery.data?.success) {
      setUnreadCount(unreadCountQuery.data.count || unreadCountQuery.data.unread_count || 0);
    }
  }, [unreadCountQuery.data]);

  // Listen for manual refresh events AND service worker push messages — both update the bell count
  useEffect(() => {
    const handleRefresh = (e: any) => {
      if (e.detail?.decrement) {
        setUnreadCount((prev) => Math.max(0, prev - (e.detail.decrement || 1)));
        return;
      }
      // Immediately increment optimistically, then sync with server
      setUnreadCount((prev) => prev + 1);
      queryClient.invalidateQueries(["unreadCount"]);
    };
    window.addEventListener('refresh-unread-count', handleRefresh);

    // Listen for postMessage from firebase-messaging-sw.js (background push received)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FCM_PUSH_RECEIVED') {
        setUnreadCount((prev) => prev + 1);
        queryClient.invalidateQueries(["unreadCount"]);
        // Play the chime sound in the background tab
        window.dispatchEvent(new CustomEvent('play-notification-sound'));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('refresh-unread-count', handleRefresh);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
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
    window.addEventListener('stalightcampus_open_sidebar', handleOpen);
    window.addEventListener('stalightcampus_close_sidebar', handleClose);
    return () => {
      window.removeEventListener('stalightcampus_open_sidebar', handleOpen);
      window.removeEventListener('stalightcampus_close_sidebar', handleClose);
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
      queryClient.clear(); // Clear React Query cache so previous user's data is wiped
      clearAuth();
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

  const isNoAnimation = role === 'admin' || role === 'principal' || role === 'org_admin' || role === 'hms' || role === 'warden' || role === 'transport_admin' || role === 'driver' || role === 'library_admin';

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
        className={`flex-1 min-h-0 min-w-0 flex flex-col h-screen h-[100dvh] overflow-hidden transition-all duration-300 pb-[env(safe-area-inset-bottom,0px)] ${sidebarCollapsed ? 'ml-0' : 'lg:ml-64'}`
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

        <motion.main
          ref={mainContentRef}
          className={`flex-1 min-h-0 min-w-0 p-4 pb-6 md:pb-8 overflow-y-auto overflow-x-hidden thin-scrollbar ${theme === "dark" ? "bg-background" : "bg-gray-50"}`
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

          {isNoAnimation || isMobile ?
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
    </motion.div>
  );
};

export default DashboardLayout;