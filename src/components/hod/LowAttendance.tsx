import { translateTerminology, getTerm, getInstitutionType } from "@/utils/institutionConfig";
import React, { useState, useEffect, ReactNode, Component } from "react";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, SlidersHorizontal, Eye, X, BookOpen } from "lucide-react";
import { FaUsers, FaExclamationTriangle, FaChartLine, FaUserGraduate, FaCalendarCheck } from 'react-icons/fa';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SkeletonCard, SkeletonTable } from "../ui/skeleton";
import { 
  manageSections, 
  sendNotification, 
  getLowAttendanceStudents, 
  getLowPerformanceStudents,
  getHODDashboardBootstrap, 
  getHODStudentBootstrap,
  getSemesters
} from "../../utils/hod_api";
import { getAdminAttendanceFilters } from "../../utils/admin_api";
import { useTheme } from "../../context/ThemeContext";
import { useHODBootstrap } from "../../context/HODBootstrapContext";

// Interfaces
interface LowAttendanceProps {
  setError: (error: string | null) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface Student {
  student_id: string;
  usn: string;
  name: string;
  subject: string;
  section: string;
  semester: number;
  attendance_percentage: number | string;
  performance_percentage?: number | string;
  subjects_breakdown?: Array<{ name: string; avg: number; total?: number; present?: number }>;
  recently_notified?: boolean;
}

interface BatchItem {
  id: string;
  name: string;
}

interface BranchItem {
  id: string;
  name: string;
}

interface Semester {
  id: string;
  number: number;
  branch_id?: string;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-6 text-red-500">
          <h2>Error: {this.state.errorMessage}</h2>
          <p>Please try refreshing the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Performance & Attendance Table Component
const AttendanceTable = React.memo(({
  students,
  theme,
  activeTab,
  threshold,
  notifyingStudents,
  notifiedStudents,
  onNotifyStudent,
  onViewBreakdown
}: {
  students: Student[];
  theme: string;
  activeTab: 'attendance' | 'performance';
  threshold: number;
  notifyingStudents: Record<string, boolean>;
  notifiedStudents: Record<string, boolean>;
  onNotifyStudent: (student: Student) => void;
  onViewBreakdown: (student: Student) => void;
}) => {
  const getScoreColorClass = (val: number | string): string => {
    if (val === "NA" || val === null || val === undefined) {
      return "text-gray-400";
    }
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return "text-gray-400";

    if (num < threshold * 0.75) return "text-red-500";
    if (num < threshold) return "text-orange-500";
    return "text-green-500";
  };

  const formatPercentage = (val: number | string): string => {
    if (val === "NA" || val === null || val === undefined) {
      return "NA";
    }
    if (typeof val === "string") {
      return val.includes('%') ? val : `${val}%`;
    }
    return `${val}%`;
  };

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className={`w-full text-sm text-left border-collapse ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
        <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card border-b border-border' : 'bg-gray-50 border-b border-gray-200'}`}>
          <tr>
            <th className="py-3 px-4 font-semibold whitespace-nowrap">{translateTerminology("USN")}</th>
            <th className="py-3 px-4 font-semibold whitespace-nowrap">Name</th>
            <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">
              {activeTab === 'attendance' ? 'Subject Breakdown' : 'Subject Breakdown'}
            </th>
            <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">
              {activeTab === 'attendance' ? 'Overall Attendance' : 'Overall Total Avg'}
            </th>
            <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
          {students.map((student, idx) => {
            const displayPercentage = activeTab === 'attendance'
              ? student.attendance_percentage
              : (student.performance_percentage ?? student.attendance_percentage);

            const subjectCount = student.subjects_breakdown?.length || 1;

            return (
              <tr
                key={`${student.student_id}-${student.subject}-${idx}`}
                className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent/50' : 'hover:bg-gray-50'}`}>
                <td className="py-3 px-4 font-semibold whitespace-nowrap">{student.usn}</td>
                <td className="py-3 px-4 font-semibold whitespace-nowrap">{student.name}</td>
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewBreakdown(student)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-150 transform hover:scale-102 active:scale-98 ${
                      theme === 'dark'
                        ? 'bg-muted/40 border-border hover:bg-muted/80 text-foreground'
                        : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-800 shadow-2xs'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>View Breakdown</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      theme === 'dark' ? 'bg-primary/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      {subjectCount}
                    </span>
                  </Button>
                </td>
                <td className={`py-3 px-4 text-center font-bold text-base whitespace-nowrap ${getScoreColorClass(displayPercentage)}`}>
                  {formatPercentage(displayPercentage)}
                </td>
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <Button
                    size="sm"
                    onClick={() => onNotifyStudent(student)}
                    className={`px-4 py-1 text-xs min-w-[90px] flex items-center justify-center gap-1 mx-auto rounded-md shadow-sm border transition-all duration-200 ease-in-out transform hover:scale-105
                      ${notifiedStudents?.[student.student_id] ?
                        "bg-green-700 border-green-600 text-white cursor-default" :
                        "bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"}`
                    }
                    disabled={
                      notifyingStudents?.[student.student_id] ||
                      notifiedStudents?.[student.student_id]
                    }>
                    {notifyingStudents?.[student.student_id] ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Sending...
                      </>
                    ) : notifiedStudents?.[student.student_id] ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Notified
                      </>
                    ) : (
                      "Notify"
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

const LowAttendance = ({ setError }: LowAttendanceProps) => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const bootstrap = useHODBootstrap();
  
  const userRole = (sessionStorage.getItem("role") || "").toLowerCase();
  const isPrincipalOrAdmin = ['principal', 'admin', 'dean', 'org_admin', 'superadmin'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'attendance' | 'performance'>('attendance');
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(75);
  const [performanceThreshold, setPerformanceThreshold] = useState<number>(40);
  const [selectedBreakdownStudent, setSelectedBreakdownStudent] = useState<Student | null>(null);
  const [studentToNotifyConfirm, setStudentToNotifyConfirm] = useState<Student | null>(null);

  // Dropdown open states for auto-advancing
  const [batchOpen, setBatchOpen] = useState<boolean>(false);
  const [branchOpen, setBranchOpen] = useState<boolean>(false);
  const [semesterOpen, setSemesterOpen] = useState<boolean>(false);
  const [sectionOpen, setSectionOpen] = useState<boolean>(false);

  const currentThreshold = activeTab === 'attendance' ? attendanceThreshold : performanceThreshold;

  const [state, setState] = useState({
    selectedBatch: "",
    selectedBranch: "",
    selectedSemester: "",
    selectedSection: "",
    students: [] as Student[],
    batches: [] as BatchItem[],
    branches: [] as BranchItem[],
    allSemesters: [] as Semester[],
    semesters: bootstrap?.semesters as Semester[] || [] as Semester[],
    sections: [] as Section[],
    loading: true,
    branchId: bootstrap?.branch_id || "",
    notifyingStudents: {} as Record<string, boolean>,
    notifiedStudents: {} as Record<string, boolean>,
    notifyingAll: false,
    showNotifyAllConfirm: false,
    notifyAllCount: 0,
    // Global stats
    totalStudentsGlobal: 0,
    lowCountGlobal: 0,
    avgScoreGlobal: 0,
    // Pagination state
    currentPage: 1,
    totalCount: 0,
    pageSize: 50,
    next: null as string | null,
    previous: null as string | null,
    exportingExcel: false
  });

  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Sync with bootstrap context for HOD if data arrives after mount
  useEffect(() => {
    if (!isPrincipalOrAdmin && bootstrap?.branch_id && !state.branchId) {
      updateState({
        branchId: bootstrap.branch_id,
        semesters: bootstrap.semesters as Semester[] || [],
        loading: false
      });
    }
  }, [bootstrap, isPrincipalOrAdmin, state.branchId]);

  // Pagination functions
  const goToNextPage = () => {
    if (state.next) {
      updateState({ currentPage: state.currentPage + 1 });
    }
  };

  const goToPreviousPage = () => {
    if (state.previous) {
      updateState({ currentPage: state.currentPage - 1 });
    }
  };

  // Filter change handlers with auto-advancing dropdowns
  const handleBatchChange = (value: string) => {
    setBatchOpen(false);
    updateState({
      selectedBatch: value,
      students: [],
      currentPage: 1,
      totalCount: 0,
      next: null,
      previous: null
    });
    // Auto-open next dropdown
    if (isPrincipalOrAdmin) {
      setTimeout(() => {
        setBranchOpen(true);
      }, 150);
    } else {
      // For HOD, their branch is already locked & selected, so auto-open Semester
      setTimeout(() => {
        setSemesterOpen(true);
      }, 150);
    }
  };

  const handleBranchChange = async (value: string) => {
    setBranchOpen(false);
    updateState({
      selectedBranch: value,
      branchId: value,
      selectedSemester: "",
      selectedSection: "",
      sections: [],
      students: [],
      currentPage: 1,
      totalCount: 0,
      next: null,
      previous: null
    });

    try {
      const semRes = await getSemesters(value);
      if (semRes.success && semRes.data) {
        updateState({ semesters: semRes.data });
      } else {
        const filtered = state.allSemesters.filter(s => !s.branch_id || String(s.branch_id) === String(value));
        updateState({ semesters: filtered });
      }
    } catch {
      const filtered = state.allSemesters.filter(s => !s.branch_id || String(s.branch_id) === String(value));
      updateState({ semesters: filtered });
    }

    // Auto-open Semester dropdown
    setTimeout(() => {
      setSemesterOpen(true);
    }, 150);
  };

  const handleSemesterChange = (value: string) => {
    setSemesterOpen(false);
    updateState({
      selectedSemester: value,
      selectedSection: "",
      students: [],
      currentPage: 1,
      totalCount: 0,
      next: null,
      previous: null
    });
  };

  const handleSectionChange = (value: string) => {
    setSectionOpen(false);
    updateState({
      selectedSection: value,
      students: [],
      currentPage: 1,
      totalCount: 0,
      next: null,
      previous: null
    });
  };

  const handleTabChange = (tab: 'attendance' | 'performance') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    updateState({
      students: [],
      currentPage: 1,
      totalCount: 0,
      next: null,
      previous: null
    });
  };

  const handleThresholdChange = (newVal: number) => {
    const validVal = isNaN(newVal) ? (activeTab === 'attendance' ? 75 : 40) : Math.max(1, Math.min(100, newVal));
    if (activeTab === 'attendance') {
      setAttendanceThreshold(validVal);
    } else {
      setPerformanceThreshold(validVal);
    }
    updateState({
      currentPage: 1,
      next: null,
      previous: null
    });
  };

  // Load metadata on mount based on role
  useEffect(() => {
    const loadMetadata = async () => {
      updateState({ loading: true });
      try {
        if (isPrincipalOrAdmin) {
          const filterRes = await getAdminAttendanceFilters();
          if (filterRes.success && filterRes.data) {
            updateState({
              batches: (filterRes.data.batches || []) as BatchItem[],
              branches: (filterRes.data.branches || []) as BranchItem[],
              allSemesters: (filterRes.data.semesters || []) as Semester[],
              semesters: [],
              sections: [],
              loading: false
            });
          } else {
            updateState({ loading: false });
          }
        } else {
          // HOD mode: load profile, semesters, batches
          const bootstrapResponse = await getHODStudentBootstrap(["profile", "semesters", "batches"]);
          if (!bootstrapResponse.success || !bootstrapResponse.data) {
            throw new Error("Failed to fetch bootstrap data");
          }
          const branchId = bootstrapResponse.data.profile?.branch_id;
          const branchName = bootstrapResponse.data.profile?.branch || "My Branch";
          if (!branchId) {
            throw new Error("Branch ID not found in profile");
          }
          updateState({
            branchId: String(branchId),
            selectedBranch: String(branchId),
            branches: [{ id: String(branchId), name: branchName }] as BranchItem[],
            batches: (bootstrapResponse.data.batches || []) as BatchItem[],
            semesters: (bootstrapResponse.data.semesters || []) as Semester[],
            loading: false
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch metadata";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
        updateState({ loading: false });
      }
    };

    loadMetadata();
  }, [isPrincipalOrAdmin, toast, setError]);

  // Load sections when semester changes
  useEffect(() => {
    const loadSections = async () => {
      const activeBranchId = isPrincipalOrAdmin ? state.selectedBranch : state.branchId;
      if (!state.selectedSemester || !activeBranchId) {
        updateState({ sections: [], selectedSection: "" });
        return;
      }

      try {
        const sectionsResponse = await manageSections({ branch_id: activeBranchId, semester_id: state.selectedSemester }, "GET");
        if (!sectionsResponse.success || !sectionsResponse.data) {
          throw new Error("Failed to fetch sections");
        }

        updateState({
          sections: sectionsResponse.data,
          selectedSection: ""
        });

        // Auto-open Section dropdown once sections are ready
        setTimeout(() => {
          setSectionOpen(true);
        }, 150);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch sections";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    };

    loadSections();
  }, [state.selectedSemester, state.selectedBranch, state.branchId, isPrincipalOrAdmin, toast, setError]);

  // Load students: Gated until all necessary criteria are selected
  useEffect(() => {
    const loadStudents = async () => {
      const activeBranchId = isPrincipalOrAdmin ? state.selectedBranch : state.branchId;
      
      // Strict gating: Both Principal & HOD need Batch, Branch, Sem, Sec
      const areFiltersComplete = Boolean(
        state.selectedBatch &&
        (state.selectedBranch || activeBranchId) &&
        state.selectedSemester &&
        state.selectedSection
      );

      if (!areFiltersComplete) {
        updateState({ 
          students: [], 
          loading: false,
          totalCount: 0,
          totalStudentsGlobal: 0,
          lowCountGlobal: 0,
          avgScoreGlobal: 0
        });
        return;
      }

      updateState({ loading: true });
      try {
        let studentsResponse: any;
        const queryParams = {
          batch_id: state.selectedBatch || undefined,
          semester_id: state.selectedSemester,
          section_id: state.selectedSection,
          threshold: currentThreshold,
          page: state.currentPage,
          page_size: state.pageSize
        };

        if (activeTab === 'attendance') {
          studentsResponse = await getLowAttendanceStudents(activeBranchId, queryParams);
        } else {
          studentsResponse = await getLowPerformanceStudents(activeBranchId, queryParams);
        }

        const studentsArray = studentsResponse?.data?.students || [];
        const statsObj = studentsResponse?.data?.stats || {};

        const studentsData: Student[] = studentsArray.map((student: any) => ({
          student_id: student.student_id,
          usn: student.usn,
          name: student.name,
          subject: student.subject,
          section: student.section || "Section A",
          semester: student.semester || 0,
          attendance_percentage: student.attendance_percentage,
          performance_percentage: student.performance_percentage ?? student.attendance_percentage,
          subjects_breakdown: student.subjects_breakdown || [],
          recently_notified: student.recently_notified
        }));

        const notifiedMap: Record<string, boolean> = {};
        studentsArray.forEach((student: any) => {
          if (student.recently_notified) {
            notifiedMap[student.student_id] = true;
          }
        });

        const lowCount = activeTab === 'attendance'
          ? (statsObj.low_attendance_count ?? studentsResponse?.count ?? studentsData.length)
          : (statsObj.low_performance_count ?? statsObj.low_attendance_count ?? studentsResponse?.count ?? studentsData.length);

        const avgScore = activeTab === 'attendance'
          ? (statsObj.avg_attendance ?? 0)
          : (statsObj.avg_performance ?? statsObj.avg_attendance ?? 0);

        updateState({
          students: studentsData,
          loading: false,
          notifiedStudents: notifiedMap,
          totalCount: studentsResponse?.count || 0,
          totalStudentsGlobal: statsObj.total_students || studentsResponse?.count || studentsData.length,
          lowCountGlobal: lowCount,
          avgScoreGlobal: avgScore,
          next: studentsResponse?.next,
          previous: studentsResponse?.previous,
          currentPage: studentsResponse?.current_page || state.currentPage
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch students";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
        updateState({ loading: false });
      }
    };

    loadStudents();
  }, [
    state.selectedBatch,
    state.selectedBranch,
    state.selectedSemester, 
    state.selectedSection, 
    state.currentPage, 
    state.pageSize, 
    state.branchId, 
    isPrincipalOrAdmin,
    activeTab, 
    currentThreshold, 
    toast, 
    setError
  ]);

  // Excel Export
  const exportExcel = async () => {
    const studentsToExport = state.students;
    if (studentsToExport.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No students to export" });
      return;
    }

    const activeBranchId = isPrincipalOrAdmin ? state.selectedBranch : state.branchId;
    updateState({ exportingExcel: true });
    try {
      const params = new URLSearchParams({
        branch_id: activeBranchId,
        semester_id: state.selectedSemester,
        section_id: state.selectedSection,
        threshold: currentThreshold.toString(),
      });
      if (state.selectedBatch) {
        params.append("batch_id", state.selectedBatch);
      }

      const endpoint = activeTab === 'attendance'
        ? `${API_ENDPOINT}/hod/low-attendance/export-excel/?${params}`
        : `${API_ENDPOINT}/hod/low-performance/export-excel/?${params}`;

      const response = await fetchWithTokenRefresh(endpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        const prefix = activeTab === 'attendance' ? 'Low_Attendance_Report' : 'Low_Performance_Report';
        let filename = `${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Error", description: result.message || "Failed to export Excel" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error while exporting Excel" });
    } finally {
      updateState({ exportingExcel: false });
    }
  };

  // Notify Single Student
  const notifyStudent = async (student: Student) => {
    try {
      setState((prev) => ({
        ...prev,
        notifyingStudents: { ...prev.notifyingStudents, [student.student_id]: true }
      }));

      const title = activeTab === 'attendance' ? "Low Attendance Alert" : "Academic Performance Alert";
      const message = activeTab === 'attendance'
        ? `Dear ${student.name}, your attendance in ${student.subject} is ${student.attendance_percentage}%. Please improve your attendance.`
        : `Dear ${student.name}, your average score in ${student.subject} is ${student.performance_percentage ?? student.attendance_percentage}%. Please focus on your academic performance.`;

      const response = await sendNotification({
        action: "notify",
        title: title,
        student_id: student.usn,
        message: message,
        branch_id: state.branchId
      });

      if (response.success) {
        toast({
          title: "Notification Sent",
          description: `Notification sent to ${student.name}`
        });
        setState((prev) => ({
          ...prev,
          notifiedStudents: { ...prev.notifiedStudents, [student.student_id]: true }
        }));
      } else {
        const msg = response.message || "Could not send notification";
        const isSkipped = msg.toLowerCase().includes("recently notified") || msg.toLowerCase().includes("skipping");
        if (isSkipped) {
          toast({
            title: "Already Notified",
            description: `${student.name} was already notified recently. Please wait before notifying again.`
          });
          setState((prev) => ({
            ...prev,
            notifiedStudents: { ...prev.notifiedStudents, [student.student_id]: true }
          }));
        } else {
          toast({ variant: "destructive", title: "Failed to Send", description: msg });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error while sending notification";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setState((prev) => ({
        ...prev,
        notifyingStudents: { ...prev.notifyingStudents, [student.student_id]: false }
      }));
    }
  };

  const handleNotifyAllClick = () => {
    const studentsToNotify = state.students.filter(
      (s) => !state.notifiedStudents[s.student_id] && !state.notifyingStudents[s.student_id]
    );

    if (studentsToNotify.length === 0) {
      toast({
        title: "Information",
        description: "All students in the current view have already been notified."
      });
      return;
    }

    updateState({ showNotifyAllConfirm: true, notifyAllCount: studentsToNotify.length });
  };

  const confirmNotifyAll = async () => {
    updateState({ showNotifyAllConfirm: false });
    const studentsToNotify = state.students.filter(
      (s) => !state.notifiedStudents[s.student_id] && !state.notifyingStudents[s.student_id]
    );

    updateState({ notifyingAll: true });

    try {
      const title = activeTab === 'attendance' ? "Low Attendance Alert" : "Academic Performance Alert";
      const message = activeTab === 'attendance'
        ? `Your attendance is below the ${currentThreshold}% threshold. Please attend classes regularly.`
        : `Your academic performance is below the ${currentThreshold}% benchmark. Please meet your faculty/mentor.`;

      const response = await sendNotification({
        action: "notify_low_attendance",
        title: title,
        student_ids: studentsToNotify.map(s => s.usn),
        threshold: currentThreshold,
        message: message,
        branch_id: state.branchId
      });

      const msg = response.message || "";
      const isAllSkipped = !response.success && (msg.toLowerCase().includes("recently notified") || msg.toLowerCase().includes("skipped"));
      const isQuotaExhausted = !response.success && msg.toLowerCase().includes("quota");

      if (response.success) {
        const sent = response.success_count ?? studentsToNotify.length;
        const failed = response.failed_count ?? 0;
        toast({
          title: "Bulk Notification Sent",
          description: msg || `Notifications sent to ${sent} student${sent !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}.`
        });
        const newNotified = { ...state.notifiedStudents };
        studentsToNotify.forEach(s => {
          newNotified[s.student_id] = true;
        });
        updateState({ notifiedStudents: newNotified });
      } else if (isAllSkipped) {
        toast({
          title: "Already Notified",
          description: "All selected students were recently notified. Please wait before sending again."
        });
        const newNotified = { ...state.notifiedStudents };
        studentsToNotify.forEach(s => {
          newNotified[s.student_id] = true;
        });
        updateState({ notifiedStudents: newNotified });
      } else if (isQuotaExhausted) {
        toast({ variant: "destructive", title: "Daily Quota Reached", description: "You have reached your daily notification limit. Try again tomorrow." });
      } else {
        toast({ variant: "destructive", title: "Failed to Send", description: msg || "Failed to send bulk notifications" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error while sending notifications";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      updateState({ notifyingAll: false });
    }
  };

  const totalStudents = state.totalStudentsGlobal;
  const lowCount = state.lowCountGlobal;
  const avgScore = state.avgScoreGlobal;

  return (
    <ErrorBoundary>
      <div id="hod-low-attendance-container" className={`text-base w-full max-w-none mx-auto sm:px-0 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-5 p-1.5 rounded-xl bg-gray-200/70 dark:bg-muted/60 w-fit max-w-full overflow-x-auto shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange('attendance')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-card/50'
            }`}
          >
            <FaCalendarCheck className="w-4 h-4" />
            <span>Low Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('performance')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-card/50'
            }`}
          >
            <FaUserGraduate className="w-4 h-4" />
            <span>Low Performance</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div id="low-attendance-stats-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {state.loading && state.students.length === 0 ? (
            <>
              <SkeletonCard className="h-32" />
              <SkeletonCard className="h-32" />
              <SkeletonCard className="h-32" />
            </>
          ) : (
            <>
              <Card className={`${theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'} w-full relative`}>
                <CardHeader className="pb-2 px-3 sm:px-4">
                  <CardTitle className={`text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Total Students
                  </CardTitle>
                </CardHeader>
                <CardContent className={`flex items-center justify-between text-3xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  <span className="flex-1">{totalStudents}</span>
                </CardContent>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50'}`}>
                  <FaUsers className={theme === 'dark' ? 'text-blue-400 w-8 h-8 block' : 'text-blue-600 w-8 h-8 block'} />
                </div>
              </Card>

              <Card className={`${theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'} w-full relative`}>
                <CardHeader className="pb-2 px-3 sm:px-4">
                  <CardTitle className={`text-base ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {activeTab === 'attendance' ? `Low Attendance (<${attendanceThreshold}%)` : `Low Performance (<${performanceThreshold}%)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`flex items-center justify-between text-3xl font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  <span className="flex-1">{lowCount}</span>
                </CardContent>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full ${theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50'}`}>
                  <FaExclamationTriangle className={theme === 'dark' ? 'text-red-400 w-8 h-8 block' : 'text-red-600 w-8 h-8 block'} />
                </div>
              </Card>

              <Card className={`${theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'} w-full relative`}>
                <CardHeader className="pb-2 px-3 sm:px-4">
                  <CardTitle className={`text-base ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {activeTab === 'attendance' ? 'Avg Attendance' : 'Avg Performance'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`flex items-center justify-between text-3xl font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  <span className="flex-1">{avgScore}%</span>
                </CardContent>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50'}`}>
                  <FaChartLine className={theme === 'dark' ? 'text-blue-400 w-8 h-8 block' : 'text-blue-600 w-8 h-8 block'} />
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Main Management Card */}
        <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'}>
          <div id="low-attendance-dashboard-header">
            <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start justify-between w-full sm:w-auto">
                <div className="flex-1">
                  <CardTitle className={`text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {activeTab === 'attendance' ? 'Low Attendance Management' : 'Low Performance Management'}
                  </CardTitle>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    {activeTab === 'attendance'
                      ? `Monitor and notify students with attendance below ${attendanceThreshold}%`
                      : `Monitor and notify students with academic scores below ${performanceThreshold}%`}
                  </p>
                </div>
                {/* Mobile Download Excel Icon Button */}
                <Button
                  onClick={exportExcel}
                  disabled={state.loading || state.students.length === 0 || state.exportingExcel}
                  size="icon"
                  variant="outline"
                  className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                >
                  {state.exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                onClick={exportExcel}
                disabled={state.loading || state.students.length === 0 || state.exportingExcel}
                className="hidden sm:flex text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200 w-full sm:w-auto items-center justify-center gap-2 h-10 px-4">
                {state.exportingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Excel</span>
                  </>
                )}
              </Button>
            </CardHeader>
          </div>

          {/* Filters & Threshold Bar */}
          <div className={`px-4 sm:px-6 py-3 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-wrap gap-3 items-start sm:items-end w-full lg:w-auto">
                {/* Batch Filter - Shown for both Principal and HOD */}
                <div className="flex flex-col flex-1 sm:flex-none sm:w-44">
                  <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Batch
                  </label>
                  <Select
                    value={state.selectedBatch}
                    onValueChange={handleBatchChange}
                    open={batchOpen}
                    onOpenChange={setBatchOpen}
                    disabled={state.loading || state.batches.length === 0}
                  >
                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder={state.batches.length === 0 ? "No Batch" : "Select Batch"} />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white border border-gray-300 text-gray-900 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {state.batches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Filter - Shown for both; active for Principal, locked for HOD */}
                <div className="flex flex-col flex-1 sm:flex-none sm:w-48">
                  <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    {getTerm("branch")}
                  </label>
                  <Select
                    value={state.selectedBranch}
                    onValueChange={handleBranchChange}
                    open={branchOpen}
                    onOpenChange={setBranchOpen}
                    disabled={!isPrincipalOrAdmin || state.loading || !state.selectedBatch || state.branches.length === 0}
                  >
                    <SelectTrigger className={`text-sm ${!isPrincipalOrAdmin ? 'cursor-not-allowed opacity-80' : ''} ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder={!state.selectedBatch ? "Select Batch first" : state.branches.length === 0 ? "No Branch" : `Select ${getTerm("branch")}`} />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white border border-gray-300 text-gray-900 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {state.branches.map((br) => (
                        <SelectItem key={br.id} value={String(br.id)}>
                          {br.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Semester Filter */}
                <div className="flex flex-col flex-1 sm:flex-none sm:w-44">
                  <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    {getInstitutionType() === 'school' ? 'Class' : translateTerminology("Semester")}
                  </label>
                  <Select
                    value={state.selectedSemester}
                    onValueChange={handleSemesterChange}
                    open={semesterOpen}
                    onOpenChange={setSemesterOpen}
                    disabled={state.loading || !state.selectedBatch || (isPrincipalOrAdmin && !state.selectedBranch) || state.semesters.length === 0}>
                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`} disabled={state.loading || !state.selectedBatch || (isPrincipalOrAdmin && !state.selectedBranch) || state.semesters.length === 0}>
                      <SelectValue placeholder={
                        !state.selectedBatch
                          ? "Select Batch first"
                          : isPrincipalOrAdmin && !state.selectedBranch
                          ? `Select ${getTerm("branch")} first`
                          : state.semesters.length === 0
                          ? (getInstitutionType() === 'school' ? "No class available" : "No semester available")
                          : (getInstitutionType() === 'school' ? "Choose Class" : "Select Semester")
                      } />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white border border-gray-300 text-gray-900 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {state.semesters.length === 0 ? (
                        <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {getInstitutionType() === 'school' ? "No class available" : "No semester available"}
                        </div>
                      ) : (
                        state.semesters.map((semester) => (
                          <SelectItem key={semester.id} value={String(semester.id)}>
                            {getInstitutionType() === 'school' ? `Class ${semester.number}` : `Sem ${semester.number}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Filter */}
                <div className="flex flex-col flex-1 sm:flex-none sm:w-44">
                  <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Section</label>
                  <Select
                    value={state.selectedSection}
                    onValueChange={handleSectionChange}
                    open={sectionOpen}
                    onOpenChange={setSectionOpen}
                    disabled={state.loading || !state.selectedSemester}>
                    <SelectTrigger id="section-select-trigger" className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`} disabled={state.loading || !state.selectedSemester}>
                      <SelectValue placeholder={
                        !state.selectedSemester ?
                          (getInstitutionType() === 'school' ? "Select Class first" : "Select Semester first") :
                          state.sections.length === 0 ?
                          "No section available" :
                          "Select Section"
                      } />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white border border-gray-300 text-gray-900 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {!state.selectedSemester ? (
                        <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {getInstitutionType() === 'school' ? "Select class first" : "Select semester first"}
                        </div>
                      ) : state.sections.length === 0 ? (
                        <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                          No section available
                        </div>
                      ) : (
                        state.sections.map((section) => (
                          <SelectItem key={section.id} value={String(section.id)}>
                            {section.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Threshold Selector Entry Box */}
              <div className="flex flex-col w-full sm:w-48">
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-sm font-medium flex items-center gap-1.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{activeTab === 'attendance' ? 'Attendance Threshold' : 'Score Threshold'}</span>
                  </label>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={currentThreshold}
                    onChange={(e) => handleThresholdChange(Number(e.target.value))}
                    className={`w-full h-10 px-3 pr-8 rounded-md text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      theme === 'dark'
                        ? 'bg-card border-border text-foreground'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <span className="absolute right-3 text-sm font-semibold text-muted-foreground pointer-events-none">%</span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="pt-4">
            {/* Students Table */}
            {state.loading ? (
              <div className="py-4">
                <SkeletonTable rows={10} cols={5} />
              </div>
            ) : state.students.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-row justify-between items-center gap-4 mb-2 ml-1">
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {activeTab === 'attendance'
                      ? `Students with Attendance < ${attendanceThreshold}%`
                      : `Students with Score < ${performanceThreshold}%`}
                  </h2>
                  <Button
                    onClick={handleNotifyAllClick}
                    disabled={state.loading || state.students.length === 0 || state.notifyingAll}
                    variant="outline"
                    className="text-xs sm:text-sm font-semibold flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md transform hover:scale-105 active:scale-95">
                    {state.notifyingAll ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        Notify All
                      </>
                    )}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <AttendanceTable
                    students={state.students}
                    theme={theme}
                    activeTab={activeTab}
                    threshold={currentThreshold}
                    notifyingStudents={state.notifyingStudents}
                    notifiedStudents={state.notifiedStudents}
                    onNotifyStudent={setStudentToNotifyConfirm} 
                    onViewBreakdown={setSelectedBreakdownStudent}
                  />
                </div>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                  <AlertTriangle className="w-12 h-12 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {!state.selectedBatch || (!state.selectedBranch && !state.branchId) || !state.selectedSemester || !state.selectedSection
                    ? "Select Filter Criteria"
                    : (state.selectedSemester && state.selectedSection)
                    ? (activeTab === 'attendance' ? `No Students Below ${attendanceThreshold}% Attendance` : `No Students Below ${performanceThreshold}% Performance`)
                    : (activeTab === 'attendance' ? "View Attendance Reports" : "View Performance Reports")}
                </h3>
                <p className="max-w-md text-base leading-relaxed">
                  {!state.selectedBatch || (!state.selectedBranch && !state.branchId) || !state.selectedSemester || !state.selectedSection
                    ? `Please choose Batch, ${getInstitutionType() === 'school' ? 'Class' : translateTerminology("Semester")}, and Section above to identify students who may require ${activeTab === 'attendance' ? 'attendance' : 'academic'} interventions.`
                    : (state.selectedSemester && state.selectedSection)
                    ? (activeTab === 'attendance' 
                        ? `Great! All students in this section have attendance at or above ${attendanceThreshold}%.` 
                        : `Great! All students in this section have average performance marks at or above ${performanceThreshold}%.`)
                    : (getInstitutionType() === 'school'
                        ? `Select a class and section above to identify students who may require ${activeTab === 'attendance' ? 'attendance' : 'academic'} interventions.`
                        : `Select a semester and section above to identify students who may require ${activeTab === 'attendance' ? 'attendance' : 'academic'} interventions.`)}
                </p>
              </div>
            )}
          </CardContent>

          {!state.loading && state.totalCount > state.pageSize && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing <span className="font-medium">{Math.min((state.currentPage - 1) * state.pageSize + 1, state.totalCount)}</span> to <span className="font-medium">{Math.min(state.currentPage * state.pageSize, state.totalCount)}</span> of <span className="font-medium">{state.totalCount}</span> students
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={!state.previous || state.loading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {state.currentPage}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={!state.next || state.loading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Student Subject Breakdown Modal */}
        {selectedBreakdownStudent && (
          <div 
            className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-900/60'} backdrop-blur-xs`}
            onClick={() => setSelectedBreakdownStudent(null)}
          >
            <div 
              className={`w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden transition-all transform ${
                theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                theme === 'dark' ? 'border-border bg-muted/20' : 'border-gray-100 bg-gray-50/70'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">
                      {activeTab === 'attendance' ? 'Subject-wise Attendance' : 'Subject-wise Performance'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedBreakdownStudent.name} • <span className="font-semibold">{selectedBreakdownStudent.usn}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBreakdownStudent(null)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    theme === 'dark' ? 'text-muted-foreground hover:text-foreground hover:bg-muted' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Summary Subheader */}
              <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-medium ${
                theme === 'dark' ? 'border-border/60 bg-muted/10' : 'border-gray-100 bg-gray-50/30'
              }`}>
                <div className="text-muted-foreground">
                  <span>Sem {selectedBreakdownStudent.semester}</span>
                  {selectedBreakdownStudent.section && <span className="ml-1.5">• Sec {selectedBreakdownStudent.section}</span>}
                  <span className="ml-2">• {selectedBreakdownStudent.subjects_breakdown?.length || 1} Subject{(selectedBreakdownStudent.subjects_breakdown?.length || 1) > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Overall Average:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                    Number(activeTab === 'attendance' ? selectedBreakdownStudent.attendance_percentage : (selectedBreakdownStudent.performance_percentage ?? selectedBreakdownStudent.attendance_percentage)) < currentThreshold
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : 'bg-green-500/10 text-green-500 border border-green-500/20'
                  }`}>
                    {activeTab === 'attendance' 
                      ? `${selectedBreakdownStudent.attendance_percentage}%` 
                      : `${selectedBreakdownStudent.performance_percentage ?? selectedBreakdownStudent.attendance_percentage}%`}
                  </span>
                </div>
              </div>

              {/* Modal Body - List of subjects */}
              <div className="p-6 max-h-[55vh] overflow-y-auto custom-scrollbar space-y-3">
                {selectedBreakdownStudent.subjects_breakdown && selectedBreakdownStudent.subjects_breakdown.length > 0 ? (
                  selectedBreakdownStudent.subjects_breakdown.map((subj, idx) => {
                    const isBelow = subj.avg < currentThreshold;
                    return (
                      <div 
                        key={idx}
                        className={`p-3.5 rounded-lg border transition-all ${
                          theme === 'dark'
                            ? 'bg-muted/30 border-border hover:bg-muted/50'
                            : 'bg-gray-50/80 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="text-sm font-semibold truncate" title={subj.name}>
                            {subj.name}
                          </span>
                          <span className={`text-sm font-bold shrink-0 ${
                            subj.avg < currentThreshold * 0.75 
                              ? 'text-red-500' 
                              : isBelow 
                              ? 'text-orange-500' 
                              : 'text-green-500'
                          }`}>
                            {subj.avg}%
                          </span>
                        </div>
                        {/* Visual score bar */}
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              subj.avg < currentThreshold * 0.75 
                                ? 'bg-red-500' 
                                : isBelow 
                                ? 'bg-orange-500' 
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(Math.max(subj.avg, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <p>Subject: <span className="font-semibold text-foreground">{selectedBreakdownStudent.subject}</span></p>
                    <p className="mt-1">
                      {activeTab === 'attendance' ? 'Attendance' : 'Performance'}: {' '}
                      <span className="font-bold text-foreground">
                        {selectedBreakdownStudent.attendance_percentage}%
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-3.5 border-t flex justify-end ${
                theme === 'dark' ? 'border-border bg-muted/20' : 'border-gray-100 bg-gray-50/50'
              }`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBreakdownStudent(null)}
                  className={theme === 'dark' ? 'border-border text-foreground hover:bg-muted' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Single Student Notify Confirmation Modal */}
        {studentToNotifyConfirm && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-900/60'} backdrop-blur-xs`}>
            <div className={`w-11/12 max-w-md p-6 rounded-xl shadow-2xl border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-full ${theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Confirm Notification
                </h3>
              </div>
              <p className={`mb-6 text-sm leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                Are you sure you want to send a {activeTab === 'attendance' ? `low attendance (<${attendanceThreshold}%)` : `low academic performance (<${performanceThreshold}%)`} notification to <span className="font-semibold text-foreground">{studentToNotifyConfirm.name}</span> ({studentToNotifyConfirm.usn})?
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentToNotifyConfirm(null)}
                  className={theme === 'dark' ? 'border-border text-foreground hover:bg-muted' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const s = studentToNotifyConfirm;
                    setStudentToNotifyConfirm(null);
                    notifyStudent(s);
                  }}
                  className="bg-primary text-white hover:bg-primary/90 shadow-sm"
                >
                  Send Notification
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notify All Confirmation Modal */}
        {state.showNotifyAllConfirm && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-900/60'} backdrop-blur-xs`}>
            <div className={`w-11/12 max-w-md p-6 rounded-xl shadow-2xl border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-full ${theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Confirm Notify All
                </h3>
              </div>
              <p className={`mb-6 text-sm leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                Are you sure you want to send {activeTab === 'attendance' ? `low attendance (<${attendanceThreshold}%)` : `low academic performance (<${performanceThreshold}%)`} notifications to <span className="font-semibold text-foreground">{state.notifyAllCount}</span> student{state.notifyAllCount !== 1 ? 's' : ''} currently listed?
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateState({ showNotifyAllConfirm: false })}
                  className={theme === 'dark' ? 'border-border text-foreground hover:bg-muted' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={confirmNotifyAll}
                  className="bg-primary text-white hover:bg-primary/90 shadow-sm"
                >
                  Yes, Notify All
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default LowAttendance;