import { useEffect, useState, useRef, useMemo } from "react";
import Swal from "sweetalert2";
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

  // When branch changes manually, clear downstream
  useEffect(() => {
    if (suppressBranchClear.current) { suppressBranchClear.current = false; return; }
    setSemesterId(null);
    setSectionId(null);
  }, [branchId]);

  useEffect(() => {
    if (suppressSemClear.current) { suppressSemClear.current = false; return; }
    setSectionId(null);
  }, [semesterId]);

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
}

const DropdownGroup = ({ dropdowns, theme, disabled }: DropdownGroupProps) => {
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
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-4 w-full">
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
        onValueChange={(v) => {
          setBranchId(Number(v));
          setTimeout(() => setIsSemesterOpen(true), 150);
        }}
        disabled={!subjectId || disabled}
        open={isBranchOpen}
        onOpenChange={setIsBranchOpen}
      >
        <SelectTrigger className={selectCls} disabled={!subjectId || disabled}>
          <SelectValue placeholder="Select Branch" />
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
        onValueChange={(v) => {
          setSemesterId(Number(v));
          setTimeout(() => setIsSectionOpen(true), 150);
        }}
        disabled={!branchId || semesters.length === 0 || disabled}
        open={isSemesterOpen}
        onOpenChange={setIsSemesterOpen}
      >
        <SelectTrigger className={selectCls} disabled={!branchId || semesters.length === 0 || disabled}>
          <SelectValue placeholder="Select Semester" />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          {semesters.map((s) => (
            <SelectItem key={s.id} value={s.id.toString()}>
              Sem {s.name}
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

const ClassHistoryCard = ({ cls, theme, currentTime = new Date() }: { cls: ScheduledClassRecord; theme: string; currentTime?: Date }) => {
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

      {cls.meeting_link && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <a
            href={cls.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-mono truncate max-w-full sm:max-w-[200px] md:max-w-xs break-all"
          >
            {cls.meeting_link}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          <div className="flex items-center gap-1.5 shrink-0 sm:self-auto self-end">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground"
              title="Copy Link"
              onClick={handleCopy}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground"
              title="Share Link"
              onClick={handleShare}
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  // ── Section 1: Schedule dropdowns ────────────────────────────────────────
  const scheduleDropdowns = useAssignmentDropdowns(rawAssignments);

  // ── Dialog / form state ──────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  
  const initVals = getInitialScheduleState();
  const [date, setDate] = useState(initVals.date);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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

  // Sync AM/PM states to 24h format strings for backend
  useEffect(() => {
    let hr = parseInt(startHour, 10);
    if (startPeriod === "PM" && hr < 12) hr += 12;
    if (startPeriod === "AM" && hr === 12) hr = 0;
    setStartTime(`${String(hr).padStart(2, "0")}:${startMinute}`);
  }, [startHour, startMinute, startPeriod]);

  useEffect(() => {
    let hr = parseInt(endHour, 10);
    if (endPeriod === "PM" && hr < 12) hr += 12;
    if (endPeriod === "AM" && hr === 12) hr = 0;
    setEndTime(`${String(hr).padStart(2, "0")}:${endMinute}`);
  }, [endHour, endMinute, endPeriod]);

  // Optimistic history (prepend from POST response, no GET after save)
  const [immediateHistory, setImmediateHistory] = useState<ScheduledClassRecord[]>([]);

  // ── Section 2: History dropdowns ─────────────────────────────────────────
  const historyDropdowns = useAssignmentDropdowns(rawAssignments);
  const [historyClasses, setHistoryClasses] = useState<ScheduledClassRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = new URLSearchParams();
      const assignment = historyDropdowns.currentAssignment;
      if (assignment) {
        if (assignment.subject_id) params.append('subject_id', assignment.subject_id.toString());
        if (assignment.branch_id) params.append('branch_id', assignment.branch_id.toString());
        if (assignment.semester_id) params.append('semester_id', assignment.semester_id.toString());
        if (assignment.section_id) params.append('section_id', assignment.section_id.toString());
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
      
      const fileNameSuffix = assignment 
        ? `${assignment.subject_name.replace(/\s+/g, '_')}_${assignment.branch.replace(/\s+/g, '_')}_Sem_${assignment.semester}_Sec_${assignment.section}` 
        : 'All';
      link.setAttribute('download', `Class_History_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
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

  // Pagination States for History
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const HISTORY_ITEMS_PER_PAGE = 5;

  // Reset history page to 1 when filters change
  useEffect(() => {
    setCurrentHistoryPage(1);
  }, [
    historyDropdowns.subjectId,
    historyDropdowns.branchId,
    historyDropdowns.semesterId,
    historyDropdowns.sectionId,
  ]);

  const totalHistoryPages = Math.ceil(historyClasses.length / HISTORY_ITEMS_PER_PAGE);

  const paginatedHistoryClasses = useMemo(() => {
    const startIndex = (currentHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE;
    return historyClasses.slice(startIndex, startIndex + HISTORY_ITEMS_PER_PAGE);
  }, [historyClasses, currentHistoryPage]);

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

  // Open dialog when scheduleDropdowns is fully selected
  useEffect(() => {
    if (scheduleDropdowns.isFullySelected) {
      if (googleConnected === false) {
        setGoogleDialogOpen(true);
        scheduleDropdowns.reset();
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
    }
  }, [scheduleDropdowns.isFullySelected, googleConnected]);

  // Close dialog resets the schedule dropdowns
  const handleDialogClose = () => {
    setDialogOpen(false);
    scheduleDropdowns.reset();
    setTopic("");
    setDescription("");
    
    const freshVals = getInitialScheduleState();
    setDate(freshVals.date);
    setStartTime("");
    setEndTime("");
    setMeetingType("online");
    setClassroomRoom("");
    setStartHour(freshVals.startHour);
    setStartMinute(freshVals.startMinute);
    setStartPeriod(freshVals.startPeriod);
    setEndHour(freshVals.endHour);
    setEndMinute(freshVals.endMinute);
    setEndPeriod(freshVals.endPeriod);
  };

  // Fetch history when history dropdown is fully selected
  useEffect(() => {
    if (!historyDropdowns.isFullySelected) {
      setHistoryClasses([]);
      return;
    }
    const ctrl = new AbortController();
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/`, {
          signal: ctrl.signal,
        });
        const data = await resp.json();
        if (resp.ok && data?.success && data.data) {
          // Filter to the selected section
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
    historyDropdowns.subjectId,
    historyDropdowns.branchId,
    historyDropdowns.semesterId,
    historyDropdowns.sectionId,
  ]);

  // Submit schedule class — POST only, prepend result to immediateHistory
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !date || !startTime || !endTime) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (meetingType === "offline" && !classroomRoom) {
      toast({ title: "Missing Field", description: "Please enter a classroom name for offline sessions.", variant: "destructive" });
      return;
    }
    const assignment = scheduleDropdowns.currentAssignment;
    if (!assignment) return;

    // Date/Time validation
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    const now = new Date();

    if (startDateTime < now) {
      toast({ title: "Invalid Time", description: "Class cannot be scheduled in the past.", variant: "destructive" });
      return;
    }
    if (endDateTime <= startDateTime) {
      toast({ title: "Invalid Time", description: "End time must be after start time.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/scheduled-classes/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: assignment.subject_id,
          branch_id: assignment.branch_id,
          semester_id: assignment.semester_id,
          section_id: assignment.section_id,
          topic,
          description,
          date,
          start_time: startTime,
          end_time: endTime,
          meeting_type: meetingType,
          classroom_room: classroomRoom,
        }),
      });

      const data = await resp.json();

      if (resp.ok) {
        // Optimistically prepend new class to immediate history list
        const newRecord: ScheduledClassRecord = {
          id: data.id,
          subject: assignment.subject_name,
          subject_code: assignment.subject_code || "",
          branch_id: assignment.branch_id,
          semester_id: assignment.semester_id,
          section_id: assignment.section_id,
          faculty: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
          topic: data.topic,
          description,
          date,
          start_time: startTime,
          end_time: endTime,
          meeting_type: meetingType,
          classroom_room: meetingType === "offline" ? classroomRoom : null,
          meeting_link: data.meeting_link || null,
          status: "scheduled",
        };
        setImmediateHistory((prev) => [newRecord, ...prev].slice(0, 5));

        Swal.fire({
          title: "Class Scheduled!",
          text: "Google Meet link generated. Students notified!",
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
        const msg = data.error || "Failed to schedule class.";
        setError(msg);
        toast({ title: "Scheduling Failed", description: msg, variant: "destructive" });
      }
    } catch {
      setError("A network error occurred. Please try again.");
      toast({ title: "Network Error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectorCardCls = `w-full ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"
    }`;

  return (
    <div className={`w-full space-y-6 ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>

      {/* ── Section 1: Schedule a New Class ─────────────────────────────── */}
      <Card className={selectorCardCls}>
        <CardHeader id="schedule-class-header" className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl" >Schedule a New Class</CardTitle>
              <CardDescription className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>
                Select a subject assignment to open the scheduling form
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {assignmentsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your assignments…
            </div>
          ) : (
            <DropdownGroup dropdowns={scheduleDropdowns} theme={theme} />
          )}

          {!assignmentsLoading && scheduleDropdowns.subjects.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center py-4">
              No subject assignments found. Contact your administrator.
            </p>
          )}

          {!scheduleDropdowns.isFullySelected && scheduleDropdowns.subjectId && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Complete all four selections above to open the scheduling form.
            </p>
          )}

          {/* Optimistic immediately-added history (from this session's saves) */}
          {immediateHistory.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Just Scheduled This Session
                </h3>
              </div>
              <div className="space-y-2">
                {immediateHistory.map((cls) => (
                  <ClassHistoryCard key={`immediate-${cls.id}`} cls={cls} theme={theme} currentTime={currentTime} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/connect/`);
                  const data = await res.json();
                  if (data.authorization_url) {
                    window.location.href = data.authorization_url;
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

      {/* ── Schedule Class Dialog Modal ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="max-w-[90%] sm:max-w-[540px] max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              Schedule Class
            </DialogTitle>
            {scheduleDropdowns.currentAssignment && (
              <DialogDescription>
                <span className="font-medium text-foreground">
                  {scheduleDropdowns.currentAssignment.subject_name}
                </span>
                {" "}·{" "}
                {scheduleDropdowns.currentAssignment.branch} · Sem{" "}
                {scheduleDropdowns.currentAssignment.semester} ·{" "}
                {scheduleDropdowns.currentAssignment.section}
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Class Topic / Title <span className="text-destructive">*</span>
              </label>
              <Input
                required
                type="text"
                placeholder="e.g., Introduction to Neural Networks"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
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
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <span className="truncate text-xs">
                        {date ? format(new Date(date), "dd-MM-yyyy") : "dd-mm-yyyy"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={date ? new Date(date) : undefined}
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
                placeholder="Provide context, lecture notes, or pre-requisite reading..."
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
                  "Save & Schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Section 2: Class History ─────────────────────────────────────── */}
      <Card className={selectorCardCls}>
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted bg-primary/10">
                <ClipboardList className="w-5 h-5 text-muted-foreground text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">Class History</CardTitle>
                <CardDescription className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>
                  Select a subject to view scheduled classes history
                </CardDescription>
              </div>
            </div>
            {historyClasses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all w-full sm:w-auto self-start sm:self-auto"
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
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <DropdownGroup dropdowns={historyDropdowns} theme={theme} />

          {/* History list */}
          {historyDropdowns.isFullySelected && (
            <div className="mt-4">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading class history…
                </div>
              ) : historyClasses.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Showing {((currentHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE) + 1} - {Math.min(currentHistoryPage * HISTORY_ITEMS_PER_PAGE, historyClasses.length)} of {historyClasses.length} scheduled class{historyClasses.length !== 1 ? "es" : ""}
                  </p>
                  <div className="space-y-2">
                    {paginatedHistoryClasses.map((cls) => (
                      <ClassHistoryCard key={cls.id} cls={cls} theme={theme} currentTime={currentTime} />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {historyClasses.length > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border mt-4">
                      <div>
                        Showing {Math.min((currentHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE + 1, historyClasses.length)} to {Math.min(currentHistoryPage * HISTORY_ITEMS_PER_PAGE, historyClasses.length)} of {historyClasses.length} classes
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentHistoryPage(Math.max(1, currentHistoryPage - 1))}
                          disabled={currentHistoryPage === 1}
                          className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                        >
                          Previous
                        </Button>

                        <div className="flex items-center justify-center min-w-[2rem]">
                          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            {currentHistoryPage}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentHistoryPage(Math.min(totalHistoryPages, currentHistoryPage + 1))}
                          disabled={currentHistoryPage === totalHistoryPages || totalHistoryPages <= 1}
                          className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No scheduled classes found for this section.</p>
                  <p className="text-xs text-muted-foreground/70">
                    Use the "Schedule a New Class" section above to create one.
                  </p>
                </div>
              )}
            </div>
          )}

          {!historyDropdowns.isFullySelected && !historyLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <ClipboardList className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                Select all four filters above to load class history.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleClass;
