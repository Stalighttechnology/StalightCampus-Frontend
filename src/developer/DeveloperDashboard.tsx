import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import AssignedIssues from "./pages/AssignedIssues";
import HQMonitor from "./pages/HQMonitor";
import Profile from "./pages/DeveloperProfile";
import DeveloperAttendance from "../superadmin/pages/DeveloperAttendance";
import DeveloperAnnouncements from "../superadmin/pages/DeveloperAnnouncements";
import { useTheme } from "../context/ThemeContext";
import { API_BASE_URL } from "@/utils/config";

interface Props {
  setIsAuthenticated: (val: boolean) => void;
}

const DeveloperDashboard = ({ setIsAuthenticated }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme } = useTheme();
  const navigate = useNavigate();

  const fetchUnreadCount = async () => {
    try {
      let token = localStorage.getItem("superadmin_token");
      if (!token) token = sessionStorage.getItem("access_token");
      if (!token) return;
      // Use announcements API to get the correct unread announcement count
      const res = await fetch(`${API_BASE_URL}/api/announcements/?received_page=1&received_page_size=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.received_announcements?.unread_count ?? 0;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Listen for a direct count update (dispatched by DeveloperAnnouncements after each fetch)
    const handleCountUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.count === 'number') {
        setUnreadCount(detail.count);
      } else {
        fetchUnreadCount();
      }
    };

    window.addEventListener("set-announcement-unread", handleCountUpdate);
    window.addEventListener("refresh-unread-count", fetchUnreadCount);
    window.addEventListener("refresh-announcements", fetchUnreadCount);

    return () => {
      window.removeEventListener("set-announcement-unread", handleCountUpdate);
      window.removeEventListener("refresh-unread-count", fetchUnreadCount);
      window.removeEventListener("refresh-announcements", fetchUnreadCount);
    };
  }, []);

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
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md z-10 flex items-center justify-between px-6 shadow-sm">
           <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Developer Mode</span>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/stalightcampus/developer/announcements')}
                className="relative p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </button>
              <button 
                onClick={() => navigate('/stalightcampus/developer/profile')}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
              </button>
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
                <Route path="attendance" element={<DeveloperAttendance />} />
                <Route path="announcements" element={<DeveloperAnnouncements />} />
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
