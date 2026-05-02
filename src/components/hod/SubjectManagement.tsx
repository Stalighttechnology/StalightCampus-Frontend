import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { SkeletonTable } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { manageSubjects, getSemesters, manageProfile, getHODSubjectBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";

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
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Define the state type to include all properties
interface SubjectManagementState {
  subjects: Subject[];
  semesters: Semester[];
  deleteConfirmation: string | null;
  showModal: "add" | "edit" | null;
  currentSubject: Subject | null;
  newSubject: { code: string; name: string; semester_id: string; subject_type: string; credits: number };
  error: string | null;
  success: string | null;
  loading: boolean;
  branchId: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  modalError: string | null;
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
    deleteConfirmation: null,
    showModal: null,
    currentSubject: null,
    newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
    error: null,
    success: null,
    loading: false,
    branchId: "",
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    modalError: null,
    filters: {
      semester_id: "all",
      subject_type: "all",
    },
  });

  const totalPages = state.totalPages;

  // Helper to update state
  const updateState = (newState: Partial<SubjectManagementState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (state.error || state.success) {
      const timer = setTimeout(() => {
        updateState({ error: null, success: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error, state.success]);

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
        console.log("Semesters fetched:", semestersRes.data);
        updateState({ semesters: semestersRes.data || [] });
        if (!semestersRes.data?.length) {
          updateState({ error: "No semesters found for this branch" });
        }
      } else {
        updateState({ error: semestersRes.message || "Failed to fetch semesters" });
      }

      return branchId;
    } catch (err) {
      if (isErrorWithMessage(err)) {
        updateState({ error: err.message || "Failed to fetch bootstrap data" });
      } else {
        updateState({ error: "Failed to fetch bootstrap data" });
      }
      return null;
    }
  };

  // Fetch subjects with pagination
  const fetchSubjects = async (branchId: string, page: number = 1, pageSize: number = 10, filters = state.filters) => {
    updateState({ loading: true });
    try {
      const subjectsRes = await manageSubjects({
        branch_id: branchId,
        page,
        page_size: pageSize,
        semester_id: filters.semester_id === "all" ? undefined : filters.semester_id,
        subject_type: filters.subject_type === "all" ? undefined : filters.subject_type,
      }, "GET");

      if (subjectsRes.success) {
        console.log("Subjects fetched:", subjectsRes.data);
        updateState({
          subjects: subjectsRes.data || [],
          totalCount: subjectsRes.count || 0,
          totalPages: subjectsRes.total_pages || 0,
          currentPage: subjectsRes.current_page || 1
        });
      } else {
        updateState({ error: subjectsRes.message || "Failed to fetch subjects" });
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        updateState({ error: err.message || "Failed to fetch subjects" });
      } else {
        updateState({ error: "Failed to fetch subjects" });
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
      if (branchId) {
        await fetchSubjects(branchId, state.currentPage, state.pageSize);
      }
      updateState({ loading: false });
    };
    initialize();
  }, []); // Only run once on mount

  // Fetch subjects when pagination or filters change (but not on initial mount)
  useEffect(() => {
    if (state.branchId) {
      fetchSubjects(state.branchId, state.currentPage, state.pageSize, state.filters);
    }
  }, [state.currentPage, state.pageSize, state.filters]);

  // Handle adding or updating a subject
  const handleSubmit = async () => {
    if (!state.newSubject.code || !state.newSubject.name || !state.newSubject.semester_id) {
      updateState({ error: "All fields are required" });
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
      ...(state.showModal === "edit" && state.currentSubject ? { subject_id: state.currentSubject.id } : {}),
    };

    updateState({ loading: true });
    try {
      const response = await manageSubjects(data, "POST");
      if (response.success) {
        // Update local state to reflect create/update without refetching
        const isCreate = data.action === 'create';
        const createdId = response.data?.subject_id as unknown as string;
        const updatedSubject: Subject = {
          id: isCreate ? (createdId || `${Date.now()}`) : (state.currentSubject ? state.currentSubject.id : createdId || `${Date.now()}`),
          name: state.newSubject.name,
          subject_code: state.newSubject.code,
          semester_id: state.newSubject.semester_id,
          subject_type: state.newSubject.subject_type,
          credits: state.newSubject.credits,
        };

        if (isCreate) {
          // Prepend to current page; keep page size stable
          const newSubjects = [updatedSubject, ...state.subjects].slice(0, state.pageSize);
          const newTotalCount = state.totalCount + 1;
          const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
          updateState({
            subjects: newSubjects,
            totalCount: newTotalCount,
            totalPages: newTotalPages,
            success: "Course added successfully",
            showModal: null,
            newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
            currentSubject: null,
          });
        } else {
          // Update in-place
          const newSubjects = state.subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
          updateState({
            subjects: newSubjects,
            success: "Course updated successfully",
            showModal: null,
            newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
            currentSubject: null,
          });
        }
      } else {
        updateState({ error: response.message });
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        updateState({ error: err.message || "Failed to save subject" });
      } else {
        updateState({ error: "Failed to save subject" });
      }
    } finally {
      updateState({ loading: false });
    }
  };

  const handleEdit = (subject: Subject) => {
    updateState({
      currentSubject: subject,
      newSubject: {
        code: subject.subject_code,
        name: subject.name,
        semester_id: subject.semester_id,
        subject_type: subject.subject_type,
        credits: subject.credits || 3,
      },
      showModal: "edit",
    });
  };

  // Handle deleting a subject
  const handleDelete = (subjectId: string) => {
    updateState({ deleteConfirmation: subjectId });
  };

  const confirmDelete = async (confirmed: boolean) => {
    if (confirmed && state.deleteConfirmation) {
      const data: ManageSubjectsRequest = {
        action: "delete",
        branch_id: state.branchId,
        subject_id: state.deleteConfirmation,
      };

      updateState({ loading: true });
      try {
        const response = await manageSubjects(data, "POST");
        if (response.success) {
          // Remove locally and adjust pagination; only fetch if previous page must be loaded
          const removedId = state.deleteConfirmation;
          const newSubjectsList = state.subjects.filter((s) => s.id !== removedId);
          const newTotalCount = Math.max(0, state.totalCount - 1);
          const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
          let newPage = state.currentPage;
          // If current page became empty and there is a previous page, go back one page and fetch it
          if (newSubjectsList.length === 0 && state.currentPage > 1) {
            newPage = Math.max(1, newTotalPages);
            updateState({ loading: false, deleteConfirmation: null, success: "Course deleted successfully", currentPage: newPage, totalCount: newTotalCount, totalPages: newTotalPages });
            // Load previous page because we don't have its items locally
            await fetchSubjects(state.branchId, newPage, state.pageSize);
          } else {
            updateState({ subjects: newSubjectsList, totalCount: newTotalCount, totalPages: newTotalPages, success: "Course deleted successfully" });
          }
        } else {
          updateState({ error: response.message });
        }
      } catch (err) {
        if (isErrorWithMessage(err)) {
          updateState({ error: err.message || "Failed to delete subject" });
        } else {
          updateState({ error: "Failed to delete subject" });
        }
      } finally {
        updateState({ loading: false });
      }
    }
    updateState({ deleteConfirmation: null });
  };

  // Helper to get semester number by ID
  const getSemesterNumber = (semesterId: string): string => {
    const semester = state.semesters.find((s) => s.id === semesterId);
    return semester ? `Semester ${semester.number}` : `Semester ID: ${semesterId} (Not Found)`;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>

      {state.error && <div className={`mb-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.error}</div>}
      {state.success && <div className={`mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{state.success}</div>}

      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Manage Courses</CardTitle>
            <Button
              onClick={() => {
                updateState({
                  showModal: "add",
                  newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
                  currentSubject: null,
                });
              }}
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              disabled={state.loading || !state.branchId}
            >
              + Add Course
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-48">
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Filter by Semester</label>
              <Select
                value={state.filters.semester_id}
                onValueChange={(val) => updateState({ filters: { ...state.filters, semester_id: val }, currentPage: 1 })}
              >
                <SelectTrigger className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {state.semesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.id}>Semester {sem.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Filter by Type</label>
              <Select
                value={state.filters.subject_type}
                onValueChange={(val) => updateState({ filters: { ...state.filters, subject_type: val }, currentPage: 1 })}
              >
                <SelectTrigger className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="elective">Elective</SelectItem>
                  <SelectItem value="open_elective">Open Elective</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {state.loading ? (
            <div className="py-4">
              <SkeletonTable rows={10} cols={6} />
            </div>
          ) : (
            <>
              {/* Desktop/Table for md+ */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full table-auto text-sm">
                  <thead className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-100 text-gray-900'}>
                    <tr>
                      <th className="px-4 py-3 text-left">COURSE CODE</th>
                      <th className="px-4 py-3 text-left">COURSE NAME</th>
                      <th className="px-4 py-3 text-left">SEMESTER</th>
                      <th className="px-4 py-3 text-left">COURSE TYPE</th>
                      <th className="px-4 py-3 text-left">COURSE CREDITS</th>
                      <th className="px-4 py-3 text-left">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'bg-background' : 'bg-white'}>
                    {state.subjects.map((subject, index) => (
                      <tr
                        key={subject.id}
                        className={
                          index % 2 === 0 ? (theme === 'dark' ? 'bg-card' : 'bg-gray-50') : (theme === 'dark' ? 'bg-background' : 'bg-white')
                        }
                      >
                        <td className="px-4 py-3">{subject.subject_code}</td>
                        <td className="px-4 py-3">{subject.name}</td>
                        <td className="px-4 py-3">{getSemesterNumber(subject.semester_id)}</td>
                        <td className="px-4 py-3">{subject.subject_type === 'regular' ? 'Regular' : subject.subject_type === 'elective' ? 'Elective Subjects' : 'Open Elective Subjects'}</td>
                        <td className="px-4 py-3">{subject.credits ?? 0}</td>
                        <td className="px-4 py-3 flex gap-5">
                          <Pencil
                            className={`w-4 h-4 cursor-pointer ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`}
                            onClick={() => handleEdit(subject)}
                          />
                          <Trash2
                            className={`w-4 h-4 cursor-pointer ${theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'}`}
                            onClick={() => handleDelete(subject.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: card list (only visible on small screens) */}
              <div className="md:hidden space-y-3">
                {state.subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-3">
                        <div className="text-xs text-gray-500 mb-1">{subject.subject_code} • {getSemesterNumber(subject.semester_id)}</div>
                        <div className="font-medium text-sm mb-1">{subject.name}</div>
                        <div className="text-sm text-gray-500">{subject.subject_type === 'regular' ? 'Regular' : subject.subject_type === 'elective' ? 'Elective' : 'Open Elective'} • {subject.credits ?? 0} credits</div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Pencil
                          className={`w-5 h-5 cursor-pointer ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`}
                          onClick={() => handleEdit(subject)}
                        />
                        <Trash2
                          className={`w-5 h-5 cursor-pointer ${theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'}`}
                          onClick={() => handleDelete(subject.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="mt-4 flex justify-end items-center gap-2">
            <Button
              onClick={() => updateState({ currentPage: Math.max(state.currentPage - 1, 1) })}
              disabled={state.currentPage === 1 || state.loading}
              className="flex items-center justify-center gap-1 text-sm font-medium py-1.5 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              Previous
            </Button>
            <div className={`px-4 text-center text-sm font-medium py-1.5 rounded-md min-w-12 ${theme === 'dark' ? 'text-foreground bg-card border border-border' : 'text-gray-900 bg-white border border-gray-300'}`}>
              {state.currentPage}
            </div>
            <Button
              onClick={() => updateState({ currentPage: Math.min(state.currentPage + 1, totalPages) })}
              disabled={state.currentPage === totalPages || state.loading || totalPages === 0}
              className="flex items-center justify-center gap-1 text-sm font-medium py-1.5 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {state.deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => confirmDelete(false)}>
          <div className={`p-4 md:p-6 w-[92%] max-w-sm md:w-auto rounded-2xl md:rounded shadow-lg ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Are you sure you want to delete this course?
            </h3>
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => confirmDelete(false)}
                className={`text-foreground ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                disabled={state.loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmDelete(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={state.loading}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Subject Modal */}
      {state.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => updateState({ showModal: null })}>
          <div className={`p-6 rounded-lg shadow-lg w-96 max-h-[70vh] overflow-y-auto md:max-h-none md:overflow-visible ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {state.showModal === "add" ? "Add New Subject" : "Edit Subject"}
            </h3>

            {/* Display modal-level error below title */}
            {state.modalError && (
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.modalError}</p>
            )}

            {/* Course Code */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Code</label>
              <Input
                type="text"
                value={state.newSubject.code}
                onChange={(e) => {
                  const code = e.target.value.toUpperCase(); // auto-uppercase
                  updateState({
                    newSubject: { ...state.newSubject, code },
                    modalError: null,
                  });
                }}
                placeholder="e.g., PH1L001, BCS601"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`}
              />
            </div>

            {/* Course Name */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Name</label>
              <Input
                type="text"
                value={state.newSubject.name}
                onChange={(e) =>
                  updateState({
                    newSubject: { ...state.newSubject, name: e.target.value },
                    modalError: null,
                  })
                }
                placeholder="e.g., Mathematics"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`}
              />
            </div>

            {/* Semester */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester</label>
              <Select
                value={state.newSubject.semester_id}
                onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, semester_id: val }, modalError: null })}
                disabled={state.loading}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  {state.semesters.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id}>
                      Semester {semester.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Course Type */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Type</label>
              <Select
                value={state.newSubject.subject_type}
                onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, subject_type: val }, modalError: null })}
                disabled={state.loading}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="elective">Elective Subjects</SelectItem>
                  <SelectItem value="open_elective">Open Elective Subjects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Course Credits */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Credits</label>
              <Input
                type="number"
                min={0}
                value={state.newSubject.credits}
                onChange={(e) =>
                  updateState({ newSubject: { ...state.newSubject, credits: Number(e.target.value) }, modalError: null })
                }
                placeholder="e.g., 3"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => {
                  updateState({
                    showModal: null,
                    newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
                    currentSubject: null,
                    modalError: null,
                  });
                }}
                className={`${theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 bottom-1 '}`}
                disabled={state.loading}
              >
                Cancel
              </Button>

              <Button
                onClick={async () => {
                  if (!state.newSubject.code || !state.newSubject.name || !state.newSubject.semester_id) {
                    updateState({ modalError: "All fields are required" });
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
                    ...(state.showModal === "edit" && state.currentSubject ? { subject_id: state.currentSubject.id } : {}),
                  };

                  updateState({ loading: true, modalError: null, success: null });
                  try {
                    const response = await manageSubjects(data, "POST");
                    if (response.success) {
                      const isCreate = data.action === 'create';
                      const createdId = response.data?.subject_id as unknown as string;
                      const updatedSubject: Subject = {
                        id: isCreate ? (createdId || `${Date.now()}`) : (state.currentSubject ? state.currentSubject.id : createdId || `${Date.now()}`),
                        name: state.newSubject.name,
                        subject_code: state.newSubject.code,
                        semester_id: state.newSubject.semester_id,
                        subject_type: state.newSubject.subject_type,
                        credits: state.newSubject.credits,
                      };

                      if (isCreate) {
                        const newSubjects = [updatedSubject, ...state.subjects].slice(0, state.pageSize);
                        const newTotalCount = state.totalCount + 1;
                        const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
                        updateState({
                          subjects: newSubjects,
                          totalCount: newTotalCount,
                          totalPages: newTotalPages,
                          success: "Subject added successfully",
                          showModal: null,
                          newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
                          currentSubject: null,
                          modalError: null,
                        });
                      } else {
                        const newSubjects = state.subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
                        updateState({
                          subjects: newSubjects,
                          success: "Subject updated successfully",
                          showModal: null,
                          newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3 },
                          currentSubject: null,
                          modalError: null,
                        });
                      }
                    } else {
                      updateState({ modalError: response.message });
                    }
                  } catch (err) {
                    updateState({ modalError: "Failed to save subject" });
                  } finally {
                    updateState({ loading: false });
                  }
                }}
                className="bg-primary text-white border border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                disabled={state.loading}
              >
                {state.showModal === "add" ? "Add Course" : "Update Course"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;