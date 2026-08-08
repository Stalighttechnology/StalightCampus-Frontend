import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ListTodo, Activity, User, LogOut, ChevronLeft, ChevronRight, CalendarCheck, Megaphone, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  setIsAuthenticated: (val: boolean) => void;
}

const MENU_ITEMS = [
  { id: "assigned-issues", label: "Assigned Issues", icon: <ListTodo size={20} /> },
  { id: "monitoring", label: "HQ Monitor", icon: <Activity size={20} /> },
  { id: "attendance", label: "My Attendance", icon: <CalendarCheck size={20} /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone size={20} /> },
  { id: "chat", label: "HQ Chat", icon: <MessageSquare size={20} /> },
  { id: "profile", label: "Profile", icon: <User size={20} /> },
];

const Sidebar = ({ collapsed, setCollapsed, setIsAuthenticated }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [chatUnread, setChatUnread] = useState(0);

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
    setIsAuthenticated(false);
    window.location.href = "/stalightcampus/developer";
  };

  return (
    <motion.div
      initial={{ width: 260 }}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full bg-card border-r border-border/50 flex flex-col shadow-sm relative z-20"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-lg text-primary truncate"
          >
            Developer Portal
          </motion.div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors mx-auto"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
          {!collapsed ? "Main Menu" : "..."}
        </div>
        
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname.includes(`/developer/${item.id}`);
          return (
            <Link
              key={item.id}
              to={`/stalightcampus/developer/${item.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className={`${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} relative`}>
                {item.icon}
                {item.id === "chat" && chatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white font-bold">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </div>
              
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              
              {isActive && !collapsed && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}

              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border shadow-md pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group relative ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
          
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border shadow-md pointer-events-none">
              Logout
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
