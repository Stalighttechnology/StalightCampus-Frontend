import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ListTodo, Activity, User, LogOut, ChevronLeft, ChevronRight, CalendarCheck, Megaphone, MessageSquare, Calendar, X } from "lucide-react";
import { useState, useEffect } from "react";

import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../utils/authService";

interface Props {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  setIsAuthenticated: (val: boolean) => void;
}

const MENU_ITEMS = [
  { id: "assigned-issues", label: "Assigned Issues", icon: <ListTodo size={20} /> },
  { id: "monitoring", label: "HQ Monitor", icon: <Activity size={20} /> },
  { id: "attendance", label: "My Attendance", icon: <CalendarCheck size={20} /> },
  { id: "leaves", label: "Apply Leave", icon: <Calendar size={20} /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone size={20} /> },
  { id: "chat", label: "HQ Chat", icon: <MessageSquare size={20} /> },
  { id: "profile", label: "Profile", icon: <User size={20} /> },
];

const Sidebar = ({ collapsed, setCollapsed, setIsAuthenticated }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [chatUnread, setChatUnread] = useState(0);
  const [isIntern, setIsIntern] = useState<boolean>(() => localStorage.getItem("developer_is_intern") === "true");

  useEffect(() => {
    const checkInternStatus = async () => {
      try {
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/developer/profile/`);
        if (response.ok) {
          const data = await response.json();
          const profile = data.profile || {};
          const internDetected = 
            profile.is_intern === true || 
            profile.role === 'INTERN' || 
            (typeof profile.designation === 'string' && profile.designation.toLowerCase().includes('intern'));
          setIsIntern(internDetected);
          localStorage.setItem("developer_is_intern", internDetected ? "true" : "false");
        }
      } catch (err) {
        console.error("Failed to check developer role status", err);
      }
    };

    checkInternStatus();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent).detail?.count ?? 0;
      setChatUnread(count);
    };
    window.addEventListener("hq-chat-unread", handler);
    return () => window.removeEventListener("hq-chat-unread", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("superadmin_token");
    localStorage.removeItem("superadmin_refresh");
    localStorage.removeItem("superadmin_role");
    localStorage.removeItem("developer_is_intern");
    setIsAuthenticated(false);
    window.location.href = "/stalightcampus/developer";
  };

  const visibleMenuItems = isIntern 
    ? MENU_ITEMS.filter((item) => item.id !== "monitoring") 
    : MENU_ITEMS;

  const renderContent = (isMobileView: boolean) => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50 shrink-0">
        {(!collapsed || isMobileView) && (
          <div className="font-bold text-lg text-primary truncate">
            Developer Portal
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors mx-auto"
          aria-label={isMobileView ? "Close sidebar" : (collapsed ? "Expand sidebar" : "Collapse sidebar")}
        >
          {isMobileView ? (
            <X size={20} />
          ) : collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
          {(!collapsed || isMobileView) ? "Main Menu" : "..."}
        </div>
        
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname.includes(`/developer/${item.id}`);
          return (
            <Link
              key={item.id}
              to={`/stalightcampus/developer/${item.id}`}
              onClick={() => {
                if (isMobileView || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
                  setCollapsed(true);
                }
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className={`${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} relative shrink-0`}>
                {item.icon}
                {item.id === "chat" && chatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white font-bold">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </div>
              
              {(!collapsed || isMobileView) && (
                <span className="truncate">{item.label}</span>
              )}
              
              {isActive && (!collapsed || isMobileView) && (
                <motion.div
                  layoutId={isMobileView ? "activeTabMobile" : "activeTabDesktop"}
                  className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}

              {collapsed && !isMobileView && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border shadow-md pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50 shrink-0">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group relative ${(collapsed && !isMobileView) ? 'justify-center' : ''}`}
        >
          <LogOut size={20} />
          {(!collapsed || isMobileView) && <span>Logout</span>}
          
          {collapsed && !isMobileView && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border shadow-md pointer-events-none">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (< 1024px) */}
      <div className="lg:hidden">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setCollapsed(true)}
            />
          )}
        </AnimatePresence>

        <motion.div
          className="fixed top-0 bottom-0 left-0 z-50 shadow-2xl w-72 bg-card border-r border-border flex flex-col"
          initial={{ x: "-100%" }}
          animate={{ x: collapsed ? "-100%" : "0%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {renderContent(true)}
        </motion.div>
      </div>

      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex h-full bg-card border-r border-border/50 flex-col shadow-sm relative z-20 shrink-0"
      >
        {renderContent(false)}
      </motion.div>
    </>
  );
};

export default Sidebar;
