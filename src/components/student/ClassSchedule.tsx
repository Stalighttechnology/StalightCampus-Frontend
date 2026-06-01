import React, { useState, useEffect } from "react";
import {
  Video,
  Home,
  Calendar,
  Clock,
  Loader2,
  ArrowUpRight,
  Search,
  PlayCircle,
  Copy,
  Share2,
  ExternalLink,
  CalendarDays,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ScheduledClassItem {
  id: number;
  subject: string;
  subject_code: string;
  faculty: string;
  topic: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  meeting_type: "online" | "offline";
  classroom_room: string | null;
  meeting_link: string | null;
  status: string;
}

interface ClassScheduleProps {
  user: any;
  setError: (error: string | null) => void;
}

const formatTo12Hour = (timeStr: string) => {
  if (!timeStr) return "";
  try {
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    return `${String(hours).padStart(2, "0")}:${minutesStr} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

const ClassSchedule: React.FC<ClassScheduleProps> = ({ user, setError }) => {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [classes, setClasses] = useState<ScheduledClassItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleCopyLink = (link: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Google Meet link copied to clipboard.",
    });
  };

  const handleShareLink = (link: string, topic: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const title = `Class: ${topic}`;
    const text = `Join class for "${topic}" via Google Meet:`;
    if (navigator.share) {
      navigator.share({ title, text, url: link }).catch((err) => console.log(err));
    } else {
      navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied!",
        description: "Sharing not supported. Link copied to clipboard!",
      });
    }
  };

  useEffect(() => {
    fetchScheduledClasses();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchScheduledClasses = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/`);
      const data = await response.json();
      if (response.ok && data?.success && data.data) {
        setClasses(data.data);
      } else {
        console.error("Failed to load class schedules:", data);
      }
    } catch (err) {
      console.error("Error loading class schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkClassState = (item: ScheduledClassItem) => {
    const classStart = new Date(`${item.date}T${item.start_time}`);
    const classEnd = new Date(`${item.date}T${item.end_time}`);
    if (currentTime > classEnd) return "completed";
    if (
      currentTime >= new Date(classStart.getTime() - 10 * 60 * 1000) &&
      currentTime <= classEnd
    )
      return "live";
    return "upcoming";
  };

  const filteredClasses = classes
    .filter((item) => {
      const state = checkClassState(item);
      if (state === "completed") return false;
      const matchesSearch =
        item.subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.topic.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.faculty.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      const stateA = checkClassState(a);
      const stateB = checkClassState(b);
      if (stateA === "live" && stateB !== "live") return -1;
      if (stateB === "live" && stateA !== "live") return 1;
      return (
        new Date(`${a.date}T${a.start_time}`).getTime() -
        new Date(`${b.date}T${b.start_time}`).getTime()
      );
    });

  const cardCls = `w-full ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"
    }`;

  return (
    <div
      className={`w-full space-y-6 ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"
        }`}
    >
      <Card className={cardCls}>
        {/* ── Card Header ──────────────────────────────────────────────── */}
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Class Schedules</CardTitle>
              <CardDescription
                className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}
              >
                Your upcoming and live sessions. Join Meet sessions directly when available.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* ── Card Content ─────────────────────────────────────────────── */}
        <CardContent className="pt-5 space-y-4">

          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-border/50 pb-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by subject, topic, or faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 ${theme === "dark"
                    ? "bg-background border border-input text-foreground"
                    : "bg-white border border-gray-300 text-gray-900"
                  }`}
              />
            </div>

          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading class schedules…
            </div>
          ) : filteredClasses.length > 0 ? (
            /* Class Cards List */
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">
                {filteredClasses.length} upcoming or live class
                {filteredClasses.length !== 1 ? "es" : ""}
              </p>

              {filteredClasses.map((item) => {
                const classState = checkClassState(item);
                const isOnline = item.meeting_type === "online";
                const dateStr = (() => {
                  try {
                    return format(new Date(item.date), "EEE, dd MMM");
                  } catch {
                    return item.date;
                  }
                })();

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 flex flex-col gap-2 transition-all hover:shadow-md ${classState === "live"
                        ? "border-emerald-300 ring-1 ring-emerald-500/20 dark:border-emerald-800/60"
                        : theme === "dark"
                          ? "bg-card border-border"
                          : "bg-white border-gray-200"
                      }`}
                  >
                    {/* Row 1: Icon + Topic + Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${isOnline
                              ? "bg-blue-100 dark:bg-blue-950/50"
                              : "bg-amber-100 dark:bg-amber-950/50"
                            }`}
                        >
                          {isOnline ? (
                            <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{item.topic}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.subject} ({item.subject_code})
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:self-auto self-start pl-10 sm:pl-0">
                        {classState === "live" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40 px-2 py-0.5 rounded-full animate-pulse">
                            <PlayCircle className="w-3 h-3" /> Live
                          </span>
                        )}
                        {classState === "upcoming" && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Date, Time, Faculty, Room */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-b pb-2.5">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" /> {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {formatTo12Hour(item.start_time)} – {formatTo12Hour(item.end_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-primary">
                            {item.faculty.charAt(0)}
                          </span>
                        </div>
                        {item.faculty}
                      </span>
                      {!isOnline && item.classroom_room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {item.classroom_room}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Description */}
                    {item.description && (
                      <p className="text-xs text-muted-foreground italic line-clamp-1">
                        "{item.description}"
                      </p>
                    )}

                    {/* Row 4: Meet link + actions */}
                    {isOnline && item.meeting_link && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <a
                          href={item.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-mono truncate max-w-full sm:max-w-[200px] md:max-w-xs break-all"
                        >
                          {item.meeting_link}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        <div className="flex items-center gap-1.5 shrink-0 sm:self-auto self-end">
                          {classState === "live" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                item.meeting_link &&
                                window.open(item.meeting_link, "_blank")
                              }
                              className="text-xs h-7 px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
                            >
                              Join Meet
                              <ArrowUpRight className="w-3 h-3 ml-1 shrink-0" />
                            </Button>
                          )}
                          {classState === "upcoming" && (
                             <span className="text-[10px] font-medium text-muted-foreground mr-1">
                               Join at {formatTo12Hour(item.start_time)}
                             </span>
                           )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground"
                            title="Copy Link"
                            onClick={(e) => handleCopyLink(item.meeting_link || "", e)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground"
                            title="Share Link"
                            onClick={(e) =>
                              handleShareLink(item.meeting_link || "", item.topic, e)
                            }
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Offline — no link section */}
                    {!isOnline && (
                      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground font-medium">
                        <Home className="w-3.5 h-3.5" /> In-person class
                        {item.classroom_room ? ` · Room ${item.classroom_room}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <Calendar className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-semibold">No Upcoming Classes</p>
              <p className="text-xs text-muted-foreground/70 max-w-sm mx-auto">
                There are no upcoming or live class schedules for your section at this time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassSchedule;