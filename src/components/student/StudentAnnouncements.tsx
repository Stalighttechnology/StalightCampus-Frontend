import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Megaphone,
  BookOpen,
  Layers,
  MapPin,
  Filter,
  FileDown
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { fetchAnnouncements, markAnnouncementRead, Announcement } from "@/utils/announcements_api";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { downloadFile } from "@/utils/downloadHelper";
import { API_ENDPOINT } from "../../utils/config";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonList } from "../ui/skeleton";
import { format, parseISO } from "date-fns";

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

const formatRoleLabel = (role: string | null | undefined) => {
  if (!role) return "Administrator";
  const r = role.toLowerCase().replace('_', ' ').trim();
  switch (r) {
    case 'hod':
      return 'HOD';
    case 'coe':
      return 'COE';
    case 'principal':
      return 'Principal';
    case 'warden':
    case 'caretaker':
    case 'hms':
    case 'hostel':
    case 'hostel administration':
      return 'Hostel Administration';
    case 'teacher':
    case 'faculty':
      return 'Faculty';
    case 'dean':
      return 'Dean';
    case 'fees manager':
      return 'Fees Manager';
    case 'placement officer':
      return 'Placement Officer';
    case 'transport admin':
      return 'Transport Admin';
    case 'library admin':
      return 'Library Admin';
    case 'org admin':
      return 'Administrator';
    case 'superadmin':
      return 'Super Admin';
    default:
      return role;
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

interface ParsedExamAnnouncement {
  id: number;
  original: Announcement;
  examName: string;
  subjectName: string;
  examType: string;
  dateStr: string;
  timeStr: string;
  venue: string;
  dateObj: Date;
}

interface ExamAnnouncementGroup {
  examName: string;
  examType: string;
  publishedBy: string;
  publishedAt: string;
  priority: string;
  is_read: boolean;
  subjects: ParsedExamAnnouncement[];
  markReadIds: number[];
}

const parseAnnouncements = (announcements: Announcement[]) => {
  const regular: Announcement[] = [];
  const examGroupsMap: Record<string, ExamAnnouncementGroup> = {};

  const rescheduledExamNames = new Set<string>();
  announcements.forEach(a => {
    const examReschMatch = a.title.match(/^(?:Exam|Exams) Rescheduled:\s*(.*)$/i);
    if (examReschMatch) {
      const rawExamName = examReschMatch[1].trim();
      let examName = rawExamName;
      if (rawExamName.includes(" - ")) {
        examName = rawExamName.split(" - ")[0].trim();
      }
      rescheduledExamNames.add(examName);
    }
  });

  announcements.forEach(a => {
    const newExamMatch = a.title.match(/^New Exam Scheduled:\s*(.*)$/i);
    const examPublishMatch = a.title.match(/^Exam Schedule Published:\s*(.*)$/i);
    const examReschMatch = a.title.match(/^(?:Exam|Exams) Rescheduled:\s*(.*)$/i);

    if (newExamMatch || examPublishMatch || examReschMatch) {
      const matchObj = newExamMatch || examPublishMatch || examReschMatch;
      const rawExamName = matchObj ? matchObj[1].trim() : "Exam";

      let examName = rawExamName;
      let subjectNameFallback = "General Subject";
      if (rawExamName.includes(" - ")) {
        const parts = rawExamName.split(" - ");
        examName = parts[0].trim();
        subjectNameFallback = parts.slice(1).join(" - ").trim();
      }

      if ((newExamMatch || examPublishMatch) && rescheduledExamNames.has(examName)) {
        return;
      }

      let parsedSubjects: any[] = [];
      const examData = (a as any).exam_data;
      if (examData && Array.isArray(examData)) {
        parsedSubjects = examData;
      } else if (a.message.includes("Detailed Schedule:")) {
        const lines = a.message.split("\n");
        lines.forEach(line => {
          if (line.includes("|") && !line.includes("Subject | Date") && !line.includes("---|---")) {
            const parts = line.split("|").map(p => p.trim());
            if (parts.length >= 4 && parts[0] && parts[1]) {
              parsedSubjects.push({
                subjectName: parts[0],
                dateStr: parts[1],
                timeStr: parts[2],
                venue: parts[3]
              });
            }
          }
        });
      }

      if (parsedSubjects.length === 0) {
        const newMsgMatch = a.message.match(/A new (.*?) has been scheduled for (.*?) at (.*?)\.\s*(?:Venue:\s*(.*?)\.?)?(?:\s|Detailed Schedule|$)/i);
        const reschMsgMatch = a.message.match(/The exam for '.*?'(?: - .*)? has been rescheduled\.\s*Updated schedule:\s*Date:\s*(.*?)\s*at\s*([^.]+?)\.\s*(?:Venue\/Room:\s*(.*?)\.?)?(?:\s|Detailed Schedule|$)/i);

        if (newMsgMatch) {
          parsedSubjects.push({
            subjectName: subjectNameFallback,
            dateStr: newMsgMatch[2].trim(),
            timeStr: newMsgMatch[3].trim(),
            venue: newMsgMatch[4]?.trim() || "TBD"
          });
        } else if (reschMsgMatch) {
          parsedSubjects.push({
            subjectName: subjectNameFallback,
            dateStr: reschMsgMatch[1].trim(),
            timeStr: reschMsgMatch[2].trim(),
            venue: reschMsgMatch[3]?.trim() || "TBD"
          });
        }
      }

      if (parsedSubjects.length > 0) {
        const displayType = examReschMatch ? "Rescheduled" : "exam";
        const announcementDate = new Date(a.created_at);
        if (!examGroupsMap[examName]) {
          examGroupsMap[examName] = {
            examName,
            examType: displayType,
            publishedAt: a.created_at,
            publishedBy: a.created_by_name || "Administrator",
            priority: a.priority,
            is_read: true,
            subjects: [],
            markReadIds: []
          };
        }

        if (!a.is_read) {
          examGroupsMap[examName].is_read = false;
        }
        examGroupsMap[examName].markReadIds.push(a.id);

        // Use a map keyed by subject name to keep only the most recent entry
        const existingSubjectMap = new Map<string, { dateObj: Date; announcementDate: Date }>();
        examGroupsMap[examName].subjects.forEach(s => {
          existingSubjectMap.set(s.subjectName, { dateObj: s.dateObj, announcementDate: new Date((s.original as any).created_at || 0) });
        });

        parsedSubjects.forEach(sub => {
          let dateObj = new Date(sub.dateStr);
          if (sub.dateStr.includes("/")) {
            const parts = sub.dateStr.split("/");
            if (parts.length === 3) {
              const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              if (!isNaN(parsedDate.getTime())) {
                dateObj = parsedDate;
              }
            }
          }
          if (isNaN(dateObj.getTime())) dateObj = new Date();

          const existing = existingSubjectMap.get(sub.subjectName);
          if (existing && existing.announcementDate >= announcementDate) {
            // Already have a newer entry for this subject, skip
            return;
          }

          // Remove any older duplicate for same subject
          examGroupsMap[examName].subjects = examGroupsMap[examName].subjects.filter(
            s => s.subjectName !== sub.subjectName
          );

          examGroupsMap[examName].subjects.push({
            id: a.id + Math.random(),
            original: a,
            examName,
            subjectName: sub.subjectName,
            examType: displayType,
            dateStr: sub.dateStr,
            timeStr: sub.timeStr,
            venue: sub.venue,
            dateObj
          });

          existingSubjectMap.set(sub.subjectName, { dateObj, announcementDate });
        });
      } else {
        regular.push(a);
      }
    } else {
      regular.push(a);
    }
  });

  return {
    regular,
    examGroups: Object.values(examGroupsMap).sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    })
  };
};

const getExamWindowStr = (subjects: ParsedExamAnnouncement[]) => {
  if (subjects.length === 0) return "N/A";
  const dates = subjects.map(s => s.dateObj.getTime()).sort((a, b) => a - b);
  const minDate = new Date(dates[0]);
  const maxDate = new Date(dates[dates.length - 1]);
  if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) return "N/A";

  const minStr = format(minDate, "dd MMM yyyy");
  const maxStr = format(maxDate, "dd MMM yyyy");
  if (minStr === maxStr) return minStr;
  return `${format(minDate, "dd MMM")} - ${maxStr}`;
};

const groupByDate = (subjects: ParsedExamAnnouncement[]) => {
  const grouped: Record<string, ParsedExamAnnouncement[]> = {};
  const sorted = [...subjects].sort((a, b) => {
    if (a.dateObj.getTime() !== b.dateObj.getTime()) {
      return a.dateObj.getTime() - b.dateObj.getTime();
    }
    return a.timeStr.localeCompare(b.timeStr);
  });

  sorted.forEach(s => {
    const key = isNaN(s.dateObj.getTime()) ? "Unknown Date" : format(s.dateObj, "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  return grouped;
};

const ExamAnnouncementCard = ({ exam, theme, handleMarkRead }: { exam: ExamAnnouncementGroup, theme: string, handleMarkRead: (id: number) => void }) => {
  const dateGroups = groupByDate(exam.subjects);
  const publishedDate = new Date(exam.publishedAt);
  const isValidPublishedDate = !isNaN(publishedDate.getTime());
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportExamPDF = async () => {
    const annId = exam.subjects[0]?.original.id;
    if (!annId) return;

    setExportingPDF(true);
    try {
      const url = `${API_ENDPOINT}/announcements/${annId}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      const fileName = `${exam.examName.replace(/\s+/g, '_')}_Schedule.pdf`;
      await downloadFile(response, fileName);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleMarkAllRead = () => {
    const uniqueIds = Array.from(new Set(exam.markReadIds));
    uniqueIds.forEach(id => {
      const subWithId = exam.subjects.find(sub => sub.original.id === id);
      if (subWithId && !subWithId.original.is_read) {
        handleMarkRead(id);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 relative group p-5 rounded-xl border transition-all duration-300 hover:shadow-md ${!exam.is_read
        ? theme === 'dark' ? 'bg-primary/5 border-primary/20' : 'bg-blue-50/50 border-blue-100'
        : theme === 'dark' ? 'bg-card border-border hover:bg-muted/30' : 'bg-white border-gray-100 hover:border-gray-200'
        }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${getPriorityColor(exam.priority, theme)} border font-medium px-2 py-0.5 uppercase text-[10px]`}>
              {exam.priority}
            </Badge>
            {isRecent(exam.publishedAt) && (
              <Badge className="bg-primary text-white border-none text-[10px]">NEW</Badge>
            )}
            {!exam.is_read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h3 className={`text-lg font-semibold leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {exam.examName}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User size={14} className="opacity-70" />
              <span className="font-medium text-foreground/80">{exam.publishedBy}</span>
            </div>
            {isValidPublishedDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={14} className="opacity-70" />
                <span>{formatDate(exam.publishedAt)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Total Subjects Scheduled:</span>
              <span className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>{exam.subjects.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Exam Window:</span>
              <span className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>{getExamWindowStr(exam.subjects)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-col items-center md:items-end justify-between gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            {!exam.is_read && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className={`h-9 px-3 gap-2 flex-1 sm:flex-initial justify-center ${theme === 'dark' ? 'text-primary hover:bg-primary/10' : 'text-blue-600 hover:bg-blue-50'}`}
              >
                <Eye size={16} />
                <span className="text-xs font-semibold">Mark as read</span>
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-9 px-3 gap-2 bg-primary text-white hover:bg-primary/90 flex-1 sm:flex-initial justify-center">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold">View Schedule</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90%] sm:max-w-2xl rounded-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b pb-3 pr-6 md:pr-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <DialogTitle className="text-xl font-semibold truncate">{exam.examName} Schedule</DialogTitle>
                  </div>

                  {/* Mobile Export Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex md:hidden dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200 h-9 w-9 items-center justify-center shrink-0 p-0"
                    onClick={handleExportExamPDF}
                    disabled={exportingPDF}
                  >
                    {exportingPDF ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  {/* Desktop Export Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:flex bg-primary hover:bg-primary/90 text-white border-primary h-9 px-3.5 rounded-lg items-center justify-center gap-1.5 shadow-sm text-xs font-semibold shrink-0"
                    onClick={handleExportExamPDF}
                    disabled={exportingPDF}
                  >
                    {exportingPDF ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>{exportingPDF ? "Exporting..." : "Export PDF"}</span>
                  </Button>
                </DialogHeader>
                <div className={`mt-4 border rounded-md overflow-hidden ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  {Object.entries(dateGroups).map(([dateStr, subjects]) => (
                    <div key={dateStr} className={`border-b last:border-b-0 ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`}>
                      <div className={`sticky top-0 px-4 py-2 backdrop-blur-sm border-b font-medium text-sm flex items-center gap-2 z-10 ${theme === 'dark' ? 'bg-muted/60 border-border text-muted-foreground' : 'bg-gray-50/90 border-gray-100 text-gray-500'}`}>
                        <Calendar className="h-4 w-4" />
                        {dateStr === "Unknown Date" ? dateStr : format(parseISO(dateStr), "dd MMM yyyy")}
                      </div>
                      <div className="p-4 space-y-4">
                        {(subjects as any[]).map(sub => (
                          <div key={sub.id} className="flex gap-4 px-2 sm:px-4">
                            <div className={`w-24 shrink-0 text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} pt-0.5`}>
                              {sub.timeStr}
                            </div>
                            <div className={`flex-1 space-y-1 border-l-2 pl-4 ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                              <p className={`font-medium leading-none ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{sub.subjectName}</p>
                              <p className={`text-sm flex items-center gap-1 mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                <MapPin className="h-3 w-3" />
                                Venue: {sub.venue}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "priority">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const pageSize = 10;
  const { theme } = useTheme();

  const loadAnnouncements = async (page = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAnnouncements({
        page,
        pageSize,
        receivedPage: page
      });
      if (response.success && response.data) {
        const received = response.data.received_announcements;
        setAnnouncements(received?.results || []);
        setTotalCount(received?.count || 0);
        setUnreadCount(received?.unread_count || 0);
        setTotalPages(Math.ceil((received?.count || 0) / pageSize));
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
    loadAnnouncements(currentPage);
  }, [currentPage]);

  const handleMarkRead = async (announcementId: number) => {
    const response = await markAnnouncementRead(announcementId);
    if (response.success) {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a))
      );
      // Trigger global unread count refresh
      window.dispatchEvent(new CustomEvent('refresh-unread-count', { detail: { decrement: 1 } }));
    }
  };

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        a.title.toLowerCase().includes(query) ||
        a.message.toLowerCase().includes(query) ||
        a.created_by_name?.toLowerCase().includes(query);

      const matchesType = filterType === "all" || (filterType === "unread" && !a.is_read) || filterType === "priority";
      const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;

      return matchesSearch && matchesType && matchesPriority;
    });
  }, [announcements, searchQuery, filterType, priorityFilter]);

  const { regular, examGroups } = useMemo(() => parseAnnouncements(filtered), [filtered]);

  const stats = useMemo(() => {
    return {
      total: totalCount,
      unread: unreadCount,
      urgent: announcements.filter(a => a.priority === "urgent" || a.priority === "high").length, // Current page only
      recent: announcements.filter(a => isRecent(a.created_at)).length // Current page only
    };
  }, [announcements, totalCount, unreadCount]);

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .filter-text { display: none !important; }
          .filter-btn { width: 40px !important; height: 40px !important; padding: 0 !important; }
        }
      `}</style>
      <div>
        <Card id="announcements-card" className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
          <div id="announcements-header-stats">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Announcements
                  </h2>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Stay updated with the latest news, notices, and alerts from the campus.
                  </p>
                </div>
              </div>
            </CardHeader>

            <div className="px-6 pb-0">
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
                    className={`relative overflow-hidden group p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${theme === 'dark'
                      ? 'bg-muted/30 border-border hover:bg-muted/50'
                      : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:border-gray-200'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {stat.label}
                        </p>
                        <p className={`text-2xl font-semibold mt-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
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
            </div>
          </div>

          <CardContent className="space-y-8 pt-4">

            {/* Filters & Actions */}
            <div className="flex flex-row items-center justify-between gap-2 w-full sm:gap-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} size={18} />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:w-auto">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="filter-btn w-9 h-9 p-0 sm:w-[100px] sm:px-3 sm:gap-2 flex items-center justify-center rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 [&>svg:last-child]:hidden shadow-sm font-medium text-sm">
                    <Filter className="h-4 w-4" />
                    <span className="filter-text hidden sm:inline">Filter</span>
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="unread">Unread Only</SelectItem>
                    <SelectItem value="priority">By Priority</SelectItem>
                  </SelectContent>
                </Select>

                {filterType === "priority" && (
                  <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                    <SelectTrigger className={`w-[110px] sm:w-[160px] ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
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
              <div>
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
                      <>
                        {/* Render Exam Announcement Groups */}
                        {examGroups.map(exam => (
                          <ExamAnnouncementCard
                            key={exam.examName}
                            exam={exam}
                            theme={theme}
                            handleMarkRead={handleMarkRead}
                          />
                        ))}

                        {/* Render Regular Announcements */}
                        {regular.map((announcement, idx) => (
                          <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`relative group p-5 rounded-xl border transition-all duration-300 hover:shadow-md ${!announcement.is_read
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
                                  <h3 className={`text-lg sm:text-md font-semibold leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                    {announcement.title}
                                  </h3>
                                  <p className={`text-sm mt-2 leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                                    {announcement.message}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <User size={14} className="opacity-70" />
                                    <span className="font-medium text-foreground/80">From: {announcement.created_by_name || 'Administrator'}</span>
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
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkRead(announcement.id)}
                                    className={`h-9 px-3 gap-2 ${theme === 'dark' ? 'text-primary hover:bg-primary/10' : 'text-blue-600 hover:bg-blue-50'}`}
                                  >
                                    <Eye size={16} />
                                    <span className="text-xs font-semibold">Mark as read</span>
                                  </Button>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2.5 py-1 font-medium ${theme === 'dark' ? 'bg-primary/10 border-primary/20 text-primary-foreground' : 'bg-primary/5 border-primary/20 text-primary'}`}
                                >
                                  {formatRoleLabel(announcement.created_by_role)}
                                </Badge>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardContent>

          {!loading && !error && totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing page {currentPage} of {totalPages} ({totalCount} announcements)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {currentPage}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </>
  );
};

export default StudentAnnouncements;
