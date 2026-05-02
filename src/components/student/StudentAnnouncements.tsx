import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { 
  Loader2, 
  Eye, 
  Clock, 
  User, 
  AlertCircle, 
  Bell, 
  CheckCircle2, 
  Info,
  Calendar,
  Search,
  Megaphone
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { fetchAnnouncements, markAnnouncementRead, Announcement } from "@/utils/announcements_api";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonList } from "../ui/skeleton";

const getPriorityColor = (priority: string, theme: string) => {
  switch (priority) {
    case "urgent":
      return theme === 'dark' ? "bg-red-900/30 text-red-400 border-red-800" : "bg-red-100 text-red-700 border-red-200";
    case "high":
      return theme === 'dark' ? "bg-orange-900/30 text-orange-400 border-orange-800" : "bg-orange-100 text-orange-700 border-orange-200";
    case "normal":
      return theme === 'dark' ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-100 text-blue-700 border-blue-200";
    case "low":
      return theme === 'dark' ? "bg-emerald-900/30 text-emerald-400 border-emerald-800" : "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return theme === 'dark' ? "bg-muted text-muted-foreground" : "bg-gray-100 text-gray-700";
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const isRecent = (dateString: string) => {
  try {
    const createdDate = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffInHours < 48;
  } catch {
    return false;
  }
};

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "priority">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  const { theme } = useTheme();

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAnnouncements(1, 100);
      if (response.success && response.data) {
        setAnnouncements(response.data.received_announcements?.results || []);
      } else {
        setError(response.message || "Failed to load announcements");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleMarkRead = async (announcementId: number) => {
    const response = await markAnnouncementRead(announcementId);
    if (response.success) {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a))
      );
      // Trigger global unread count refresh
      window.dispatchEvent(new CustomEvent('refresh-unread-count'));
    }
  };

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        a.title.toLowerCase().includes(query) ||
        a.message.toLowerCase().includes(query) ||
        a.created_by_name.toLowerCase().includes(query);
      
      const matchesType = filterType === "all" || (filterType === "unread" && !a.is_read) || filterType === "priority";
      const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
      
      return matchesSearch && matchesType && matchesPriority;
    });
  }, [announcements, searchQuery, filterType, priorityFilter]);

  const stats = useMemo(() => {
    return {
      total: announcements.length,
      unread: announcements.filter(a => !a.is_read).length,
      urgent: announcements.filter(a => a.priority === "urgent" || a.priority === "high").length,
      recent: announcements.filter(a => isRecent(a.created_at)).length
    };
  }, [announcements]);

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
        <CardHeader className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Announcements
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                Stay updated with the latest news, notices, and alerts from the campus.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total", value: stats.total, color: "blue", icon: <Megaphone className="opacity-80" size={20} /> },
              { label: "Unread", value: stats.unread, color: "yellow", icon: <Bell className="opacity-80" size={20} /> },
              { label: "Urgent", value: stats.urgent, color: "red", icon: <AlertCircle className="opacity-80" size={20} /> },
              { label: "Recent", value: stats.recent, color: "emerald", icon: <Clock className="opacity-80" size={20} /> },
            ].map((stat, i) => (
              <div 
                key={i} 
                className={`relative overflow-hidden group p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${
                  theme === 'dark' 
                    ? 'bg-muted/30 border-border hover:bg-muted/50' 
                    : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {stat.label}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${
                    stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                    stat.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-500' :
                    stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} size={18} />
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className={`w-full sm:w-[160px] ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="priority">By Priority</SelectItem>
                </SelectContent>
              </Select>

              {filterType === "priority" && (
                <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                  <SelectTrigger className={`w-full sm:w-[160px] ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Announcement List */}
          {loading ? (
            <SkeletonList items={5} />
          ) : error ? (
            <div className={`p-8 rounded-xl border text-center ${theme === 'dark' ? 'bg-red-900/10 border-red-900/20 text-red-400' : 'bg-red-50 text-red-600 border-red-100'}`}>
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-80" />
              <p className="font-medium">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadAnnouncements}>Try Again</Button>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-16 rounded-xl border border-dashed text-center ${theme === 'dark' ? 'border-border' : 'border-gray-200 bg-gray-50/30'}`}
                  >
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
                        <Megaphone className="text-muted-foreground" size={28} />
                      </div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No announcements</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        There are no announcements matching your current filters.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  filtered.map((announcement, idx) => (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`relative group p-5 rounded-xl border transition-all duration-300 hover:shadow-md ${
                        !announcement.is_read 
                          ? theme === 'dark' ? 'bg-primary/5 border-primary/20' : 'bg-blue-50/50 border-blue-100'
                          : theme === 'dark' ? 'bg-card border-border hover:bg-muted/30' : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${getPriorityColor(announcement.priority, theme)} border font-medium px-2 py-0.5 uppercase text-[10px]`}>
                              {announcement.priority}
                            </Badge>
                            {isRecent(announcement.created_at) && (
                              <Badge className="bg-primary text-white border-none text-[10px]">NEW</Badge>
                            )}
                            {!announcement.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                            )}
                          </div>
                          
                          <div>
                            <h3 className={`text-lg font-bold leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {announcement.title}
                            </h3>
                            <p className={`text-sm mt-2 leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                              {announcement.message}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User size={14} className="opacity-70" />
                              <span className="font-medium text-foreground/80">{announcement.created_by_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock size={14} className="opacity-70" />
                              <span>{formatDate(announcement.created_at)}</span>
                            </div>
                            {announcement.expires_at && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar size={14} className="opacity-70" />
                                <span>Expires: {announcement.expires_at.split('T')[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex md:flex-col items-center md:items-end justify-between gap-3 min-w-fit">
                          {!announcement.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkRead(announcement.id)}
                              className={`h-9 px-3 gap-2 ${theme === 'dark' ? 'text-primary hover:bg-primary/10' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                              <Eye size={16} />
                              <span className="text-xs font-semibold">Mark as read</span>
                            </Button>
                          )}
                          <div className="flex -space-x-1 overflow-hidden">
                            {announcement.target_roles?.map((role, rIdx) => (
                              <Badge 
                                key={rIdx} 
                                variant="outline" 
                                className={`text-[9px] px-1.5 py-0 capitalize ${theme === 'dark' ? 'border-border' : 'bg-gray-50 border-gray-200'}`}
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAnnouncements;
