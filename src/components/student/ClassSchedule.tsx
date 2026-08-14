import React, { useState, useEffect, useMemo } from "react";
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
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
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
  is_mentoring?: boolean;
  general_feedback?: string | null;
  student_feedback?: { attendance_status: string; feedback: string | null } | null;
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
  const [selectedFeedbackItem, setSelectedFeedbackItem] = useState<ScheduledClassItem | null>(null);
  const [myFeedbackInput, setMyFeedbackInput] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const openFeedbackDialog = (item: ScheduledClassItem) => {
    setSelectedFeedbackItem(item);
    setMyFeedbackInput(item.student_feedback?.feedback || "");
  };

  const handleStudentSubmitFeedback = async () => {
    if (!selectedFeedbackItem) return;
    if (!myFeedbackInput.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please write your feedback / comments before submitting.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/${selectedFeedbackItem.id}/student-feedback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: myFeedbackInput.trim(),
          attendance_status: "attended"
        })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        toast({ title: "Feedback Submitted", description: "Your feedback has been sent to your proctor/faculty." });
        setClasses(prev => prev.map(c => c.id === selectedFeedbackItem.id ? {
          ...c,
          student_feedback: { attendance_status: "attended", feedback: myFeedbackInput }
        } : c));
        setSelectedFeedbackItem(null);
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit feedback.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

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
      const matchesSearch =
        (item.subject && item.subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
        (item.topic && item.topic.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
        (item.faculty && item.faculty.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      return matchesSearch;
    })
    .sort((a, b) => {
      const stateA = checkClassState(a);
      const stateB = checkClassState(b);
      if (stateA === "live" && stateB !== "live") return -1;
      if (stateB === "live" && stateA !== "live") return 1;
      if (stateA === "upcoming" && stateB === "completed") return -1;
      if (stateA === "completed" && stateB === "upcoming") return 1;
      return (
        new Date(`${b.date}T${b.start_time}`).getTime() -
        new Date(`${a.date}T${a.start_time}`).getTime()
      );
    });

  const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);

  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClasses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredClasses, currentPage]);

  const cardCls = `w-full ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"
    }`;

  return (
    <div
      className={`w-full max-w-full overflow-hidden space-y-6 ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"
        }`}
    >
      <Card id="class-schedule-card" className={`${cardCls} max-w-full overflow-hidden`}>
        {/* ── Card Header ──────────────────────────────────────────────── */}
        <CardHeader id="class-schedule-header" className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 mb-3">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Class Schedules</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Your upcoming and live sessions. Join Meet sessions directly when available.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* ── Card Content ─────────────────────────────────────────────── */}
        <CardContent className="pt-2 sm:pt-4 px-4 sm:px-6 space-y-4 max-w-full overflow-hidden">

          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-border/50 pb-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by subject, topic, or faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 pr-12 ${theme === "dark"
                    ? "bg-background border border-input text-foreground"
                    : "bg-white border border-gray-300 text-gray-900"
                  }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading class schedules…
            </div>
          ) : filteredClasses.length > 0 ? (
            /* Class Cards List */
            <div className="space-y-3 max-w-full">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredClasses.length)} of {filteredClasses.length} session{filteredClasses.length !== 1 ? "s" : ""}
              </p>

              {paginatedClasses.map((item) => {
                const classState = checkClassState(item);
                const isOnline = item.meeting_type === "online";
                const isEnded = classState === "completed";
                const hasFeedback = Boolean(item.student_feedback?.feedback && item.student_feedback.feedback.trim().length > 0);
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
                    className={`w-full max-w-full overflow-hidden rounded-xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md ${classState === "live"
                        ? "border-emerald-300 ring-1 ring-emerald-500/20 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                        : theme === "dark"
                          ? "bg-card border-border"
                          : "bg-white border-gray-200"
                      }`}
                  >
                    {/* Row 1: Icon + Topic + Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 w-full min-w-0">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mt-0.5 ${isOnline
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
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm line-clamp-2 break-words text-foreground leading-snug" title={item.topic}>
                            {item.topic}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.subject} ({item.subject_code})
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start sm:self-auto pl-10 sm:pl-0">
                        {item.is_mentoring && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-full">
                            Proctor Mentoring
                          </span>
                        )}
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
                        {classState === "completed" && (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-100 dark:bg-green-950/60 dark:text-green-300 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Date, Time, Faculty, Room */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-b border-border/40 pb-2.5">
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
                      <p className="text-xs text-muted-foreground italic break-words line-clamp-2">
                        "{item.description}"
                      </p>
                    )}

                    {/* Row 4: Meet link + actions */}
                    {isOnline && item.meeting_link && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 w-full min-w-0">
                        <a
                          href={item.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-mono truncate max-w-full sm:max-w-xs md:max-w-sm"
                          title={item.meeting_link}
                        >
                          <span className="truncate">{item.meeting_link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <div className="flex items-center gap-2 flex-wrap sm:shrink-0 justify-start sm:justify-end">
                          {classState === "live" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                item.meeting_link &&
                                window.open(item.meeting_link, "_blank")
                              }
                              className="text-xs h-8 px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
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
                            className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground shrink-0"
                            title="Copy Link"
                            onClick={(e) => handleCopyLink(item.meeting_link || "", e)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground shrink-0"
                            title="Share Link"
                            onClick={(e) =>
                              handleShareLink(item.meeting_link || "", item.topic, e)
                            }
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>
                          {item.is_mentoring && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!isEnded || hasFeedback}
                              className={`h-8 text-xs gap-1 shrink-0 transition-all ${
                                hasFeedback
                                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 cursor-not-allowed opacity-90"
                                  : !isEnded
                                  ? "text-muted-foreground border-border/50 opacity-50 cursor-not-allowed"
                                  : "border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
                              }`}
                              title={
                                hasFeedback
                                  ? "Feedback already submitted"
                                  : !isEnded
                                  ? "Feedback will be enabled once the meeting ends"
                                  : "Submit feedback for this mentoring session"
                              }
                              onClick={() => {
                                if (isEnded && !hasFeedback) {
                                  openFeedbackDialog(item);
                                }
                              }}
                            >
                              {hasFeedback ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Submitted</span>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{isEnded ? "Give Feedback" : "Feedback"}</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Offline — no link section */}
                    {!isOnline && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 w-full min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                          <Home className="w-3.5 h-3.5" /> In-person class
                          {item.classroom_room ? ` · Room ${item.classroom_room}` : ""}
                        </div>
                        {item.is_mentoring && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isEnded || hasFeedback}
                            className={`text-xs h-7 px-2.5 gap-1 transition-all shrink-0 ${
                              hasFeedback
                                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 cursor-not-allowed opacity-90"
                                : !isEnded
                                ? "text-muted-foreground border-border/50 opacity-50 cursor-not-allowed"
                                : "border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
                            }`}
                            title={
                              hasFeedback
                                ? "Feedback already submitted"
                                : !isEnded
                                ? "Feedback will be enabled once the meeting ends"
                                : "Submit feedback for this mentoring session"
                            }
                            onClick={() => {
                              if (isEnded && !hasFeedback) {
                                openFeedbackDialog(item);
                              }
                            }}
                          >
                            {hasFeedback ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Submitted</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{isEnded ? "Give Feedback" : "Feedback"}</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Upcoming Classes</h3>
              <p className={`text-sm max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                There are no upcoming or live class schedules for your section at this time.
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Student Session Feedback Dialog Modal ──────────────────────── */}
      <Dialog open={!!selectedFeedbackItem} onOpenChange={(open) => { if (!open) setSelectedFeedbackItem(null); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Meeting Feedback & Notes
            </DialogTitle>
            <DialogDescription>
              {selectedFeedbackItem?.topic} ({selectedFeedbackItem?.date}) — Faculty: {selectedFeedbackItem?.faculty}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {selectedFeedbackItem?.general_feedback && (
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Faculty Meeting Notes / Remarks</h4>
                <p className="text-sm bg-muted/30 p-3 rounded-lg border border-border/50 text-foreground">
                  {selectedFeedbackItem.general_feedback}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider">Your Feedback / Meeting Comments</h4>
              <Textarea
                placeholder="Share your thoughts, progress update, or comments regarding this meeting..."
                value={myFeedbackInput}
                onChange={(e) => setMyFeedbackInput(e.target.value)}
                rows={4}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground italic">Your feedback will be automatically submitted to your proctor / faculty member.</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedFeedbackItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleStudentSubmitFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassSchedule;