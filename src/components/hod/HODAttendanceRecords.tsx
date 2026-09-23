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
  Award,
  Users,
  CheckCircle2,
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
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getHODAttendanceRecordsWithSummary,
  getHODAttendanceRecordDetails,
  getHODAttendanceFilters,
  getHODStudentAttendanceSummary,
  StudentAttendanceSummaryItem,
  FacultyAttendanceInfo,
  HODAttendanceRecord,
  HODAttendanceFiltersResponse
} from "@/utils/hod_api";
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

const getSemesterStartDate = (): Date => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = July
  const startMonth = currentMonth >= 6 ? 6 : 0;
  return new Date(now.getFullYear(), startMonth, 1);
};

const HODAttendanceRecords = () => {
  const { theme } = useTheme();
  const { toast } = useToast();

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecordsCount, setTotalRecordsCount] = useState<number>(0);

  // Mandatory Filter States (Strictly following Low Attendance pattern: Semester & Section are required)
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

  // Filter Metadata (Branch-scoped with overall, batch_stats, semester_stats)
  const [filterMeta, setFilterMeta] = useState<HODAttendanceFiltersResponse["data"] | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Active Analytics View (Batch-wise or Semester-wise)
  const [chartView, setChartView] = useState<"batch" | "semester">("batch");
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

  // Debounce search input to avoid network request spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 1. Fetch Filter Metadata on mount
  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const res = await getHODAttendanceFilters();
        if (res.success && res.data) {
          setFilterMeta(res.data);
        }
      } catch (err) {
        console.error("Failed to load attendance filters", err);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);

  // 2. Cascading Behavior: When Semester changes, reset section and subject
  const handleSemesterChange = (val: string) => {
    setSelectedSemester(val);
    setSelectedSection(""); // Reset section when semester changes
    setSelectedSubject(""); // Reset subject when semester changes
    setPage(1);
    setStudents([]);
    setSummaryStats(null);
    setFacultyInfo(null);
    setTotalRecordsCount(0);
  };

  // Auto-open section dropdown when semester is selected and section is empty (identical to LowAttendance.tsx)
  useEffect(() => {
    if (selectedSemester && selectedSection === "") {
      const timer = setTimeout(() => {
        const trigger = document.getElementById("records-section-select-trigger");
        if (trigger) {
          trigger.click();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedSemester, selectedSection]);

  const handleSectionChange = (val: string) => {
    setSelectedSection(val);
    setPage(1);
  };

  const handleBatchChange = (val: string) => {
    setSelectedBatch(val);
    setPage(1);
  };

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    setPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  // Available Sections derived strictly from selected semester
  const availableSections = useMemo(() => {
    if (!filterMeta || !selectedSemester) return [];
    return filterMeta.sections.filter(
      (sec) => String(sec.semester_id) === String(selectedSemester)
    );
  }, [filterMeta, selectedSemester]);

  // Available Subjects filtered by semester if selected, or all branch subjects
  const availableSubjects = useMemo(() => {
    if (!filterMeta) return [];
    if (!selectedSemester) return filterMeta.subjects;
    return filterMeta.subjects.filter(
      (sub) => !sub.semester_id || String(sub.semester_id) === String(selectedSemester)
    );
  }, [filterMeta, selectedSemester]);

  // Mandatory Filter Condition: Semester, Section, Subject, AND Date Filter MUST be chosen
  const isFilterChosen = Boolean(
    selectedSemester && selectedSection && selectedSubject && selectedSubject !== "all" && startDate
  );

  // 3. Fetch Student Attendance Register strictly when mandatory filters are selected
  const fetchRecords = useCallback(async () => {
    if (!selectedSemester || !selectedSection || !selectedSubject || selectedSubject === "all" || !startDate) {
      setStudents([]);
      setSummaryStats(null);
      setFacultyInfo(null);
      setTotalRecordsCount(0);
      return;
    }

    const effectiveEndDate = endDate || startDate;

    setLoading(true);
    setError("");
    try {
      const res = await getHODStudentAttendanceSummary({
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

  // Clear all active filters and return to default unchosen state
  const handleResetFilters = () => {
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
  };

  // Date Presets
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
      const res = await getHODAttendanceRecordDetails(recordId, sDate, eDate);
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
        description: "No student records to export. Please choose a semester, section, subject, and date range first."
      });
      return;
    }

    const branchName = filterMeta?.branch?.name || "Branch";
    const subjectTitle = facultyInfo?.subject_name
      ? `${facultyInfo.subject_name}${facultyInfo.subject_code ? ` (${facultyInfo.subject_code})` : ""}`
      : "Subject Attendance";
    const assignedFaculty = facultyInfo?.assigned_faculty_name || "Not Assigned";
    const markedByFaculty = facultyInfo?.marked_by_faculty_name || "None";

    const exportRows = students.map((s, index) => ({
      "Sl No": index + 1,
      "Student Name": s.name,
      "USN / Roll No": s.usn,
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
    XLSX.writeFile(
      workbook,
      `HOD_${safeBranch}_${safeSubject}_Attendance_${dateFilterStr}.xlsx`
    );

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
        description: "No student records to export. Please choose a semester, section, subject, and date range first."
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

    const branchName = filterMeta?.branch?.name || "Department";
    const subjObj = availableSubjects.find(s => String(s.id) === selectedSubject);
    const subjectName = facultyInfo?.subject_name || subjObj?.name || "Subject";
    const subjectCode = facultyInfo?.subject_code || subjObj?.subject_code || "";
    const subjectTitle = subjectCode ? `${subjectName} (${subjectCode})` : subjectName;
    const assignedFaculty = facultyInfo?.assigned_faculty_name || (facultyInfo?.assigned_faculty && facultyInfo.assigned_faculty.length > 0 ? facultyInfo.assigned_faculty.join(", ") : "Not Assigned");
    const markedByFaculty = facultyInfo?.marked_by_faculty_name || (facultyInfo?.marked_by_faculty && facultyInfo.marked_by_faculty.length > 0 ? facultyInfo.marked_by_faculty.join(", ") : "None (No sessions recorded)");
    
    const semObj = filterMeta?.semesters.find(s => String(s.id) === selectedSemester);
    const semName = semObj ? `Semester ${semObj.number}` : selectedSemester ? `Semester ${selectedSemester}` : "--";
    const secObj = availableSections.find(s => String(s.id) === selectedSection);
    const secName = secObj ? `Section ${secObj.name}` : selectedSection ? `Section ${selectedSection}` : "--";
    const batchName = selectedBatch && selectedBatch !== "all" ? (filterMeta?.batches.find(b => String(b.id) === selectedBatch)?.name || selectedBatch) : "All Batches";

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
      head: [["#", "Student Name", "USN / Roll No", "Batch", "Semester", "Section", "Conducted", "Attended", "Absent", "Attendance %", "Eligibility Status"]],
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
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left", cellWidth: 46, fontStyle: "bold" },
        2: { halign: "center", cellWidth: 28 },
        3: { halign: "center", cellWidth: 24 },
        4: { halign: "center", cellWidth: 18 },
        5: { halign: "center", cellWidth: 16 },
        6: { halign: "center", cellWidth: 20 },
        7: { halign: "center", cellWidth: 20 },
        8: { halign: "center", cellWidth: 18 },
        9: { halign: "center", cellWidth: 24, fontStyle: "bold" },
        10: { halign: "center", cellWidth: 28 }
      },
      didDrawCell: (data: any) => {
        // Custom draw for status column with clean badge style
        if (data.section === "body" && data.column.index === 10) {
          const statusVal = String(tableRows[data.row.index]?.[10] || "");
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
        if (data.section === "body" && data.column.index === 9) {
          const pctStr = String(tableRows[data.row.index]?.[9] || "0%");
          const numPct = parseFloat(pctStr);
          const cond = tableRows[data.row.index]?.[6];
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
    const branchName = recordDetails.branch || filterMeta?.branch?.name || "--";
    const totalStudents = recordDetails.total_students ?? recordDetails.total_count ?? 0;
    const presentCount = recordDetails.present_count ?? 0;
    const absentCount = recordDetails.absent_count ?? 0;
    const sessionPct = recordDetails.present_percentage ?? 0;

    // Sheet 1: Comprehensive Lecture Breakdown Roster
    const headerRows: any[][] = [
      ["STALIGHT CAMPUS - LECTURE ATTENDANCE BREAKDOWN"],
      [],
      ["Session Date:", dateStr, "Class & Section:", className, "Academic Batch:", batchName],
      ["Subject:", subjectTitle, "Faculty:", facultyName, "Department / Branch:", branchName],
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
    doc.text("DEPARTMENT ATTENDANCE - STUDENT TIMELINE REPORT", textStartX, 18.5);

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
    const branchStr = filterMeta?.branch?.name || "Department";
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

  // Compute Filtered Stats
  const aggregateStats = useMemo(() => {
    if (!students.length || !summaryStats) {
      return { totalSessions: totalRecordsCount || 0, avgAttendance: 0, totalPresent: 0, totalAbsent: 0 };
    }
    const totalSessions = summaryStats.total_sessions || 0;
    const totalPresent = students.reduce((acc, s) => acc + (s.attended_classes || 0), 0);
    const totalAbsent = students.reduce((acc, s) => acc + (s.absent_classes || 0), 0);
    const avgAttendance = summaryStats.avg_attendance || 0;

    return { totalSessions, avgAttendance, totalPresent, totalAbsent };
  }, [students, summaryStats, totalRecordsCount]);

  // Batch chart data
  const batchChartData = useMemo(() => {
    if (filterMeta?.batch_stats && filterMeta.batch_stats.length > 0) {
      return filterMeta.batch_stats.map((b) => ({
        id: b.batch_id,
        name: b.batch_name,
        attendance: b.attendance_percentage,
        sessions: b.sessions,
        present: b.present,
        absent: b.absent
      }));
    }
    return [];
  }, [filterMeta]);

  // Semester chart data
  const semesterChartData = useMemo(() => {
    if (filterMeta?.semester_stats && filterMeta.semester_stats.length > 0) {
      return filterMeta.semester_stats.map((s) => ({
        id: s.semester_id,
        name: `Sem ${s.semester_number}`,
        attendance: s.attendance_percentage,
        sessions: s.sessions,
        present: s.present,
        absent: s.absent
      }));
    }
    return [];
  }, [filterMeta]);

  const currentChartData = chartView === "batch" ? batchChartData : semesterChartData;

  // Overall Department KPI Display Stats (unskewed — always derive from batch_stats avg)
  const displayStats = useMemo(() => {
    // If user has fetched filtered records, use those for accurate filtered view
    if (isFilterChosen && students.length > 0) {
      return aggregateStats;
    }
    // Always compute average from batch_stats to avoid skewed overall avg
    const activeBatches = batchChartData.filter((b) => b.sessions > 0);
    const unskewedAvg = activeBatches.length > 0
      ? (() => {
          const totalP = activeBatches.reduce((acc, b) => acc + b.present, 0);
          const totalA = activeBatches.reduce((acc, b) => acc + b.absent, 0);
          const total = totalP + totalA;
          return total > 0 ? Math.round((totalP / total) * 100) : 0;
        })()
      : (filterMeta?.overall?.avg_attendance ? Math.round(filterMeta.overall.avg_attendance) : 0);

    const totalSessions = activeBatches.length > 0
      ? activeBatches.reduce((acc, b) => acc + b.sessions, 0)
      : (filterMeta?.overall?.total_sessions || 0);
    const totalPresent = activeBatches.length > 0
      ? activeBatches.reduce((acc, b) => acc + b.present, 0)
      : (filterMeta?.overall?.total_present || 0);
    const totalAbsent = activeBatches.length > 0
      ? activeBatches.reduce((acc, b) => acc + b.absent, 0)
      : (filterMeta?.overall?.total_absent || 0);

    return {
      totalSessions,
      avgAttendance: unskewedAvg,
      totalPresent,
      totalAbsent
    };
  }, [isFilterChosen, students.length, aggregateStats, filterMeta, batchChartData]);

  // Executive Analytics Summary for HOD
  const hodAnalyticsSummary = useMemo(() => {
    const activeUnits = currentChartData.filter(d => d.sessions > 0);
    const unitsToUse = activeUnits.length > 0 ? activeUnits : currentChartData;
    if (!unitsToUse.length) {
      return {
        topUnit: null,
        satisfactoryCount: 0,
        atRiskCount: 0,
        criticalCount: 0,
        totalUnits: 0
      };
    }
    const sorted = [...unitsToUse].sort((a, b) => b.attendance - a.attendance);
    return {
      topUnit: sorted[0],
      satisfactoryCount: unitsToUse.filter(d => d.attendance >= 75).length,
      atRiskCount: unitsToUse.filter(d => d.attendance >= 50 && d.attendance < 75).length,
      criticalCount: unitsToUse.filter(d => d.attendance < 50).length,
      totalUnits: unitsToUse.length
    };
  }, [currentChartData]);


  // Filtered students for details modal
  const filteredModalStudents = useMemo(() => {
    if (!recordDetails) return { present: [], absent: [] };
    if (!modalSearch.trim()) {
      return { present: recordDetails.present || [], absent: recordDetails.absent || [] };
    }
    const q = modalSearch.toLowerCase();
    return {
      present: (recordDetails.present || []).filter(
        (s: any) => s.name?.toLowerCase().includes(q) || s.usn?.toLowerCase().includes(q)
      ),
      absent: (recordDetails.absent || []).filter(
        (s: any) => s.name?.toLowerCase().includes(q) || s.usn?.toLowerCase().includes(q)
      )
    };
  }, [recordDetails, modalSearch]);

  // Total pages calculation (use students.length as source of truth since all records are fetched at once)
  const totalPages = Math.max(1, Math.ceil((students.length || totalRecordsCount || 0) / pageSize));

  // Helper for pagination page numbers list
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    if (page - delta > 2) range.unshift("...");
    if (page + delta < totalPages - 1) range.push("...");
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  }, [page, totalPages]);

  return (
    <div
      id="hod-attendance-records-container"
      className="w-full max-w-none mx-auto space-y-4 sm:space-y-6"
    >
      {/* Department Attendance Intelligence Hub Card */}
      <Card
        className={cn(
          "w-full shadow-sm overflow-hidden transition-all duration-300",
          theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"
        )}
      >
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight">
                  Attendance Intelligence &amp; Overview
                </CardTitle>
                {filterMeta?.branch && (
                  <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                    {filterMeta.branch.name}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {displayStats.avgAttendance >= 75 ? "🟢 Department On Track" : "🟡 Attendance Review Required"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Actionable batch &amp; semester turn-out benchmarks compared against the university 75% threshold.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
              {/* Cards vs Chart View Switcher */}
              <div className="inline-flex rounded-xl border bg-muted/40 p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsTab("cards");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    analyticsTab === "cards"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Performance Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsTab("chart");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    analyticsTab === "chart"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Benchmark Chart</span>
                </button>
              </div>

              {/* Dimension Switcher: Batch-wise vs Semester-wise */}
              <div className="inline-flex rounded-xl border bg-muted/40 p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setChartView("batch")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    chartView === "batch"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Batches</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartView("semester")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    chartView === "semester"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Semesters</span>
                </button>
              </div>

              {/* Minimize / Expand Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                className="h-8 px-2.5 text-xs font-medium flex items-center gap-1 border-border/80"
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
                    <span className="text-primary font-semibold">Show Analytics</span>
                  </>
                )}
              </Button>
            </div>
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
                    displayStats.avgAttendance >= 75 ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
                <span>
                  Dept Benchmark: <strong>{displayStats.avgAttendance}%</strong>
                </span>
                <span className="text-muted-foreground font-normal">(Target: 75%)</span>
              </div>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                <strong>{displayStats.totalSessions}</strong> Sessions Conducted
              </span>
              <span className="text-muted-foreground">•</span>
              <span
                className={cn(
                  "font-semibold",
                  hodAnalyticsSummary.satisfactoryCount === hodAnalyticsSummary.totalUnits
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {hodAnalyticsSummary.satisfactoryCount} of {hodAnalyticsSummary.totalUnits}{" "}
                {chartView === "batch" ? "Batches" : "Semesters"} Compliant (≥75%)
              </span>
              {hodAnalyticsSummary.topUnit && (
                <>
                  <span className="text-muted-foreground hidden md:inline">•</span>
                  <span className="hidden md:inline">
                    Top Score: <strong>{hodAnalyticsSummary.topUnit.name}</strong> ({hodAnalyticsSummary.topUnit.attendance}%)
                  </span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAnalyticsExpanded(true)}
              className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 gap-1"
            >
              <span>Expand Details</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        ) : (
          /* Full Expanded Analytics */
          <CardContent className="p-4 sm:p-6 space-y-5">

            {/* View Mode 1: Interactive Performance Cards (Default & Highly Actionable) */}

            {analyticsTab === "cards" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>{chartView === "batch" ? "Academic Batch Turnout Cards" : "Semester Turnout Cards"}</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Click &ldquo;Filter Records&rdquo; on any card to immediately filter the table below for that cohort.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground hidden sm:inline-flex">
                    Target: 75% Attendance
                  </Badge>
                </div>

                {currentChartData.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No active {chartView === "batch" ? "batch" : "semester"} attendance recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                    {currentChartData.map((item) => {
                      const isSelected =
                        chartView === "batch"
                          ? String(selectedBatch) === String(item.id)
                          : String(selectedSemester) === String(item.id);
                      const isCompliant = item.attendance >= 75;
                      const isWarning = item.attendance >= 60 && item.attendance < 75;

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
                              {item.attendance}%
                            </div>
                          </div>

                          {/* Linear progress bar with 75% university target marker */}
                          <div className="space-y-1.5">
                            <div className="relative w-full bg-muted/80 h-2 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isCompliant ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, item.attendance))}%` }}
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
                              Turnout: <strong className="text-foreground">{item.attendance}%</strong>
                            </div>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (chartView === "batch") {
                                  const next = isSelected ? "all" : String(item.id);
                                  handleBatchChange(next);
                                  toast({
                                    title: isSelected ? "Batch Filter Cleared" : "Batch Filter Applied",
                                    description: isSelected ? "Showing all batches" : `Filtering records for ${item.name}`
                                  });
                                } else {
                                  const next = isSelected ? "" : String(item.id);
                                  handleSemesterChange(next);
                                  toast({
                                    title: isSelected ? "Semester Filter Cleared" : "Semester Filter Applied",
                                    description: isSelected ? "Cleared semester filter" : `Filtering records for ${item.name}`
                                  });
                                }
                              }}
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
                      data={currentChartData}
                      margin={{ top: 24, right: 24, left: -12, bottom: 12 }}
                      barCategoryGap={currentChartData.length <= 3 ? "35%" : currentChartData.length <= 6 ? "22%" : "12%"}
                    >
                      <defs>
                        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                        </linearGradient>
                        <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                        </linearGradient>
                        <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey="name"
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
                            const d = payload[0].payload;
                            const isGood = d.attendance >= 75;
                            const isWarning = d.attendance >= 50 && d.attendance < 75;
                            return (
                              <div className="bg-popover/95 backdrop-blur-sm p-3 rounded-xl border border-border shadow-xl space-y-1.5 min-w-[170px]">
                                <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
                                  <div className="font-semibold text-xs text-foreground truncate max-w-[120px]">
                                    {d.name}
                                  </div>
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-md text-xs font-semibold shrink-0",
                                      isGood
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : isWarning
                                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                    )}
                                  >
                                    {d.attendance}%
                                  </span>
                                </div>
                                <div className="text-[11px] space-y-1 text-muted-foreground pt-0.5">
                                  <div className="flex justify-between">
                                    <span>Total Sessions:</span>
                                    <strong className="text-foreground">{d.sessions}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Present Marks:</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400">{d.present}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Absent Marks:</span>
                                    <strong className="text-rose-600 dark:text-rose-400">{d.absent}</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="attendance"
                        radius={[8, 8, 2, 2]}
                        maxBarSize={currentChartData.length <= 3 ? 68 : currentChartData.length <= 6 ? 50 : 38}
                        className="cursor-pointer transition-all"
                      >
                        <LabelList
                          dataKey="attendance"
                          position="top"
                          formatter={(val: any) => `${val}%`}
                          fill={theme === "dark" ? "#e2e8f0" : "#1e293b"}
                          fontSize={12}
                          fontWeight={700}
                          offset={6}
                        />
                        {currentChartData.map((entry, idx) => {
                          const isSelected =
                            chartView === "batch"
                              ? selectedBatch === String(entry.id)
                              : selectedSemester === String(entry.id);
                          const gradFill =
                            entry.attendance >= 75
                              ? "url(#emeraldGrad)"
                              : entry.attendance >= 50
                              ? "url(#amberGrad)"
                              : "url(#roseGrad)";
                          return (
                            <Cell
                              key={`cell-${idx}`}
                              fill={gradFill}
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

      {/* 3. Main Attendance Records Management Card (Matching LowAttendance.tsx container and design) */}
      {/* 3. Main Attendance Records Management Card */}
      <Card
        className={cn(
          "w-full shadow-sm overflow-hidden",
          theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"
        )}
      >
        <div id="attendance-records-header">
          <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl font-semibold">
                  Attendance Records
                </CardTitle>
                {filterMeta?.branch && (
                  <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                    {filterMeta.branch.name}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select a {getInstitutionType() === "school" ? "class" : "semester"}, section, and date to view attendance records
              </CardDescription>
            </div>

            {/* Desktop Export Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                onClick={handleExportExcel}
                disabled={loading || students.length === 0}
                variant="outline"
                className="text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-sm transition-all duration-200 items-center justify-center gap-2 h-10 px-4 text-sm font-semibold"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export Excel</span>
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={loading || students.length === 0}
                variant="outline"
                className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-sm transition-all duration-200 items-center justify-center gap-2 h-10 px-4 text-sm font-semibold"
              >
                <FileText className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Export PDF</span>
              </Button>
            </div>

            {/* Mobile Export Buttons */}
            <div className="flex sm:hidden items-center gap-1.5">
              <Button
                onClick={handleExportExcel}
                disabled={loading || students.length === 0}
                size="icon"
                variant="outline"
                className="h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                title="Export Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={loading || students.length === 0}
                size="icon"
                variant="outline"
                className="h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                title="Export PDF"
              >
                <FileText className="w-4 h-4 text-rose-500" />
              </Button>
            </div>
          </CardHeader>
        </div>

        {/* Filters Section */}
        <div className="px-4 sm:px-6 py-4">
          <div className="space-y-4">
            {/* Row 1: Primary Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Batch Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                  Batch
                </label>
                <Select value={selectedBatch} onValueChange={handleBatchChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent
                    className={`max-h-[220px] overflow-y-auto custom-scrollbar ${
                      theme === "dark"
                        ? "bg-card border border-border text-foreground"
                        : "bg-white border border-gray-300 text-gray-900"
                    }`}
                  >
                    <SelectItem value="all">All Batches</SelectItem>
                    {filterMeta?.batches?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Semester Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                  {getInstitutionType() === "school" ? "Class" : translateTerminology("Semester")}
                  <span className="text-rose-500 ml-1 font-semibold">*</span>
                </label>
                <Select
                  value={selectedSemester}
                  onValueChange={handleSemesterChange}
                  disabled={loadingFilters || (filterMeta?.semesters.length || 0) === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        filterMeta?.semesters.length === 0
                          ? getInstitutionType() === "school"
                            ? "No class available"
                            : "No semester available"
                          : getInstitutionType() === "school"
                          ? "Choose Class"
                          : "Choose Semester"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent
                    className={`max-h-[220px] overflow-y-auto custom-scrollbar ${
                      theme === "dark"
                        ? "bg-card border border-border text-foreground"
                        : "bg-white border border-gray-300 text-gray-900"
                    }`}
                  >
                    {filterMeta?.semesters.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No semesters available
                      </div>
                    ) : (
                      filterMeta?.semesters.map((sem) => (
                        <SelectItem key={sem.id} value={String(sem.id)}>
                          {getInstitutionType() === "school"
                            ? `Class ${sem.number}`
                            : `Sem ${sem.number}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Section Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                  Section<span className="text-rose-500 ml-1 font-semibold">*</span>
                </label>
                <Select
                  value={selectedSection}
                  onValueChange={handleSectionChange}
                  disabled={!selectedSemester || availableSections.length === 0}
                >
                  <SelectTrigger
                    id="records-section-select-trigger"
                    className="w-full"
                    disabled={!selectedSemester || availableSections.length === 0}
                  >
                    <SelectValue
                      placeholder={
                        !selectedSemester
                          ? getInstitutionType() === "school"
                            ? "Choose Class first"
                            : "Choose Semester first"
                          : availableSections.length === 0
                          ? "No section available"
                          : "Choose Section"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent
                    className={`max-h-[220px] overflow-y-auto custom-scrollbar ${
                      theme === "dark"
                        ? "bg-card border border-border text-foreground"
                        : "bg-white border border-gray-300 text-gray-900"
                    }`}
                  >
                    {!selectedSemester ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        Select semester first
                      </div>
                    ) : availableSections.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No sections available
                      </div>
                    ) : (
                      availableSections.map((sec) => (
                        <SelectItem key={sec.id} value={String(sec.id)}>
                          Section {sec.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Subject Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                  Subject / Course<span className="text-rose-500 ml-1 font-semibold">*</span>
                </label>
                <Select
                  value={selectedSubject}
                  onValueChange={handleSubjectChange}
                  disabled={!selectedSemester || availableSubjects.length === 0}
                >
                  <SelectTrigger
                    id="records-subject-select-trigger"
                    className="w-full"
                    disabled={!selectedSemester || availableSubjects.length === 0}
                  >
                    <SelectValue
                      placeholder={
                        !selectedSemester
                          ? "Choose Semester first"
                          : availableSubjects.length === 0
                          ? "No subjects in semester"
                          : "Choose Subject"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent
                    className={`max-h-[220px] overflow-y-auto custom-scrollbar ${
                      theme === "dark"
                        ? "bg-card border border-border text-foreground"
                        : "bg-white border border-gray-300 text-gray-900"
                    }`}
                  >
                    {!selectedSemester ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        Select semester first
                      </div>
                    ) : availableSubjects.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No subjects available
                      </div>
                    ) : (
                      availableSubjects.map((sub) => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          {sub.name} ({sub.subject_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">
                  Date Range<span className="text-rose-500 ml-1 font-semibold">*</span>
                </label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left text-sm font-normal h-10 border-input bg-background px-3",
                        !startDate && !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate font-medium">
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
                    className="w-auto p-0 z-50 rounded-xl border shadow-lg overflow-hidden bg-popover"
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
            </div>

            {/* Row 2: Search Bar & Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student by name or USN..."
                  className="pl-10 pr-9 h-10 text-sm w-full"
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

              <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (!selectedSemester || !selectedSection || !selectedSubject || selectedSubject === "all" || !startDate) {
                      toast({
                        variant: "destructive",
                        title: "Selection Required",
                        description: `Please choose ${
                          getInstitutionType() === "school" ? "class" : "semester"
                        }, section, one subject, and date range first.`
                      });
                      return;
                    }
                    fetchRecords();
                  }}
                  disabled={loading}
                  className="h-10 text-sm font-semibold px-4 shadow-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Fetch Records</span>
                </Button>

                {(selectedSemester || selectedSection || selectedBatch !== "all" || selectedSubject || startDate || endDate || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-10 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CardContent: Mandatory Filter Empty State vs Loaded Records Table */}
        <CardContent className="pt-2 px-4 sm:px-6">
          {!isFilterChosen ? (
            /* Mandatory Filter Selection Empty State */
            <div
              className={`flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 my-2 ${
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
                {getInstitutionType() === "school"
                  ? "Select a batch, class, section, subject, and date range above to view attendance records."
                  : "Select a batch, semester, section, subject, and date range above to view attendance records."}
              </p>
            </div>
          ) : loading ? (
            <div className="py-4 space-y-3">
              <SkeletonTable rows={8} />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecords}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : students.length === 0 ? (
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
                No attendance sessions were recorded for the selected criteria and date range.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Subject & Faculty Information Banner */}
              <div
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4",
                  theme === "dark"
                    ? "bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border-primary/20"
                    : "bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50 border-primary/20"
                )}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/25">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-foreground">
                        {facultyInfo?.subject_name || availableSubjects.find((s) => String(s.id) === selectedSubject)?.name || "Subject Attendance"}
                      </span>
                      {(facultyInfo?.subject_code || availableSubjects.find((s) => String(s.id) === selectedSubject)?.subject_code) && (
                        <Badge variant="outline" className="text-xs font-mono font-semibold bg-background/80 border-primary/30">
                          {facultyInfo?.subject_code || availableSubjects.find((s) => String(s.id) === selectedSubject)?.subject_code}
                        </Badge>
                      )}
                      {facultyInfo?.subject_type && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                          {facultyInfo.subject_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>
                        Sem {filterMeta?.semesters.find((s) => String(s.id) === selectedSemester)?.number ?? selectedSemester} - Sec {availableSections.find((s) => String(s.id) === selectedSection)?.name ?? selectedSection}
                      </span>
                      <span>•</span>
                      <span>
                        {selectedBatch !== "all"
                          ? `Batch: ${filterMeta?.batches.find((b) => String(b.id) === selectedBatch)?.name ?? selectedBatch}`
                          : "All Batches"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs shrink-0 border-t md:border-t-0 md:border-l border-border/60 pt-3 md:pt-0 md:pl-4">
                  {/* Assigned Faculty */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block">Assigned Faculty</span>
                      <span className="font-semibold text-foreground">
                        {facultyInfo?.assigned_faculty_name || "Not Assigned"}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:block w-px h-6 bg-border/60" />

                  {/* Attendance Marked By Faculty */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block">Attendance Marked By</span>
                      <span className="font-semibold text-foreground">
                        {facultyInfo?.marked_by_faculty_name || "No sessions recorded"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary KPI Strip for the Filtered Class & Date Range */}
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
              <div className="border rounded-xl overflow-hidden custom-scrollbar bg-card shadow-xs">
                <div className="overflow-x-auto w-full">
                  <Table className="w-full min-w-[780px]">
                    <TableHeader>
                      <TableRow className={theme === "dark" ? "bg-muted/40" : "bg-gray-50/80"}>
                        <TableHead className="w-12 text-center text-xs font-semibold">#</TableHead>
                        <TableHead className="text-xs font-semibold">Student Details</TableHead>
                        <TableHead className="text-xs font-semibold">Class & Batch</TableHead>
                        <TableHead className="text-center text-xs font-semibold">Classes Conducted</TableHead>
                        <TableHead className="text-center text-xs font-semibold">Classes Attended</TableHead>
                        <TableHead className="text-center text-xs font-semibold">Classes Absent</TableHead>
                        <TableHead className="text-center text-xs font-semibold">Attendance %</TableHead>
                        <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-center text-xs font-semibold">Daily History</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.map((s, idx) => {
                        const rowNumber = (page - 1) * pageSize + idx + 1;
                        const pct = s.attendance_percentage;
                        const badgeColor =
                          s.conducted_classes === 0
                            ? "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30"
                            : pct >= 75
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : pct >= 60
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";

                        const statusBadge =
                          s.status === "Eligible"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : s.status === "Warning"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : s.status === "No Classes"
                            ? "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";

                        return (
                          <TableRow
                            key={s.id}
                            className={cn(
                              "transition-colors",
                              theme === "dark" ? "hover:bg-accent/40" : "hover:bg-gray-50/70"
                            )}
                          >
                            <TableCell className="text-center text-xs text-muted-foreground font-medium">
                              {rowNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs sm:text-sm text-foreground">
                                {s.name}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                {s.usn}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="text-xs font-medium text-foreground">
                                Sem {s.semester ?? "--"} - Sec {s.section ?? "--"}
                              </div>
                              {s.batch && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal mt-0.5">
                                  Batch: {s.batch}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs sm:text-sm text-foreground">
                              {s.conducted_classes}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              {s.attended_classes}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                              {s.absent_classes}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center font-semibold px-2.5 py-0.5 rounded-full text-xs border",
                                  badgeColor
                                )}
                              >
                                {pct}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn("text-[11px] font-semibold px-2 py-0.5", statusBadge)}
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

        {/* Robust Pagination Controls (matching Low Attendance footer pattern) */}
        {isFilterChosen && totalRecordsCount > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-6 py-4 border-t border-border mt-auto">
            <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(page * pageSize, totalRecordsCount)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalRecordsCount}
                </span>{" "}
                records
              </span>
              <span className="text-muted-foreground/60">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-7 w-16 text-xs">
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
                className="h-8 w-8 p-0"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 px-2.5 text-xs flex items-center gap-1"
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* View Details Student Attendance Roster Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Lecture Attendance Breakdown
              </DialogTitle>
              {recordDetails && (
                <Button
                  id="hod-modal-header-export-excel-btn"
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
            {recordDetails && (
              <DialogDescription className="text-xs text-muted-foreground mt-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    <strong>Date:</strong> {formatDateToDDMMYYYY(recordDetails.date)}
                  </span>
                  <span>
                    <strong>Class:</strong> Sem {recordDetails.semester} - Sec{" "}
                    {recordDetails.section}
                  </span>
                  {recordDetails.batch_name && (
                    <span>
                      <strong>Batch:</strong> {recordDetails.batch_name}
                    </span>
                  )}
                  <span>
                    <strong>Subject:</strong> {recordDetails.subject} (
                    {recordDetails.subject_code || "N/A"})
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                  <div>
                    <strong>Marked By:</strong> {recordDetails.faculty_name}
                  </div>
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
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loadingDetails ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading attendance roster...</p>
              </div>
            ) : recordDetails ? (
              <>
                {/* Summary Stat Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-xs text-muted-foreground">Total Students</div>
                    <div className="text-lg font-semibold mt-0.5">{recordDetails.total_count}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <div className="text-xs font-medium">Present</div>
                    <div className="text-lg font-semibold mt-0.5">{recordDetails.present_count}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                    <div className="text-xs font-medium">Absent</div>
                    <div className="text-lg font-semibold mt-0.5">{recordDetails.absent_count}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <div className="text-xs font-medium">Attendance</div>
                    <div className="text-lg font-semibold mt-0.5">
                      {recordDetails.present_percentage}%
                    </div>
                  </div>
                </div>

                {/* Search within Modal */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search student by name or USN..."
                    className="pl-10 h-9 text-xs"
                  />
                </div>

                {/* Side-by-Side Present & Absent Lists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Present List */}
                  <div className="border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/[0.02]">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Present Students ({filteredModalStudents.present.length})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">Subject %</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {filteredModalStudents.present.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-4 text-center italic">
                          No present students
                        </div>
                      ) : (
                        filteredModalStudents.present.map((s: any) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-background text-xs border border-border/70 hover:border-primary/40 transition-colors gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate text-foreground">{s.name}</div>
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
                                    : (s.subject_percentage ?? 0) >= 50
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
                        ))
                      )}
                    </div>
                  </div>

                  {/* Absent List */}
                  <div className="border border-rose-500/30 rounded-lg p-3 bg-rose-500/[0.02]">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-4 h-4" />
                        <span>Absent Students ({filteredModalStudents.absent.length})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">Subject %</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {filteredModalStudents.absent.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-4 text-center italic">
                          No absent students
                        </div>
                      ) : (
                        filteredModalStudents.absent.map((s: any) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-background text-xs border border-border/70 hover:border-primary/40 transition-colors gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate text-foreground">{s.name}</div>
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
                                    : (s.subject_percentage ?? 0) >= 50
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
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
              {recordDetails && (
                <span>
                  Total: <strong>{recordDetails.total_count}</strong> students •{" "}
                  <span className="text-emerald-600 font-semibold">{recordDetails.present_count} present</span> •{" "}
                  <span className="text-rose-600 font-semibold">{recordDetails.absent_count} absent</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
              <Button
                id="hod-modal-footer-export-excel-btn"
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

export default HODAttendanceRecords;
