import { useState, useEffect, useCallback, ReactNode, Component } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { SkeletonTable } from "../ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { useToast } from "../ui/use-toast";
import { Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "../ui/dialog";
import { manageFacultyAssignments, manageSections, getFacultyAssignmentsBootstrap, getHODTimetableSemesterData, listFacultyBranches, manageFaculties } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";

// Interfaces
interface FacultyAssignmentsProps {
  setError: (error: string | null) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ManageFacultyAssignmentsRequest {
  action: "create" | "update" | "delete";
  assignment_id?: string;
  faculty_id?: string;
  subject_id?: string;
  semester_id?: string;
  section_id?: string;
  branch_id: string;
}

interface Assignment {
  id: string;
  faculty: string;
  subject: string;
  section: string;
  semester: number;
  faculty_id: string;
  subject_id: string;
  section_id: string;
  semester_id: string;
  branch_id?: string; // Add optional branch_id property
}

interface Faculty {
  id: string;
  username: string;
  first_name: string;
  last_name: string | null;
  name?: string; // Add optional name property
}

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string; // Only string type
}

interface Section {
  id: string;
  name: string;
  semester_id: string; // Only string type
}

interface Semester {
  id: string;
  number: number;
}

// Define types for API responses
interface SemesterData {
  id: number | string; // Allow both types
  number: number;
}

interface FacultyData {
  id: string;
  username: string;
  first_name: string;
  last_name: string | null;
}

interface SubjectData {
  id: string;
  name: string;
  subject_code: string;
  semester_id: number;
}

interface SectionData {
  id: string;
  name: string;
  semester_id: number;
}

interface AssignmentData {
  id: string;
  faculty: string;
  subject: string;
  section: string;
  semester: number;
  faculty_id: string;
  subject_id: string;
  section_id: string;
  semester_id: string;
}

interface ProfileData {
  branch_id: string;
}

interface HODSubjectBootstrapResponse {
  profile: ProfileData;
  semesters: SemesterData[];
  faculties: FacultyData[];
}

interface ManageAssignmentsResponse {
  success: boolean;
  data?: {
    assignment_id?: string;
    assignments?: AssignmentData[];
  };
  message?: string;
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

const FacultyAssignments = ({ setError }: FacultyAssignmentsProps) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [state, setState] = useState({
    facultyId: "",
    subjectId: "",
    sectionId: "",
    semesterId: "",
    assignments: [] as Assignment[],
    editingId: null as string | null,
    deleteId: null as string | null,
    openDeleteModal: false,
    loading: true,
    isAssigning: false,
    subjects: [] as Subject[],
    sections: [] as Section[],
    semesters: [] as Semester[],
    faculties: [] as Faculty[],
    allBranches: [] as { id: string, name: string }[],
    selectedBranchForFaculty: "",
    facultySearch: "",
    facultyPage: 1,
    facultyTotalPages: 1,
    loadingFaculties: false,
    branchId: "",
    filterSemesterId: "",
    filterSectionId: "",
    filterSections: [] as Section[],
    isFirstLoad: true,
  });

  // Helper to update state (stable reference for hooks)
  const updateState = useCallback((newState: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  // Small helpers to reduce cognitive complexity in handlers
  const buildFacultyName = (id: string) => {
    const f = state.faculties.find(x => x.id === id);
    return f ? `${f.first_name} ${f.last_name || ''}`.trim() : 'This faculty';
  };

  const hasDuplicateAssignment = (subjectId: string, sectionId: string, semesterId: string, excludeId?: string) =>
    state.assignments.some(a => a.subject_id === subjectId && a.section_id === sectionId && a.semester_id === semesterId && a.id !== excludeId);

  const hasDuplicateFaculty = (facultyId: string, subjectId: string, sectionId: string, semesterId: string, excludeId?: string) =>
    state.assignments.some(a => a.faculty_id === facultyId && a.subject_id === subjectId && a.section_id === sectionId && a.semester_id === semesterId && a.id !== excludeId);

  const buildAssignmentFromForm = (form?: { facultyId?: string; subjectId?: string; sectionId?: string; semesterId?: string }) => {
    const fId = form?.facultyId ?? state.facultyId;
    const sId = form?.subjectId ?? state.subjectId;
    const secId = form?.sectionId ?? state.sectionId;
    const semId = form?.semesterId ?? state.semesterId;

    return {
      faculty_id: fId,
      subject_id: sId,
      section_id: secId,
      semester_id: semId,
      faculty: buildFacultyName(fId),
      subject: state.subjects.find(s => s.id === sId)?.name || '',
      section: state.sections.find(s => s.id === secId)?.name || '',
      semester: state.semesters.find(s => s.id === semId)?.number || 0,
    } as Partial<Assignment>;
  };

    type FormState = {
      facultyId: string;
      subjectId: string;
      sectionId: string;
      semesterId: string;
      editingId: string | null;
    };

  // Optimistic helpers (separate create vs update to avoid branching flag)
  const applyOptimisticCreate = (tempId?: string) => {
    const newAssignment: Assignment = {
      id: tempId || `temp-${Date.now()}`,
      ...(buildAssignmentFromForm() as Assignment),
    };
    updateState({ assignments: [...state.assignments, newAssignment] });
  };

  const applyOptimisticEdit = () => {
    const updateFields = buildAssignmentFromForm();
    const updatedAssignments = state.assignments.map(assignment =>
      assignment.id === state.editingId ? { ...assignment, ...updateFields } : assignment
    );
    updateState({ assignments: updatedAssignments });
  };

  const reconcileCreateResponse = (response: ManageAssignmentsResponse, originalFormStateLocal: FormState) => {
    const createdId = response.data?.assignment_id;
    if (createdId) {
      const replaced = state.assignments.map((a) => (String(a.id).startsWith('temp-') && a.faculty_id === originalFormStateLocal.facultyId && a.subject_id === originalFormStateLocal.subjectId && a.section_id === originalFormStateLocal.sectionId && a.semester_id === originalFormStateLocal.semesterId)
        ? { ...a, id: createdId }
        : a
      );
      updateState({ assignments: replaced });
    }
  };

  const revertOptimisticChanges = (originalAssignmentsLocal: Assignment[], originalFormStateLocal: FormState) => {
    updateState({
      assignments: originalAssignmentsLocal,
      facultyId: originalFormStateLocal.facultyId,
      subjectId: originalFormStateLocal.subjectId,
      sectionId: originalFormStateLocal.sectionId,
      semesterId: originalFormStateLocal.semesterId,
      editingId: originalFormStateLocal.editingId,
    });
  };

  const saveCreateAssignment = async (data: ManageFacultyAssignmentsRequest, originalAssignmentsLocal: Assignment[], originalFormStateLocal: FormState) => {
    updateState({ isAssigning: true, loading: true });
    try {
      const response = await manageFacultyAssignments(data, "POST") as ManageAssignmentsResponse;
      if (response.success) {
        reconcileCreateResponse(response, originalFormStateLocal);
      } else {
        throw new Error(response.message || "Failed to save assignment");
      }
    } catch (err) {
      revertOptimisticChanges(originalAssignmentsLocal, originalFormStateLocal);
      if (isErrorWithMessage(err)) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      } else {
        const errorMessage = "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    } finally {
      updateState({ isAssigning: false, loading: false });
    }
  };

  const saveUpdateAssignment = async (data: ManageFacultyAssignmentsRequest, originalAssignmentsLocal: Assignment[], originalFormStateLocal: FormState) => {
    updateState({ isAssigning: true, loading: true });
    try {
      const response = await manageFacultyAssignments(data, "POST") as ManageAssignmentsResponse;
      if (!response.success) {
        throw new Error(response.message || "Failed to save assignment");
      }
      // No further reconciliation needed for update; optimistic edit already applied
    } catch (err) {
      revertOptimisticChanges(originalAssignmentsLocal, originalFormStateLocal);
      if (isErrorWithMessage(err)) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      } else {
        const errorMessage = "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    } finally {
      updateState({ isAssigning: false, loading: false });
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ loading: true });
      try {
        const boot = await getFacultyAssignmentsBootstrap();
        if (!boot.success || !boot.data) {
          throw new Error(boot.message || "Failed to bootstrap faculty assignments");
        }

        const profile = boot.data.profile;
        const semesters = boot.data.semesters.map((s) => ({
          id: s.id.toString(),
          number: s.number
        }));
        const faculties = boot.data.faculties;

        const branchesRes = await listFacultyBranches();
        const allBranches = branchesRes.success ? branchesRes.data || [] : [];

        updateState({
          branchId: profile.branch_id,
          semesters,
          allBranches,
          faculties: faculties.map((f: any) => ({
            ...f,
            name: `${f.first_name} ${f.last_name || ""}`.trim(),
          })),
          selectedBranchForFaculty: profile.branch_id, // Default to own branch
        });
      } catch (err) {
        if (isErrorWithMessage(err)) {
          const errorMessage = err.message || "Network error";
          setError(errorMessage);
          toast({ variant: "destructive", title: "Error", description: errorMessage });
        } else {
          const errorMessage = "Network error";
          setError(errorMessage);
          toast({ variant: "destructive", title: "Error", description: errorMessage });
        }
      } finally {
        updateState({ loading: false });
      }
    };
    fetchInitialData();
  }, [toast, setError, updateState]);

  // Fetch faculties when branch, search, or page changes
  useEffect(() => {
    const fetchFacultiesData = async () => {
      if (!state.selectedBranchForFaculty) {
        updateState({ faculties: [], facultyTotalPages: 1 });
        return;
      }

      // Skip fetching if it's the first load and we're on the home branch with no search/pagination
      if (state.isFirstLoad && state.selectedBranchForFaculty === state.branchId && !state.facultySearch && state.facultyPage === 1) {
        updateState({ isFirstLoad: false });
        return;
      }

      // If we change anything after first load, ensure isFirstLoad is false
      if (state.isFirstLoad) {
        updateState({ isFirstLoad: false });
      }

      updateState({ loadingFaculties: true });
      try {
        const res = await manageFaculties({
          branch_id: state.selectedBranchForFaculty,
          search: state.facultySearch,
          page: state.facultyPage,
          page_size: 10,
        });

        if (res.success) {
          updateState({
            faculties: res.data.map((f: any) => ({
              ...f,
              name: `${f.first_name} ${f.last_name || ""}`.trim(),
            })),
            facultyTotalPages: res.pagination.total_pages,
          });
        }
      } catch (err) {
        console.error("Error fetching faculties:", err);
      } finally {
        updateState({ loadingFaculties: false });
      }
    };

    const timer = setTimeout(() => {
      fetchFacultiesData();
    }, 300);

    return () => clearTimeout(timer);
  }, [state.selectedBranchForFaculty, state.facultySearch, state.facultyPage, updateState]);

  // Fetch subjects and sections when semester changes
  useEffect(() => {
    const fetchSemesterData = async () => {
      if (!state.semesterId || !state.branchId) return;

      updateState({ loading: true });
      try {
        const res = await getHODTimetableSemesterData(state.semesterId);
        if (res.success && res.data) {
          updateState({
            subjects: res.data.subjects || [],
            sections: res.data.sections || []
          });
        }
      } catch (err) {
        console.error("Error fetching semester data:", err);
      } finally {
        updateState({ loading: false });
      }
    };
    fetchSemesterData();
  }, [state.semesterId, state.branchId, updateState]);

  // Fetch sections for filter when filter semester changes
  useEffect(() => {
    const fetchFilterSections = async () => {
      if (!state.filterSemesterId || !state.branchId) {
        updateState({ filterSections: [], filterSectionId: "" });
        return;
      }

      try {
        const sectionsRes = await manageSections({ branch_id: state.branchId, semester_id: state.filterSemesterId }, "GET");
        if (sectionsRes.success) {
          updateState({ filterSections: sectionsRes.data || [], filterSectionId: "" });
        }
      } catch (err) {
        console.error("Error fetching filter sections:", err);
      }
    };
    fetchFilterSections();
  }, [state.filterSemesterId, state.branchId, updateState]);

  // Fetch assignments when filters change
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!state.branchId || !state.filterSemesterId || !state.filterSectionId) {
        updateState({ assignments: [] });
        return;
      }

      updateState({ loading: true });
      try {
        const response = await manageFacultyAssignments({
          branch_id: state.branchId,
          semester_id: state.filterSemesterId,
          section_id: state.filterSectionId,
        }, "GET");

        if (response.success && response.data?.assignments) {
          updateState({
            assignments: response.data.assignments,
          });
        }
      } catch (err) {
        console.error("Error fetching assignments:", err);
      } finally {
        updateState({ loading: false });
      }
    };

    fetchAssignments();
  }, [state.branchId, state.filterSemesterId, state.filterSectionId, updateState]);

  const resetForm = () => {
    updateState({
      facultyId: "",
      subjectId: "",
      sectionId: "",
      semesterId: "",
      editingId: null,
    });
  };

  const validateForm = () => {
    if (!state.facultyId || !state.subjectId || !state.sectionId || !state.semesterId) {
      toast({
        title: "Error",
        description: "Please select all required fields",
        variant: "destructive",
      });
      return false;
    }
    if (!state.faculties.some(f => f.id === state.facultyId)) {
      toast({ title: "Error", description: "Invalid faculty selected", variant: "destructive" });
      return false;
    }
    if (!state.subjects.some(s => s.id === state.subjectId)) {
      toast({ title: "Error", description: "Invalid subject selected", variant: "destructive" });
      return false;
    }
    if (!state.sections.some(s => s.id === state.sectionId)) {
      toast({ title: "Error", description: "Invalid section selected", variant: "destructive" });
      return false;
    }
    if (!state.semesters.some(s => s.id === state.semesterId)) {
      toast({ title: "Error", description: "Invalid semester selected", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleAssignFaculty = async () => {
    if (!validateForm() || !state.branchId) return;

    // 🚨 Case 1: Prevent multiple faculties or duplicate faculty assignment for same subject/section/semester
    if (hasDuplicateAssignment(state.subjectId, state.sectionId, state.semesterId, state.editingId)) {
      const dup = state.assignments.find(a => a.subject_id === state.subjectId && a.section_id === state.sectionId && a.semester_id === state.semesterId && a.id !== state.editingId);
      toast({
        variant: "destructive",
        title: "Duplicate Assignment",
        description: `Subject "${dup?.subject || ''}" is already assigned to Section ${dup?.section || ''}, Semester ${dup?.semester || ''}. Only one faculty can be assigned.`,
      });
      return;
    }

    if (hasDuplicateFaculty(state.facultyId, state.subjectId, state.sectionId, state.semesterId, state.editingId)) {
      const dupF = state.assignments.find(a => a.faculty_id === state.facultyId && a.subject_id === state.subjectId && a.section_id === state.sectionId && a.semester_id === state.semesterId && a.id !== state.editingId);
      const facultyName = buildFacultyName(state.facultyId);
      toast({
        variant: "destructive",
        title: "Duplicate Faculty Assignment",
        description: `${facultyName} is already assigned to ${dupF?.subject || ''} - Section ${dupF?.section || ''}, Semester ${dupF?.semester || ''}.`,
      });
      return;
    }

    // ✅ Proceed if no duplicates
    const isEditing = !!state.editingId;
    const originalAssignments = [...state.assignments];
    const originalFormState = {
      facultyId: state.facultyId,
      subjectId: state.subjectId,
      sectionId: state.sectionId,
      semesterId: state.semesterId,
      editingId: state.editingId,
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    if (isEditing) applyOptimisticEdit(); else applyOptimisticCreate(tempId);

    // Clear form optimistically and show success toast
    resetForm();
    toast({ title: isEditing ? "Updated" : "Success", description: isEditing ? "Assignment updated successfully" : "Faculty assigned successfully", className: "bg-green-100 text-green-800" });

    const data: ManageFacultyAssignmentsRequest = {
      action: isEditing ? "update" : "create",
      assignment_id: state.editingId,
      faculty_id: originalFormState.facultyId,
      subject_id: originalFormState.subjectId,
      semester_id: originalFormState.semesterId,
      section_id: originalFormState.sectionId,
      branch_id: state.branchId,
    };

    if (isEditing) {
      await saveUpdateAssignment(data, originalAssignments, originalFormState as FormState);
    } else {
      await saveCreateAssignment(data, originalAssignments, originalFormState as FormState);
    }
  };

  const handleEdit = (assignment: Assignment) => {
    updateState({
      editingId: assignment.id,
      facultyId: assignment.faculty_id,
      subjectId: assignment.subject_id,
      sectionId: assignment.section_id,
      semesterId: assignment.semester_id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!state.deleteId || !state.branchId) return;

    // Store original state for potential reversion
    const originalAssignments = [...state.assignments];

    // Optimistic update: remove assignment from list
    const updatedAssignments = state.assignments.filter(a => a.id !== state.deleteId);
    updateState({ assignments: updatedAssignments });

    // Close modal optimistically
    updateState({ deleteId: null, openDeleteModal: false });

    // Show success toast optimistically
    toast({
      title: "Deleted",
      description: "Assignment deleted successfully",
      className: "bg-green-100 text-green-800",
    });

    updateState({ loading: true });

    try {
      const data: ManageFacultyAssignmentsRequest = {
        action: "delete",
        assignment_id: state.deleteId,
        branch_id: state.branchId,
      };
      const response = await manageFacultyAssignments(data, "POST");
      if (response.success) {
        // Deletion succeeded on server; we already removed it optimistically
      } else {
        throw new Error(response.message || "Failed to delete assignment");
      }
    } catch (err) {
      // Revert optimistic changes
      updateState({ assignments: originalAssignments });

      if (isErrorWithMessage(err)) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      } else {
        const errorMessage = "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    } finally {
      updateState({ loading: false });
    }
  };

  const filteredAssignments = state.assignments;
  const facultyMap = state.faculties.reduce((acc, f) => {
    acc[f.id] = {
      name: `${f.first_name} ${f.last_name || ""}`.trim(),
      email: f.username,
    };
    return acc;
  }, {} as Record<string, { name: string; email: string }>);


  return (
    <ErrorBoundary>
      <div className={` space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{state.editingId ? "Edit Faculty Assignment" : "Add Faculty Assignment"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch
                <Select
                  value={state.selectedBranchForFaculty}
                  onValueChange={(value) => updateState({ selectedBranchForFaculty: value, facultyPage: 1, facultyId: "" })}
                  disabled={state.loading || state.isAssigning || state.allBranches.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.allBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </label>
              </div>
              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty
                <Select
                  value={state.facultyId}
                  onValueChange={(value) => updateState({ facultyId: value })}
                  disabled={state.loading || state.isAssigning || !state.selectedBranchForFaculty}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={state.loadingFaculties ? "Loading..." : "Select Faculty"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <div className="px-3 py-2 border-b border-border sticky top-0 bg-inherit z-10">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search faculty..."
                          value={state.facultySearch}
                          onChange={(e) => updateState({ facultySearch: e.target.value, facultyPage: 1 })}
                          onKeyDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className={`w-full pl-8 pr-2 py-1.5 text-sm rounded border ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {state.loadingFaculties ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                      ) : state.faculties.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No faculty found</div>
                      ) : (
                        state.faculties.map((faculty) => (
                          <SelectItem key={faculty.id} value={faculty.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                            {faculty.first_name} {faculty.last_name || ""} ({faculty.username})
                          </SelectItem>
                        ))
                      )}
                    </div>
                    {state.facultyTotalPages > 1 && (
                      <div className="px-2 py-2 border-t border-border flex items-center justify-between sticky bottom-0 bg-inherit z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (state.facultyPage > 1) updateState({ facultyPage: state.facultyPage - 1 });
                          }}
                          disabled={state.facultyPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {state.facultyPage} of {state.facultyTotalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (state.facultyPage < state.facultyTotalPages) updateState({ facultyPage: state.facultyPage + 1 });
                          }}
                          disabled={state.facultyPage === state.facultyTotalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                </label>
              </div>
              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester
                <Select
                  value={state.semesterId}
                  onValueChange={(value) => updateState({ semesterId: value, subjectId: "", sectionId: "" })}
                  disabled={state.loading || state.isAssigning || state.semesters.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={state.semesters.length === 0 ? "No semesters available" : "Select Semester"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        Semester {semester.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </label>
              </div>
              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course
                <Select
                  value={state.subjectId}
                  onValueChange={(value) => updateState({ subjectId: value })}
                  disabled={state.loading || state.isAssigning || !state.semesterId || state.subjects.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={state.subjects.length === 0 ? "No subjects available" : "Select Subject"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.subjects
                      .map((subject) => (
                        <SelectItem key={subject.id} value={subject.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                          {subject.name} ({subject.subject_code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                </label>
              </div>
              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section
                <Select
                  value={state.sectionId}
                  onValueChange={(value) => updateState({ sectionId: value })}
                  disabled={state.loading || state.isAssigning || !state.semesterId || state.sections.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={state.sections.length === 0 ? "No sections available" : "Select Section"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.sections
                      .map((section) => (
                        <SelectItem key={section.id} value={section.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                          Section {section.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {(state.facultyId || state.subjectId || state.sectionId || state.semesterId || state.editingId) && (
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={state.loading || state.isAssigning}
                  className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-900 bg-white border-gray-300 hover:bg-gray-100'}
                >
                  Cancel
                </Button>

              )}
              <Button
                onClick={handleAssignFaculty}
                disabled={state.loading || state.isAssigning}
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              >
                {(() => {
                  const loading = state.isAssigning;
                  let label = "+ Assign Faculty";
                  if (state.editingId) label = "Update Assignment";
                  if (loading) label = state.editingId ? "Updating..." : "Assigning...";
                  return loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {label}
                    </>
                  ) : label;
                })()}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Faculty Assignments List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  value={state.filterSemesterId || "all"}
                  onValueChange={(value) => updateState({ filterSemesterId: value === "all" ? "" : value, filterSectionId: "" })}
                  disabled={state.loading || state.semesters.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectItem value="all" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>All Semesters</SelectItem>
                    {state.semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        Semester {semester.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Select
                  value={state.filterSectionId || "all"}
                  onValueChange={(value) => updateState({ filterSectionId: value === "all" ? "" : value })}
                  disabled={state.loading || !state.filterSemesterId || state.filterSections.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectItem value="all" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>All Sections</SelectItem>
                    {state.filterSections.map((section) => (
                      <SelectItem key={section.id} value={section.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(state.filterSemesterId || state.filterSectionId) && (
                  <Button
                    variant="ghost"
                    onClick={() => updateState({ filterSemesterId: "", filterSectionId: "" })}
                    className="bg-primary hover:bg-[#9147e0] text-white"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {(() => {
              if (state.loading) return <SkeletonTable rows={5} cols={5} />;
              if (!state.filterSemesterId || !state.filterSectionId) return <div className={`text-center py-8 border-2 border-dashed rounded-lg ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-gray-200 text-gray-500'}`}>Please select a semester and section to view assignments.</div>;
              if (filteredAssignments.length === 0) return <div className={`text-center py-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No assignments found for the selected criteria.</div>;

              return (
                <div className={`rounded-md overflow-x-auto ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                  <table className="w-full text-sm scroll-smooth">
                    <thead className={theme === 'dark' ? 'bg-card sticky top-0 z-10 border-border' : 'bg-gray-100 sticky top-0 z-10 border-gray-300'}>
                      <tr className="border-b">
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Section</th>
                        <th className="text-left p-2">Semester</th>
                        <th className="text-left p-2">Assigned Faculty</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map((assignment) => (
                        <tr
                          key={assignment.id}
                          className={`border-b ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-100'}`}
                        >
                          <td className="p-2">{assignment.subject}</td>
                          <td className="p-2">{assignment.section}</td>
                          <td className="p-2">{assignment.semester}</td>
                          <td className="p-2">
                            {facultyMap[assignment.faculty_id]?.name || assignment.faculty}
                            <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              {facultyMap[assignment.faculty_id]?.email}
                            </div>
                          </td>
                          <td className="p-2 flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-200'}
                              onClick={() => handleEdit(assignment)}
                              disabled={state.loading || state.isAssigning}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-200'}
                              onClick={() =>
                                updateState({
                                  deleteId: assignment.id,
                                  openDeleteModal: true,
                                })
                              }
                              disabled={state.loading || state.isAssigning}
                            >
                              <Trash2 className={`h-4 w-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Dialog open={state.openDeleteModal} onOpenChange={(open) => updateState({ openDeleteModal: open })}>
          <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} p-4 md:p-6 w-[92%] max-w-sm md:w-auto rounded-2xl md:rounded` }>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Delete Assignment?</DialogTitle>
              <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Are you sure you want to delete this assignment?</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-900 bg-white border-gray-300 hover:bg-gray-100'}
                onClick={() => updateState({ openDeleteModal: false })}
                disabled={state.loading || state.isAssigning}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
                disabled={state.loading || state.isAssigning}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default FacultyAssignments;