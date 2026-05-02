import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
    },
    saving: false,
    cancelling: false,
  });

  const studentsPerPage = 20;

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Load metadata (profile, semesters, sections) on mount
  const loadMetadata = async () => {
    try {
      updateState({ loading: true });
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/proctor-bootstrap/?include=profile,semesters,sections`, {
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
        sections: data.data.sections,
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
        totalPages: Math.ceil(data.count / studentsPerPage),
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

  // Reload when pagination or filters change — only load students when both semester and section are selected
  useEffect(() => {
    if (!mountedRef.current) return;
    const sem = state.filters.semester_id;
    const sec = state.filters.section_id;
    if (sem !== "all" && sec !== "all") {
      loadStudents();
    } else {
      // clear students if selection is incomplete
      updateState({ students: [], totalCount: 0, totalAssigned: 0, totalUnassigned: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPage, state.filters.semester_id, state.filters.section_id]);

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
      <div className="space-y-6">
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
    <div className={`sm: min-h-screen text-base sm:text-base max-w-[390px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={`text-lg sm:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Proctor Assignment - {state.branchName}
            </CardTitle>
            <p className={`text-sm sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              View and manage student-proctor assignments
            </p>
          </div>
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
            className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200 w-full sm:w-auto"
            disabled={state.loading || state.filters.semester_id === "all" || state.filters.section_id === "all"}
          >
            Manage Assignments
          </Button>
        </CardHeader>

        {/* Edit Mode Controls */}
        {state.editMode && (
          <div className={`px-4 sm:px-6 py-3 border-t ${theme === 'dark' ? 'border-border bg-card/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end w-full">
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
                  className="flex-1 sm:flex-none text-white bg-green-600 hover:bg-green-700 text-base font-medium shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
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
                  className={`flex-1 sm:flex-none text-base font-medium px-4 py-2 ${theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}`}
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
                  <label className={`text-xs sm:text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Semester</label>
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
                  <label className={`text-xs sm:text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Section</label>
                  <Select
                    value={state.filters.section_id}
                    onValueChange={(value) => handleFilterChange("section_id", value)}
                    disabled={state.loading || state.sections.length === 0}
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
              </div>

              {/* Search on the right */}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Input
                  placeholder="Search students by name or USN..."
                  className={`w-full sm:w-80 text-base ${theme === 'dark' ? 'bg-card text-foreground border border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border border-gray-300 placeholder:text-gray-500'}`}
                  value={state.search}
                  onChange={(e) => updateState({ search: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={state.loading}
                />
                <Button
                  onClick={handleSearch}
                  variant="outline"
                  disabled={state.loading}
                  className={`text-base font-medium px-4 whitespace-nowrap w-full sm:w-auto ${theme === 'dark' ? 'bg-card text-foreground border border-border hover:bg-accent' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100'}`}
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        )}

        <CardContent className="pt-4">
          {/* Table */}
          <div className="overflow-x-auto mb-4">
            <table className={`w-full text-[13px] sm:text-sm text-left border-collapse table-auto align-middle`}>
              <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card border-b border-border' : 'bg-gray-50 border-b border-gray-200'}`}>
                <tr>
                  {state.editMode && <th className={`py-2 px-2 sm:px-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Select</th>}
                  <th className={`py-2 px-2 sm:px-3 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                  <th className={`py-2 px-2 sm:px-3 font-semibold hidden sm:table-cell ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                  <th className={`py-2 px-2 sm:px-3 font-semibold text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Sem</th>
                  <th className={`py-2 px-2 sm:px-3 font-semibold text-center hidden sm:table-cell ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</th>
                  <th className={`py-2 px-2 sm:px-3 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={state.editMode ? 6 : 5} className="p-4">
                      <SkeletonTable rows={10} cols={state.editMode ? 6 : 5} />
                    </td>
                  </tr>
                ) : currentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={state.editMode ? 6 : 5} className={`text-center py-6 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      No students found
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
                        <td className="py-2 px-2 sm:px-3">
                          <input
                            type="checkbox"
                            checked={state.selectedUSNs.includes(student.usn)}
                            onChange={() => handleCheckboxToggle(student.usn)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded"
                          />
                        </td>
                      )}
                      <td className={`py-2 px-2 sm:px-3 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                      <td className={`py-2 px-2 sm:px-3 hidden sm:table-cell ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                      <td className={`py-2 px-2 sm:px-3 text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester.split('th')[0]}</td>
                      <td className={`py-2 px-2 sm:px-3 text-center hidden sm:table-cell ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section}</td>
                      <td className="py-2 px-2 sm:px-3">
                        {student.proctor ? (
                          <span className={`text-sm sm:text-sm font-medium px-2 py-1 rounded ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
                            {student.proctor}
                          </span>
                        ) : (
                          <span className={`text-sm sm:text-sm font-medium px-2 py-1 rounded ${theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
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
                className="text-base font-medium px-3 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200"
              >
                Prev
              </Button>
              <span className="px-3 text-base font-medium text-primary">
                {state.currentPage}
              </span>
              <Button
                variant="outline"
                disabled={state.currentPage === state.totalPages || state.loading || state.students.length === 0}
                onClick={() => updateState({ currentPage: Math.min(state.currentPage + 1, state.totalPages) })}
                className="text-base font-medium px-3 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProctorStudents;