import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Check, X, UploadCloud } from "lucide-react";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getSubjectDetail, takeAttendance, aiAttendance, getStudentsForRegular, getStudentsForElective, getStudentsForOpenElective, FacultyAssignment, ClassStudent, GetTakeAttendanceBootstrapResponse } from "@/utils/faculty_api";
import { useFacultyAssignmentsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";

const TakeAttendance = () => {
  const { toast } = useToast();
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useFacultyAssignmentsQuery();
  // Normalize assignment IDs to numbers to avoid string/number mismatch from backend
  const normalizedAssignments = assignments.map(a => ({
    ...a,
    subject_id: a.subject_id ? Number(a.subject_id) : null,
    branch_id: a.branch_id ? Number(a.branch_id) : null,
    semester_id: a.semester_id ? Number(a.semester_id) : null,
    section_id: a.section_id ? Number(a.section_id) : null,
  }));
  const { theme } = useTheme();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [subjectStudents, setSubjectStudents] = useState<any[]>([]); // students returned for subject-only bootstrap
  const [bootstrapParams, setBootstrapParams] = useState<any | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<{ [studentId: number]: boolean }>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentRecords, setRecentRecords] = useState<GetTakeAttendanceBootstrapResponse['data']['recent_records']>([]);
  const [aiPhoto, setAiPhoto] = useState<File | null>(null);
  const [aiResults, setAiResults] = useState<any>(null);
  const [subjectType, setSubjectType] = useState<string | null>(null);
  const [processingAI, setProcessingAI] = useState(false);
  const [lastBootstrapParams, setLastBootstrapParams] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  // Central runLoader function (moved to component scope so multiple effects can use it)
  const runLoader = (loader: any, paramsObj: any, mapStudents: boolean = true) => {
    setLoadingStudents(true);
    const params: any = makeParams(paramsObj);
    // Prevent duplicate calls by comparing against lastBootstrapParams (use ref for synchronous check)
    if (lastBootstrapParamsRef.current && JSON.stringify(params) === JSON.stringify(lastBootstrapParamsRef.current)) {
      setLoadingStudents(false);
      return Promise.resolve();
    }
    setLastBootstrapParams(params);
    lastBootstrapParamsRef.current = params;
    setBootstrapParams(params);

    // Use a key to dedupe identical in-flight requests
    const key = JSON.stringify(params);
    console.debug("runLoader start", key, params);
    const existing = inFlightRequests.current.get(key);
    if (existing) {
      // Return the existing promise so callers share the same network request
      console.debug("Deduping student-list request", key);
      console.trace();
      return existing;
    }

    const p = loader(params)
      .then((response: any) => {
        if (response && response.success && response.data) {
          const studentsArr = response.data.students || [];
          if (mapStudents) {
            setStudents(studentsArr.map((s: any) => ({ id: s.id, name: s.name, usn: s.usn })));
          } else {
            setStudents(studentsArr);
          }
          setRecentRecords(response.data.recent_records || []);
          if (response.data.pagination) {
            setPage(response.data.pagination.page);
            setPageSize(response.data.pagination.page_size);
            setTotalPages(response.data.pagination.total_pages);
            setTotalStudentsCount(response.data.pagination.total_students);
          } else {
            setTotalPages(1);
            setTotalStudentsCount(studentsArr.length || 0);
          }
        } else {
          setErrorMsg(response?.message || "Failed to load data");
        }
        return response;
      })
      .catch((e: any) => {
        setErrorMsg(e?.message || "Failed to load data");
        throw e;
      })
      .finally(() => {
        setLoadingStudents(false);
        inFlightRequests.current.delete(key);
      });

    inFlightRequests.current.set(key, p);
    return p;
  };

  const debouncedSubjectId = useDebounced(subjectId, 300);
  const debouncedBranchId = useDebounced(branchId, 300);
  const debouncedSemesterId = useDebounced(semesterId, 300);
  const debouncedSectionId = useDebounced(sectionId, 300);
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

  // Reset selections and load students when debounced subject or class selection changes
  useEffect(() => {
    setStudents([]);
    setAttendance({});
    setRecentRecords([]);
    setErrorMsg("");

    if (!debouncedSubjectId) return;



    // CASE 0: Elective (Branch + Semester + Subject, section optional)
    if (debouncedSubjectId && debouncedBranchId && debouncedSemesterId && subjectType === 'elective') {
      runLoader(getStudentsForElective, { subject_id: debouncedSubjectId, branch_id: debouncedBranchId, semester_id: debouncedSemesterId, section_id: debouncedSectionId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate });
      return;
    }

    // CASE 1: Combined class (Subject only)
    if (debouncedSubjectId && !debouncedBranchId) {
      if (subjectStudents.length) {
        const mapped = subjectStudents.map(s => ({ id: s.id, name: s.name, usn: s.usn }));
        setStudents(mapped);
        // recentRecords already set by subject-only bootstrap
      }
      return;
    }

    // CASE 2: Branch-specific class (Subject + Branch)
    if (debouncedSubjectId && debouncedBranchId && !debouncedSemesterId && !debouncedSectionId) {
      // For elective subjects we require semester selection before calling the elective endpoint
      if (subjectType === 'elective') return;

      // For open_elective we DO NOT load students on branch-only selection; require branch+semester+section
      if (subjectType === 'open_elective') return;

      // Regular subject: call regular loader
      const loader = getStudentsForRegular;
      runLoader(loader, { subject_id: debouncedSubjectId, branch_id: debouncedBranchId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate });
      return;
    }

    // CASE 2b: Branch + Semester selected (section optional)
    if (debouncedSubjectId && debouncedBranchId && debouncedSemesterId && !debouncedSectionId) {
      if (subjectType === 'elective') {
        // Elective requires semester selection; call elective loader
        runLoader(getStudentsForElective, { subject_id: debouncedSubjectId, branch_id: debouncedBranchId, semester_id: debouncedSemesterId, page: debouncedPage, page_size: debouncedPageSize });
        return;
      }

      // For open_elective: still require section selection before loading students
      if (subjectType === 'open_elective') return;

      // Regular subject: call regular loader
      const loader = getStudentsForRegular;
      runLoader(loader, { subject_id: debouncedSubjectId, branch_id: debouncedBranchId, semester_id: debouncedSemesterId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate });
      return;
    }

    // CASE 3: Section-specific class (Subject + Branch + Semester + Section)
    if (debouncedSubjectId && debouncedBranchId && debouncedSemesterId && debouncedSectionId) {
      const loader = subjectType === 'regular' || !subjectType ? getStudentsForRegular : (subjectType === 'elective' ? getStudentsForElective : getStudentsForOpenElective);
      runLoader(loader, { subject_id: debouncedSubjectId, branch_id: debouncedBranchId, semester_id: debouncedSemesterId, section_id: debouncedSectionId, page: debouncedPage, page_size: debouncedPageSize, date: attendanceDate }, subjectType === 'regular');
      return;
    }
  }, [debouncedSubjectId, debouncedBranchId, debouncedSemesterId, debouncedSectionId, debouncedPage, debouncedPageSize, attendanceDate]);

  // When subject changes, reset branch/semester/section selections
  useEffect(() => {
    setBranchId(null);
    setSemesterId(null);
    setSectionId(null);
    setStudents([]);
    setAttendance({});
    setRecentRecords([]);
    setErrorMsg("");
  }, [subjectId]);

  // Auto-derive branch/semester/section from faculty assignments when subject selected
  useEffect(() => {
    if (!subjectId) return;
    // Wait until subjectType is known (fetched by getSubjectDetail) to correctly
    // decide behavior for elective vs open_elective. If unknown, skip auto-derive.
    if (!subjectType) return;
    try {
      const subjectAssignments = normalizedAssignments.filter(a => a.subject_id === Number(subjectId));
      if (!subjectAssignments || subjectAssignments.length === 0) return;

      const uniqBranches = Array.from(new Set(subjectAssignments.map(a => a.branch_id))).filter(Boolean);
      const uniqSemesters = Array.from(new Set(subjectAssignments.map(a => a.semester_id))).filter(Boolean);
      const uniqSections = Array.from(new Set(subjectAssignments.map(a => a.section_id))).filter(Boolean);

      // Behavior by subject type:
      // - open_elective: do not auto-select anything; require manual picks
      // - elective: auto-select branch & semester if unique; do NOT auto-select section (optional)
      // - regular/other: keep existing behavior (auto-select branch/semester/section when unique)
      if (subjectType === 'open_elective') {
        return;
      }

      if (subjectType === 'elective') {
        if (uniqBranches.length === 1 || uniqSemesters.length === 1) {
          suppressBranchClearRef.current = true;
          if (uniqBranches.length === 1) setBranchId(uniqBranches[0]);
          if (uniqSemesters.length === 1) setSemesterId(uniqSemesters[0]);
        }
        return;
      }

      // regular or unknown subject_type: auto-select all unique values including section
      if (uniqBranches.length === 1 || uniqSemesters.length === 1 || uniqSections.length === 1) {
        suppressBranchClearRef.current = true;
        if (uniqBranches.length === 1) setBranchId(uniqBranches[0]);
        if (uniqSemesters.length === 1) setSemesterId(uniqSemesters[0]);
        if (uniqSections.length === 1) setSectionId(uniqSections[0]);
      }
    } catch (e) {
      // non-fatal
      console.warn('Auto-derive subject -> branch/sem failed', e);
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
        console.debug('Skipping page reload; params equal lastBootstrapParamsRef', params);
        return;
      }
    } catch (e) {
      // Fallback: if JSON stringify fails for any reason, continue with reload
    }
    // Choose loader based on subjectType so we call the correct endpoint
    const loader = subjectType === 'elective'
      ? getStudentsForElective
      : (subjectType === 'open_elective' ? getStudentsForOpenElective : getStudentsForRegular);

    // Use runLoader (dedupes in-flight requests). If this is a subject-only bootstrap (no branch_id),
    // update `subjectStudents` from the response so downstream UI uses registration-derived branches/semesters.
    runLoader(loader, params, subjectType === 'regular')
      .then((response: any) => {
        if (response && response.success && response.data) {
          if (!params.branch_id) {
            setSubjectStudents(response.data.students || []);
          }
        }
      })
      .catch(() => { });
  }, [page, pageSize, bootstrapParams]);

  // When a subject is selected, fetch subject detail first. For open electives, fetch subject-only bootstrap to discover available registrations.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSubjectStudents([]);
      if (!subjectId) return;
      setLoadingStudents(true);
      try {
        const subjRes = await getSubjectDetail(subjectId.toString());
        if (cancelled) return;
        if (subjRes.success && subjRes.data) {
          const subjType = subjRes.data.subject_type;
          setSubjectType(subjType);
          if (subjType === 'open_elective') {
            // For open electives: do NOT load students on subject-only selection.
            // Wait for faculty to pick branch (and optionally semester/section) before loading.
            setSubjectStudents([]);
            setRecentRecords([]);
            setBootstrapParams(null);
            setTotalPages(1);
            setTotalStudentsCount(0);
          } else {
            // normal subject: do not call subject-only bootstrap; wait for branch/sem/section selection
            setSubjectStudents([]);
          }
        }
      } catch (e) {
        setSubjectStudents([]);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [subjectId]);

  // Dropdown options (deduplicated by id)
  // Subject-first behavior: list all subjects assigned to this faculty
  const assignedSubjects = Array.from(new Map(normalizedAssignments.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values());

  // Branch options: if subjectStudents available (subject-only bootstrap), use branches from registrations; otherwise use assignment branches
  const branchesFromAssignments = Array.from(new Map(normalizedAssignments.map(a => [a.branch_id, { id: a.branch_id, name: a.branch }])).values());
  // If registration entries don't include branch names, fall back to assignment labels
  const branchesFromRegistrations = subjectStudents.length ? Array.from(new Map(subjectStudents.filter(s => s.branch_id).map(s => [s.branch_id, { id: s.branch_id, name: s.branch || (branchesFromAssignments.find(b => b.id === s.branch_id)?.name) }])).values()) : [];
  // Prefer registrations-derived branches but ensure current selection remains available
  const preferredBranches = branchesFromRegistrations.length ? branchesFromRegistrations : branchesFromAssignments;
  const branches = preferredBranches.slice();
  if (branchId && !branches.find(b => b.id === branchId)) {
    const match = branchesFromAssignments.find(b => b.id === branchId);
    if (match) branches.unshift(match);
  }

  // Semesters: derive from subjectStudents when available for chosen branch, else fall back to assignments
  const subjectAssignments = subjectId ? normalizedAssignments.filter(a => a.subject_id === Number(subjectId)) : [];
  const semestersFromRegistrations = (subjectStudents.length && branchId)
    ? Array.from(new Map(subjectStudents.filter(s => s.branch_id === branchId && s.semester_id).map(s => [s.semester_id, { id: s.semester_id, name: s.semester || (subjectAssignments.length ? (subjectAssignments.find(a => a.semester_id === s.semester_id)?.semester?.toString()) : (normalizedAssignments.find(a => a.semester_id === s.semester_id && a.branch_id === branchId)?.semester?.toString())) }])).values())
    : [];
  // Prefer registrations-derived semesters but ensure current selection remains available
  const preferredSemesters = semestersFromRegistrations.length
    ? semestersFromRegistrations
    : (subjectAssignments.length
      ? Array.from(new Map(subjectAssignments.map(a => [a.semester_id, { id: a.semester_id, name: a.semester.toString() }])).values())
      : (branchId ? Array.from(new Map(normalizedAssignments.filter(a => a.branch_id === branchId).map(a => [a.semester_id, { id: a.semester_id, name: a.semester.toString() }])).values()) : []));
  const semesters = preferredSemesters.slice();
  if (semesterId && !semesters.find(s => s.id === semesterId)) {
    const match = subjectAssignments.length ? subjectAssignments.find(a => a.semester_id === semesterId) : normalizedAssignments.find(a => a.semester_id === semesterId && a.branch_id === branchId);
    if (match) semesters.unshift({ id: match.semester_id, name: match.semester.toString() });
  }

  // Sections: derive from subjectStudents when available for chosen branch+semester, else fall back to assignments
  const sectionsFromRegistrations = (subjectStudents.length && branchId && semesterId)
    ? Array.from(new Map(subjectStudents.filter(s => s.branch_id === branchId && s.semester_id === semesterId && s.section_id).map(s => {
      const assignLabel = normalizedAssignments.find(a => a.section_id === s.section_id && a.branch_id === branchId && a.semester_id === semesterId)?.section;
      const label = s.section || assignLabel || `Section ${s.section_id}`;
      return [s.section_id, { id: s.section_id, name: label } as { id: number; name: string }];
    })).values())
    : [];
  let sectionsPreferred: { id: number; name: string }[] = [];
  if (subjectType === 'elective') {
    // For elective subjects prefer the sections present in student registrations
    sectionsPreferred = sectionsFromRegistrations.slice();
  } else {
    sectionsPreferred = sectionsFromRegistrations.length
      ? sectionsFromRegistrations
      : ((subjectId && branchId && semesterId && subjectType === 'elective')
        ? Array.from(new Map(normalizedAssignments.filter(a => a.branch_id === branchId && a.semester_id === semesterId).map(a => [a.section_id, { id: a.section_id, name: a.section }])).values())
        : ((subjectId && branchId && semesterId)
          ? Array.from(new Map(normalizedAssignments.filter(a => a.subject_id === Number(subjectId) && a.branch_id === branchId && a.semester_id === semesterId).map(a => [a.section_id, { id: a.section_id, name: a.section }])).values())
          : (branchId && semesterId ? Array.from(new Map(normalizedAssignments.filter(a => a.branch_id === branchId && a.semester_id === semesterId).map(a => [a.section_id, { id: a.section_id, name: a.section }])).values()) : [])));
  }
  const sections = sectionsPreferred.slice();
  if (sectionId && !sections.find(s => s.id === sectionId)) {
    const match = normalizedAssignments.find(a => a.section_id === sectionId && a.branch_id === branchId && a.semester_id === semesterId);
    if (match) sections.unshift({ id: match.section_id, name: match.section });
  }

  // Subjects for selection: show all assigned subjects (faculty's subjects)
  const subjects = assignedSubjects;

  const handleAttendance = (studentId: number, present: boolean) => {
    setAttendance(prev => ({ ...prev, [studentId]: present }));
  };

  const handleSubmit = async () => {
    // Validation:
    // - regular: require branch, semester, section
    // - elective: require branch, semester (section optional)
    // - open_elective: require subject only (branch/semester/section optional)
    if (!subjectId) return;
    if (subjectType === 'regular') {
      if (!branchId || !semesterId || !sectionId) return;
    } else if (subjectType === 'elective') {
      if (!branchId || !semesterId) return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const attendanceArr = students.map(s => ({ student_id: s.id.toString(), status: !!attendance[s.id] }));
      const data: any = {
        subject_id: subjectId.toString(),
        method: "manual",
        attendance: attendanceArr,
      };
      // include optional identifiers only when present
      if (branchId) data.branch_id = branchId.toString();
      if (semesterId) data.semester_id = semesterId.toString();
      if (sectionId) data.section_id = sectionId.toString();
      if (attendanceDate) data.date = attendanceDate;
      const res = await takeAttendance(data);
      if (res.success) {
        toast({
          title: "Success",
          description: "Attendance submitted successfully!",
        });
      } else {
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
    setProcessingAI(true);
    setErrorMsg("");
    try {
      const res = await aiAttendance({
        branch_id: branchId.toString(),
        semester_id: semesterId.toString(),
        section_id: sectionId.toString(),
        subject_id: subjectId.toString(),
        photo: aiPhoto,
        date: attendanceDate,
      });
      if (res.success) {
        setAiResults(res.data);
        toast({
          title: "Success",
          description: "AI attendance processed successfully!",
        });
      } else {
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
    <div className={`w-full max-w-full min-h-screen md:min-h-screen h-auto md:h-auto overflow-visible ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full`}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Take Attendance</CardTitle>
          <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Record student attendance for your classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 w-full max-w-full">
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4 w-full">
              <Select value={subjectId?.toString()} onValueChange={v => setSubjectId(Number(v))}>
                <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`}>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={branchId?.toString()} onValueChange={v => setBranchId(Number(v))} disabled={!subjectId}>
                <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!subjectId}>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                  {branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={semesterId?.toString()} onValueChange={v => setSemesterId(Number(v))} disabled={!branchId || semesters.length === 0}>
                <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!branchId || semesters.length === 0}>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                  {semesters.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sectionId?.toString() || ""} onValueChange={v => setSectionId(v ? Number(v) : null)} disabled={!semesterId || sections.length === 0}>
                <SelectTrigger className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} w-full`} disabled={!semesterId || sections.length === 0}>
                  <SelectValue placeholder={subjectType === 'elective' ? "Select Section (Optional)" : "Select Section"} />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                  {sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${theme === 'dark' ? 'bg-background border-input text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            {recentRecords.length > 0 && (
              <div className={`p-3 rounded-md flex items-center justify-between ${theme === 'dark' ? 'bg-muted/50 border border-border' : 'bg-blue-50 border border-blue-100'}`}>
                <div className="text-sm font-medium">
                  Daily Sessions for {attendanceDate}: <span className="text-primary font-bold">{recentRecords.filter(r => r.date === attendanceDate).length} / 4</span>
                </div>
                {recentRecords.filter(r => r.date === attendanceDate).length >= 4 && (
                  <div className="text-xs text-red-500 font-semibold animate-pulse">Daily limit reached!</div>
                )}
              </div>
            )}

            <Tabs defaultValue="manual">
              <TabsList className={`inline-flex h-10 items-center justify-start gap-2 rounded-md p-1 overflow-auto ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-500'}`}>
                <TabsTrigger
                  value="manual"
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm ${theme === 'dark'
                    ? 'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground'
                    : 'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900'}`}
                >
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm ${theme === 'dark'
                    ? 'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground'
                    : 'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900'}`}
                >
                  AI Processing
                </TabsTrigger>
              </TabsList>

              {/* Manual Entry Tab */}
              <TabsContent value="manual">
                {loadingStudents ? (
                  <div className="mt-4">
                    <SkeletonTable rows={10} cols={5} />
                  </div>
                ) : students.length > 0 ? (
                  <div className={`border rounded-md mt-4 w-full max-w-full overflow-hidden min-h-0 ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-white'}`}>
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
                            {students.map((s, idx) => (
                              <tr
                                key={s.id}
                                className={`border-t ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}
                              >
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
                                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 ${attendance[s.id] === true
                                        ? (theme === 'dark'
                                          ? "bg-green-500/20 text-green-400 border-2 border-green-500/50"
                                          : "bg-green-100 text-green-600 border-2 border-green-200")
                                        : (theme === 'dark'
                                          ? "bg-muted text-muted-foreground hover:bg-green-500/10 hover:text-green-400 border border-border"
                                          : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600 border border-gray-200")
                                        }`}
                                      title="Mark Present"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleAttendance(s.id, false)}
                                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 ${attendance[s.id] === false
                                        ? (theme === 'dark'
                                          ? "bg-red-500/20 text-red-400 border-2 border-red-500/50"
                                          : "bg-red-100 text-red-600 border-2 border-red-200")
                                        : (theme === 'dark'
                                          ? "bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-400 border border-border"
                                          : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200")
                                        }`}
                                      title="Mark Absent"
                                    >
                                      <X size={16} />
                                    </button>
                                    <div className="ml-2 text-xs sm:text-sm">
                                      {attendance[s.id] === true ? (
                                        <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>Present</span>
                                      ) : attendance[s.id] === false ? (
                                        <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'}`}>Absent</span>
                                      ) : (
                                        <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-500'}`}>Not marked</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Fixed controls outside scroll area */}
                    <div className="p-3 sm:p-4 space-y-4">
                      {totalPages && totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3">
                          <div className={`text-sm sm:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            Showing page {page} of {totalPages} {totalStudentsCount !== null && `— ${totalStudentsCount} students`}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button className="w-auto" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                            <Button className="w-auto" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
                            <div className="flex items-center gap-2 ml-4">
                              <label className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Per page:</label>
                              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                                <SelectTrigger className="w-[70px] h-8">
                                  <SelectValue placeholder={pageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                        <div className={`text-sm sm:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {Object.keys(attendance).filter(key => attendance[Number(key)] === true).length} Present,
                          {Object.keys(attendance).filter(key => attendance[Number(key)] === false).length} Absent
                        </div>
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting || recentRecords.filter(r => r.date === attendanceDate).length >= 4}
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

                      {errorMsg && <div className={`text-red-400 text-sm p-3 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errorMsg}</div>}
                    </div>
                  </div>
                ) : (
                  <div className={theme === 'dark' ? 'text-muted-foreground mt-4' : 'text-gray-500 mt-4'}>Select class details to load students.</div>
                )}
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai">
                {loadingStudents ? (
                  <div className="mt-4">
                    <SkeletonTable rows={10} cols={5} />
                  </div>
                ) : students.length > 0 ? (
                  <div className={`border rounded-md mt-4 w-full max-w-full ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-white'}`}>
                    <div className={`p-3 font-semibold border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>AI Attendance Processing</div>
                    <div className="p-4">
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-14 h-14 flex items-center justify-center mb-4">
                          <UploadCloud className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                        <h3 className={`text-base font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>AI Attendance Processing</h3>
                        <p className={`text-sm mb-4 text-center max-w-full ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Upload a class photo for automatic attendance marking using facial recognition technology.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            id="photo-upload"
                          />
                          <label
                            htmlFor="photo-upload"
                            className={`w-full flex-1 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer text-center transition ${theme === 'dark'
                              ? 'border-border text-foreground hover:bg-accent'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            {aiPhoto ? aiPhoto.name : 'Upload Photo'}
                          </label>
                          <Button
                            onClick={handleAIProcess}
                            disabled={processingAI || !aiPhoto || recentRecords.filter(r => r.date === attendanceDate).length >= 4}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
                          >
                            {processingAI ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                              </>
                            ) : (
                              "Process Attendance"
                            )}
                          </Button>
                        </div>
                      </div>

                      {aiResults && (
                        <div className={`mt-6 p-3 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
                          <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>AI Processing Results:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}>
                              <div className="text-2xl font-bold text-green-600">{aiResults.present_count}</div>
                              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Present</div>
                            </div>
                            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}>
                              <div className="text-2xl font-bold text-red-600">{aiResults.absent_count}</div>
                              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Absent</div>
                            </div>
                            <div className={`p-3 rounded ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}>
                              <div className="text-2xl font-bold text-blue-600">{aiResults.total_students}</div>
                              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Total Students</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h5 className={`font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Present Students:</h5>
                              <div className={`max-h-32 overflow-y-auto p-2 rounded ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}>
                                {aiResults.present_students.length > 0 ? (
                                  aiResults.present_students.map((student: any) => (
                                    <div key={student.id} className="text-sm break-words">
                                      {student.name} ({student.usn})
                                    </div>
                                  ))
                                ) : (
                                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No students detected as present</div>
                                )}
                              </div>
                            </div>

                            <div>
                              <h5 className={`font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Absent Students:</h5>
                              <div className={`max-h-32 overflow-y-auto p-2 rounded ${theme === 'dark' ? 'bg-background' : 'bg-white'}`}>
                                {aiResults.absent_students.length > 0 ? (
                                  aiResults.absent_students.map((student: any) => (
                                    <div key={student.id} className="text-sm break-words">
                                      {student.name} ({student.usn})
                                    </div>
                                  ))
                                ) : (
                                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>All students detected as present</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className={`mt-6 p-3 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>How it works:</h4>
                        <ul className={`text-sm space-y-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          <li>• Take a clear photo of your entire class</li>
                          <li>• Upload the image using the button above</li>
                          <li>• Our AI will recognize students and mark attendance automatically</li>
                          <li>• Review and confirm the results before submitting</li>
                        </ul>
                      </div>
                    </div>
                    {errorMsg && <div className={`text-red-400 text-sm p-3 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errorMsg}</div>}
                  </div>
                ) : (
                  <div className={`border rounded-md mt-4 p-6 text-center ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-white'}`}>
                    <h3 className={`text-base font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Please select class details above to load students for AI processing.
                    </p>
                  </div>
                )}
              </TabsContent>

            </Tabs>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TakeAttendance;