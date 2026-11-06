import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Clock, 
  Users, 
  LifeBuoy, 
  Activity, 
  BarChart3, 
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle2,
  Tag,
  FileText,
  MessageSquare,
  Mail,
  Megaphone,
  Briefcase,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  Globe
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useTheme } from "../context/ThemeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { getWebsiteLeads } from "../utils/supabaseWebsiteService";
import { getSuperAdminDeveloperLeaves } from "../utils/admin_api";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
}

const allMenuItems = [
  { id: "dashboard", label: "Overview", icon: <LayoutDashboard size={20} /> },
  { id: "organizations", label: "Organizations", icon: <Building2 size={20} /> },
  { id: "billing", label: "Billing & Payments", icon: <CreditCard size={20} /> },
  { id: "subscriptions", label: "Subscriptions", icon: <Clock size={20} /> },
  { id: "coupons", label: "Coupons", icon: <Tag size={20} /> },
  { id: "users", label: "User Analytics", icon: <Users size={20} /> },
  { id: "meetings", label: "Meeting Schedules", icon: <Calendar size={20} /> },
  { id: "support", label: "Support Panel", icon: <LifeBuoy size={20} /> },
  { id: "enroll-developer", label: "Enroll Developer", icon: <Users size={20} /> },
  { id: "office-locations", label: "Office Locations", icon: <Building2 size={20} /> },
  { id: "developer-audit", label: "Developer Audit", icon: <FileText size={20} /> },
  { id: "developer-leaves", label: "Developer Leaves", icon: <Calendar size={20} /> },
  { id: "developer-leave-policy", label: "Leave Policy Settings", icon: <CalendarCheck2 size={20} /> },
  { id: "developer-holidays", label: "Holiday Calendar", icon: <CalendarDays size={20} /> },
  { id: "monitoring", label: "System Monitor", icon: <Activity size={20} /> },
  { id: "popups", label: "Popups", icon: <MessageSquare size={20} /> },
  { id: "reports", label: "Reports", icon: <BarChart3 size={20} /> },
  { id: "announcements", label: "Announcements", icon: <Megaphone size={20} /> },
  { id: "chat", label: "HQ Chat", icon: <MessageSquare size={20} /> },
  { id: "nda", label: "NDA & Consents", icon: <FileText size={20} /> },
  { id: "marketing", label: "Marketing Emails", icon: <Mail size={20} /> },
  { id: "website-leads", label: "Website Leads", icon: <Globe size={20} /> },
  { id: "certificates", label: "Certificates", icon: <FileText size={20} /> },
  { id: "offer-letters", label: "Offer Letters", icon: <Briefcase size={20} /> },
  { id: "profile", label: "My Profile", icon: <UserCircle2 size={20} /> },
];

const developerAllowedPages = [
  "dashboard",
  "users",
  "support",
  "monitoring",
  "popups",
  "announcements",
  "chat",
  "profile"
];

const Sidebar = ({ activePage, setActivePage, onLogout, collapsed, toggleCollapse }: SidebarProps) => {
  const { theme } = useTheme();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const userRole = localStorage.getItem("superadmin_role");

  // Notification states
  const [totalWebsiteLeadsCount, setTotalWebsiteLeadsCount] = useState<number>(0);
  const [newWebsiteLeadsCount, setNewWebsiteLeadsCount] = useState<number>(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);

  const fetchWebsiteLeadsCount = async () => {
    try {
      const res = await getWebsiteLeads("all");
      if (res && res.success) {
        const total = res.counts?.all ?? (res.total ?? (Array.isArray(res.data) ? res.data.length : 0));
        setTotalWebsiteLeadsCount(total);

        // If currently viewing website-leads, keep viewed in sync
        if (activePage === "website-leads") {
          localStorage.setItem("stalight_website_leads_last_viewed_count", total.toString());
          setNewWebsiteLeadsCount(0);
          return;
        }

        const savedSeenCountStr = localStorage.getItem("stalight_website_leads_last_viewed_count");
        if (savedSeenCountStr !== null) {
          const savedSeenCount = parseInt(savedSeenCountStr, 10);
          const diff = Math.max(0, total - (isNaN(savedSeenCount) ? 0 : savedSeenCount));
          setNewWebsiteLeadsCount(diff);
        } else {
          // If first time loading and there are existing leads
          setNewWebsiteLeadsCount(total);
        }
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const fetchPendingDeveloperLeaves = async () => {
    try {
      const res = await getSuperAdminDeveloperLeaves({ status: "PENDING", page_size: 1 });
      if (res && res.success) {
        const count = res.total ?? (res.data?.length ?? 0);
        setPendingLeavesCount(count);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchWebsiteLeadsCount();
    fetchPendingDeveloperLeaves();

    const interval = setInterval(() => {
      fetchWebsiteLeadsCount();
      fetchPendingDeveloperLeaves();
    }, 30000);

    const handleFocus = () => {
      fetchWebsiteLeadsCount();
      fetchPendingDeveloperLeaves();
    };
    window.addEventListener("focus", handleFocus);

    const handleLeadsViewed = () => {
      setNewWebsiteLeadsCount(0);
    };
    window.addEventListener("stalight_website_leads_viewed", handleLeadsViewed);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("stalight_website_leads_viewed", handleLeadsViewed);
    };
  }, [activePage]);

  // When activePage changes to website-leads, mark as viewed immediately
  useEffect(() => {
    if (activePage === "website-leads") {
      setNewWebsiteLeadsCount(0);
      if (totalWebsiteLeadsCount > 0) {
        localStorage.setItem("stalight_website_leads_last_viewed_count", totalWebsiteLeadsCount.toString());
      }
    }
  }, [activePage, totalWebsiteLeadsCount]);
  
  const menuItems = userRole === "developer" 
    ? allMenuItems.filter(item => developerAllowedPages.includes(item.id))
    : allMenuItems;

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div 
        className={`px-4 pb-3 lg:pb-0 flex items-center justify-between border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}
        style={{
          height: window.innerWidth >= 1024 ? '5rem' : undefined,
          paddingTop: Capacitor.isNativePlatform()
            ? 'calc(env(safe-area-inset-top, 24px) + 2px)'
            : window.innerWidth < 1024 ? '16px' : '0px'
        }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 bg-primary/10 p-2 rounded-lg text-primary">
            <ShieldCheck size={28} />
          </div>
          {(!collapsed || window.innerWidth < 1024) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap">
              <h1 className={`font-bold text-lg leading-tight tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Super Admin</h1>
              <p className={`text-[10px] uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Stalight HQ</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 thin-scrollbar">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isWebsiteLeads = item.id === "website-leads";
            const isDeveloperLeaves = item.id === "developer-leaves";

            const showDot =
              (isWebsiteLeads && newWebsiteLeadsCount > 0 && activePage !== "website-leads") ||
              (isDeveloperLeaves && pendingLeavesCount > 0 && activePage !== "developer-leaves");
            const badgeCount = isWebsiteLeads ? newWebsiteLeadsCount : (isDeveloperLeaves ? pendingLeavesCount : 0);

            return (
              <Button
                key={item.id}
                variant={activePage === item.id ? "default" : "ghost"}
                className={`w-full justify-start h-10 transition-all duration-200 relative ${
                  activePage === item.id 
                    ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" 
                    : theme === 'dark' ? "text-muted-foreground hover:text-foreground hover:bg-accent" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                } ${(collapsed && window.innerWidth >= 1024) ? "px-2 justify-center" : "px-3 gap-3"}`}
                onClick={() => {
                  if (item.id === "website-leads") {
                    setNewWebsiteLeadsCount(0);
                    if (totalWebsiteLeadsCount > 0) {
                      localStorage.setItem("stalight_website_leads_last_viewed_count", totalWebsiteLeadsCount.toString());
                    }
                  }
                  setActivePage(item.id);
                  if (window.innerWidth < 1024) {
                    toggleCollapse();
                  }
                }}
                title={(collapsed && window.innerWidth >= 1024) ? item.label : undefined}
              >
                <div className="relative flex items-center justify-center shrink-0">
                  {item.icon}
                  {showDot && (collapsed && window.innerWidth >= 1024) && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10 pointer-events-none">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
                    </span>
                  )}
                </div>

                {(!collapsed || window.innerWidth < 1024) && (
                  <>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {showDot && (
                      <div className="ml-auto flex items-center shrink-0 pl-1 z-10 pointer-events-none">
                        {badgeCount > 0 ? (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none border shadow-sm ${
                              activePage === item.id
                                ? "bg-white text-primary border-white/60 font-extrabold"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {badgeCount}
                          </span>
                        ) : (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
        <Button
          variant="ghost"
          className={`w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${theme === 'dark' ? 'hover:bg-red-950/30' : ''} ${(collapsed && window.innerWidth >= 1024) ? 'px-2 justify-center' : 'justify-start gap-3 px-3 h-10'}`}
          onClick={() => setShowLogoutDialog(true)}
          title={(collapsed && window.innerWidth >= 1024) ? "Logout" : undefined}
        >
          <LogOut size={20} />
          {(!collapsed || window.innerWidth < 1024) && <span>Logout</span>}
        </Button>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of the Super Admin portal? You will need to enter your credentials again to access it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white">
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Mobile layout with slide-over drawer and overlay backdrop
  if (window.innerWidth < 1024) {
    return (
      <>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={toggleCollapse}
            />
          )}
        </AnimatePresence>
        <motion.div
          className={`fixed top-0 bottom-0 left-0 z-50 shadow-2xl w-64 ${theme === 'dark' ? 'bg-background border-r border-border' : 'bg-white border-r border-gray-200'}`}
          initial={{ x: "-100%" }}
          animate={{ x: collapsed ? "-100%" : "0%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ bottom: 0, left: 0, position: 'fixed' }}
        >
          {sidebarContent}
        </motion.div>
      </>
    );
  }

  // Desktop layout: static/collapsible panel
  return (
    <motion.div
      className={`h-screen flex flex-col border-r shadow-xl z-30 transition-all duration-300 ${
        theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200'
      } ${collapsed ? 'w-20' : 'w-64'}`}
      initial={false}
    >
      {sidebarContent}
    </motion.div>
  );
};

export default Sidebar;
