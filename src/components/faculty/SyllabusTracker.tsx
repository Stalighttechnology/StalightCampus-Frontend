import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useFacultyAssignmentsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { getSyllabusStatus, updateSyllabusProgress, exportSyllabusPdf , getBatches } from "@/utils/faculty_api";
import { BookOpen, CheckCircle, Clock, Save, Loader2, FileDown, Star, ChevronDown, ChevronUp, Calendar, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import { showConfirmAlert } from "../../utils/sweetalert";

const SURVEY_QUESTIONS = [
  { id: "Q1", text: "How clearly were the Course Outcomes (COs) and course syllabus communicated to you at the start of the semester?" },
  { id: "Q2", text: "To what extent did the course delivery cover the entire prescribed syllabus in a structured and timely manner?" },
  { id: "Q3", text: "How would you rate the instructor's effectiveness in explaining complex concepts and ensuring conceptual clarity?" },
  { id: "Q4", text: "How effectively did the instructor encourage interactive discussion, critical questioning, and classroom engagement?" },
  { id: "Q5", text: "Rate the relevance, quality, and accessibility of the study materials, references, and digital resources provided." },
  { id: "Q6", text: "How well did the internal assessments (IA tests, assignments) evaluate your actual understanding of the course?" },
  { id: "Q7", text: "How effectively did laboratory sessions, projects, or case studies assist in applying theoretical concepts to practical scenarios?" },
  { id: "Q8", text: "To what extent is the course content relevant to contemporary industry trends, placement preparation, and future applications?" },
  { id: "Q9", text: "How effectively did this course enhance your engineering problem-solving, analytical thinking, and design capabilities?" },
  { id: "Q10", text: "Overall, rate the learning value, academic growth, and professional benefit you gained from this course." },
];

const SyllabusTracker = () => {
  const formatDateToDDMMYYYY = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const trimmed = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split("-");
        return `${day}-${month}-${year}`;
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      const dateObj = new Date(trimmed);
      if (isNaN(dateObj.getTime())) return dateStr;
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const parseDateString = (str: string | null | undefined): Date | undefined => {
    if (!str) return undefined;
    try {
      const trimmed = str.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      return undefined;
    }
  };

  const DAY_OPTIONS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 7, label: "Sunday" }
  ];

  const getDayInfoFromDate = (date: Date) => {
    const jsDay = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayNum = jsDay === 0 ? 7 : jsDay;
    const opt = DAY_OPTIONS.find((o) => o.value === dayNum);
    return {
      day: dayNum,
      day_name: opt?.label || `Day ${dayNum}`
    };
  };

  const sortDailyLogs = (logs: any[]): any[] => {
    if (!Array.isArray(logs)) return [];
    return [...logs].sort((a, b) => {
      const parsedA = parseDateString(a?.date);
      const parsedB = parseDateString(b?.date);
      const dateA = parsedA ? parsedA.getTime() : 0;
      const dateB = parsedB ? parsedB.getTime() : 0;

      if (dateA && dateB) {
        if (dateA !== dateB) return dateA - dateB;
      } else if (dateA && !dateB) {
        return -1;
      } else if (!dateA && dateB) {
        return 1;
      }

      const dayA = typeof a?.day === 'number' ? a.day : Number(a?.day) || 99;
      const dayB = typeof b?.day === 'number' ? b.day : Number(b?.day) || 99;
      return dayA - dayB;
    });
  };

  const { toast } = useToast();
  const { data: assignments = [], isLoading: assignmentsLoading } = useFacultyAssignmentsQuery();
  const { theme } = useTheme();

  // Normalize assignment IDs to numbers
  const normalizedAssignments = useMemo(() => assignments.map((a) => ({
    ...a,
    subject_id: a.subject_id ? Number(a.subject_id) : null,
    branch_id: a.branch_id ? Number(a.branch_id) : null,
    semester_id: a.semester_id ? Number(a.semester_id) : null,
    section_id: a.section_id ? Number(a.section_id) : null
  })), [assignments]);

  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  
  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [savingProgress, setSavingProgress] = useState<number | null>(null);
  const [selectedSurveySubject, setSelectedSurveySubject] = useState<any | null>(null);

  // Local state for progress edits & day-wise expandable state
  const [progressEdits, setProgressEdits] = useState<{[weekNum: number]: { topics_covered: string; notes: string; is_completed: boolean; daily_logs: any[] } }>({});
  const [expandedWeeks, setExpandedWeeks] = useState<{ [weekNum: number]: boolean }>({});

  const toggleWeekExpanded = (weekNum: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (!subjectId) return;
    setExportingPDF(true);
    try {
      const matchingAssignment = normalizedAssignments.find(a => a.subject_id === subjectId && a.semester_id === semesterId);
      
      const blob = await exportSyllabusPdf({
        subject_id: subjectId.toString(),
        branch_id: matchingAssignment?.branch_id?.toString() || "",
        semester_id: semesterId?.toString() || "",
        section_id: isElective ? "" : (sectionId?.toString() || ""),
        batch_id: batchId?.toString() || ""
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileNameSuffix = isElective 
        ? `${selectedSubject?.name.replace(/\s+/g, '_')}_Elective` 
        : `${selectedSubject?.name.replace(/\s+/g, '_')}_Sem_${semesterId}_Sec_${sectionId}`;
      link.setAttribute('download', `Syllabus_Progress_${fileNameSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Syllabus progress PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export syllabus progress PDF',
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // Load batches on mount — no auto-select
  useEffect(() => {
    getBatches().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setBatches(res.data);
      }
    });
  }, []);

  // When batch changes, reset all dependent filters and auto-open branch
  useEffect(() => {
    if (!batchId) return;
    setBranchId(null);
    setSemesterId(null);
    setSubjectId(null);
    setSectionId(null);
    setSyllabusData(null);
    setIsBranchOpen(true);
  }, [batchId]);

  // 0. Branches (Unique list from assignments)
  const branches = useMemo(() => {
    const list = normalizedAssignments.map(a => ({ id: a.branch_id, name: a.branch }));
    return Array.from(new Map(list.filter(b => b.id).map(b => [b.id, b])).values()).sort((a,b) => (a.name || "").localeCompare(b.name || ""));
  }, [normalizedAssignments]);

  // 1. Semesters (Filtered by chosen Branch)
  const semesters = useMemo(() => {
    if (!branchId) return [];
    const list = normalizedAssignments.filter(a => a.branch_id === branchId).map(a => ({ id: a.semester_id, number: a.semester }));
    return Array.from(new Map(list.filter(s => s.id).map(s => [s.id, s])).values()).sort((a,b) => (a.number || 0) - (b.number || 0));
  }, [branchId, normalizedAssignments]);

  // 2. Subjects (Filtered by chosen Semester & Branch)
  const subjects = useMemo(() => {
    if (!branchId || !semesterId) return [];
    const filtered = normalizedAssignments.filter(a => a.branch_id === branchId && a.semester_id === semesterId);
    const list = filtered.map(a => ({
      id: a.subject_id,
      name: a.subject_name,
      code: a.subject_code,
      type: a.subject_type || "regular"
    }));
    return Array.from(new Map(list.filter(s => s.id).map(s => [s.id, s])).values());
  }, [branchId, semesterId, normalizedAssignments]);

  // 3. Sections (Filtered by chosen Semester & Subject)
  const sections = useMemo(() => {
    if (!branchId || !semesterId || !subjectId) return [];
    const filtered = normalizedAssignments.filter(a => a.branch_id === branchId && a.semester_id === semesterId && a.subject_id === subjectId);
    const list = filtered.map(a => ({ id: a.section_id, name: a.section }));
    return Array.from(new Map(list.filter(s => s.id).map(s => [s.id, s])).values());
  }, [branchId, semesterId, subjectId, normalizedAssignments]);

  // Determine if chosen subject is elective
  const selectedSubject = useMemo(() => subjects.find(s => s.id === subjectId), [subjectId, subjects]);
  const isElective = useMemo(() => selectedSubject?.type === "elective" || selectedSubject?.type === "open_elective", [selectedSubject]);

  // Reset cascade
  useEffect(() => {
    setSemesterId(null);
    setSubjectId(null);
    setSectionId(null);
    if (branchId && semesters.length > 0) {
      setIsSemesterOpen(true);
    }
  }, [branchId]);

  useEffect(() => {
    setSubjectId(null);
    setSectionId(null);
    if (semesterId && subjects.length > 0) {
      setIsSubjectOpen(true);
    }
  }, [semesterId]);

  useEffect(() => {
    setSectionId(null);
    if (subjectId && sections.length > 0 && !isElective) {
      setIsSectionOpen(true);
    }
  }, [subjectId, isElective]);

  // Fetch Syllabus status
  const fetchSyllabus = async () => {
    const hasRequiredFilters = (isElective ? !!subjectId : (!!subjectId && !!sectionId)) && !!batchId;
    if (!hasRequiredFilters) {
      setSyllabusData(null);
      return;
    }
    setLoadingSyllabus(true);
    try {
      // Find branch_id from assignments to send
      const matchingAssignment = normalizedAssignments.find(a => a.subject_id === subjectId && a.semester_id === semesterId);
      const res = await getSyllabusStatus({
        subject_id: subjectId!.toString(),
        branch_id: matchingAssignment?.branch_id?.toString() || "",
        semester_id: semesterId?.toString() || "",
        section_id: isElective ? "" : (sectionId?.toString() || ""),
        batch_id: batchId?.toString() || ""
      });
      if (res.success && res.data) {
        setSyllabusData(res.data);
        
        // Populate progress edits with daily_logs support
        const edits: any = {};
        res.data.weeks.forEach((w: any) => {
          edits[w.week] = {
            topics_covered: w.topics_covered || "",
            notes: w.notes || "",
            is_completed: w.is_completed || false,
            daily_logs: Array.isArray(w.daily_logs) ? sortDailyLogs(w.daily_logs) : []
          };
        });
        setProgressEdits(edits);
      } else {
        toast({ title: "Error", description: res.message || "Failed to load syllabus details", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch syllabus data", variant: "destructive" });
    } finally {
      setLoadingSyllabus(false);
    }
  };

  useEffect(() => {
    fetchSyllabus();
  }, [semesterId, subjectId, sectionId, isElective, batchId]);

    const [savingDayKey, setSavingDayKey] = useState<string | null>(null);

  // Save individual week progress
  const handleSaveProgress = async (weekNum: number, currentCompleted: boolean) => {
    if (!subjectId) return;
    setSavingProgress(weekNum);
    const edit = progressEdits[weekNum];
    const sortedLogs = sortDailyLogs(edit.daily_logs || []);
    try {
      const matchingAssignment = normalizedAssignments.find(a => a.subject_id === subjectId && a.semester_id === semesterId);
      const res = await updateSyllabusProgress({
        subject_id: subjectId.toString(),
        branch_id: isElective ? undefined : matchingAssignment?.branch_id?.toString(),
        semester_id: isElective ? undefined : semesterId?.toString(),
        section_id: isElective ? undefined : sectionId?.toString(),
        batch_id: batchId!.toString(),
        week_number: weekNum,
        is_completed: currentCompleted,
        topics_covered: edit.topics_covered,
        notes: edit.notes,
        daily_logs: sortedLogs
      });
      if (res.success) {
        toast({ title: "Success", description: `Week ${weekNum} progress saved!` });
        fetchSyllabus();
      } else {
        toast({ title: "Error", description: res.message || "Failed to save progress", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to save progress", variant: "destructive" });
    } finally {
      setSavingProgress(null);
    }
  };

  // Dedicated Save for an Individual Day Log
  const handleSaveDayProgress = async (weekNum: number, dayIdx: number) => {
    if (!subjectId) return;
    const saveKey = `${weekNum}-${dayIdx}`;
    setSavingDayKey(saveKey);
    const edit = progressEdits[weekNum];
    const sortedLogs = sortDailyLogs(edit.daily_logs || []);
    const targetDay = sortedLogs[dayIdx];
    const dayName = targetDay?.day_name || (DAY_OPTIONS.find(d => d.value === targetDay?.day)?.label || `Day ${targetDay?.day || dayIdx + 1}`);

    try {
      const matchingAssignment = normalizedAssignments.find(a => a.subject_id === subjectId && a.semester_id === semesterId);
      const res = await updateSyllabusProgress({
        subject_id: subjectId.toString(),
        branch_id: isElective ? undefined : matchingAssignment?.branch_id?.toString(),
        semester_id: isElective ? undefined : semesterId?.toString(),
        section_id: isElective ? undefined : sectionId?.toString(),
        batch_id: batchId!.toString(),
        week_number: weekNum,
        is_completed: edit.is_completed ?? false,
        topics_covered: edit.topics_covered || "",
        notes: edit.notes || "",
        daily_logs: sortedLogs
      });

      if (res.success) {
        toast({
          title: "Day Log Saved",
          description: `${dayName} log for Week ${weekNum} saved successfully!`
        });
        fetchSyllabus();
      } else {
        toast({ title: "Error", description: res.message || "Failed to save day log", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to save day log", variant: "destructive" });
    } finally {
      setSavingDayKey(null);
    }
  };

  // Delete Day Log with confirmation dialog and direct backend persistence
  const handleDeleteDayLog = async (weekNum: number, dayIdx: number) => {
    if (!subjectId) return;
    const edit = progressEdits[weekNum];
    const currentSortedLogs = sortDailyLogs(edit?.daily_logs || []);
    const targetDay = currentSortedLogs[dayIdx];
    const dayName = targetDay?.day_name || (DAY_OPTIONS.find(d => d.value === targetDay?.day)?.label || `Day ${targetDay?.day || dayIdx + 1}`);

    const confirmResult = await showConfirmAlert(
      `Delete Day Log?`,
      `Are you sure you want to delete the lecture log for ${dayName} (Week ${weekNum})?`,
      `Yes, delete`
    );

    if (!confirmResult.isConfirmed) return;

    const updated = currentSortedLogs.filter((_: any, i: number) => i !== dayIdx);
    const finalSorted = sortDailyLogs(updated);
    
    // Update local state immediately for instant UI feedback
    setProgressEdits({
      ...progressEdits,
      [weekNum]: { ...edit, daily_logs: finalSorted }
    });

    try {
      const matchingAssignment = normalizedAssignments.find(a => a.subject_id === subjectId && a.semester_id === semesterId);
      const res = await updateSyllabusProgress({
        subject_id: subjectId.toString(),
        branch_id: isElective ? undefined : matchingAssignment?.branch_id?.toString(),
        semester_id: isElective ? undefined : semesterId?.toString(),
        section_id: isElective ? undefined : sectionId?.toString(),
        batch_id: batchId!.toString(),
        week_number: weekNum,
        is_completed: edit.is_completed ?? false,
        topics_covered: edit.topics_covered || "",
        notes: edit.notes || "",
        daily_logs: finalSorted
      });

      if (res.success) {
        toast({
          title: "Day Log Deleted",
          description: `${dayName} lecture log for Week ${weekNum} has been deleted.`
        });
        fetchSyllabus();
      } else {
        toast({ title: "Error", description: res.message || "Failed to delete day log", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete day log from server", variant: "destructive" });
    }
  };

  // Toggle completion with confirmation dialog
  const handleToggleCompletion = async (weekNum: number, currentCompleted: boolean) => {
    if (!subjectId) return;
    const actionText = currentCompleted ? "incomplete" : "completed";
    const confirmResult = await showConfirmAlert(
      `Mark as ${actionText}?`,
      `Are you sure you want to mark Week ${weekNum} as ${actionText}?`,
      `Yes, mark as ${actionText}`
    );

    if (!confirmResult.isConfirmed) return;

    try {
      const matchingAssignment = normalizedAssignments.find(a => a.subject_id === subjectId && a.semester_id === semesterId);
      const edit = progressEdits[weekNum] || { topics_covered: "", notes: "", daily_logs: [] };
      const res = await updateSyllabusProgress({
        subject_id: subjectId.toString(),
        branch_id: isElective ? undefined : matchingAssignment?.branch_id?.toString(),
        semester_id: isElective ? undefined : semesterId?.toString(),
        section_id: isElective ? undefined : sectionId?.toString(),
        batch_id: batchId?.toString() || "",
        week_number: weekNum,
        is_completed: !currentCompleted,
        topics_covered: edit.topics_covered,
        notes: edit.notes,
        daily_logs: edit.daily_logs || []
      });

      if (res.success) {
        toast({ title: "Success", description: `Week ${weekNum} marked as ${actionText}!` });
        fetchSyllabus();
      } else {
        toast({ title: "Error", description: res.message || "Failed to update completion status", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update completion status", variant: "destructive" });
    }
  };

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card id="faculty-syllabus-tracker-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader id="faculty-syllabus-tracker-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex flex-row justify-between items-center w-full gap-4">
              <h1 className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Syllabus Tracing & Progress
              </h1>
              {syllabusData && (
                <div className="flex gap-2 shrink-0 items-center">
                  {/* Mobile View Export PDF Icon Button */}
                  <Button
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    size="icon"
                    variant="outline"
                    className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                  >
                    {exportingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Desktop / Tablet View Export PDF Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    className="hidden sm:flex bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all w-auto items-center justify-center gap-2 text-sm"
                  >
                    {exportingPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      "Export PDF"
                    )}
                  </Button>
                </div>
              )}
            </div>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Track weekly teaching progress based on department master templates.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 pt-0 space-y-6">
          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">Batch</label>
              <Select value={batchId?.toString() || ""} onValueChange={(v) => setBatchId(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">{translateTerminology("Branch")}</label>
              <Select value={branchId?.toString() || ""} onValueChange={(v) => setBranchId(Number(v))} disabled={!batchId} open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!batchId ? "Select Batch first" : translateTerminology("Select Branch")} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">{translateTerminology("Semester")}</label>
              <Select
                value={semesterId?.toString() || ""}
                onValueChange={(v) => setSemesterId(Number(v))}
                disabled={!branchId}
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!branchId ? "Select Branch first" : `Select ${translateTerminology('Semester')}`} />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{`${translateTerminology('Semester')} ${s.number}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">Subject</label>
              <Select value={subjectId?.toString() || ""} onValueChange={(v) => setSubjectId(Number(v))} disabled={!semesterId} open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!semesterId ? "Select Semester first" : "Select Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase opacity-80">Section</label>
              <Select value={sectionId?.toString() || ""} onValueChange={(v) => setSectionId(Number(v))} disabled={!subjectId || isElective} open={isSectionOpen} onOpenChange={setIsSectionOpen}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isElective ? "N/A (Elective Subject)" : (!subjectId ? "Select Subject first" : "Select Section")} />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>Section {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loader or Content */}
          {loadingSyllabus ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="flex-1 space-y-4 w-full">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11 pt-2">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : syllabusData ? (
            <div className="space-y-6">
              {/* Progress Summary Card & Survey Stats Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`lg:col-span-2 p-6 rounded-xl border flex flex-col justify-between gap-4 ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Overall Syllabus Coverage</span>
                      <span className="text-primary">{syllabusData.progress_percentage}% Completed</span>
                    </div>
                    {/* Glowing Premium Progress Bar */}
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-500 relative"
                        style={{ width: `${syllabusData.progress_percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-xs opacity-75">
                      {syllabusData.completed_weeks} of {syllabusData.total_weeks} weeks covered.
                    </p>
                  </div>
                </div>

                {syllabusData.survey_stats && syllabusData.survey_stats.total_responses > 0 ? (
                  <div className={`p-6 rounded-xl border flex flex-col justify-between gap-4 ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Course Exit Survey</span>
                        <span className="text-xs text-muted-foreground">{syllabusData.survey_stats.total_responses} responses</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Star className="w-8 h-8 text-yellow-500 fill-current" />
                        <span className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400">
                          {syllabusData.survey_stats.average_rating}
                        </span>
                        <span className="text-sm text-muted-foreground">/ 5.0 Rating</span>
                      </div>
                      <Button
                        onClick={() => setSelectedSurveySubject(syllabusData)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 h-8 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
                      >
                        View Question Breakdown
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 rounded-xl border flex flex-col justify-center items-center gap-2 text-center text-muted-foreground ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-100'}`}>
                    <Star className="w-6 h-6 text-muted-foreground/30" />
                    <span className="text-sm font-medium">No Exit Surveys Collected</span>
                  </div>
                )}
              </div>

              {/* Weeks Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Week-by-Week Syllabus Tracking
                </h3>

                <div className="space-y-4">
                  {isElective && (
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-200 text-sm">
                      <strong>Elective Subject Tracing:</strong> Progress is updated directly on the elective course. Sections are grouped under this single offering.
                    </div>
                  )}

                  {syllabusData.weeks.map((w: any) => {
                    const edit = progressEdits[w.week] || { topics_covered: "", notes: "", is_completed: false, daily_logs: [] };
                    const isExpanded = !!expandedWeeks[w.week];
                    const plannedDays = Array.isArray(w.days) ? w.days : [];
                    const dailyLogs = Array.isArray(edit.daily_logs) ? sortDailyLogs(edit.daily_logs) : [];
                    const completedDaysCount = dailyLogs.filter((d: any) => d.is_completed).length;
                    const totalDaysCount = plannedDays.length > 0 ? plannedDays.length : dailyLogs.length;

                    return (
                      <div
                        key={w.week}
                        className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-4 ${
                          edit.is_completed
                            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Top Row: Week Header & Covered Meta + Action Buttons */}
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-2 border-b border-border/40">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                                edit.is_completed ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {w.week}
                              </span>
                              <div>
                                <h4 className="font-semibold text-base flex items-center gap-2 flex-wrap">
                                  Week {w.week}
                                  {edit.is_completed && (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                                      <CheckCircle className="w-3.5 h-3.5" /> Completed
                                    </span>
                                  )}
                                  {totalDaysCount > 0 && (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                                      {completedDaysCount}/{totalDaysCount} Days Logged
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                  <strong>Expected Plan:</strong> {w.expected_topics || <span className="italic opacity-60">Not planned by HOD yet</span>}
                                </p>
                              </div>
                            </div>

                            {/* Right-aligned Meta and Action Buttons Bar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full lg:w-auto self-stretch lg:self-auto justify-between lg:justify-end">
                              {w.completed_date && (
                                <div className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/50 shrink-0">
                                  Covered: <span className="font-semibold text-foreground">{formatDateToDDMMYYYY(w.completed_date)}</span> &bull; By: <span className="font-semibold text-foreground">{w.faculty_name}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs font-medium h-8 border border-input text-foreground hover:bg-accent flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                                  onClick={() => toggleWeekExpanded(w.week)}
                                >
                                  <Calendar className="w-3.5 h-3.5 text-primary" />
                                  <span>{isExpanded ? "Hide Day Breakdown" : "Day Breakdown"}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>

                                <Button
                                  size="sm"
                                  variant={w.is_completed ? "outline" : "outline"}
                                  className={`text-xs font-semibold h-8 flex-1 sm:flex-none transition-all active:scale-95 ${
                                    w.is_completed
                                      ? 'text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                                      : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                  }`}
                                  onClick={() => handleToggleCompletion(w.week, w.is_completed)}
                                >
                                  {w.is_completed ? "Mark as Incomplete" : "Mark as Completed"}
                                </Button>

                                <Button
                                  size="sm"
                                  className="text-xs h-8 px-3 font-semibold flex-1 sm:flex-none transition-all active:scale-95"
                                  onClick={() => handleSaveProgress(w.week, w.is_completed)}
                                  disabled={savingProgress === w.week}
                                >
                                  {savingProgress === w.week ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Accordion Inputs for Progress Tracking */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold opacity-70">Actual Topics Covered (Week Summary)</label>
                              <Input
                                placeholder="e.g. Completed ER Model basics, started SQL queries"
                                value={edit.topics_covered}
                                onChange={(e) => {
                                  setProgressEdits({
                                    ...progressEdits,
                                    [w.week]: { ...edit, topics_covered: e.target.value }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold opacity-70">Remarks / Notes</label>
                              <Input
                                placeholder="e.g. Conducted extra session; students need reinforcement"
                                value={edit.notes}
                                onChange={(e) => {
                                  setProgressEdits({
                                    ...progressEdits,
                                    [w.week]: { ...edit, notes: e.target.value }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expandable Day-Wise Teaching Log Section */}
                        {isExpanded && (
                          <div className="mt-2 pt-4 border-t border-dashed space-y-3 bg-muted/20 p-4 rounded-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h5 className="text-sm font-semibold flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-primary" />
                                  Day-Wise Lecture & Progress Log
                                </h5>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Track daily lectures, topics covered on specific dates, and verify syllabus completion day by day.
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto h-8 text-xs gap-1.5 shadow-xs bg-background hover:bg-muted justify-center"
                                onClick={() => {
                                  const currentLogs = [...dailyLogs];
                                  const today = new Date();
                                  const year = today.getFullYear();
                                  const month = String(today.getMonth() + 1).padStart(2, '0');
                                  const day = String(today.getDate()).padStart(2, '0');
                                  const todayDateStr = `${year}-${month}-${day}`;
                                  const dayInfo = getDayInfoFromDate(today);

                                  // If there is an unlogged plannedDay, prioritize matching planned day or default to today's day
                                  const unloggedPlanned = plannedDays.find((pd: any) => !currentLogs.some((l: any) => l.day === pd.day));
                                  const chosenDayNum = unloggedPlanned ? unloggedPlanned.day : dayInfo.day;
                                  const chosenDayName = DAY_OPTIONS.find((o) => o.value === chosenDayNum)?.label || dayInfo.day_name;
                                  const matchedPlan = plannedDays.find((pd: any) => pd.day === chosenDayNum);

                                  currentLogs.push({
                                    day: chosenDayNum,
                                    day_name: chosenDayName,
                                    topic_covered: matchedPlan ? matchedPlan.topic : "",
                                    date: todayDateStr,
                                    is_completed: true,
                                    notes: ""
                                  });
                                  setProgressEdits({
                                    ...progressEdits,
                                    [w.week]: { ...edit, daily_logs: sortDailyLogs(currentLogs) }
                                  });
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Day Session
                              </Button>
                            </div>

                            {/* Render list of days (combining planned template & daily logs) */}
                            {plannedDays.length > 0 && dailyLogs.length === 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-primary">Department Master Plan for Week {w.week}:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {plannedDays.map((pd: any) => {
                                    const opt = DAY_OPTIONS.find(o => o.value === pd.day);
                                    const dayTitle = pd.day_name || opt?.label || `Day ${pd.day}`;
                                    return (
                                      <div key={pd.day} className="p-2.5 rounded-lg border bg-background text-xs space-y-1">
                                        <div className="font-semibold text-foreground">{dayTitle}: {pd.topic}</div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 text-[11px] w-full mt-1 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                                          onClick={() => {
                                            const today = new Date();
                                            const y = today.getFullYear();
                                            const m = String(today.getMonth() + 1).padStart(2, '0');
                                            const d = String(today.getDate()).padStart(2, '0');
                                            const todayStr = `${y}-${m}-${d}`;

                                            const newLogs = plannedDays.map((p: any) => {
                                              const dOpt = DAY_OPTIONS.find(o => o.value === p.day);
                                              return {
                                                day: p.day,
                                                day_name: p.day_name || dOpt?.label || `Day ${p.day}`,
                                                topic_covered: p.topic,
                                                date: todayStr,
                                                is_completed: p.day === pd.day,
                                                notes: ""
                                              };
                                            });
                                            setProgressEdits({
                                              ...progressEdits,
                                              [w.week]: { ...edit, daily_logs: sortDailyLogs(newLogs) }
                                            });
                                          }}
                                        >
                                          Start Logging This Plan
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {dailyLogs.length > 0 && (
                              <div className="space-y-3">
                                {dailyLogs.map((log: any, idx: number) => {
                                  const plannedForDay = plannedDays.find((pd: any) => pd.day === log.day);
                                  const logDate = parseDateString(log.date);
                                  const saveKey = `${w.week}-${idx}`;
                                  const isSavingThisDay = savingDayKey === saveKey;

                                  return (
                                    <div
                                      key={idx}
                                      className={`p-3.5 rounded-xl border flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between transition-all ${
                                        log.is_completed ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card border-border shadow-sm"
                                      }`}
                                    >
                                      {/* Top Row on mobile / Left column on desktop: Completion Checkbox & Day Name Select */}
                                      <div className="flex items-center justify-between lg:justify-start gap-2.5 shrink-0">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={!!log.is_completed}
                                            onChange={(e) => {
                                              const updated = [...dailyLogs];
                                              updated[idx] = { ...log, is_completed: e.target.checked };
                                              setProgressEdits({
                                                ...progressEdits,
                                                [w.week]: { ...edit, daily_logs: updated }
                                              });
                                            }}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                                          />
                                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted/70 text-foreground border border-border/70 min-w-22 text-center shrink-0">
                                            {log.day_name || (log.date ? getDayInfoFromDate(parseDateString(log.date))?.day_name : `Day ${idx + 1}`)}
                                          </span>
                                        </div>

                                        {/* Status Badge */}
                                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full lg:hidden ${
                                          log.is_completed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                        }`}>
                                          {log.is_completed ? "Completed" : "Pending"}
                                        </span>
                                      </div>

                                      {/* Topic Taught & Date Picker using Shadcn Popover + Calendar */}
                                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 w-full">
                                        {/* Topic Input */}
                                        <div className="sm:col-span-8 space-y-1">
                                          <Input
                                            className="h-8 text-xs bg-background"
                                            placeholder={plannedForDay ? `Planned: ${plannedForDay.topic}` : "Topic taught on this day..."}
                                            value={log.topic_covered}
                                            onChange={(e) => {
                                              const updated = [...dailyLogs];
                                              updated[idx] = { ...log, topic_covered: e.target.value };
                                              setProgressEdits({
                                                ...progressEdits,
                                                [w.week]: { ...edit, daily_logs: updated }
                                              });
                                            }}
                                          />
                                        </div>

                                        {/* Shadcn Popover & Calendar Date Picker */}
                                        <div className="sm:col-span-4 space-y-1">
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className={`h-8 w-full justify-start text-left font-normal text-xs bg-background ${
                                                  !log.date ? "text-muted-foreground" : "text-foreground font-medium"
                                                }`}
                                              >
                                                <Calendar className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
                                                {log.date ? formatDateToDDMMYYYY(log.date) : <span>Select Date</span>}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-50" align="start">
                                              <CalendarComponent
                                                mode="single"
                                                selected={logDate}
                                                onSelect={(selectedDate) => {
                                                  if (selectedDate) {
                                                    const year = selectedDate.getFullYear();
                                                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                                    const day = String(selectedDate.getDate()).padStart(2, '0');
                                                    const dateStr = `${year}-${month}-${day}`;
                                                    const dayInfo = getDayInfoFromDate(selectedDate);
                                                    const matchedPlan = plannedDays.find((pd: any) => pd.day === dayInfo.day);

                                                    const updated = [...dailyLogs];
                                                    updated[idx] = {
                                                      ...log,
                                                      date: dateStr,
                                                      day: dayInfo.day,
                                                      day_name: dayInfo.day_name,
                                                      topic_covered: log.topic_covered || (matchedPlan ? matchedPlan.topic : "")
                                                    };
                                                    setProgressEdits({
                                                      ...progressEdits,
                                                      [w.week]: { ...edit, daily_logs: sortDailyLogs(updated) }
                                                    });
                                                  }
                                                }}
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>

                                      {/* Individual Day Save Action & Delete buttons */}
                                      <div className="flex items-center justify-end gap-2 shrink-0 pt-1 lg:pt-0">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 px-3 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1.5 shadow-2xs"
                                          onClick={() => handleSaveDayProgress(w.week, idx)}
                                          disabled={isSavingThisDay}
                                        >
                                          {isSavingThisDay ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Save className="w-3.5 h-3.5" />
                                          )}
                                          <span>Save Day</span>
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                          title="Delete day log"
                                          onClick={() => handleDeleteDayLog(w.week, idx)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {plannedDays.length === 0 && dailyLogs.length === 0 && (
                              <p className="text-xs text-muted-foreground italic text-center py-2">
                                No day-wise logs recorded yet. Click "Add Day Session" to log daily lecture progress.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-pulse ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <BookOpen className="w-12 h-12" />
              </div>
              <h3 className={`text-xl md:text-xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                No Syllabus Traced Yet
              </h3>
              <p className={`text-base md:text-md max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Please select the Semester, Subject, and Section to load the weekly syllabus tracing workflow.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey Analytics Dialog */}
      {selectedSurveySubject && selectedSurveySubject.survey_stats && (
        <Dialog open={!!selectedSurveySubject} onOpenChange={(open) => { if (!open) setSelectedSurveySubject(null); }}>
          <DialogContent className={`w-[95vw] sm:max-w-3xl overflow-y-auto max-h-[90vh] p-4 sm:p-6 rounded-2xl ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
            <DialogHeader className="border-b pb-4 pr-6">
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <Star className="w-5 h-5 fill-current text-yellow-500" />
                Course Exit Survey Analytics
              </DialogTitle>
              <DialogDescription className="text-sm">
                Detailed ratings breakdown for <strong>{selectedSurveySubject.subject_name}</strong> based on {selectedSurveySubject.survey_stats.total_responses} student responses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4 overflow-y-auto max-h-[60vh] pr-1">
              <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 mb-2">
                <span className="font-semibold text-sm">Overall Average Rating</span>
                <div className="flex items-center gap-1.5 font-bold text-lg text-yellow-600 dark:text-yellow-400">
                  <Star className="w-5 h-5 fill-current" />
                  {selectedSurveySubject.survey_stats.average_rating} / 5.0
                </div>
              </div>

              <div className="space-y-4">
                {SURVEY_QUESTIONS.map((q, idx) => {
                  const rating = selectedSurveySubject.survey_stats.question_averages[q.id] || 0.0;
                  const percentage = (rating / 5) * 100;
                  return (
                    <div key={q.id} className={`p-4 rounded-xl border space-y-2.5 transition-all duration-300 ${theme === 'dark' ? 'bg-muted/5 border-border' : 'bg-gray-50/30 border-gray-100'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-0.5 text-left">
                          <span className="text-xs font-semibold text-primary uppercase">Question {idx + 1}</span>
                          <p className="text-sm font-medium leading-relaxed">{q.text}</p>
                        </div>
                        <span className="text-sm font-bold shrink-0 text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {rating.toFixed(2)}
                        </span>
                      </div>
                      {/* Rating Progress Visualizer */}
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button onClick={() => setSelectedSurveySubject(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SyllabusTracker;
