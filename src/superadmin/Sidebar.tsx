import { useState } from "react";
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
  Mail
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

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Overview", icon: <LayoutDashboard size={20} /> },
  { id: "organizations", label: "Organizations", icon: <Building2 size={20} /> },
  { id: "billing", label: "Billing & Payments", icon: <CreditCard size={20} /> },
  { id: "subscriptions", label: "Subscriptions", icon: <Clock size={20} /> },
  { id: "coupons", label: "Coupons", icon: <Tag size={20} /> },
  { id: "users", label: "User Analytics", icon: <Users size={20} /> },
  { id: "support", label: "Support Panel", icon: <LifeBuoy size={20} /> },
  { id: "enroll-developer", label: "Enroll Developer", icon: <Users size={20} /> },
  { id: "monitoring", label: "System Monitor", icon: <Activity size={20} /> },
  { id: "popups", label: "Popups", icon: <MessageSquare size={20} /> },
  { id: "reports", label: "Reports", icon: <BarChart3 size={20} /> },
  { id: "nda", label: "NDA & Consents", icon: <FileText size={20} /> },
  { id: "marketing", label: "Marketing Emails", icon: <Mail size={20} /> },
  { id: "profile", label: "My Profile", icon: <UserCircle2 size={20} /> },
];

const Sidebar = ({ activePage, setActivePage, onLogout, collapsed, toggleCollapse }: SidebarProps) => {
  const { theme } = useTheme();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activePage === item.id ? "default" : "ghost"}
              className={`w-full justify-start h-10 transition-all duration-200 ${
                activePage === item.id 
                  ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" 
                  : theme === 'dark' ? "text-muted-foreground hover:text-foreground hover:bg-accent" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              } ${(collapsed && window.innerWidth >= 1024) ? "px-2 justify-center" : "px-3 gap-3"}`}
              onClick={() => {
                setActivePage(item.id);
                if (window.innerWidth < 1024) {
                  toggleCollapse();
                }
              }}
              title={(collapsed && window.innerWidth >= 1024) ? item.label : undefined}
            >
              {item.icon}
              {(!collapsed || window.innerWidth < 1024) && <span>{item.label}</span>}
            </Button>
          ))}
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
