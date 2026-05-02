import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton, SkeletonTable } from "../ui/skeleton";
import { DownloadIcon, EditIcon, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../ui/use-toast";
import { getSemesters, manageSections, manageSubjects, manageFaculties, manageTimetable, manageProfile, manageFacultyAssignments, getBranches, getHODTimetableBootstrap, getHODTimetableSemesterData } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";

// Interfaces
interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: number | string; // Allow both types
}

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: number | string; // Allow both types
}

interface Faculty {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface TimetableEntry {
  id: string;
  faculty_assignment: {
    id: string;
    faculty: string;
    subject: string;
    semester: number;
    section: string;
  };
  day: string;
  start_time: string;
  end_time: string;
  room: string;
}

interface ClassDetails {
  subject: string;
  professor: string;
  room: string;
  start_time: string;
  end_time: string;
  day: string;
  timetable_id?: string;
  assignment_id?: string;
}

interface ManageTimetableRequest {
  action: "GET" | "create" | "update" | "delete" | "bulk_create";
  timetable_id?: string;
  assignment_id?: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  semester_id: string;
  section_id: string;
  branch_id: string;
}

interface ManageFacultyAssignmentsRequest {
  action?: "GET" | "create" | "update" | "delete";
  assignment_id?: string;
  faculty_id?: string;
  subject_id?: string;
  semester_id?: string;
  section_id?: string;
  branch_id: string;
}

// Define types for API responses
interface SemesterData {
  id: number;
  number: number;
}

interface SectionData {
  id: string;
  name: string;
  semester_id: number;
}

interface SubjectData {
  id: string;
  name: string;
  subject_code: string;
  semester_id: number;
}

interface FacultyData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface FacultyAssignmentData {
  id: string;
  faculty: string;
  faculty_id: string;
  faculty_name: string;
  subject: string;
  subject_id: string;
  section: string;
  section_id: string;
  semester: number;
  semester_id: string;
}

interface TimetableData {
  id: string;
  faculty_assignment: {
    id: string;
    faculty: string;
    subject: string;
    semester: number;
    section: string;
  };
  day: string;
  start_time: string;
  end_time: string;
  room: string;
}

interface HODTimetableBootstrapResponse {
  profile: {
    branch_id: string;
    branch: string;
  };
  semesters: SemesterData[];
}

interface HODTimetableSemesterDataResponse {
  sections: SectionData[];
  subjects: SubjectData[];
  faculty_assignments: FacultyAssignmentData[];
}

interface EditModalProps {
  classDetails: ClassDetails;
  onSave: (newClassDetails: ClassDetails) => void;
  onCancel: () => void;
  onDelete?: (timetableId?: string) => void;
  subjects: Subject[];
  facultyAssignments: FacultyAssignmentData[];
  semesterId: string;
  sectionId: string;
  branchId: string;
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

// Edit Modal Component
const EditModal = ({ classDetails, onSave, onCancel, onDelete, subjects, facultyAssignments, semesterId, sectionId, branchId }: EditModalProps) => {
  const { theme } = useTheme();
  const [newClassDetails, setNewClassDetails] = useState({
    subject: classDetails.subject || "",
    professor: classDetails.professor || "",
    room: classDetails.room || "",
    start_time: classDetails.start_time || "",
    end_time: classDetails.end_time || "",
  });
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchFacultyAssignment = async () => {
      if (!newClassDetails.subject || !semesterId || !sectionId) {
        setNewClassDetails((prev) => ({ ...prev, professor: "" }));
        return;
      }

      setIsLoadingAssignments(true);
      try {
        const subject = subjects.find((s: Subject) => s.name === newClassDetails.subject);
        if (!subject) {
          setNewClassDetails((prev) => ({ ...prev, professor: "" }));
          return;
        }

        // Use faculty assignments from props instead of API call
        const assignment = facultyAssignments.find(
          (a: FacultyAssignmentData) => a.subject_id === subject.id && a.semester_id === semesterId && a.section_id === sectionId
        );

        if (assignment) {
          setNewClassDetails((prev) => ({
            ...prev,
            professor: assignment.faculty_name,
          }));
        } else {
          setNewClassDetails((prev) => ({ ...prev, professor: "" }));
        }
      } catch (err) {
        console.error("Error finding faculty assignment:", err);
        setNewClassDetails((prev) => ({ ...prev, professor: "" }));
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    fetchFacultyAssignment();
  }, [newClassDetails.subject, semesterId, sectionId, subjects, facultyAssignments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewClassDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewClassDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const dayFullMap: Record<string,string> = {
    'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday'
  };

  const dayFull = dayFullMap[classDetails.day] || classDetails.day;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${theme === 'dark' ? 'bg-background/60' : 'bg-gray-900/60'} text-gray-200`}>
      <div className={`w-11/12 md:w-3/4 lg:w-1/2 p-8 rounded-lg shadow-2xl border-2 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
        <h2 className={`text-2xl md:text-3xl font-semibold mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          {classDetails.timetable_id ? "Edit Class" : "Add Class"} — {dayFull}
        </h2>

        <div className="mb-4">
          <label className={`block ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Course:</label>
          <Select value={newClassDetails.subject} onValueChange={(value) => handleSelectChange("subject", value)}>
            <SelectTrigger className={`w-full p-2 border rounded ${theme === 'dark' ? 'text-foreground bg-card border-border' : 'text-gray-900 bg-white border-gray-300'}`}>
              <SelectValue placeholder="Select Course" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              {subjects.map((subject: Subject) => (
                <SelectItem key={subject.id} value={subject.name} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground/70' : 'text-gray-600'}`}>Professor:</label>
          <div className={`w-full p-3 border rounded-lg flex items-center gap-3 transition-all duration-200 ${theme === 'dark' ? 'bg-muted/50 text-foreground border-border' : 'bg-gray-50 text-gray-900 border-gray-200'}`}>
            <User className={`w-4 h-4 ${theme === 'dark' ? 'text-primary' : 'text-primary'}`} />
            <span className="font-medium">
              {isLoadingAssignments ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                newClassDetails.professor || <span className="text-destructive/70 italic">No professor assigned</span>
              )}
            </span>
          </div>
          {!isLoadingAssignments && !newClassDetails.professor && newClassDetails.subject && (
            <p className="text-xs text-destructive mt-1">Please assign a faculty to this subject in Faculty Assignments.</p>
          )}
        </div>

        <div className="mb-4">
          <label className={`block ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Room:</label>
          <input
            type="text"
            name="room"
            value={newClassDetails.room}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${theme === 'dark' ? 'text-foreground bg-card border-border placeholder-muted-foreground' : 'text-gray-900 bg-white border-gray-300 placeholder-gray-500'}`}
            placeholder="e.g., R103"
          />
        </div>

        <div className="mb-4">
          <label className={`block ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Start Time (HH:MM):</label>
          <input
            type="text"
            name="start_time"
            value={newClassDetails.start_time}
            readOnly
            className={`w-full p-2 border rounded ${theme === 'dark' ? 'bg-muted cursor-not-allowed text-foreground' : 'bg-gray-100 cursor-not-allowed text-gray-900'}`}
            placeholder="e.g., 11:00"
          />
        </div>

        <div className="mb-4">
          <label className={`block ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>End Time (HH:MM):</label>
          <input
            type="text"
            name="end_time"
            value={newClassDetails.end_time}
            readOnly
            className={`w-full p-2 border rounded ${theme === 'dark' ? 'bg-muted cursor-not-allowed text-foreground' : 'bg-gray-100 cursor-not-allowed text-gray-900'}`}
            placeholder="e.g., 12:00"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={() => setShowConfirmDelete(true)}
              disabled={!classDetails.timetable_id}
              className={theme === 'dark' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'}
            >
              Delete
            </Button>
            {!classDetails.timetable_id && (
              <span className="text-xs text-muted-foreground">No existing class to delete</span>
            )}
          </div>
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSave({ ...newClassDetails, day: classDetails.day || "" });
              }}
              className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}
            >
              Save
            </Button>
          </div>
        </div>
        {showConfirmDelete && (
          <div className="mt-4 p-4 border rounded bg-red-50 text-red-900">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <strong>Delete class?</strong>
                <div className="text-sm">This will delete the class for {dayFull} at {newClassDetails.start_time} - {newClassDetails.end_time}.</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    onDelete && onDelete(classDetails.timetable_id);
                  }}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Timetable Component
const Timetable = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [state, setState] = useState({
    branchId: "" as string,
    branchName: "" as string,
    semesterId: "" as string,
    sectionId: "" as string,
    isEditing: false as boolean,
    selectedClass: null as ClassDetails | null,
    semesters: [] as Semester[],
    sections: [] as Section[],
    subjects: [] as Subject[],
    facultyAssignments: [] as Array<{
      id: string;
      faculty: string;
      faculty_id: string;
      faculty_name: string;
      subject: string;
      subject_id: string;
      section: string;
      section_id: string;
      semester: number;
      semester_id: string;
    }>,
    timetable: [] as TimetableEntry[],
    loading: true as boolean,
    error: null as string | null,
    sectionsCache: {} as Record<string, Section[]>,
    subjectsCache: {} as Record<string, Subject[]>,
    facultyAssignmentsCache: {} as Record<string, Array<{
      id: string;
      faculty: string;
      faculty_id: string;
      faculty_name: string;
      subject: string;
      subject_id: string;
      section: string;
      section_id: string;
      semester: number;
      semester_id: string;
    }>>,
  });

  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Predefined time slots for the grid (9:00 AM to 5:00 PM)
  const timeSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
  ];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];



  // Fetch branch ID and initial data via bootstrap
  useEffect(() => {
    const fetchProfileAndSemesters = async () => {
      updateState({ loading: true });
      try {
        const boot = await getHODTimetableBootstrap();
        if (!boot.success || !boot.data?.profile?.branch_id) {
          throw new Error(boot.message || "Failed to bootstrap timetable");
        }

        // Manually map the data instead of using strict typing
        updateState({
          branchId: boot.data.profile.branch_id,
          branchName: boot.data.profile.branch,
          semesters: boot.data.semesters.map((s: any) => ({
            id: s.id.toString(),
            number: s.number,
          })) || [],
          sections: [],
          subjects: [],
          facultyAssignments: [],
        });
      } catch (err) {
        if (isErrorWithMessage(err)) {
          updateState({ error: err.message || "Network error" });
          toast({ variant: "destructive", title: "Error", description: err.message });
        } else {
          updateState({ error: "Network error" });
          toast({ variant: "destructive", title: "Error", description: "Network error" });
        }
      } finally {
        updateState({ loading: false });
      }
    };
    fetchProfileAndSemesters();
  }, [toast]);

  // Fetch sections, subjects, and faculty assignments when semester changes
  useEffect(() => {
    const fetchSemesterData = async () => {
      if (!state.semesterId) {
        updateState({ sections: [], subjects: [], facultyAssignments: [], sectionId: "" });
        return;
      }

      // Check if we have everything in cache
      const hasCachedSections = !!state.sectionsCache[state.semesterId];
      const hasCachedSubjects = !!state.subjectsCache[state.semesterId];
      const hasCachedAssignments = !!state.facultyAssignmentsCache[state.semesterId];

      if (hasCachedSections && hasCachedSubjects && hasCachedAssignments) {
        const cachedSections = state.sectionsCache[state.semesterId];
        updateState({
          sections: cachedSections,
          subjects: state.subjectsCache[state.semesterId],
          facultyAssignments: state.facultyAssignmentsCache[state.semesterId],
          sectionId: cachedSections.length > 0 ? cachedSections[0].id : "",
        });
        return;
      }

      updateState({ loading: true });
      try {
        const semesterData = await getHODTimetableSemesterData(state.semesterId);
        if (semesterData.success && semesterData.data) {
          const sections = semesterData.data.sections || [];
          const subjects = semesterData.data.subjects || [];
          const assignments = semesterData.data.faculty_assignments || [];

          // Update caches
          const newSectionsCache = { ...state.sectionsCache, [state.semesterId]: sections };
          const newSubjectsCache = { ...state.subjectsCache, [state.semesterId]: subjects };
          const newAssignmentsCache = { ...state.facultyAssignmentsCache, [state.semesterId]: assignments };

          updateState({
            sections,
            subjects,
            facultyAssignments: assignments,
            sectionsCache: newSectionsCache,
            subjectsCache: newSubjectsCache,
            facultyAssignmentsCache: newAssignmentsCache,
            sectionId: "",
            loading: false
          });
        } else {
          updateState({ sections: [], subjects: [], facultyAssignments: [], sectionId: "", loading: false });
        }
      } catch (err) {
        console.error("Error fetching semester data:", err);
        updateState({ sections: [], subjects: [], facultyAssignments: [], sectionId: "", loading: false });
        toast({ variant: "destructive", title: "Error", description: "Failed to load semester data" });
      }
    };

    fetchSemesterData();
  }, [state.semesterId, state.branchId]);



  // Fetch timetable when section changes
  useEffect(() => {
    const fetchTimetable = async () => {
      if (!state.branchId || !state.semesterId || !state.sectionId) {
        updateState({ timetable: [] });
        return;
      }

      updateState({ loading: true });
      try {
        const timetableResponse = await manageTimetable({
          action: "GET" as const,
          branch_id: state.branchId,
          semester_id: state.semesterId,
          section_id: state.sectionId,
        });
        if (timetableResponse.success && timetableResponse.data) {
          const normalizedTimetable = Array.isArray(timetableResponse.data)
            ? timetableResponse.data.map((entry: TimetableData) => ({
              id: entry.id,
              faculty_assignment: {
                id: entry.faculty_assignment.id,
                faculty: entry.faculty_assignment.faculty,
                subject: entry.faculty_assignment.subject,
                semester: entry.faculty_assignment.semester,
                section: entry.faculty_assignment.section,
              },
              day: entry.day.toUpperCase(),
              start_time: entry.start_time,
              end_time: entry.end_time,
              room: entry.room,
            }))
            : [];
          updateState({ timetable: normalizedTimetable });
          console.log("Fetched timetable:", normalizedTimetable);
        } else {
          updateState({ timetable: [] });
          console.log("No timetable data received:", timetableResponse);
        }
      } catch (err) {
        if (isErrorWithMessage(err)) {
          updateState({ error: err.message || "Network error" });
          toast({ variant: "destructive", title: "Error", description: err.message });
        } else {
          updateState({ error: "Network error" });
          toast({ variant: "destructive", title: "Error", description: "Network error" });
        }
      } finally {
        updateState({ loading: false });
      }
    };

    fetchTimetable();
  }, [state.branchId, state.semesterId, state.sectionId, toast]);

  // Generate table data for the grid
  const getTableData = () => {
    const timetable = Array.isArray(state.timetable) ? state.timetable : [];
    const tableData = timeSlots.map(({ start, end }) => {
      const row: Record<string, string> = { time: `${start}-${end}` };
      days.forEach((day) => {
        const entry = timetable.find(
          (e) => e.start_time === start && e.end_time === end && e.day === day
        );
        row[day.toLowerCase()] = entry
          ? `${entry.faculty_assignment.subject}\n${entry.faculty_assignment.faculty}\n${entry.room}`
          : "";
      });
      return row;
    });
    console.log("Table data:", tableData);
    return tableData;
  };

  const handleEdit = () => {
    if (!state.semesterId || !state.sectionId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a semester and section to edit" });
      return;
    }
    updateState({ isEditing: !state.isEditing });
  };

  const handleClassClick = (time: string, day: string) => {
    if (!state.isEditing) return;
    const [start_time, end_time] = time.split("-");
    const entry = state.timetable.find(
      (e) => e.start_time === start_time && e.end_time === end_time && e.day === day.toUpperCase()
    );
    if (entry) {
      updateState({
        selectedClass: {
          subject: entry.faculty_assignment.subject,
          professor: entry.faculty_assignment.faculty,
          room: entry.room,
          start_time: entry.start_time,
          end_time: entry.end_time,
          day: entry.day,
          timetable_id: entry.id,
          assignment_id: entry.faculty_assignment.id,
        },
      });
    } else {
      updateState({
        selectedClass: {
          subject: "",
          professor: "",
          room: "",
          start_time,
          end_time,
          day: day.toUpperCase(),
        },
      });
    }
  };

  const handleSaveClass = async (newClassDetails: ClassDetails) => {
    try {
      if (!state.semesterId || !state.sectionId) {
        throw new Error("Semester and section must be selected");
      }

      const subject = state.subjects.find((s) => s.name === newClassDetails.subject);
      if (!subject) {
        throw new Error("Invalid subject selected");
      }

      const assignment = state.facultyAssignments.find(
        (a) => a.subject_id === subject.id && a.semester_id === state.semesterId && a.section_id === state.sectionId
      );

      if (!assignment) {
        throw new Error(`No faculty assigned to "${subject.name}" for this semester and section. Please assign a faculty first.`);
      }

      const assignmentId = assignment.id;

      const timetableRequest: ManageTimetableRequest = {
        action: state.selectedClass?.timetable_id ? "update" : "create",
        timetable_id: state.selectedClass?.timetable_id,
        assignment_id: assignmentId,
        day: state.selectedClass!.day,
        start_time: newClassDetails.start_time,
        end_time: newClassDetails.end_time,
        room: newClassDetails.room,
        branch_id: state.branchId,
        semester_id: state.semesterId,
        section_id: state.sectionId,
      };

      const response = await manageTimetable(timetableRequest);
      if (response.success) {
        // Reconcile optimistic UI using server response without refetch
        const timetableId = response.data?.timetable_id as string | undefined;
        const day = state.selectedClass?.day || timetableRequest.day;
        const start_time = timetableRequest.start_time;
        const end_time = timetableRequest.end_time;
        const room = timetableRequest.room || "";

        // Build faculty_assignment details from local cache
        const assignment = state.facultyAssignments.find(a => a.id === timetableRequest.assignment_id);
        const facultyAssignment = assignment
          ? {
              id: assignment.id,
              faculty: assignment.faculty,
              subject: assignment.subject,
              semester: assignment.semester,
              section: assignment.section,
            }
          : { id: timetableRequest.assignment_id || "", faculty: "", subject: "", semester: 0, section: "" };

        if (timetableRequest.action === 'create') {
          const newEntry = {
            id: timetableId || `temp-${Date.now()}`,
            faculty_assignment: facultyAssignment,
            day: day.toUpperCase(),
            start_time,
            end_time,
            room,
          };
          updateState({ timetable: [...state.timetable, newEntry], selectedClass: null });
          toast({ title: "Success", description: "Timetable created" });
        } else {
          // update
          if (timetableId) {
            const updated = state.timetable.map((e) => (e.id === timetableId || e.id === state.selectedClass?.timetable_id)
              ? { ...e, faculty_assignment: facultyAssignment, day: day.toUpperCase(), start_time, end_time, room }
              : e
            );
            updateState({ timetable: updated, selectedClass: null });
            toast({ title: "Success", description: "Timetable updated successfully" });
          }
        }
      } else {
        throw new Error(response.message || "Failed to save timetable");
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unknown error occurred",
        });
      }
    }
  };

  const handleDeleteClass = async (timetableId?: string) => {
    if (!timetableId) return;
    try {
      updateState({ loading: true });
      const response = await manageTimetable({ action: 'delete', timetable_id: timetableId, branch_id: state.branchId });
      if (response.success) {
        const filtered = state.timetable.filter((e) => e.id !== timetableId);
        updateState({ timetable: filtered, selectedClass: null });
        toast({ title: 'Deleted', description: 'Class deleted successfully' });
      } else {
        throw new Error(response.message || 'Failed to delete class');
      }
    } catch (err) {
      console.error('Delete class error:', err);
      toast({ variant: 'destructive', title: 'Error', description: (isErrorWithMessage(err) ? err.message : 'Network error') });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleCancelEdit = () => {
    updateState({ selectedClass: null });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);

    const branchName = state.branchName || "Branch";
    const semesterNumber =
      state.semesters.find((s) => s.id === state.semesterId)?.number || "Semester";
    const sectionName =
      state.sections.find((s) => s.id === state.sectionId)?.name || "Section";

    const title =
      state.semesterId && state.sectionId && state.branchId
        ? `${branchName} - ${semesterNumber} Semester - Section ${sectionName} Timetable`
        : "Timetable";

    doc.text(title, 10, 15);

    const headers = ["Time/Day", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const tableData = getTableData();

    autoTable(doc, {
      head: [headers],
      body: tableData.map((row) => [
        row.time,
        row.mon || "",
        row.tue || "",
        row.wed || "",
        row.thu || "",
        row.fri || "",
        row.sat || "",
      ]),
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
      },
    });

    // ✅ Save as (branch-semester-section).pdf
    const safeBranch = branchName.replace(/\s+/g, "_");
    doc.save(`${safeBranch}-${semesterNumber}-${sectionName}.pdf`);
  };



  if (state.loading && state.timetable.length === 0) {
    return (
      <div className="bg-background text-foreground p-6">
        <SkeletonTable rows={10} cols={7} />
      </div>
    );
  }

  if (state.error) {
    return <div className="text-center py-6 text-red-500">{state.error}</div>;
  }

  return (
    <div className="bg-background text-foreground">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between bg-card px-4 py-3 rounded-t-md">
          <CardTitle className="text-2xl font-semibold text-foreground">Timetable</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              onClick={handleExportPDF}
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Export PDF</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              onClick={handleEdit}
            >
              <EditIcon className="w-4 h-4" /> {state.isEditing ? "Save Edit" : "Edit"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="bg-card">
          <div className="border border-border rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
              <div className="flex flex-col sm:flex-row md:flex-row gap-2 sm:gap-4 w-full md:flex-1 md:items-center md:flex-nowrap">
                <div className="w-full sm:w-auto md:flex-none">
                  <Select
                    value={state.semesterId}
                    onValueChange={(value) =>
                      updateState({ semesterId: value, sectionId: "", timetable: [] })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-40 md:w-48 bg-card text-foreground border-border">
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-foreground border-border">
                      {state.semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id} className="text-foreground">
                          {semester.number} Semester
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto md:flex-none">
                  <Select
                    value={state.sectionId}
                    onValueChange={(value) => updateState({ sectionId: value, timetable: [] })}
                    disabled={!state.semesterId}
                  >
                    <SelectTrigger className="w-full sm:w-40 md:w-48 bg-card text-foreground border-border">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-foreground border-border">
                      {state.sections.map((section) => (
                        <SelectItem key={section.id} value={section.id} className="text-foreground">
                          Section {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2 md:mt-0 md:ml-4 md:whitespace-nowrap md:flex-none">
                {state.semesterId && state.sectionId
                  ? `${state.semesters.find((s) => s.id === state.semesterId)?.number} Semester - Section ${state.sections.find((s) => s.id === state.sectionId)?.name
                  }`
                  : "Select Semester and Section"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-foreground">
                  <tr>
                    <th className="py-2 px-4 font-semibold">Time/Day</th>
                    <th className="py-2 px-4 font-semibold">Monday</th>
                    <th className="py-2 px-4 font-semibold">Tuesday</th>
                    <th className="py-2 px-4 font-semibold">Wednesday</th>
                    <th className="py-2 px-4 font-semibold">Thursday</th>
                    <th className="py-2 px-4 font-semibold">Friday</th>
                    <th className="py-2 px-4 font-semibold">Saturday</th>
                  </tr>
                </thead>
                <tbody>
                  {getTableData().map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-accent border-border">
                      <td className="py-3 px-4 font-medium text-foreground">{row.time}</td>
                      {["mon", "tue", "wed", "thu", "fri", "sat"].map((day, i) => (
                        <td
                          key={i}
                          className="py-3 px-4 whitespace-pre-line text-foreground cursor-pointer"
                          onClick={() => handleClassClick(row.time, day.toUpperCase())}
                        >
                          {row[day] ? (
                            <>
                              <span className="font-semibold">{row[day].split("\n")[0]}</span>
                              <br />
                              {row[day].split("\n")[1]}
                              <br />
                              {row[day].split("\n")[2]}
                            </>
                          ) : (
                            state.isEditing && <span className="text-muted-foreground">Click to add</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {state.isEditing && state.selectedClass && (
        <EditModal
          classDetails={state.selectedClass}
          onSave={handleSaveClass}
          onCancel={handleCancelEdit}
          onDelete={handleDeleteClass}
          subjects={state.subjects}
          facultyAssignments={state.facultyAssignments}
          semesterId={state.semesterId}
          sectionId={state.sectionId}
          branchId={state.branchId}
        />
      )}
    </div>
  );
};

export default Timetable;