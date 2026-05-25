import React, { useState, useEffect, ReactNode, Component } from "react";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileDown, Loader2, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { FaUsers, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from
  "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SkeletonCard, SkeletonTable } from "../ui/skeleton";
import { manageSections, sendNotification, getLowAttendanceStudents, getHODDashboardBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { useVirtualizer } from '@tanstack/react-virtual';
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
}

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface Subject {
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
        </div>);

    }
    return this.props.children;
  }
};

// Attendance Table Component
const AttendanceTable = React.memo(({
  students,
  theme,
  notifyingStudents,
  notifiedStudents,
  onNotifyStudent






}: { students: Student[]; theme: string; notifyingStudents: Record<string, boolean>; notifiedStudents: Record<string, boolean>; onNotifyStudent: (student: Student) => void; }) => {
  const getAttendanceColorClass = (attendance: number | string): string => {
    if (attendance === "NA" || attendance === null || attendance === undefined) {
      return "text-gray-400";
    }
    if (typeof attendance === "string") {
      return "text-gray-400";
    }
    const num = typeof attendance === 'string' ? parseFloat(attendance) : attendance;
    if (num < 40) return "text-red-500";
    if (num <= 60) return "text-orange-500";
    return "text-green-500";
  };

  const formatAttendancePercentage = (percentage: number | string): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "NA";
    }
    if (typeof percentage === "string") {
      return percentage;
    }
    return `${percentage}%`;
  };

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className={`w-full text-sm text-left border-collapse ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
        <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card border-b border-border' : 'bg-gray-50 border-b border-gray-200'}`}>
          <tr>
            <th className="py-3 px-4 font-semibold">USN</th>
            <th className="py-3 px-4 font-semibold">Name</th>
            <th className="py-3 px-4 font-semibold">Course</th>
            <th className="py-3 px-4 font-semibold text-center">Attendance</th>
            <th className="py-3 px-4 font-semibold text-center">Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
          {students.map((student, idx) =>
            <tr
              key={`${student.student_id}-${student.subject}-${idx}`}
              className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent/50' : 'hover:bg-gray-50'}`}>

              <td className="py-3 px-4 font-semibold whitespace-nowrap">{student.usn}</td>
              <td className="py-3 px-4 font-semibold whitespace-nowrap">{student.name}</td>
              <td className="py-3 px-4 whitespace-nowrap">{student.subject}</td>
              <td className={`py-3 px-4 text-center font-semibold ${getAttendanceColorClass(student.attendance_percentage)}`}>
                {formatAttendancePercentage(student.attendance_percentage)}
              </td>
              <td className="py-3 px-4 text-center">
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

                  {notifyingStudents?.[student.student_id] ?
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending...
                    </> :
                    notifiedStudents?.[student.student_id] ?
                      <><CheckCircle className="w-3 h-3" /> Notified</> :

                      "Notify"
                  }
                </Button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

});

const LowAttendance = ({ setError }: LowAttendanceProps) => {
  // Helper function to format attendance percentage
  const formatAttendancePercentage = (percentage: number | string): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "NA";
    }
    if (typeof percentage === "string") {
      return percentage;
    }
    return `${percentage}%`;
  };

  // Helper function to get numeric value for sorting
  const getNumericPercentage = (percentage: number | string): number => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return -1; // Sort NA values to the end
    }
    if (typeof percentage === "string") {
      return -1;
    }
    return percentage;
  };
  const { toast } = useToast();
  const { theme } = useTheme();
  const bootstrap = useHODBootstrap();
  const [state, setState] = useState({
    selectedSemester: "",
    selectedSection: "",
    students: [] as Student[],
    semesters: bootstrap?.semesters as Semester[] || [] as Semester[],
    sections: [] as Section[],
    loading: !bootstrap?.branch_id, // Only load if we don't have bootstrap data
    branchId: bootstrap?.branch_id || "",
    notifyingStudents: {} as Record<string, boolean>,
    notifiedStudents: {} as Record<string, boolean>,
    // Pagination state
    currentPage: 1,
    totalCount: 0,
    pageSize: 50,
    next: null as string | null,
    previous: null as string | null,
    downloadingPDF: false
  });

  // Sync with bootstrap context if data arrives after mount
  useEffect(() => {
    if (bootstrap?.branch_id && !state.branchId) {
      updateState({
        branchId: bootstrap.branch_id,
        semesters: bootstrap.semesters as Semester[] || [],
        loading: false
      });
    }
  }, [bootstrap]);

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Pagination functions
  const goToPage = (page: number) => {
    updateState({ currentPage: page });
  };

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

  // Reset pagination when filters change
  const handleSemesterChange = (value: string) => {
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
    updateState({
      selectedSection: value,
      students: [],
      currentPage: 1,
      totalCount: 0,
      next: null,
      previous: null
    });
  };

  // Load metadata on component mount
  useEffect(() => {
    const loadMetadata = async () => {
      // If we already have bootstrap data, don't show loading and don't re-fetch
      if (bootstrap?.branch_id && bootstrap?.semesters) {
        return;
      }

      updateState({ loading: true });
      try {
        // Get branch ID and semesters from bootstrap endpoint
        const bootstrapResponse = await getHODDashboardBootstrap(["profile", "semesters"]);
        if (!bootstrapResponse.success || !bootstrapResponse.data) {
          throw new Error("Failed to fetch bootstrap data");
        }

        const branchId = bootstrapResponse.data.profile?.branch_id;
        if (!branchId) {
          throw new Error("Branch ID not found in profile");
        }

        updateState({
          branchId: branchId,
          semesters: bootstrapResponse.data.semesters || [],
          loading: false
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch metadata";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
        updateState({ loading: false });
      }
    };
    loadMetadata();
  }, [toast, setError]);

  // Load students when both semester and section are selected
  useEffect(() => {
    const loadStudents = async () => {
      if (!state.selectedSemester || !state.selectedSection) {
        updateState({ students: [] });
        return;
      }

      updateState({ loading: true });
      try {
        const studentsResponse = await getLowAttendanceStudents(state.branchId, {
          semester_id: state.selectedSemester,
          section_id: state.selectedSection,
          page: state.currentPage,
          page_size: state.pageSize
        });

        if (!studentsResponse.success || !studentsResponse.data) {
          throw new Error(studentsResponse.message || "Failed to fetch students");
        }

        const studentsData = studentsResponse.data.students.map((student) => ({
          student_id: student.student_id,
          usn: student.usn,
          name: student.name,
          subject: student.subject,
          section: student.section || "Section A",
          semester: student.semester || 0,
          attendance_percentage: student.attendance_percentage
        }));

        updateState({
          students: studentsData,
          loading: false,
          notifiedStudents: {},
          totalCount: studentsResponse.count || 0,
          next: studentsResponse.next,
          previous: studentsResponse.previous
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch students";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
        updateState({ loading: false });
      }
    };

    loadStudents();
  }, [state.selectedSemester, state.selectedSection, state.currentPage, state.pageSize, state.branchId, toast, setError]);
  useEffect(() => {
    const loadSections = async () => {
      if (!state.selectedSemester || !state.branchId) {
        updateState({ sections: [], selectedSection: "" });
        return;
      }

      try {
        const sectionsResponse = await manageSections({ branch_id: state.branchId, semester_id: state.selectedSemester }, "GET");
        if (!sectionsResponse.success || !sectionsResponse.data) {
          throw new Error("Failed to fetch sections");
        }

        updateState({
          sections: sectionsResponse.data,
          selectedSection: "" // Reset section selection
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch sections";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    };

    loadSections();
  }, [state.selectedSemester, state.branchId, toast, setError]);

  const filteredStudents = state.students; // Server-side filtering now

  const currentStudents = filteredStudents;

  const exportPDF = async () => {
    const studentsToExport = state.students;

    if (studentsToExport.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No students to export" });
      return;
    }

    updateState({ downloadingPDF: true });
    try {
      const params = new URLSearchParams({
        branch_id: state.branchId,
        semester_id: state.selectedSemester,
        section_id: state.selectedSection,
      });

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/low-attendance/export-pdf/?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `Low_Attendance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
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
        toast({ variant: "destructive", title: "Error", description: result.message || "Failed to export PDF" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error while exporting PDF" });
    } finally {
      updateState({ downloadingPDF: false });
    }
  };

  const notifyStudent = async (student: Student) => {
    try {
      setState((prev) => ({
        ...prev,
        notifyingStudents: { ...prev.notifyingStudents, [student.student_id]: true }
      }));

      const response = await sendNotification({
        action: "notify",
        title: "Low Attendance Alert",
        student_id: student.usn,
        message: `Dear ${student.name}, your attendance in ${student.subject} is ${formatAttendancePercentage(
          student.attendance_percentage
        )}. Please improve.`,
        branch_id: state.branchId
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Notification sent to ${student.name}`
        });

        // ✅ mark as notified using functional update
        setState((prev) => ({
          ...prev,
          notifiedStudents: { ...prev.notifiedStudents, [student.student_id]: true }
        }));
      } else {
        throw new Error(response.message || "Failed to send notification");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setState((prev) => ({
        ...prev,
        notifyingStudents: { ...prev.notifyingStudents, [student.student_id]: false }
      }));
    }
  };

  const notifyAllStudents = async () => {
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

    updateState({ loading: true });

    try {
      for (const student of studentsToNotify) {
        await notifyStudent(student);
      }

      toast({
        title: "Bulk Notification Complete",
        description: `Notifications sent to all eligible students in the current view.`
      });
    } catch (error) {

    } finally {
      updateState({ loading: false });
    }
  };

  // Helper function to determine attendance color
  const getAttendanceColorClass = (attendance: number | string): string => {
    if (attendance === "NA" || attendance === null || attendance === undefined) {
      return "text-gray-400";
    }
    if (typeof attendance === "string") {
      return "text-gray-400";
    }
    if (attendance < 40) {
      return "text-red-500";
    }
    if (attendance <= 60) {
      return "text-orange-500";
    }
    return "text-green-500";
  };

  // Calculate stats
  const totalStudents = state.totalCount;
  const lowAttendanceCount = state.students.length;
  const avgAttendance = state.students.length > 0 ?
    Math.round(state.students.reduce((sum, s) => sum + (typeof s.attendance_percentage === 'number' ? s.attendance_percentage : 0), 0) / state.students.filter((s) => typeof s.attendance_percentage === 'number').length) :
    0;

  return (
    <ErrorBoundary>
      <div id="hod-low-attendance-container" className={`text-base w-full max-w-none mx-auto sm:px-0 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        {/* Stats Cards */}
        <div id="low-attendance-stats-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {state.loading && state.students.length === 0 ?
            <>
              <SkeletonCard className="h-32" />
              <SkeletonCard className="h-32" />
              <SkeletonCard className="h-32" />
            </> :

            <>
              <Card className={`${theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'} w-full relative`}>
                <CardHeader className="pb-2 px-3 sm:px-4">
                  <CardTitle className={`text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Total Students</CardTitle>
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
                  <CardTitle className={`text-base ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Low Attendance</CardTitle>
                </CardHeader>
                <CardContent className={`flex items-center justify-between text-3xl font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  <span className="flex-1">{lowAttendanceCount}</span>
                </CardContent>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full ${theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50'}`}>
                  <FaExclamationTriangle className={theme === 'dark' ? 'text-red-400 w-8 h-8 block' : 'text-red-600 w-8 h-8 block'} />
                </div>
              </Card>

              <Card className={`${theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'} w-full relative`}>
                <CardHeader className="pb-2 px-3 sm:px-4">
                  <CardTitle className={`text-base ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Avg Attendance</CardTitle>
                </CardHeader>
                <CardContent className={`flex items-center justify-between text-3xl font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  <span className="flex-1">{avgAttendance}%</span>
                </CardContent>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14 rounded-full ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50'}`}>
                  <FaChartLine className={theme === 'dark' ? 'text-blue-400 w-8 h-8 block' : 'text-blue-600 w-8 h-8 block'} />
                </div>
              </Card>
            </>
          }
        </div>

        {/* Main Management Card */}
        <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'}>
          <div id="low-attendance-dashboard-header">
          <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={`text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Low Attendance Management
              </CardTitle>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Monitor and notify students with low attendance
              </p>
            </div>
            <Button
              onClick={exportPDF}
              disabled={state.loading || state.students.length === 0 || state.downloadingPDF}
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200 w-full sm:w-auto">
              {state.downloadingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </CardHeader>
          </div>

          {/* Filters */}
          <div className={`px-4 sm:px-6 py-3 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
              <div className="flex flex-row gap-3 items-start md:items-end w-full sm:w-auto">
                {/* Semester Filter */}
                <div className="flex flex-col flex-1 sm:flex-none sm:w-56">
                  <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Semester</label>
                  <Select
                    value={state.selectedSemester}
                    onValueChange={handleSemesterChange}>

                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {state.semesters.map((semester) =>
                        <SelectItem key={semester.id} value={semester.id}>
                          Sem {semester.number}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Filter */}
                <div className="flex flex-col flex-1 sm:flex-none sm:w-56">
                  <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Section</label>
                  <Select
                    value={state.selectedSection}
                    onValueChange={handleSectionChange}
                    disabled={!state.selectedSemester}>

                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {state.sections.map((section) =>
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="pt-4">
            {/* Students Table */}
            {state.loading ?
              <div className="py-4">
                <SkeletonTable rows={10} cols={5} />
              </div> :
              state.students.length > 0 ?
                <div className="space-y-4">
                  <div className="flex flex-row justify-between items-center gap-4 mb-2 ml-1">
                    <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Students List
                    </h2>
                    <Button
                      onClick={notifyAllStudents}
                      disabled={state.loading || state.students.length === 0}
                      variant="outline"
                      className={`text-xs sm:text-sm font-semibold flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md transform hover:scale-105 active:scale-95`}>

                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Notify All
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <AttendanceTable
                      students={state.students}
                      theme={theme}
                      notifyingStudents={state.notifyingStudents}
                      notifiedStudents={state.notifiedStudents}
                      onNotifyStudent={notifyStudent} />

                  </div>

                  {/* Pagination Controls */}
                  {state.totalCount > state.pageSize &&
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6">
                      <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Showing {state.students.length} of {state.totalCount} students
                      </div>
                      <div className="flex gap-2 items-center justify-center sm:justify-end flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={!state.previous || state.loading}
                          className={`text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}>

                          <ChevronLeft className="w-3 h-3 mr-1" />
                          Prev
                        </Button>

                        <div className="flex items-center space-x-1">
                          {Array.from(
                            { length: Math.min(5, Math.ceil(state.totalCount / state.pageSize)) },
                            (_, i) => {
                              const pageNum = Math.max(1, state.currentPage - 2) + i;
                              if (pageNum > Math.ceil(state.totalCount / state.pageSize)) return null;
                              return (
                                <Button
                                  key={pageNum}
                                  variant={pageNum === state.currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => goToPage(pageNum)}
                                  disabled={state.loading}
                                  className="text-sm">

                                  {pageNum}
                                </Button>);

                            }
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={!state.next || state.loading}
                          className={`text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}>

                          Next
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  }
                </div> :

                <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                    <AlertTriangle className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {state.selectedSemester && state.selectedSection ? "No Low Attendance" : "View Attendance Reports"}
                  </h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    {state.selectedSemester && state.selectedSection ?
                      "Great! No students have low attendance in the selected section." :
                      "Select a semester and section above to identify students who may require attendance interventions."}
                  </p>
                </div>
            }
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>);

};

export default LowAttendance;