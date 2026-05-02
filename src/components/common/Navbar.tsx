import { motion } from "framer-motion";
import { FiBell, FiMoon, FiSun, FiMenu } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/button";

interface User {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  profile_image?: string | null;
  branch?: string;
}

interface NavbarProps {
  role: "admin" | "principal" | "hod" | "faculty" | "student" | "fees_manager" | "coe";
  user?: User;
  onNotificationClick?: () => void;
  setPage: (page: string) => void;
  showHamburger?: boolean;
  onHamburgerClick?: () => void;
  unreadCount?: number;
}

interface NotificationBellProps {
  fetchCount: () => Promise<number>; // function to fetch count
  onClick?: () => void;
}

const Navbar = ({ role, user, onNotificationClick, setPage, showHamburger = false, onHamburgerClick, unreadCount = 0 }: NavbarProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNotificationClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      navigate("/dashboard/notifications");
    }
  };

  const handleProfileClick = () => {
    if (setPage) {
      if (role === "faculty") {
        setPage("faculty-profile");
      } else if (role === "hod") {
        setPage("hod-profile");
      } else if (role === "admin" || role === "principal") {
        setPage("profile");
      } else if (role === "fees_manager") {
        // For fees manager, we can use the same profile page as admin for now
        setPage("profile");
      } else {
        setPage("profile");
      }
    }
  };
  const userStr = localStorage.getItem("user");
  const userData = userStr ? JSON.parse(userStr) : null;
  const orgPlan = (userData?.org_plan || "basic").toLowerCase();



  const getBadgeStyles = () => {
    switch (orgPlan) {
      case 'advance':
        return 'bg-gradient-to-r from-primary to-[#ff59f8] text-white shadow-primary/20';
      case 'pro':
        return 'bg-blue-600 text-white shadow-blue-500/20';
      default:
        return 'bg-gray-500 text-white shadow-gray-400/20';
    }
  };

  return (
    <motion.div
      className={`w-full h-20 flex items-center justify-between p-4 relative border-b transition-all duration-500`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left section: Hamburger + Brand */}
      <div className="flex items-center gap-4 z-10">
        {/* Hamburger Menu Button */}
        {showHamburger && (
          <Button
            variant="ghost"
            size="icon"
            className={theme === "dark" ? "hover:bg-accent" : "hover:bg-gray-100"}
            onClick={onHamburgerClick}
          >
            <FiMenu size={20} />
          </Button>
        )}

        <div className="flex flex-col">
          <motion.div
            className={`font-semibold text-lg leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}
          >
            Welcome,{" "}
            <span className={`text-primary`}>
              {user?.first_name || user?.username || "User"}
            </span>
          </motion.div>
          <p className={`text-[10px] uppercase tracking-wider font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            {role === "admin" || role === "principal" ? "Principal" : role.replace('_', ' ')} Portal
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 z-10">
        {/* Date & Time */}
        <div className={`text-right hidden xl:block ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          <div className="text-xs font-medium">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <div className="text-[10px] opacity-70">
            {currentTime.toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit", hour12: true })}
          </div>
        </div>

        {/* Plan Badge */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden md:block"
        >
          <span className={`text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md border border-white/10 shadow-sm ${getBadgeStyles()}`}>
            {orgPlan}
          </span>
        </motion.div>

        <div className="flex items-center gap-2 ">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </Button>
          
          {['student', 'faculty', 'hod', 'admin'].includes(role || '') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const paths: Record<string, string> = {
                  'student': '/announcements',
                  'faculty': '/faculty/announcements',
                  'hod': '/hod/hod-announcement-management',
                  'admin': '/admin/announcement-management',
                  'principal': '/admin/announcement-management'
                };
                navigate(paths[role || ''] || '/announcements');
              }}
              className="rounded-full w-9 h-9 relative"
            >
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                  {unreadCount}
                </span>
              )}
            </Button>
          )}

          {/* Profile Button */}
          <div
            className={`flex items-center gap-3 pl-3 pr-1 py-1 rounded-full border transition-all duration-200 cursor-pointer ${theme === 'dark' ? 'border-border bg-accent/50 hover:bg-accent' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            onClick={handleProfileClick}
          >
            <div className="text-right hidden lg:block">
              <div className={`text-xs font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {user?.first_name ? `${user.first_name} ` : "User"}
              </div>
              <div className="text-[10px] opacity-60 capitalize">
                {(role === "admin" || role === "principal") ? "Principal" : role}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-xs shadow-inner overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="P" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0] || role?.[0]?.toUpperCase()
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;