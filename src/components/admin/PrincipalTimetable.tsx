import { translateTerminology, getTerm, getInstitutionType } from "@/utils/institutionConfig";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Skeleton, SkeletonTable } from "../ui/skeleton";
import { DownloadIcon, EditIcon, User, Calendar, Loader2, CalendarDays, LayoutGrid, Clock, MapPin, CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { useToast } from "../ui/use-toast";
import { getBranchesWithHODs } from "../../utils/admin_api";
import { getSemesters, manageSections, manageSubjects, manageFaculties, manageTimetable, manageProfile, manageFacultyAssignments, getBranches, getHODTimetableBootstrap, getHODTimetableSemesterData } from "../../utils/hod_api";
import { showWarningAlert, showConfirmAlert, MySwal } from "../../utils/sweetalert";
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
  attendance_taken_today?: boolean;
}

interface ClassDetails {
  subject: string;
  professor: string;
  room: string;
  start_time?: string;
  end_time?: string;
  slot_id?: string;
  time?: string;
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
  force?: boolean;
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
  attendance_taken_today?: boolean;
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
  slots: any[];
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
  if (timeStr.includes('-')) {
    const [start, end] = timeStr.split('-').map(t => t.trim());
    return `${formatTo12h(start)} - ${formatTo12h(end)}`;
  }
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

const getSemesterName = (number: number) => {
  if (getInstitutionType() === 'school') {
    return `Class ${number}`;
  }
  return `Semester ${number}`;
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
const EditModal: React.FC<EditModalProps> = ({ classDetails, onSave, onCancel, onDelete, subjects, facultyAssignments, semesterId, sectionId, branchId, slots }) => {
  const { theme } = useTheme();
  const [newClassDetails, setNewClassDetails] = useState<ClassDetails>(classDetails);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
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
          {newClassDetails.timetable_id ? "Edit Class" : "Add Class"} — {dayFull}
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
                subjects.map((subject: Subject) => {
                  let displayName = subject.name;
                  if (subject.subject_type === 'elective') {
                    displayName = `${subject.name} (Elective)`;
                  } else if (subject.subject_type === 'open_elective') {
                    displayName = `${subject.name} (Open Elective)`;
                  }
                  return (
                    <SelectItem key={subject.id} value={subject.name} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                      {displayName}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground/70' : 'text-gray-600'}`}>Professor:</label>
          {matchingAssignments.length > 1 ? (
            <Select value={newClassDetails.professor} onValueChange={(value) => handleSelectChange("professor", value)}>
              <SelectTrigger className={`w-full p-2 border rounded ${theme === 'dark' ? 'text-foreground bg-card border-border' : 'text-gray-900 bg-white border-gray-300'}`}>
                <SelectValue placeholder="Select Professor" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                {matchingAssignments.map((assignment: FacultyAssignmentData) => {
                  const name = (assignment as any).faculty_name || (assignment as any).faculty || "";
                  return (
                    <SelectItem key={assignment.id} value={name} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <div className={`w-full p-2 border rounded ${theme === 'dark' ? 'bg-[#151c2c] border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              {newClassDetails.professor || "No professor assigned"}
            </div>
          )}
          {!isLoadingAssignments && !newClassDetails.professor && newClassDetails.subject &&
            <p className="text-xs text-destructive mt-1">Please assign a faculty to this subject in Faculty Assignments.</p>
          }
        </div>

        <div className="mb-4">
          <label className={`block mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Room:</label>
          <input
            type="text"
            name="room"
            value={newClassDetails.room || ""}
            onChange={handleChange}
            placeholder="Enter Room Number"
            className={`w-full p-2 border rounded ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-950'}`}
          />
        </div>

        <div className="mb-4">
          <label className={`block mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Time Slot:</label>
          <div className={`w-full p-2 border rounded ${theme === 'dark' ? 'bg-[#151c2c] border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
            {slots.find(s => String(s.id) === String(classDetails.slot_id))?.name || "Selected Slot"} 
            {classDetails.time ? ` (${classDetails.time})` : ''}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center mt-6">
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            {newClassDetails.timetable_id ? (
              <>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const result = await showConfirmAlert("Delete class?", `This will delete the class for ${dayFull} at ${newClassDetails.start_time} - ${newClassDetails.end_time}.`, "Confirm Delete");
                    if (result.isConfirmed) {
                      onDelete && onDelete(newClassDetails.timetable_id);
                    }
                  }}
                  className="flex-1 sm:flex-none bg-red-600 text-white hover:bg-red-700">
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewClassDetails({
                      subject: "",
                      professor: "",
                      room: "",
                      slot_id: newClassDetails.slot_id || classDetails.slot_id,
                      time: newClassDetails.time || classDetails.time,
                      day: newClassDetails.day || classDetails.day,
                      timetable_id: undefined,
                      isGroup: false,
                      subject_type: undefined
                    });
                  }}
                  className={`flex-1 sm:flex-none ${theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}`}>
                  Add Another
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex flex-row justify-end gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className={`flex-1 sm:flex-none ${theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'}`}
              onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!newClassDetails.slot_id && !classDetails.slot_id) {
                  await showWarningAlert("Missing Fields", "No time slot selected. Please click a slot in the timetable grid.");
                  return;
                }
                const isGroup = newClassDetails.subject === 'Elective Subjects' || newClassDetails.subject === 'Open Elective Subjects';
                if (!isGroup && !newClassDetails.professor) {
                  await showWarningAlert("No Professor", "Please select a professor before saving.");
                  return;
                }
                onSave({
                  ...newClassDetails,
                  slot_id: newClassDetails.slot_id || classDetails.slot_id,
                  isGroup,
                  subject_type: newClassDetails.subject === 'Elective Subjects' ? 'elective' : (newClassDetails.subject === 'Open Elective Subjects' ? 'open_elective' : undefined),
                  day: classDetails.day || "",
                  timetable_id: newClassDetails.timetable_id
                });
              }}
              className={`flex-1 sm:flex-none ${theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent bg-primary text-white hover:bg-primary/90 hover:text-white' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100 bg-primary text-white hover:bg-primary/90 hover:text-white'}`}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>);

};

// Main Timetable Component
const PrincipalTimetable = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const shouldAutoOpenSemesterRef = useRef(false);
  const shouldAutoOpenSectionRef = useRef(false);

  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'>('MON');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const skipNextFetch = useRef(false);
  const prevFetchKey = useRef("");
  const [state, setState] = useState({
    branchId: "" as string,
    branchName: "" as string,
    branches: [] as Array<{id: string, name: string}>,
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

  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    conflicts: string[];
    pendingClassDetails: ClassDetails | null;
  }>({
    isOpen: false,
    conflicts: [],
    pendingClassDetails: null
  });

  // Fetch dynamic slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data);
        }
      } catch (e) {}
    };
    fetchSlots();
  }, []);


  // Predefined time slots for the grid (9:00 AM to 5:00 PM)
  // Reference hours for the vertical axis
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Update current time & set smart defaults on load
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30s is enough for timeline check

    // Set selectedDay to current weekday
    const dayIndex = new Date().getDay();
    const dayMap: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'> = {
      1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
    };
    if (dayMap[dayIndex]) {
      setSelectedDay(dayMap[dayIndex]);
    }

    // Default view mode based on screen width
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('daily');
      } else {
        setViewMode('weekly');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isSessionOngoing = (start: string, end: string, day: string) => {
    const now = currentTime;
    const currentDayIndex = now.getDay();
    const dayMap: Record<number, string> = {
      1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
    };
    if (dayMap[currentDayIndex] !== day) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const getSubjectColor = (subjectName: string) => {
    const colors = [
      { border: 'border-l-2 border-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
      { border: 'border-l-2 border-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
      { border: 'border-l-2 border-purple-500', text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-500/10' },
      { border: 'border-l-2 border-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
      { border: 'border-l-2 border-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
      { border: 'border-l-2 border-teal-500', text: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-500/10' }
    ];
    let sum = 0;
    for (let i = 0; i < subjectName.length; i++) {
      sum += subjectName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };



  // Fetch branches on mount
  useEffect(() => {
    const fetchBranchesData = async () => {
      updateState({ loading: true });
      try {
        const res = await getBranchesWithHODs({ page_size: 100 });
        if (res.success && res.branches) {
          updateState({
            branches: res.branches.map(b => ({ id: b.id.toString(), name: b.name }))
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        updateState({ loading: false });
      }
    };
    fetchBranchesData();
  }, []);

  // Fetch semesters when branch changes
  useEffect(() => {
    const fetchSemesters = async () => {
      if (!state.branchId) {
        updateState({ semesters: [], semesterId: "", sections: [], sectionId: "", timetable: [] });
        return;
      }
      updateState({ loading: true });
      try {
        const res = await getSemesters(state.branchId);
        if (res.success && res.data) {
          const loadedSemesters = res.data.map((s: any) => ({ id: s.id.toString(), number: s.number }));
          updateState({
            semesters: loadedSemesters,
            semesterId: "", sectionId: "", timetable: []
          });
          if (shouldAutoOpenSemesterRef.current && loadedSemesters.length > 0) {
            shouldAutoOpenSemesterRef.current = false;
            setTimeout(() => setIsSemesterOpen(true), 150);
          }
        }
      } catch(err) {
        console.error(err);
      } finally {
        updateState({ loading: false });
      }
    };
    fetchSemesters();
  }, [state.branchId]);

  // Fetch sections only when semester changes. Subjects and assignments are loaded lazily when editing.
  useEffect(() => {
    const fetchSections = async () => {
      if (!state.semesterId) {
        updateState({ sections: [], sectionId: "" });
        return;
      }
      if (!state.branchId) {
        return;
      }

      const hasCachedSections = !!state.sectionsCache[state.semesterId];
      if (hasCachedSections) {
        const cached = state.sectionsCache[state.semesterId];
        updateState({ sections: cached, sectionId: "" });
        if (shouldAutoOpenSectionRef.current && cached.length > 0) {
          shouldAutoOpenSectionRef.current = false;
          setTimeout(() => setIsSectionOpen(true), 150);
        }
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
          if (shouldAutoOpenSectionRef.current && sections.length > 0) {
            shouldAutoOpenSectionRef.current = false;
            setTimeout(() => setIsSectionOpen(true), 150);
          }
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
          if (Array.isArray(assignmentsRes.data)) assignments = assignmentsRes.data; else
            if ((assignmentsRes.data as any).assignments) assignments = (assignmentsRes.data as any).assignments; else
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
    const fetchKey = `${state.branchId}|${state.semesterId}|${state.sectionId}`;
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (prevFetchKey.current === fetchKey && fetchKey !== "||" ) return;
    prevFetchKey.current = fetchKey;
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
              slot_id: entry.slot?.id || entry.slot_id || (entry as any).slot,
              room: entry.room,
              attendance_taken_today: entry.attendance_taken_today
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
  }, [state.branchId, state.semesterId, state.sectionId]);

  // Generate table data for the grid
  // Generate table data for the grid
  const getTableData = () => {
    const timetable = Array.isArray(state.timetable) ? state.timetable : [];
    const tableData = slots.map((slot) => {
      const timeStr = `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`;
      const row: Record<string, any> = { time: timeStr, slot_id: slot.id, slot_name: slot.name, is_break: slot.is_break };
      days.forEach((day) => {
        const entries = timetable.filter(
          (e) => String((e as any).slot_id) === String(slot.id) && e.day === day
        );
        row[day.toLowerCase()] = entries;
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

  const handleClassClick = (time: string, slot_id: string, day: string, existingEntry?: any) => {
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
          assignment_id: existingEntry.faculty_assignment.id,
          subject_type: existingEntry.subject_type || existingEntry.faculty_assignment?.subject_type,
          slot_id: slot_id,
          time: time
        }
      });
    } else {
      updateState({
        selectedClass: {
          subject: "",
          professor: "",
          room: "",
          slot_id: slot_id,
          time: time,
          day: day.toUpperCase()
        }
      });
    }
  };

  const handleSaveClass = async (newClassDetails: ClassDetails, force: boolean = false) => {
    try {
      if (!state.semesterId || !state.sectionId) {
        throw new Error("Semester and section must be selected");
      }

      let assignmentId = "";
      if (newClassDetails.isGroup) {
        const hasAssignments = state.facultyAssignments.some((a: any) => a.subject_type === newClassDetails.subject_type && a.semester_id === state.semesterId && a.section_id === state.sectionId);
        if (!hasAssignments) {
          throw new Error(`No faculty assigned to any ${newClassDetails.subject_type === 'elective' ? translateTerminology("Elective") : 'Open Elective'} subject for this section. Please assign a faculty first.`);
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
        slot_id: String(state.selectedClass!.slot_id || newClassDetails.slot_id || ""),
        room: newClassDetails.room,
        branch_id: state.branchId,
        semester_id: state.semesterId,
        section_id: state.sectionId,
        force: force
      };

      const response = await manageTimetable(timetableRequest);
      if (response.success) {
        const timetableId = (response.data?.timetable_id || response.data?.timetable_ids?.[0]) as string | undefined;
        const day = state.selectedClass?.day || timetableRequest.day;
        const room = timetableRequest.room || "";

        const slotId = timetableRequest.slot_id || state.selectedClass?.slot_id || newClassDetails.slot_id;
        const slot = slots.find(s => String(s.id) === String(slotId));

        // Build faculty_assignment details from local cache
        const assignment = state.facultyAssignments.find((a) => String(a.id) === String(timetableRequest.assignment_id));
        const subjectObj = assignment ? state.subjects.find(s => String(s.id) === String(assignment.subject_id)) : state.subjects.find(s => s.name === newClassDetails.subject);
        const facultyAssignment = {
          id: assignment?.id || timetableRequest.assignment_id || "",
          faculty: assignment?.faculty_name || assignment?.faculty || newClassDetails.professor || "",
          subject: subjectObj?.name || assignment?.subject || newClassDetails.subject || "",
          semester: assignment?.semester || 0,
          section: assignment?.section || "",
          subject_type: subjectObj?.subject_type || assignment?.subject_type || newClassDetails.subject_type || ""
        };

        if (timetableRequest.action === 'create_group') {
          // If bulk group creation, we will have multiple IDs
          const createdIds = (response.data?.timetable_ids || []) as string[];
          // Find all assignments for this elective group
          const groupAssignments = state.facultyAssignments.filter(
            (a: any) => a.subject_type === timetableRequest.subject_type && String(a.semester_id) === String(state.semesterId) && String(a.section_id) === String(state.sectionId)
          );
          
          const newEntries = groupAssignments.map((a, idx) => {
            const sub = state.subjects.find(s => String(s.id) === String(a.subject_id));
            return {
              id: createdIds[idx] || `temp-${Date.now()}-${idx}`,
              faculty_assignment: {
                id: a.id,
                faculty: a.faculty_name || a.faculty || "",
                subject: sub?.name || a.subject || "",
                semester: a.semester,
                section: a.section,
                subject_type: sub?.subject_type || a.subject_type || ""
              },
              day: day.toUpperCase(),
              slot_id: slotId,
              start_time: slot?.start_time?.substring(0, 5) || "",
              end_time: slot?.end_time?.substring(0, 5) || "",
              room,
              attendance_taken_today: false
            };
          });

          // Delete any existing entries for this elective group type in this slot
          const filtered = state.timetable.filter(
            (e) => !(e.day === day.toUpperCase() && String(e.slot_id) === String(slotId) && e.faculty_assignment?.subject_type === timetableRequest.subject_type)
          );

          updateState({ timetable: [...filtered, ...newEntries], selectedClass: null });
        } else if (timetableRequest.action === 'create') {
          const newEntry = {
            id: timetableId || `temp-${Date.now()}`,
            faculty_assignment: facultyAssignment,
            day: day.toUpperCase(),
            slot_id: slotId,
            start_time: slot?.start_time?.substring(0, 5) || newClassDetails.start_time || "",
            end_time: slot?.end_time?.substring(0, 5) || newClassDetails.end_time || "",
            room,
            attendance_taken_today: false
          };

          const isElective = facultyAssignment.subject_type === 'elective' || facultyAssignment.subject_type === 'open_elective' || facultyAssignment.subject_type === 'lab';
          const updatedTimetable = state.timetable.filter(
            (e) => {
              if (isElective) {
                // If it is an elective/lab, keep other scheduled electives in the same slot.
                const isExistingElective = e.faculty_assignment?.subject_type === 'elective' || e.faculty_assignment?.subject_type === 'open_elective' || e.faculty_assignment?.subject_type === 'lab';
                if (!isExistingElective && e.day === day.toUpperCase() && String(e.slot_id) === String(slotId)) {
                  return false; // Remove regular class if replacing it
                }
                return !(String(e.id) === String(timetableId) || String(e.faculty_assignment?.id) === String(facultyAssignment.id));
              } else {
                // For regular subjects, remove everything in that day/slot
                return !(e.day === day.toUpperCase() && String(e.slot_id) === String(slotId));
              }
            }
          );
          updateState({ timetable: [...updatedTimetable, newEntry], selectedClass: null });
        } else {
          // update
          const targetId = timetableId || state.selectedClass?.timetable_id || newClassDetails.timetable_id;
          if (targetId) {
            const updated = state.timetable.map((e) => String(e.id) === String(targetId) ?
              { ...e, 
                faculty_assignment: facultyAssignment, 
                day: day.toUpperCase(),
                slot_id: slotId,
                start_time: slot?.start_time?.substring(0, 5) || e.start_time || newClassDetails.start_time,
                end_time: slot?.end_time?.substring(0, 5) || e.end_time || newClassDetails.end_time,
                room 
              } :
              e
            );
            updateState({ timetable: updated, selectedClass: null });
          }
        }
        toast({ title: "Success", description: "Timetable saved successfully" });
      } else if (response.conflict_warning || (response.message && response.message.toLowerCase().includes("conflict"))) {
        const conflictItems = response.conflicts && response.conflicts.length > 0
          ? response.conflicts
          : [response.message || "A scheduling conflict was detected during this slot."];

        setConflictModal({
          isOpen: true,
          conflicts: conflictItems,
          pendingClassDetails: newClassDetails
        });
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
      if (String(timetableId).startsWith('group-')) {
        isGroup = true;
        subjectType = targetEntry?.faculty_assignment?.subject_type || state.selectedClass?.subject_type || '';
        day = targetEntry?.day || state.selectedClass?.day || '';
        start_time = targetEntry?.start_time || state.selectedClass?.start_time || '';
        end_time = targetEntry?.end_time || state.selectedClass?.end_time || '';
      }

      if (isGroup && state.semesterId && state.sectionId && subjectType) {
        const response = await manageTimetable({
          action: 'delete_group',
          subject_type: subjectType,
          day,
          slot_id: String(state.selectedClass?.slot_id || ''),
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
        const branchName = state.branchName || translateTerminology("Branch");
        const semesterNumber = state.semesters.find((s) => s.id === state.semesterId)?.number || translateTerminology("Semester");
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



  if (state.loading && state.semesters.length === 0) {
    return (
      <div className="bg-background text-foreground p-6">
        <SkeletonTable rows={10} cols={7} />
      </div>);

  }

  if (state.error) {
    return <div className="text-center py-6 text-red-500">{state.error}</div>;
  }

  return (
    <div>
      <Card id="timetable-card" className={`w-full border ${theme === 'dark' ? 'bg-card border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} shadow-sm rounded-xl`}>
        <div id="timetable-header-filters-section">
          <CardHeader id="timetable-card-header" className="border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center  w-full">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">Academic Timetable</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">Manage weekly class schedules, periods, and room assignments.</CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-between">
                  

                  {/* Mobile Export PDF Button */}
                  {state.semesterId && state.sectionId && viewMode === 'weekly' && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex md:hidden dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200 h-9 w-9 items-center justify-center shrink-0 p-0"
                      onClick={handleExportPDF}
                      disabled={downloadingPDF}
                    >
                      {downloadingPDF ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadIcon className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}

                  {/* Desktop Export PDF Button */}
                  {state.semesterId && state.sectionId && viewMode === 'weekly' && (
                    <Button
                      variant="outline"
                      className="hidden md:flex bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-250 ease-in-out transform hover:scale-[1.02] shadow-sm h-9 px-3.5 rounded-lg items-center justify-center gap-1.5 text-xs font-semibold shrink-0 disabled:opacity-50"
                      onClick={handleExportPDF}
                      disabled={downloadingPDF}>
                      {downloadingPDF ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{downloadingPDF ? "Exporting..." : "Export PDF"}</span>
                    </Button>
                  )}
                </div>

                {/* View Mode Toggle */}
                {state.semesterId && state.sectionId && (
                  <div className="flex items-center rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 w-full sm:w-auto justify-center">
                    <button
                      onClick={() => setViewMode('weekly')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-1 sm:flex-none ${viewMode === 'weekly'
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-primary dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                      <LayoutGrid size={14} />
                      <span>Weekly Grid</span>
                    </button>
                    <button
                      onClick={() => setViewMode('daily')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-1 sm:flex-none ${viewMode === 'daily'
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-primary dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                      <CalendarDays size={14} />
                      <span>Daily List</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="bg-transparent sm:bg-card px-4 sm:px-6 pt-3 pb-1 sm:pb-3">
            <div className="border-0 sm:border border-border rounded-lg p-0 sm:p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                <div className="flex flex-col sm:flex-row md:flex-row gap-2 sm:gap-4 w-full md:flex-1 md:items-center md:flex-nowrap">
                  <div className="w-full sm:w-auto md:flex-none">
                    <Select
                      open={isBranchOpen}
                      onOpenChange={setIsBranchOpen}
                      value={state.branchId}
                      onValueChange={(value) => {
                        const branchName = state.branches.find(b => b.id === value)?.name || "";
                        shouldAutoOpenSemesterRef.current = true;
                        updateState({ branchId: value, branchName, semesterId: "", sectionId: "", timetable: [] });
                      }}
                      disabled={state.loading || state.branches.length === 0}>
                      <SelectTrigger className="w-full sm:w-40 md:w-48 bg-card text-foreground border-border" disabled={state.loading || state.branches.length === 0}>
                        <SelectValue placeholder={state.branches.length === 0 ? "No branches available" : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar">
                        {state.branches.length === 0 ? (
                          <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            No branches available
                          </div>
                        ) : (
                          state.branches.map((branch) =>
                            <SelectItem key={branch.id} value={branch.id} className="text-foreground">
                              {branch.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-auto md:flex-none">
                    <Select
                      open={isSemesterOpen}
                      onOpenChange={setIsSemesterOpen}
                      value={state.semesterId}
                      onValueChange={(value) => {
                        shouldAutoOpenSectionRef.current = true;
                        updateState({ semesterId: value, sectionId: "", timetable: [] });
                      }}
                      disabled={state.loading || state.semesters.length === 0}>

                      <SelectTrigger className="w-full sm:w-40 md:w-48 bg-card text-foreground border-border" disabled={state.loading || state.semesters.length === 0}>
                        <SelectValue placeholder={state.semesters.length === 0 ? `No ${translateTerminology("semester").toLowerCase()} available` : translateTerminology("Select Semester")} />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar">
                        {state.semesters.length === 0 ? (
                          <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            No {translateTerminology("semester").toLowerCase()} available
                          </div>
                        ) : (
                          state.semesters.map((semester) =>
                            <SelectItem key={semester.id} value={semester.id} className="text-foreground">
                              {getSemesterName(semester.number)}
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
                            translateTerminology("Select Semester") :
                            state.sections.length === 0 ?
                              "No section available" :
                              "Select Section"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border max-h-[200px] overflow-y-auto custom-scrollbar">
                        {!state.semesterId ? (
                          <div className="p-2 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {translateTerminology("Select semester first")}
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
                  {state.branchId && state.semesterId && state.sectionId ? `${state.branchName} - ${getSemesterName(state.semesters.find(s => s.id === state.semesterId)?.number || 0)} - Section ${state.sections.find(s => s.id === state.sectionId)?.name}` : `Select Branch, ${translateTerminology("Semester")} and Section`}
                </div>
              </div>
            </div>
          </CardContent>
        </div>        <CardContent className="bg-transparent sm:bg-card px-4 sm:px-6 pt-0">
          <div className="border-0 sm:border border-border rounded-lg p-0 sm:p-4">
            {state.loading ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'} animate-pulse`}>
                  <Calendar className="w-12 h-12 opacity-80" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fetching schedules from directory...</p>
              </div>
            ) : !state.semesterId || !state.sectionId ? (
              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-4 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                  <Calendar className="w-12 h-12 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>View Timetable</h3>
                <p className="max-w-xs text-base leading-relaxed">
                  Select a <span className="font-semibold text-primary">{translateTerminology("semester").toLowerCase()}</span> and <span className="font-semibold text-primary">section</span> above to display the weekly schedule.
                </p>
              </div>
            ) : viewMode === 'daily' ? (
              /* HOD DAILY PLANNER VIEW */
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Day Tab Selectors */}
                <div className="grid grid-cols-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50 w-full">
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day as any)}
                      className={`py-2 text-xs font-semibold rounded-md transition-all ${selectedDay === day
                        ? 'bg-primary text-white font-semibold shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {/* Day's Timeline List */}
                <div className="space-y-4">
                  {(() => {
                    const dayEntries = state.timetable.filter(e => e.day === selectedDay)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time));

                    if (dayEntries.length === 0) {
                      return (
                        <div className={`flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
                          theme === 'dark' 
                            ? 'bg-[#0f172a]/20 border-slate-800 text-slate-400' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-500'
                        }`}>
                          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-slate-900 text-primary' : 'bg-primary/5 text-primary'}`}>
                            <CalendarDays className="w-8 h-8 opacity-90" />
                          </div>
                          <h4 className={`text-base font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No lectures scheduled</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed mb-4">
                            There are no classes scheduled for {selectedDay} yet.
                          </p>
                          {state.isEditing && (
                            <Button size="sm" variant="outline" className="flex items-center gap-1.5" onClick={() => handleClassClick("", "", selectedDay)}>
                              + Add First Class
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="space-y-4">
                          {dayEntries.map((entry, idx) => {
                            const subjectStr = entry.faculty_assignment.subject;
                            const colors = getSubjectColor(subjectStr);
                            const ongoing = isSessionOngoing(entry.start_time, entry.end_time, entry.day);

                            return (
                              <div
                                key={idx}
                                onClick={() => handleClassClick(entry.start_time.substring(0, 5), entry.day, entry)}
                                className={`relative p-5 rounded-xl border transition-all duration-300 cursor-pointer ${ongoing
                                  ? `${colors.border} bg-primary/5 dark:bg-primary/10 border-primary ring-1 ring-primary/30 scale-[1.01]`
                                  : theme === 'dark'
                                    ? 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                                    : 'border-slate-100 bg-slate-50/50 text-slate-650 hover:bg-slate-100/50'
                                  } ${state.isEditing ? 'border-dashed border-primary/50 hover:border-primary hover:bg-primary/5' : ''}`}
                              >

                                {ongoing && !state.isEditing && (
                                  <span className="absolute right-4 top-4 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                        {entry.faculty_assignment.subject_type === 'elective' ? 'ELECTIVE' : (entry.faculty_assignment.subject_type === 'open_elective' ? 'OPEN ELECT' : 'CORE')}
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <Clock size={11} className="text-slate-400 dark:text-slate-500" /> {formatTo12h(entry.start_time)} - {formatTo12h(entry.end_time)}
                                      </span>
                                      {entry.attendance_taken_today && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs" title="Attendance Taken Today">
                                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                          <span>Attendance Marked</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{subjectStr}</h4>
                                    </div>
                                  </div>

                                  <div className="flex flex-row sm:flex-col gap-4 sm:gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-[160px] shrink-0 sm:items-start overflow-hidden">
                                    <div className="flex items-center gap-1.5 font-medium w-full">
                                      <User size={13} className="text-slate-400 dark:text-slate-550 shrink-0" />
                                      <span className="truncate">{entry.faculty_assignment.faculty}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-primary w-full">
                                      <MapPin size={13} className="shrink-0" />
                                      <span className="truncate">{entry.room ? (entry.room.toLowerCase().startsWith('room') ? entry.room : `Room ${entry.room}`) : 'No Room'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : getTableData().length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-5 rounded-full mb-4 ${theme === 'dark' ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-50 text-amber-600'}`}>
                  <Clock className="w-10 h-10 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Timetable Slots Not Configured</h3>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  The time slots for this timetable have not been configured yet. Please configure the timetable slots in administrative settings.
                </p>
              </div>
            ) : (
              /* HOD WEEKLY GRID VIEW */
              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800/60 rounded-xl custom-scrollbar animate-in fade-in duration-300">
                <table className="w-full border-collapse text-left whitespace-nowrap min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-150 dark:border-slate-800">
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider w-24 text-center md:sticky md:left-0 md:z-10 bg-slate-100 dark:bg-[#151c2c] border-r border-slate-200 dark:border-slate-800">
                        Time Slot
                      </th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-center"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {getTableData().map((row, idx) => {
                      const isEvenRow = idx % 2 === 0;
                      const rowBgClass = theme === 'dark'
                        ? isEvenRow ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'
                        : isEvenRow ? 'bg-white' : 'bg-slate-50/30';

                      return (
                        <tr key={idx} className={`${rowBgClass} hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-colors`}>
                          <td className="px-4 py-4 font-semibold text-xs text-center border-r border-slate-200 dark:border-slate-800 md:sticky md:left-0 md:z-10 md:bg-[#f8fafc] md:dark:bg-[#151c2c] text-slate-600 dark:text-slate-400">
                            {formatTo12h(row.time)}
                          </td>
                          {row.is_break ? (
                            <td colSpan={6} className="px-3 py-3 vertical-top text-center bg-slate-50 dark:bg-slate-800/20">
                              <div className="flex items-center justify-center h-full min-h-[60px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest text-sm">
                                {row.slot_name || "Break"}
                              </div>
                            </td>
                          ) : (
                            ["mon", "tue", "wed", "thu", "fri", "sat"].map((day) => {
                              const entries = row[day] as any[];
                              return (
                                <td
                                  key={day}
                                  className="px-3 py-3 vertical-top min-w-[140px] max-w-[180px] cursor-pointer"
                                  onClick={() => handleClassClick(row.time, row.slot_id, day.toUpperCase())}
                                >
                                {entries && entries.length > 0 ? (
                                  entries.map((entry, eIdx) => {
                                    const colors = getSubjectColor(entry.faculty_assignment.subject);
                                    const ongoing = isSessionOngoing(entry.start_time, entry.end_time, entry.day);

                                    return (
                                      <div
                                        key={eIdx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClassClick(row.time, row.slot_id, day.toUpperCase(), entry);
                                        }}
                                        className={`p-2.5 rounded-lg border flex flex-col justify-between h-full transition-all duration-300 relative ${colors.border} ${colors.bg} ${ongoing
                                          ? 'border-primary ring-2 ring-primary/40 dark:ring-primary/60 scale-[1.03] bg-primary/15 dark:bg-primary/25'
                                          : 'opacity-80 hover:opacity-100 hover:scale-[1.01]'
                                          } ${state.isEditing ? 'border-dashed border-primary/50 hover:border-primary hover:bg-primary/5' : ''}`}
                                      >
                                        {state.isEditing && (
                                          <div className="absolute right-1.5 top-1.5 p-0.5 rounded bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-855 text-primary">
                                            <EditIcon size={9} />
                                          </div>
                                        )}
                                        <div className="relative">
                                          <div className="flex items-start justify-between gap-1">
                                            <div className={`font-semibold text-[11px] leading-tight ${colors.text} truncate`}>
                                              {entry.faculty_assignment.subject}
                                            </div>
                                            {ongoing && !state.isEditing && (
                                              <span className="flex h-2 w-2 relative shrink-0 mt-0.5" title="Ongoing Class">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                              </span>
                                            )}
                                          </div>
                                          {entry.attendance_taken_today && (
                                            <div className="mt-1 flex items-center">
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" title="Attendance Taken Today">
                                                <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                <span>Attendance Marked</span>
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex justify-between items-center text-[9px] font-semibold text-slate-600 dark:text-slate-300 mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-850/40">
                                          <span className="truncate max-w-[70px]">{entry.faculty_assignment.faculty}</span>
                                          <span className="text-primary whitespace-nowrap">{entry.room && (entry.room.toLowerCase().startsWith('room') ? entry.room : `Room ${entry.room}`)}</span>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="h-full min-h-[48px] flex flex-col items-center justify-center text-slate-200 dark:text-slate-850/80 font-semibold select-none">
                                    {state.isEditing ? (
                                      <div className="w-full py-2 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700/60 rounded-md hover:border-primary hover:bg-primary/5 transition-all text-[10px] text-slate-400 hover:text-primary font-semibold">
                                        + Add Class
                                      </div>
                                    ) : (
                                      "•"
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
          branchId={state.branchId} 
          slots={slots} />
      }

      {/* SHADCN PROFESSIONAL CONFLICT WARNING MODAL */}
      <AlertDialog
        open={conflictModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConflictModal({ isOpen: false, conflicts: [], pendingClassDetails: null });
          }
        }}
      >
        <AlertDialogContent className="w-[94vw] max-w-lg p-5 sm:p-6 rounded-2xl border bg-card text-foreground shadow-2xl z-[10002] transition-all">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10.5px] px-2 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-semibold tracking-wide">
                    Conflict Warning
                  </Badge>
                </div>
                <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
                  Schedule Conflict Detected
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  The system detected overlapping assignments for this slot. Review the details below.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Detected Conflicts Section */}
          <div className="space-y-3 my-1">
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 dark:bg-rose-950/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Detected Conflict{conflictModal.conflicts.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                {conflictModal.conflicts.map((conflict, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-medium text-foreground/90 leading-snug">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{conflict}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanatory Behavior Guide */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Behavior if you choose to Continue & Save:</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-start gap-2.5 rounded-lg bg-card/90 p-2.5 border border-border/60">
                  <Badge variant="secondary" className="text-[10px] shrink-0 font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                    Regular
                  </Badge>
                  <span className="text-[11.5px] text-muted-foreground leading-snug">
                    <strong className="text-foreground">Replaces / overwrites</strong> the existing class in this section's slot.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-card/90 p-2.5 border border-border/60">
                  <Badge variant="secondary" className="text-[10px] shrink-0 font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                    Elective / Lab
                  </Badge>
                  <span className="text-[11.5px] text-muted-foreground leading-snug">
                    <strong className="text-foreground">Stacks in parallel</strong> alongside other batch/elective options.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-2 border-t border-border">
            <AlertDialogCancel
              onClick={() => setConflictModal({ isOpen: false, conflicts: [], pendingClassDetails: null })}
              className="w-full sm:w-auto h-10 px-5 rounded-xl border-border hover:bg-muted text-xs font-semibold cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                const details = conflictModal.pendingClassDetails;
                setConflictModal({ isOpen: false, conflicts: [], pendingClassDetails: null });
                if (details) {
                  await handleSaveClass(details, true);
                }
              }}
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Continue & Save
              <ArrowRight className="w-3.5 h-3.5" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default PrincipalTimetable;