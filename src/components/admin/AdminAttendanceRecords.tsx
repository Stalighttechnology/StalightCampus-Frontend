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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  BarChart3,
  TrendingUp,
  Layers,
  GraduationCap,
  AlertTriangle,
  Building2,
  Award,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  Filter,
  History,
  CalendarClock
} from "lucide-react";
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
import { format, subDays, startOfMonth } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminAttendanceRecordsWithSummary,
  getAdminAttendanceRecordDetails,
  getAdminAttendanceFilters,
  getAdminStudentAttendanceSummary,
  AdminAttendanceRecord,
  AdminAttendanceFiltersResponse
} from "@/utils/admin_api";
import { StudentAttendanceSummaryItem, FacultyAttendanceInfo } from "@/utils/hod_api";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
  LabelList
} from "recharts";

const getShortBranchName = (name: string): string => {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (lower.includes("artificial intelligence") || lower.includes("ai & ml") || lower.includes("aiml")) return "AI & ML";
  if (lower.includes("computer science")) return "CSE";
  if (lower.includes("electronics and comm") || lower.includes("electronics & comm") || lower.includes("ece")) return "ECE";
  if (lower.includes("information science") || lower.includes("ise")) return "ISE";
  if (lower.includes("mechanical")) return "MECH";
  if (lower.includes("civil")) return "CIVIL";
  if (lower.includes("electrical and electronics") || lower.includes("eee")) return "EEE";
  if (name.length > 22) return name.slice(0, 20) + "…";
  return name;
};

const getSemesterStartDate = (): Date => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = July
  const startMonth = currentMonth >= 6 ? 6 : 0;
  return new Date(now.getFullYear(), startMonth, 1);
};

const AdminAttendanceRecords: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecordsCount, setTotalRecordsCount] = useState<number>(0);

  // Mandatory Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");

  // Optional & Dependent Filters
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Student Register Records & Loading States
  const [students, setStudents] = useState<StudentAttendanceSummaryItem[]>([]);
  const [summaryStats, setSummaryStats] = useState<any | null>(null);
  const [facultyInfo, setFacultyInfo] = useState<FacultyAttendanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter Metadata
  const [filterMeta, setFilterMeta] = useState<AdminAttendanceFiltersResponse["data"] | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Analytics Graph View Toggle: "branch" | "batch" | "semester"
  const [chartView, setChartView] = useState<"branch" | "batch" | "semester">("branch");
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(true);
  const [analyticsTab, setAnalyticsTab] = useState<"cards" | "chart">("cards");

  // Details Modal State
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [recordDetails, setRecordDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Student Attendance Timeline Modal State
  const [selectedStudentForTimeline, setSelectedStudentForTimeline] = useState<StudentAttendanceSummaryItem | null>(null);
  const [studentTimelineModalOpen, setStudentTimelineModalOpen] = useState(false);
  const [sessionDateList, setSessionDateList] = useState<any[]>([]);

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
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 1. Initial Fetch of Filter Metadata (College-wide)
  const loadFilters = useCallback(async (branchId?: string) => {
    setLoadingFilters(true);
    try {
      const res = await getAdminAttendanceFilters(branchId);
      if (res.success && res.data) {
        setFilterMeta(res.data);
      }
    } catch (err) {
      console.error("Failed to load admin attendance filters", err);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // 2. Cascading when Branch changes: reload filters for that branch & reset dependents
  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setSelectedSemester("");
    setSelectedSection("");
    setSelectedSubject("");
    setPage(1);
    setStudents([]);
    setSummaryStats(null);
    setFacultyInfo(null);
    setTotalRecordsCount(0);
    loadFilters(branchId);
  };

  // 3. Cascading when Semester changes: reset section & subject
  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemester(semesterId);
    setSelectedSection("");
    setSelectedSubject("");
    setPage(1);
  };

  // 4. Cascading when Batch changes
  const handleBatchChange = (batchId: string) => {
    setSelectedBatch(batchId);
    setPage(1);
  };

  // Computed options filtered by active branch & semester
  const availableBranches = useMemo(() => {
    return filterMeta?.branches || [];
  }, [filterMeta]);

  const availableBatches = useMemo(() => {
    return filterMeta?.batches || [];
  }, [filterMeta]);

  const availableSemesters = useMemo(() => {
    if (!filterMeta?.semesters) return [];
    if (!selectedBranch) return filterMeta.semesters;
    return filterMeta.semesters.filter(
      s => !s.branch_id || String(s.branch_id) === String(selectedBranch)
    );
  }, [filterMeta, selectedBranch]);

  const availableSections = useMemo(() => {
    if (!filterMeta?.sections || !selectedSemester) return [];
    return filterMeta.sections.filter(
      sec => String(sec.semester_id) === String(selectedSemester)
    );
  }, [filterMeta, selectedSemester]);

  const availableSubjects = useMemo(() => {
    if (!filterMeta?.subjects || !selectedSemester) return [];
    return filterMeta.subjects.filter(
      sub => String(sub.semester_id) === String(selectedSemester)
    );
  }, [filterMeta, selectedSemester]);

  // Validation: Branch, Semester, Section, Subject, and Date Range are mandatory
  const isFilterComplete = Boolean(
    selectedBranch && selectedSemester && selectedSection && selectedSubject && selectedSubject !== "all" && startDate && endDate
  );

  // Fetch Student Attendance Register
  const fetchRecords = useCallback(async () => {
    if (!selectedBranch || !selectedSemester || !selectedSection || !selectedSubject || selectedSubject === "all" || !startDate || !endDate) {
      setStudents([]);
      setSummaryStats(null);
      setFacultyInfo(null);
      setTotalRecordsCount(0);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const today = new Date();
      const effectiveEndDate = endDate > today ? today : endDate;

      const res = await getAdminStudentAttendanceSummary({
        branch_id: selectedBranch,
        semester_id: selectedSemester,
        section_id: selectedSection,
        batch_id: selectedBatch !== "all" ? selectedBatch : undefined,
        subject_id: selectedSubject,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(effectiveEndDate, "yyyy-MM-dd"),
        search: debouncedSearch.trim() || undefined
      });

      if (res.success && res.data) {
        setStudents(res.data.students || []);
        setSessionDateList(res.data.sessions || []);
        setSummaryStats(res.data.summary || null);
        setFacultyInfo(res.data.faculty_info || null);
        setTotalRecordsCount(res.data.students ? res.data.students.length : 0);
      } else {
        setError(res.message || "Failed to fetch student attendance records");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch student attendance records");
    } finally {
      setLoading(false);
    }
  }, [
    selectedBranch,
    selectedSemester,
    selectedSection,
    startDate,
    endDate,
    selectedBatch,
    selectedSubject,
    debouncedSearch
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Paginated Students slice
  const paginatedStudents = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return students.slice(startIdx, startIdx + pageSize);
  }, [students, page, pageSize]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedBranch("");
    setSelectedSemester("");
    setSelectedSection("");
    setSelectedBatch("all");
    setSelectedSubject("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
    setStudents([]);
    setSessionDateList([]);
    setSummaryStats(null);
    setFacultyInfo(null);
    setTotalRecordsCount(0);
    loadFilters();
  };

  // Date Presets (Strictly capped at today)
  const applyDatePreset = (preset: "semester" | "30days" | "today" | "yesterday" | "week" | "month" | "all") => {
    const now = new Date();
    if (preset === "semester") {
      setStartDate(getSemesterStartDate());
      setEndDate(now);
    } else if (preset === "30days") {
      setStartDate(subDays(now, 30));
      setEndDate(now);
    } else if (preset === "today") {
      setStartDate(now);
      setEndDate(now);
    } else if (preset === "yesterday") {
      const y = subDays(now, 1);
      setStartDate(y);
      setEndDate(y);
    } else if (preset === "week") {
      setStartDate(subDays(now, 7));
      setEndDate(now);
    } else if (preset === "month") {
      setStartDate(startOfMonth(now));
      setEndDate(now);
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
    setPage(1);
    setIsDatePickerOpen(false);
  };

  // Open Details Modal
  const handleViewDetails = async (recordId: number) => {
    setSelectedRecordId(recordId);
    setLoadingDetails(true);
    setModalSearch("");
    setDetailsModalOpen(true);
    try {
      const sDate = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
      const eDate = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
      const res = await getAdminAttendanceRecordDetails(recordId, sDate, eDate);
      if (res.success && res.data) {
        setRecordDetails(res.data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: res.message || "Failed to load record details"
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Failed to load record details"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Export Excel Functionality for Student Attendance Register
  const handleExportExcel = () => {
    if (!students.length) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "No student records to export. Please choose all required filters first."
      });
      return;
    }

    const branchName = availableBranches.find(b => String(b.id) === selectedBranch)?.name || "College";
    const subjectTitle = facultyInfo?.subject_name
      ? `${facultyInfo.subject_name}${facultyInfo.subject_code ? ` (${facultyInfo.subject_code})` : ""}`
      : "Subject Attendance";
    const assignedFaculty = facultyInfo?.assigned_faculty_name || "Not Assigned";
    const markedByFaculty = facultyInfo?.marked_by_faculty_name || "None";

    const exportRows = students.map((s, index) => ({
      "Sl No": index + 1,
      "Student Name": s.name,
      "USN / Roll No": s.usn,
      "Branch": s.branch || branchName,
      "Batch": s.batch || "--",
      "Semester": s.semester ? `Sem ${s.semester}` : "--",
      "Section": s.section || "--",
      "Subject": subjectTitle,
      "Assigned Faculty": assignedFaculty,
      "Marked By Faculty": markedByFaculty,
      "Classes Conducted": s.conducted_classes,
      "Classes Attended (Present)": s.attended_classes,
      "Classes Absent": s.absent_classes,
      "Attendance %": `${s.attendance_percentage}%`,
      "Eligibility Status": s.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [
      { wch: 8 },  // Sl No
      { wch: 28 }, // Student Name
      { wch: 18 }, // USN
      { wch: 18 }, // Branch
      { wch: 14 }, // Batch
      { wch: 12 }, // Semester
      { wch: 10 }, // Section
      { wch: 26 }, // Subject
      { wch: 24 }, // Assigned Faculty
      { wch: 24 }, // Marked By Faculty
      { wch: 18 }, // Classes Conducted
      { wch: 22 }, // Classes Attended
      { wch: 16 }, // Classes Absent
      { wch: 16 }, // Attendance %
      { wch: 18 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Attendance");

    const dateFilterStr = startDate && endDate
      ? `${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}`
      : format(new Date(), "yyyy-MM-dd");
    const safeBranch = branchName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeSubject = (facultyInfo?.subject_code || facultyInfo?.subject_name || "Subject").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(workbook, `${safeBranch}_${safeSubject}_Student_Attendance_${dateFilterStr}.xlsx`);

    toast({
      title: "Export Successful",
      description: `${students.length} student attendance records exported to Excel.`
    });
  };

  // Export PDF Functionality for Student Attendance Register (Professional Institutional Layout)
  const handleExportPDF = async () => {
    if (!students.length) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "No student records to export. Please choose all required filters first."
      });
      return;
    }

    // Dynamic Organization Name and Logo
    let orgName = "STALIGHT CAMPUS ERP";
    let orgLogoUrl = "";
    try {
      const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        orgName = u.org_name || u.organization?.name || localStorage.getItem("org_name") || "STALIGHT CAMPUS ERP";
        orgLogoUrl = u.org_logo || u.organization?.logo_url || u.organization?.logo || localStorage.getItem("org_logo") || "";
      } else {
        orgName = localStorage.getItem("org_name") || "STALIGHT CAMPUS ERP";
        orgLogoUrl = localStorage.getItem("org_logo") || "";
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

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const margin = 14;

    const branchName = availableBranches.find(b => String(b.id) === selectedBranch)?.name || "Department";
    const subjObj = availableSubjects.find(s => String(s.id) === selectedSubject);
    const subjectName = facultyInfo?.subject_name || subjObj?.name || "Subject";
    const subjectCode = facultyInfo?.subject_code || subjObj?.subject_code || "";
    const subjectTitle = subjectCode ? `${subjectName} (${subjectCode})` : subjectName;
    const assignedFaculty = facultyInfo?.assigned_faculty_name || (facultyInfo?.assigned_faculty && facultyInfo.assigned_faculty.length > 0 ? facultyInfo.assigned_faculty.join(", ") : "Not Assigned");
    const markedByFaculty = facultyInfo?.marked_by_faculty_name || (facultyInfo?.marked_by_faculty && facultyInfo.marked_by_faculty.length > 0 ? facultyInfo.marked_by_faculty.join(", ") : "None (No sessions recorded)");
    
    const semObj = availableSemesters.find(s => String(s.id) === selectedSemester);
    const semName = semObj ? `Semester ${semObj.number}` : selectedSemester ? `Semester ${selectedSemester}` : "--";
    const secObj = availableSections.find(s => String(s.id) === selectedSection);
    const secName = secObj ? `Section ${secObj.name}` : selectedSection ? `Section ${selectedSection}` : "--";
    const batchName = selectedBatch && selectedBatch !== "all" ? (availableBatches.find(b => String(b.id) === selectedBatch)?.name || selectedBatch) : "All Batches";

    const dateFilterStr = startDate && endDate
      ? `${format(startDate, "dd-MM-yyyy")} to ${format(endDate, "dd-MM-yyyy")}`
      : startDate ? `From ${format(startDate, "dd-MM-yyyy")}` : endDate ? `Up to ${format(endDate, "dd-MM-yyyy")}` : "All Dates Recorded";

    // 1. Top Decorative Brand Bar
    const headerHeight = 24;
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    doc.setFillColor(99, 102, 241); // Indigo Accent Stripe
    doc.rect(0, headerHeight, pageWidth, 2, "F");

    let textStartX = margin;
    if (logoInfo) {
      const boxSize = 17;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 3.5, boxSize, boxSize, 2, 2, "F");
      const aspect = logoInfo.width / (logoInfo.height || 1);
      let imgW = 14;
      let imgH = 14;
      if (aspect > 1) {
        imgH = 14 / aspect;
      } else {
        imgW = 14 * aspect;
      }
      const imgX = margin + (boxSize - imgW) / 2;
      const imgY = 3.5 + (boxSize - imgH) / 2;
      try {
        doc.addImage(logoInfo.dataUrl, "PNG", imgX, imgY, imgW, imgH);
        textStartX = margin + boxSize + 4;
      } catch {
        textStartX = margin;
      }
    }

    // Brand Title & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(orgName.toUpperCase(), textStartX, 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text("INSTITUTIONAL ACADEMIC & ATTENDANCE MANAGEMENT SYSTEM", textStartX, 17);

    // Right Header Text (Report Title & Date)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("STUDENT ATTENDANCE REGISTER", pageWidth - margin, 10.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, pageWidth - margin, 17, { align: "right" });

    // 2. Metadata Info Box (Clean 2-column card)
    const boxY = 30;
    const boxHeight = 22;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, boxY, pageWidth - (margin * 2), boxHeight, 2, 2, "FD");

    // Left Column in Box
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text("Subject / Course:", margin + 4, boxY + 6);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont("helvetica", "bold");
    doc.text(subjectTitle, margin + 36, boxY + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Department / Branch:", margin + 4, boxY + 12);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(branchName, margin + 36, boxY + 12);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Class & Section:", margin + 4, boxY + 18);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${semName} - ${secName}   |   Batch: ${batchName}`, margin + 36, boxY + 18);

    // Right Column in Box
    const col2X = margin + 138;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Assigned Faculty:", col2X, boxY + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(assignedFaculty, col2X + 42, boxY + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Attendance Marked By:", col2X, boxY + 12);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(markedByFaculty, col2X + 42, boxY + 12);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Date Range:", col2X, boxY + 18);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(dateFilterStr, col2X + 42, boxY + 18);

    // 3. Summary Metric Chips / KPI Strip
    const kpiY = boxY + boxHeight + 4;
    const kpiHeight = 12;
    const kpiCardWidth = (pageWidth - (margin * 2) - 9) / 4;

    const totalStudents = summaryStats?.total_students ?? students.length;
    const totalSessions = summaryStats?.total_sessions ?? (students[0]?.conducted_classes || 0);
    const avgTurnout = summaryStats?.avg_attendance ?? (students.length > 0 ? Math.round((students.reduce((a, b) => a + b.attendance_percentage, 0) / students.length) * 10) / 10 : 0);
    const eligibleCount = summaryStats?.eligible_count ?? students.filter(s => s.status === 'Eligible').length;

    const kpis = [
      { label: "Total Students", val: `${totalStudents}`, color: [59, 130, 246] },
      { label: "Classes Conducted", val: `${totalSessions} Sessions`, color: [99, 102, 241] },
      { label: "Average Turnout", val: `${avgTurnout}%`, color: [16, 185, 129] },
      { label: "Compliance (>=75%)", val: `${eligibleCount} / ${totalStudents} (${totalStudents > 0 ? Math.round((eligibleCount / totalStudents) * 100) : 0}%)`, color: [147, 51, 234] },
    ];

    kpis.forEach((kpi, idx) => {
      const cardX = margin + idx * (kpiCardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, kpiY, kpiCardWidth, kpiHeight, 1.5, 1.5, "FD");

      // Accent colored bar on left of each card
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(cardX, kpiY, 2.5, kpiHeight, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label.toUpperCase(), cardX + 5, kpiY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.val, cardX + 5, kpiY + 9.5);
    });

    // 4. Data Table with AutoTable
    const tableStartY = kpiY + kpiHeight + 5;
    const tableRows = students.map((s, index) => [
      index + 1,
      s.name,
      s.usn || "--",
      s.branch || branchName,
      s.batch || "--",
      s.semester ? `Sem ${s.semester}` : "--",
      s.section || "--",
      s.conducted_classes,
      s.attended_classes,
      s.absent_classes,
      `${s.attendance_percentage}%`,
      s.status
    ]);

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, bottom: 16 },
      head: [["#", "Student Name", "USN / Roll No", "Branch", "Batch", "Sem", "Sec", "Conducted", "Attended", "Absent", "Attendance %", "Status"]],
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate 50
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 7 },
        1: { halign: "left", cellWidth: 42, fontStyle: "bold" },
        2: { halign: "center", cellWidth: 26 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "center", cellWidth: 14 },
        6: { halign: "center", cellWidth: 14 },
        7: { halign: "center", cellWidth: 18 },
        8: { halign: "center", cellWidth: 18 },
        9: { halign: "center", cellWidth: 16 },
        10: { halign: "center", cellWidth: 22, fontStyle: "bold" },
        11: { halign: "center", cellWidth: 24 }
      },
      didDrawCell: (data: any) => {
        // Custom draw for status column with clean badge style
        if (data.section === "body" && data.column.index === 11) {
          const statusVal = String(tableRows[data.row.index]?.[11] || "");
          const isEligible = statusVal === "Eligible";
          const isWarning = statusVal === "Warning";
          const isNoClasses = statusVal === "No Classes";

          const bg = isEligible ? [236, 253, 245] : isWarning ? [254, 243, 199] : isNoClasses ? [241, 245, 249] : [254, 242, 242];
          const border = isEligible ? [167, 243, 208] : isWarning ? [253, 230, 138] : isNoClasses ? [203, 213, 225] : [254, 202, 202];
          const text = isEligible ? [5, 150, 105] : isWarning ? [217, 119, 6] : isNoClasses ? [100, 116, 139] : [220, 38, 38];

          const cell = data.cell;
          const badgeWidth = cell.width - 4;
          const badgeHeight = cell.height - 2.5;
          const badgeX = cell.x + 2;
          const badgeY = cell.y + 1.25;

          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.setDrawColor(border[0], border[1], border[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1, 1, "FD");

          doc.setTextColor(text[0], text[1], text[2]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text(
            statusVal,
            cell.x + cell.width / 2,
            cell.y + cell.height / 2 + 1,
            { align: "center" }
          );
          return false;
        }

        // Attendance % highlight
        if (data.section === "body" && data.column.index === 10) {
          const pctStr = String(tableRows[data.row.index]?.[10] || "0%");
          const numPct = parseFloat(pctStr);
          const cond = tableRows[data.row.index]?.[7];
          if (cond === 0 || cond === "0") {
            doc.setTextColor(100, 116, 139);
          } else if (numPct >= 75) {
            doc.setTextColor(5, 150, 105);
          } else if (numPct >= 60) {
            doc.setTextColor(217, 119, 6);
          } else {
            doc.setTextColor(220, 38, 38);
          }
        }
      },
      didDrawPage: (data: any) => {
        // Clean Footer on every page
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        const footerY = doc.internal.pageSize.getHeight() - 7;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`CONFIDENTIAL  •  ${orgName.toUpperCase()}  •  OFFICIAL INSTITUTIONAL ATTENDANCE REPORT`, margin, footerY);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
      }
    });

    const safeBranch = branchName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeSubj = (subjectCode || subjectName).replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Attendance_Register_${safeBranch}_${safeSubj}_${format(new Date(), "yyyy-MM-dd")}.pdf`);

    toast({
      title: "PDF Exported Successfully",
      description: `${students.length} student attendance records exported in official format.`
    });
  };

  // Export Lecture Attendance Breakdown Modal Excel
  const handleExportModalExcel = () => {
    if (!recordDetails) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "No lecture breakdown data available to export."
      });
      return;
    }

    const dateStr = recordDetails.date ? formatDateToDDMMYYYY(recordDetails.date) : "N/A";
    const className = `Sem ${recordDetails.semester || "--"} - Sec ${recordDetails.section || "--"}`;
    const subjectTitle = `${recordDetails.subject || "Subject"}${recordDetails.subject_code ? ` (${recordDetails.subject_code})` : ""}`;
    const facultyName = recordDetails.faculty_name || "--";
    const batchName = recordDetails.batch_name || "--";
    const branchName = recordDetails.branch || selectedBranchObj?.name || "--";
    const totalStudents = recordDetails.total_students ?? recordDetails.total_count ?? 0;
    const presentCount = recordDetails.present_count ?? 0;
    const absentCount = recordDetails.absent_count ?? 0;
    const sessionPct = recordDetails.present_percentage ?? 0;

    // Sheet 1: Comprehensive Lecture Breakdown Roster
    const headerRows: any[][] = [
      ["STALIGHT CAMPUS - LECTURE ATTENDANCE BREAKDOWN"],
      [],
      ["Session Date:", dateStr, "Class & Section:", className, "Academic Batch:", batchName],
      ["Subject:", subjectTitle, "Faculty:", facultyName, "Branch / Dept:", branchName],
      ["Total Students:", totalStudents, "Present Count:", presentCount, "Absent Count:", absentCount, "Session Attendance:", `${sessionPct}%`],
      [],
      [
        "Sl No",
        "Student Name",
        "USN / Roll No",
        "Session Attendance",
        "Attended Classes",
        "Absent Classes",
        "Total Classes Conducted",
        "Subject Attendance %",
        "Compliance Status"
      ]
    ];

    const presentStudents = recordDetails.present || [];
    const absentStudents = recordDetails.absent || [];

    const presentRows = presentStudents.map((s: any, idx: number) => {
      const attended = s.subject_present ?? 0;
      const total = s.subject_total ?? 0;
      const absent = s.subject_absent ?? (total >= attended ? total - attended : 0);
      const pctVal = s.subject_percentage !== undefined ? s.subject_percentage : (total > 0 ? Math.round((attended / total) * 1000) / 10 : 0);
      const compliance = pctVal >= 75 ? "Eligible (>=75%)" : pctVal >= 60 ? "Warning (<75%)" : "Critical Shortage (<60%)";

      return [
        idx + 1,
        s.name,
        s.usn,
        "PRESENT",
        attended,
        absent,
        total,
        `${pctVal}%`,
        compliance
      ];
    });

    const absentRows = absentStudents.map((s: any, idx: number) => {
      const attended = s.subject_present ?? 0;
      const total = s.subject_total ?? 0;
      const absent = s.subject_absent ?? (total >= attended ? total - attended : 0);
      const pctVal = s.subject_percentage !== undefined ? s.subject_percentage : (total > 0 ? Math.round((attended / total) * 1000) / 10 : 0);
      const compliance = pctVal >= 75 ? "Eligible (>=75%)" : pctVal >= 60 ? "Warning (<75%)" : "Critical Shortage (<60%)";

      return [
        presentStudents.length + idx + 1,
        s.name,
        s.usn,
        "ABSENT",
        attended,
        absent,
        total,
        `${pctVal}%`,
        compliance
      ];
    });

    const fullSheetData = [...headerRows, ...presentRows, ...absentRows];
    const wsAll = XLSX.utils.aoa_to_sheet(fullSheetData);

    wsAll["!cols"] = [
      { wch: 8 },  // Sl No
      { wch: 30 }, // Student Name
      { wch: 18 }, // USN
      { wch: 18 }, // Session Attendance
      { wch: 18 }, // Attended Classes
      { wch: 16 }, // Absent Classes
      { wch: 24 }, // Total Classes Conducted
      { wch: 22 }, // Subject Attendance %
      { wch: 26 }  // Compliance Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsAll, "Full Lecture Roster");

    // Sheet 2: Absentees Only
    if (absentStudents.length > 0) {
      const absenteesHeaderRows: any[][] = [
        ["STALIGHT CAMPUS - SESSION ABSENTEES LIST"],
        [],
        ["Session Date:", dateStr, "Class:", className, "Academic Batch:", batchName],
        ["Subject:", subjectTitle, "Faculty:", facultyName, "Total Absentees:", absentCount],
        [],
        [
          "Sl No",
          "Student Name",
          "USN / Roll No",
          "Session Status",
          "Attended Classes",
          "Absent Classes",
          "Total Classes",
          "Subject Attendance %",
          "Action / Remedial Follow-up"
        ]
      ];

      const absenteesListRows = absentStudents.map((s: any, idx: number) => {
        const attended = s.subject_present ?? 0;
        const total = s.subject_total ?? 0;
        const absent = s.subject_absent ?? (total >= attended ? total - attended : 0);
        const pctVal = s.subject_percentage !== undefined ? s.subject_percentage : (total > 0 ? Math.round((attended / total) * 1000) / 10 : 0);
        const actionReq = pctVal < 60 ? "Immediate Parent Contact (<60%)" : pctVal < 75 ? "Warning Letter Issued (<75%)" : "Counseling & Regular Follow-up";

        return [
          idx + 1,
          s.name,
          s.usn,
          "ABSENT",
          attended,
          absent,
          total,
          `${pctVal}%`,
          actionReq
        ];
      });

      const wsAbsentees = XLSX.utils.aoa_to_sheet([...absenteesHeaderRows, ...absenteesListRows]);
      wsAbsentees["!cols"] = [
        { wch: 8 },  // Sl No
        { wch: 30 }, // Student Name
        { wch: 18 }, // USN
        { wch: 16 }, // Session Status
        { wch: 18 }, // Attended Classes
        { wch: 16 }, // Absent Classes
        { wch: 16 }, // Total Classes
        { wch: 22 }, // Subject Attendance %
        { wch: 32 }  // Action / Remedial Follow-up
      ];
      XLSX.utils.book_append_sheet(workbook, wsAbsentees, "Absentees List");
    }

    const safeSubject = (recordDetails.subject_code || recordDetails.subject || "Subject").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDate = dateStr.replace(/[^a-zA-Z0-9_-]/g, "-");
    const safeClass = `Sem${recordDetails.semester || ""}_Sec${recordDetails.section || ""}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Lecture_Attendance_${safeSubject}_${safeClass}_${safeDate}.xlsx`;

    XLSX.writeFile(workbook, filename);

    toast({
      title: "Excel Exported Successfully",
      description: `Exported ${totalStudents} students (${presentCount} present, ${absentCount} absent) to ${filename}`
    });
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
    doc.text("INSTITUTIONAL ATTENDANCE - STUDENT TIMELINE REPORT", textStartX, 18.5);

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

    const subjectName = facultyInfo?.subject_name || availableSubjects.find((s) => String(s.id) === selectedSubject)?.name || "Subject";
    const subjectCode = facultyInfo?.subject_code || availableSubjects.find((s) => String(s.id) === selectedSubject)?.subject_code || "";
    doc.text(`Subject: ${subjectName} ${subjectCode ? `(${subjectCode})` : ""}`, margin + 4, startY + 20);

    const classStr = `Sem ${selectedStudentForTimeline.semester ?? selectedSemester ?? "--"} - Sec ${selectedStudentForTimeline.section ?? selectedSection ?? "--"}`;
    const batchStr = selectedStudentForTimeline.batch || (selectedBatch !== "all" ? filterMeta?.batches.find(b => String(b.id) === selectedBatch)?.name : "All Batches") || "--";
    const branchStr = selectedStudentForTimeline.branch || filterMeta?.branches.find(b => String(b.id) === selectedBranch)?.name || "Department";
    doc.text(`Class: ${classStr}  |  Batch: ${batchStr}  |  Branch: ${branchStr}`, margin + 4, startY + 26);

    const dateRangeStr = startDate ? `${format(startDate, "dd-MM-yyyy")} to ${format(endDate || startDate, "dd-MM-yyyy")}` : "All Recorded Sessions";
    doc.text(`Duration: ${dateRangeStr}`, margin + 4, startY + 32);

    // Right Side Stats Box
    const statBoxX = pageWidth - margin - 58;
    const isEligible = (selectedStudentForTimeline.attendance_percentage ?? 0) >= 75;
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
    doc.text(`Held: ${selectedStudentForTimeline.conducted_classes}  |  Attended: ${selectedStudentForTimeline.attended_classes}  |  Absent: ${selectedStudentForTimeline.absent_classes}`, statBoxX + 27, startY + 24, { align: "center" });

    // Table Data
    const tableHeaders = ["#", "Date", "Day", "Section", "Marked By / Faculty", "Status"];
    const tableRows = sessionDateList.map((session, idx) => {
      const status = selectedStudentForTimeline.session_status?.[session.id] || selectedStudentForTimeline.session_status?.[String(session.id)];
      const isPres = status === "present";
      const isAbs = status === "absent";
      const statusText = isPres ? "PRESENT" : isAbs ? "ABSENT" : "NOT RECORDED";

      return [
        `#${idx + 1}`,
        session.formatted_date || session.date || "--",
        session.day_of_week || "--",
        `Sec ${session.section || selectedStudentForTimeline.section || "--"}`,
        session.faculty_name || facultyInfo?.marked_by_faculty_name || "--",
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

  // Pagination Helpers
  const totalPages = Math.max(1, Math.ceil((students.length || totalRecordsCount || 0) / pageSize));
  const startItemIndex = totalRecordsCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItemIndex = Math.min(page * pageSize, totalRecordsCount);

  // Generate pagination range with ellipses (e.g., [1, 2, '...', 9])
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) {
      if (i > 1 && i < totalPages) range.push(i);
    }
    if (right < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return range;
  }, [page, totalPages]);

  // Chart Data Processing
  const chartData = useMemo(() => {
    if (!filterMeta) return [];
    if (chartView === "branch") {
      return (filterMeta.branch_stats || []).map(b => ({
        id: String(b.branch_id),
        name: b.branch_name,
        shortName: getShortBranchName(b.branch_name),
        percentage: Number(b.attendance_percentage) || 0,
        sessions: b.sessions || 0,
        present: b.present || 0,
        absent: b.absent || 0
      }));
    } else if (chartView === "batch") {
      return (filterMeta.batch_stats || []).map(b => ({
        id: String(b.batch_id),
        name: b.batch_name,
        shortName: b.batch_name,
        percentage: Number(b.attendance_percentage) || 0,
        sessions: b.sessions || 0,
        present: b.present || 0,
        absent: b.absent || 0
      }));
    } else {
      return (filterMeta.semester_stats || []).map(s => ({
        id: String(s.semester_id),
        name: `Sem ${s.semester_number}`,
        shortName: `Sem ${s.semester_number}`,
        percentage: Number(s.attendance_percentage) || 0,
        sessions: s.sessions || 0,
        present: s.present || 0,
        absent: s.absent || 0
      }));
    }
  }, [filterMeta, chartView]);

  // College-wide benchmark always derived from branch_stats (not view-dependent chartData)
  const branchStatsData = useMemo(() => {
    return (filterMeta?.branch_stats || []).map(b => ({
      id: String(b.branch_id),
      name: b.branch_name,
      shortName: getShortBranchName(b.branch_name),
      percentage: Number(b.attendance_percentage) || 0,
      sessions: b.sessions || 0,
      present: b.present || 0,
      absent: b.absent || 0
    }));
  }, [filterMeta]);

  // Computed True College Attendance Percentage — always from branch_stats (unskewed)
  const trueCollegeAttendance = useMemo(() => {
    // If students are loaded and user has a specific filter, show that filtered avg
    if (students.length > 0 && summaryStats?.avg_attendance) {
      return Math.round(summaryStats.avg_attendance);
    }
    // Always derive from branch_stats for overall view (avoids skew from raw student counts)
    const activeBranches = branchStatsData.filter(b => b.sessions > 0);
    if (activeBranches.length > 0) {
      const totalP = activeBranches.reduce((acc, b) => acc + b.present, 0);
      const totalA = activeBranches.reduce((acc, b) => acc + b.absent, 0);
      const total = totalP + totalA;
      if (total > 0) return Math.round((totalP / total) * 100);
    }
    return 0;
  }, [students, summaryStats, branchStatsData]);

  // Executive Analytics Summary — always computed from branchStatsData for KPI strip
  const branchSummary = useMemo(() => {
    const active = branchStatsData.filter(b => b.sessions > 0);
    const units = active.length > 0 ? active : branchStatsData;
    if (!units.length) return { topUnit: null, satisfactoryCount: 0, atRiskCount: 0, criticalCount: 0, totalUnits: 0, totalSessions: 0, totalPresent: 0, totalAbsent: 0 };
    const sorted = [...units].sort((a, b) => b.percentage - a.percentage);
    return {
      topUnit: sorted[0],
      satisfactoryCount: units.filter(b => b.percentage >= 75).length,
      atRiskCount: units.filter(b => b.percentage >= 60 && b.percentage < 75).length,
      criticalCount: units.filter(b => b.percentage < 60).length,
      totalUnits: units.length,
      totalSessions: units.reduce((acc, b) => acc + b.sessions, 0),
      totalPresent: units.reduce((acc, b) => acc + b.present, 0),
      totalAbsent: units.reduce((acc, b) => acc + b.absent, 0)
    };
  }, [branchStatsData]);

  // Executive Analytics Summary for chart's current view dimension (used in performance cards)
  const analyticsSummary = useMemo(() => {
    const activeUnits = chartData.filter((d) => d.sessions > 0);
    const unitsToUse = activeUnits.length > 0 ? activeUnits : chartData;
    if (!unitsToUse.length) {
      return {
        topUnit: null,
        satisfactoryCount: 0,
        atRiskCount: 0,
        criticalCount: 0,
        totalUnits: 0
      };
    }
    const sorted = [...unitsToUse].sort((a, b) => b.percentage - a.percentage);
    return {
      topUnit: sorted[0],
      satisfactoryCount: unitsToUse.filter((d) => d.percentage >= 75).length,
      atRiskCount: unitsToUse.filter((d) => d.percentage >= 60 && d.percentage < 75).length,
      criticalCount: unitsToUse.filter((d) => d.percentage < 60).length,
      totalUnits: unitsToUse.length
    };
  }, [chartData]);

  // Click on chart bar or pill to quickly filter
  const handleChartClick = (entry: any) => {
    if (!entry || !entry.id) return;
    if (chartView === "branch") {
      const isCurrent = String(selectedBranch) === String(entry.id);
      if (isCurrent) {
        handleBranchChange("");
      } else {
        handleBranchChange(String(entry.id));
        toast({
          title: "Branch Selected",
          description: `Applied ${entry.name}. Pick semester & section below to inspect records.`
        });
      }
    } else if (chartView === "batch") {
      const isCurrent = String(selectedBatch) === String(entry.id);
      handleBatchChange(isCurrent ? "all" : String(entry.id));
      toast({
        title: isCurrent ? "Batch Filter Cleared" : "Batch Filter Applied",
        description: isCurrent ? "Showing all batches" : `Filtering by ${entry.name}`
      });
    } else if (chartView === "semester") {
      const isCurrent = String(selectedSemester) === String(entry.id);
      handleSemesterChange(isCurrent ? "" : String(entry.id));
      toast({
        title: isCurrent ? "Semester Filter Cleared" : "Semester Filter Applied",
        description: isCurrent ? "Cleared semester selection" : `Selected ${entry.name}`
      });
    }
  };

  // Selected Branch Name
  const selectedBranchObj = useMemo(() => {
    return availableBranches.find(b => String(b.id) === String(selectedBranch));
  }, [availableBranches, selectedBranch]);

  return (
    <div
      id="admin-attendance-records-container"
      className="w-full max-w-none mx-auto space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Attendance Records</h1>
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2.5 py-0.5 font-semibold",
                theme === "dark"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-primary/30 bg-primary/5 text-primary"
              )}
            >
              Principal &amp; Admin View
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {selectedBranchObj
              ? `Viewing attendance for ${selectedBranchObj.name}. Choose semester, section, subject, and date range to inspect records.`
              : "Select a branch, batch, semester, section, subject, and date range to view college-wide attendance records."}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            id="export-excel-btn"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!students.length}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-9 px-3.5 font-medium text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs sm:text-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </Button>
          <Button
            id="export-pdf-btn"
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={!students.length}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-9 px-3.5 font-medium text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Centerpiece Analytics: College Attendance Intelligence Hub */}
      <Card
        id="attendance-analytics-card"
        className={cn(
          "border shadow-sm overflow-hidden transition-all duration-300",
          theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"
        )}
      >
        <CardHeader className="pb-3.5 pt-4 px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 border-b border-border/50 bg-muted/20">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">
                    Attendance Intelligence &amp; Overview
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      trueCollegeAttendance >= 75
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    )}
                  >
                    {trueCollegeAttendance >= 75 ? "🟢 College On Track" : "🟡 Turnout Review Required"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Actionable college-wide turn-out benchmarks compared against the university 75% threshold.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* View Switcher: Cards vs Chart */}
            <div className="inline-flex rounded-xl border bg-muted/40 p-1 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setAnalyticsTab("cards");
                  setIsAnalyticsExpanded(true);
                }}
                className={cn(
                  "px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  analyticsTab === "cards"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalyticsTab("chart");
                  setIsAnalyticsExpanded(true);
                }}
                className={cn(
                  "px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  analyticsTab === "chart"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Chart</span>
              </button>
            </div>

            {/* Dimension Switcher: Branch-wise | Batch-wise | Semester-wise */}
            <div className="inline-flex rounded-xl border bg-muted/40 p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setChartView("branch")}
                className={cn(
                  "px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                  chartView === "branch"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Branches</span>
              </button>
              <button
                type="button"
                onClick={() => setChartView("batch")}
                className={cn(
                  "px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                  chartView === "batch"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Batches</span>
              </button>
              <button
                type="button"
                onClick={() => setChartView("semester")}
                className={cn(
                  "px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                  chartView === "semester"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Semesters</span>
              </button>
            </div>

            {/* Minimize / Expand Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
              className="h-7 sm:h-8 px-2.5 text-xs font-medium flex items-center gap-1 rounded-xl border-border/80"
              title={isAnalyticsExpanded ? "Collapse Analytics Panel" : "Expand Analytics Panel"}
            >
              {isAnalyticsExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Hide</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-semibold">Show</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {!isAnalyticsExpanded ? (
          /* Slim Collapsed Executive Banner */
          <CardContent className="p-3 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-semibold">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    trueCollegeAttendance >= 75 ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
                <span>
                  College Benchmark: <strong>{trueCollegeAttendance}%</strong>
                </span>
                <span className="text-muted-foreground font-normal">(Target: 75%)</span>
              </div>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                <strong>{branchSummary.totalSessions}</strong> Recorded Sessions
              </span>
              <span className="text-muted-foreground">•</span>
              <span
                className={cn(
                  "font-semibold",
                  branchSummary.satisfactoryCount === branchSummary.totalUnits
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {branchSummary.satisfactoryCount} of {branchSummary.totalUnits}{" "}
                Branches Compliant (≥75%)
              </span>
              {branchSummary.topUnit && (
                <>
                  <span className="text-muted-foreground hidden md:inline">•</span>
                  <span className="hidden md:inline">
                    Top: <strong>{getShortBranchName(branchSummary.topUnit.name)}</strong> ({branchSummary.topUnit.percentage}%)
                  </span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAnalyticsExpanded(true)}
              className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 gap-1 rounded-lg"
            >
              <span>Expand Details</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        ) : (
          /* Full Expanded Analytics */
          <CardContent className="p-4 sm:p-6 space-y-5">
            {analyticsTab === "cards" ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>
                        {chartView === "branch"
                          ? "Branch Performance Cards"
                          : chartView === "batch"
                          ? "Academic Batch Performance Cards"
                          : "Semester Performance Cards"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Click &ldquo;Filter Records&rdquo; on any card to immediately filter college records below.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground font-medium hidden sm:inline-flex rounded-full">
                    Target: 75% Attendance
                  </Badge>
                </div>

                {chartData.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No active {chartView} attendance recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                    {chartData.map((item) => {
                      const isSelected =
                        chartView === "branch"
                          ? String(selectedBranch) === String(item.id)
                          : chartView === "batch"
                          ? String(selectedBatch) === String(item.id)
                          : String(selectedSemester) === String(item.id);
                      const isCompliant = item.percentage >= 75;
                      const isWarning = item.percentage >= 60 && item.percentage < 75;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3.5 shadow-xs h-full",
                            isSelected
                              ? "border-primary ring-2 ring-primary/25 bg-primary/[0.04]"
                              : theme === "dark"
                              ? "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          )}
                        >
                          {/* Card Header: Title + Percentage */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="space-y-1 min-w-0">
                              <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{item.name}</span>
                                {isSelected && (
                                  <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground font-semibold shrink-0">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground block">
                                {item.sessions} recorded session{item.sessions === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "text-sm font-extrabold px-2.5 py-1 rounded-lg shrink-0",
                                isCompliant
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                  : isWarning
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              )}
                            >
                              {item.percentage}%
                            </div>
                          </div>

                          {/* Progress bar with 75% target line */}
                          <div className="space-y-1.5">
                            <div className="relative w-full bg-muted/80 h-2 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isCompliant ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                              />
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-slate-600 dark:bg-slate-300 z-10 opacity-75"
                                style={{ left: "75%" }}
                                title="75% University Requirement"
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                              <span>Benchmark Target: 75%</span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  isCompliant
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isWarning
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {isCompliant ? "Target Met (≥75%)" : "Under Target (<75%)"}
                              </span>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                            <div className="text-[11px] text-muted-foreground font-medium">
                              Turnout: <strong className="text-foreground">{item.percentage}%</strong>
                            </div>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleChartClick(item)}
                              className={cn(
                                "h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg transition-all",
                                isSelected ? "shadow-xs" : "hover:border-primary/50"
                              )}
                            >
                              <Filter className="w-3 h-3" />
                              <span>{isSelected ? "Clear Filter" : "Filter Records"}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* View Mode 2: Benchmark Graph */
              <div className="w-full space-y-4">
                <div className="w-full h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: -12, bottom: 12 }}
                      barCategoryGap={chartData.length <= 3 ? "35%" : chartData.length <= 6 ? "22%" : "12%"}
                    >
                      <defs>
                        <linearGradient id="adminBarGradEmerald" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                        </linearGradient>
                        <linearGradient id="adminBarGradAmber" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                        </linearGradient>
                        <linearGradient id="adminBarGradRose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={0.75} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={theme === "dark" ? "#334155" : "#f1f5f9"}
                        opacity={0.8}
                      />
                      <XAxis
                        dataKey="shortName"
                        stroke={theme === "dark" ? "#cbd5e1" : "#475569"}
                        fontSize={12}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={{ stroke: theme === "dark" ? "#334155" : "#cbd5e1" }}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <ReferenceLine
                        y={75}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: "Target: 75%",
                          position: "insideTopRight",
                          fill: "#10b981",
                          fontSize: 11,
                          fontWeight: 700,
                          offset: 6
                        }}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover/95 backdrop-blur-sm p-3 rounded-xl border border-border shadow-xl space-y-1.5 min-w-[170px] text-xs">
                                <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
                                  <span className="font-semibold text-foreground truncate max-w-[120px]">{data.name}</span>
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-md font-semibold text-xs shrink-0",
                                      data.percentage >= 75
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : data.percentage >= 60
                                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                    )}
                                  >
                                    {data.percentage}%
                                  </span>
                                </div>
                                <div className="space-y-1 pt-0.5 text-[11px] text-muted-foreground">
                                  <div className="flex justify-between">
                                    <span>Total Sessions:</span>
                                    <strong className="text-foreground">{data.sessions}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Present:</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400">{data.present}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Absent:</span>
                                    <strong className="text-rose-600 dark:text-rose-400">{data.absent}</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="percentage"
                        radius={[8, 8, 2, 2]}
                        maxBarSize={chartData.length <= 3 ? 68 : chartData.length <= 6 ? 50 : 38}
                        className="cursor-pointer transition-all"
                        onClick={(entry) => {
                          if (entry) handleChartClick(entry);
                        }}
                      >
                        <LabelList
                          dataKey="percentage"
                          position="top"
                          formatter={(val: any) => `${val}%`}
                          fill={theme === "dark" ? "#e2e8f0" : "#1e293b"}
                          fontSize={12}
                          fontWeight={700}
                          offset={6}
                        />
                        {chartData.map((entry, idx) => {
                          const isSelected =
                            chartView === "branch"
                              ? String(selectedBranch) === String(entry.id)
                              : chartView === "batch"
                              ? String(selectedBatch) === String(entry.id)
                              : String(selectedSemester) === String(entry.id);

                          const fill =
                            entry.percentage >= 75
                              ? "url(#adminBarGradEmerald)"
                              : entry.percentage >= 60
                              ? "url(#adminBarGradAmber)"
                              : "url(#adminBarGradRose)";

                          return (
                            <Cell
                              key={`cell-${idx}`}
                              fill={fill}
                              opacity={isSelected ? 1 : 0.88}
                              stroke={isSelected ? "#6366f1" : "transparent"}
                              strokeWidth={isSelected ? 3 : 0}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Cascading Filter Controls Card */}
      <Card
        id="filter-toolbar"
        className={cn(
          "border shadow-sm rounded-2xl overflow-hidden",
          theme === "dark" ? "bg-card border-border/80" : "bg-white border-slate-200/90"
        )}
      >
        <CardHeader className="pb-3.5 pt-4 px-4 sm:px-6 border-b border-border/50 bg-muted/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Filter Attendance Records</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Select branch, semester, section, subject, and date range to fetch student register.
                </p>
              </div>
              {!isFilterComplete ? (
                <Badge variant="outline" className="text-[11px] border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold rounded-full px-2.5 py-0.5">
                  5 Filters Required
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold rounded-full px-2.5 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ready to Fetch</span>
                </Badge>
              )}
            </div>
            {(selectedBranch || selectedSemester || selectedSection || selectedSubject || startDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Row 1: 5 Core Filters (Branch*, Batch, Semester*, Section*, Subject*) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Branch Filter (First & Mandatory) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Branch<span className="text-rose-500 ml-1 font-semibold">*</span>
              </label>
              <Select value={selectedBranch} onValueChange={handleBranchChange}>
                <SelectTrigger id="branch-select" className="w-full">
                  <SelectValue placeholder="Choose Branch" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {availableBranches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Batch Filter (Second) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Batch
              </label>
              <Select value={selectedBatch} onValueChange={handleBatchChange}>
                <SelectTrigger id="batch-select" className="w-full">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Semester Filter (Mandatory, Dependent on Branch) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Semester<span className="text-rose-500 ml-1 font-semibold">*</span>
              </label>
              <Select
                value={selectedSemester}
                onValueChange={handleSemesterChange}
                disabled={!selectedBranch}
              >
                <SelectTrigger id="semester-select" className="w-full" disabled={!selectedBranch}>
                  <SelectValue placeholder={selectedBranch ? "Choose Semester" : "Select Branch first"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {availableSemesters.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      Semester {s.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Section Filter (Mandatory, Dependent on Semester) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Section<span className="text-rose-500 ml-1 font-semibold">*</span>
              </label>
              <Select
                value={selectedSection}
                onValueChange={val => {
                  setSelectedSection(val);
                  setPage(1);
                }}
                disabled={!selectedSemester}
              >
                <SelectTrigger id="section-select" className="w-full" disabled={!selectedSemester}>
                  <SelectValue placeholder={selectedSemester ? "Choose Section" : "Select Semester first"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {availableSections.map(sec => (
                    <SelectItem key={sec.id} value={String(sec.id)}>
                      Section {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Subject Filter (Mandatory Single Subject) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Subject / Course<span className="text-rose-500 ml-1 font-semibold">*</span>
              </label>
              <Select
                value={selectedSubject}
                onValueChange={val => {
                  setSelectedSubject(val);
                  setPage(1);
                }}
                disabled={!selectedSemester || availableSubjects.length === 0}
              >
                <SelectTrigger id="subject-select" className="w-full" disabled={!selectedSemester || availableSubjects.length === 0}>
                  <SelectValue
                    placeholder={
                      !selectedSemester
                        ? "Select Semester first"
                        : availableSubjects.length === 0
                        ? "No subjects in semester"
                        : "Choose Subject"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {availableSubjects.map(sub => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.name} ({sub.subject_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Date Range*, Search Bar, Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-1">
            {/* Date Range Picker (Mandatory, maxDate = Today) */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Date Range<span className="text-rose-500 ml-1 font-semibold">*</span>
              </label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range-picker-btn"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal bg-background px-3 border-input text-sm",
                      !startDate && !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      {startDate && endDate
                        ? `${format(startDate, "dd/MM/yyyy")}  –  ${format(endDate, "dd/MM/yyyy")}`
                        : startDate
                        ? format(startDate, "dd/MM/yyyy")
                        : "Choose Date Range"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={6}
                  collisionPadding={16}
                  className="w-auto p-0 z-50 rounded-xl border shadow-lg overflow-hidden bg-popover max-w-[calc(100vw-2rem)]"
                >
                  {/* Compact Quick Select Presets Bar */}
                  <div className="px-2.5 py-1.5 border-b border-border/60 bg-muted/25 flex items-center gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 rounded-md font-medium"
                      onClick={() => applyDatePreset("semester")}
                    >
                      Semester
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 rounded-md font-medium"
                      onClick={() => applyDatePreset("month")}
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 rounded-md font-medium"
                      onClick={() => applyDatePreset("30days")}
                    >
                      30 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 rounded-md font-medium"
                      onClick={() => applyDatePreset("week")}
                    >
                      7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 rounded-md font-medium"
                      onClick={() => applyDatePreset("today")}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 rounded-md font-medium"
                      onClick={() => applyDatePreset("yesterday")}
                    >
                      Yesterday
                    </Button>
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-1.5 rounded-md text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 ml-auto"
                        onClick={() => applyDatePreset("all")}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Compact Calendar */}
                  <div className="p-1.5 flex justify-center">
                    <Calendar
                      mode="range"
                      selected={
                        startDate
                          ? {
                              from: startDate,
                              to: endDate || startDate
                            }
                          : undefined
                      }
                      onSelect={(range) => {
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        if (range?.from) {
                          if (range.from > today) {
                            toast({
                              variant: "destructive",
                              title: "Invalid Date Range",
                              description: "Date cannot be in the future."
                            });
                            return;
                          }
                          setStartDate(range.from);
                        }
                        if (range?.to) {
                          if (range.to > today) {
                            setEndDate(today);
                          } else {
                            setEndDate(range.to);
                          }
                        } else if (range?.from) {
                          setEndDate(range.from);
                        }
                        setPage(1);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        return date > today;
                      }}
                      numberOfMonths={1}
                      className="p-1"
                      classNames={{
                        months: "space-y-2",
                        month: "space-y-2",
                        caption: "flex justify-center pt-0 pb-1 relative items-center",
                        caption_label: "text-xs font-semibold",
                        nav_button: "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100",
                        head_cell: "text-muted-foreground rounded-md w-8 h-8 font-medium text-[11px] flex items-center justify-center",
                        row: "flex w-full mt-1",
                        cell: "h-8 w-8 text-xs flex items-center justify-center p-0 relative",
                        day: "h-8 w-8 text-xs font-normal"
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Input */}
            <div className="md:col-span-5 space-y-2">
              <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                Search Students
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="student-search-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filter by name or USN in current view..."
                  className="pl-9 pr-9 h-10 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setDebouncedSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-3 flex items-center gap-2">
              <Button
                id="fetch-records-btn"
                onClick={fetchRecords}
                disabled={loading || !isFilterComplete}
                className="h-10 w-full flex items-center justify-center gap-2 font-semibold shadow-sm transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Fetch Records</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-muted-foreground hover:text-foreground"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table Section */}
      <Card
        id="attendance-records-card"
        className={cn(
          "border shadow-sm rounded-2xl overflow-hidden",
          theme === "dark" ? "bg-card border-border/80" : "bg-white border-slate-200/90"
        )}
      >
        <CardHeader className="py-3.5 px-4 sm:px-6 border-b border-border/50 flex flex-row items-center justify-between bg-muted/15">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Student Attendance Register</CardTitle>
            </div>
            {totalRecordsCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-semibold rounded-full">
                {totalRecordsCount} {totalRecordsCount === 1 ? "Student" : "Students"}
              </Badge>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Updating...</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isFilterComplete ? (
            <div
              className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 my-2 ${
                theme === "dark"
                  ? "border-border bg-card/30 text-muted-foreground"
                  : "border-gray-200 bg-gray-50/50 text-gray-500"
              }`}
            >
              <div
                className={`p-6 rounded-full mb-6 ${
                  theme === "dark" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                }`}
              >
                <Users className="w-12 h-12 opacity-80" />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  theme === "dark" ? "text-foreground" : "text-gray-900"
                }`}
              >
                No Attendance Records Loaded
              </h3>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                Select a branch, batch, semester, section, subject, and date range above to view attendance records.
              </p>
            </div>
          ) : loading && !students.length ? (
            <div className="py-4">
              <SkeletonTable rows={8} cols={7} />
            </div>
          ) : !students.length ? (
            <div
              className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl my-2 ${
                theme === "dark"
                  ? "border-border bg-card/30 text-muted-foreground"
                  : "border-gray-200 bg-gray-50/50 text-gray-500"
              }`}
            >
              <div
                className={`p-6 rounded-full mb-6 ${
                  theme === "dark" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                }`}
              >
                <Users className="w-12 h-12 opacity-80" />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  theme === "dark" ? "text-foreground" : "text-gray-900"
                }`}
              >
                No Records Found
              </h3>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                There are no attendance sessions marked for the selected branch, class, and date range.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Subject & Faculty Information Banner */}
              <div
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4",
                  theme === "dark"
                    ? "bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border-primary/25"
                    : "bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-slate-50 border-primary/20"
                )}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/25 shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base text-foreground">
                        {facultyInfo?.subject_name || availableSubjects.find((s) => String(s.id) === selectedSubject)?.name || "Subject Attendance"}
                      </span>
                      {(facultyInfo?.subject_code || availableSubjects.find((s) => String(s.id) === selectedSubject)?.subject_code) && (
                        <Badge variant="outline" className="text-xs font-mono font-semibold bg-background/90 border-primary/30 px-2 py-0.5 rounded-md">
                          {facultyInfo?.subject_code || availableSubjects.find((s) => String(s.id) === selectedSubject)?.subject_code}
                        </Badge>
                      )}
                      {facultyInfo?.subject_type && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold rounded-md px-1.5 py-0.5">
                          {facultyInfo.subject_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap font-medium">
                      <span>
                        Branch: <strong>{availableBranches.find((b) => String(b.id) === selectedBranch)?.name ?? selectedBranch}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Semester {availableSemesters.find((s) => String(s.id) === selectedSemester)?.number ?? selectedSemester} - Section {availableSections.find((s) => String(s.id) === selectedSection)?.name ?? selectedSection}
                      </span>
                      <span>•</span>
                      <span>
                        {selectedBatch !== "all"
                          ? `Batch: ${availableBatches.find((b) => String(b.id) === selectedBatch)?.name ?? selectedBatch}`
                          : "All Batches"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs shrink-0 border-t md:border-t-0 md:border-l border-border/60 pt-3 md:pt-0 md:pl-5">
                  {/* Assigned Faculty */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wider">Assigned Faculty</span>
                      <span className="font-semibold text-foreground">
                        {facultyInfo?.assigned_faculty_name || (facultyInfo?.assigned_faculty && facultyInfo.assigned_faculty.length > 0 ? facultyInfo.assigned_faculty.join(", ") : "Not Assigned")}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:block w-px h-7 bg-border/60" />

                  {/* Attendance Marked By Faculty */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wider">Attendance Marked By</span>
                      <span className="font-semibold text-foreground">
                        {facultyInfo?.marked_by_faculty_name || (facultyInfo?.marked_by_faculty && facultyInfo.marked_by_faculty.length > 0 ? facultyInfo.marked_by_faculty.join(", ") : "None recorded")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary KPI Strip */}
              {summaryStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/70 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider truncate">Total Students</div>
                      <div className="text-base sm:text-xl font-extrabold text-foreground">{summaryStats.total_students}</div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/70 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider truncate">Sessions</div>
                      <div className="text-base sm:text-xl font-extrabold text-foreground">{summaryStats.total_sessions} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">ses</span></div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/70 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider truncate">Turnout</div>
                      <div className="text-base sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{summaryStats.avg_attendance}%</div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/70 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider truncate">Eligible (≥75%)</div>
                      <div className="text-base sm:text-xl font-extrabold text-foreground">
                        {summaryStats.eligible_count} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">/ {summaryStats.total_students}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Attendance Register Table */}
              <div className="border rounded-2xl overflow-hidden custom-scrollbar bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <Table id="attendance-records-table">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/40 text-xs font-semibold border-b">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead className="min-w-[180px]">Student Details</TableHead>
                        <TableHead className="min-w-[160px]">Class &amp; Branch</TableHead>
                        <TableHead className="w-24 text-center">Conducted</TableHead>
                        <TableHead className="w-24 text-center">Attended</TableHead>
                        <TableHead className="w-24 text-center">Absent</TableHead>
                        <TableHead className="w-28 text-center">Attendance %</TableHead>
                        <TableHead className="w-24 text-center">Eligibility Status</TableHead>
                        <TableHead className="w-28 text-center">Daily History</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.map((s, index) => {
                        const rowNumber = startItemIndex + index;
                        const pct = s.attendance_percentage;
                        const badgeVariant =
                          s.conducted_classes === 0
                            ? "bg-slate-50 text-slate-500 border-slate-300 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700"
                            : pct >= 75
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : pct >= 60
                            ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";

                        const statusBadge =
                          s.status === "Eligible"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                            : s.status === "Warning"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                            : s.status === "No Classes"
                            ? "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30 font-medium"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold";

                        return (
                          <TableRow
                            key={s.id}
                            className={cn(
                              "text-xs transition-colors hover:bg-muted/50 border-b border-border/50",
                              index % 2 === 1 && "bg-muted/10"
                            )}
                          >
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {rowNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs sm:text-sm text-foreground">
                                {s.name}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded-md mt-0.5 inline-block font-semibold">
                                {s.usn}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground">
                                Semester {s.semester ?? "--"} - Section {s.section ?? "--"}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="font-semibold text-primary">{s.branch || "--"}</span>
                                {s.batch && (
                                  <>
                                    <span>•</span>
                                    <span>Batch: {s.batch}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs sm:text-sm text-foreground">
                              {s.conducted_classes}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              {s.attended_classes}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                              {s.absent_classes}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-xs px-2.5 py-0.5 font-extrabold border rounded-md", badgeVariant)}>
                                {pct}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn("text-[11px] px-2.5 py-0.5 rounded-md", statusBadge)}
                              >
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudentForTimeline(s);
                                  setStudentTimelineModalOpen(true);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-md"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>View Timeline</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Robust Pagination Controls (matching HOD / Institutional pattern) */}
        {isFilterComplete && totalRecordsCount > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-6 py-4 border-t border-border mt-auto bg-muted/10">
            <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap font-medium">
              <span>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {startItemIndex}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {endItemIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {totalRecordsCount}
                </span>{" "}
                records
              </span>
              <span className="text-muted-foreground/60">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-normal">Per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={val => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs rounded-lg font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page <= 1 || loading}
                className="h-8 w-8 p-0 rounded-lg"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 px-2.5 text-xs flex items-center gap-1 rounded-lg font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              {paginationRange.map((item, i) =>
                item === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={`page-${item}`}
                    variant={page === item ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(Number(item))}
                    disabled={loading}
                    className="h-8 w-8 p-0 text-xs font-medium"
                  >
                    {item}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-8 px-2.5 text-xs flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                className="h-8 w-8 p-0"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Student Attendance Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent
          className={cn(
            "max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6",
            theme === "dark" ? "bg-card text-card-foreground border-border" : "bg-white"
          )}
        >
          <DialogHeader className="border-b pb-3 border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <span>Lecture Attendance Breakdown</span>
              </DialogTitle>
              {recordDetails && (
                <Button
                  id="admin-modal-header-export-excel-btn"
                  variant="outline"
                  size="sm"
                  onClick={handleExportModalExcel}
                  className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  title="Export Lecture Breakdown to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Export Excel</span>
                </Button>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1 space-y-1">
              {recordDetails ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {recordDetails.branch} • Sem {recordDetails.semester} - Sec {recordDetails.section} •{" "}
                    {formatDateToDDMMYYYY(recordDetails.date)}
                  </span>
                  {recordDetails.date_range?.is_filtered ? (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                      Stats Range: {recordDetails.date_range.start_date ? formatDateToDDMMYYYY(recordDetails.date_range.start_date) : "Start"} to {recordDetails.date_range.end_date ? formatDateToDDMMYYYY(recordDetails.date_range.end_date) : "End"} ({recordDetails.date_range.total_conducted} classes)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-muted/70 text-muted-foreground font-normal">
                      Subject Stats: Term to Session Date ({recordDetails.date_range?.total_conducted || 0} classes total)
                    </Badge>
                  )}
                </div>
              ) : (
                "Loading roster details..."
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading roster...</span>
            </div>
          ) : !recordDetails ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No details found for this attendance session.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Session Overview Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/30 border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Subject:</span>
                  <span className="font-semibold text-foreground">{recordDetails.subject}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Faculty:</span>
                  <span className="font-semibold text-foreground">{recordDetails.faculty_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Batch:</span>
                  <span className="font-semibold text-foreground">{recordDetails.batch_name || "--"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Attendance:</span>
                  <span
                    className={cn(
                      "font-semibold",
                      recordDetails.present_percentage >= 75
                        ? "text-emerald-600"
                        : recordDetails.present_percentage >= 60
                        ? "text-amber-600"
                        : "text-rose-600"
                    )}
                  >
                    {recordDetails.present_percentage}% ({recordDetails.present_count}/{recordDetails.total_count})
                  </span>
                </div>
              </div>

              {/* Roster Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Filter students by name or USN..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="pl-10 h-8 text-xs bg-background"
                />
              </div>

              {/* Present & Absent Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Present Students Panel */}
                <div className="border rounded-lg p-3 space-y-2 bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Present Students ({recordDetails.present_count})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Subject %</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {recordDetails.present
                      ?.filter(
                        (s: any) =>
                          !modalSearch ||
                          s.name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                          s.usn?.toLowerCase().includes(modalSearch.toLowerCase())
                      )
                      .map((s: any) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/70 text-xs gap-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate">{s.name}</div>
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                              {s.usn}
                            </span>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-0.5 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] px-2 py-0.5 font-semibold",
                                (s.subject_percentage ?? 0) >= 75
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : (s.subject_percentage ?? 0) >= 60
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              )}
                            >
                              {s.subject_percentage !== undefined ? `${s.subject_percentage}%` : "--"}
                            </Badge>
                            {s.subject_total !== undefined && (
                              <span className="text-[10px] text-muted-foreground">
                                {s.subject_present ?? 0}/{s.subject_total} classes
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {recordDetails.present?.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">No students present</p>
                    )}
                  </div>
                </div>

                {/* Absent Students Panel */}
                <div className="border rounded-lg p-3 space-y-2 bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Absent Students ({recordDetails.absent_count})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Subject %</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {recordDetails.absent
                      ?.filter(
                        (s: any) =>
                          !modalSearch ||
                          s.name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                          s.usn?.toLowerCase().includes(modalSearch.toLowerCase())
                      )
                      .map((s: any) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/70 text-xs gap-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate">{s.name}</div>
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                              {s.usn}
                            </span>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-0.5 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] px-2 py-0.5 font-semibold",
                                (s.subject_percentage ?? 0) >= 75
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : (s.subject_percentage ?? 0) >= 60
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              )}
                            >
                              {s.subject_percentage !== undefined ? `${s.subject_percentage}%` : "--"}
                            </Badge>
                            {s.subject_total !== undefined && (
                              <span className="text-[10px] text-muted-foreground">
                                {s.subject_present ?? 0}/{s.subject_total} classes
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {recordDetails.absent?.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">Zero absentees</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
              {recordDetails && (
                <span>
                  Total: <strong>{recordDetails.total_students || recordDetails.total_count}</strong> students •{" "}
                  <span className="text-emerald-600 font-semibold">{recordDetails.present_count} present</span> •{" "}
                  <span className="text-rose-600 font-semibold">{recordDetails.absent_count} absent</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
              <Button
                id="admin-modal-footer-export-excel-btn"
                variant="outline"
                size="sm"
                onClick={handleExportModalExcel}
                disabled={!recordDetails}
                className="w-full sm:w-auto text-xs h-8 flex items-center justify-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailsModalOpen(false)}
                className="w-full sm:w-auto text-xs h-8"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Attendance Timeline Modal */}
      <Dialog open={studentTimelineModalOpen} onOpenChange={setStudentTimelineModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Student Attendance Timeline
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                {selectedStudentForTimeline && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2.5 py-0.5 font-semibold hidden sm:inline-flex",
                      selectedStudentForTimeline.attendance_percentage >= 75
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : selectedStudentForTimeline.attendance_percentage >= 60
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                    )}
                  >
                    {selectedStudentForTimeline.status} ({selectedStudentForTimeline.attendance_percentage}%)
                  </Badge>
                )}
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
            </div>
            {selectedStudentForTimeline && (
              <DialogDescription className="text-xs text-muted-foreground mt-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold text-foreground text-sm">
                    {selectedStudentForTimeline.name}
                  </span>
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                    {selectedStudentForTimeline.usn}
                  </span>
                  <span>
                    Sem {selectedStudentForTimeline.semester ?? "--"} - Sec {selectedStudentForTimeline.section ?? "--"}
                  </span>
                  {selectedStudentForTimeline.batch && (
                    <span>Batch: {selectedStudentForTimeline.batch}</span>
                  )}
                </div>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {selectedStudentForTimeline && (
              <>
                {/* 3 Metric cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
                    <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Total Classes</div>
                    <div className="text-lg sm:text-xl font-semibold mt-1 text-foreground">
                      {selectedStudentForTimeline.conducted_classes}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Attended</div>
                    <div className="text-lg sm:text-xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                      {selectedStudentForTimeline.attended_classes}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-xs">
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">Absent</div>
                    <div className="text-lg sm:text-xl font-semibold mt-1 text-rose-600 dark:text-rose-400">
                      {selectedStudentForTimeline.absent_classes}
                    </div>
                  </div>
                </div>

                {/* Timeline Log */}
                <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
                  <div className="p-3 bg-muted/40 border-b border-border/70 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <CalendarClock className="w-4 h-4 text-primary" />
                      Session History Log ({sessionDateList.length} Sessions)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">Chronological Order</span>
                  </div>

                  <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                    {sessionDateList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No individual session timestamps recorded for this range.
                      </div>
                    ) : (
                      sessionDateList.map((ses, idx) => {
                        const status = selectedStudentForTimeline.session_status?.[ses.id] || selectedStudentForTimeline.session_status?.[String(ses.id)];
                        const isPresent = status === "present";
                        const isAbsent = status === "absent";

                        return (
                          <div
                            key={ses.id || idx}
                            className={cn(
                              "p-3 flex items-center justify-between gap-3 text-xs transition-colors",
                              isPresent ? "hover:bg-emerald-500/[0.03]" : isAbsent ? "hover:bg-rose-500/[0.03]" : "hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                  <span>{ses.formatted_date || ses.date}</span>
                                  {ses.day_of_week && (
                                    <span className="text-[10px] font-normal text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded">
                                      {ses.day_of_week}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                  <span>Sec {ses.section || selectedStudentForTimeline.section || "--"}</span>
                                  {ses.faculty_name && (
                                    <>
                                      <span>•</span>
                                      <span>Marked by: {ses.faculty_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isPresent ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold gap-1 px-2.5 py-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Present
                                </Badge>
                              ) : isAbsent ? (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold gap-1 px-2.5 py-1">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Absent
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                                  Not Marked
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStudentTimelineModalOpen(false)}
              className="text-xs h-8"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAttendanceRecords;
