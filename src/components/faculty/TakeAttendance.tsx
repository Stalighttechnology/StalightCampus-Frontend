import { useEffect, useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter } from
"../ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger } from
"../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"../ui/select";
import { Button } from "../ui/button";
import { Check, X, UploadCloud } from "lucide-react";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getSubjectDetail, takeAttendance, aiAttendance, getStudentsForRegular, getStudentsForElective, getStudentsForOpenElective, FacultyAssignment, ClassStudent, GetTakeAttendanceBootstrapResponse } from "@/utils/faculty_api";
import { useFacultyAssignmentsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { AdminPagination } from "../common/AdminPagination";
import { usePagination } from "@/hooks/useOptimizations";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format, parseISO } from "date-fns";
import { CalendarIcon, UserCheck, Search, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccessAlert, showErrorAlert } from "@/utils/sweetalert";

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

  const { page, pageSize, paginationState, updatePagination, goToPage } = usePagination({
    queryKey: ['takeAttendance'],
    pageSize: 50
  });

  const [attendance, setAttendance] = useState<{[studentId: number]: boolean;}>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentRecords, setRecentRecords] = useState<GetTakeAttendanceBootstrapResponse['data']['recent_records']>([]);
  const [aiPhoto, setAiPhoto] = useState<File | null>(null);
  const [aiResults, setAiResults] = useState<any>(null);
  const [subjectType, setSubjectType] = useState<string | null>(null);
  const [processingAI, setProcessingAI] = useState(false);
  const [lastBootstrapParams, setLastBootstrapParams] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  const [activeTab, setActiveTab] = useState<string>("manual");

  // Simple debounced value hook to avoid rapid-fire API calls when user changes selections
  const useDebounced = <T,>(value: T, delay = 300) => {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
  };
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
        if (response.data.pagination || response.data.count) {
          updatePagination(response.data);
        } else {
          updatePagination({ pagination: { page: 1, page_size: 50, total_pages: 1, total_students: studentsArr.length } });
        }
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

  const debouncedPage = useDebounced(page, 300);
  const debouncedPageSize = useDebounced(pageSize, 300);

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
      page: debouncedPage,
      page_size: debouncedPageSize,
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

    // CASE 0: Elective (Branch + Semester + Subject, section optional)
    if (subjectId && branchId && semesterId && subjectType === 'elective') {
      runLoader(getStudentsForElective, { subject_id: subjectId, branch_id: branchId, semester_id: semesterId, section_id: sectionId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate });
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
      runLoader(loader, { subject_id: subjectId, branch_id: branchId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate });
      return;
    }

    // CASE 2b: Branch + Semester selected (section optional)
    if (subjectId && branchId && semesterId && !sectionId) {
      if (subjectType === 'elective') {
        // Elective requires semester selection; call elective loader
        runLoader(getStudentsForElective, { subject_id: subjectId, branch_id: branchId, semester_id: semesterId, page: debouncedPage, page_size: debouncedPageSize });
        return;
      }

      // For open_elective and regular subjects: require section selection before loading students
      if (subjectType === 'open_elective' || subjectType === 'regular' || !subjectType) return;

      // Regular subject fallback or other: call regular loader
      const loader = getStudentsForRegular;
      runLoader(loader, { subject_id: subjectId, branch_id: branchId, semester_id: semesterId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate });
      return;
    }

    // CASE 3: Section-specific class (Subject + Branch + Semester + Section)
    if (subjectId && branchId && semesterId && sectionId) {
      const loader = subjectType === 'regular' || !subjectType ? getStudentsForRegular : subjectType === 'elective' ? getStudentsForElective : getStudentsForOpenElective;
      runLoader(loader, { subject_id: subjectId, branch_id: branchId, semester_id: semesterId, section_id: sectionId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate }, subjectType === 'regular');
      return;
    }
  }, [subjectId, branchId, semesterId, sectionId, debouncedPage, debouncedPageSize, attendanceDate, subjectType, subjectStudents]);

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
        updatePagination({ pagination: { page: 1, page_size: 50, total_pages: 1, total_students: 0 } });
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
      // - elective: auto-select branch & semester if unique; do NOT auto-select section (optional)
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

      // regular or unknown subject_type: auto-select all unique values including section
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


    }
  }, [subjectId, normalizedAssignments, subjectType]);

  // When branch changes, clear dependent selections so the UI recomputes semesters/sections
  useEffect(() => {
    // If this change was triggered by auto-derive, skip clearing once
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

  // When page or pageSize changes, re-fetch current bootstrap results if any
  useEffect(() => {
    if (!bootstrapParams || !bootstrapParams.subject_id) return;
    const params = { ...bootstrapParams, page, page_size: pageSize };
    // Avoid duplicate reloads when the params equal the last bootstrap params
    try {
      if (lastBootstrapParamsRef.current && JSON.stringify(params) === JSON.stringify(lastBootstrapParamsRef.current)) {

        return;
      }
    } catch (e) {

      // Fallback: if JSON stringify fails for any reason, continue with reload
    } // Choose loader based on subjectType so we call the correct endpoint
    const loader = subjectType === 'elective' ?
    getStudentsForElective :
    subjectType === 'open_elective' ? getStudentsForOpenElective : getStudentsForRegular;

    // Use runLoader (dedupes in-flight requests). If this is a subject-only bootstrap (no branch_id),
    // update `subjectStudents` from the response so downstream UI uses registration-derived branches/semesters.
    runLoader(loader, params, subjectType === 'regular').
    then((response: any) => {
      if (response && response.success && response.data) {
        if (!params.branch_id) {
          setSubjectStudents(response.data.students || []);
        }
      }
    }).
    catch(() => {});
  }, [page, pageSize, bootstrapParams]);



  // Dropdown options (deduplicated by id)
  // Subject-first behavior: list all subjects assigned to this faculty
  const assignedSubjects = Array.from(new Map(normalizedAssignments.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values());

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

  // Sections: derive from subjectStudents when available for chosen branch+semester, else fall back to assignments
  const sectionsFromRegistrations = subjectStudents.length && branchId && semesterId ?
  Array.from(new Map(subjectStudents.filter((s) => s.branch_id === branchId && s.semester_id === semesterId && s.section_id).map((s) => {
    const assignLabel = normalizedAssignments.find((a) => a.section_id === s.section_id && a.branch_id === branchId && a.semester_id === semesterId)?.section;
    const label = s.section || assignLabel || `Section ${s.section_id}`;
    return [s.section_id, { id: s.section_id, name: label } as {id: number;name: string;}];
  })).values()) :
  [];
  let sectionsPreferred: {id: number;name: string;}[] = [];
  if (subjectType === 'elective') {
    // For elective subjects prefer the sections present in student registrations
    sectionsPreferred = sectionsFromRegistrations.slice();
  } else {
    sectionsPreferred = sectionsFromRegistrations.length ?
    sectionsFromRegistrations :
    subjectId && branchId && semesterId && subjectType === 'elective' ?
    Array.from(new Map(normalizedAssignments.filter((a) => a.branch_id === branchId && a.semester_id === semesterId).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values()) :
    subjectId && branchId && semesterId ?
    Array.from(new Map(normalizedAssignments.filter((a) => a.subject_id === Number(subjectId) && a.branch_id === branchId && a.semester_id === semesterId).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values()) :
    branchId && semesterId ? Array.from(new Map(normalizedAssignments.filter((a) => a.branch_id === branchId && a.semester_id === semesterId).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values()) : [];
  }
  const sections = sectionsPreferred.slice();
  if (sectionId && !sections.find((s) => s.id === sectionId)) {
    const match = normalizedAssignments.find((a) => a.section_id === sectionId && a.branch_id === branchId && a.semester_id === semesterId);
    if (match) sections.unshift({ id: match.section_id, name: match.section });
  }

  // Subjects for selection: show all assigned subjects (faculty's subjects)
  const subjects = assignedSubjects;

  const handleAttendance = (studentId: number, present: boolean) => {
    setAttendance((prev) => ({ ...prev, [studentId]: present }));
  };

  const handleSubmit = async () => {
    // Validation:
    // - regular: require branch, semester, section
    // - elective: require branch, semester (section optional)
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
    } else if (subjectType === 'elective') {
      if (!branchId || !semesterId) return;
    }
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

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAiPhoto(file);
      setAiResults(null);
      setErrorMsg("");
    }
  };

  const handleAIProcess = async () => {
    if (!branchId || !semesterId || !sectionId || !subjectId || !aiPhoto) return;

    // Restrict to current real-time date
    const todayStr = new Date().toLocaleDateString('sv-SE');
    if (attendanceDate !== todayStr) {
      showErrorAlert("Validation Error", "Attendance can only be taken for the current real-time date.");
      return;
    }

    setProcessingAI(true);
    setErrorMsg("");
    try {
      const res = await aiAttendance({
        branch_id: branchId.toString(),
        semester_id: semesterId.toString(),
        section_id: sectionId.toString(),
        subject_id: subjectId.toString(),
        photo: aiPhoto,
        date: attendanceDate
      });
      if (res.success) {
        setAiResults(res.data);
        showSuccessAlert("Success", "AI attendance processed successfully!");
      } else {
        showErrorAlert("AI Error", res.message || "Failed to process AI attendance");
        setErrorMsg(res.message || "Failed to process AI attendance");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMsg(e.message || "Failed to process AI attendance");
      } else {
        setErrorMsg("Failed to process AI attendance");
      }
    } finally {
      setProcessingAI(false);
    }
  };

  return (
    <div className={`w-full overflow-visible ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full flex flex-col`}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div id="take-attendance-header-section" className="border-b border-border/50 pb-4">
            <CardHeader>
              <CardTitle>Take Attendance</CardTitle>
              <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Record student attendance for your classes</CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
              <div className="space-y-4 w-full max-w-full">
                <div id="take-attendance-selectors" className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-5 w-full">
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
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No subject
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={branchId?.toString()} onValueChange={(v) => {
                    setBranchId(Number(v));
                    setTimeout(() => setIsSemesterOpen(true), 150);
                  }} disabled={!subjectId} open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!subjectId}>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {branches.length > 0 ? (
                        branches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No branch
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={semesterId?.toString()} onValueChange={(v) => {
                    setSemesterId(Number(v));
                    setTimeout(() => setIsSectionOpen(true), 150);
                  }} disabled={!branchId || semesters.length === 0} open={isSemesterOpen} onOpenChange={setIsSemesterOpen}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!branchId || semesters.length === 0}>
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {semesters.length > 0 ? (
                        semesters.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No semester
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={sectionId?.toString() || ""} onValueChange={(v) => setSectionId(v ? Number(v) : null)} disabled={!semesterId || sections.length === 0} open={isSectionOpen} onOpenChange={setIsSectionOpen}>
                    <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!semesterId || sections.length === 0}>
                      <SelectValue placeholder={subjectType === 'elective' ? "Select Section (Optional)" : "Select Section"} />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                      {sections.length > 0 ? (
                        sections.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No section
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !attendanceDate && "text-muted-foreground",
                          theme === 'dark' ? 'bg-background border-input text-foreground' : 'bg-white border-gray-300 text-gray-900'
                        )}>
                        
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {attendanceDate ? format(parseISO(attendanceDate), "PPP") : <span>Pick a date</span>}
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

                <TabsList className={`inline-flex h-10 items-center justify-start gap-2 rounded-md p-1 overflow-auto ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-500'}`}>
                  <TabsTrigger
                    value="manual"
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm ${theme === 'dark' ?
                    'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground' :
                    'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900'}`}>
                    
                    Manual Entry
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm ${theme === 'dark' ?
                    'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground' :
                    'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900'}`}>
                    
                    AI Processing
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardContent>
          </div>

          <CardContent className="pt-4">
            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="mt-0">
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
                            <th className={`text-left px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} hidden sm:table-cell`}>USN</th>
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
                              <td className="px-3 py-3 sm:hidden w-[65%] align-top">
                                <div className="text-sm font-medium">{s.usn}</div>
                                <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{s.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm sm:text-base hidden sm:table-cell">{idx + 1}</td>
                              <td className="px-4 py-3 font-medium text-sm sm:text-base hidden sm:table-cell">{s.usn}</td>
                              <td className="px-4 py-3 text-sm sm:text-base break-words truncate hidden sm:table-cell">{s.name}</td>
                              <td className="px-3 py-3 w-[35%] align-top">
                                <div className="flex items-center gap-2 flex-wrap justify-end sm:justify-start">
                                  <button
                                 onClick={() => handleAttendance(s.id, true)}
                                 className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 ${attendance[s.id] === true ?
                                 theme === 'dark' ?
                                 "bg-green-500/20 text-green-400 border-2 border-green-500/50" :
                                 "bg-green-100 text-green-600 border-2 border-green-200" :
                                 theme === 'dark' ?
                                 "bg-muted text-muted-foreground hover:bg-green-500/10 hover:text-green-400 border border-border" :
                                 "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600 border border-gray-200"}`
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
                                 "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200"}`
                                 }
                                 title="Mark Absent">
                                 
                                    <X size={16} />
                                  </button>
                                  <div className="ml-2 text-xs sm:text-sm">
                                    {attendance[s.id] === true ?
                                <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>Present</span> :
                                attendance[s.id] === false ?
                                <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'}`}>Absent</span> :

                                <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-500'}`}>Not marked</span>
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
                      <div className={`text-sm sm:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {Object.keys(attendance).filter((key) => attendance[Number(key)] === true).length} Present,{" "}
                        {Object.keys(attendance).filter((key) => attendance[Number(key)] === false).length} Absent
                      </div>
                      <Button
                        id="take-attendance-submit"
                        onClick={handleSubmit}
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
            </TabsContent>

            {/* AI Tab */}
            <TabsContent value="ai" id="take-attendance-ai-panel" className="mt-0">
              {students.length > 0 ?
              <div className="mt-4 space-y-6 w-full max-w-full text-sm">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Column: Upload Dropzone & Trigger Action */}
                  <div className={`lg:col-span-7 p-6 border rounded-2xl flex flex-col justify-between ${theme === 'dark' ? 'border-border bg-card/60' : 'border-gray-200 bg-white shadow-sm'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-4 border-b pb-3 border-border/40">
                        <UsersIcon className="w-5 h-5 text-primary" />
                        <h4 className="text-base font-semibold">AI Recognition Portal</h4>
                      </div>

                      {/* Dropzone area */}
                      <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${aiPhoto ? (theme === 'dark' ? 'border-primary/50 bg-primary/5' : 'border-primary/40 bg-blue-50/30') : (theme === 'dark' ? 'border-border bg-muted/20 hover:border-primary/45' : 'border-gray-200 bg-gray-50/50 hover:border-primary/40')}`}>
                        <div className={`p-4 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <h5 className="font-semibold text-sm mb-1">Upload Class Image</h5>
                        <p className={`text-xs text-center max-w-xs mb-5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Mark attendance using automatic face recognition
                        </p>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload" />

                        <label
                          htmlFor="photo-upload"
                          className={`px-5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-all shadow-sm ${aiPhoto ? 
                          (theme === 'dark' ? 'border-primary bg-primary text-white hover:bg-primary/90' : 'border-primary bg-primary text-white hover:bg-primary/95') : 
                          (theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100')}`}>
                          {aiPhoto ? aiPhoto.name : 'Choose Image File'}
                        </label>
                      </div>
                    </div>

                    {/* Process Action */}
                    <div className="mt-6">
                      <Button
                        onClick={handleAIProcess}
                        disabled={processingAI || !aiPhoto || recentRecords.filter((r) => r.date === attendanceDate).length >= 3}
                        className="w-full py-5 flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white shadow-md shadow-primary/20 transition-all rounded-xl border-none">
                        {processingAI ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Analyzing Face Data...
                          </>
                        ) : (
                          "Start AI Processing"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Guides & Steps */}
                  <div className={`lg:col-span-5 p-6 border rounded-2xl ${theme === 'dark' ? 'border-border bg-card/60' : 'border-gray-200 bg-white shadow-sm'}`}>
                    <h4 className="font-semibold text-base mb-4 border-b pb-2 border-border/40">How it works:</h4>
                    <div className="space-y-4">
                      {[
                        "Take a clear, high-resolution photo of your entire active class.",
                        "Upload the image in the portal using the Choose Image File button.",
                        "Our system automatically matches student faces with database encodings.",
                        "Review and confirm the identified roster before submitting attendance."
                      ].map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm shadow-primary/10">
                            {idx + 1}
                          </div>
                          <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-650'}`}>
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Results Section */}
                {aiResults && (
                  <div className={`mt-6 p-4 rounded-xl border ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>AI Processing Results:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      <div className={`p-4 rounded-xl border text-center ${theme === 'dark' ? 'bg-background border-border/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="text-3xl font-extrabold text-green-500 mb-1">{aiResults.present_count}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-505'}`}>Present</div>
                      </div>
                      <div className={`p-4 rounded-xl border text-center ${theme === 'dark' ? 'bg-background border-border/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="text-3xl font-extrabold text-red-500 mb-1">{aiResults.absent_count}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-505'}`}>Absent</div>
                      </div>
                      <div className={`p-4 rounded-xl border text-center ${theme === 'dark' ? 'bg-background border-border/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="text-3xl font-extrabold text-primary mb-1">{aiResults.total_students}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-505'}`}>Total Students</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className={`font-semibold text-xs mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Present Students:</h5>
                        <div className={`max-h-40 overflow-y-auto p-3 rounded-lg border ${theme === 'dark' ? 'bg-background/80 border-border/40' : 'bg-white border-gray-100'}`}>
                          {aiResults.present_students.length > 0 ? (
                            aiResults.present_students.map((student: any) => (
                              <div key={student.id} className="text-xs py-1 border-b border-border/10 last:border-none">
                                {student.name} ({student.usn})
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground text-center py-4">No students detected as present</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className={`font-semibold text-xs mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Absent Students:</h5>
                        <div className={`max-h-40 overflow-y-auto p-3 rounded-lg border ${theme === 'dark' ? 'bg-background/80 border-border/40' : 'bg-white border-gray-100'}`}>
                          {aiResults.absent_students.length > 0 ? (
                            aiResults.absent_students.map((student: any) => (
                              <div key={student.id} className="text-xs py-1 border-b border-border/10 last:border-none">
                                {student.name} ({student.usn})
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground text-center py-4">All students detected as present</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div> :

              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-6 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`
              }>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <UsersIcon className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    Please select your <span className="font-semibold text-primary">subject</span> and <span className="font-semibold text-primary">class details</span> above to load students for AI processing.
                  </p>
                </div>
              }
            </TabsContent>
          </CardContent>
        </Tabs>
        {activeTab === "manual" && paginationState && paginationState.totalItems > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {paginationState.totalItems === 0 ? 0 : (paginationState.page - 1) * paginationState.pageSize + 1} to {Math.min(paginationState.page * paginationState.pageSize, paginationState.totalItems)} of {paginationState.totalItems} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(Math.max(1, paginationState.page - 1))}
                disabled={paginationState.page <= 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {paginationState.page}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(Math.min(paginationState.totalPages, paginationState.page + 1))}
                disabled={paginationState.page >= paginationState.totalPages}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default TakeAttendance;