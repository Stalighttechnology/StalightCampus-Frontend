import { motion } from "framer-motion";
import { FiBell, FiMoon, FiSun, FiMenu, FiBellOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/button";
import { API_BASE_URL } from "../../utils/config";
import { Capacitor } from "@capacitor/core";
import { fetchParentChildrenCached } from "../../utils/student_api";
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from "../ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";

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
  personalNotificationCount?: number;
  recentNotifications?: any[];
}

interface NotificationBellProps {
  fetchCount: () => Promise<number>; // function to fetch count
  onClick?: () => void;
}

const Navbar = ({ role, user, onNotificationClick, setPage, showHamburger = false, onHamburgerClick, unreadCount = 0, personalNotificationCount = 0, recentNotifications = [] }: NavbarProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  const parseNotificationMessage = (message: string) => {
    if (!message) return { cleanMessage: '', examData: null };
    
    const lowerMsg = message.toLowerCase();
    if (!lowerMsg.includes("detailed schedule:")) {
      return { cleanMessage: message, examData: null };
    }
    
    const matchIndex = lowerMsg.indexOf("detailed schedule:");
    const cleanMessage = message.substring(0, matchIndex).trim();
    const tablePart = message.substring(matchIndex + "detailed schedule:".length);
    
    const examData: any[] = [];
    const lines = tablePart.split("\n");
    lines.forEach(line => {
      if (line.includes("|") && !line.includes("---")) {
        const rowParts = line.split("|").map(p => p.trim());
        const filteredParts = rowParts.filter((_, idx) => {
          if (idx === 0 && rowParts[0] === "") return false;
          if (idx === rowParts.length - 1 && rowParts[rowParts.length - 1] === "") return false;
          return true;
        });
        
        if (filteredParts.length >= 3) {
          const subject = filteredParts[0];
          if (subject.toLowerCase() === "subject" || subject.toLowerCase() === "") return;
          
          examData.push({
            subject: subject,
            date: filteredParts[1] || "",
            time: filteredParts[2] || "",
            room: filteredParts[3] || "TBD"
          });
        }
      }
    });
    
    return { cleanMessage, examData: examData.length > 0 ? examData : null };
  };

  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(localStorage.getItem('selectedStudentId'));
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [showDesktopSwitcher, setShowDesktopSwitcher] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const desktopSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (desktopSwitcherRef.current && !desktopSwitcherRef.current.contains(event.target as Node)) {
        setShowDesktopSwitcher(false);
      }
    };
    if (showDesktopSwitcher) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDesktopSwitcher]);

  const markNotificationsRead = async () => {
    if (personalNotificationCount === 0) return;
    try {
      const { fetchWithTokenRefresh } = await import("../../utils/authService");
      const response = await fetchWithTokenRefresh(`${API_BASE_URL}/api/notifications/mark-read/`, {
        method: "POST",
      });
      if (response.ok) {
        // Only decrement by personal notification count — announcements stay in the badge
        window.dispatchEvent(new CustomEvent('refresh-unread-count', { detail: { decrement: personalNotificationCount } }));
      }
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  };

  useEffect(() => {
    if (role === 'parent') {
      const fetchChildren = async () => {
        try {
          const { fetchWithTokenRefresh } = await import("../../utils/authService");
          const data = await fetchParentChildrenCached(fetchWithTokenRefresh, API_BASE_URL);
          if (data.success && data.children) {
            setChildrenList(data.children);
            const currentSavedId = localStorage.getItem('selectedStudentId');
            if (data.children.length > 0 && (!currentSavedId || currentSavedId === 'null' || currentSavedId === 'undefined')) {
              localStorage.setItem('selectedStudentId', data.children[0].id.toString());
              setSelectedChildId(data.children[0].id.toString());
            }
          }
        } catch (error) {
          console.error("Failed to fetch children", error);
        }
      };
      fetchChildren();
    }
  }, [role]);

  const handleChildSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const childId = e.target.value;
    localStorage.setItem('selectedStudentId', childId);
    setSelectedChildId(childId);
    window.location.reload();
  };

  const [align, setAlign] = useState<'center' | 'end'>('end');
  const [localNotifications, setLocalNotifications] = useState<any[]>(recentNotifications);

  useEffect(() => {
    setLocalNotifications(recentNotifications);
  }, [recentNotifications]);

  const clearAllNotifications = async () => {
    try {
      const { fetchWithTokenRefresh } = await import("../../utils/authService");
      const response = await fetchWithTokenRefresh(`${API_BASE_URL}/api/notifications/clear-all/`, {
        method: "POST",
      });
      if (response.ok) {
        setLocalNotifications([]);
        window.dispatchEvent(new CustomEvent('refresh-unread-count', { detail: { clearAll: true } }));
      }
    } catch (error) {
      console.error("Failed to clear notifications", error);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setAlign(window.innerWidth < 640 ? 'center' : 'end');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (role === "parent") {
      // Only trigger custom dropdown from profile icon on mobile
      if (window.innerWidth < 640) {
        setShowParentDropdown(!showParentDropdown);
      }
      return;
    }
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
  const userStr = sessionStorage.getItem("user");
  const userData = userStr ? JSON.parse(userStr) : null;
  const orgPlan = (userData?.org_plan || "basic").toLowerCase();

  // Determine avatar source: prefer `user` prop, then localStorage cached user.
  const rawAvatar = user?.profile_picture || user?.profile_image || userData?.profile_picture || userData?.profile_image || userData?.profile_picture_url || user?.profile_picture_url || null;
  let avatarSrc: string | null = null;
  if (rawAvatar) {
    avatarSrc = String(rawAvatar);
    // If backend returned a relative media path like `/media/...`, prefix with base URL
    if (avatarSrc.startsWith('/media/')) {
      avatarSrc = `${API_BASE_URL.replace('/api', '')}${avatarSrc}`;
    }
  }



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
      className={`w-full flex items-center justify-between px-2 sm:px-4 pb-3 lg:pb-0 relative border-b transition-all duration-500 ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}
      style={{
        height: window.innerWidth >= 1024 ? '5rem' : undefined,
        paddingTop: Capacitor.isNativePlatform()
          ? 'calc(env(safe-area-inset-top, 24px) + 2px)'
          : window.innerWidth < 1024 ? '16px' : '0px'
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left section: Hamburger + Brand */}
      <div className="flex items-center gap-1.5 sm:gap-4 z-10 min-w-0">
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

        <div className="flex flex-col min-w-0">
          <motion.div
            className={`font-semibold text-xs sm:text-base leading-tight flex flex-col sm:flex-row sm:items-center sm:gap-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}
          >
            <span className="shrink-0">Welcome,</span>
            <span className="text-primary truncate max-w-[130px] sm:max-w-none">
              {user?.first_name || user?.username || "User"}
            </span>
          </motion.div>
          <p className={`text-[9px] uppercase tracking-wider font-medium truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            {role === "admin" || role === "principal" ? "Principal" : role.replace('_', ' ')} Portal
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5 sm:gap-4 z-10 shrink-0">
        {/* Date & Time */}
        <div className={`text-right hidden xl:block ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          <div className="text-xs font-medium">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <div className="text-[10px] opacity-70">
            {currentTime.toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit", hour12: true })}
          </div>
        </div>

        {/* Custom Desktop Switcher for Parents */}
        {role === "parent" && childrenList.length > 1 && (
          <div className="hidden sm:block relative mr-2" ref={desktopSwitcherRef}>
            <button
              onClick={() => setShowDesktopSwitcher(!showDesktopSwitcher)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium transition-colors ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div className="text-xs truncate max-w-[140px]">
                {childrenList.find((c: any) => c.id.toString() === selectedChildId)?.name || 'Switch Child'}
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {showDesktopSwitcher && (
              <div className={`absolute top-full right-0 mt-2 w-56 rounded-lg shadow-lg py-1 z-50 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
                <div className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider border-b ${theme === 'dark' ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-100'}`}>
                  Select Student
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {childrenList.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        localStorage.setItem('selectedStudentId', child.id.toString());
                        setSelectedChildId(child.id.toString());
                        setShowDesktopSwitcher(false);
                        window.location.reload();
                      }}
                      className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedChildId == child.id.toString()
                          ? (theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary font-semibold')
                          : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
                        }`}
                    >
                      <div className="truncate">{child.name}</div>
                      <div className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {child.usn || child.enrollment_number}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </Button>

          {['student', 'parent', 'faculty', 'hod', 'admin', 'principal', 'coe', 'dean', 'hms', 'hms_admin', 'fees_manager', 'transport_admin', 'org_admin', 'warden', 'driver', 'library_admin'].includes(role || '') && (
            <Popover open={isNotificationsOpen} onOpenChange={(open) => { setIsNotificationsOpen(open); if (open) markNotificationsRead(); }}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 relative"
                >
                  <FiBell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[90vw] sm:w-80 p-0 sm:mr-4" align={align} sideOffset={6}>
                <PopoverArrow className="fill-popover stroke-border stroke-[1px]" width={12} height={6} />
                <div className="flex flex-col">
                  <div className="px-4 py-3 font-semibold border-b">
                    Notifications
                  </div>                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {localNotifications.length > 0 ? (
                      localNotifications.map((notif: any) => {
                        const { cleanMessage, examData } = parseNotificationMessage(notif.message);
                        const isLong = (cleanMessage && cleanMessage.length > 80) || examData !== null;
                        const previewMessage = (cleanMessage && cleanMessage.length > 80) ? `${cleanMessage.slice(0, 80)}...` : cleanMessage;

                        return (
                          <div key={notif.id} className="px-4 py-3 border-b text-sm flex flex-col hover:bg-muted/50 transition-colors">
                            <span className="font-medium">{notif.title}</span>
                            <span className="text-muted-foreground mt-1 line-clamp-2">{previewMessage}</span>
                            {isLong && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="link" className="p-0 h-auto text-xs text-primary justify-start font-semibold mt-1">
                                    Show More
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className={`w-[90vw] sm:w-full sm:max-w-md rounded-xl p-6 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
                                  <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold">{notif.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4 space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {cleanMessage}
                                    </p>
                                    {examData && examData.length > 0 && (
                                      <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Detailed Schedule</h4>
                                        <div className={`overflow-hidden rounded-lg border text-[11px] ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr className={`border-b ${theme === 'dark' ? 'bg-muted/40 border-border text-muted-foreground' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                <th className="p-2 font-semibold">Subject</th>
                                                <th className="p-2 font-semibold">Date</th>
                                                <th className="p-2 font-semibold">Time</th>
                                                <th className="p-2 font-semibold">Room</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {examData.map((row, idx) => (
                                                <tr key={idx} className={`border-b last:border-b-0 ${theme === 'dark' ? 'border-border' : 'border-gray-150'}`}>
                                                  <td className="p-2 font-medium">{row.subject}</td>
                                                  <td className="p-2">{row.date}</td>
                                                  <td className="p-2 text-muted-foreground">{row.time}</td>
                                                  <td className="p-2">{row.room}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          <span className="text-xs text-muted-foreground/70 mt-2">
                            {new Date(notif.created_at).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      );
                    })
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <FiBellOff className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <span>No recent notifications</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t bg-muted/20 flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 text-primary hover:text-primary/90 justify-center h-8 text-xs font-medium"
                      onClick={() => {
                        const paths: Record<string, string> = {
                          'student': '/announcements',
                          'parent': '/announcements',
                          'faculty': '/faculty/announcements',
                          'hod': '/hod/hod-announcement-management',
                          'admin': '/admin/announcement-management',
                          'principal': '/admin/announcement-management',
                          'coe': '/coe/announcement-management',
                          'dean': '/dean/announcement-management',
                          'hms': '/hms/announcement-management',
                          'hms_admin': '/hms/announcement-management',
                          'fees_manager': '/fees-manager/announcement-management',
                          'transport_admin': '/transport-admin/announcement-management',
                          'org_admin': '/org-admin/announcement-management',
                          'warden': '/warden/announcement-management',
                          'driver': '/driver/announcements',
                          'library_admin': '/library-admin/announcements'
                        };
                        navigate(paths[role || ''] || '/announcements');
                        setIsNotificationsOpen(false);
                      }}
                    >
                      View All
                    </Button>
                    {localNotifications.length > 0 && (
                      <Button
                        variant="ghost"
                        className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 justify-center h-8 text-xs font-medium"
                        onClick={clearAllNotifications}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Profile Button */}
          <div className="relative">
            <div
              className={`flex items-center gap-3 p-1 lg:pl-3 lg:pr-1 lg:py-1 rounded-full border transition-all duration-200 cursor-pointer ${theme === 'dark' ? 'border-border bg-accent/50 hover:bg-accent' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
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
                {avatarSrc ? (
                  <img src={avatarSrc} alt="P" className="w-full h-full object-cover" />
                ) : (
                  user?.first_name?.[0] || role?.[0]?.toUpperCase()
                )}
              </div>
            </div>

            {/* Custom Dropdown for Parents (Mobile Only) */}
            {showParentDropdown && role === "parent" && childrenList.length > 1 && window.innerWidth < 640 && (
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
                <div className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider border-b ${theme === 'dark' ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-100'}`}>
                  Switch Child
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {childrenList.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        localStorage.setItem('selectedStudentId', child.id.toString());
                        setSelectedChildId(child.id.toString());
                        setShowParentDropdown(false);
                        window.location.reload();
                      }}
                      className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedChildId == child.id.toString()
                          ? (theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary font-semibold')
                          : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
                        }`}
                    >
                      <div className="truncate">{child.name}</div>
                      <div className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {child.usn || child.enrollment_number}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;