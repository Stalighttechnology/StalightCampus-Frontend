import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton, SkeletonTable } from "../ui/skeleton";
import { DownloadIcon, EditIcon, User, Calendar, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "../ui/use-toast";
import { getSemesters, manageSections, manageSubjects, manageFaculties, manageTimetable, manageProfile, manageFacultyAssignments, getBranches, getHODTimetableBootstrap, getHODTimetableSemesterData } from "../../utils/hod_api";
import { showWarningAlert } from "../../utils/sweetalert";
import { useTheme } from "../../context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";

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
  subject_type?: string;
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
  isGroup?: boolean;
  subject_type?: string;
}

interface ManageTimetableRequest {
  action: "GET" | "create" | "update" | "delete" | "bulk_create" | "create_group" | "delete_group";
  timetable_id?: string;
  assignment_id?: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  semester_id: string;
  section_id: string;
  branch_id: string;
  subject_type?: string;
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
    subject_type?: string;
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
    typeof (error as Record<string, unknown>).message === 'string');

}

const formatTo12h = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "—";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hh = parseInt(parts[0], 10);
  const mm = parts[1];
  if (isNaN(hh)) return timeStr;
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  const hhStr = hh.toString().padStart(2, "0");
  return `${hhStr}:${mm} ${ampm}`;
};

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  labelClass?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, labelClass }) => {
  const [h24Str, minute] = (value || "08:00").split(":");
  let h24 = parseInt(h24Str, 10);
  if (isNaN(h24)) h24 = 8;
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hour12Str = h12.toString().padStart(2, "0");

  const to24h = (h12Val: string, minVal: string, periodVal: string) => {
    let h = parseInt(h12Val, 10);
    if (periodVal === "PM") {
      if (h < 12) h += 12;
    } else {
      if (h === 12) h = 0;
    }
    const h24Val = h.toString().padStart(2, "0");
    return `${h24Val}:${minVal}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const periods = ["AM", "PM"];

  return (
    <div className="w-full">
      <label className={labelClass || "block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"}>{label}</label>
      <div className="flex gap-2 items-center w-full flex-nowrap">
        <Select value={hour12Str} onValueChange={h => onChange(to24h(h, minute, period))}>
          <SelectTrigger className="flex-1 h-10 border rounded-lg focus:ring-1 focus:ring-primary bg-background text-foreground px-2 text-xs">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] z-[10001] bg-card border-border text-foreground overflow-y-auto custom-scrollbar">
            {hours.map(h => (
              <SelectItem key={h} value={h} className="text-foreground">{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-bold opacity-60">:</span>
        <Select value={minute} onValueChange={m => onChange(to24h(hour12Str, m, period))}>
          <SelectTrigger className="flex-1 h-10 border rounded-lg focus:ring-1 focus:ring-primary bg-background text-foreground px-2 text-xs">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] z-[10001] bg-card border-border text-foreground overflow-y-auto custom-scrollbar">
            {minutes.map(m => (
              <SelectItem key={m} value={m} className="text-foreground">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={p => onChange(to24h(hour12Str, minute, p))}>
          <SelectTrigger className="w-[68px] h-10 border rounded-lg focus:ring-1 focus:ring-primary bg-background text-foreground px-2 text-xs">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent className="z-[10001] bg-card border-border text-foreground">
            {periods.map(p => (
              <SelectItem key={p} value={p} className="text-foreground">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Edit Modal Component
const EditModal = ({ classDetails, onSave, onCancel, onDelete, subjects, facultyAssignments, semesterId, sectionId, branchId }: EditModalProps) => {
  const { theme } = useTheme();
  const [newClassDetails, setNewClassDetails] = useState({
    subject: classDetails.subject || "",
    professor: classDetails.professor || "",
    room: classDetails.room || "",
    start_time: classDetails.start_time || "",
    end_time: classDetails.end_time || ""
  });
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [matchingAssignments, setMatchingAssignments] = useState<FacultyAssignmentData[]>([]);

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
        const assignments = facultyAssignments.filter(
          (a: FacultyAssignmentData) => String(a.subject_id) === String(subject.id) && String(a.semester_id) === String(semesterId) && String(a.section_id) === String(sectionId)
        );

        setMatchingAssignments(assignments);

        if (assignments.length === 1) {
          setNewClassDetails((prev) => ({
            ...prev,
            professor: (assignments[0] as any).faculty_name || (assignments[0] as any).faculty || ""
          }));
        } else if (assignments.length > 1) {
          // Keep existing if it matches one of the new assignments, else clear
          setNewClassDetails((prev) => {
            const currentProf = prev.professor;
            const stillValid = assignments.some(a => ((a as any).faculty_name || (a as any).faculty) === currentProf);
            return { ...prev, professor: stillValid ? currentProf : "" };
          });
        } else {
          setNewClassDetails((prev) => ({ ...prev, professor: "" }));
        }
      } catch (err) {
        setNewClassDetails((prev) => ({ ...prev, professor: "" }));
        setMatchingAssignments([]);
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
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewClassDetails((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const dayFullMap: Record<string, string> = {
    'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday'
  };

  const dayFull = dayFullMap[classDetails.day] || classDetails.day;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${theme === 'dark' ? 'bg-background/60' : 'bg-gray-900/60'} text-gray-200`}>
      <div className={`w-[90%] sm:w-[420px] max-h-[85vh] overflow-y-auto custom-scrollbar p-6 md:p-8 rounded-lg shadow-2xl border-2 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
        <h2 className={`text-2xl md:text-3xl font-semibold mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          {classDetails.timetable_id ? "Edit Class" : "Add Class"} — {dayFull}
        </h2>

        <div className="mb-4">
          <label className={`block ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Course:</label>
          <Select value={newClassDetails.subject} onValueChange={(value) => handleSelectChange("subject", value)}>
            <SelectTrigger className={`w-full p-2 border rounded ${theme === 'dark' ? 'text-foreground bg-card border-border' : 'text-gray-900 bg-white border-gray-300'}`}>
              <SelectValue placeholder="Select Course" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
              {subjects.length === 0 ? (
                <SelectItem value="no_course" disabled className="text-center text-xs text-muted-foreground">
                  No courses available
                </SelectItem>
              ) : (
                <>
                  {subjects.filter((s: Subject) => s.subject_type !== 'elective' && s.subject_type !== 'open_elective').map((subject: Subject) =>
                    <SelectItem key={subject.id} value={subject.name} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                      {subject.name}
                    </SelectItem>
                  )}
                  {subjects.some((s: Subject) => s.subject_type === 'elective') && (
                    <SelectItem value="Elective Subjects" className={theme === 'dark' ? 'text-foreground font-semibold' : 'text-gray-900 font-semibold'}>
                      Elective Subjects (Group)
                    </SelectItem>
                  )}
                  {subjects.some((s: Subject) => s.subject_type === 'open_elective') && (
                    <SelectItem value="Open Elective Subjects" className={theme === 'dark' ? 'text-foreground font-semibold' : 'text-gray-900 font-semibold'}>
                      Open Elective Subjects (Group)
                    </SelectItem>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {!(newClassDetails.subject === 'Elective Subjects' || newClassDetails.subject === 'Open Elective Subjects') && (
          <>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground/70' : 'text-gray-600'}`}>Professor:</label>
              {matchingAssignments.length > 1 ? (
                <Select value={newClassDetails.professor} onValueChange={(value) => handleSelectChange("professor", value)}>
                  <SelectTrigger className={`w-full p-2 border rounded ${theme === 'dark' ? 'text-foreground bg-card border-border' : 'text-gray-900 bg-white border-gray-300'}`}>
                    <SelectValue placeholder="Select Professor" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                    {matchingAssignments.map((a: any) => {
                      const profName = a.faculty_name || a.faculty || "";
                      return (
                        <SelectItem key={a.id} value={profName} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                          {profName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className={`w-full p-3 border rounded-lg flex items-center gap-3 transition-all duration-200 ${theme === 'dark' ? 'bg-muted/50 text-foreground border-border' : 'bg-gray-50 text-gray-900 border-gray-200'}`}>
                  <User className={`w-4 h-4 ${theme === 'dark' ? 'text-primary' : 'text-primary'}`} />
                  <span className="font-medium">
                    {isLoadingAssignments ? (
                      <Skeleton className="h-4 w-32" />
                    ) : newClassDetails.professor ? (
                      newClassDetails.professor
                    ) : (
                      <span className="text-destructive/70 italic">No professor assigned</span>
                    )}
                  </span>
                </div>
              )}
              {!isLoadingAssignments && !newClassDetails.professor && newClassDetails.subject &&
                <p className="text-xs text-destructive mt-1">Please assign a faculty to this subject in Faculty Assignments.</p>
              }
            </div>

            <div className="mb-4">
              <label className={`block ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Room:</label>
              <input
                type="text"
                name="room"
                value={newClassDetails.room}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${theme === 'dark' ? 'text-foreground bg-card border-border placeholder-muted-foreground' : 'text-gray-900 bg-white border-gray-300 placeholder-gray-500'}`}
                placeholder="e.g., R103" />
            </div>
          </>
        )}

        <div className="mb-4">
          <TimePicker
            label="Start Time:"
            value={newClassDetails.start_time || "09:00"}
            onChange={(val) => setNewClassDetails((prev) => ({ ...prev, start_time: val }))}
          />
        </div>

        <div className="mb-4">
          <TimePicker
            label="End Time:"
            value={newClassDetails.end_time || "10:00"}
            onChange={(val) => setNewClassDetails((prev) => ({ ...prev, end_time: val }))}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {classDetails.timetable_id && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirmDelete(true)}
                className={theme === 'dark' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}
              onClick={onCancel}>
              
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!newClassDetails.start_time || !newClassDetails.end_time) {
                  await showWarningAlert("Missing Fields", "Please enter both start and end times.");
                  return;
                }
                if (newClassDetails.start_time >= newClassDetails.end_time) {
                  await showWarningAlert("Invalid Time", "Start time must be before end time.");
                  return;
                }
                const isGroup = newClassDetails.subject === 'Elective Subjects' || newClassDetails.subject === 'Open Elective Subjects';
                if (!isGroup && !newClassDetails.professor) {
                  await showWarningAlert("No Professor", "Please select a professor before saving.");
                  return;
                }
                onSave({
                  ...newClassDetails,
                  isGroup,
                  subject_type: newClassDetails.subject === 'Elective Subjects' ? 'elective' : (newClassDetails.subject === 'Open Elective Subjects' ? 'open_elective' : undefined),
                  day: classDetails.day || "",
                  timetable_id: classDetails.timetable_id
                });
              }}
              className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent bg-primary text-white hover:bg-primary/90 hover:text-white' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100 bg-primary text-white hover:bg-primary/90 hover:text-white'}>
              
              Save
            </Button>
          </div>
        </div>
        {showConfirmDelete &&
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
                }}>
                
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>);

};

// Main Timetable Component
const Timetable = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
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
    }>>
  });

  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Predefined time slots for the grid (9:00 AM to 5:00 PM)
  // Reference hours for the vertical axis
  const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

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
            number: s.number
          })) || [],
          sections: [],
          subjects: [],
          facultyAssignments: []
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

  // Fetch sections only when semester changes. Subjects and assignments are loaded lazily when editing.
  useEffect(() => {
    const fetchSections = async () => {
      if (!state.semesterId) {
        updateState({ sections: [], sectionId: "" });
        return;
      }

      const hasCachedSections = !!state.sectionsCache[state.semesterId];
      if (hasCachedSections) {
        updateState({ sections: state.sectionsCache[state.semesterId], sectionId: "" });
        return;
      }

      updateState({ loading: true });
      try {
        // Use manageSections to fetch only sections for the semester
        const res = await manageSections({ branch_id: state.branchId, semester_id: state.semesterId });
        if (res && res.success && res.data) {
          const sections = res.data as SectionData[];
          const newSectionsCache = { ...state.sectionsCache, [state.semesterId]: sections };
          updateState({ sections, sectionsCache: newSectionsCache, sectionId: "", loading: false });
        } else {
          updateState({ sections: [], sectionId: "", loading: false });
        }
      } catch (err) {

        updateState({ sections: [], sectionId: "", loading: false });
        toast({ variant: "destructive", title: "Error", description: "Failed to load sections" });
      }
    };

    fetchSections();
  }, [state.semesterId, state.branchId]);

  // When user opens Edit modal, lazily load subjects and faculty assignments for the semester if not cached
  useEffect(() => {
    const fetchSubjectsAndAssignments = async () => {
      if (!state.isEditing || !state.selectedClass || !state.semesterId) return;

      const hasSubjects = !!state.subjectsCache[state.semesterId];
      const hasAssignments = !!state.facultyAssignmentsCache[state.semesterId];
      if (hasSubjects && hasAssignments) {
        updateState({ subjects: state.subjectsCache[state.semesterId], facultyAssignments: state.facultyAssignmentsCache[state.semesterId] });
        return;
      }

      updateState({ loading: true });
      try {
        // Fetch subjects for the semester
        const subjectsRes = await manageSubjects({ branch_id: state.branchId, semester_id: state.semesterId });
        const assignmentsRes = await manageFacultyAssignments({ branch_id: state.branchId, semester_id: state.semesterId });

        const subjects = subjectsRes && subjectsRes.success && subjectsRes.data ? subjectsRes.data : [];
        // Normalize assignments: some endpoints return { data: { assignments: [...] } }
        let assignments: any = [];
        if (assignmentsRes && assignmentsRes.success && assignmentsRes.data) {
          if (Array.isArray(assignmentsRes.data)) assignments = assignmentsRes.data;else
          if ((assignmentsRes.data as any).assignments) assignments = (assignmentsRes.data as any).assignments;else
          assignments = assignmentsRes.data;
        } else {
          assignments = [];
        }

        const newSubjectsCache = { ...state.subjectsCache, [state.semesterId]: subjects };
        const newAssignmentsCache = { ...state.facultyAssignmentsCache, [state.semesterId]: assignments };

        updateState({ subjects, facultyAssignments: assignments, subjectsCache: newSubjectsCache, facultyAssignmentsCache: newAssignmentsCache, loading: false });
      } catch (err) {

        updateState({ subjects: [], facultyAssignments: [], loading: false });
        toast({ variant: "destructive", title: "Error", description: "Failed to load subjects or faculty assignments" });
      }
    };

    fetchSubjectsAndAssignments();
  }, [state.isEditing, state.selectedClass, state.semesterId, state.branchId, state.subjectsCache, state.facultyAssignmentsCache]);



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
          section_id: state.sectionId
        });
        if (timetableResponse.success && timetableResponse.data) {
          const normalizedTimetable = Array.isArray(timetableResponse.data) ?
          timetableResponse.data.map((entry: TimetableData) => ({
            id: entry.id,
            faculty_assignment: {
              id: entry.faculty_assignment.id,
              faculty: entry.faculty_assignment.faculty,
              subject: entry.faculty_assignment.subject,
              subject_type: (entry.faculty_assignment as any).subject_type,
              semester: entry.faculty_assignment.semester,
              section: entry.faculty_assignment.section
            },
            day: entry.day.toUpperCase(),
            start_time: entry.start_time,
            end_time: entry.end_time,
            room: entry.room
          })) :
          [];
          updateState({ timetable: normalizedTimetable });

        } else {
          updateState({ timetable: [] });

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
  // Generate table data for the grid
  const getTableData = () => {
    const timetable = Array.isArray(state.timetable) ? state.timetable : [];
    const tableData = timeSlots.map((hour) => {
      const row: Record<string, any> = { time: hour };
      days.forEach((day) => {
        // Find entries that start within this hour (e.g., 10:00 to 10:59)
        const entries = timetable.filter(
          (e) => e.start_time.startsWith(hour.split(":")[0]) && e.day === day
        );
        const groupedEntries: any[] = [];
        const electiveGroups: Record<string, any> = {};

        entries.forEach((e) => {
          const type = (e.faculty_assignment as any).subject_type;
          if (type === 'elective' || type === 'open_elective') {
            const key = `${e.start_time}-${e.end_time}-${type}`;
            if (!electiveGroups[key]) {
              electiveGroups[key] = {
                id: `group-${e.id}`,
                isGroup: true,
                subject_type: type,
                start_time: e.start_time,
                end_time: e.end_time,
                day: e.day,
                faculty_assignment: {
                  subject: type === 'elective' ? 'Elective Subjects' : 'Open Elective Subjects',
                  faculty: 'Multiple Professors',
                  subject_type: type,
                  id: 'group_assignment_id'
                },
                room: 'Multiple Rooms',
                timetable_id: e.id // keep one id just in case, though delete uses subject_type
              };
              groupedEntries.push(electiveGroups[key]);
            }
          } else {
            groupedEntries.push(e);
          }
        });

        row[day.toLowerCase()] = groupedEntries;
      });
      return row;
    });
    return tableData;
  };

  const handleEdit = () => {
    if (!state.semesterId || !state.sectionId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a semester and section to edit" });
      return;
    }
    updateState({ isEditing: !state.isEditing });
  };

  const handleClassClick = (time: string, day: string, existingEntry?: any) => {
    if (!state.isEditing) return;

    if (existingEntry) {
      updateState({
        selectedClass: {
          subject: existingEntry.faculty_assignment.subject,
          professor: existingEntry.faculty_assignment.faculty,
          room: existingEntry.room,
          start_time: existingEntry.start_time,
          end_time: existingEntry.end_time,
          day: existingEntry.day,
          timetable_id: existingEntry.id,
          assignment_id: existingEntry.faculty_assignment.id
        }
      });
    } else {
      // For new class, default to 1 hour duration starting at the clicked hour
      const [hour, min] = time.split(":");
      const start_time = `${hour}:${min}`;
      const end_time = `${String(Number(hour) + 1).padStart(2, '0')}:${min}`;

      updateState({
        selectedClass: {
          subject: "",
          professor: "",
          room: "",
          start_time,
          end_time,
          day: day.toUpperCase()
        }
      });
    }
  };

  const handleSaveClass = async (newClassDetails: ClassDetails) => {
    try {
      if (!state.semesterId || !state.sectionId) {
        throw new Error("Semester and section must be selected");
      }

      let assignmentId = "";
      if (newClassDetails.isGroup) {
         const hasAssignments = state.facultyAssignments.some((a: any) => a.subject_type === newClassDetails.subject_type && a.semester_id === state.semesterId && a.section_id === state.sectionId);
         if (!hasAssignments) {
            throw new Error(`No faculty assigned to any ${newClassDetails.subject_type === 'elective' ? 'Elective' : 'Open Elective'} subject for this section. Please assign a faculty first.`);
         }
      } else {
        const subject = state.subjects.find((s) => s.name === newClassDetails.subject);
        if (!subject) {
          throw new Error("Invalid subject selected");
        }
        
        const assignment = state.facultyAssignments.find(
          (a) => a.subject_id === subject.id && a.semester_id === state.semesterId && a.section_id === state.sectionId && (a.faculty_name === newClassDetails.professor || a.faculty === newClassDetails.professor)
        );

        if (!assignment) {
          throw new Error(`No faculty assigned to "${subject.name}" for this semester and section. Please assign a faculty first.`);
        }
        assignmentId = assignment.id;
      }

      const timetableRequest: ManageTimetableRequest = {
        action: newClassDetails.isGroup ? "create_group" : (newClassDetails.timetable_id ? "update" : "create"),
        timetable_id: newClassDetails.timetable_id,
        assignment_id: assignmentId,
        subject_type: newClassDetails.subject_type,
        day: state.selectedClass!.day,
        start_time: newClassDetails.start_time,
        end_time: newClassDetails.end_time,
        room: newClassDetails.room,
        branch_id: state.branchId,
        semester_id: state.semesterId,
        section_id: state.sectionId
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
        const assignment = state.facultyAssignments.find((a) => a.id === timetableRequest.assignment_id);
        const facultyAssignment = assignment ?
        {
          id: assignment.id,
          faculty: assignment.faculty,
          subject: assignment.subject,
          semester: assignment.semester,
          section: assignment.section
        } :
        { id: timetableRequest.assignment_id || "", faculty: "", subject: "", semester: 0, section: "" };

        if (timetableRequest.action === 'create_group') {
          // Instead of fully mocking it, just fetch timetable again to let backend data group it properly
          updateState({ selectedClass: null, loading: true });
          const fetchRes = await manageTimetable({ action: "GET", branch_id: state.branchId, semester_id: state.semesterId, section_id: state.sectionId });
          if (fetchRes.success && fetchRes.data) {
             const normalized = Array.isArray(fetchRes.data) ? fetchRes.data.map((e: any) => ({
                 id: e.id,
                 faculty_assignment: { ...e.faculty_assignment, subject_type: e.faculty_assignment.subject_type || (e.faculty_assignment as any).subject_type },
                 day: e.day.toUpperCase(), start_time: e.start_time, end_time: e.end_time, room: e.room
             })) : [];
             updateState({ timetable: normalized, loading: false });
          } else {
             updateState({ loading: false });
          }
          toast({ title: "Success", description: "Elective group created" });
        } else if (timetableRequest.action === 'create') {
          const newEntry = {
            id: timetableId || `temp-${Date.now()}`,
            faculty_assignment: facultyAssignment,
            day: day.toUpperCase(),
            start_time,
            end_time,
            room
          };
          updateState({ timetable: [...state.timetable, newEntry], selectedClass: null });
          toast({ title: "Success", description: "Timetable created" });
        } else {
          // update
          if (timetableId) {
            const updated = state.timetable.map((e) => e.id === timetableId || e.id === state.selectedClass?.timetable_id ?
            { ...e, faculty_assignment: facultyAssignment, day: day.toUpperCase(), start_time, end_time, room } :
            e
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
          description: err.message
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unknown error occurred"
        });
      }
    }
  };

  const handleDeleteClass = async (timetableId?: string) => {
    if (!timetableId) return;
    try {
      updateState({ loading: true });
      let isGroup = false;
      let subjectType = '';
      let day = '';
      let start_time = '';
      let end_time = '';
      
      const targetEntry = state.timetable.find(e => e.id === timetableId);
      if (!targetEntry && timetableId.startsWith('group-')) {
         isGroup = true;
         // find the mock group details from selectedClass if available
         subjectType = state.selectedClass?.subject_type || '';
         day = state.selectedClass?.day || '';
         start_time = state.selectedClass?.start_time || '';
         end_time = state.selectedClass?.end_time || '';
      }
      
      if (isGroup && state.semesterId && state.sectionId && subjectType) {
         const response = await manageTimetable({ 
            action: 'delete_group', 
            subject_type: subjectType,
            day,
            start_time,
            end_time,
            semester_id: state.semesterId,
            section_id: state.sectionId,
            branch_id: state.branchId 
         });
         if (response.success) {
            // refetch timetable
            const fetchRes = await manageTimetable({ action: "GET", branch_id: state.branchId, semester_id: state.semesterId, section_id: state.sectionId });
            if (fetchRes.success && fetchRes.data) {
               const normalized = Array.isArray(fetchRes.data) ? fetchRes.data.map((e: any) => ({
                   id: e.id,
                   faculty_assignment: { ...e.faculty_assignment, subject_type: e.faculty_assignment.subject_type || (e.faculty_assignment as any).subject_type },
                   day: e.day.toUpperCase(), start_time: e.start_time, end_time: e.end_time, room: e.room
               })) : [];
               updateState({ timetable: normalized, selectedClass: null });
            }
            toast({ title: 'Deleted', description: 'Group deleted successfully' });
         } else {
            throw new Error(response.message || 'Failed to delete group');
         }
      } else {
         const response = await manageTimetable({ action: 'delete', timetable_id: timetableId, branch_id: state.branchId });
         if (response.success) {
           const filtered = state.timetable.filter((e) => e.id !== timetableId);
           updateState({ timetable: filtered, selectedClass: null });
           toast({ title: 'Deleted', description: 'Class deleted successfully' });
         } else {
           throw new Error(response.message || 'Failed to delete class');
         }
      }
    } catch (err) {

      toast({ variant: 'destructive', title: 'Error', description: isErrorWithMessage(err) ? err.message : 'Network error' });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleCancelEdit = () => {
    updateState({ selectedClass: null });
  };

  const handleExportPDF = async () => {
    if (!state.semesterId || !state.sectionId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a semester and section to export"
      });
      return;
    }
    setDownloadingPDF(true);
    try {
      const queryParams = `?semester_id=${state.semesterId}&section_id=${state.sectionId}`;
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/timetable/export-pdf/${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const branchName = state.branchName || "Branch";
        const semesterNumber = state.semesters.find((s) => s.id === state.semesterId)?.number || "Semester";
        const sectionName = state.sections.find((s) => s.id === state.sectionId)?.name || "Section";
        const safeBranch = branchName.replace(/\s+/g, "_");
        a.download = `Timetable_${safeBranch}_${semesterNumber}_${sectionName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: "Timetable PDF exported successfully"
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



  if (state.loading && state.timetable.length === 0) {
    return (
      <div className="bg-background text-foreground p-6">
        <SkeletonTable rows={10} cols={7} />
      </div>);

  }

  if (state.error) {
    return <div className="text-center py-6 text-red-500">{state.error}</div>;
  }

  return (
    <div className="bg-background text-foreground">
      <Card id="timetable-card" className="shadow-xl">
        <div id="timetable-header-filters-section">
          <CardHeader id="timetable-card-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card px-4 py-3 rounded-t-md gap-4">
            <CardTitle className="text-2xl font-semibold text-foreground">Timetable</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md h-10 px-4"
                onClick={handleExportPDF}
                disabled={downloadingPDF || !state.semesterId || !state.sectionId}>
                
                {downloadingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
                <span className="whitespace-nowrap">
                  {downloadingPDF ? "Exporting..." : "Export PDF"}
                </span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleEdit}
                disabled={!state.semesterId || !state.sectionId}>
                
                <EditIcon className="w-4 h-4" />
                <span className="whitespace-nowrap">{state.isEditing ? "Save Edit" : "Edit"}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="bg-card pb-0">
            <div className="border border-border rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <div className="flex flex-col sm:flex-row md:flex-row gap-2 sm:gap-4 w-full md:flex-1 md:items-center md:flex-nowrap">
                  <div className="w-full sm:w-auto md:flex-none">
                    <Select
                      open={isSemesterOpen}
                      onOpenChange={setIsSemesterOpen}
                      value={state.semesterId}
                      onValueChange={(value) => {
                        updateState({ semesterId: value, sectionId: "", timetable: [] });
                        setTimeout(() => setIsSectionOpen(true), 150);
                      }}
                      disabled={state.loading || state.semesters.length === 0}>
                      
                      <SelectTrigger className="w-full sm:w-40 md:w-48 bg-card text-foreground border-border" disabled={state.loading || state.semesters.length === 0}>
                        <SelectValue placeholder={state.semesters.length === 0 ? "No semester available" : "Select Semester"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar">
                        {state.semesters.length === 0 ? (
                          <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            No semester available
                          </div>
                        ) : (
                          state.semesters.map((semester) =>
                            <SelectItem key={semester.id} value={semester.id} className="text-foreground">
                              {semester.number} Semester
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-auto md:flex-none">
                    <Select
                      open={isSectionOpen}
                      onOpenChange={setIsSectionOpen}
                      value={state.sectionId}
                      onValueChange={(value) => updateState({ sectionId: value, timetable: [] })}
                      disabled={state.loading || !state.semesterId}>
                      
                      <SelectTrigger className="w-full sm:w-40 md:w-48 bg-card text-foreground border-border" disabled={state.loading || !state.semesterId}>
                        <SelectValue placeholder={
                          !state.semesterId ?
                            "Select Semester" :
                            state.sections.length === 0 ?
                            "No section available" :
                            "Select Section"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar">
                        {!state.semesterId ? (
                          <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Select semester first
                          </div>
                        ) : state.sections.length === 0 ? (
                          <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            No section available
                          </div>
                        ) : (
                          state.sections.map((section) =>
                            <SelectItem key={section.id} value={section.id} className="text-foreground">
                              Section {section.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2 md:mt-0 md:ml-4 md:whitespace-nowrap md:flex-none">
                  {state.semesterId && state.sectionId ?
                  `${state.semesters.find((s) => s.id === state.semesterId)?.number} Semester - Section ${state.sections.find((s) => s.id === state.sectionId)?.name}` :

                  "Select Semester and Section"}
                </div>
              </div>
            </div>
          </CardContent>
        </div>

        <CardContent className="bg-card pt-0">
          <div className="border border-border rounded-lg p-4">
            {!state.semesterId || !state.sectionId ?
            <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                  <Calendar className="w-12 h-12 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>View Timetable</h3>
                <p className="max-w-xs text-base leading-relaxed">
                  Select a <span className="font-semibold text-primary">semester</span> and <span className="font-semibold text-primary">section</span> above to display the weekly schedule.
                </p>
              </div> :

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
                    {getTableData().map((row, idx) =>
                      <tr key={idx} className="border-t hover:bg-accent border-border">
                        <td className="py-3 px-4 font-medium text-foreground">{formatTo12h(row.time)}</td>
                        {["mon", "tue", "wed", "thu", "fri", "sat"].map((day, i) =>
                    <td
                      key={i}
                      className="py-3 px-4 whitespace-pre-line text-foreground cursor-pointer"
                      onClick={() => handleClassClick(row.time, day.toUpperCase())}>
                      
                            {row[day] && row[day].length > 0 ?
                      row[day].map((entry: any) =>
                      <div
                        key={entry.id}
                        className="mb-2 p-2 rounded bg-primary/10 border-l-4 border-primary hover:bg-primary/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClassClick(row.time, day.toUpperCase(), entry);
                        }}>
                        
                                  <div className="font-semibold">{entry.faculty_assignment.subject}</div>
                                  <div className="text-xs text-muted-foreground">{formatTo12h(entry.start_time)} - {formatTo12h(entry.end_time)}</div>
                                  <div className="text-xs">{entry.faculty_assignment.faculty}</div>
                                  <div className="text-xs italic">Room {entry.room}</div>
                                </div>
                      ) :

                      state.isEditing && <span className="text-muted-foreground italic text-xs">Click to add</span>
                      }
                          </td>
                    )}
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </CardContent>
      </Card>

      {state.isEditing && state.selectedClass &&
      <EditModal
        classDetails={state.selectedClass}
        onSave={handleSaveClass}
        onCancel={handleCancelEdit}
        onDelete={handleDeleteClass}
        subjects={state.subjects}
        facultyAssignments={state.facultyAssignments}
        semesterId={state.semesterId}
        sectionId={state.sectionId}
        branchId={state.branchId} />

      }
    </div>);

};

export default Timetable;