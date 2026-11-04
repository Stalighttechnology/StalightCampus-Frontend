import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/ThemeContext";
import {
  getFeedbackStudentSubmissions,
  FeedbackStudentSubmissionsResponse,
} from "@/utils/faculty_api";
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface StudentFeedbackSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  sectionId?: number | null;
  sectionName?: string;
  cycle: number;
}

export const StudentFeedbackSubmissionsModal: React.FC<StudentFeedbackSubmissionsModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  subjectCode = "",
  sectionId = null,
  sectionName = "All",
  cycle,
}) => {
  const { theme } = useTheme();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FeedbackStudentSubmissionsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "submitted" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Server-side Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Reset modal state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setDebouncedSearch("");
      setCopied(false);
      setCurrentPage(1);
      setActiveTab("all");
    }
  }, [isOpen]);

  // Debounce search input by 350ms to prevent excessive API calls while typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Main data fetching effect: executes network call on page, tab, size, or search query change
  useEffect(() => {
    if (!isOpen || !subjectId) return;
    let isCancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await getFeedbackStudentSubmissions(
          subjectId,
          cycle,
          sectionId,
          currentPage,
          pageSize,
          activeTab,
          debouncedSearch
        );
        if (!isCancelled) {
          if (res.success) {
            setData(res);
          } else {
            toast({
              variant: "destructive",
              title: "Failed to Load Submissions",
              description: res.message || "Could not retrieve student feedback list.",
            });
          }
        }
      } catch {
        if (!isCancelled) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Network error occurred while fetching submissions.",
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, subjectId, cycle, sectionId, currentPage, pageSize, activeTab, debouncedSearch, refreshTrigger, toast]);

  const handleTabChange = (newTab: "all" | "submitted" | "pending") => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    if (newSize === pageSize) return;
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const stats = data?.stats || {
    total_enrolled: 0,
    total_submitted: 0,
    total_pending: 0,
    submission_rate: 0,
  };

  // Server-paginated student list (max pageSize items)
  const studentList = data?.students || [];

  const pagination = data?.pagination;
  const totalCount =
    pagination?.total_count ??
    (activeTab === "all"
      ? stats.total_enrolled
      : activeTab === "submitted"
      ? stats.total_submitted
      : stats.total_pending);
  const totalPages = pagination?.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = pagination?.page ?? Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + studentList.length, totalCount);

  const handleCopyPendingUSNs = () => {
    const usns = data?.all_pending_usns || [];
    if (usns.length === 0) {
      toast({
        title: "No Pending Students",
        description: "All enrolled students have already submitted their feedback!",
      });
      return;
    }

    navigator.clipboard.writeText(usns.join(", "));
    setCopied(true);
    toast({
      title: "USNs Copied",
      description: `Copied ${usns.length} pending USNs to clipboard for class reminder.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const formatTimestamp = (ts: string | null | undefined) => {
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return ts;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`w-[95vw] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 rounded-2xl overflow-hidden ${
          theme === "dark"
            ? "bg-background text-foreground border-border"
            : "bg-white text-gray-900 border-gray-200"
        }`}
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5 text-primary shrink-0" />
                  <span>Student Submissions Roster</span>
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  Feedback {cycle === 2 ? "2 (End-Term)" : "1 (Mid-Term)"}
                </Badge>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {subjectName} {subjectCode ? `(${subjectCode})` : ""} • Section:{" "}
                <strong className="text-foreground">{sectionName}</strong>
              </DialogDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 gap-1.5 text-xs self-start sm:self-auto shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Enrolled Students
              </span>
              <div className="text-xl font-bold text-foreground">{stats.total_enrolled}</div>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted
              </span>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.total_submitted}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
              </span>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                {stats.total_pending}
              </div>
            </div>

            <div className="p-3 rounded-xl border bg-primary/5 border-primary/20 space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase">
                Submission Rate
              </span>
              <div className="text-xl font-bold text-primary">{stats.submission_rate}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500"
                style={{ width: `${Math.min(100, stats.submission_rate)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground italic text-right">
              {stats.total_submitted} of {stats.total_enrolled} completed ({stats.total_pending} remaining)
            </p>
          </div>

          {/* Search Bar & Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => handleTabChange("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({stats.total_enrolled})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("submitted")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === "submitted"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Submitted ({stats.total_submitted})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("pending")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === "pending"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-3 h-3" />
                Pending ({stats.total_pending})
              </button>
            </div>

            {/* Copy Pending USNs Action */}
            {stats.total_pending > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPendingUSNs}
                className="h-8 gap-1.5 text-xs border-amber-400/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied USNs!" : `Copy ${stats.total_pending} Pending USNs`}</span>
              </Button>
            )}
          </div>

          {/* Search Input & Page Size Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by student name or USN..."
                className="pl-9 h-9 text-xs sm:text-sm rounded-xl"
              />
            </div>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <span className="text-[11px] text-muted-foreground font-medium">Rows:</span>
              {[15, 25, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
                    pageSize === size
                      ? "bg-primary text-white border-primary shadow-2xs"
                      : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Students List Display */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading student roster...</p>
            </div>
          ) : studentList.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto opacity-40 text-primary" />
              <p className="text-xs sm:text-sm font-medium">
                {searchQuery
                  ? `No students found matching "${searchQuery}"`
                  : activeTab === "submitted"
                  ? "No student submissions recorded yet."
                  : activeTab === "pending"
                  ? "Great! All enrolled students have completed their feedback."
                  : "No student records available."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1.5 max-h-[44vh] overflow-y-auto pr-1">
                {studentList.map((s, idx) => {
                  const globalIdx = startIndex + idx + 1;
                  return s.is_submitted ? (
                    /* SUBMITTED STUDENT CARD */
                    <div
                      key={`sub-${s.student_id}-${idx}`}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        theme === "dark"
                          ? "bg-muted/15 border-border hover:bg-muted/25"
                          : "bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-muted-foreground w-6 text-center shrink-0">
                          #{globalIdx}
                        </span>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {s.name}
                            </span>
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                              {s.usn}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                              Sec {s.section_name}
                            </span>
                            {s.has_suggestions && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-medium flex items-center gap-0.5">
                                <MessageSquare className="w-2.5 h-2.5" />
                                Feedback Note
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Submitted on {formatTimestamp(s.submitted_at)}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] gap-1 shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submitted</span>
                      </Badge>
                    </div>
                  ) : (
                    /* PENDING STUDENT CARD */
                    <div
                      key={`pen-${s.student_id}-${idx}`}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        theme === "dark"
                          ? "bg-muted/10 border-border opacity-90"
                          : "bg-gray-50/50 border-gray-100 opacity-90"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-muted-foreground w-6 text-center shrink-0">
                          #{globalIdx}
                        </span>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {s.name}
                            </span>
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {s.usn}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                              Sec {s.section_name}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90">
                            Survey response not yet submitted for Feedback {cycle}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] gap-1 shrink-0"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION TOOLBAR */}
              {totalPages > 1 && (
                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Showing <strong className="text-foreground">{startIndex + 1}</strong> to{" "}
                    <strong className="text-foreground">{endIndex}</strong> of{" "}
                    <strong className="text-foreground">{totalCount}</strong> students
                  </span>

                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setCurrentPage(1)}
                      disabled={safeCurrentPage === 1 || loading}
                      title="First page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>

                    {/* Prev Page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1 || loading}
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {/* Page Numbers Indicator */}
                    <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-muted border">
                      Page {safeCurrentPage} of {totalPages}
                    </span>

                    {/* Next Page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages || loading}
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    {/* Last Page */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safeCurrentPage >= totalPages || loading}
                      title="Last page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 flex flex-row items-center justify-between">
          <span className="text-[11px] text-muted-foreground italic">
            Confidentiality preserved: Individual ratings are anonymized.
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
