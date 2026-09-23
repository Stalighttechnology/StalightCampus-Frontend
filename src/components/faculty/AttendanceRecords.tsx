import { translateTerminology, getInstitutionType } from "@/utils/institutionConfig";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Loader2,
  Calendar as CalendarIcon,
  Search,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  BookOpen,
  UserCheck,
  X,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Filter,
  ClipboardList,
  AlertTriangle,
  BarChart2,
  PieChart as PieChartIcon,
  LineChart,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  ArrowUpRight,
  Download,
  CalendarDays,
  History
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getFacultyAttendanceFilters,
  getAttendanceRecordsWithSummary,
  getAttendanceRecordDetails,
  updateAttendanceRecord,
  FacultyAttendanceFiltersResponse
} from "@/utils/faculty_api";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { usePagination } from "@/hooks/useOptimizations";
import { useFacultyAssignmentsQuery } from "@/hooks/useApiQueries";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AttendanceRecordItem {
  id: number;
  date: string;
  subject: string | null;
  subject_id: number | null;
  subject_code?: string | null;
  section: string | null;
  section_id: number | null;
  semester: number | null;
  semester_id: number | null;
  branch: string | null;
  branch_id: number | null;
  batch?: string | null;
  batch_id?: number | null;
  file_path: string | null;
  status: string;
  lab_batch_id?: number | null;
  lab_batch_name?: string | null;
  summary: {
    present_count: number;
    absent_count: number;
    total_count: number;
    present_percentage: number;
  };
}

interface StudentDetailItem {
  id: number;
  name: string;
  usn: string;
  status: boolean;
  subject_percentage?: number;
  subject_present?: number;
  subject_total?: number;
  subject_absent?: number;
}

interface ConsolidatedRecordItem {
  key: string;
  subject: string;
  subject_id: number | null;
  subject_code?: string | null;
  section: string | null;
  section_id: number | null;
  sections?: string[];
  semester: number | null;
  semester_id: number | null;
  branch: string | null;
  branch_id: number | null;
  batch?: string | null;
  batch_id?: number | null;
  batches?: string[];
  lab_batch_name?: string | null;
  total_sessions: number;
  dates: string[];
  first_date: string;
  last_date: string;
  total_present: number;
  total_absent: number;
  total_student_calls: number;
  avg_attendance_pct: number;
  latest_record_id: number;
  record_ids: number[];
  records: AttendanceRecordItem[];
  status: string;
}

interface SessionDateColumn {
  record_id: number;
  date: string;
  formattedDate: string;
  displayShort: string;
  dayOfWeek: string;
  section?: string | null;
  present_count?: number;
  absent_count?: number;
  total_count?: number;
  turnout_percentage?: number;
}

interface ConsolidatedStudentItem {
  id: number;
  name: string;
  usn: string;
  classes_held: number;
  classes_attended: number;
  classes_absent: number;
  attendance_percentage: number;
  session_status: Record<number, "present" | "absent" | "not_recorded">;
}

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRelativeDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthStartString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const getSemesterStartString = (): string => {
  const d = new Date();
  const currentMonth = d.getMonth(); // 0 = Jan, 6 = July
  const startMonth = currentMonth >= 6 ? "07" : "01";
  return `${d.getFullYear()}-${startMonth}-01`;
};

const AttendanceRecords = () => {
  const { theme } = useTheme();
  const { toast } = useToast();

  const pagination = usePagination({
    queryKey: ['facultyAttendanceRecords'],
    pageSize: 20,
  });

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Faculty Assignments (strictly assigned to this faculty, identical to Take Attendance)
  const { data: rawAssignments = [] } = useFacultyAssignmentsQuery();

  // Filter Metadata (strictly assigned to this faculty)
  const [filterMeta, setFilterMeta] = useState<FacultyAttendanceFiltersResponse["data"] | null>(null);
  const [allFilterMeta, setAllFilterMeta] = useState<FacultyAttendanceFiltersResponse["data"] | null>(null);
  const [loadingBatchSubjects, setLoadingBatchSubjects] = useState<boolean>(false);

  // Records & Summary State
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [kpiStats, setKpiStats] = useState<{
    total_sessions: number;
    total_present: number;
    total_absent: number;
    avg_attendance: number;
  }>({
    total_sessions: 0,
    total_present: 0,
    total_absent: 0,
    avg_attendance: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Details Modal State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordItem | null>(null);
  const [presentList, setPresentList] = useState<StudentDetailItem[]>([]);
  const [absentList, setAbsentList] = useState<StudentDetailItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);

  // Consolidated Selected State
  const [selectedConsolidatedRecord, setSelectedConsolidatedRecord] = useState<ConsolidatedRecordItem | null>(null);
  const [consolidatedStudents, setConsolidatedStudents] = useState<ConsolidatedStudentItem[]>([]);
  const [consolidatedSessions, setConsolidatedSessions] = useState<SessionDateColumn[]>([]);
  const [consolidatedViewMode, setConsolidatedViewMode] = useState<"students" | "session_inspector">("students");
  const [selectedInspectorSessionId, setSelectedInspectorSessionId] = useState<number | null>(null);
  const [selectedStudentForTimeline, setSelectedStudentForTimeline] = useState<ConsolidatedStudentItem | null>(null);
  const [studentTimelineModalOpen, setStudentTimelineModalOpen] = useState(false);
  const [sessionRostersMap, setSessionRostersMap] = useState<Record<number, { present: StudentDetailItem[]; absent: StudentDetailItem[] }>>({});
  const [loadingSessionRoster, setLoadingSessionRoster] = useState(false);
  const [togglingSessionId, setTogglingSessionId] = useState<number | null>(null);

  // Consolidated Modal Pagination State
  const [consolidatedPage, setConsolidatedPage] = useState(1);
  const [consolidatedPageSize, setConsolidatedPageSize] = useState(25);

  // Reset modal pagination on search query or record change
  useEffect(() => {
    setConsolidatedPage(1);
  }, [modalSearch, selectedConsolidatedRecord, consolidatedPageSize]);

  // Filtered & Paginated Consolidated Students
  const filteredConsolidatedStudents = useMemo(() => {
    const q = modalSearch.toLowerCase().trim();
    if (!q) return consolidatedStudents;
    return consolidatedStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.usn && s.usn.toLowerCase().includes(q))
    );
  }, [consolidatedStudents, modalSearch]);

  const totalConsolidatedPages = Math.max(1, Math.ceil(filteredConsolidatedStudents.length / consolidatedPageSize));

  const paginatedConsolidatedStudents = useMemo(() => {
    const start = (consolidatedPage - 1) * consolidatedPageSize;
    return filteredConsolidatedStudents.slice(start, start + consolidatedPageSize);
  }, [filteredConsolidatedStudents, consolidatedPage, consolidatedPageSize]);

  // Lazy-load student attendance roster on-demand when selecting a specific class date
  const loadSessionRoster = useCallback(async (recordId: number) => {
    setSelectedInspectorSessionId(recordId);
    if (sessionRostersMap[recordId]) {
      return; // Already cached in memory
    }
    setLoadingSessionRoster(true);
    try {
      const res = await getAttendanceRecordDetails(recordId);
      if (res.success && res.data) {
        setSessionRostersMap(prev => ({
          ...prev,
          [recordId]: {
            present: res.data.present || [],
            absent: res.data.absent || []
          }
        }));
      }
    } catch (err: any) {
      console.error("Failed to load roster for session " + recordId, err);
    } finally {
      setLoadingSessionRoster(false);
    }
  }, [sessionRostersMap]);

  // Format Date Helper (DD-MM-YYYY)
  const formatDateToDDMMYYYY = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "--";
    try {
      const trimmed = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split("-");
        return `${day}-${month}-${year}`;
      }
      const dateObj = new Date(trimmed);
      if (isNaN(dateObj.getTime())) return dateStr;
      return format(dateObj, "dd-MM-yyyy");
    } catch {
      return dateStr;
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      pagination.goToPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 1. Fetch Filter Metadata & Batch-Specific Subjects via Network Call
  useEffect(() => {
    let isMounted = true;
    const fetchFilters = async () => {
      setLoadingBatchSubjects(Boolean(selectedBatch));
      try {
        const res = await getFacultyAttendanceFilters(selectedBatch || undefined);
        if (isMounted && res.success && res.data) {
          setFilterMeta(res.data);
          if (!allFilterMeta) {
            setAllFilterMeta(res.data);
          }
        }
      } catch (err) {
        console.error("Failed to load faculty attendance filters", err);
      } finally {
        if (isMounted) setLoadingBatchSubjects(false);
      }
    };
    fetchFilters();
    return () => {
      isMounted = false;
    };
  }, [selectedBatch]);

  // Available Batches for Faculty (preserved from full faculty metadata)
  const availableBatches = useMemo(() => {
    const map = new Map<string, { id: number | string; name: string }>();

    const batchesSource = allFilterMeta?.batches || filterMeta?.batches;
    if (batchesSource && Array.isArray(batchesSource)) {
      batchesSource.forEach((b: any) => {
        if (b.name) {
          const key = String(b.id || b.name);
          map.set(key, { id: b.id || b.name, name: b.name });
        }
      });
    }

    // Also ensure any batch present in loaded records is selectable
    records.forEach((r) => {
      if (r.batch) {
        const key = r.batch_id ? String(r.batch_id) : r.batch;
        if (!map.has(key)) {
          map.set(key, { id: r.batch_id || r.batch, name: r.batch });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.name.localeCompare(a.name));
  }, [allFilterMeta, filterMeta, records]);

  // Assigned Subjects combining direct assignments & recorded history (cascaded by selectedBatch if applicable)
  const availableAssignedSubjects = useMemo(() => {
    const map = new Map<string, { id: number; name: string; subject_code?: string; batch_ids?: (string | number)[] }>();

    // 1. From faculty assignments query (identical to Take Attendance options)
    if (Array.isArray(rawAssignments) && rawAssignments.length > 0) {
      rawAssignments.forEach((a: any) => {
        const id = Number(a.subject_id || a.subject?.id || a.id);
        const name = a.subject_name || a.subject?.name || a.name;
        const code = a.subject_code || a.subject?.subject_code;
        const bId = a.batch_id || a.batch?.id;
        if (id && name) {
          const existing = map.get(String(id));
          const batchIds = existing?.batch_ids || [];
          if (bId && !batchIds.includes(bId)) batchIds.push(bId);
          map.set(String(id), { id, name, subject_code: code || undefined, batch_ids: batchIds });
        }
      });
    }

    // 2. From filter metadata (historical recorded subjects + assignments)
    if (filterMeta?.subjects && Array.isArray(filterMeta.subjects)) {
      filterMeta.subjects.forEach((s) => {
        if (s.id && !map.has(String(s.id))) {
          map.set(String(s.id), { id: s.id, name: s.name, subject_code: s.subject_code || undefined });
        }
      });
    }

    // 3. Track subjects present in historical records for specific batches
    records.forEach((r) => {
      if (r.subject_id) {
        const key = String(r.subject_id);
        const existing = map.get(key);
        if (existing) {
          if (r.batch_id && !existing.batch_ids?.includes(r.batch_id)) {
            existing.batch_ids = [...(existing.batch_ids || []), r.batch_id];
          }
        } else if (r.subject) {
          map.set(key, {
            id: r.subject_id,
            name: r.subject,
            subject_code: r.subject_code || undefined,
            batch_ids: r.batch_id ? [r.batch_id] : []
          });
        }
      }
    });

    const allSubjects = Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // If batch is selected, prioritize backend filtered subjects from the network call
    if (selectedBatch && selectedBatch !== "all") {
      // If filterMeta has subjects from the batch network call, use them
      if (filterMeta?.subjects && filterMeta.subjects.length > 0) {
        const batchSubjectIds = new Set(filterMeta.subjects.map(s => String(s.id)));
        const matching = allSubjects.filter(sub => batchSubjectIds.has(String(sub.id)));
        if (matching.length > 0) return matching;
      }
      const batchFiltered = allSubjects.filter(sub => {
        if (!sub.batch_ids || sub.batch_ids.length === 0) return true;
        return sub.batch_ids.some(b => String(b) === String(selectedBatch));
      });
      return batchFiltered.length > 0 ? batchFiltered : allSubjects;
    }

    return allSubjects;
  }, [rawAssignments, filterMeta, records, selectedBatch]);

  // Analytics & Graph View State
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<"subject_bars" | "timeline" | "distribution">("subject_bars");

  // Real Subject-Wise Performance Analytics
  const subjectAnalytics = useMemo(() => {
    const subjectMap = new Map<string, {
      subject_id: number | null;
      subject_name: string;
      subject_code?: string;
      sessions: number;
      present: number;
      absent: number;
      total: number;
      percentage: number;
    }>();

    // 1. Initialize from available assigned subjects
    availableAssignedSubjects.forEach((sub) => {
      subjectMap.set(String(sub.id), {
        subject_id: sub.id,
        subject_name: sub.name,
        subject_code: sub.subject_code,
        sessions: 0,
        present: 0,
        absent: 0,
        total: 0,
        percentage: 0
      });
    });

    // 2. Aggregate counts from loaded records
    records.forEach((r) => {
      const key = r.subject_id ? String(r.subject_id) : (r.subject || "Unknown");
      const current = subjectMap.get(key) || {
        subject_id: r.subject_id,
        subject_name: r.subject || "Unknown",
        subject_code: r.subject_code || undefined,
        sessions: 0,
        present: 0,
        absent: 0,
        total: 0,
        percentage: 0
      };

      current.sessions += 1;
      current.present += (r.summary?.present_count || 0);
      current.absent += (r.summary?.absent_count || 0);
      current.total += (r.summary?.total_count || 0);
      subjectMap.set(key, current);
    });

    return Array.from(subjectMap.values())
      .map((s) => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
        shortName: s.subject_name.length > 18 ? s.subject_name.slice(0, 16) + '…' : s.subject_name
      }))
      .sort((a, b) => (b.sessions - a.sessions || (a.subject_name || "").localeCompare(b.subject_name || "")));
  }, [records, availableAssignedSubjects]);

  // Real Timeline / Date-wise Analytics
  const timelineAnalytics = useMemo(() => {
    if (!records.length) return [];
    
    const dateMap = new Map<string, { date: string; displayDate: string; present: number; absent: number; total: number; percentage: number; sessions: number }>();

    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((r) => {
      const dateKey = r.date;
      const current = dateMap.get(dateKey) || {
        date: dateKey,
        displayDate: formatDateToDDMMYYYY(dateKey),
        present: 0,
        absent: 0,
        total: 0,
        percentage: 0,
        sessions: 0
      };

      current.sessions += 1;
      current.present += (r.summary?.present_count || 0);
      current.absent += (r.summary?.absent_count || 0);
      current.total += (r.summary?.total_count || 0);
      dateMap.set(dateKey, current);
    });

    return Array.from(dateMap.values()).map((d) => ({
      ...d,
      percentage: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
    }));
  }, [records]);

  // Real Present vs Absent Donut Data
  const donutData = useMemo(() => {
    const present = kpiStats.total_present || 0;
    const absent = kpiStats.total_absent || 0;
    if (present === 0 && absent === 0) {
      return [{ name: "No Data", value: 1, color: "#94a3b8" }];
    }
    return [
      { name: "Present", value: present, color: "#10b981" },
      { name: "Absent", value: absent, color: "#f43f5e" }
    ];
  }, [kpiStats]);

  // Consolidated Grouped Attendance Records (Grouped by Subject, Semester, Branch, Lab Batch)
  const consolidatedRecords = useMemo<ConsolidatedRecordItem[]>(() => {
    const map = new Map<string, ConsolidatedRecordItem>();

    records.forEach((r) => {
      const subKey = r.subject_id ? String(r.subject_id) : (r.subject || "Unknown");
      const semKey = r.semester_id ? String(r.semester_id) : (r.semester || "NoSem");
      const brKey = r.branch_id ? String(r.branch_id) : (r.branch || "NoBr");
      const labKey = r.lab_batch_id ? String(r.lab_batch_id) : (r.lab_batch_name || "NoLab");
      const key = `${subKey}_${semKey}_${brKey}_${labKey}`;

      const present = r.summary?.present_count || 0;
      const absent = r.summary?.absent_count || 0;
      const totalCalls = present + absent;
      const batchVal = (r.batch || "").trim();
      const secVal = (r.section || "").trim();

      if (!map.has(key)) {
        map.set(key, {
          key,
          subject: r.subject || "Unknown",
          subject_id: r.subject_id,
          subject_code: r.subject_code,
          section: secVal || null,
          section_id: r.section_id,
          sections: secVal ? [secVal] : [],
          semester: r.semester,
          semester_id: r.semester_id,
          branch: r.branch,
          branch_id: r.branch_id,
          batch: batchVal || "--",
          batch_id: r.batch_id,
          batches: batchVal ? [batchVal] : [],
          lab_batch_name: r.lab_batch_name,
          total_sessions: 1,
          dates: [r.date],
          first_date: r.date,
          last_date: r.date,
          total_present: present,
          total_absent: absent,
          total_student_calls: totalCalls,
          avg_attendance_pct: totalCalls > 0 ? Math.round((present / totalCalls) * 1000) / 10 : 0,
          latest_record_id: r.id,
          record_ids: [r.id],
          records: [r],
          status: r.status
        });
      } else {
        const item = map.get(key)!;
        item.total_sessions += 1;
        item.dates.push(r.date);

        // Merge batches
        if (batchVal && !item.batches?.includes(batchVal)) {
          item.batches = item.batches ? [...item.batches, batchVal] : [batchVal];
          item.batch = item.batches.join(", ");
        }

        // Merge sections
        if (secVal && !item.sections?.includes(secVal)) {
          item.sections = item.sections ? [...item.sections, secVal] : [secVal];
          item.section = item.sections.join(", ");
        } else if (!item.section && secVal) {
          item.section = secVal;
        }

        if (new Date(r.date) < new Date(item.first_date)) {
          item.first_date = r.date;
        }
        if (new Date(r.date) > new Date(item.last_date)) {
          item.last_date = r.date;
          item.latest_record_id = r.id;
        }
        item.total_present += present;
        item.total_absent += absent;
        item.total_student_calls += totalCalls;
        item.avg_attendance_pct = item.total_student_calls > 0
          ? Math.round((item.total_present / item.total_student_calls) * 1000) / 10
          : 0;
        item.record_ids.push(r.id);
        item.records.push(r);
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.last_date).getTime() - new Date(a.last_date).getTime());
  }, [records]);

  // Handle Filter Changes
  const handleSubjectChange = (val: string) => {
    const newSub = val === "all" ? "" : val;
    setSelectedSubject(newSub);
    if (!newSub) {
      setStartDate("");
      setEndDate("");
    }
    pagination.goToPage(1);
  };

  const handleBatchChange = (val: string) => {
    const newBatch = val === "all" ? "" : val;
    setSelectedBatch(newBatch);
    if (!newBatch) {
      setSelectedSubject("");
      setStartDate("");
      setEndDate("");
    }
    pagination.goToPage(1);
  };

  const handleResetFilters = () => {
    setSelectedBatch("");
    setSelectedSubject("");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setDebouncedSearch("");
    pagination.goToPage(1);
  };

  // Active Preset Calculation
  const activePreset = useMemo(() => {
    if (!startDate && !endDate) return "all";
    const today = getTodayString();
    const yest = getRelativeDateString(1);
    if (startDate === today && endDate === today) return "today";
    if (startDate === yest && endDate === yest) return "yesterday";
    if (startDate === getRelativeDateString(7) && endDate === today) return "week";
    if (startDate === getRelativeDateString(30) && endDate === today) return "30days";
    if (startDate === getMonthStartString() && endDate === today) return "month";
    if (startDate === getSemesterStartString() && endDate === today) return "semester";
    return "custom";
  }, [startDate, endDate]);

  // Calendar DateRange binding
  const selectedDateRange = useMemo<DateRange | undefined>(() => {
    if (!startDate) return undefined;
    const from = new Date(startDate + "T00:00:00");
    const to = endDate ? new Date(endDate + "T00:00:00") : from;
    return { from, to };
  }, [startDate, endDate]);

  const handleCalendarSelect = (range: DateRange | undefined) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (range?.from) {
      const fromDate = range.from > today ? today : range.from;
      const toDate = range.to ? (range.to > today ? today : range.to) : fromDate;

      const fromStr = format(fromDate, "yyyy-MM-dd");
      const toStr = format(toDate, "yyyy-MM-dd");
      setStartDate(fromStr);
      setEndDate(toStr);
    } else {
      setStartDate("");
      setEndDate("");
    }
    pagination.goToPage(1);
  };

  // Date Presets
  const applyDatePreset = (preset: "semester" | "30days" | "today" | "yesterday" | "week" | "month" | "all") => {
    if (preset === "semester") {
      setStartDate(getSemesterStartString());
      setEndDate(getTodayString());
    } else if (preset === "month") {
      setStartDate(getMonthStartString());
      setEndDate(getTodayString());
    } else if (preset === "30days") {
      setStartDate(getRelativeDateString(30));
      setEndDate(getTodayString());
    } else if (preset === "week") {
      setStartDate(getRelativeDateString(7));
      setEndDate(getTodayString());
    } else if (preset === "today") {
      const today = getTodayString();
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "yesterday") {
      const yest = getRelativeDateString(1);
      setStartDate(yest);
      setEndDate(yest);
    } else {
      setStartDate("");
      setEndDate("");
    }
    pagination.goToPage(1);
  };

  // Fetch Attendance Records (Strictly requires Batch + Subject + Date Range)
  const fetchRecords = useCallback(async () => {
    if (!selectedBatch || !selectedSubject || !startDate || !endDate) {
      setRecords([]);
      setKpiStats({ total_sessions: 0, total_present: 0, total_absent: 0, avg_attendance: 0 });
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await getAttendanceRecordsWithSummary({
        page: pagination.page,
        page_size: pagination.pageSize,
        subject_id: selectedSubject,
        batch_id: selectedBatch,
        start_date: startDate,
        end_date: endDate,
        search: debouncedSearch.trim() || undefined
      });

      if (res.success && res.data) {
        setRecords(res.data);
        pagination.updatePagination(res);
        if ((res as any).kpis) {
          setKpiStats((res as any).kpis);
        } else if (filterMeta?.overall) {
          setKpiStats({
            total_sessions: filterMeta.overall.total_sessions || res.data.length,
            total_present: filterMeta.overall.total_present || 0,
            total_absent: filterMeta.overall.total_absent || 0,
            avg_attendance: filterMeta.overall.avg_attendance || 0
          });
        }
      } else {
        setError(res.message || "Failed to fetch records");
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch records");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, selectedBatch, selectedSubject, startDate, endDate, debouncedSearch, filterMeta]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // View Consolidated Student Details Modal (Aggregated across all sessions in duration)
  const handleViewConsolidatedDetails = async (item: ConsolidatedRecordItem) => {
    setSelectedConsolidatedRecord(item);
    setSelectedRecord(null);
    setLoadingDetails(true);
    setDetailsError("");
    setConsolidatedStudents([]);
    setModalSearch("");
    setConsolidatedPage(1);
    setDetailsModalOpen(true);

    // Build chronologically sorted session date list from item.records
    const sortedRecords = [...(item.records || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id
    );

    const sessionCols: SessionDateColumn[] = sortedRecords.map(r => {
      let dayOfWeek = "";
      let displayShort = "";
      try {
        const dObj = new Date(r.date);
        if (!isNaN(dObj.getTime())) {
          dayOfWeek = format(dObj, "EEE");
          displayShort = format(dObj, "dd MMM");
        }
      } catch {}
      return {
        record_id: r.id,
        date: r.date,
        formattedDate: formatDateToDDMMYYYY(r.date),
        displayShort: displayShort || formatDateToDDMMYYYY(r.date),
        dayOfWeek: dayOfWeek || "",
        section: r.section,
        present_count: r.summary?.present_count ?? 0,
        absent_count: r.summary?.absent_count ?? 0,
        total_count: r.summary?.total_count ?? 0,
        turnout_percentage: r.summary?.present_percentage ?? (r.summary?.total_count ? Math.round((r.summary.present_count / r.summary.total_count) * 100) : 0)
      };
    });
    setConsolidatedSessions(sessionCols);

    try {
      const results = await Promise.all(
        sortedRecords.map(r => getAttendanceRecordDetails(r.id).then(res => ({ record_id: r.id, res })))
      );
      const studentMap = new Map<string, ConsolidatedStudentItem>();
      const rostersMap: Record<number, { present: StudentDetailItem[]; absent: StudentDetailItem[] }> = {};

      results.forEach(({ record_id, res }) => {
        if (res.success && res.data) {
          rostersMap[record_id] = {
            present: res.data.present || [],
            absent: res.data.absent || []
          };

          (res.data.present || []).forEach(p => {
            const key = p.usn ? p.usn.trim().toUpperCase() : String(p.id);
            const existing = studentMap.get(key) || {
              id: p.id,
              name: p.name,
              usn: p.usn,
              classes_held: 0,
              classes_attended: 0,
              classes_absent: 0,
              attendance_percentage: 0,
              session_status: {}
            };
            existing.session_status[record_id] = "present";
            studentMap.set(key, existing);
          });

          (res.data.absent || []).forEach(a => {
            const key = a.usn ? a.usn.trim().toUpperCase() : String(a.id);
            const existing = studentMap.get(key) || {
              id: a.id,
              name: a.name,
              usn: a.usn,
              classes_held: 0,
              classes_attended: 0,
              classes_absent: 0,
              attendance_percentage: 0,
              session_status: {}
            };
            existing.session_status[record_id] = "absent";
            studentMap.set(key, existing);
          });
        }
      });

      setSessionRostersMap(rostersMap);
      if (sessionCols.length > 0) {
        setSelectedInspectorSessionId(sessionCols[0].record_id);
      }
      setConsolidatedViewMode("students");

      const totalSessionsCount = sortedRecords.length;

      // Ensure every student has an exact status for all sessions in this duration
      const studentList = Array.from(studentMap.values()).map(s => {
        let attended = 0;
        sortedRecords.forEach(r => {
          const st = s.session_status[r.id];
          if (st === "present") {
            attended += 1;
          } else if (!st) {
            // Check if present in this session roster
            const isPres = rostersMap[r.id]?.present.some(p => (p.usn && s.usn && p.usn.trim().toUpperCase() === s.usn.trim().toUpperCase()) || p.id === s.id);
            if (isPres) {
              s.session_status[r.id] = "present";
              attended += 1;
            } else {
              s.session_status[r.id] = "absent";
            }
          }
        });

        const absent = Math.max(0, totalSessionsCount - attended);
        const pct = totalSessionsCount > 0 ? Math.round((attended / totalSessionsCount) * 1000) / 10 : 0;

        return {
          ...s,
          classes_held: totalSessionsCount,
          classes_attended: attended,
          classes_absent: absent,
          attendance_percentage: pct
        };
      }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setConsolidatedStudents(studentList);
    } catch (err: any) {
      setDetailsError(err.message || "Failed to load consolidated details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Export Consolidated Student Attendance to Excel
  const handleExportConsolidatedExcel = () => {
    if (!selectedConsolidatedRecord || !consolidatedStudents.length) {
      toast({ variant: "destructive", title: "Export Failed", description: "No student records to export." });
      return;
    }
    const durationStr = selectedConsolidatedRecord.total_sessions === 1
      ? formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date)
      : `${formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date)} to ${formatDateToDDMMYYYY(selectedConsolidatedRecord.last_date)}`;

    const dateHeaders = consolidatedSessions.map(sess => `${sess.formattedDate}${sess.dayOfWeek ? ` (${sess.dayOfWeek})` : ''}`);

    const headerRow = [
      "Sl No",
      "Student Name",
      "USN / Roll No",
      ...dateHeaders,
      "Attended Classes",
      "Classes Held",
      "Absent Classes",
      "Attendance Rate (%)",
      "Attendance Status"
    ];

    const rows = [
      ["CONSOLIDATED STUDENT ATTENDANCE REPORT WITH SESSION-WISE BREAKDOWN"],
      [],
      ["Subject Name", selectedConsolidatedRecord.subject || "--"],
      ["Subject Code", selectedConsolidatedRecord.subject_code || "--"],
      ["Date Range Duration", durationStr],
      ["Class / Semester", `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${selectedConsolidatedRecord.semester || '--'} - Section ${selectedConsolidatedRecord.section || '--'}`],
      ["Department / Branch", selectedConsolidatedRecord.branch || "--"],
      ["Batch(es)", selectedConsolidatedRecord.batch || "--"],
      ["Total Classes Held", selectedConsolidatedRecord.total_sessions.toString()],
      ["Total Present Roll Calls", selectedConsolidatedRecord.total_present.toString()],
      ["Total Absent Roll Calls", selectedConsolidatedRecord.total_absent.toString()],
      ["Overall Class Turnout (%)", `${selectedConsolidatedRecord.avg_attendance_pct}%`],
      ["Total Enrolled Students", consolidatedStudents.length.toString()],
      ["Export Generated On", new Date().toLocaleString()],
      [],
      headerRow
    ];

    consolidatedStudents.forEach((s, idx) => {
      const sessionValues = consolidatedSessions.map(sess => {
        const st = s.session_status?.[sess.record_id];
        if (st === "present") return "Present";
        if (st === "absent") return "Absent";
        return "--";
      });

      rows.push([
        (idx + 1).toString(),
        s.name,
        s.usn,
        ...sessionValues,
        s.classes_attended.toString(),
        s.classes_held.toString(),
        s.classes_absent.toString(),
        `${s.attendance_percentage}%`,
        s.attendance_percentage >= 75 ? "Eligible" : "Shortage"
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = [
      { wch: 8 },   // Sl No
      { wch: 32 },  // Student Name
      { wch: 20 },  // USN
      ...consolidatedSessions.map(() => ({ wch: 18 })), // Date cols
      { wch: 18 },  // Attended Classes
      { wch: 15 },  // Classes Held
      { wch: 16 },  // Absent Classes
      { wch: 20 },  // Attendance Rate %
      { wch: 18 }   // Status
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Attendance");
    const safeSubject = (selectedConsolidatedRecord.subject || "Subject").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(workbook, `Consolidated_Student_Attendance_${safeSubject}_${selectedConsolidatedRecord.first_date}_to_${selectedConsolidatedRecord.last_date}.xlsx`);
    toast({ title: "Export Successful", description: `Exported attendance report with session breakdown for ${consolidatedStudents.length} students.` });
  };

  // Export Individual Student Timeline to PDF (With Dynamic Org Logo & Theme)
  const handleExportStudentTimelinePDF = async () => {
    if (!selectedStudentForTimeline) {
      toast({ variant: "destructive", title: "Export Failed", description: "No student selected for timeline export." });
      return;
    }

    // Dynamic Organization Name and Logo
    let orgName = "STALIGHT CAMPUS ERP";
    let orgLogoUrl = "";
    try {
      const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        orgName = u.org_name || u.organization?.name || localStorage.getItem("org_name") || sessionStorage.getItem("org_name") || "STALIGHT CAMPUS ERP";
        orgLogoUrl = u.org_logo || u.organization?.logo_url || u.organization?.logo || localStorage.getItem("org_logo") || sessionStorage.getItem("org_logo") || "";
      } else {
        orgName = localStorage.getItem("org_name") || sessionStorage.getItem("org_name") || "STALIGHT CAMPUS ERP";
        orgLogoUrl = localStorage.getItem("org_logo") || sessionStorage.getItem("org_logo") || "";
      }
    } catch {
      orgName = localStorage.getItem("org_name") || "STALIGHT CAMPUS ERP";
      orgLogoUrl = localStorage.getItem("org_logo") || "";
    }
    if (!orgLogoUrl) {
      orgLogoUrl = "/logo.jpeg";
    }

    // Helper to load organization logo image
    const loadOrgLogo = (url: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
      if (!url) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 120;
            canvas.height = img.naturalHeight || img.height || 120;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              resolve({ dataUrl, width: canvas.width, height: canvas.height });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
        setTimeout(() => resolve(null), 1200);
      });
    };

    const logoInfo = await loadOrgLogo(orgLogoUrl);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header Background
    const headerHeight = 26;
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Brand Accent Stripe
    doc.setFillColor(99, 102, 241); // Indigo Accent
    doc.rect(0, headerHeight, pageWidth, 1.8, "F");

    // Draw Logo if available
    let textStartX = margin;
    if (logoInfo) {
      const boxSize = 17;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 4.5, boxSize, boxSize, 2, 2, "F");
      const aspect = logoInfo.width / (logoInfo.height || 1);
      let imgW = 14;
      let imgH = 14;
      if (aspect > 1) {
        imgH = 14 / aspect;
      } else {
        imgW = 14 * aspect;
      }
      const imgX = margin + (boxSize - imgW) / 2;
      const imgY = 4.5 + (boxSize - imgH) / 2;
      try {
        doc.addImage(logoInfo.dataUrl, "PNG", imgX, imgY, imgW, imgH);
        textStartX = margin + boxSize + 4;
      } catch {
        textStartX = margin;
      }
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(255, 255, 255);
    doc.text(orgName.toUpperCase(), textStartX, 11.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text("STUDENT ATTENDANCE TIMELINE REPORT", textStartX, 18.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, pageWidth - margin, 18.5, { align: "right" });

    // Student Information Card Box
    const startY = 34;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, startY, pageWidth - margin * 2, 38, 2, 2, "FD");

    // Info Labels & Values
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(selectedStudentForTimeline.name || "Student", margin + 4, startY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`USN / ID: ${selectedStudentForTimeline.usn || "--"}`, margin + 4, startY + 14);

    const subjectName = selectedConsolidatedRecord?.subject || "All Subjects";
    const subjectCode = selectedConsolidatedRecord?.subject_code || "";
    doc.text(`Subject: ${subjectName} ${subjectCode ? `(${subjectCode})` : ""}`, margin + 4, startY + 20);

    const classStr = selectedConsolidatedRecord ? `Sem ${selectedConsolidatedRecord.semester || "--"} - Sec ${selectedConsolidatedRecord.section || "--"}` : "--";
    const batchStr = selectedConsolidatedRecord?.batch_name || "--";
    doc.text(`Class: ${classStr}  |  Batch: ${batchStr}`, margin + 4, startY + 26);

    const dateRangeStr = selectedConsolidatedRecord ? `${formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date)} to ${formatDateToDDMMYYYY(selectedConsolidatedRecord.last_date)}` : "All Recorded Sessions";
    doc.text(`Duration: ${dateRangeStr}`, margin + 4, startY + 32);

    // Right Side Stats Box
    const statBoxX = pageWidth - margin - 58;
    const isEligible = selectedStudentForTimeline.attendance_percentage >= 75;
    const badgeColor = isEligible ? [16, 185, 129] : [239, 68, 68];

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(statBoxX, startY + 4, 54, 30, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.text(`${selectedStudentForTimeline.attendance_percentage}%`, statBoxX + 27, startY + 12, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(isEligible ? "ELIGIBLE (>=75%)" : "SHORTAGE (<75%)", statBoxX + 27, startY + 17, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Held: ${selectedStudentForTimeline.classes_held}  |  Attended: ${selectedStudentForTimeline.classes_attended}  |  Absent: ${selectedStudentForTimeline.classes_absent}`, statBoxX + 27, startY + 24, { align: "center" });

    // Table Data
    const tableHeaders = ["#", "Date", "Day", "Section", "Marked By / Faculty", "Status"];
    const tableRows = consolidatedSessions.map((session, idx) => {
      const status = selectedStudentForTimeline.session_status?.[session.record_id] || (
        sessionRostersMap[session.record_id]?.present.some(p => (p.usn && selectedStudentForTimeline.usn && p.usn.trim().toUpperCase() === selectedStudentForTimeline.usn.trim().toUpperCase()) || p.id === selectedStudentForTimeline.id)
          ? "present"
          : sessionRostersMap[session.record_id]?.absent.some(a => (a.usn && selectedStudentForTimeline.usn && a.usn.trim().toUpperCase() === selectedStudentForTimeline.usn.trim().toUpperCase()) || a.id === selectedStudentForTimeline.id)
          ? "absent"
          : undefined
      );

      const isPres = status === "present";
      const isAbs = status === "absent";
      const statusText = isPres ? "PRESENT" : isAbs ? "ABSENT" : "NOT RECORDED";

      return [
        `#${idx + 1}`,
        session.formattedDate || session.date || "--",
        session.dayOfWeek || "--",
        `Sec ${session.section || "--"}`,
        filterMeta?.faculty_name || "--",
        statusText
      ];
    });

    autoTable(doc, {
      startY: startY + 43,
      head: [tableHeaders],
      body: tableRows,
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center"
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 14 },
        1: { halign: "center", cellWidth: 28 },
        2: { halign: "center", cellWidth: 24 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "left", cellWidth: 54 },
        5: { halign: "center", cellWidth: 40, fontStyle: "bold" }
      },
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 5) {
          const val = String(tableRows[data.row.index]?.[5] || "");
          const isPres = val === "PRESENT";
          const isAbs = val === "ABSENT";

          const bg = isPres ? [236, 253, 245] : isAbs ? [254, 242, 242] : [241, 245, 249];
          const border = isPres ? [167, 243, 208] : isAbs ? [254, 202, 202] : [203, 213, 225];
          const text = isPres ? [5, 150, 105] : isAbs ? [220, 38, 38] : [100, 116, 139];

          const cell = data.cell;
          const badgeWidth = cell.width - 6;
          const badgeHeight = cell.height - 2.5;
          const badgeX = cell.x + 3;
          const badgeY = cell.y + 1.25;

          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.setDrawColor(border[0], border[1], border[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1, 1, "FD");

          doc.setTextColor(text[0], text[1], text[2]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text(val, cell.x + cell.width / 2, cell.y + cell.height / 2 + 1, { align: "center" });
          return false;
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        const footerY = doc.internal.pageSize.getHeight() - 8;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`CONFIDENTIAL • ${orgName.toUpperCase()} • OFFICIAL INDIVIDUAL ATTENDANCE RECORD`, margin, footerY);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
      }
    });

    const safeName = (selectedStudentForTimeline.name || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeUsn = (selectedStudentForTimeline.usn || "USN").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Attendance_Timeline_${safeName}_${safeUsn}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

    doc.save(filename);
    toast({
      title: "PDF Exported Successfully",
      description: `Student attendance timeline exported for ${selectedStudentForTimeline.name}.`
    });
  };

  // Toggle Attendance directly from Student Timeline Dialog
  const handleToggleTimelineAttendance = async (
    sessionRecordId: number,
    currentStatus: "present" | "absent" | "not_recorded"
  ) => {
    if (!selectedStudentForTimeline || togglingSessionId !== null) return;

    const targetStudentId = selectedStudentForTimeline.id;
    const targetStudentUsn = selectedStudentForTimeline.usn;
    const targetStudentName = selectedStudentForTimeline.name;
    const newStatusBool = currentStatus !== "present"; // If currently present, toggle to false (absent); if absent/not_recorded, toggle to true (present)
    const newStatusStr: "present" | "absent" = newStatusBool ? "present" : "absent";

    setTogglingSessionId(sessionRecordId);

    try {
      const res = await updateAttendanceRecord(sessionRecordId, [
        { id: targetStudentId, status: newStatusBool }
      ]);

      if (res.success) {
        toast({
          title: "Attendance Updated",
          description: `Marked ${targetStudentName} as ${newStatusStr === "present" ? "Present" : "Absent"}.`
        });

        // 1. Update selectedStudentForTimeline
        setSelectedStudentForTimeline(prev => {
          if (!prev) return null;
          const updatedStatusMap = {
            ...prev.session_status,
            [sessionRecordId]: newStatusStr
          };
          const newAttended = Object.values(updatedStatusMap).filter(s => s === "present").length;
          const totalHeld = prev.classes_held || Object.keys(updatedStatusMap).length;
          const newAbsent = Math.max(0, totalHeld - newAttended);
          const newPct = totalHeld > 0 ? Math.round((newAttended / totalHeld) * 1000) / 10 : 0;

          return {
            ...prev,
            session_status: updatedStatusMap,
            classes_attended: newAttended,
            classes_absent: newAbsent,
            attendance_percentage: newPct
          };
        });

        // 2. Update consolidatedStudents list (so table in background updates instantly)
        setConsolidatedStudents(prev => prev.map(s => {
          const isMatch = s.id === targetStudentId || (s.usn && targetStudentUsn && s.usn.trim().toUpperCase() === targetStudentUsn.trim().toUpperCase());
          if (isMatch) {
            const updatedStatusMap = {
              ...s.session_status,
              [sessionRecordId]: newStatusStr
            };
            const newAttended = Object.values(updatedStatusMap).filter(status => status === "present").length;
            const totalHeld = s.classes_held || Object.keys(updatedStatusMap).length;
            const newAbsent = Math.max(0, totalHeld - newAttended);
            const newPct = totalHeld > 0 ? Math.round((newAttended / totalHeld) * 1000) / 10 : 0;
            return {
              ...s,
              session_status: updatedStatusMap,
              classes_attended: newAttended,
              classes_absent: newAbsent,
              attendance_percentage: newPct
            };
          }
          return s;
        }));

        // 3. Update sessionRostersMap if cached
        setSessionRostersMap(prev => {
          const existing = prev[sessionRecordId];
          if (!existing) return prev;

          let updatedPresent = [...existing.present];
          let updatedAbsent = [...existing.absent];

          const isMatch = (item: StudentDetailItem) =>
            item.id === targetStudentId || (item.usn && targetStudentUsn && item.usn.trim().toUpperCase() === targetStudentUsn.trim().toUpperCase());

          if (newStatusBool) {
            // Moving to Present
            const foundAbsent = updatedAbsent.find(isMatch);
            updatedAbsent = updatedAbsent.filter(a => !isMatch(a));
            if (!updatedPresent.some(isMatch)) {
              updatedPresent.push(foundAbsent || {
                id: targetStudentId,
                name: targetStudentName,
                usn: targetStudentUsn,
                status: true
              });
            }
          } else {
            // Moving to Absent
            const foundPresent = updatedPresent.find(isMatch);
            updatedPresent = updatedPresent.filter(p => !isMatch(p));
            if (!updatedAbsent.some(isMatch)) {
              updatedAbsent.push(foundPresent || {
                id: targetStudentId,
                name: targetStudentName,
                usn: targetStudentUsn,
                status: false
              });
            }
          }

          return {
            ...prev,
            [sessionRecordId]: {
              present: updatedPresent,
              absent: updatedAbsent
            }
          };
        });

        // 4. Update consolidatedSessions (session counts and turnout)
        setConsolidatedSessions(prev => prev.map(ses => {
          if (ses.record_id === sessionRecordId) {
            const delta = newStatusBool ? 1 : -1;
            const newPres = Math.max(0, (ses.present_count ?? 0) + delta);
            const newAbs = Math.max(0, (ses.absent_count ?? 0) - delta);
            const total = (ses.total_count ?? (newPres + newAbs)) || (newPres + newAbs);
            const newTurnout = total > 0 ? Math.round((newPres / total) * 100) : 0;
            return {
              ...ses,
              present_count: newPres,
              absent_count: newAbs,
              turnout_percentage: newTurnout
            };
          }
          return ses;
        }));

        // 5. Update main records list if this session exists in it
        setRecords(prev => prev.map(rec => {
          if (rec.id === sessionRecordId) {
            const delta = newStatusBool ? 1 : -1;
            const newPres = Math.max(0, (rec.summary.present_count || 0) + delta);
            const newAbs = Math.max(0, (rec.summary.absent_count || 0) - delta);
            const total = rec.summary.total_count || (newPres + newAbs);
            const newPct = total > 0 ? Math.round((newPres / total) * 100) : 0;
            return {
              ...rec,
              summary: {
                ...rec.summary,
                present_count: newPres,
                absent_count: newAbs,
                present_percentage: newPct
              }
            };
          }
          return rec;
        }));

      } else {
        toast({
          title: "Update Failed",
          description: res.message || "Failed to update attendance record.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setTogglingSessionId(null);
    }
  };

  // View Details Modal for Single Session
  const handleViewDetails = (record: AttendanceRecordItem) => {
    setSelectedRecord(record);
    setSelectedConsolidatedRecord(null);
    setLoadingDetails(true);
    setDetailsError("");
    setPresentList([]);
    setAbsentList([]);
    setConsolidatedStudents([]);
    setIsEditing(false);
    setModalSearch("");
    setDetailsModalOpen(true);

    getAttendanceRecordDetails(record.id)
      .then((res) => {
        if (res.success && res.data) {
          setPresentList(res.data.present || []);
          setAbsentList(res.data.absent || []);
        } else {
          setDetailsError(res.message || "Failed to fetch details");
        }
      })
      .catch((e) => setDetailsError(e.message || "Failed to fetch details"))
      .finally(() => setLoadingDetails(false));
  };

  // Save Attendance Edits
  const handleSaveEdit = async () => {
    if (!selectedRecord) return;
    setSavingEdit(true);
    setDetailsError("");

    const updates = [
      ...presentList.map(s => ({ id: s.id, status: true })),
      ...absentList.map(s => ({ id: s.id, status: false }))
    ];

    try {
      const res = await updateAttendanceRecord(selectedRecord.id, updates);
      if (res.success) {
        toast({ title: "Success", description: "Attendance updated successfully." });
        setIsEditing(false);

        const newPresent = presentList.length;
        const newAbsent = absentList.length;
        const newTotal = newPresent + newAbsent;
        const newPct = newTotal > 0 ? Math.round((newPresent / newTotal) * 100) : 0;

        setRecords(prev => prev.map(r => r.id === selectedRecord.id ? {
          ...r,
          summary: {
            ...r.summary,
            present_count: newPresent,
            absent_count: newAbsent,
            total_count: newTotal,
            present_percentage: newPct
          }
        } : r));

        setSelectedRecord(prev => prev ? {
          ...prev,
          summary: {
            ...prev.summary,
            present_count: newPresent,
            absent_count: newAbsent,
            total_count: newTotal,
            present_percentage: newPct
          }
        } : null);
      } else {
        setDetailsError(res.message || "Failed to update attendance");
        toast({ title: "Error", description: res.message || "Failed to update attendance", variant: "destructive" });
      }
    } catch {
      setDetailsError("An error occurred while saving");
    } finally {
      setSavingEdit(false);
    }
  };

  // Export Session Excel
  const handleExportSessionExcel = async () => {
    if (!selectedRecord) return;
    setExportingExcel(true);
    try {
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/export-session-excel/?file_id=${selectedRecord.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const localUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = localUrl;
        const safeSubject = (selectedRecord.subject || "Attendance").replace(/\s+/g, "_");
        a.download = `attendance_${safeSubject}_${selectedRecord.date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(localUrl);
      } else {
        // Client Fallback Excel/CSV
        const rows = [
          ["Attendance Session Report"],
          ["Subject", selectedRecord.subject || "--"],
          ["Date", selectedRecord.date],
          ["Class", `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${selectedRecord.semester || ''} - ${selectedRecord.section || ''}`],
          ["Total Present", presentList.length.toString()],
          ["Total Absent", absentList.length.toString()],
          [],
          ["Sl No", "Student Name", "USN", "Session Status", "Subject Attended", "Subject Absent", "Subject Total", "Subject Attendance %"]
        ];

        let sl = 1;
        presentList.forEach(s => {
          rows.push([
            sl.toString(),
            s.name,
            s.usn,
            "PRESENT",
            (s.subject_present ?? 1).toString(),
            (s.subject_absent ?? 0).toString(),
            (s.subject_total ?? 1).toString(),
            `${s.subject_percentage ?? 100}%`
          ]);
          sl++;
        });
        absentList.forEach(s => {
          rows.push([
            sl.toString(),
            s.name,
            s.usn,
            "ABSENT",
            (s.subject_present ?? 0).toString(),
            (s.subject_absent ?? 1).toString(),
            (s.subject_total ?? 1).toString(),
            `${s.subject_percentage ?? 0}%`
          ]);
          sl++;
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Session Attendance");
        XLSX.writeFile(workbook, `Attendance_${selectedRecord.date}.xlsx`);
      }
    } catch {
      toast({ title: "Error", description: "Failed to export excel", variant: "destructive" });
    } finally {
      setExportingExcel(false);
    }
  };

  // Export Records Summary Excel
  const handleExportRecordsListExcel = () => {
    try {
      if (!consolidatedRecords.length && !records.length) {
        toast({ variant: "destructive", title: "Export Failed", description: "No attendance records found to export." });
        return;
      }

      const workbook = XLSX.utils.book_new();

      // Sheet 1: Consolidated Class Summaries (matches the main table on screen)
      if (consolidatedRecords.length > 0) {
        const summaryRows = consolidatedRecords.map((c, index) => ({
          "Sl No": index + 1,
          "Duration / Dates": c.total_sessions === 1 ? formatDateToDDMMYYYY(c.first_date) : `${formatDateToDDMMYYYY(c.first_date)} to ${formatDateToDDMMYYYY(c.last_date)}`,
          "Subject": c.subject || "--",
          "Subject Code": c.subject_code || "--",
          "Section": c.section || "--",
          "Semester / Class": c.semester ? `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${c.semester}` : "--",
          "Department / Branch": c.branch || "--",
          "Batch": c.batch || "--",
          "Lab Batch": c.lab_batch_name || "--",
          "Classes Held": c.total_sessions,
          "Total Present": c.total_present,
          "Total Absent": c.total_absent,
          "Total Student Calls": c.total_student_calls,
          "Overall Turnout %": `${c.avg_attendance_pct}%`,
          "Status": c.status || "Completed"
        }));

        const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Consolidated Summary");
      }

      // Sheet 2: Individual Daily Session Records
      if (records.length > 0) {
        const sessionRows = records.map((r, index) => ({
          "Sl No": index + 1,
          "Date": formatDateToDDMMYYYY(r.date),
          "Subject": r.subject || "--",
          "Subject Code": r.subject_code || "--",
          "Section": r.section || "--",
          "Semester / Class": r.semester ? `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${r.semester}` : "--",
          "Department / Branch": r.branch || "--",
          "Batch": r.batch || "--",
          "Lab Batch": r.lab_batch_name || "--",
          "Present Count": r.summary?.present_count ?? 0,
          "Absent Count": r.summary?.absent_count ?? 0,
          "Total Strength": r.summary?.total_count ?? 0,
          "Attendance %": `${r.summary?.present_percentage ?? 0}%`,
          "Status": r.status || "Completed"
        }));

        const sessionsSheet = XLSX.utils.json_to_sheet(sessionRows);
        XLSX.utils.book_append_sheet(workbook, sessionsSheet, "Daily Session Records");
      }

      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `Faculty_Attendance_Records_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast({
        title: "Export Successful",
        description: `Exported ${consolidatedRecords.length} class summaries and ${records.length} session records to Excel.`
      });
    } catch (err: any) {
      console.error("Export Excel error:", err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err?.message || "Failed to generate Excel file."
      });
    }
  };

  const hasActiveFilters = Boolean(selectedBatch || selectedSubject || startDate || endDate || searchTerm);
  const isFilterComplete = Boolean(selectedBatch && selectedSubject && startDate && endDate);

  return (
    <div className={`space-y-4 p-3 sm:p-4 md:p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* 1. TOP HEADER & METRICS */}
      <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="p-4 sm:p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-primary" />
                Attendance Records
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Track, filter, and manage history of all student attendance submissions strictly for your assigned classes.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportRecordsListExcel}
                disabled={consolidatedRecords.length === 0 && records.length === 0}
                className="text-xs h-8 gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* FILTER BAR: Batch, Assigned Subjects, Date Range, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-3 sm:mt-4">
            
            {/* 1. Batch Select */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Batch
              </label>
              <Select value={selectedBatch || "all"} onValueChange={handleBatchChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.map((b) => (
                    <SelectItem key={String(b.id)} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Subject Select (Disabled until Batch is selected) */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Subject {!selectedBatch && <span className="text-[10px] text-amber-500 font-normal lowercase">(choose batch first)</span>}
              </label>
              <Select
                value={selectedBatch ? (selectedSubject || "all") : "all"}
                onValueChange={handleSubjectChange}
                disabled={!selectedBatch || loadingBatchSubjects}
              >
                <SelectTrigger className={cn("h-9 text-xs", (!selectedBatch || loadingBatchSubjects) && "opacity-60 cursor-not-allowed bg-muted/40 border-dashed")}>
                  {loadingBatchSubjects ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                      <span className="truncate">Loading subjects for batch...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder={!selectedBatch ? "Select Batch First" : "All Subjects (Selected Batch)"} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{!selectedBatch ? "Select Batch First" : "All Assigned Subjects"}</SelectItem>
                  {availableAssignedSubjects.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.name} {sub.subject_code ? `(${sub.subject_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Date Range Filter & Presets (Disabled until Subject is selected) */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Date Range {!selectedSubject && <span className="text-[10px] text-amber-500 font-normal lowercase">(choose subject first)</span>}
              </label>
              <Popover open={selectedSubject ? isDatePickerOpen : false} onOpenChange={selectedSubject ? setIsDatePickerOpen : undefined}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!selectedSubject}
                    className={cn(
                      "h-9 w-full justify-start text-xs font-normal border-input relative group",
                      !selectedSubject && "opacity-50 cursor-not-allowed bg-muted/40 border-dashed",
                      (startDate || endDate) && "border-primary/50 text-foreground bg-primary/5 font-medium"
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-primary flex-shrink-0" />
                    <span className="truncate flex-1 text-left">
                      {!selectedSubject
                        ? "Select Subject First"
                        : startDate && endDate
                        ? startDate === endDate
                          ? formatDateToDDMMYYYY(startDate)
                          : `${formatDateToDDMMYYYY(startDate)} - ${formatDateToDDMMYYYY(endDate)}`
                        : startDate
                        ? `From ${formatDateToDDMMYYYY(startDate)}`
                        : "Select Date Range (Mandatory)"}
                    </span>
                    {(startDate || endDate) && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          applyDatePreset("all");
                        }}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear date filter"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[calc(100vw-1.5rem)] p-0 border border-border shadow-2xl rounded-2xl overflow-hidden text-xs" align="start">
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        Select Date Range
                      </div>
                      {startDate && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 font-mono font-normal">
                          {formatDateToDDMMYYYY(startDate)} {endDate && endDate !== startDate ? `→ ${formatDateToDDMMYYYY(endDate)}` : ""}
                        </Badge>
                      )}
                    </div>

                    <div className="border border-border/70 rounded-xl overflow-hidden bg-background p-1 shadow-xs">
                      <Calendar
                        mode="range"
                        selected={selectedDateRange}
                        onSelect={handleCalendarSelect}
                        numberOfMonths={1}
                        toDate={new Date()}
                        disabled={{ after: new Date() }}
                        className="p-1"
                        classNames={{
                          months: "space-y-0",
                          month: "space-y-1.5",
                          caption: "flex justify-center pt-1 relative items-center h-7 mb-1",
                          caption_label: "text-xs font-semibold",
                          nav_button: "h-6 w-6 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-md hover:bg-muted transition-all",
                          table: "w-full border-collapse space-y-0",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-8 h-6 flex-shrink-0 font-semibold text-[10px] flex items-center justify-center uppercase",
                          row: "flex w-full mt-1",
                          cell: "h-8 w-8 flex-shrink-0 flex items-center justify-center p-0 relative text-xs",
                          day: "h-7.5 w-7.5 flex-shrink-0 p-0 font-normal text-xs rounded-lg transition-colors flex items-center justify-center hover:bg-accent",
                          day_today: "bg-muted text-foreground font-bold",
                          day_selected: "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
                          day_range_middle: "aria-selected:bg-primary/15 aria-selected:text-primary rounded-none",
                          day_disabled: "text-muted-foreground/20 opacity-30 cursor-not-allowed pointer-events-none hover:bg-transparent hover:text-muted-foreground/20",
                          day_outside: "text-muted-foreground/20 opacity-20 pointer-events-none"
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="flex items-center justify-between p-2.5 border-t bg-muted/20">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 px-2.5 rounded-lg"
                      onClick={() => applyDatePreset("all")}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear Dates
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7.5 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-medium rounded-lg"
                      onClick={() => setIsDatePickerOpen(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* 4. Search Input */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Subject, Code, Batch, Section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-8 h-9 text-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* ACTIVE FILTER TAGS ROW */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1 mr-1 shrink-0">
                Active Filters:
              </span>

              {/* Batch Tag */}
              {selectedBatch && (
                <Badge variant="secondary" className="text-xs py-1 px-2.5 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 max-w-full truncate">
                  <span className="truncate">Batch: <strong>{availableBatches.find(b => String(b.id) === selectedBatch)?.name || selectedBatch}</strong></span>
                  <button
                    onClick={() => handleBatchChange("all")}
                    className="hover:bg-emerald-500/20 rounded p-0.5 ml-0.5 text-emerald-600 dark:text-emerald-300 shrink-0"
                    title="Remove Batch filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {/* Subject Tag */}
              {selectedSubject && (
                <Badge variant="secondary" className="text-xs py-1 px-2.5 flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 max-w-full truncate">
                  <span className="truncate">Subject: <strong>{availableAssignedSubjects.find(s => String(s.id) === selectedSubject)?.name || selectedSubject}</strong></span>
                  <button
                    onClick={() => handleSubjectChange("all")}
                    className="hover:bg-primary/20 rounded p-0.5 ml-0.5 text-primary shrink-0"
                    title="Remove Subject filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {/* Date Range Tag */}
              {(startDate || endDate) && (
                <Badge variant="secondary" className="text-xs py-1 px-2.5 flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 max-w-full truncate">
                  <CalendarIcon className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="truncate">
                    Date: <strong>{startDate && endDate ? (startDate === endDate ? formatDateToDDMMYYYY(startDate) : `${formatDateToDDMMYYYY(startDate)} - ${formatDateToDDMMYYYY(endDate)}`) : startDate ? `From ${formatDateToDDMMYYYY(startDate)}` : `Up to ${formatDateToDDMMYYYY(endDate)}`}</strong>
                  </span>
                  <button
                    onClick={() => applyDatePreset("all")}
                    className="hover:bg-blue-500/20 rounded p-0.5 ml-0.5 text-blue-600 dark:text-blue-300 shrink-0"
                    title="Remove Date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {/* Search Tag */}
              {searchTerm && (
                <Badge variant="secondary" className="text-xs py-1 px-2.5 flex items-center gap-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 max-w-full truncate">
                  <span className="truncate">Search: <strong>"{searchTerm}"</strong></span>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="hover:bg-purple-500/20 rounded p-0.5 ml-0.5 text-purple-600 dark:text-purple-300 shrink-0"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-7 px-2.5 text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 ml-auto shrink-0 flex items-center gap-1 font-medium shadow-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All
              </Button>
            </div>
          )}
        </CardHeader>

        {/* 2. VISUAL ATTENDANCE ANALYTICS & RECORDS TABLE */}
        <CardContent className="p-4 sm:p-6 space-y-6">
          {!isFilterComplete ? (
            /* 3-Step Guided Filter Progress Card */
            <div className={`p-6 sm:p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center ${
              theme === 'dark' ? 'border-border/70 bg-card/40' : 'border-slate-200 bg-slate-50/70'
            }`}>
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
                <Filter className="w-8 h-8 opacity-90" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1 text-foreground">
                Complete Filter Selection to View Records
              </h3>
              <p className="max-w-md text-xs text-muted-foreground mb-6">
                Please complete all 3 mandatory filter steps to accurately load your class attendance analytics.
              </p>

              {/* 3 Steps Progress Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
                
                {/* Step 1: Batch */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  selectedBatch
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100'
                    : 'border-primary/50 bg-primary/5 shadow-xs ring-2 ring-primary/20'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Step 1: Batch</span>
                    {selectedBatch ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-medium">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate">
                    {selectedBatch ? (availableBatches.find(b => String(b.id) === selectedBatch)?.name || selectedBatch) : "Select Batch First"}
                  </p>
                </div>

                {/* Step 2: Subject */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  selectedSubject
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100'
                    : selectedBatch
                    ? 'border-primary/50 bg-primary/5 shadow-xs ring-2 ring-primary/20'
                    : 'border-border/50 opacity-50 bg-muted/20'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Step 2: Subject</span>
                    {selectedSubject ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : selectedBatch ? (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-medium">Next</Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Locked</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate">
                    {selectedSubject ? (availableAssignedSubjects.find(s => String(s.id) === selectedSubject)?.name || selectedSubject) : "Select Subject"}
                  </p>
                </div>

                {/* Step 3: Date Range */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  (startDate && endDate)
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100'
                    : (selectedBatch && selectedSubject)
                    ? 'border-primary/50 bg-primary/5 shadow-xs ring-2 ring-primary/20'
                    : 'border-border/50 opacity-50 bg-muted/20'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Step 3: Date Range</span>
                    {(startDate && endDate) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (selectedBatch && selectedSubject) ? (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-medium">Final Step</Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Locked</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate">
                    {(startDate && endDate) ? (startDate === endDate ? formatDateToDDMMYYYY(startDate) : `${formatDateToDDMMYYYY(startDate)} - ${formatDateToDDMMYYYY(endDate)}`) : "Select Date Range"}
                  </p>
                </div>

              </div>

              {/* Dynamic instruction text */}
              <p className="text-xs text-primary font-medium mt-4">
                {!selectedBatch && "👉 Please pick a Batch in the dropdown above to start."}
                {selectedBatch && !selectedSubject && "👉 Great! Now select the Subject for this batch."}
                {selectedBatch && selectedSubject && (!startDate || !endDate) && "👉 Almost done! Now select a Date Range to load student attendance."}
              </p>
            </div>
          ) : (
            <>
              {/* Visual Analytics Charts Container */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                theme === 'dark' ? 'bg-card/70 border-border' : 'bg-slate-50/70 border-slate-200'
              }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Visual Attendance Analytics
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeAnalyticsTab === 'subject_bars' && "Subject-wise attendance turnout comparison and session distribution"}
                  {activeAnalyticsTab === 'timeline' && "Date-wise attendance percentage trend over the recorded sessions"}
                  {activeAnalyticsTab === 'distribution' && "Overall student participation split (Present vs Absent)"}
                </p>
              </div>

              {/* Chart Switcher Buttons */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border">
                <Button
                  size="sm"
                  variant={activeAnalyticsTab === "subject_bars" ? "default" : "ghost"}
                  onClick={() => setActiveAnalyticsTab("subject_bars")}
                  className="h-7 text-xs px-2.5 gap-1.5 rounded-lg"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Subject Comparison</span>
                  <span className="sm:hidden">Subjects</span>
                </Button>
                <Button
                  size="sm"
                  variant={activeAnalyticsTab === "timeline" ? "default" : "ghost"}
                  onClick={() => setActiveAnalyticsTab("timeline")}
                  className="h-7 text-xs px-2.5 gap-1.5 rounded-lg"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Timeline Trend</span>
                  <span className="sm:hidden">Timeline</span>
                </Button>
                <Button
                  size="sm"
                  variant={activeAnalyticsTab === "distribution" ? "default" : "ghost"}
                  onClick={() => setActiveAnalyticsTab("distribution")}
                  className="h-7 text-xs px-2.5 gap-1.5 rounded-lg"
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Turnout Split</span>
                  <span className="sm:hidden">Split</span>
                </Button>
              </div>
            </div>

            {/* CHART 1: Subject Comparison Bar Chart */}
            {activeAnalyticsTab === "subject_bars" && (
              <div className="w-full h-64 sm:h-72">
                {subjectAnalytics.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No subject data available to chart
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis yAxisId="left" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-3 rounded-xl border shadow-xl text-xs space-y-1 ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                              }`}>
                                <p className="font-bold border-b pb-1 text-primary">{data.subject_name}</p>
                                <p className="text-[11px] text-muted-foreground">Code: {data.subject_code || "--"}</p>
                                <div className="pt-1 space-y-0.5">
                                  <div className="flex justify-between gap-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span>Attendance Rate:</span>
                                    <span>{data.percentage}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-blue-600 dark:text-blue-400">
                                    <span>Classes Taken:</span>
                                    <span>{data.sessions}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-muted-foreground">
                                    <span>Present / Absent:</span>
                                    <span>{data.present} / {data.absent}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar yAxisId="left" dataKey="percentage" name="Attendance Rate (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="right" dataKey="sessions" name="Classes Conducted" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* CHART 2: Timeline Trend Area Chart */}
            {activeAnalyticsTab === "timeline" && (
              <div className="w-full h-64 sm:h-72">
                {timelineAnalytics.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No chronological records recorded for this filter
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-3 rounded-xl border shadow-xl text-xs space-y-1 ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                              }`}>
                                <p className="font-bold border-b pb-1 text-primary">{data.displayDate}</p>
                                <div className="pt-1 space-y-0.5">
                                  <div className="flex justify-between gap-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span>Turnout:</span>
                                    <span>{data.percentage}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-muted-foreground">
                                    <span>Present:</span>
                                    <span>{data.present} students</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-rose-500">
                                    <span>Absent:</span>
                                    <span>{data.absent} students</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="percentage"
                        name="Attendance Rate"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#attendanceGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* CHART 3: Present vs Absent Donut Chart */}
            {activeAnalyticsTab === "distribution" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6 py-2">
                <div className="w-full h-56 sm:h-64 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2 rounded-lg border text-xs shadow-md ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                              }`}>
                                <span className="font-semibold">{data.name}: </span>
                                <span>{data.value}</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center percentage label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tracking-tight">{kpiStats.avg_attendance || 0}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Turnout</span>
                  </div>
                </div>

                <div className="space-y-3 pr-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Participation Breakdown</h4>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl border flex items-center justify-between bg-emerald-500/5 border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold">Total Present Count</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{kpiStats.total_present}</span>
                    </div>

                    <div className="p-3 rounded-xl border flex items-center justify-between bg-rose-500/5 border-rose-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500" />
                        <span className="text-xs font-semibold">Total Absent Count</span>
                      </div>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{kpiStats.total_absent}</span>
                    </div>

                    <div className="p-3 rounded-xl border flex items-center justify-between bg-slate-500/5 border-slate-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-500" />
                        <span className="text-xs font-semibold">Total Student Roll Calls</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{(kpiStats.total_present || 0) + (kpiStats.total_absent || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ATTENDANCE RECORDS TABLE */}
          {loading ? (
            <SkeletonTable rows={8} columns={11} />
          ) : error ? (
            <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900">
              {error}
            </div>
          ) : consolidatedRecords.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl ${
              theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'
            }`}>
              <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
                <CheckCircle className="w-10 h-10 opacity-80" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-foreground">No Records Found</h3>
              <p className="max-w-md text-xs sm:text-sm text-muted-foreground">
                You haven't submitted any attendance records matching the current filters yet.
              </p>
            </div>
          ) : (
            /* CONSOLIDATED VIEW TABLE */
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-muted/70' : 'bg-slate-100'}>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Duration / Dates</TableHead>
                      <TableHead className="text-xs font-semibold">Subject</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Section</TableHead>
                      <TableHead className="text-xs font-semibold text-center">{translateTerminology("Semester")}</TableHead>
                      <TableHead className="text-xs font-semibold">{translateTerminology("Branch")}</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Batch</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Classes Held</TableHead>
                      <TableHead className="text-xs font-semibold text-center text-emerald-600 dark:text-emerald-400">Total Present</TableHead>
                      <TableHead className="text-xs font-semibold text-center text-rose-600 dark:text-rose-400">Total Absent</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Overall Turnout</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedRecords.map((c) => (
                      <TableRow key={c.key} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-xs font-semibold whitespace-nowrap">
                          {c.total_sessions === 1 ? (
                            <span>{formatDateToDDMMYYYY(c.first_date)}</span>
                          ) : (
                            <div className="flex flex-col">
                              <span>{formatDateToDDMMYYYY(c.first_date)} to</span>
                              <span>{formatDateToDDMMYYYY(c.last_date)}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold">{c.subject}</span>
                            {c.subject_code && (
                              <span className="text-[10px] text-muted-foreground">({c.subject_code})</span>
                            )}
                            {c.lab_batch_name && (
                              <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                                {c.lab_batch_name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <Badge variant="outline" className="text-[11px] font-semibold">
                            {c.section ? `Sec ${c.section}` : "--"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs whitespace-nowrap">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {c.semester ? `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${c.semester}` : "--"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.branch || "--"}</TableCell>
                        <TableCell className="text-center text-xs whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {c.batch || "--"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            {c.total_sessions} {c.total_sessions === 1 ? "Class" : "Classes"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {c.total_present}
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {c.total_absent}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className={`font-bold ${
                            c.avg_attendance_pct >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                            c.avg_attendance_pct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {c.avg_attendance_pct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {c.status || "Completed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleViewConsolidatedDetails(c)}
                            className="h-7 text-xs px-2.5 bg-primary text-white hover:bg-primary/90 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
            </>
          )}
        </CardContent>

        {/* PAGINATION */}
        {pagination.paginationState.totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
            <div>
              Showing {pagination.paginationState.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} records
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1 || loading}
                className="h-7 text-xs px-2.5"
              >
                Previous
              </Button>
              <span className="px-2 font-semibold text-foreground">
                Page {pagination.page} of {pagination.paginationState.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.paginationState.totalPages || loading}
                className="h-7 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ======================================================== */}
      {/* COMPREHENSIVE ATTENDANCE DETAILS MODAL                   */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* COMPREHENSIVE ATTENDANCE DETAILS MODAL                   */}
      {/* ======================================================== */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className={`w-[96vw] max-w-[96vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[92vh] p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col border ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* MODAL HEADER */}
          <div className={`p-4 sm:p-5 pr-14 sm:pr-16 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80 backdrop-blur-sm'
          }`}>
            <DialogHeader className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <span>{selectedConsolidatedRecord ? "Consolidated Student Attendance Report" : "Student Attendance Details"}</span>
                </DialogTitle>
                {selectedConsolidatedRecord && (
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {consolidatedStudents.length} Enrolled
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {selectedConsolidatedRecord
                  ? "Cumulative attendance record and session-by-session percentage breakdown for all classes held in this duration."
                  : "Session attendance record and subject turnout for enrolled students."}
              </DialogDescription>
            </DialogHeader>

            {/* Single Professional Export Button with safety margin from Close (X) button */}
            {selectedConsolidatedRecord && (
              <Button
                size="sm"
                onClick={handleExportConsolidatedExcel}
                disabled={loadingDetails || !consolidatedStudents.length}
                className="h-8 text-xs px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs shrink-0 gap-1.5 self-start sm:self-auto cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </Button>
            )}
          </div>

          <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">

            {/* Warning when editing */}
            {isEditing && (
              <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
                theme === 'dark' ? 'bg-amber-950/30 border-amber-900/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-tight">
                    Institutional Policy Compliance:
                    <span className="block mt-0.5 font-normal opacity-90">
                      Modifying attendance records must strictly reflect accurate session participation. Discrepancies may be subject to administrative review.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {detailsError && (
              <div className="p-3 text-xs text-red-600 bg-red-100 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/40">
                {detailsError}
              </div>
            )}

            {/* 1. CONSOLIDATED SUMMARY HEADER CARDS */}
            {selectedConsolidatedRecord && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Duration */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Date Duration</span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-1.5 line-clamp-1" title={selectedConsolidatedRecord.total_sessions === 1 ? formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date) : `${formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date)} - ${formatDateToDDMMYYYY(selectedConsolidatedRecord.last_date)}`}>
                    {selectedConsolidatedRecord.total_sessions === 1
                      ? formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date)
                      : `${formatDateToDDMMYYYY(selectedConsolidatedRecord.first_date)} - ${formatDateToDDMMYYYY(selectedConsolidatedRecord.last_date)}`}
                  </p>
                </div>

                {/* Subject */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Subject</span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-1.5 truncate" title={selectedConsolidatedRecord.subject}>
                    {selectedConsolidatedRecord.subject} {selectedConsolidatedRecord.subject_code ? `(${selectedConsolidatedRecord.subject_code})` : ""}
                  </p>
                </div>

                {/* Class & Batch */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Class & Batch</span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-1.5 truncate">
                    {selectedConsolidatedRecord.semester ? `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${selectedConsolidatedRecord.semester}` : "--"} - {selectedConsolidatedRecord.section || "--"}
                    {selectedConsolidatedRecord.batch ? ` • ${selectedConsolidatedRecord.batch}` : ""}
                  </p>
                </div>

                {/* Turnout */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/70 border-emerald-200/80'
                }`}>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Turnout</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                    {selectedConsolidatedRecord.total_sessions} {selectedConsolidatedRecord.total_sessions === 1 ? 'Class' : 'Classes'} • {selectedConsolidatedRecord.avg_attendance_pct}%
                  </p>
                </div>
              </div>
            )}

            {/* 2. SINGLE SESSION SUMMARY HEADER CARD */}
            {selectedRecord && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Session Date</p>
                  <p className="text-xs font-bold mt-0.5">{formatDateToDDMMYYYY(selectedRecord.date)}</p>
                </div>
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Subject</p>
                  <p className="text-xs font-bold truncate mt-0.5" title={selectedRecord.subject || ""}>
                    {selectedRecord.subject} {selectedRecord.subject_code ? `(${selectedRecord.subject_code})` : ""}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Class & Sec / Batch</p>
                  <p className="text-xs font-bold mt-0.5">
                    {selectedRecord.semester ? `${getInstitutionType() === 'school' ? 'Class' : 'Sem'} ${selectedRecord.semester}` : "--"} - {selectedRecord.section || "--"}
                    {selectedRecord.batch ? ` (${selectedRecord.batch})` : ""}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Session Turnout</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {presentList.length} Present / {absentList.length} Absent
                  </p>
                </div>
              </div>
            )}

            {/* View Mode Switcher & Search Bar for Consolidated Report */}
            {selectedConsolidatedRecord && (
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pb-1">
                {/* Segmented View Mode Switcher */}
                <div className="inline-flex p-1 bg-muted/70 rounded-xl gap-1 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setConsolidatedViewMode('students')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      consolidatedViewMode === 'students'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Consolidated Summary ({consolidatedStudents.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConsolidatedViewMode('session_inspector');
                      if (!selectedInspectorSessionId && consolidatedSessions.length > 0) {
                        setSelectedInspectorSessionId(consolidatedSessions[0].record_id);
                      }
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      consolidatedViewMode === 'session_inspector'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Daily Session Log ({consolidatedSessions.length})</span>
                  </button>
                </div>

                {/* Search Input in Modal */}
                <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    placeholder="Search student by name or USN..."
                    className="pl-10 pr-8 text-xs h-9 rounded-lg bg-background"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Single Session Search Input */}
            {selectedRecord && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                <Input
                  placeholder="Search student by name or USN..."
                  className="pl-10 text-xs h-9 rounded-lg"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>
            )}

            {/* Student Roster Lists */}
            {loadingDetails ? (
              <div className="py-16 flex flex-col justify-center items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">Aggregating student attendance records across all sessions...</p>
              </div>
            ) : selectedConsolidatedRecord ? (
              consolidatedViewMode === 'students' ? (
                /* VIEW 1: CLEAN CONSOLIDATED STUDENT SUMMARY TABLE WITH PAGINATION */
                <div className="space-y-3">
                  <div className="border rounded-xl overflow-hidden bg-card/50 shadow-xs">
                    <div className="overflow-x-auto custom-scrollbar">
                      <Table className="min-w-[620px] w-full">
                        <TableHeader className={theme === 'dark' ? 'bg-slate-900/90' : 'bg-slate-100/90'}>
                          <TableRow>
                            <TableHead className="text-xs font-semibold whitespace-nowrap min-w-[150px] pl-4">
                              Student Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold font-mono whitespace-nowrap min-w-[110px]">
                              USN
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-center whitespace-nowrap min-w-[90px]">
                              Attended
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-center whitespace-nowrap min-w-[80px]">
                              Absent
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-center whitespace-nowrap min-w-[95px]">
                              Attendance %
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-center whitespace-nowrap min-w-[90px]">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-center whitespace-nowrap min-w-[110px] pr-4">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedConsolidatedStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                                {modalSearch ? `No students found matching "${modalSearch}"` : "No enrolled students found."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedConsolidatedStudents.map((s) => (
                              <TableRow key={s.usn || s.id} className="hover:bg-muted/40 transition-colors">
                                <TableCell className="text-xs font-semibold whitespace-nowrap pl-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                      {(s.name || "S").charAt(0).toUpperCase()}
                                    </div>
                                    <span>{s.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0.5">
                                    {s.usn || "--"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  {s.classes_attended} / {s.classes_held}
                                </TableCell>
                                <TableCell className="text-xs text-center font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                  {s.classes_absent}
                                </TableCell>
                                <TableCell className="text-xs text-center font-bold whitespace-nowrap">
                                  <span className={
                                    s.attendance_percentage >= 75 ? "text-emerald-600 dark:text-emerald-400 font-extrabold" :
                                    s.attendance_percentage >= 60 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"
                                  }>
                                    {s.attendance_percentage}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-center whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold ${
                                      s.attendance_percentage >= 75
                                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                        : "border-rose-500/30 text-rose-600 bg-rose-500/10"
                                    }`}
                                  >
                                    {s.attendance_percentage >= 75 ? "Eligible" : "Shortage"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center whitespace-nowrap pr-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedStudentForTimeline(s);
                                      setStudentTimelineModalOpen(true);
                                    }}
                                    className="h-7 text-[11px] px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer font-medium shadow-2xs"
                                  >
                                    <History className="w-3 h-3" />
                                    <span>View Timeline</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Pagination Controls Bar */}
                  {filteredConsolidatedStudents.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs">
                      <div className="text-muted-foreground text-[11px] sm:text-xs">
                        Showing <span className="font-semibold text-foreground">{(consolidatedPage - 1) * consolidatedPageSize + 1}</span> to{" "}
                        <span className="font-semibold text-foreground">{Math.min(consolidatedPage * consolidatedPageSize, filteredConsolidatedStudents.length)}</span> of{" "}
                        <span className="font-semibold text-foreground">{filteredConsolidatedStudents.length}</span> students
                        {modalSearch && ` (filtered from ${consolidatedStudents.length})`}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="text-[11px]">Rows:</span>
                          <select
                            value={consolidatedPageSize}
                            onChange={(e) => {
                              setConsolidatedPageSize(Number(e.target.value));
                              setConsolidatedPage(1);
                            }}
                            className={`h-7 px-2 text-xs rounded-md border font-medium cursor-pointer ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsolidatedPage(1)}
                            disabled={consolidatedPage === 1}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="First Page"
                          >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsolidatedPage(prev => Math.max(1, prev - 1))}
                            disabled={consolidatedPage === 1}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Previous Page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>

                          <span className="px-2 text-xs font-semibold text-foreground">
                            Page {consolidatedPage} of {totalConsolidatedPages}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsolidatedPage(prev => Math.min(totalConsolidatedPages, prev + 1))}
                            disabled={consolidatedPage >= totalConsolidatedPages}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Next Page"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsolidatedPage(totalConsolidatedPages)}
                            disabled={consolidatedPage >= totalConsolidatedPages}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Last Page"
                          >
                            <ChevronsRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW 2: DAILY SESSION LOG (INSPECT BY DATE) */
                <div className="space-y-4">
                  {/* Session Chips Carousel */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground">Select a Class Date:</p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {consolidatedSessions.map((session, idx) => {
                        const isSelected = (selectedInspectorSessionId ?? consolidatedSessions[0]?.record_id) === session.record_id;
                        const presCount = session.present_count ?? (sessionRostersMap[session.record_id]?.present.length ?? 0);
                        const absCount = session.absent_count ?? (sessionRostersMap[session.record_id]?.absent.length ?? 0);
                        const turnoutPct = session.turnout_percentage ?? (presCount + absCount > 0 ? Math.round((presCount / (presCount + absCount)) * 100) : 0);

                        return (
                          <button
                            key={session.record_id}
                            type="button"
                            onClick={() => loadSessionRoster(session.record_id)}
                            className={`flex flex-col text-left px-3.5 py-2.5 rounded-xl border transition-all shrink-0 min-w-[135px] cursor-pointer ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary'
                                : 'bg-card hover:bg-muted/50 border-border text-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                Class {idx + 1}
                              </span>
                              <span className={`text-[10px] font-bold ${
                                turnoutPct >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                                turnoutPct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {turnoutPct}%
                              </span>
                            </div>
                            <span className="text-xs font-bold mt-1">{session.displayShort}</span>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                              <span>{session.dayOfWeek}</span>
                              <span className="font-medium text-foreground">{presCount}P / {absCount}A</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Session Present / Absent Roster Card */}
                  {(() => {
                    const activeSessionId = selectedInspectorSessionId ?? consolidatedSessions[0]?.record_id;
                    const activeSession = consolidatedSessions.find(s => s.record_id === activeSessionId) || consolidatedSessions[0];
                    const roster = activeSession ? (sessionRostersMap[activeSession.record_id] || { present: [], absent: [] }) : { present: [], absent: [] };
                    const isLoaded = Boolean(activeSession && sessionRostersMap[activeSession.record_id]);

                    const filteredPresent = roster.present.filter(s =>
                      s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      s.usn.toLowerCase().includes(modalSearch.toLowerCase())
                    );
                    const filteredAbsent = roster.absent.filter(s =>
                      s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      s.usn.toLowerCase().includes(modalSearch.toLowerCase())
                    );

                    const presCount = activeSession?.present_count ?? roster.present.length;
                    const absCount = activeSession?.absent_count ?? roster.absent.length;
                    const turnoutPct = activeSession?.turnout_percentage ?? (presCount + absCount > 0 ? Math.round((presCount / (presCount + absCount)) * 100) : 0);

                    return (
                      <div className="space-y-3">
                        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              <CalendarDays className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {activeSession?.formattedDate} ({activeSession?.dayOfWeek})
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Class session record for {selectedConsolidatedRecord.subject} {selectedConsolidatedRecord.section ? `• Sec ${selectedConsolidatedRecord.section}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Present: {presCount}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              Absent: {absCount}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-bold">
                              Turnout: {turnoutPct}%
                            </span>
                          </div>
                        </div>

                        {loadingSessionRoster && !isLoaded ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-xs text-muted-foreground">Loading student attendance for {activeSession?.formattedDate}...</p>
                          </div>
                        ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Present Column */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Present Students
                              </h4>
                              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                {filteredPresent.length}
                              </span>
                            </div>

                            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                              {filteredPresent.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic p-3 text-center">No students present match filter.</p>
                              ) : (
                                filteredPresent.map((s) => (
                                  <div
                                    key={s.id || s.usn}
                                    className={`p-2.5 rounded-lg border flex justify-between items-center transition-all ${
                                      theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold">{s.name}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-mono text-muted-foreground">{s.usn}</span>
                                        {s.subject_percentage !== undefined && (
                                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                            Overall: {s.subject_present ?? 0}/{s.subject_total ?? 0} ({s.subject_percentage}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Present
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Absent Column */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                Absent Students
                              </h4>
                              <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                                {filteredAbsent.length}
                              </span>
                            </div>

                            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                              {filteredAbsent.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic p-3 text-center">No students absent match filter.</p>
                              ) : (
                                filteredAbsent.map((s) => (
                                  <div
                                    key={s.id || s.usn}
                                    className={`p-2.5 rounded-lg border flex justify-between items-center transition-all ${
                                      theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold">{s.name}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-mono text-muted-foreground">{s.usn}</span>
                                        {s.subject_percentage !== undefined && (
                                          <span className={`text-[10px] font-semibold ${
                                            (s.subject_percentage ?? 0) >= 75 ? "text-emerald-600" :
                                            (s.subject_percentage ?? 0) >= 60 ? "text-amber-600" : "text-rose-600"
                                          }`}>
                                            Overall: {s.subject_present ?? 0}/{s.subject_total ?? 0} ({s.subject_percentage}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                      Absent
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )
            ) : (
              /* SINGLE SESSION STUDENT LISTS */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Present Column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Present Students
                    </h4>
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                      {presentList.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {presentList.filter(s =>
                      s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      s.usn.toLowerCase().includes(modalSearch.toLowerCase())
                    ).map((s) => (
                      <div
                        key={s.id || s.usn}
                        className={`p-2.5 rounded-lg border flex justify-between items-center transition-all ${
                          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{s.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">{s.usn}</span>
                            {s.subject_percentage !== undefined && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Total: {s.subject_present ?? 0}/{s.subject_total ?? 0} ({s.subject_percentage}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 rounded-full text-rose-500 hover:bg-rose-50 cursor-pointer"
                            onClick={() => {
                              setPresentList(prev => prev.filter(p => p.id !== s.id));
                              setAbsentList(prev => [...prev, s]);
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Absent Column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Absent Students
                    </h4>
                    <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full">
                      {absentList.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {absentList.filter(s =>
                      s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      s.usn.toLowerCase().includes(modalSearch.toLowerCase())
                    ).map((s) => (
                      <div
                        key={s.id || s.usn}
                        className={`p-2.5 rounded-lg border flex justify-between items-center transition-all ${
                          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{s.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">{s.usn}</span>
                            {s.subject_percentage !== undefined && (
                              <span className={`text-[10px] font-semibold ${
                                (s.subject_percentage ?? 0) >= 75 ? "text-emerald-600" :
                                (s.subject_percentage ?? 0) >= 60 ? "text-amber-600" : "text-rose-600"
                              }`}>
                                Total: {s.subject_present ?? 0}/{s.subject_total ?? 0} ({s.subject_percentage}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 rounded-full text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            onClick={() => {
                              setAbsentList(prev => prev.filter(p => p.id !== s.id));
                              setPresentList(prev => [...prev, s]);
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">
              {selectedConsolidatedRecord
                ? `Enrolled Students: ${consolidatedStudents.length} across ${selectedConsolidatedRecord.total_sessions} ${selectedConsolidatedRecord.total_sessions === 1 ? 'session' : 'sessions'}`
                : `Total strength: ${presentList.length + absentList.length} students`}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedConsolidatedRecord ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailsModalOpen(false)}
                  className="text-xs h-8 px-4 cursor-pointer"
                >
                  Close
                </Button>
              ) : isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={savingEdit}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Cancel Edit
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={loadingDetails}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Edit Attendance
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportSessionExcel}
                    disabled={exportingExcel}
                    className="text-xs h-8 bg-primary text-white cursor-pointer"
                  >
                    {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />}
                    Export Excel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* INDIVIDUAL STUDENT ATTENDANCE TIMELINE DIALOG */}
      <Dialog open={studentTimelineModalOpen} onOpenChange={setStudentTimelineModalOpen}>
        <DialogContent className={`w-[95vw] max-w-[95vw] sm:max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl ${
          theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <DialogHeader className={`p-4 sm:p-5 pr-14 sm:pr-16 border-b shrink-0 ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80 backdrop-blur-sm'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    Student Attendance Timeline
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Detailed session-by-session participation record
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportStudentTimelinePDF}
                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                title="Export Student Timeline to PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
          </DialogHeader>

          {selectedStudentForTimeline && (
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Student Header Card */}
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedStudentForTimeline.name || "S").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedStudentForTimeline.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">USN: {selectedStudentForTimeline.usn || "--"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-1 font-semibold ${
                      selectedStudentForTimeline.attendance_percentage >= 75
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                        : selectedStudentForTimeline.attendance_percentage >= 60
                        ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                        : "border-rose-500/30 text-rose-600 bg-rose-500/10"
                    }`}
                  >
                    {selectedStudentForTimeline.attendance_percentage}% • {selectedStudentForTimeline.attendance_percentage >= 75 ? "Eligible" : "Shortage"}
                  </Badge>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl border bg-card text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Sessions</p>
                  <p className="text-base sm:text-lg font-bold mt-0.5 text-foreground">{selectedStudentForTimeline.classes_held}</p>
                </div>
                <div className="p-3 rounded-xl border bg-card text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Attended</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedStudentForTimeline.classes_attended}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-card text-center">
                  <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Absent</p>
                  <p className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {selectedStudentForTimeline.classes_absent}
                  </p>
                </div>
              </div>

              {/* Chronological Session List */}
              <div className="border rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3 bg-muted/40 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <span className="text-xs font-bold text-foreground">Session Log ({consolidatedSessions.length} Classes)</span>
                    <p className="text-[10px] text-muted-foreground">Click any attendance badge below to toggle between Present and Absent</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">Sorted chronologically</span>
                </div>
                <div className="divide-y max-h-72 overflow-y-auto custom-scrollbar">
                  {consolidatedSessions.map((session, idx) => {
                    const status = selectedStudentForTimeline.session_status?.[session.record_id] || (
                      sessionRostersMap[session.record_id]?.present.some(p => (p.usn && selectedStudentForTimeline.usn && p.usn.trim().toUpperCase() === selectedStudentForTimeline.usn.trim().toUpperCase()) || p.id === selectedStudentForTimeline.id)
                        ? "present"
                        : sessionRostersMap[session.record_id]?.absent.some(a => (a.usn && selectedStudentForTimeline.usn && a.usn.trim().toUpperCase() === selectedStudentForTimeline.usn.trim().toUpperCase()) || a.id === selectedStudentForTimeline.id)
                        ? "absent"
                        : undefined
                    );
                    const isToggling = togglingSessionId === session.record_id;

                    return (
                      <div key={session.record_id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {session.formattedDate}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              {session.dayOfWeek && <span>{session.dayOfWeek}</span>}
                              {session.section && <span>• Sec {session.section}</span>}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isToggling ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground animate-pulse border border-border">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              <span>Updating...</span>
                            </div>
                          ) : status === "present" ? (
                            <button
                              type="button"
                              onClick={() => handleToggleTimelineAttendance(session.record_id, "present")}
                              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/15 hover:text-rose-600 hover:border-rose-500/30 transition-all cursor-pointer shadow-2xs"
                              title="Click to change to Absent"
                            >
                              <CheckCircle className="w-3.5 h-3.5 group-hover:hidden" />
                              <XCircle className="w-3.5 h-3.5 hidden group-hover:inline text-rose-600" />
                              <span className="group-hover:hidden">Present</span>
                              <span className="hidden group-hover:inline">Mark Absent</span>
                            </button>
                          ) : status === "absent" ? (
                            <button
                              type="button"
                              onClick={() => handleToggleTimelineAttendance(session.record_id, "absent")}
                              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-emerald-500/15 hover:text-emerald-600 hover:border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
                              title="Click to change to Present"
                            >
                              <XCircle className="w-3.5 h-3.5 group-hover:hidden" />
                              <CheckCircle className="w-3.5 h-3.5 hidden group-hover:inline text-emerald-600" />
                              <span className="group-hover:hidden">Absent</span>
                              <span className="hidden group-hover:inline">Mark Present</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleTimelineAttendance(session.record_id, "not_recorded")}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted hover:bg-emerald-500/15 hover:text-emerald-600 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer"
                              title="Click to mark Present"
                            >
                              <span>-- Not Recorded</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="p-3.5 border-t bg-muted/20 flex justify-end shrink-0">
            <Button size="sm" variant="outline" onClick={() => setStudentTimelineModalOpen(false)} className="text-xs h-8 px-4 cursor-pointer">
              Close Timeline
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AttendanceRecords;