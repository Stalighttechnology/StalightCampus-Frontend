import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Download, X, Search, Pencil } from "lucide-react";
import { Skeleton, SkeletonTable, SkeletonCard } from "../ui/skeleton";
import DashboardCard from "../common/DashboardCard";
import { FaUserGraduate, FaUserCheck, FaUserTimes } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import { getProctors, manageStudents, assignProctorsBulk, getSemesters, manageSections, manageProfile, getProctorBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";

interface Student {
  usn: string;
  name: string;
  semester: string;
  branch: string;
  section: string;
  proctor: string | null;
}

interface Proctor {
  id: string;
  name: string;
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

const ProctorStudents = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [state, setState] = useState({
    students: [] as Student[],
    proctors: [] as Proctor[],
    semesters: [] as Semester[],
    sections: [] as Semester[],
    search: "",
    currentPage: 1,
    totalCount: 0,
    totalAssigned: 0,
    totalUnassigned: 0,
    totalPages: 1,
    editMode: false,
    selectedUSNs: [] as string[],
    selectedProctor: "",
    loading: true,
    error: null as string | null,
    branchId: "",
    branchName: "Computer Science", // Fallback
    filters: {
      semester_id: "all",
      section_id: "all",
      proctor_id: "all",
    },
    saving: false,
    cancelling: false,
  });
  const [localSearch, setLocalSearch] = useState("");
  const [proctorSearch, setProctorSearch] = useState("");

  const studentsPerPage = 20;

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const handleExportPDF = async () => {
    if (!state.search.trim() && (state.filters.semester_id === "all" || state.filters.section_id === "all" || state.filters.proctor_id === "all")) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a semester, section, and proctor, or perform a search to export"
      });
      return;
    }
    setDownloadingPDF(true);
    try {
      const params = new URLSearchParams({
        semester_id: state.filters.semester_id,
        section_id: state.filters.section_id,
      });
      if (state.filters.proctor_id !== "all") {
        params.append("proctor_id", state.filters.proctor_id);
      }
      if (state.search.trim()) {
        params.append("search", state.search.trim());
      }
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctors/export-pdf/?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const branchName = state.branchName || "Branch";
        const safeBranch = branchName.replace(/\s+/g, "_");
        a.download = `Proctor_Assignments_${safeBranch}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: "Proctor assignments PDF exported successfully"
        });
      } else {
        const result = await response.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to export PDF"
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while exporting PDF"
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Load metadata (profile, semesters, sections, proctors) on mount
  const loadMetadata = async () => {
    try {
      updateState({ loading: true });
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctor-bootstrap/?include=profile,semesters,proctors`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.message || "Failed to fetch metadata");
      }

      updateState({
        branchId: data.data.profile.branch_id,
        branchName: data.data.profile.branch,
        semesters: data.data.semesters,
        proctors: data.data.proctors.map((f: any) => ({ id: f.id, name: f.name })),
        sections: [],
      });
    } catch (error) {
      const errorMessage = (error as Error).message || "Network error";
      updateState({ error: errorMessage });
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Load proctors on demand (when Edit is opened)
  const loadProctors = async () => {
    try {
      updateState({ loading: true });
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctor-bootstrap/?include=proctors`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.message || "Failed to fetch proctors");
      }

      updateState({
        proctors: data.data.proctors.map((f: any) => ({ id: f.id, name: f.name })),
      });
    } catch (error) {
      const errorMessage = (error as Error).message || "Network error";
      updateState({ error: errorMessage });
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Separate function to load students
  const loadStudents = async (searchTerm?: string) => {
    updateState({ loading: true, error: null });
    try {
      const params = new URLSearchParams({
        include: "students",
        page: state.currentPage.toString(),
        page_size: studentsPerPage.toString(),
      });

      if (state.filters.semester_id !== "all") {
        params.append("semester_id", state.filters.semester_id);
      }

      if (state.filters.section_id !== "all") {
        params.append("section_id", state.filters.section_id);
      }

      if (state.filters.proctor_id !== "all") {
        params.append("proctor_id", state.filters.proctor_id);
      }

      const searchValue = searchTerm !== undefined ? searchTerm : state.search;
      if (searchValue.trim()) {
        params.append("search", searchValue.trim());
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctor-bootstrap/?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.message || "Failed to fetch students");
      }

      // Process students data
      const students = data.data.students.map((s: any) => ({
        student_id: s.student_id || null,
        usn: s.usn,
        name: s.name,
        semester: s.semester ? `${s.semester}th Semester` : "N/A",
        branch: state.branchName,
        section: s.section || "N/A",
        proctor: s.proctor,
      }));

      updateState({
        students,
        totalCount: data.count,
        totalAssigned: data.total_assigned || 0,
        totalUnassigned: data.total_unassigned || 0,
        totalPages: data.total_pages || Math.ceil(data.count / studentsPerPage),
      });
    } catch (error) {
      const errorMessage = (error as Error).message || "Network error";
      updateState({ error: errorMessage });
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Load students with filters and pagination (but not on every search keystroke)
  const mountedRef = useRef(false);

  // Initial load on mount
  useEffect(() => {
    loadMetadata().then(() => {
      mountedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch sections lazily when semester changes
  useEffect(() => {
    const semId = state.filters.semester_id;
    if (semId !== "all" && state.branchId) {
      manageSections({ branch_id: state.branchId, semester_id: semId }, "GET").then(res => {
        if (res.success && res.data) {
          updateState({ sections: res.data.map((s: any) => ({ ...s, id: String(s.id), semester_id: String(s.semester_id) })) as any });
        }
      });
    } else {
      updateState({ sections: [] });
    }
  }, [state.filters.semester_id, state.branchId]);

  // Reload when pagination or filters change — only load students when semester, section, and proctor are all selected
  useEffect(() => {
    if (!mountedRef.current) return;
    const sem = state.filters.semester_id;
    const sec = state.filters.section_id;
    const proc = state.filters.proctor_id;
    if (state.search.trim() || (sem !== "all" && sec !== "all" && proc !== "all")) {
      loadStudents();
    } else {
      // clear students if selection is incomplete and no search is active
      updateState({ students: [], totalCount: 0, totalAssigned: 0, totalUnassigned: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPage, state.filters.semester_id, state.filters.section_id, state.filters.proctor_id]);

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = {
      ...state.filters,
      [field]: value,
      ...(field === "semester_id" && { section_id: "all" }),
    };

    updateState({
      filters: newFilters,
      currentPage: 1,
    });
  };

  const handleSearch = () => {
    // Trigger search with current search term
    updateState({ currentPage: 1 });
    // Allow search regardless of semester/section selection — backend will apply filters if provided
    loadStudents(state.search);
  };

  // Debounced search for real-time filtering
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (mountedRef.current) {
        updateState({ currentPage: 1 });
        const sem = state.filters.semester_id;
        const sec = state.filters.section_id;
        const proc = state.filters.proctor_id;
        if (state.search.trim() || (sem !== "all" && sec !== "all" && proc !== "all")) {
          loadStudents();
        } else {
          // clear students if selection is incomplete and no search is active
          updateState({ students: [], totalCount: 0, totalAssigned: 0, totalUnassigned: 0 });
        }
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [state.search]);

  const handleCheckboxToggle = (usn: string) => {
    updateState({
      selectedUSNs: state.selectedUSNs.includes(usn)
        ? state.selectedUSNs.filter((id) => id !== usn)
        : [...state.selectedUSNs, usn],
    });
  };

  const handleSaveProctor = async () => {
    if (state.selectedProctor && state.selectedUSNs.length > 0) {
      updateState({ loading: true });
      try {
        // prefer sending student IDs (user ids) to backend
        const student_ids = state.students
          .filter((s) => state.selectedUSNs.includes(s.usn))
          .map((s) => s.student_id)
          .filter(Boolean);
        const response = await assignProctorsBulk({
          student_ids,
          faculty_id: state.selectedProctor,
          branch_id: state.branchId,
        });
        if (!response.success) {
          throw new Error(response.message || "Failed to assign proctors");
        }

        const updatedStudents = state.students.map((student) =>
          state.selectedUSNs.includes(student.usn)
            ? { ...student, proctor: state.proctors.find((p) => p.id === state.selectedProctor)?.name || null }
            : student
        );

        updateState({
          students: updatedStudents,
          editMode: false,
          selectedUSNs: [],
          selectedProctor: "",
          showProctorSelector: false,
        });

        toast({
          title: "Success",
          description: `${state.selectedUSNs.length} students assigned to ${state.proctors.find((p) => p.id === state.selectedProctor)?.name}`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message,
        });
      } finally {
        updateState({ loading: false });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one student and a proctor",
      });
    }
  };

  const handleCancelEdit = () => {
    updateState({
      editMode: false,
      selectedUSNs: [],
      selectedProctor: "",
    });
  };


  const handleEditToggle = async () => {
    if (state.editMode) {
      if (state.selectedProctor && state.selectedUSNs.length > 0) {
        updateState({ loading: true });
        try {
          const student_ids = state.students
            .filter((s) => state.selectedUSNs.includes(s.usn))
            .map((s) => s.student_id)
            .filter(Boolean);
          const response = await assignProctorsBulk({
            student_ids,
            faculty_id: state.selectedProctor,
            branch_id: state.branchId,
          });
          if (!response.success) {
            throw new Error(response.message || "Failed to assign proctors");
          }

          const updatedStudents = state.students.map((student) =>
            state.selectedUSNs.includes(student.usn)
              ? { ...student, proctor: state.proctors.find((p) => p.id === state.selectedProctor)?.name || null }
              : student
          );

          updateState({
            students: updatedStudents,
            editMode: false,
            selectedUSNs: [],
            selectedProctor: "",
            showProctorSelector: false,
          });
          toast({
            title: "Success",
            description: `${state.selectedUSNs.length} students assigned to ${state.proctors.find((p) => p.id === state.selectedProctor)?.name}`,
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: (error as Error).message,
          });
        } finally {
          updateState({ loading: false });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select at least one student and a proctor",
        });
      }
    } else {
      updateState({ editMode: true });
    }
  };

  // Since we're doing server-side filtering and pagination, 
  // state.students already contains the filtered results for current page
  const currentStudents = state.students;
  const assigned = state.totalAssigned;
  const unassigned = state.totalUnassigned;

  if (state.loading && !state.students.length && !state.branchId) {
    return (
      <div id="hod-proctors-container" className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Card className="p-6">
          <SkeletonTable rows={10} cols={5} />
        </Card>
      </div>
    );
  }

  if (state.error) {
    return <div className={`text-center py-6 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.error}</div>;
  }

  return (
    <div id="hod-proctors-container" className={`sm: min-h-screen text-base sm:text-base max-w-[390px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      {/* Stats Cards */}
      <div id="proctors-stats-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <DashboardCard
            title="Total Students"
            value={state.totalCount}
            description="Enrolled in selected filters"
            icon={<FaUserGraduate className={theme === 'dark' ? 'text-blue-400 text-3xl' : 'text-blue-500 text-3xl'} />}
            onClick={() => { }}
          />
        </div>

        <div>
          <DashboardCard
            title="Assigned"
            value={assigned}
            description="Students with proctors"
            icon={<FaUserCheck className={theme === 'dark' ? 'text-green-400 text-3xl' : 'text-green-500 text-3xl'} />}
            onClick={() => { }}
          />
        </div>

        <div>
          <DashboardCard
            title="Unassigned"
            value={unassigned}
            description="Students without proctors"
            icon={<FaUserTimes className={theme === 'dark' ? 'text-red-400 text-3xl' : 'text-red-500 text-3xl'} />}
            onClick={() => { }}
          />
        </div>
      </div>

      {/* Main Management Card */}
      <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm' : 'bg-white border border-gray-200 shadow-sm'}>
        <div id="proctors-header-filters-section">
          <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={`text-lg sm:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Proctor Assignment - {state.branchName}
            </CardTitle>
            <p className={`text-sm sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              View and manage student-proctor assignments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleExportPDF}
              disabled={downloadingPDF || state.loading || state.students.length === 0}
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2 h-10 px-4"
            >
              {downloadingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingPDF ? "Exporting..." : "Export PDF"}</span>
            </Button>
            {!state.editMode && (
              <Button
                onClick={async () => {
                  if (!state.semesters.length || !state.sections.length || !state.branchId) {
                    await loadMetadata();
                  }
                  if (!state.proctors.length) {
                    await loadProctors();
                  }
                  updateState({ editMode: true });
                }}
                className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2 h-10 px-4"
                disabled={state.loading || state.students.length === 0}
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Edit Mode Controls */}
        {state.editMode && (
          <div className={`px-4 sm:px-6 py-3 border-t ${theme === 'dark' ? 'border-border bg-card/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end w-full">
              {/* Search Bar for Students */}
              <div className="w-full md:flex-1">
                <label className={`block text-sm sm:text-sm mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Search Students
                </label>
                <div className="relative w-full">
                  <Input
                    placeholder="Search by name, USN, dept..."
                    value={state.search}
                    onChange={(e) => updateState({ search: e.target.value })}
                    className={`w-full pr-8 ${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
                  />
                  {state.search && (
                    <button
                      onClick={() => updateState({ search: "" })}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {!state.search && (
                    <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="w-full md:flex-1">
                <label className={`block text-sm sm:text-sm mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Choose a Proctor
                </label>
                <Select onValueChange={(value) => updateState({ selectedProctor: value })} disabled={state.proctors.length === 0}>
                  <SelectTrigger className={`text-base w-full ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                    <SelectValue placeholder={state.proctors.length === 0 ? "No proctors" : "Choose a proctor"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                    {state.proctors.map((proctor) => (
                      <SelectItem key={proctor.id} value={proctor.id}>{proctor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-auto flex gap-2 md:mt-6">
                <Button
                  onClick={async () => {
                    updateState({ saving: true });
                    await handleEditToggle();
                    updateState({ saving: false });
                  }}
                  disabled={state.saving || state.selectedUSNs.length === 0 || !state.selectedProctor}
                  className="flex-1 sm:flex-none text-white bg-green-600 hover:bg-green-700 text-base font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {state.saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving</> : "Save Changes"}
                </Button>
                <Button
                  onClick={async () => {
                    updateState({ cancelling: true });
                    await handleCancelEdit();
                    updateState({ cancelling: false });
                  }}
                  disabled={state.cancelling}
                  variant="outline"
                  className={`flex-1 sm:flex-none text-base font-semibold px-4 py-2 ${theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}`}
                >
                  {state.cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling</> : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!state.editMode && (
          <div className={`px-4 sm:px-6 py-3 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-3 items-start w-full">
              {/* Filters on the left */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end w-full">
                {/* Semester Filter */}
                <div className="flex flex-col w-full sm:flex-1 lg:w-56">
                  <label className={`text-sm sm:text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Semester</label>
                  <Select
                    value={state.filters.semester_id}
                    onValueChange={(value) => handleFilterChange("semester_id", value)}
                    disabled={state.loading || state.semesters.length === 0}
                  >
                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {state.semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id}>
                          Sem {semester.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Filter */}
                <div className="flex flex-col w-full sm:flex-1 lg:w-56">
                  <label className={`text-sm sm:text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Section</label>
                  <Select
                    value={state.filters.section_id}
                    onValueChange={(value) => handleFilterChange("section_id", value)}
                    disabled={state.loading || state.sections.length === 0 || state.filters.semester_id === "all"}
                  >
                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      <SelectItem value="all">All Sections</SelectItem>
                      {state.sections
                        .filter((section) => state.filters.semester_id === "all" || section.semester_id === state.filters.semester_id)
                        .map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            Section {section.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Proctor Filter */}
                <div className="flex flex-col w-full sm:flex-1 lg:w-56">
                  <label className={`text-sm sm:text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Proctor</label>
                  <Select
                    value={state.filters.proctor_id}
                    onValueChange={(value) => handleFilterChange("proctor_id", value)}
                    disabled={state.loading || state.proctors.length === 0 || state.filters.section_id === "all"}
                  >
                    <SelectTrigger className={`text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <SelectValue placeholder="All Proctors" />
                    </SelectTrigger>
                    <SelectContent className={`max-h-60 overflow-y-auto ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
                      <div className="p-2 border-b border-border">
                        <input
                          type="text"
                          placeholder="Search proctor..."
                          className={`w-full p-2 text-xs rounded border outline-none ${theme === 'dark' ? 'bg-muted border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                          value={proctorSearch}
                          onChange={(e) => setProctorSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <SelectItem value="all">All Proctors</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {state.proctors
                        .filter((proctor) => proctor.name.toLowerCase().includes(proctorSearch.toLowerCase()))
                        .map((proctor) => (
                          <SelectItem key={proctor.id} value={proctor.id}>
                            {proctor.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search on the right */}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative w-full sm:w-80">
                  <Input
                    placeholder="Search students by name or USN..."
                    className={`w-full pr-8 text-base ${theme === 'dark' ? 'bg-card text-foreground border border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border border-gray-300 placeholder:text-gray-500'}`}
                    value={state.search}
                    onChange={(e) => updateState({ search: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={state.loading}
                  />
                  {state.search && (
                    <button
                      onClick={() => updateState({ search: "" })}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSearch}
                  variant="outline"
                  disabled={state.loading}
                  className={`text-base font-semibold px-4 whitespace-nowrap w-full sm:w-auto ${theme === 'dark' ? 'bg-card text-foreground border border-border hover:bg-accent' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100'}`}
                >
                  Search
                </Button>
              </div>
              </div>
            </div>
          )}
        </div>

        <CardContent className="pt-4">
          {currentStudents.length === 0 && !state.loading ? (
            <div className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <Users className="w-12 h-12 opacity-80" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
              <p className="max-w-xs text-base leading-relaxed">
                {state.filters.semester_id === 'all' || state.filters.section_id === 'all' 
                  ? "Select a semester and section to view student assignments."
                  : "No students were found matching your criteria. Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-4">
                <table className={`w-full text-sm sm:text-sm text-left border-collapse table-auto align-middle`}>
                  <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card border-b border-border' : 'bg-gray-50 border-b border-gray-200'}`}>
                    <tr>
                      {state.editMode && <th className={`py-3 px-4 w-12 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Select</th>}
                      <th className={`py-3 px-4 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                      <th className={`py-3 px-4 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                      <th className={`py-3 px-4 font-semibold text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Sem</th>
                      <th className={`py-3 px-4 font-semibold text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</th>
                      <th className={`py-3 px-4 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.loading ? (
                      <tr>
                        <td colSpan={state.editMode ? 6 : 5} className="p-4">
                          <SkeletonTable rows={10} cols={state.editMode ? 6 : 5} />
                        </td>
                      </tr>
                    ) : (
                      currentStudents.map((student) => (
                        <tr
                          key={student.usn}
                          className={`border-t ${state.editMode ? (theme === 'dark' ? 'cursor-pointer hover:bg-accent' : 'cursor-pointer hover:bg-gray-50') : ''} ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}
                          onClick={() => state.editMode && handleCheckboxToggle(student.usn)}
                        >
                           {state.editMode && (
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={state.selectedUSNs.includes(student.usn)}
                                onChange={() => handleCheckboxToggle(student.usn)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded"
                              />
                            </td>
                          )}
                          <td className={`py-3 px-4 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                          <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester.split('th')[0]}</td>
                          <td className={`py-3 px-4 text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section}</td>
                          <td className="py-3 px-4">
                            {student.proctor ? (
                              <span className={`text-sm sm:text-sm font-semibold px-2 py-1 rounded whitespace-nowrap ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                {student.proctor}
                              </span>
                            ) : (
                              <span className={`text-sm sm:text-sm font-semibold px-2 py-1 rounded whitespace-nowrap ${theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
                                Unassigned
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
    
              {/* Pagination */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6">
                <div className={`text-sm sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Showing {Math.min((state.currentPage - 1) * studentsPerPage + 1, state.totalCount)} to {Math.min(state.currentPage * studentsPerPage, state.totalCount)} of {state.totalCount}
                </div>
                <div className="flex gap-2 items-center justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    disabled={state.currentPage === 1 || state.loading || state.students.length === 0}
                    onClick={() => updateState({ currentPage: Math.max(state.currentPage - 1, 1) })}
                    className="text-base font-semibold px-3 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200"
                  >
                    Prev
                  </Button>
                  <span className="px-3 text-base font-semibold text-primary">
                    {state.currentPage}
                  </span>
                  <Button
                    variant="outline"
                    disabled={state.currentPage === state.totalPages || state.loading || state.students.length === 0}
                    onClick={() => updateState({ currentPage: Math.min(state.currentPage + 1, state.totalPages) })}
                    className="text-base font-semibold px-3 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProctorStudents;