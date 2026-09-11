import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"../ui/select";
import { Button } from "../ui/button";
import { Check, X } from "lucide-react";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getSubjectDetail, takeAttendance, getStudentsForRegular, getStudentsForElective, getStudentsForOpenElective, FacultyAssignment, ClassStudent, GetTakeAttendanceBootstrapResponse } from "@/utils/faculty_api";
import { useFacultyAssignmentsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format, parseISO } from "date-fns";
import { CalendarIcon, UserCheck, Search, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/utils/sweetalert";

const TakeAttendance = () => {
  const { toast } = useToast();
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useFacultyAssignmentsQuery();
  // Normalize assignment IDs to numbers to avoid string/number mismatch from backend
  const normalizedAssignments = useMemo(() => assignments.map((a) => ({
    ...a,
    subject_id: a.subject_id ? Number(a.subject_id) : null,
    branch_id: a.branch_id ? Number(a.branch_id) : null,
    semester_id: a.semester_id ? Number(a.semester_id) : null,
    section_id: a.section_id ? Number(a.section_id) : null
  })), [assignments]);
  const { theme } = useTheme();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [subjectStudents, setSubjectStudents] = useState<any[]>([]); // students returned for subject-only bootstrap
  const [bootstrapParams, setBootstrapParams] = useState<any | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // States to control programmatic opening of subsequent select dropdowns
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);


  const [attendance, setAttendance] = useState<{[studentId: number]: boolean;}>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentRecords, setRecentRecords] = useState<GetTakeAttendanceBootstrapResponse['data']['recent_records']>([]);
  const [subjectType, setSubjectType] = useState<string | null>(null);
  const [labBatchId, setLabBatchId] = useState<number | null>(null);
  const [lastBootstrapParams, setLastBootstrapParams] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isLabSubject = subjectType === 'lab';
  const currentAssignment = normalizedAssignments.find((a) => a.subject_id === subjectId);
  const labBatches: Array<{ id: number | string; name: string }> = (currentAssignment as any)?.lab_batches || [];

  // Sync labBatchId with available batches
  useEffect(() => {
    if (isLabSubject && labBatches.length > 0) {
      const exists = labBatches.some((b) => Number(b.id) === Number(labBatchId));
      if (!exists) {
        setLabBatchId(Number(labBatches[0].id));
      }
    } else if (!isLabSubject) {
      setLabBatchId(null);
    }
  }, [subjectId, isLabSubject, labBatches, labBatchId]);

  // Map to hold in-flight requests to deduplicate identical calls
  const inFlightRequests = useRef<Map<string, Promise<any>>>(new Map());
  // Mirror of lastBootstrapParams in a ref for synchronous checks (avoids state update timing races)
  const lastBootstrapParamsRef = useRef<any>(null);
  // When auto-deriving branch/semester/section, suppress the branch-change clearing effect once
  const suppressBranchClearRef = useRef(false);
  const suppressSemesterClearRef = useRef(false);
  const hasTriggeredAutoOpenRef = useRef<number | null>(null);

  // Central runLoader function (moved to component scope so multiple effects can use it)
  const runLoader = (loader: any, paramsObj: any, mapStudents: boolean = true) => {
    setLoadingStudents(true);
    const params: any = makeParams(paramsObj);
    // Prevent duplicate calls by comparing against lastBootstrapParams (use ref for synchronous check)
    if (lastBootstrapParamsRef.current && JSON.stringify(params) === JSON.stringify(lastBootstrapParamsRef.current)) {
      return Promise.resolve();
    }
    setLastBootstrapParams(params);
    lastBootstrapParamsRef.current = params;
    setBootstrapParams(params);

    // Use a key to dedupe identical in-flight requests
    const key = JSON.stringify(params);

    const existing = inFlightRequests.current.get(key);
    if (existing) {
      // Return the existing promise so callers share the same network request


      return existing;
    }

    const p = loader(params).
    then((response: any) => {
      if (response && response.success && response.data) {
        const studentsArr = response.data.students || [];
        if (mapStudents) {
          setStudents(studentsArr.map((s: any) => ({ id: s.id, name: s.name, usn: s.usn })));
        } else {
          setStudents(studentsArr);
        }
        setRecentRecords(response.data.recent_records || []);
      } else {
        setErrorMsg(response?.message || "Failed to load data");
      }
      return response;
    }).
    catch((e: any) => {
      setErrorMsg(e?.message || "Failed to load data");
      throw e;
    }).
    finally(() => {
      setLoadingStudents(false);
      inFlightRequests.current.delete(key);
    });

    inFlightRequests.current.set(key, p);
    return p;
  };


  // Helper to build query params: omit null/undefined/'undefined' values and stringify
  const makeParams = (obj: Record<string, any>) => {
    const out: Record<string, any> = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      const s = String(v);
      if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
      out[k] = s;
    });
    return out;
  };

  // Reset last params when subject changes
  useEffect(() => {
    setLastBootstrapParams(null);
    lastBootstrapParamsRef.current = null;
  }, [subjectId]);

  // Assignments are now loaded via context

  // Reset selections and load students when subject or class selection changes
  useEffect(() => {
    if (!subjectId) {
      setStudents([]);
      setAttendance({});
      setRecentRecords([]);
      setErrorMsg("");
      return;
    }

    const currentParams = makeParams({
      subject_id: subjectId,
      branch_id: branchId,
      semester_id: semesterId,
      section_id: sectionId,
      lab_batch_id: isLabSubject ? (labBatchId || undefined) : undefined,
      date: attendanceDate
    });

    const isDuplicate = lastBootstrapParamsRef.current && 
      JSON.stringify(currentParams) === JSON.stringify(lastBootstrapParamsRef.current);

    if (isDuplicate) {
      return;
    }

    // Only clear states and show loader if it is a new request
    setStudents([]);
    setAttendance({});
    setRecentRecords([]);
    setErrorMsg("");

    // CASE 0: Elective or Lab (Branch + Semester + Subject, section optional, lab batch optional)
    if (subjectId && branchId && semesterId && (subjectType === 'elective' || subjectType === 'lab')) {
      runLoader(getStudentsForElective, {
        subject_id: subjectId,
        branch_id: branchId,
        semester_id: semesterId,
        section_id: sectionId,
        lab_batch_id: isLabSubject ? (labBatchId || undefined) : undefined,
        date: attendanceDate
      });
      return;
    }

    // CASE 1: Combined class (Subject only)
    if (subjectId && !branchId) {
      if (subjectStudents.length) {
        const mapped = subjectStudents.map((s) => ({ id: s.id, name: s.name, usn: s.usn }));
        setStudents(mapped);
        // recentRecords already set by subject-only bootstrap
      }
      return;
    }

    // CASE 2: Branch-specific class (Subject + Branch)
    if (subjectId && branchId && !semesterId && !sectionId) {
      // For elective subjects we require semester selection before calling the elective endpoint
      if (subjectType === 'elective') return;

      // For open_elective and regular subjects: require full selection before loading students
      if (subjectType === 'open_elective' || subjectType === 'regular' || !subjectType) return;

      // Regular subject fallback or other: call regular loader
      const loader = getStudentsForRegular;
      runLoader(loader, { subject_id: subjectId, branch_id: branchId, date: attendanceDate });
      return;
    }

    // CASE 2b: Branch + Semester selected (section optional)
    if (subjectId && branchId && semesterId && !sectionId) {
      if (subjectType === 'elective') {
        // Elective requires semester selection; call elective loader
        runLoader(getStudentsForElective, { subject_id: subjectId, branch_id: branchId, semester_id: semesterId });
        return;
      }

      // For open_elective and regular subjects: require section selection before loading students
      if (subjectType === 'open_elective' || subjectType === 'regular' || !subjectType) return;

      // Regular subject fallback or other: call regular loader
      const loader = getStudentsForRegular;
      runLoader(loader, { subject_id: subjectId, branch_id: branchId, semester_id: semesterId, date: attendanceDate });
      return;
    }

    // CASE 3: Section-specific class (Subject + Branch + Semester + Section)
    if (subjectId && branchId && semesterId && sectionId) {
      const loader = subjectType === 'regular' || !subjectType ? getStudentsForRegular : (subjectType === 'elective' || subjectType === 'lab') ? getStudentsForElective : getStudentsForOpenElective;
      runLoader(loader, {
        subject_id: subjectId,
        branch_id: branchId,
        semester_id: semesterId,
        section_id: sectionId,
        lab_batch_id: isLabSubject ? (labBatchId || undefined) : undefined,
        date: attendanceDate
      }, subjectType === 'regular');
      return;
    }
  }, [subjectId, branchId, semesterId, sectionId, labBatchId, isLabSubject, attendanceDate, subjectType, subjectStudents]);

  // When subject changes, reset branch/semester/section selections and set subject type immediately
  useEffect(() => {
    setBranchId(null);
    setSemesterId(null);
    setSectionId(null);
    setStudents([]);
    setAttendance({});
    setRecentRecords([]);
    setErrorMsg("");
    hasTriggeredAutoOpenRef.current = null;
    setSubjectStudents([]);

    if (subjectId) {
      const match = normalizedAssignments.find((a) => a.subject_id === subjectId);
      const subjType = match?.subject_type || 'regular';
      setSubjectType(subjType);
      if (subjType === 'open_elective') {
        setBootstrapParams(null);
      }
    } else {
      setSubjectType(null);
    }
  }, [subjectId, normalizedAssignments]);

  // Auto-derive branch/semester/section from faculty assignments when subject selected
  useEffect(() => {
    if (!subjectId) return;
    // Wait until subjectType is known (fetched by getSubjectDetail) to correctly
    // decide behavior for elective vs open_elective. If unknown, skip auto-derive.
    if (!subjectType) return;
    if (hasTriggeredAutoOpenRef.current === subjectId) return;
    try {
      const subjectAssignments = normalizedAssignments.filter((a) => a.subject_id === Number(subjectId));
      if (!subjectAssignments || subjectAssignments.length === 0) return;

      const uniqBranches = Array.from(new Set(subjectAssignments.map((a) => a.branch_id))).filter(Boolean);
      const uniqSemesters = Array.from(new Set(subjectAssignments.map((a) => a.semester_id))).filter(Boolean);
      const uniqSections = Array.from(new Set(subjectAssignments.map((a) => a.section_id))).filter(Boolean);

      hasTriggeredAutoOpenRef.current = subjectId;

      // Behavior by subject type:
      // - open_elective: do not auto-select anything; require manual picks
      // - elective/lab: auto-select branch & semester if unique; do NOT auto-select section (optional)
      // - regular/other: keep existing behavior (auto-select branch/semester/section when unique)
      if (subjectType === 'open_elective') {
        setTimeout(() => setIsBranchOpen(true), 150);
        return;
      }

      if (subjectType === 'elective') {
        const isBranchUnique = uniqBranches.length === 1;
        const isSemUnique = uniqSemesters.length === 1;
        if (isBranchUnique || isSemUnique) {
          if (isBranchUnique) {
            suppressBranchClearRef.current = true;
            setBranchId(uniqBranches[0]);
          }
          if (isSemUnique) {
            suppressSemesterClearRef.current = true;
            setSemesterId(uniqSemesters[0]);
          }
        }
        if (isBranchUnique && isSemUnique) {
          setTimeout(() => setIsSectionOpen(true), 150);
        } else if (isBranchUnique) {
          setTimeout(() => setIsSemesterOpen(true), 150);
        } else {
          setTimeout(() => setIsBranchOpen(true), 150);
        }
        return;
      }

      // regular, lab, or unknown subject_type: auto-select all unique values including section
      const isBranchUnique = uniqBranches.length === 1;
      const isSemUnique = uniqSemesters.length === 1;
      const isSectionUnique = uniqSections.length === 1;
      if (isBranchUnique || isSemUnique || isSectionUnique) {
        if (isBranchUnique) {
          suppressBranchClearRef.current = true;
          setBranchId(uniqBranches[0]);
        }
        if (isSemUnique) {
          suppressSemesterClearRef.current = true;
          setSemesterId(uniqSemesters[0]);
        }
        if (isSectionUnique) {
          setSectionId(uniqSections[0]);
        }
      }

      if (isBranchUnique && isSemUnique && isSectionUnique) {
        // All unique, everything is auto-selected, do nothing
      } else if (isBranchUnique && isSemUnique) {
        setTimeout(() => setIsSectionOpen(true), 150);
      } else if (isBranchUnique) {
        setTimeout(() => setIsSemesterOpen(true), 150);
      } else {
        setTimeout(() => setIsBranchOpen(true), 150);
      }
    } catch (e) {
      // ignore
    }
  }, [subjectId, subjectType, normalizedAssignments]);

  // When branch changes, clear semester & section and reset students derived from registrations
  useEffect(() => {
    if (suppressBranchClearRef.current) {
      suppressBranchClearRef.current = false;
      return;
    }
    setSemesterId(null);
    setSectionId(null);
    setStudents([]);
    // For open electives keep the subject-level registrations so branch dropdown labels remain available
    if (subjectType !== 'open_elective') {
      setSubjectStudents([]);
    }
    setAttendance({});
    setRecentRecords([]);
    setErrorMsg("");
  }, [branchId]);

  // When semester changes, clear section and refresh students derived from registrations
  useEffect(() => {
    if (suppressSemesterClearRef.current) {
      suppressSemesterClearRef.current = false;
      return;
    }
    setSectionId(null);
    setStudents([]);
    // Preserve subjectStudents for open electives to allow branch/semester dropdown derivation
    if (subjectType !== 'open_elective') {
      setSubjectStudents([]);
    }
    setAttendance({});
    setRecentRecords([]);
    setErrorMsg("");
  }, [semesterId]);




  // Dropdown options (deduplicated by id)
  // Subject-first behavior: list all subjects assigned to this faculty
  const assignedSubjects = Array.from(new Map(normalizedAssignments.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name, subject_type: a.subject_type }])).values());

  // Branch options: if subjectStudents available (subject-only bootstrap), use branches from registrations; otherwise use assignment branches
  const branchesFromAssignments = Array.from(new Map(normalizedAssignments.map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])).values());
  // If registration entries don't include branch names, fall back to assignment labels
  const branchesFromRegistrations = subjectStudents.length ? Array.from(new Map(subjectStudents.filter((s) => s.branch_id).map((s) => [s.branch_id, { id: s.branch_id, name: s.branch || branchesFromAssignments.find((b) => b.id === s.branch_id)?.name }])).values()) : [];
  // Prefer registrations-derived branches but ensure current selection remains available
  const preferredBranches = branchesFromRegistrations.length ? branchesFromRegistrations : branchesFromAssignments;
  const branches = preferredBranches.slice();
  if (branchId && !branches.find((b) => b.id === branchId)) {
    const match = branchesFromAssignments.find((b) => b.id === branchId);
    if (match) branches.unshift(match);
  }

  // Semesters: derive from subjectStudents when available for chosen branch, else fall back to assignments
  const subjectAssignments = subjectId ? normalizedAssignments.filter((a) => a.subject_id === Number(subjectId)) : [];
  const semestersFromRegistrations = subjectStudents.length && branchId ?
  Array.from(new Map(subjectStudents.filter((s) => s.branch_id === branchId && s.semester_id).map((s) => [s.semester_id, { id: s.semester_id, name: s.semester || (subjectAssignments.length ? subjectAssignments.find((a) => a.semester_id === s.semester_id)?.semester?.toString() : normalizedAssignments.find((a) => a.semester_id === s.semester_id && a.branch_id === branchId)?.semester?.toString()) }])).values()) :
  [];
  // Prefer registrations-derived semesters but ensure current selection remains available
  const preferredSemesters = semestersFromRegistrations.length ?
  semestersFromRegistrations :
  subjectAssignments.length ?
  Array.from(new Map(subjectAssignments.map((a) => [a.semester_id, { id: a.semester_id, name: a.semester.toString() }])).values()) :
  branchId ? Array.from(new Map(normalizedAssignments.filter((a) => a.branch_id === branchId).map((a) => [a.semester_id, { id: a.semester_id, name: a.semester.toString() }])).values()) : [];
  const semesters = preferredSemesters.slice();
  if (semesterId && !semesters.find((s) => s.id === semesterId)) {
    const match = subjectAssignments.length ? subjectAssignments.find((a) => a.semester_id === semesterId) : normalizedAssignments.find((a) => a.semester_id === semesterId && a.branch_id === branchId);
    if (match) semesters.unshift({ id: match.semester_id, name: match.semester.toString() });
  }

  // Sections: derive from students, subjectStudents, and assignments
  const studentRoster = students.length ? students : subjectStudents;
  const sectionsFromStudents = studentRoster.length && branchId && semesterId ?
    Array.from(new Map(studentRoster.filter((s: any) => (s.branch_id === branchId || !s.branch_id) && (s.semester_id === semesterId || !s.semester_id) && s.section_id).map((s: any) => {
      const assignLabel = normalizedAssignments.find((a) => a.section_id === s.section_id && a.branch_id === branchId && a.semester_id === semesterId)?.section;
      const label = s.section || assignLabel || `Section ${s.section_id}`;
      return [s.section_id, { id: s.section_id, name: label } as { id: number; name: string; }];
    })).values()) : [];

  const sectionsFromAssignments = (subjectId && branchId && semesterId) ?
    Array.from(new Map(normalizedAssignments.filter((a) => a.branch_id === branchId && a.semester_id === semesterId && a.section_id && (a.subject_id === Number(subjectId) || !a.subject_id)).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values()) :
    (branchId && semesterId) ?
    Array.from(new Map(normalizedAssignments.filter((a) => a.branch_id === branchId && a.semester_id === semesterId && a.section_id).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values()) : [];

  // Combine and deduplicate sections
  const preferredSectionsMap = new Map<number, { id: number; name: string }>();
  sectionsFromStudents.forEach((sec) => preferredSectionsMap.set(sec.id, sec));
  sectionsFromAssignments.forEach((sec) => {
    if (!preferredSectionsMap.has(sec.id)) {
      preferredSectionsMap.set(sec.id, sec);
    }
  });
  const sections = Array.from(preferredSectionsMap.values());
  if (sectionId && !sections.find((s) => s.id === sectionId)) {
    const match = normalizedAssignments.find((a) => a.section_id === sectionId && a.branch_id === branchId && a.semester_id === semesterId);
    if (match && match.section_id) sections.unshift({ id: match.section_id, name: match.section });
  }

  // Subjects for selection: show all assigned subjects (faculty's subjects)
  const subjects = assignedSubjects;

  const handleAttendance = (studentId: number, present: boolean) => {
    setAttendance((prev) => ({ ...prev, [studentId]: present }));
  };

  const totalCount = students.length;
  const presentCount = students.filter((s) => attendance[s.id] === true).length;
  const absentCount = students.filter((s) => attendance[s.id] === false).length;
  const notMarkedCount = students.filter((s) => attendance[s.id] === undefined).length;

  const handleOpenConfirm = () => {
    // Validation:
    // - regular: require branch, semester, section
    // - elective / lab: require branch, semester (section optional)
    // - open_elective: require subject only (branch/semester/section optional)
    if (!subjectId) return;

    // Restrict to current real-time date
    const todayStr = new Date().toLocaleDateString('sv-SE');
    if (attendanceDate !== todayStr) {
      showErrorAlert("Validation Error", "Attendance can only be taken for the current real-time date.");
      return;
    }

    if (subjectType === 'regular') {
      if (!branchId || !semesterId || !sectionId) return;
    } else if (subjectType === 'elective' || subjectType === 'lab') {
      if (!branchId || !semesterId) return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsConfirmOpen(false);
    setSubmitting(true);
    setErrorMsg("");
    try {
      const attendanceArr = students.map((s) => ({ student_id: s.id.toString(), status: !!attendance[s.id] }));
      const data: any = {
        subject_id: subjectId.toString(),
        method: "manual",
        attendance: attendanceArr
      };
      // include optional identifiers only when present
      if (branchId) data.branch_id = branchId.toString();
      if (semesterId) data.semester_id = semesterId.toString();
      if (sectionId) data.section_id = sectionId.toString();
      if (isLabSubject && labBatchId) data.lab_batch_id = labBatchId.toString();
      if (attendanceDate) data.date = attendanceDate;
      const res = await takeAttendance(data);
      if (res.success) {
        showSuccessAlert("Success", "Attendance submitted successfully!");
        setSubjectId(null); // This triggers the useEffect that clears branch, semester, section, and students
        setAttendanceDate(new Date().toLocaleDateString('sv-SE'));
      } else {
        showErrorAlert("Attendance Error", res.message || "Failed to submit attendance");
        setErrorMsg(res.message || "Failed to submit attendance");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMsg(e.message || "Failed to submit attendance");
      } else {
        setErrorMsg("Failed to submit attendance");
      }
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className={`w-full overflow-visible ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full flex flex-col`}>
          <div id="take-attendance-header-section" className="border-b border-border/50 pb-4">
            <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b mb-3">
              <div className="flex-1 min-w-0">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Take Attendance</CardTitle>
                <p className={`text-[16px] sm:text-sm mt-1${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Record student attendance for your classes</p>
              </div>
            </CardHeader>
            <CardContent className="pb-0">
              <div className="space-y-4 w-full max-w-full">
                <div id="take-attendance-selectors" className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isLabSubject ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-2.5 sm:gap-3 w-full`}>
                  <Select value={subjectId?.toString()} onValueChange={(v) => {
                    setSubjectId(Number(v));
                  }}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`}>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {subjects.length > 0 ? (
                        subjects.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                      ) : (
                        <SelectItem value="none" disabled>No subject found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={branchId?.toString()} onValueChange={(v) => {
                    setBranchId(Number(v));
                    setTimeout(() => setIsSemesterOpen(true), 150);
                  }} disabled={!subjectId} open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!subjectId}>
                      <SelectValue placeholder={translateTerminology("Select Branch")} />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {branches.length > 0 ? (
                        branches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                      ) : (
                        <SelectItem value="none" disabled>No branch found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={semesterId?.toString()} onValueChange={(v) => {
                    setSemesterId(Number(v));
                    setTimeout(() => setIsSectionOpen(true), 150);
                  }} disabled={!branchId || semesters.length === 0} open={isSemesterOpen} onOpenChange={setIsSemesterOpen}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!branchId || semesters.length === 0}>
                      <SelectValue placeholder={translateTerminology("Select Semester")} />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {semesters.length > 0 ? (
                        semesters.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                      ) : (
                        <SelectItem value="none" disabled>No semester found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={sectionId?.toString() || ""} onValueChange={(v) => setSectionId(v ? Number(v) : null)} disabled={!semesterId || sections.length === 0} open={isSectionOpen} onOpenChange={setIsSectionOpen}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!semesterId || sections.length === 0}>
                      <SelectValue placeholder={subjectType === 'elective' || subjectType === 'lab' ? "Select Section (Optional)" : "Select Section"} />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {sections.length > 0 ? (
                        sections.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                      ) : (
                        <SelectItem value="none" disabled>No section found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {isLabSubject && (
                    <Select
                      value={labBatchId ? labBatchId.toString() : ""}
                      onValueChange={(v) => setLabBatchId(v ? Number(v) : null)}
                      disabled={!subjectId || labBatches.length === 0}
                    >
                      <SelectTrigger className="w-full border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 font-semibold" disabled={!subjectId || labBatches.length === 0}>
                        <SelectValue placeholder="Select Batch" />
                      </SelectTrigger>
                      <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                        {labBatches.length > 0 ? (
                          labBatches.map((b) => (
                            <SelectItem key={b.id.toString()} value={b.id.toString()}>
                              {b.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No batch found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal px-2.5 sm:px-3 overflow-hidden min-w-0",
                          !attendanceDate && "text-muted-foreground",
                          theme === 'dark' ? 'bg-background border-input text-foreground' : 'bg-white border-gray-300 text-gray-900'
                        )}>
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate flex-1 min-w-0" title={attendanceDate ? format(parseISO(attendanceDate), "PPP") : undefined}>
                          {attendanceDate ? format(parseISO(attendanceDate), "PPP") : <span>Pick a date</span>}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={attendanceDate ? parseISO(attendanceDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setAttendanceDate(format(date, "yyyy-MM-dd"));
                            setIsCalendarOpen(false);
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const compareDate = new Date(date);
                          compareDate.setHours(0, 0, 0, 0);
                          return compareDate.getTime() !== today.getTime();
                        }}
                        initialFocus
                        className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'} />
                      
                    </PopoverContent>
                  </Popover>
                </div>

                {recentRecords.length > 0 &&
                <div className={`p-3 rounded-md flex items-center justify-between ${theme === 'dark' ? 'bg-muted/50 border border-border' : 'bg-blue-50 border border-blue-100'}`}>
                    <div className="text-sm font-medium">
                      Daily Sessions for {attendanceDate}: <span className="text-primary font-bold">{recentRecords.filter((r) => r.date === attendanceDate).length} / 3</span>
                    </div>
                    {recentRecords.filter((r) => r.date === attendanceDate).length >= 3 &&
                  <div className="text-xs text-red-500 font-semibold animate-pulse">Daily limit reached!</div>
                  }
                  </div>
                }
              </div>
            </CardContent>
          </div>

          <CardContent className="pt-4">
            {loadingStudents ?
            <div className="mt-4 space-y-4">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                  {/* Glowing outer ring */}
                  <div className="absolute inset-0 rounded-full bg-primary/25 animate-ping duration-1000"></div>
                  {/* Main gradient pulsing circle */}
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-600 text-white shadow-lg shadow-primary/30 animate-pulse">
                    <UsersIcon className="w-8 h-8 animate-bounce duration-1000" />
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent animate-pulse mb-2">
                  Loading Students...
                </h3>
                <p className={`text-sm max-w-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Please wait a moment while we retrieve the class roster.
                </p>
              </div>
            </div> :
            students.length > 0 ?
            <div id="take-attendance-roster" className={`border rounded-md mt-4 w-full max-w-full overflow-hidden min-h-0 ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-white'}`}>
                <div className={`p-3 sm:p-4 font-semibold border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Student Attendance</div>

                {/* Scrollable area - ONLY the table lives inside this (mobile-only max height) */}
                <div className="overflow-y-auto w-full overscroll-contain min-h-0 max-h-[50vh] md:max-h-none md:overflow-visible" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm sm:text-base">
                      <thead className={theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}>
                        <tr>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} sm:hidden`}>Student</th>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} hidden sm:table-cell`}>#</th>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} hidden sm:table-cell`}>{translateTerminology("USN")}</th>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} hidden sm:table-cell`}>Name</th>
                          <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, idx) =>
                      <tr
                        key={s.id}
                        className={`border-t ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                        
                            {/* Mobile stacked student cell */}
                            <td className="px-3 py-3 sm:hidden w-[60%] align-middle">
                              <div className="text-sm font-medium">{s.usn}</div>
                              <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-505'}`}>{s.name}</div>
                            </td>
                            <td className="px-4 py-3 text-sm sm:text-base hidden sm:table-cell">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium text-sm sm:text-base hidden sm:table-cell">{s.usn}</td>
                            <td className="px-4 py-3 text-sm sm:text-base break-words truncate hidden sm:table-cell">{s.name}</td>
                            <td className="px-3 py-3 w-[40%] sm:w-auto align-middle">
                              <div className="flex items-center gap-2 justify-end sm:justify-start">
                                <button
                               onClick={() => handleAttendance(s.id, true)}
                               className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 ${attendance[s.id] === true ?
                               theme === 'dark' ?
                               "bg-green-500/20 text-green-400 border-2 border-green-500/50" :
                               "bg-green-100 text-green-600 border-2 border-green-200" :
                               theme === 'dark' ?
                               "bg-muted text-muted-foreground hover:bg-green-500/10 hover:text-green-400 border border-border" :
                               "bg-gray-100 text-gray-505 hover:bg-green-50 hover:text-green-600 border border-gray-200"}`
                               }
                               title="Mark Present">
                               
                                  <Check size={16} />
                                </button>
                                <button
                               onClick={() => handleAttendance(s.id, false)}
                               className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 ${attendance[s.id] === false ?
                               theme === 'dark' ?
                               "bg-red-500/20 text-red-400 border-2 border-red-500/50" :
                               "bg-red-100 text-red-600 border-2 border-red-200" :
                               theme === 'dark' ?
                               "bg-muted text-muted-foreground hover:bg-red-50/10 hover:text-red-400 border border-border" :
                               "bg-gray-100 text-gray-505 hover:bg-red-50 hover:text-red-600 border border-gray-200"}`
                               }
                               title="Mark Absent">
                               
                                  <X size={16} />
                                </button>
                                <div className="ml-2 text-xs sm:text-sm hidden sm:inline-block">
                                  {attendance[s.id] === true ?
                                    <span className={`inline-block w-24 text-center px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>Present</span> :
                                    attendance[s.id] === false ?
                                    <span className={`inline-block w-24 text-center px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'}`}>Absent</span> :
                                    <span className={`inline-block w-24 text-center px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-500'}`}>Not marked</span>
                                  }
                                </div>
                              </div>
                            </td>
                          </tr>
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fixed controls outside scroll area */}
                <div className="p-3 sm:p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div className={`text-sm sm:text-base font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      <span>{totalCount} Total</span>
                      <span className="mx-2 text-muted-foreground/40">|</span>
                      <span className="text-green-600 dark:text-green-400">{presentCount} Present</span>
                      <span className="mx-2 text-muted-foreground/40">|</span>
                      <span className="text-red-600 dark:text-red-400">{absentCount} Absent</span>
                      <span className="mx-2 text-muted-foreground/40">|</span>
                      <span className="text-amber-600 dark:text-amber-500">{notMarkedCount} Not Marked</span>
                      {notMarkedCount > 0 && (
                        <>
                          <span className="mx-2 text-red-500">→</span>
                          <span className="text-red-500 font-bold animate-pulse">{notMarkedCount} will be marked Absent.</span>
                        </>
                      )}
                    </div>
                    <Button
                      id="take-attendance-submit"
                      onClick={handleOpenConfirm}
                      disabled={submitting || recentRecords.filter((r) => r.date === attendanceDate).length >= 3}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base font-medium px-4 py-2 rounded-md transition bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-md"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        "Submit Attendance"
                      )}
                    </Button>
                  </div>
                </div>
              </div> :

            <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-6 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`
            }>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <UsersIcon className="w-12 h-12 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Ready to take attendance?</h3>
                <p className="max-w-xs text-base leading-relaxed">
                  Select your <span className="font-semibold text-primary">subject</span> and <span className="font-semibold text-primary">class details</span> above to load the student roster.
                </p>
              </div>
            }
          </CardContent>

      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className={`w-[90%] max-h-[80vh] overflow-y-auto rounded-lg sm:w-full sm:max-w-md ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader className="text-center sm:text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-amber-300 dark:border-amber-700/50 flex items-center justify-center mb-2">
              <span className="text-amber-500 dark:text-amber-400 text-3xl font-bold font-sans">!</span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">Confirm Submission</DialogTitle>
            <DialogDescription className="mt-2 text-center text-sm text-muted-foreground">
              Are you sure you want to submit the student attendance for this class?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="py-3 px-4 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/80 text-sm md:text-base font-semibold leading-relaxed text-center">
              <span>{totalCount} Total</span>
              <span className="mx-2 text-muted-foreground/40">|</span>
              <span className="text-green-600 dark:text-green-400">{presentCount} Present</span>
              <span className="mx-2 text-muted-foreground/40">|</span>
              <span className="text-red-600 dark:text-red-400">{absentCount} Absent</span>
              <span className="mx-2 text-muted-foreground/40">|</span>
              <span className="text-amber-600 dark:text-amber-500">{notMarkedCount} Not Marked</span>
              
              {notMarkedCount > 0 && (
                <div className="mt-2.5 text-red-500 dark:text-red-400 text-sm font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                  <span>⚠️</span>
                  <span>{notMarkedCount} will be marked Absent.</span>
                </div>
              )}
            </div>
            {notMarkedCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-500 italic text-center mt-2.5">
                * Unmarked students are automatically recorded as Absent on submission.
              </p>
            )}
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2 gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
            >
              Yes, Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeAttendance;