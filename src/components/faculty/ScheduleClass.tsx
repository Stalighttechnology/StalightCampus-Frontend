import { translateTerminology, getTerm, getInstitutionType } from "@/utils/institutionConfig";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
import {
  Calendar,
  Clock,
  Video,
  Home,
  Loader2,
  CalendarDays,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Copy,
  Share2,
  Plus,
  FileDownIcon,
  Eye,
  MessageSquare,
} from "lucide-react";
import { useFacultyAssignmentsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as ShadcnCalendar } from "../ui/calendar";
import { cn } from "@/lib/utils";

const GoogleLogo = () => (
  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

interface ScheduleClassProps {
  user: any;
  setError: (error: string | null) => void;
  toast?: any;
}

interface ScheduledClassRecord {
  id: number;
  subject: string;
  subject_code: string;
  branch_id?: number;
  semester_id?: number;
  section_id?: number;
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

// ─── Helper: cascading dropdown options from assignments ─────────────────────

function useAssignmentDropdowns(assignments: any[]) {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);

  // open-control refs for auto-cascade
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const suppressBranchClear = useRef(false);
  const suppressSemClear = useRef(false);
  const autoTriggered = useRef<number | null>(null);

  const normalized = useMemo(
    () =>
      assignments.map((a) => ({
        ...a,
        subject_id: a.subject_id ? Number(a.subject_id) : null,
        branch_id: a.branch_id ? Number(a.branch_id) : null,
        semester_id: a.semester_id ? Number(a.semester_id) : null,
        section_id: a.section_id ? Number(a.section_id) : null,
      })),
    [assignments]
  );

  // subjects (de-duped)
  const subjects = useMemo(
    () =>
      Array.from(
        new Map(normalized.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
      ),
    [normalized]
  );

  // branches for selected subject
  const branches = useMemo(
    () =>
      subjectId
        ? Array.from(
          new Map(
            normalized
              .filter((a) => a.subject_id === subjectId)
              .map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])
          ).values()
        )
        : [],
    [normalized, subjectId]
  );

  // semesters for selected subject+branch
  const semesters = useMemo(
    () =>
      subjectId && branchId
        ? Array.from(
          new Map(
            normalized
              .filter((a) => a.subject_id === subjectId && a.branch_id === branchId)
              .map((a) => [a.semester_id, { id: a.semester_id, name: String(a.semester) }])
          ).values()
        )
        : [],
    [normalized, subjectId, branchId]
  );

  // sections for selected subject+branch+semester
  const sections = useMemo(
    () =>
      subjectId && branchId && semesterId
        ? Array.from(
          new Map(
            normalized
              .filter(
                (a) =>
                  a.subject_id === subjectId &&
                  a.branch_id === branchId &&
                  a.semester_id === semesterId
              )
              .map((a) => [a.section_id, { id: a.section_id, name: a.section }])
          ).values()
        )
        : [],
    [normalized, subjectId, branchId, semesterId]
  );

  // Auto-derive single unique values when subject changes
  useEffect(() => {
    setBranchId(null);
    setSemesterId(null);
    setSectionId(null);
    autoTriggered.current = null;
    if (!subjectId) return;
    const sub = normalized.filter((a) => a.subject_id === subjectId);
    const uBranches = [...new Set(sub.map((a) => a.branch_id))].filter(Boolean);
    const uSems = [...new Set(sub.map((a) => a.semester_id))].filter(Boolean);
    const uSecs = [...new Set(sub.map((a) => a.section_id))].filter(Boolean);
    autoTriggered.current = subjectId;
    if (uBranches.length === 1) { suppressBranchClear.current = true; setBranchId(uBranches[0]); }
    if (uSems.length === 1) { suppressSemClear.current = true; setSemesterId(uSems[0]); }
    if (uSecs.length === 1) setSectionId(uSecs[0]);
    // open next unfilled
    if (uBranches.length !== 1) setTimeout(() => setIsBranchOpen(true), 150);
    else if (uSems.length !== 1) setTimeout(() => setIsSemesterOpen(true), 150);
    else if (uSecs.length !== 1) setTimeout(() => setIsSectionOpen(true), 150);
  }, [subjectId, normalized]);

  // When branch changes manually, clear downstream and cascade trigger
  useEffect(() => {
    if (suppressBranchClear.current) { suppressBranchClear.current = false; return; }
    setSemesterId(null);
    setSectionId(null);

    if (subjectId && branchId) {
      const matching = normalized.filter(
        (a) => a.subject_id === subjectId && a.branch_id === branchId
      );
      const uniqueSems = [...new Set(matching.map((a) => a.semester_id))].filter(Boolean);
      if (uniqueSems.length === 1) {
        suppressSemClear.current = true;
        setSemesterId(uniqueSems[0]);
        // Also check section
        const uniqueSecs = [...new Set(matching.filter(a => a.semester_id === uniqueSems[0]).map(a => a.section_id))].filter(Boolean);
        if (uniqueSecs.length === 1) {
          setSectionId(uniqueSecs[0]);
        } else if (uniqueSecs.length > 1) {
          setTimeout(() => setIsSectionOpen(true), 150);
        }
      } else if (uniqueSems.length > 1) {
        setTimeout(() => setIsSemesterOpen(true), 150);
      }
    }
  }, [branchId, subjectId, normalized]);

  useEffect(() => {
    if (suppressSemClear.current) { suppressSemClear.current = false; return; }
    setSectionId(null);

    if (subjectId && branchId && semesterId) {
      const matching = normalized.filter(
        (a) =>
          a.subject_id === subjectId &&
          a.branch_id === branchId &&
          a.semester_id === semesterId
      );
      const uniqueSecs = [...new Set(matching.map((a) => a.section_id))].filter(Boolean);
      if (uniqueSecs.length === 1) {
        setSectionId(uniqueSecs[0]);
      } else if (uniqueSecs.length > 1) {
        setTimeout(() => setIsSectionOpen(true), 150);
      }
    }
  }, [semesterId, subjectId, branchId, normalized]);

  const reset = () => {
    setSubjectId(null);
    setBranchId(null);
    setSemesterId(null);
    setSectionId(null);
  };

  // current full assignment match (for ids we need to POST)
  const currentAssignment = useMemo(
    () =>
      subjectId && branchId && semesterId && sectionId
        ? normalized.find(
          (a) =>
            a.subject_id === subjectId &&
            a.branch_id === branchId &&
            a.semester_id === semesterId &&
            a.section_id === sectionId
        ) ?? null
        : null,
    [normalized, subjectId, branchId, semesterId, sectionId]
  );

  const isFullySelected = !!(subjectId && branchId && semesterId && sectionId);

  return {
    subjectId, setSubjectId,
    branchId, setBranchId,
    semesterId, setSemesterId,
    sectionId, setSectionId,
    isBranchOpen, setIsBranchOpen,
    isSemesterOpen, setIsSemesterOpen,
    isSectionOpen, setIsSectionOpen,
    subjects, branches, semesters, sections,
    currentAssignment,
    isFullySelected,
    reset,
  };
}

// ─── Sub-component: Cascading Dropdowns ────────────────────────────────────

interface DropdownGroupProps {
  dropdowns: ReturnType<typeof useAssignmentDropdowns>;
  theme: string;
  disabled?: boolean;
  className?: string;
}

const DropdownGroup = ({ dropdowns, theme, disabled, className }: DropdownGroupProps) => {
  const {
    subjectId, setSubjectId,
    branchId, setBranchId,
    semesterId, setSemesterId,
    sectionId, setSectionId,
    isBranchOpen, setIsBranchOpen,
    isSemesterOpen, setIsSemesterOpen,
    isSectionOpen, setIsSectionOpen,
    subjects, branches, semesters, sections,
  } = dropdowns;

  const selectCls = `${theme === "dark"
    ? "bg-background border border-input text-foreground"
    : "bg-white border border-gray-300 text-gray-900"
    } w-full`;

  const contentCls = `${theme === "dark"
    ? "bg-background border border-input text-foreground"
    : "bg-white border border-gray-300 text-gray-900"
    } max-h-[200px]`;

  return (
    <div className={className || "flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-4 w-full"}>
      {/* Subject */}
      <Select
        value={subjectId?.toString()}
        onValueChange={(v) => setSubjectId(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className={selectCls} disabled={disabled}>
          <SelectValue placeholder="Select Subject" />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          {subjects.length > 0 ? (
            subjects.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name}
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-center text-muted-foreground">No subjects</div>
          )}
        </SelectContent>
      </Select>

      {/* Branch */}
      <Select
        value={branchId?.toString()}
        onValueChange={(v) => setBranchId(Number(v))}
        disabled={!subjectId || disabled}
        open={isBranchOpen}
        onOpenChange={setIsBranchOpen}
      >
        <SelectTrigger className={selectCls} disabled={!subjectId || disabled}>
          <SelectValue placeholder={translateTerminology("Select Branch")} />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id.toString()}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Semester */}
      <Select
        value={semesterId?.toString()}
        onValueChange={(v) => setSemesterId(Number(v))}
        disabled={!branchId || semesters.length === 0 || disabled}
        open={isSemesterOpen}
        onOpenChange={setIsSemesterOpen}
      >
        <SelectTrigger className={selectCls} disabled={!branchId || semesters.length === 0 || disabled}>
          <SelectValue placeholder={translateTerminology("Select Semester")} />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          {semesters.map((s) => (
            <SelectItem key={s.id} value={s.id.toString()}>
              {`${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${s.name}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Section */}
      <Select
        value={sectionId?.toString() || ""}
        onValueChange={(v) => setSectionId(v ? Number(v) : null)}
        disabled={!semesterId || sections.length === 0 || disabled}
        open={isSectionOpen}
        onOpenChange={setIsSectionOpen}
      >
        <SelectTrigger className={selectCls} disabled={!semesterId || sections.length === 0 || disabled}>
          <SelectValue placeholder="Select Section" />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          {sections.map((s) => (
            <SelectItem key={s.id} value={s.id.toString()}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

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

// ─── Sub-component: Class History Card ─────────────────────────────────────

const ClassHistoryCard = ({
  cls,
  theme,
  currentTime = new Date(),
  onViewFeedback,
  onExportCSV,
}: {
  cls: any;
  theme: string;
  currentTime?: Date;
  onViewFeedback?: (cls: any) => void;
  onExportCSV?: (cls: any) => void;
}) => {
  const { toast } = useToast();
  const isOnline = cls.meeting_type === "online";
  const dateStr = (() => {
    try { return format(new Date(cls.date), "dd MMM yyyy"); } catch { return cls.date; }
  })();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cls.meeting_link) return;
    navigator.clipboard.writeText(cls.meeting_link);
    toast({
      title: "Copied!",
      description: "Google Meet link copied to clipboard.",
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cls.meeting_link) return;
    const title = `Class: ${cls.topic}`;
    const text = `Join class for "${cls.topic}" via Google Meet:`;
    if (navigator.share) {
      navigator.share({
        title,
        text,
        url: cls.meeting_link,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(cls.meeting_link);
      toast({
        title: "Link Copied!",
        description: "Sharing not supported. Link copied to clipboard!",
      });
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-2 transition-all hover:shadow-md ${theme === "dark"
        ? "bg-card border-border"
        : "bg-white border-gray-200"
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${isOnline ? "bg-blue-100 dark:bg-blue-950/50" : "bg-amber-100 dark:bg-amber-950/50"
              }`}
          >
            {isOnline ? (
              <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{cls.topic}</p>
            <p className="text-xs text-muted-foreground truncate">{cls.subject} ({cls.subject_code})</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:shrink-0 sm:self-auto self-start pl-10 sm:pl-0">
          {cls.is_mentoring && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Mentoring
            </span>
          )}
          {(() => {
            const classStart = new Date(`${cls.date}T${cls.start_time}`);
            const classEnd = new Date(`${cls.date}T${cls.end_time}`);
            let statusText = "Upcoming";
            let statusStyle = "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";

            if (currentTime > classEnd) {
              statusText = "Completed";
              statusStyle = "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300";
            } else if (currentTime >= classStart && currentTime <= classEnd) {
              statusText = "Ongoing";
              statusStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse";
            }

            return (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
                {statusText}
              </span>
            );
          })()}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-b pb-2.5">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" /> {dateStr}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {formatTo12Hour(cls.start_time)} – {formatTo12Hour(cls.end_time)}
        </span>
        {cls.classroom_room && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {cls.classroom_room}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-border/40">
        {cls.meeting_link ? (
          <a
            href={cls.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-mono truncate max-w-full sm:max-w-[180px] md:max-w-xs break-all"
          >
            {cls.meeting_link}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        ) : <div />}

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end flex-nowrap shrink-0">
          {cls.is_mentoring && onViewFeedback && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 sm:flex-initial px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold rounded-lg border border-purple-300 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shrink min-w-0 shadow-none"
              onClick={() => onViewFeedback(cls)}
            >
              <span className="truncate">Student Feedback & Status</span>
            </Button>
          )}
          {cls.is_mentoring && onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 sm:w-auto sm:px-3 p-0 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 gap-1.5 shadow-none shrink-0"
              onClick={() => onExportCSV(cls)}
              title="Export mentoring session report with student feedback to CSV"
            >
              <FileDownIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}
          {cls.meeting_link && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0 shadow-none"
                title="Copy Link"
                onClick={handleCopy}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0 shadow-none"
                title="Share Link"
                onClick={handleShare}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface StudentFeedbackRowProps {
  st: any;
  idx: number;
  onStatusChange: (idx: number, status: string) => void;
  onFeedbackChange: (idx: number, feedback: string) => void;
  onViewFeedback: (st: any) => void;
}

const StudentFeedbackRow = React.memo(({
  st,
  idx,
  onStatusChange,
  onFeedbackChange,
  onViewFeedback,
}: StudentFeedbackRowProps) => {
  return (
    <div className="p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-foreground text-sm">{st.student_name}</span>
          <span className="text-muted-foreground ml-2 font-mono text-xs">({st.usn})</span>
        </div>
        <select
          value={st.attendance_status || "pending"}
          onChange={(e) => onStatusChange(idx, e.target.value)}
          className="h-7 px-2 text-xs rounded-md border border-input bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shrink-0 cursor-pointer"
        >
          <option value="attended">Attended</option>
          <option value="absent">Absent</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {st.feedback ? (
        <div className="bg-purple-50/70 dark:bg-purple-950/40 p-2 rounded-lg border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 shrink-0" /> Student Response
            </span>
            <p className="text-xs text-foreground italic break-words line-clamp-1 mt-0.5">
              "{st.feedback}"
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10 shrink-0 font-medium shadow-none"
            onClick={() => onViewFeedback(st)}
          >
            <Eye className="w-3 h-3" /> View
          </Button>
        </div>
      ) : null}

      <Input
        type="text"
        placeholder="Faculty note / specific feedback for this student..."
        defaultValue={st.feedback || ""}
        onBlur={(e) => onFeedbackChange(idx, e.target.value)}
        className="h-8 text-xs w-full"
      />
    </div>
  );
});
StudentFeedbackRow.displayName = "StudentFeedbackRow";

// ─── Main Component ──────────────────────────────────────────────────────────

const getInitialScheduleState = () => {
  const now = new Date();

  // Format Date: YYYY-MM-DD local time
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const defaultDate = `${year}-${month}-${day}`;

  // Start Time
  let currentHour = now.getHours();
  let currentMinute = now.getMinutes();

  // Round minute to nearest 5 minutes
  const remainder = currentMinute % 5;
  if (remainder >= 3) {
    currentMinute = currentMinute + (5 - remainder);
  } else {
    currentMinute = currentMinute - remainder;
  }
  if (currentMinute >= 60) {
    currentMinute = 0;
    currentHour = (currentHour + 1) % 24;
  }

  // AM/PM calculation
  let startP = "AM";
  let startHNum = currentHour;
  if (currentHour >= 12) {
    startP = "PM";
    if (currentHour > 12) {
      startHNum = currentHour - 12;
    }
  } else if (currentHour === 0) {
    startHNum = 12;
  }
  const defaultStartHour = String(startHNum).padStart(2, "0");
  const defaultStartMinute = String(currentMinute).padStart(2, "0");
  const defaultStartPeriod = startP;

  // End Time: Start Time + 1 hour
  let endHourRaw = (currentHour + 1) % 24;
  let endP = "AM";
  let endHNum = endHourRaw;
  if (endHourRaw >= 12) {
    endP = "PM";
    if (endHourRaw > 12) {
      endHNum = endHourRaw - 12;
    }
  } else if (endHourRaw === 0) {
    endHNum = 12;
  }
  const defaultEndHour = String(endHNum).padStart(2, "0");
  const defaultEndMinute = defaultStartMinute; // match start minutes
  const defaultEndPeriod = endP;

  return {
    date: defaultDate,
    startHour: defaultStartHour,
    startMinute: defaultStartMinute,
    startPeriod: defaultStartPeriod,
    endHour: defaultEndHour,
    endMinute: defaultEndMinute,
    endPeriod: defaultEndPeriod
  };
};

const ScheduleClass = ({ user, setError }: ScheduleClassProps) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const { data: rawAssignments = [], isLoading: assignmentsLoading } = useFacultyAssignmentsQuery();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const scheduleDropdowns = useAssignmentDropdowns(rawAssignments);

  // ── Dialog / form state ──────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const initVals = getInitialScheduleState();
  const [date, setDate] = useState(initVals.date);
  const [meetingType, setMeetingType] = useState<"online" | "offline">("online");
  const [classroomRoom, setClassroomRoom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // AM/PM time states
  const [startHour, setStartHour] = useState(initVals.startHour);
  const [startMinute, setStartMinute] = useState(initVals.startMinute);
  const [startPeriod, setStartPeriod] = useState(initVals.startPeriod);
  const [endHour, setEndHour] = useState(initVals.endHour);
  const [endMinute, setEndMinute] = useState(initVals.endMinute);
  const [endPeriod, setEndPeriod] = useState(initVals.endPeriod);

  // Optimistically prepend new class to immediate history list
  const [immediateHistory, setImmediateHistory] = useState<ScheduledClassRecord[]>([]);

  // ── Section 2: History dropdowns ─────────────────────────────────────────
  const historyDropdowns = useAssignmentDropdowns(rawAssignments);

  const filteredImmediateHistory = useMemo(() => {
    const assignment = historyDropdowns.currentAssignment;
    return immediateHistory.filter((cls) =>
      !assignment || (
        cls.subject === assignment.subject_name &&
        cls.branch_id === assignment.branch_id &&
        cls.semester_id === assignment.semester_id &&
        cls.section_id === assignment.section_id
      )
    );
  }, [immediateHistory, historyDropdowns.currentAssignment]);

  const [historyClasses, setHistoryClasses] = useState<ScheduledClassRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = new URLSearchParams();
      if (mainTab === "mentoring") {
        params.append('is_mentoring', 'true');
      } else {
        const assignment = historyDropdowns.currentAssignment;
        if (assignment) {
          if (assignment.subject_id) params.append('subject_id', assignment.subject_id.toString());
          if (assignment.branch_id) params.append('branch_id', assignment.branch_id.toString());
          if (assignment.semester_id) params.append('semester_id', assignment.semester_id.toString());
          if (assignment.section_id) params.append('section_id', assignment.section_id.toString());
        }
      }

      let url = `${API_ENDPOINT}/scheduled-classes/export_pdf/`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetchWithTokenRefresh(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export PDF");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      if (mainTab === "mentoring") {
        link.setAttribute('download', `Mentoring_History_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        const assignment = historyDropdowns.currentAssignment;
        const fileNameSuffix = assignment
          ? `${assignment.subject_name.replace(/\s+/g, '_')}_${assignment.branch.replace(/\s+/g, '_')}_Sem_${assignment.semester}_Sec_${assignment.section}`
          : 'All';
        link.setAttribute('download', `Class_History_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Success',
        description: 'Class history PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export class history PDF',
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // Backend now limits history to recent 5 classes.

  // ── Google Connection State ──────────────────────────────────────────────
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleConnectLoading, setGoogleConnectLoading] = useState(true);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);

  // Time calculation for UI limits
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = date === todayStr;
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  useEffect(() => {
    fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/status/`)
      .then(res => res.json())
      .then(data => {
        if (data.connected !== undefined) setGoogleConnected(data.connected);
      })
      .catch(err => console.error("Failed to fetch google status", err))
      .finally(() => setGoogleConnectLoading(false));
  }, []);

  const handleScheduleButtonClick = () => {
    // Sync current history selections to schedule dropdowns if they exist
    if (historyDropdowns.subjectId) {
      scheduleDropdowns.setSubjectId(historyDropdowns.subjectId);
      if (historyDropdowns.branchId) scheduleDropdowns.setBranchId(historyDropdowns.branchId);
      if (historyDropdowns.semesterId) scheduleDropdowns.setSemesterId(historyDropdowns.semesterId);
      if (historyDropdowns.sectionId) scheduleDropdowns.setSectionId(historyDropdowns.sectionId);
    }

    if (googleConnected === false) {
      setGoogleDialogOpen(true);
    } else {
      // Refresh with latest current time when form is opened
      const freshVals = getInitialScheduleState();
      setDate(freshVals.date);
      setStartHour(freshVals.startHour);
      setStartMinute(freshVals.startMinute);
      setStartPeriod(freshVals.startPeriod);
      setEndHour(freshVals.endHour);
      setEndMinute(freshVals.endMinute);
      setEndPeriod(freshVals.endPeriod);
      setDialogOpen(true);
    }
  };

  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
    scheduleDropdowns.reset();
    setTopic("");
    setDescription("");

    const freshVals = getInitialScheduleState();
    setDate(freshVals.date);
    setMeetingType("online");
    setClassroomRoom("");
    setStartHour(freshVals.startHour);
    setStartMinute(freshVals.startMinute);
    setStartPeriod(freshVals.startPeriod);
    setEndHour(freshVals.endHour);
    setEndMinute(freshVals.endMinute);
    setEndPeriod(freshVals.endPeriod);
  };

  // Main Tab State (Schedule Class vs Schedule Mentoring)
  const [mainTab, setMainTab] = useState<"class" | "mentoring">("class");

  // Mentoring Feedback Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedMentoringClass, setSelectedMentoringClass] = useState<any>(null);
  const [studentFeedbackList, setStudentFeedbackList] = useState<any[]>([]);
  const [generalFeedbackText, setGeneralFeedbackText] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [viewingStudentFeedback, setViewingStudentFeedback] = useState<any>(null);

  const handleStudentStatusChange = useCallback((idx: number, status: string) => {
    setStudentFeedbackList((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx], attendance_status: status };
      }
      return copy;
    });
  }, []);

  const handleStudentFeedbackChange = useCallback((idx: number, feedback: string) => {
    setStudentFeedbackList((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx], feedback };
      }
      return copy;
    });
  }, []);

  const openFeedbackModal = useCallback(async (cls: any) => {
    setSelectedMentoringClass(cls);
    setGeneralFeedbackText(cls.general_feedback || "");
    setStudentFeedbackList([]);
    setFeedbackModalOpen(true);
    setLoadingFeedback(true);
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/${cls.id}/student-feedback/`);
      const data = await resp.json();
      if (resp.ok && data.success) {
        setGeneralFeedbackText(data.general_feedback || "");
        setStudentFeedbackList(data.students || []);
      } else {
        toast({ title: "Error", description: data.error || "Failed to load student feedback list.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch student feedback.", variant: "destructive" });
    } finally {
      setLoadingFeedback(false);
    }
  }, [toast]);

  const handleExportMentoringCSV = async (cls: any) => {
    if (!cls?.id) return;
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/${cls.id}/export-feedback-csv/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Mentoring_Report_${cls.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to download mentoring CSV report from server.",
        variant: "destructive",
      });
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedMentoringClass) return;
    setSavingFeedback(true);
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/${selectedMentoringClass.id}/student-feedback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          general_feedback: generalFeedbackText,
          students: studentFeedbackList
        })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        toast({ title: "Success", description: "Feedback and student statuses updated successfully." });
        setFeedbackModalOpen(false);
      } else {
        toast({ title: "Error", description: data.error || "Failed to save feedback.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "An error occurred while saving feedback.", variant: "destructive" });
    } finally {
      setSavingFeedback(false);
    }
  };

  // Fetch history when history dropdown is fully selected or mainTab is mentoring
  useEffect(() => {
    if (mainTab === "class" && !historyDropdowns.isFullySelected) {
      setHistoryClasses([]);
      return;
    }
    const ctrl = new AbortController();
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const query = mainTab === "mentoring" ? "?is_mentoring=true" : "?is_mentoring=false";
        const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/${query}`, {
          signal: ctrl.signal,
        });
        const data = await resp.json();
        if (resp.ok && data?.success && data.data) {
          if (mainTab === "mentoring") {
            setHistoryClasses(data.data as ScheduledClassRecord[]);
          } else {
            const assignment = historyDropdowns.currentAssignment;
            const filtered: ScheduledClassRecord[] = (data.data as ScheduledClassRecord[])
              .filter((cls) => !assignment || (
                cls.subject === assignment.subject_name &&
                cls.branch_id === assignment.branch_id &&
                cls.semester_id === assignment.semester_id &&
                cls.section_id === assignment.section_id
              ));
            setHistoryClasses(filtered);
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setHistoryClasses([]);
        }
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => ctrl.abort();
  }, [
    mainTab,
    historyDropdowns.subjectId,
    historyDropdowns.branchId,
    historyDropdowns.semesterId,
    historyDropdowns.sectionId,
  ]);

  // Submit schedule class — POST only, prepend result to immediateHistory
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let startHr = parseInt(startHour, 10);
    if (startPeriod === "PM" && startHr < 12) startHr += 12;
    if (startPeriod === "AM" && startHr === 12) startHr = 0;
    const computedStartTime = `${String(startHr).padStart(2, "0")}:${startMinute}`;

    let endHr = parseInt(endHour, 10);
    if (endPeriod === "PM" && endHr < 12) endHr += 12;
    if (endPeriod === "AM" && endHr === 12) endHr = 0;
    const computedEndTime = `${String(endHr).padStart(2, "0")}:${endMinute}`;

    if (!topic || !date || !computedStartTime || !computedEndTime) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (meetingType === "offline" && !classroomRoom) {
      toast({ title: "Missing Field", description: "Please enter a classroom name for offline sessions.", variant: "destructive" });
      return;
    }

    const assignment = scheduleDropdowns.currentAssignment;
    if (mainTab === "class" && !assignment) {
      toast({ title: "Missing Assignment", description: "Please select subject, branch, semester, and section.", variant: "destructive" });
      return;
    }

    if (topic.trim().length > 200) {
      toast({ title: "Topic Too Long", description: "Topic/Agenda must be 200 characters or fewer.", variant: "destructive" });
      return;
    }

    // Date/Time validation
    const startDateTime = new Date(`${date}T${computedStartTime}`);
    const endDateTime = new Date(`${date}T${computedEndTime}`);
    const now = new Date();

    if (startDateTime < now) {
      toast({ title: "Invalid Time", description: "Session cannot be scheduled in the past.", variant: "destructive" });
      return;
    }
    if (endDateTime <= startDateTime) {
      toast({ title: "Invalid Time", description: "End time must be after start time.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        topic,
        description,
        date,
        start_time: computedStartTime,
        end_time: computedEndTime,
        meeting_type: meetingType,
        classroom_room: classroomRoom,
        is_mentoring: mainTab === "mentoring",
      };

      if (mainTab === "class" && assignment) {
        payload.subject_id = assignment.subject_id;
        payload.branch_id = assignment.branch_id;
        payload.semester_id = assignment.semester_id;
        payload.section_id = assignment.section_id;
      }

      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (resp.ok) {
        // Optimistically prepend new class to immediate history list
        const newRecord: ScheduledClassRecord = {
          id: data.id,
          subject: assignment?.subject_name || (mainTab === "mentoring" ? "Mentoring Session" : ""),
          subject_code: assignment?.subject_code || (mainTab === "mentoring" ? "MENTOR" : ""),
          branch_id: assignment?.branch_id || 0,
          semester_id: assignment?.semester_id || 0,
          section_id: assignment?.section_id || 0,
          faculty: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
          topic: data.topic || topic,
          description,
          date,
          start_time: computedStartTime,
          end_time: computedEndTime,
          meeting_type: meetingType,
          classroom_room: meetingType === "offline" ? classroomRoom : null,
          meeting_link: data.meeting_link || null,
          status: "scheduled",
          is_mentoring: mainTab === "mentoring",
        };
        setImmediateHistory((prev) => [newRecord, ...prev].slice(0, 5));
        if (mainTab === "mentoring") {
          setHistoryClasses((prev) => [newRecord, ...prev]);
        }

        Swal.fire({
          title: mainTab === "mentoring" ? "Mentoring Session Scheduled!" : "Class Scheduled!",
          text: mainTab === "mentoring"
            ? "Google Meet link generated. Proctor students notified!"
            : "Google Meet link generated. Students notified!",
          icon: "success",
          confirmButtonText: "Awesome",
          confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#000000',
          customClass: {
            popup: 'rounded-2xl border border-border shadow-2xl'
          }
        });

        handleDialogClose();
      } else {
        const msg = data?.error || data?.detail || "Failed to schedule class.";
        if (msg.includes("already scheduled") || msg.includes("during this time slot")) {
          Swal.fire({
            title: "Scheduling Conflict",
            text: msg,
            icon: "error",
            confirmButtonText: "Okay",
            confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
            background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000',
            customClass: {
              popup: 'rounded-2xl border border-border shadow-2xl'
            }
          });
        } else {
          setError(msg);
          toast({ title: "Scheduling Failed", description: msg, variant: "destructive" });
        }
      }
    } catch (err: any) {
      console.error("Scheduling error:", err);
      const errMsg = err?.message || "An error occurred while scheduling.";
      setError(errMsg);
      toast({ title: "Scheduling Error", description: errMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectorCardCls = `w-full ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"
    }`;

  return (
    <div className={`w-full space-y-6 ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>



      {/* ── Google Not Connected Dialog ──────────────────────────────────── */}
      <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GoogleLogo />
              Not Connected to Google
            </DialogTitle>
            <DialogDescription className="pt-2">
              You must connect your Google account to automatically generate Meet links for your online classes. Please connect your account to schedule a class.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              className={`w-full sm:w-auto font-medium shadow-sm transition-colors border ${theme === 'dark' ? 'bg-[#131314] hover:bg-[#1e1e20] text-[#e3e3e3] border-[#8e918f]' : 'bg-white hover:bg-[#f8f9fa] text-[#3c4043] border-[#747775]'}`}
              onClick={async () => {
                try {
                  const isNative = Capacitor.isNativePlatform();
                  const sourceQuery = isNative ? `?source=app&t=${Date.now()}` : `?t=${Date.now()}`;
                  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/connect/${sourceQuery}`);
                  const data = await res.json();
                  if (data.authorization_url) {
                    if (isNative) {
                      await Browser.open({ url: data.authorization_url });
                    } else {
                      window.location.href = data.authorization_url;
                    }
                  } else {
                    toast({ title: 'Error', description: 'Failed to initiate Google connection.', variant: 'destructive' });
                  }
                } catch (e) {
                  toast({ title: 'Error', description: 'An error occurred.', variant: 'destructive' });
                }
              }}
            >
              <GoogleLogo />
              Connect Google Account
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setGoogleDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Class / Mentoring Dialog Modal ───────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="w-[90%] max-h-[80vh] sm:max-w-[540px] overflow-y-auto custom-scrollbar rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              {mainTab === "mentoring" ? "Schedule Mentoring" : "Schedule Class"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {mainTab === "mentoring"
                ? "Schedule a dedicated proctor mentoring session with Google Meet for your assigned students."
                : "Fill in class details to schedule an online or in-person lecture."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Target Attendees / Class Assignment Dropdowns */}
            {mainTab === "mentoring" ? (
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">Target Attendees (Auto Selected)</p>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">My Proctor Students</p>
                </div>
                <span className="text-[10px] font-bold bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 px-2.5 py-1 rounded-full">
                  Proctor Agenda
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Class Assignment Details *</label>
                <DropdownGroup dropdowns={scheduleDropdowns} theme={theme} className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full" />
              </div>
            )}

            {/* Topic */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                  {mainTab === "mentoring" ? "Mentoring Session Topic / Agenda" : "Class Topic / Title"} <span className="text-destructive">*</span>
                </label>
                <span className={`text-[10px] font-medium ${
                  topic.length >= 190 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground"
                }`}>
                  {topic.length} / 200 characters
                </span>
              </div>
              <Input
                required
                type="text"
                maxLength={200}
                placeholder={mainTab === "mentoring" ? "e.g., Academic Progress & Career Mentoring Session" : "e.g., Introduction to Neural Networks"}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Max 200 characters limit.
              </p>
            </div>

            {/* Date + Times */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date <span className="text-destructive">*</span>
                </label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 px-3 relative pl-10",
                        !date && "text-muted-foreground",
                        theme === 'dark' ?
                          'bg-background border-border text-foreground hover:bg-muted/50' :
                          'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                      )}
                    >
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <span className="truncate text-xs">
                        {date ? format(new Date(`${date}T00:00:00`), "dd-MM-yyyy") : "dd-mm-yyyy"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={date ? new Date(`${date}T00:00:00`) : undefined}
                      onSelect={(d) => {
                        setDate(d ? format(d, "yyyy-MM-dd") : "");
                        setIsCalendarOpen(false);
                      }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Start Time <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <Select value={startHour} onValueChange={setStartHour}>
                    <SelectTrigger className="w-full h-10 px-2 text-xs">
                      <SelectValue placeholder="Hr" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-semibold text-xs">:</span>
                  <Select value={startMinute} onValueChange={setStartMinute}>
                    <SelectTrigger className="w-full h-10 px-2 text-xs">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={startPeriod} onValueChange={setStartPeriod}>
                    <SelectTrigger className="w-full h-10 px-2 text-xs">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> End Time <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <Select value={endHour} onValueChange={setEndHour}>
                    <SelectTrigger className="w-full h-10 px-2 text-xs">
                      <SelectValue placeholder="Hr" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-semibold text-xs">:</span>
                  <Select value={endMinute} onValueChange={setEndMinute}>
                    <SelectTrigger className="w-full h-10 px-2 text-xs">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={endPeriod} onValueChange={setEndPeriod}>
                    <SelectTrigger className="w-full h-10 px-2 text-xs">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Meeting Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Meeting Type</label>
              <div className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600">
                <Video className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="truncate">Online (Google Meet)</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
              <Textarea
                placeholder="Provide context, agenda notes, or pre-requisite instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-24 resize-none custom-scrollbar"
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/20 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:mr-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto min-w-[130px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Scheduling…
                  </>
                ) : (
                  mainTab === "mentoring" ? "Schedule Mentoring" : "Save & Schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Main Tab Navigation Bar ──────────────────────────────────────── */}
      <div className="w-full grid grid-cols-2 gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 border border-border/60 rounded-xl shadow-sm">
        <button
          type="button"
          onClick={() => setMainTab("class")}
          className={`w-full justify-center flex items-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
            mainTab === "class"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Schedule Class</span>
        </button>
        <button
          type="button"
          onClick={() => setMainTab("mentoring")}
          className={`w-full justify-center flex items-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
            mainTab === "mentoring"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Schedule Mentoring</span>
        </button>
      </div>

      {/* ── Section 2: Class / Mentoring History ──────────────────────────── */}
      <Card className={selectorCardCls}>
        <CardHeader id="schedule-class-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {mainTab === "mentoring" ? "Proctor Mentoring History" : "Class History"}
              </CardTitle>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                {mainTab === "mentoring"
                  ? "View and manage proctor mentoring sessions for your assigned students."
                  : "Select a subject to view scheduled classes history"}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 flex-nowrap">
              <Button
                onClick={handleScheduleButtonClick}
                className="bg-primary hover:bg-primary/90 text-white h-9 px-4 transition-all flex-1 sm:flex-initial text-sm"
              >
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                <span>{mainTab === "mentoring" ? "Schedule Mentoring" : "Schedule Class"}</span>
              </Button>
              {historyClasses.length > 0 && (
                <>
                  <Button
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    size="icon"
                    variant="outline"
                    className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-primary/40 text-primary hover:bg-primary/10 rounded-lg shadow-none"
                    title="Export PDF"
                  >
                    {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDownIcon className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all w-auto"
                  >
                    {exportingPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      "Export PDF"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {mainTab === "class" && <DropdownGroup dropdowns={historyDropdowns} theme={theme} />}

          {/* History list */}
          {(mainTab === "mentoring" || historyDropdowns.isFullySelected) && (
            <div className="mt-4 space-y-4">
              {filteredImmediateHistory.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      Just Scheduled This Session
                    </h3>
                  </div>
                  {filteredImmediateHistory.map((cls) => (
                    <ClassHistoryCard
                      key={`immediate-${cls.id}`}
                      cls={cls}
                      theme={theme}
                      currentTime={currentTime}
                      onViewFeedback={openFeedbackModal}
                      onExportCSV={handleExportMentoringCSV}
                    />
                  ))}
                </div>
              )}

              {historyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading session history…
                </div>
              ) : historyClasses.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Showing recent {historyClasses.length} session{historyClasses.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {historyClasses.map((cls) => (
                      <ClassHistoryCard
                        key={cls.id}
                        cls={cls}
                        theme={theme}
                        currentTime={currentTime}
                        onViewFeedback={openFeedbackModal}
                        onExportCSV={handleExportMentoringCSV}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {mainTab === "mentoring" ? "No scheduled proctor mentoring sessions found." : "No scheduled classes found for this section."}
                  </p>
                </div>
              )}
            </div>
          )}

          {mainTab === "class" && !historyDropdowns.isFullySelected && !historyLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm mt-6 ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}
            >
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-pulse ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <ClipboardList className="w-12 h-12" />
              </div>
              <h3 className={`text-xl md:text-xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Select a subject to view scheduled classes history
              </h3>
              <p className={`text-base md:text-md max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Select all four filters above to load class history
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* ── Mentoring Feedback View / Update Dialog ─────────────────────── */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="w-[90%] sm:max-w-[650px] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              Student Feedback & Attendance Status
            </DialogTitle>
            <DialogDescription>
              {selectedMentoringClass?.topic} ({selectedMentoringClass?.date})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">General Meeting Notes / Overall Feedback</label>
              <Textarea
                placeholder="Enter summary or action items for all proctor students..."
                value={generalFeedbackText}
                onChange={(e) => setGeneralFeedbackText(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Assigned Proctor Students {loadingFeedback ? "" : `(${studentFeedbackList.length})`}
                </h4>
                {loadingFeedback && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">Loading roster...</span>
                )}
              </div>
              {loadingFeedback ? (
                <div className="border rounded-xl divide-y max-h-[320px] overflow-hidden bg-background">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 space-y-2.5 animate-pulse">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-4 w-36 bg-muted rounded-md" />
                          <div className="h-3 w-24 bg-muted/60 rounded-md" />
                        </div>
                        <div className="h-7 w-[110px] bg-muted rounded-md shrink-0" />
                      </div>
                      <div className="h-8 w-full bg-muted/50 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : studentFeedbackList.length > 0 ? (
                <div className="border rounded-xl divide-y max-h-[320px] overflow-y-auto custom-scrollbar">
                  {studentFeedbackList.map((st, idx) => (
                    <StudentFeedbackRow
                      key={st.id || st.student_id || idx}
                      st={st}
                      idx={idx}
                      onStatusChange={handleStudentStatusChange}
                      onFeedbackChange={handleStudentFeedbackChange}
                      onViewFeedback={setViewingStudentFeedback}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">No assigned proctor students found for this session.</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
              onClick={() => selectedMentoringClass && handleExportMentoringCSV(selectedMentoringClass)}
            >
              <FileDownIcon className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={() => setFeedbackModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveFeedback} disabled={savingFeedback}>
                {savingFeedback ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Feedback
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Individual Student Feedback Details Modal ─────────────────── */}
      <Dialog open={!!viewingStudentFeedback} onOpenChange={(open) => { if (!open) setViewingStudentFeedback(null); }}>
        <DialogContent className="w-[90%] sm:max-w-[480px] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Eye className="w-4 h-4 text-primary" />
              Student Feedback Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingStudentFeedback?.student_name} ({viewingStudentFeedback?.usn})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <span className="text-muted-foreground font-medium">Attendance Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                viewingStudentFeedback?.attendance_status === 'attended'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : viewingStudentFeedback?.attendance_status === 'absent'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {viewingStudentFeedback?.attendance_status || 'Pending'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Submitted Student Feedback
              </label>
              <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar font-sans">
                "{viewingStudentFeedback?.feedback || "No feedback content provided."}"
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewingStudentFeedback(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleClass;
