import { translateTerminology, getTerm, getInstitutionType } from "../../utils/institutionConfig";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../ui/card";
import { Pencil, Trash2, BookOpen, FileDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { SkeletonTable } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { manageSubjects, getSemesters, getHODSubjectBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import Swal from "sweetalert2";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string;
  subject_type: string;
  credits?: number;
}

interface Semester {
  id: string;
  number: number;
}

interface ManageSubjectsRequest {
  action: "create" | "update" | "delete";
  branch_id: string;
  name?: string;
  subject_code?: string;
  semester_id?: string;
  subject_id?: string;
  subject_type?: string;
  credits?: number;
}

// Define error type for catch blocks
interface ErrorWithMessage {
  message: string;
}

// Type guard to check if an object has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string');

}

// Define the state type to include all properties
interface SubjectManagementState {
  subjects: Subject[];
  semesters: Semester[];
  showModal: "add" | "edit" | null;
  currentSubject: Subject | null;
  newSubject: { code: string; name: string; semester_id: string; subject_type: string; credits: number | string; max_cie_marks: number | string; max_see_marks: number | string; };
  loading: boolean;
  branchId: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  filters: {
    semester_id: string;
    subject_type: string;
  };
}

const SubjectManagement = () => {
  const { theme } = useTheme();
  const [state, setState] = useState<SubjectManagementState>({
    subjects: [],
    semesters: [],
    showModal: null,
    currentSubject: null,
    newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, max_cie_marks: 50, max_see_marks: 50 },
    loading: false,
    branchId: "",
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    filters: {
      semester_id: "",
      subject_type: ""
    }
  });

  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isModalSemesterOpen, setIsModalSemesterOpen] = useState(false);
  const [isModalTypeOpen, setIsModalTypeOpen] = useState(false);

  const totalPages = state.totalPages;
  const [downloadingPDF, setDownloadingPDF] = useState(false);



  const handleExportPDF = async () => {
    setDownloadingPDF(true);
    try {
      let queryParams = `?semester_id=${state.filters.semester_id}&subject_type=${state.filters.subject_type}`;
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/subjects/export-pdf/${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Course_List_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        updateState({ success: "Course list PDF exported successfully" });
      } else {
        const result = await response.json().catch(() => ({}));
        updateState({ error: result.message || "Failed to export PDF" });
      }
    } catch (err) {
      updateState({ error: "Network error while exporting PDF" });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getSemesterName = (number: number) => {
    if (getInstitutionType() === 'school') {
      return `Class ${number}`;
    }
    let suffix = "th";
    if (number % 10 === 1 && number % 100 !== 11) suffix = "st";
    else if (number % 10 === 2 && number % 100 !== 12) suffix = "nd";
    else if (number % 10 === 3 && number % 100 !== 13) suffix = "rd";
    return `${number}${suffix} Semester`;
  };

  // Helper to update state
  const updateState = (newState: Partial<SubjectManagementState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch branch ID and semesters (one-time bootstrap)
  const fetchBootstrap = async () => {
    try {
      const boot = await getHODSubjectBootstrap();
      if (!boot.success || !boot.data?.profile?.branch_id) {
        throw new Error(boot.message || "Failed to bootstrap subject management");
      }
      const branchId = boot.data.profile.branch_id;
      updateState({ branchId });

      // Semesters
      const semestersRes = boot.data.semesters ? { success: true, data: boot.data.semesters } : await getSemesters(branchId);

      if (semestersRes.success) {
        updateState({ semesters: semestersRes.data || [] });
      } else {
        showErrorAlert("Error", semestersRes.message || "Failed to fetch semesters");
      }

      return branchId;
    } catch (err) {
      if (isErrorWithMessage(err)) {
        showErrorAlert("Error", err.message || "Failed to fetch bootstrap data");
      } else {
        showErrorAlert("Error", "Failed to fetch bootstrap data");
      }
      return null;
    }
  };

  // Fetch subjects with pagination
  const fetchSubjects = async (branchId: string, page: number = 1, pageSize: number = 10, filters = state.filters) => {
    if (!filters.semester_id || !filters.subject_type || filters.semester_id === "all" || filters.subject_type === "all") {
      updateState({
        subjects: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1
      });
      return;
    }
    updateState({ loading: true });
    try {
      const subjectsRes = await manageSubjects({
        branch_id: branchId,
        page,
        page_size: pageSize,
        semester_id: filters.semester_id,
        subject_type: filters.subject_type || undefined
      }, "GET");

      if (subjectsRes.success) {
        updateState({
          subjects: subjectsRes.data || [],
          totalCount: subjectsRes.count || 0,
          totalPages: subjectsRes.total_pages || Math.ceil((subjectsRes.count || 0) / pageSize) || 1,
          currentPage: subjectsRes.current_page || 1
        });
      } else {
        showErrorAlert("Error", subjectsRes.message || "Failed to fetch subjects");
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        showErrorAlert("Error", err.message || "Failed to fetch subjects");
      } else {
        showErrorAlert("Error", "Failed to fetch subjects");
      }
    } finally {
      updateState({ loading: false });
    }
  };

  // Initial bootstrap on mount
  useEffect(() => {
    const initialize = async () => {
      updateState({ loading: true });
      const branchId = await fetchBootstrap();
      if (branchId && state.filters.semester_id && state.filters.semester_id !== "all") {
        await fetchSubjects(branchId, state.currentPage, state.pageSize);
      }
      updateState({ loading: false });
    };
    initialize();
  }, []); // Only run once on mount

  // Fetch subjects when pagination or filters change (but not on initial mount)
  useEffect(() => {
    if (state.branchId && state.filters.semester_id && state.filters.subject_type && state.filters.semester_id !== "all" && state.filters.subject_type !== "all") {
      fetchSubjects(state.branchId, state.currentPage, state.pageSize, state.filters);
    } else if ((!state.filters.semester_id || !state.filters.subject_type || state.filters.semester_id === "all" || state.filters.subject_type === "all") && state.subjects.length > 0) {
      updateState({
        subjects: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1
      });
    }
  }, [state.currentPage, state.pageSize, state.filters]);

  const handleEdit = (subject: Subject) => {
    updateState({
      currentSubject: subject,
      newSubject: {
        code: subject.subject_code,
        name: subject.name,
        semester_id: subject.semester_id,
        subject_type: subject.subject_type,
        credits: subject.credits || 3,
        max_cie_marks: subject.max_cie_marks ?? 50,
        max_see_marks: subject.max_see_marks ?? 50
      },
      showModal: "edit"
    });
  };

  // Handle deleting a subject
  const handleDelete = (subjectId: string) => {
    Swal.fire({
      title: "Delete Course?",
      text: "Are you sure you want to delete this course? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: theme === 'dark' ? '#374151' : '#e5e7eb',
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f3f4f6' : '#111827',
      iconColor: "#ef4444"
    }).then((result) => {
      if (result.isConfirmed) {
        executeDelete(subjectId);
      }
    });
  };

  const executeDelete = async (subjectId: string) => {
    const data: ManageSubjectsRequest = {
      action: "delete",
      branch_id: state.branchId,
      subject_id: subjectId
    };

    updateState({ loading: true });
    try {
      const response = await manageSubjects(data, "POST");
      if (response.success) {
        // Remove locally and adjust pagination
        const newSubjectsList = state.subjects.filter((s) => s.id !== subjectId);
        const newTotalCount = Math.max(0, state.totalCount - 1);
        const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
        let newPage = state.currentPage;

        if (newSubjectsList.length === 0 && state.currentPage > 1) {
          newPage = Math.max(1, newTotalPages);
          updateState({ loading: false, currentPage: newPage, totalCount: newTotalCount, totalPages: newTotalPages });
          showSuccessAlert("Success", "Course deleted successfully");
          await fetchSubjects(state.branchId, newPage, state.pageSize);
        } else {
          updateState({ subjects: newSubjectsList, totalCount: newTotalCount, totalPages: newTotalPages });
          showSuccessAlert("Success", "Course deleted successfully");
        }
      } else {
        showErrorAlert("Error", response.message);
      }
    } catch (err) {
      const msg = isErrorWithMessage(err) ? err.message : "Failed to delete subject";
      showErrorAlert("Error", msg);
    } finally {
      updateState({ loading: false });
    }
  };

  // Helper to get semester number by ID
  const getSemesterNumber = (semesterId: string): string => {
    const semester = state.semesters.find((s) => s.id === semesterId);
    return semester ? getSemesterName(semester.number) : `Semester ID: ${semesterId} (Not Found)`;
  };

  return (
    <div id="hod-subjects-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <div id="courses-header-filters-section">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2 sm:gap-4">
              <div className="flex flex-col items-start w-full sm:w-auto">
                <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Manage Courses</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">Configure and manage courses, credits, and syllabus structure.</CardDescription>
              </div>
              <div className="flex flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => {
                    updateState({
                      showModal: "add",
                      newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, max_cie_marks: 50, max_see_marks: 50 },
                      currentSubject: null
                    });
                  }}
                  className="flex-1 sm:flex-none w-full sm:w-auto bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                  disabled={state.loading || !state.branchId}>

                  + Add Course
                </Button>

                {/* Mobile Download PDF Icon Button */}
                <Button
                  onClick={handleExportPDF}
                  disabled={state.loading || downloadingPDF || !state.filters.semester_id || !state.filters.subject_type || state.filters.semester_id === "all" || state.filters.subject_type === "all"}
                  size="icon"
                  variant="outline"
                  className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                >
                  {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                </Button>

                <Button
                  onClick={handleExportPDF}
                  disabled={state.loading || downloadingPDF || !state.filters.semester_id || !state.filters.subject_type || state.filters.semester_id === "all" || state.filters.subject_type === "all"}
                  className="hidden sm:flex w-full sm:w-auto bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md items-center justify-center gap-2">
                  {downloadingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  <span>Export PDF</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4 pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-48">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Filter by Semester</label>
                <Select
                  open={isSemesterOpen}
                  onOpenChange={setIsSemesterOpen}
                  value={state.filters.semester_id}
                  onValueChange={(val) => {
                    updateState({ filters: { ...state.filters, semester_id: val }, currentPage: 1 });
                    setTimeout(() => setIsTypeOpen(true), 150);
                  }}>

                  <SelectTrigger className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                    <SelectValue placeholder={translateTerminology("Choose Semester")} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                    {state.semesters.length === 0 ? (
                      <SelectItem value="no_semester" disabled className="text-center text-xs text-muted-foreground">
                        No Semester
                      </SelectItem>
                    ) : (
                      state.semesters.map((sem) =>
                        <SelectItem key={sem.id} value={sem.id}>{getSemesterName(sem.number)}</SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Filter by Type</label>
                <Select
                  open={isTypeOpen}
                  onOpenChange={setIsTypeOpen}
                  value={state.filters.subject_type}
                  onValueChange={(val) => updateState({ filters: { ...state.filters, subject_type: val }, currentPage: 1 })}>

                  <SelectTrigger className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                    <SelectValue placeholder="Choose Type" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="elective">Elective/Labs</SelectItem>
                    <SelectItem value="open_elective">Open Elective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </div>

        <CardContent className="pt-0">
          {state.loading ? (
            <div className="py-4">
              <SkeletonTable rows={10} cols={6} />
            </div>
          ) : !state.filters.semester_id || !state.filters.subject_type || state.filters.semester_id === "all" || state.filters.subject_type === "all" ? (
            <div className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <BookOpen className="w-12 h-12 opacity-80" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selection Incomplete</h3>
              <p className="max-w-xs text-base leading-relaxed text-gray-500 dark:text-gray-400">
                Please select both <strong className="font-semibold text-foreground">{translateTerminology("Semester")}</strong> and <strong className="font-semibold text-foreground">Course Type</strong> above to load and view the courses.
              </p>
            </div>
          ) : (
            <>
              {state.subjects.length > 0 ? (
                <>
                  {/* Desktop/Table for md+ */}
                  <div className="overflow-x-auto hidden md:block">
                    <table className="w-full table-auto text-sm">
                      <thead className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-100 text-gray-900'}>
                        <tr>
                          <th className="px-4 py-3 font-semibold text-left">COURSE CODE</th>
                          <th className="px-4 py-3 font-semibold text-left">COURSE NAME</th>
                          <th className="px-4 py-3 font-semibold text-left">{getInstitutionType() === 'school' ? 'CLASS' : 'SEMESTER'}</th>
                          {getInstitutionType() !== 'school' && (
                            <th className="px-4 py-3 font-semibold text-left">COURSE TYPE</th>
                          )}
                          {getInstitutionType() !== 'school' && (
                            <th className="px-4 py-3 font-semibold text-left">COURSE CREDITS</th>
                          )}
                          <th className="px-4 py-3 font-semibold text-left">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className={theme === 'dark' ? 'bg-background' : 'bg-white'}>
                        {state.subjects.map((subject, index) =>
                          <tr
                            key={subject.id}
                            className={
                              index % 2 === 0 ? theme === 'dark' ? 'bg-card' : 'bg-gray-50' : theme === 'dark' ? 'bg-background' : 'bg-white'
                            }>
                            <td className="px-4 py-3">{subject.subject_code}</td>
                            <td className="px-4 py-3">{subject.name}</td>
                            <td className="px-4 py-3">{getSemesterNumber(subject.semester_id)}</td>
                            {getInstitutionType() !== 'school' && (
                              <td className="px-4 py-3">{subject.subject_type === 'regular' ? 'Regular' : subject.subject_type === 'elective' ? 'Elective/Labs' : 'Open Elective Subjects'}</td>
                            )}
                            {getInstitutionType() !== 'school' && (
                              <td className="px-4 py-3">{subject.credits ?? 0}</td>
                            )}
                            <td className="px-4 py-3 flex gap-5">
                              <Pencil
                                className={`w-4 h-4 cursor-pointer ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`}
                                onClick={() => handleEdit(subject)} />
                              <Trash2
                                className={`w-4 h-4 cursor-pointer ${theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'}`}
                                onClick={() => handleDelete(subject.id)} />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: card list (only visible on small screens) */}
                  <div className="md:hidden space-y-3">
                    {state.subjects.map((subject) =>
                      <div
                        key={subject.id}
                        className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-3">
                            <div className="text-xs text-gray-500 mb-1">{subject.subject_code} • {getSemesterNumber(subject.semester_id)}</div>
                            <div className="font-medium text-sm mb-1">{subject.name}</div>
                            <div className="text-sm text-gray-500">{subject.subject_type === 'regular' ? 'Regular' : subject.subject_type === 'elective' ? 'Elective/Labs' : 'Open Elective'} • {subject.credits ?? 0} credits</div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Pencil
                              className={`w-5 h-5 cursor-pointer ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`}
                              onClick={() => handleEdit(subject)} />
                            <Trash2
                              className={`w-5 h-5 cursor-pointer ${theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'} }`}
                              onClick={() => handleDelete(subject.id)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 hover:bg-card/50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-50 text-blue-600'}`}>
                    <BookOpen className="w-10 h-10" />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Courses Found</h3>
                  <p className={`text-sm text-center max-w-xs mb-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    It looks like there are no courses matching your criteria. Try adjusting your filters or add a new course to get started.
                  </p>
                  <Button
                    onClick={() => updateState({
                      showModal: "add",
                      newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
                      currentSubject: null
                    })}
                    className="bg-primary text-white hover:bg-primary/90 transition-all transform hover:scale-105 active:scale-95 shadow-lg">
                    + Add Your First Course
                  </Button>
                </div>
              )}
            </>
          )}

        </CardContent>
        {state.filters.semester_id && state.filters.subject_type && state.filters.semester_id !== "all" && state.filters.subject_type !== "all" && totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {state.totalCount === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1} to {Math.min(state.currentPage * state.pageSize, state.totalCount)} of {state.totalCount} courses
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateState({ currentPage: Math.max(state.currentPage - 1, 1) })}
                disabled={state.currentPage === 1 || state.loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
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
                onClick={() => updateState({ currentPage: Math.min(state.currentPage + 1, totalPages) })}
                disabled={state.currentPage === totalPages || state.loading || totalPages === 0}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>


      {/* Add/Edit Subject Modal */}
      {state.showModal &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => updateState({ showModal: null })}>
          <div className={`p-6 rounded-lg shadow-lg w-[90%] sm:w-[420px] max-h-[85vh] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {state.showModal === "add" ? "Add New Subject" : "Edit Subject"}
            </h3>

            {/* Course Code */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Course Code <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={state.newSubject.code}
                onChange={(e) => {
                  const code = e.target.value.toUpperCase(); // auto-uppercase
                  updateState({
                    newSubject: { ...state.newSubject, code }
                  });
                }}
                placeholder="e.g., PH1L001, BCS601"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`} />

            </div>

            {/* Course Name */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Course Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={state.newSubject.name}
                onChange={(e) =>
                  updateState({
                    newSubject: { ...state.newSubject, name: e.target.value }
                  })
                }
                placeholder="e.g., Mathematics"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`} />

            </div>

            {/* Semester */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {translateTerminology("Semester")} <span className="text-red-500">*</span>
              </label>
              <Select
                open={isModalSemesterOpen}
                onOpenChange={setIsModalSemesterOpen}
                value={state.newSubject.semester_id}
                onValueChange={(val: string) => {
                  updateState({ newSubject: { ...state.newSubject, semester_id: val } });
                  setTimeout(() => setIsModalTypeOpen(true), 150);
                }}
                disabled={state.loading}>

                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder={translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                  {state.semesters.map((semester) =>
                    <SelectItem key={semester.id} value={semester.id}>
                      {getSemesterName(semester.number)}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Course Type - Always shown */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Course Type <span className="text-red-500">*</span>
              </label>
              <Select
                open={isModalTypeOpen}
                onOpenChange={setIsModalTypeOpen}
                value={state.newSubject.subject_type}
                onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, subject_type: val } })}
                disabled={state.loading}>

                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="elective">Elective/Labs</SelectItem>
                  <SelectItem value="open_elective">Open Elective Subjects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Course Credits - Optional / Hidden for School */}
            {getInstitutionType() !== 'school' && (
              <div className="mb-4">
                <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Course Credits <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={state.newSubject.credits}
                  onChange={(e) =>
                    updateState({
                      newSubject: { ...state.newSubject, credits: e.target.value === "" ? "" : parseInt(e.target.value) || "" }
                    })
                  }
                  disabled={state.loading}
                  className={`${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} px-3 py-2 rounded`}
                />
              </div>
            )}

            {/* Max CIE Marks - Optional / Hidden for School */}
            {getInstitutionType() !== 'school' && (
              <div className="mb-4">
                <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Max CIE Marks <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={300}
                  value={state.newSubject.max_cie_marks}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      updateState({ newSubject: { ...state.newSubject, max_cie_marks: "" } });
                      return;
                    }
                    let val = parseInt(e.target.value) || 0;
                    if (val > 300) val = 300;
                    updateState({
                      newSubject: { ...state.newSubject, max_cie_marks: val }
                    });
                  }}
                  disabled={state.loading}
                  className={`${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} px-3 py-2 rounded`}
                />
              </div>
            )}

            {/* Max SEE Marks - Optional / Hidden for School */}
            {getInstitutionType() !== 'school' && (
              <div className="mb-6">
                <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Max SEE Marks <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={300}
                  value={state.newSubject.max_see_marks}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      updateState({ newSubject: { ...state.newSubject, max_see_marks: "" } });
                      return;
                    }
                    let val = parseInt(e.target.value) || 0;
                    if (val > 300) val = 300;
                    updateState({
                      newSubject: { ...state.newSubject, max_see_marks: val }
                    });
                  }}
                  disabled={state.loading}
                  className={`${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'} px-3 py-2 rounded`}
                />
              </div>
            )}


            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => {
                  updateState({
                    showModal: null,
                    newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, max_cie_marks: 50, max_see_marks: 50 },
                    currentSubject: null
                  });
                }}
                className={`${theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 bottom-1 '}`}
                disabled={state.loading}>

                Cancel
              </Button>

              <Button
                onClick={async () => {
                  if (!state.newSubject.code || !state.newSubject.name || !state.newSubject.semester_id) {
                    showErrorAlert("Error", "All fields are required");
                    return;
                  }

                  const data: ManageSubjectsRequest = {
                    action: state.showModal === "add" ? "create" : "update",
                    branch_id: state.branchId,
                    name: state.newSubject.name,
                    subject_code: state.newSubject.code,
                    semester_id: state.newSubject.semester_id,
                    subject_type: state.newSubject.subject_type,
                    credits: Number(state.newSubject.credits),
                    max_cie_marks: Number(state.newSubject.max_cie_marks),
                    max_see_marks: Number(state.newSubject.max_see_marks),
                    ...(state.showModal === "edit" && state.currentSubject ? { subject_id: state.currentSubject.id } : {})
                  };

                  updateState({ loading: true });
                  try {
                    const response = await manageSubjects(data, "POST");
                    if (response.success) {
                      const isCreate = data.action === 'create';
                      const createdId = response.data?.subject_id as unknown as string;
                      const updatedSubject: Subject = {
                        id: isCreate ? createdId || `${Date.now()}` : state.currentSubject ? state.currentSubject.id : createdId || `${Date.now()}`,
                        name: state.newSubject.name,
                        subject_code: state.newSubject.code,
                        semester_id: state.newSubject.semester_id,
                        subject_type: state.newSubject.subject_type,
                        credits: state.newSubject.credits,
                        max_cie_marks: state.newSubject.max_cie_marks,
                        max_see_marks: state.newSubject.max_see_marks
                      };

                      if (isCreate) {
                        const newSubjects = [updatedSubject, ...state.subjects].slice(0, state.pageSize);
                        const newTotalCount = state.totalCount + 1;
                        const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
                        showSuccessAlert("Success", "Subject added successfully!");
                        updateState({
                          subjects: newSubjects,
                          totalCount: newTotalCount,
                          totalPages: newTotalPages,
                          showModal: null,
                          newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, max_cie_marks: 50, max_see_marks: 50 },
                          currentSubject: null
                        });
                      } else {
                        const newSubjects = state.subjects.map((s) => s.id === updatedSubject.id ? updatedSubject : s);
                        showSuccessAlert("Success", "Subject updated successfully!");
                        updateState({
                          subjects: newSubjects,
                          showModal: null,
                          newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
                          currentSubject: null
                        });
                      }
                    } else {
                      showErrorAlert("Error", response.message);
                    }
                  } catch (err) {
                    showErrorAlert("Error", "Failed to save subject");
                  } finally {
                    updateState({ loading: false });
                  }
                }}
                className="bg-primary text-white border border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                disabled={state.loading}>

                {state.showModal === "add" ? "Add Course" : "Update Course"}
              </Button>
            </div>
          </div>
        </div>
      }
    </div>
  );
};

export default SubjectManagement;