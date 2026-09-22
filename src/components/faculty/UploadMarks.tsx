import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect, Fragment } from "react";
import { Pencil, Plus, Trash2, Layers, Settings2, FileDown, RotateCcw, Save, Check, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { sanitizeHtml } from "../../utils/sanitize";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from
  "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import {
  getStudentsForClass,
  ClassStudent,
  uploadInternalMarks,
  FacultyAssignment,
  getUploadMarksBootstrap,
  GetUploadMarksBootstrapResponse,
  createQuestionPaper,
  getStudentsForMarks,
  getSubjectDetail,
  uploadIAMarks,
  CreateQPRequest,
  StudentsForMarksResponse,
  UploadIAMarksRequest,
  updateQuestionPaper,
  getQuestionPapers,
  getQuestionPaperDetail,
  getBatches
} from
  "../../utils/faculty_api";
import { useFacultyAssignmentsQuery } from "../../hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { normalizePaginatedResponse } from "../../utils/normalizePagination";
import { useToast } from "@/hooks/use-toast";
import { SkeletonTable } from "@/components/ui/skeleton";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { useNavigate } from "react-router-dom";

const MySwal = withReactContent(Swal);




// Type for question format
interface Question {
  id: string;
  number: string; // e.g., "1a", "1b", "2a"
  content: string; // The actual question text
  maxMarks: string;
  co: string; // COs box
  bloomsLevel: string; // Blooms Cognitive Level
  partName?: string;
  isOr?: boolean;
}

const formatCO = (co: string | string[] | undefined | null): string => {
  if (!co) return '';
  let items: string[] = [];
  if (Array.isArray(co)) {
    items = co;
  } else if (typeof co === 'string') {
    if (/^CO\d+(?:,\d+)*$/i.test(co.trim())) {
      return co.trim().toUpperCase();
    }
    items = co.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  
  const numbers: number[] = [];
  let allCO = true;
  for (const item of items) {
    const match = item.match(/^(?:CO)?(\d+)$/i);
    if (match) {
      numbers.push(parseInt(match[1], 10));
    } else {
      allCO = false;
      break;
    }
  }
  if (allCO && numbers.length > 0) {
    const sortedUnique = Array.from(new Set(numbers)).sort((a, b) => a - b);
    return `CO${sortedUnique.join(',')}`;
  }
  return items.join(', ');
};

const formatBloomsList = (blooms: string | string[] | undefined | null): string[] => {
  if (!blooms) return [];
  if (Array.isArray(blooms)) return blooms;
  return blooms.split(',').map(s => s.trim()).filter(Boolean);
};

const getOrgLogoUrl = (extraLogo?: string | null): string => {
  let logo = '';
  try {
    if (extraLogo && typeof extraLogo === 'string' && extraLogo.trim()) {
      logo = extraLogo.trim();
    }
    if (!logo) {
      const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          logo = (
            u.org_logo ||
            u.organization?.logo_url ||
            u.organization?.logo ||
            u.org?.logo_url ||
            u.org?.logo ||
            ""
          );
        } catch {
          // ignore
        }
      }
    }
    if (!logo) {
      logo = localStorage.getItem("org_logo") || sessionStorage.getItem("org_logo") || "";
    }
  } catch {
    logo = localStorage.getItem("org_logo") || sessionStorage.getItem("org_logo") || "";
  }
  if (!logo || logo === 'null' || logo === 'undefined') {
    return "/logo.jpeg";
  }
  if (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('data:')) {
    return logo;
  }
  const base = (typeof API_ENDPOINT !== 'undefined' ? API_ENDPOINT.replace(/\/api\/?$/, '') : '') ||
               (window as any).API_BASE_URL ||
               (import.meta as any).env?.VITE_API_URL || '';
  const cleanBase = base ? base.replace(/\/$/, '') : '';
  if (logo.startsWith('/')) {
    return cleanBase ? `${cleanBase}${logo}` : logo;
  }
  return cleanBase ? `${cleanBase}/${logo}` : `/${logo}`;
};

const getOrgName = (extraName?: string | null): string => {
  try {
    if (extraName && typeof extraName === 'string' && extraName.trim() && extraName !== 'null' && extraName !== 'undefined') {
      return extraName.trim();
    }
    const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const name = u.organization?.name || u.org?.name || u.org_name || u.organization_name;
        if (name && typeof name === 'string' && name.trim()) return name.trim();
      } catch {
        // ignore
      }
    }
    const stored = localStorage.getItem('org_name') || sessionStorage.getItem('org_name');
    if (stored && stored.trim() && stored !== 'null' && stored !== 'undefined') return stored.trim();
  } catch {
    // ignore
  }
  return 'STALIGHT INSTITUTE';
};

const normalizeMarks = (value: string): string => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return "00";
  return num.toString().padStart(2, "0");
};

const validateMarks = (marks: string, total: string): boolean => {
  const marksNum = parseInt(marks, 10);
  const totalNum = parseInt(total, 10);

  return (
    !isNaN(marksNum) &&
    !isNaN(totalNum) &&
    marksNum >= 0 &&
    marksNum <= totalNum);

};

// New validation function for max marks
const validateMaxMarks = (maxMarks: string): boolean => {
  const maxMarksNum = parseInt(maxMarks, 10);
  return (
    !isNaN(maxMarksNum) &&
    maxMarksNum > 0 &&
    maxMarksNum <= 10);

};

// (Removed duplicate helper) calculateTotal logic lives inside the component

// Format test type for display
const formatTestType = (testType: string): string => {
  if (testType.startsWith('IA')) {
    const num = testType.replace('IA', '');
    return `IA Test ${num}`;
  }
  return `${testType} Test`;
};

const UploadMarks = () => {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useFacultyAssignmentsQuery();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [tabValue, setTabValue] = useState("questionPaper");
  const [errorMessage, setErrorMessage] = useState("");
  const [dropdownData, setDropdownData] = useState({
    batch: [] as { id: number; name: string; }[],
    branch: [] as { id: number; name: string; }[],
    semester: [] as { id: number; number: number; }[],
    section: [] as { id: number; name: string; }[],
    subject: [] as { id: number; name: string; }[],
    testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"],
    setNumber: [] as string[]
  });
  const [selected, setSelected] = useState({
    batch_id: undefined as number | undefined,
    branch: "",
    branch_id: undefined as number | undefined,
    subject: "",
    subject_id: undefined as number | undefined,
    subject_type: undefined as string | undefined,
    section: "",
    section_id: undefined as number | undefined,
    semester: "",
    semester_id: undefined as number | undefined,
    testType: "",
    setNumber: ""
  });
  const [students, setStudents] = useState<(ClassStudent & { marks: string; total: string; isEditing: boolean; totalEdited?: boolean; })[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<null | {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  }>(null);
  const [savingMarks, setSavingMarks] = useState(false);

  // States to control programmatic opening of subsequent select dropdowns
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isTestTypeOpen, setIsTestTypeOpen] = useState(false);
  const [isSetNumberOpen, setIsSetNumberOpen] = useState(false);

  // Auto calculation logic has been removed. Total is manually entered by the teacher.

  const fetchStudentsPage = async (page: number) => {
    if (!selected.subject_id || !selected.testType) return;
    const params: any = { subject_id: selected.subject_id.toString(), test_type: selected.testType, page, page_size: studentsPerPage };
    if (selected.batch_id) params.batch_id = selected.batch_id.toString();
    if (selected.branch_id) params.branch_id = selected.branch_id.toString();
    if (selected.semester_id) params.semester_id = selected.semester_id.toString();
    if (selected.section_id) params.section_id = selected.section_id.toString();
    if (selected.setNumber) params.set_number = selected.setNumber;
    setLoadingStudents(true);
    try {
      const response: StudentsForMarksResponse = await getStudentsForMarks(params);
      if (response.success && response.data) {
        const initialMarks: Record<string, Record<string, string>> = {};
        const existingTotals: Record<number, number | null> = {};
        response.data.forEach((s) => {
          existingTotals[s.id] = s.existing_mark ? s.existing_mark.total_obtained || null : null;
          if (s.existing_mark && s.existing_mark.marks_detail) {
            initialMarks[s.id.toString()] = {};
            Object.keys(s.existing_mark.marks_detail).forEach((key) => {
              initialMarks[s.id.toString()][key] = s.existing_mark!.marks_detail[key].toString();
            });
          }
        });
        const newStudents = response.data.map((s) => {
          const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${selected.setNumber || 'default'}_${s.id}`;
          const localDataStr = localStorage.getItem(localKey);
          let loadedMarks = initialMarks[s.id?.toString()] || {};
          let totalValue = existingTotals[s.id] != null ? String(existingTotals[s.id]) : "";
          let isEdited = existingTotals[s.id] != null;

          if (localDataStr) {
            try {
              const localData = JSON.parse(localDataStr);
              if (localData.questionMarks) {
                initialMarks[s.id.toString()] = localData.questionMarks;
                loadedMarks = localData.questionMarks;
              }
              totalValue = localData.total || '';
              isEdited = localData.totalEdited || false;
            } catch (e) {
              console.error("Failed to parse local draft marks", e);
            }
          }

          // If not manually edited, compute total
          if (!isEdited && (!totalValue || totalValue === "")) {
            const qpMax = calculateQPMaxMarks(questions);
            totalValue = calculateStudentTotalFromMarks(loadedMarks, questions, qpMax);
          }

          return {
            id: s.id,
            name: s.name,
            usn: s.usn,
            marks: s.existing_mark && s.existing_mark.total_obtained ? String(s.existing_mark.total_obtained) : '',
            total: totalValue,
            isEditing: false,
            totalEdited: isEdited
          };
        });
        setStudents(newStudents);
        setStudentMarks(initialMarks);
        setOriginalStudentMarks(JSON.parse(JSON.stringify(initialMarks)));
        setActionModes(() => {
          const m: Record<string, 'edit' | 'save' | 'view'> = {};
          newStudents.forEach((st) => { m[st.id] = 'view'; });
          return m;
        });
        // Normalize any pagination shape (AdminPagination, DRF, legacy)
        const normalized = normalizePaginatedResponse(response, 'students');
        if (normalized.meta && Object.keys(normalized.meta).length > 0) {
          setPagination({
            page: normalized.meta.currentPage || page || 1,
            page_size: response.page_size || response.pageSize || studentsPerPage,
            total: normalized.meta.totalItems || 0,
            total_pages: normalized.meta.totalPages || Math.ceil((normalized.meta.totalItems || 0) / studentsPerPage),
            has_next: !!normalized.meta.next,
            has_previous: !!normalized.meta.previous
          } as any);
          setCurrentPage(normalized.meta.currentPage || page || 1);
        } else {
          setPagination({ page, page_size: studentsPerPage, total: newStudents.length, total_pages: Math.ceil(newStudents.length / studentsPerPage), has_next: false, has_previous: false });
          setCurrentPage(1);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to fetch students/marks');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handlePrevPage = async () => {
    const target = pagination ? Math.max((pagination.page || currentPage) - 1, 1) : Math.max(currentPage - 1, 1);
    await fetchStudentsPage(target);
  };

  const handleNextPage = async () => {
    const target = pagination ? Math.min((pagination.page || currentPage) + 1, pagination.total_pages) : Math.min(currentPage + 1, totalPages);
    await fetchStudentsPage(target);
  };
  const studentsPerPage = 10;

  const { theme } = useTheme();

  // New state for question paper format
  const [questions, setQuestions] = useState<Question[]>([
    { id: "1a", number: "1a", content: "Question 1a", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "1b", number: "1b", content: "Question 1b", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "1c", number: "1c", content: "Question 1c", maxMarks: "6", co: "CO1", bloomsLevel: "Remember" },
    { id: "2a", number: "2a", content: "Question 2a", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "2b", number: "2b", content: "Question 2b", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "2c", number: "2c", content: "Question 2c", maxMarks: "6", co: "CO1", bloomsLevel: "Remember" },
    { id: "3a", number: "3a", content: "Question 3a", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "3b", number: "3b", content: "Question 3b", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "3c", number: "3c", content: "Question 3c", maxMarks: "6", co: "CO1", bloomsLevel: "Remember" },
    { id: "4a", number: "4a", content: "Question 4a", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "4b", number: "4b", content: "Question 4b", maxMarks: "7", co: "CO2", bloomsLevel: "Apply" },
    { id: "4c", number: "4c", content: "Question 4c", maxMarks: "6", co: "CO1", bloomsLevel: "Remember" }]
  );
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // New state for QP ID
  const [qpId, setQpId] = useState<number | null>(null);
  // Store lightweight summary returned from list endpoint
  const [existingQpSummary, setExistingQpSummary] = useState<any | null>(null);
  // Computed flag: treat backend-provided QP as available for display and marks entry
  const qpReady = Boolean(existingQpSummary);
  const [studentMarks, setStudentMarks] = useState<Record<string, Record<string, string>>>({});
  const [originalStudentMarks, setOriginalStudentMarks] = useState<Record<string, Record<string, string>>>({});

  // New state for action button modes
  const [actionModes, setActionModes] = useState<Record<string, 'edit' | 'save' | 'view'>>({});

  const handleRedirectToUploadQP = () => {
    navigate("/faculty/upload-qp", {
      state: {
        batch_id: selected.batch_id,
        subject_id: selected.subject_id,
        branch_id: selected.branch_id,
        semester_id: selected.semester_id,
        section_id: selected.section_id,
        testType: selected.testType || "IA1"
      }
    });
  };

  // Check if all dropdowns are selected
  const areAllDropdownsSelected = () => {
    if (!selected.subject_id || !selected.testType) return false;

    const subjIdNum = Number(selected.subject_id);
    const filteredBySubject = assignments.filter((a) => a.subject_id === subjIdNum);

    const hasBranches = filteredBySubject.some((a) => a.branch_id);
    const hasSemesters = filteredBySubject.some((a) => a.semester_id);
    const hasSections = filteredBySubject.some((a) => a.section_id);

    if (hasBranches && !selected.branch_id) return false;
    if (hasSemesters && !selected.semester_id) return false;
    if (hasSections && !selected.section_id) return false;

    return true;
  };

  useEffect(() => {
    const loadBatches = async () => {
      try {
        const res = await getBatches();
        if (res?.success && res.data) {
          setDropdownData((prev) => ({ ...prev, batch: res.data || [] }));
        }
      } catch (err) { }
    };
    loadBatches();
  }, []);

  // Update dropdown data when assignments change
  useEffect(() => {
    const branches = Array.from(
      new Map(assignments.map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])).values()
    );
    setDropdownData((prev) => ({ ...prev, branch: branches }));
  }, [assignments]);

  // Populate subject dropdown from assignments so subject list shows immediately
  useEffect(() => {
    const subjects = Array.from(
      new Map(assignments.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
    );
    setDropdownData((prev) => ({ ...prev, subject: subjects }));
  }, [assignments]);


  // Load existing QP when all required dropdowns are selected
  useEffect(() => {
    if (areAllDropdownsSelected()) {
      loadExistingQP();
    } else {
      setQpId(null);
      setExistingQpSummary(null);
      setQuestions([]);
      setDropdownData((prev) => ({ ...prev, setNumber: [] }));
    }
  }, [selected.batch_id, selected.branch_id, selected.semester_id, selected.section_id, selected.subject_id, selected.testType, selected.setNumber]);

  // Load students only when switching to Marks Entry tab and all criteria met
  useEffect(() => {
    if (tabValue === 'manual' && areAllDropdownsSelected() && existingQpSummary?.status === 'approved') {
      fetchStudentsPage(1);
    } else if (tabValue === 'manual') {
      setStudents([]);
      setStudentMarks({});
    }
  }, [tabValue, selected.batch_id, selected.branch_id, selected.semester_id, selected.section_id, selected.subject_id, selected.testType, selected.setNumber, existingQpSummary]);

  // Load full QP detail only when user opens the Question Paper tab
  useEffect(() => {
    const shouldLoad = tabValue === 'questionPaper' && existingQpSummary && (!questions || questions.length === 0);
    if (!shouldLoad) return;

    let mounted = true;
    (async () => {
      try {
        const detailRes = await getQuestionPaperDetail(existingQpSummary.id);
        if (!mounted) return;
        if (detailRes && detailRes.success && detailRes.data && Array.isArray(detailRes.data) && detailRes.data.length > 0) {
          const full = detailRes.data[0];
          setExistingQpSummary((prev: any) => ({ ...prev, ...full }));
          const loadedQuestions: Question[] = [];
          (full.questions || []).forEach((q: any) => {
            const qnum = q.question_number || q.number || '';
            const rawPartName = q.part_name || 'PART-A';
            const isOr = Boolean(q.is_or);
            const co = q.co || '';
            const bloomsLevel = q.blooms_level || q.bloomsLevel || '';

            if (q.subparts && q.subparts.length > 0) {
              q.subparts.forEach((sub: any) => {
                const subLabel = sub.subpart_label || sub.subpart || '';
                const fullNum = subLabel && !qnum.endsWith(subLabel) ? `${qnum}${subLabel}` : qnum;
                loadedQuestions.push({
                  id: `${fullNum}_${Math.random().toString(36).substr(2, 9)}`,
                  number: fullNum,
                  content: sub.content || '',
                  maxMarks: String(sub.max_marks ?? sub.maxMarks ?? 0),
                  co: co,
                  bloomsLevel: bloomsLevel,
                  partName: rawPartName,
                  isOr: isOr
                });
              });
            } else {
              loadedQuestions.push({
                id: `${qnum}_${Math.random().toString(36).substr(2, 9)}`,
                number: qnum,
                content: q.content || '',
                maxMarks: String(q.max_marks ?? q.maxMarks ?? 0),
                co: co,
                bloomsLevel: bloomsLevel,
                partName: rawPartName,
                isOr: isOr
              });
            }
          });
          if (loadedQuestions.length > 0) setQuestions(loadedQuestions);
        }
      } catch (err) {

      }
    })();
    return () => { mounted = false; };
  }, [tabValue, existingQpSummary]);



  const handleMarksChange = (index: number, field: "marks" | "total", value: string) => {
    if (/^\d*$/.test(value)) {
      const actualIndex = (currentPage - 1) * studentsPerPage + index;
      setStudents((prev) =>
        prev.map((student, i) =>
          i === actualIndex ?
            {
              ...student,
              [field]: field === "marks" ? normalizeMarks(value) : value
            } :
            student
        )
      );
    }
  };

  const toggleEdit = (index: number) => {
    const actualIndex = (currentPage - 1) * studentsPerPage + index;
    setStudents((prev) =>
      prev.map((student, i) =>
        i === actualIndex ? { ...student, isEditing: !student.isEditing } : student
      )
    );
  };

  const saveRow = (index: number) => {
    const actualIndex = (currentPage - 1) * studentsPerPage + index;
    setStudents((prev) =>
      prev.map((student, i) =>
        i === actualIndex ? { ...student, isEditing: false } : student
      )
    );
  };

  // Question management functions
  const addQuestion = () => {
    const lastQuestion = questions[questions.length - 1];
    const lastNumber = lastQuestion.number;

    // Parse the last question number to determine next
    const match = lastNumber.match(/(\d+)([a-z]*)/);
    let newNumber = "1a";
    let newContent = "";
    let newMaxMarks = "7";
    let newCo = "CO2";
    let newBlooms = "Apply";

    if (match) {
      const [, numPart, letterPart] = match;
      const num = parseInt(numPart);

      if (letterPart) {
        // If it has a letter part (like 1a, 1b), increment the letter
        const nextChar = String.fromCharCode(letterPart.charCodeAt(0) + 1);
        newNumber = `${numPart}${nextChar}`;
        newContent = `Question ${numPart}${nextChar}`;

        // Set marks and CO based on subpart
        if (nextChar === 'c') {
          newMaxMarks = "6";
          newCo = "CO1";
          newBlooms = "Remember";
        }
      } else {
        // If no letter part, add 'a'
        newNumber = `${num}a`;
        newContent = `Question ${num}a`;
      }
    }

    setQuestions([
      ...questions,
      { id: Date.now().toString(), number: newNumber, content: newContent, maxMarks: newMaxMarks, co: newCo, bloomsLevel: newBlooms }]
    );
  };

  const removeQuestion = (id: string) => {
    MySwal.fire({
      title: "Are you sure?",
      text: "This question will be removed from the format.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove it!",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setQuestions(questions.filter((q) => q.id !== id));
      }
    });
  };

  const updateQuestion = (id: string, field: "number" | "content" | "maxMarks" | "co" | "bloomsLevel", value: string) => {
    // Only allow numeric input for max marks
    if (field === "maxMarks" && value !== "") {
      // Check if the value is a valid number
      if (!/^\d*$/.test(value)) {
        // Don't update if it's not a valid number
        return;
      }

      // Validate max marks range (1-10)
      const maxMarksNum = parseInt(value, 10);
      if (maxMarksNum > 10) {
        // Don't update if greater than 10
        return;
      }
    }

    setQuestions(questions.map((q) =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Load existing QP if available
  const loadExistingQP = async () => {
    if (!areAllDropdownsSelected()) return;

    try {
      const qpResponse = await getQuestionPapers({
        batch_id: selected.batch_id?.toString(),
        branch_id: selected.branch_id?.toString(),
        semester_id: selected.semester_id?.toString(),
        section_id: selected.section_id?.toString(),
        subject_id: selected.subject_id?.toString(),
        test_type: selected.testType,
        detail: true
      });
      if (qpResponse.success && qpResponse.data) {
        const matchingQPs = qpResponse.data.filter((q: any) => {
          const branchId = typeof q.branch === 'object' ? q.branch?.id : q.branch;
          return branchId === selected.branch_id &&
            q.subject === selected.subject_id &&
            q.test_type === selected.testType;
        });

        // Only approved QPs should be available in the dropdown
        const approvedQPs = matchingQPs.filter((q: any) => q.status === 'approved');
        const approvedSets = Array.from(
          new Set(approvedQPs.map((q: any) => q.set_number || 'Set 1').filter(Boolean))
        ) as string[];
        approvedSets.sort();

        setDropdownData((prev) => ({ ...prev, setNumber: approvedSets }));

        let targetSet = selected.setNumber;
        if (!targetSet || !approvedSets.includes(targetSet)) {
          targetSet = approvedSets.length > 0 ? approvedSets[0] : (matchingQPs[0]?.set_number || '');
          if (targetSet !== selected.setNumber) {
            setSelected((prev) => ({ ...prev, setNumber: targetSet }));
          }
        }

        let existingQp = null;
        if (targetSet) {
          existingQp = matchingQPs.find((q: any) => (q.set_number || 'Set 1') === targetSet);
        }
        if (!existingQp && matchingQPs.length > 0) {
          existingQp = matchingQPs[0];
        }

        if (existingQp) {
          setQpId(existingQp.id);
          setExistingQpSummary(existingQp);

          let qList = existingQp.questions;
          if (!qList || qList.length === 0) {
            try {
              const dRes = await getQuestionPaperDetail(existingQp.id);
              if (dRes && dRes.success && dRes.data && Array.isArray(dRes.data) && dRes.data.length > 0) {
                existingQp = { ...existingQp, ...dRes.data[0] };
                setExistingQpSummary(existingQp);
                qList = dRes.data[0].questions;
              }
            } catch (err) {
              console.error(err);
            }
          }

          if (qList && qList.length > 0) {
            const loadedQuestions: Question[] = [];
            qList.forEach((q: any) => {
              const qnum = q.question_number || q.number || '';
              const rawPartName = q.part_name || 'PART-A';
              const isOr = Boolean(q.is_or);
              const co = q.co || '';
              const bloomsLevel = q.blooms_level || q.bloomsLevel || '';

              if (q.subparts && q.subparts.length > 0) {
                q.subparts.forEach((sub: any) => {
                  const subLabel = sub.subpart_label || sub.subpart || '';
                  const fullNum = subLabel && !qnum.endsWith(subLabel) ? `${qnum}${subLabel}` : qnum;
                  loadedQuestions.push({
                    id: `${fullNum}_${Math.random().toString(36).substr(2, 9)}`,
                    number: fullNum,
                    content: sub.content || '',
                    maxMarks: String(sub.max_marks ?? sub.maxMarks ?? 0),
                    co: co,
                    bloomsLevel: bloomsLevel,
                    partName: rawPartName,
                    isOr: isOr
                  });
                });
              } else {
                loadedQuestions.push({
                  id: `${qnum}_${Math.random().toString(36).substr(2, 9)}`,
                  number: qnum,
                  content: q.content || '',
                  maxMarks: String(q.max_marks ?? q.maxMarks ?? 0),
                  co: co,
                  bloomsLevel: bloomsLevel,
                  partName: rawPartName,
                  isOr: isOr
                });
              }
            });
            setQuestions(loadedQuestions.length > 0 ? loadedQuestions : []);
          } else {
            setQuestions([]);
          }
        } else {
          // No QP found for the selected criteria
          setQpId(null);
          setExistingQpSummary(null);
          setQuestions([]);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveQuestionFormat = async () => {
    // Validate that all questions have max marks
    const isValid = questions.every((q) =>
      q.number.trim() !== "" &&
      q.maxMarks.trim() !== "" &&
      parseInt(q.maxMarks) > 0 &&
      parseInt(q.maxMarks) <= 10
    );

    if (!isValid) {
      // Show error message
      setErrorMessage("Please ensure all questions have valid numbers and max marks (1-10)");
      return;
    }

    // Clear any previous error messages
    setErrorMessage("");

    // NOTE: SEE is supported server-side; allow SEE QP creation

    const qpResponse = await getQuestionPapers({
      branch_id: selected.branch_id?.toString(),
      subject_id: selected.subject_id?.toString(),
      test_type: selected.testType,
      detail: false,
      approved_only: true
    });
    let existingQp = null;
    if (qpResponse.success && qpResponse.data) {
      existingQp = qpResponse.data.find((q: any) => {
        const branchId = typeof q.branch === 'object' ? q.branch?.id : q.branch;
        return branchId === selected.branch_id && q.subject === selected.subject_id && q.test_type === selected.testType;
      });
    }

    // Prepare QP data - group by main question
    const groupedQuestions: Record<string, { co: string; blooms_level: string; subparts: Array<{ subpart_label: string; content: string; max_marks: number; }>; }> = {};
    questions.forEach((q) => {
      const mainQ = q.number.charAt(0);
      if (!groupedQuestions[mainQ]) {
        groupedQuestions[mainQ] = { co: q.co, blooms_level: q.bloomsLevel, subparts: [] };
      }
      groupedQuestions[mainQ].subparts.push({
        subpart_label: q.number.slice(1),
        content: q.content,
        max_marks: parseInt(q.maxMarks)
      });
    });

    // Derive branch/semester/section when missing for open_elective from assignments
    const assignForSubject = assignments.find((a) => a.subject_id === selected.subject_id);
    const derivedBranchId = selected.branch_id || (assignForSubject ? assignForSubject.branch_id : undefined);
    const derivedSemesterId = selected.semester_id || (assignForSubject ? assignForSubject.semester_id : undefined);
    const derivedSectionId = selected.section_id || (assignForSubject ? assignForSubject.section_id : undefined);

    // Build QP payload; QuestionPaper model requires branch/semester/section, so ensure we have values
    const qpData: any = {
      subject: selected.subject_id!,
      test_type: selected.testType,
      questions_data: Object.keys(groupedQuestions).map((mainQ) => ({
        question_number: mainQ,
        co: groupedQuestions[mainQ].co,
        blooms_level: groupedQuestions[mainQ].blooms_level,
        subparts_data: groupedQuestions[mainQ].subparts
      }))
    };

    // For open_elective, try to derive branch/semester/section from assignments when user didn't select them
    qpData.branch = selected.branch_id || derivedBranchId;
    qpData.semester = selected.semester_id || derivedSemesterId;
    qpData.section = selected.section_id || derivedSectionId;

    // Validate that required fields for the model are present before sending
    if (!qpData.branch || !qpData.semester || !qpData.section) {
      setErrorMessage('Cannot create question paper: branch/semester/section could not be determined. Please select branch/semester/section or ensure an assignment exists for this subject.');
      return;
    }

    try {
      let response;
      if (existingQp) {
        // Update existing QP
        response = await updateQuestionPaper(existingQp.id, qpData);
        setQpId(existingQp.id);
      } else {
        // Create new QP
        response = await createQuestionPaper(qpData);
        if (response.success && response.data) {
          setQpId(response.data.id);
        }
      }

      if (response.success) {
        await loadExistingQP(); // Reload QP data to reflect changes immediately
        MySwal.fire({
          title: existingQp ? "Question Format Updated!" : "Question Format Saved!",
          text: existingQp ? "The question paper format has been successfully updated." : "The question paper format has been successfully saved.",
          icon: "success",
          confirmButtonText: "OK"
        }).then(() => {
          setTabValue("questionPaper");
        });
      } else {
        setErrorMessage("Failed to save question format");
      }
    } catch (error) {
      setErrorMessage("Network error while saving question format");
    }
  };

  const handleSubmit = async () => {
    setSavingMarks(true);
    if (!areAllDropdownsSelected()) {
      MySwal.fire({ title: "Select all required fields!", icon: "warning", confirmButtonText: "OK" });
      setSavingMarks(false);
      return;
    }

    if (!existingQpSummary || existingQpSummary.status !== 'approved') {
      MySwal.fire({
        title: "Question Paper not found or not approved",
        icon: "error",
        confirmButtonText: "OK"
      });
      setSavingMarks(false);
      return;
    }

    const studentsMissingTotal = students.filter((s) => {
      const studentIdStr = s.id.toString();
      const studentQuestions = studentMarks[studentIdStr] || {};
      const hasAnyQuestionMark = Object.values(studentQuestions).some(val => val !== undefined && val !== "");
      return hasAnyQuestionMark && (!s.total || s.total === "");
    });

    if (studentsMissingTotal.length > 0) {
      const usnList = studentsMissingTotal.map(s => s.usn).join(", ");
      MySwal.fire({
        title: "Missing Total Marks",
        text: `Please enter the total marks for the following students before submitting: ${usnList}`,
        icon: "warning",
        confirmButtonText: "OK"
      });
      setSavingMarks(false);
      return;
    }

    if (totalMarks > 0) {
      const studentsExceedingTotal = students.filter((s) => {
        const studentTotalNum = parseFloat(String(s.total) || '0');
        return studentTotalNum > totalMarks;
      });

      if (studentsExceedingTotal.length > 0) {
        const usnList = studentsExceedingTotal.map(s => `${s.usn} (${s.total} > ${totalMarks})`).join(", ");
        MySwal.fire({
          title: "Total Marks Exceeded",
          text: `Total marks cannot exceed the maximum QP marks (${totalMarks}). Please correct marks for: ${usnList}`,
          icon: "error",
          confirmButtonText: "OK"
        });
        setSavingMarks(false);
        return;
      }
    }

    const confirmSubmit = await MySwal.fire({
      title: "Are you sure?",
      text: "Do you want to upload and submit these marks to the database?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Submit",
      cancelButtonText: "Cancel",
      customClass: {
        confirmButton: 'bg-primary text-white hover:bg-primary/95',
      }
    });

    if (!confirmSubmit.isConfirmed) {
      setSavingMarks(false);
      return;
    }

    // Auto-fill unentered fields to 0 if at least one question has been graded for that student
    const updatedStudentMarks = JSON.parse(JSON.stringify(studentMarks));
    students.forEach((s) => {
      const studentIdStr = s.id.toString();
      if (!updatedStudentMarks[studentIdStr]) {
        updatedStudentMarks[studentIdStr] = {};
      }
      const studentQuestions = updatedStudentMarks[studentIdStr];
      const hasAnyQuestionMark = Object.values(studentQuestions).some(val => val !== undefined && val !== "");

      if (hasAnyQuestionMark) {
        questions.forEach((q) => {
          if (studentQuestions[q.number] === undefined || studentQuestions[q.number] === "") {
            studentQuestions[q.number] = "0";
          }
        });
      }
    });

    // Prepare marks data
    const marksData: UploadIAMarksRequest = {
      question_paper_id: existingQpSummary.id,
      marks_data: students.map((s) => {
        const studentIdStr = s.id.toString();
        const marksDetail = Object.fromEntries(
          Object.entries(updatedStudentMarks[studentIdStr] || {}).map(([key, value]) => [key, parseFloat(value) || 0])
        );
        // Total is now entirely manually entered by the teacher.
        const manualTotal = parseFloat(s.total as any) || 0;
        return {
          student_id: s.id,
          marks_detail: marksDetail,
          total_obtained: manualTotal
        };
      })
    };

    try {
      // Debug: log students and studentMarks to verify edited totals and per-question marks
      // eslint-disable-next-line no-console

      // eslint-disable-next-line no-console

      // Debug: log payload to verify manual vs auto totals
      // Remove or disable this in production
      // eslint-disable-next-line no-console

      const res = await uploadIAMarks(marksData);
      if (res.success) {
        // Clear local storage drafts
        students.forEach((s) => {
          const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${selected.setNumber || 'default'}_${s.id}`;
          localStorage.removeItem(localKey);
        });
        MySwal.fire({
          title: "Marks uploaded!",
          icon: "success",
          confirmButtonText: "OK"
        });
        // Update local state to reflect saved status without a fresh GET call
        setStudents((prev) => prev.map((s) => ({ ...s, totalEdited: false })));
        setStudentMarks(updatedStudentMarks);
        setOriginalStudentMarks(updatedStudentMarks);
        setActionModes((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((id) => { updated[id] = 'view'; });
          return updated;
        });
      } else {
        MySwal.fire({
          title: "Upload failed",
          text: res.message || "Unknown error",
          icon: "error",
          confirmButtonText: "OK"
        });
      }
    } catch (err) {
      MySwal.fire({
        title: "Network error",
        icon: "error",
        confirmButtonText: "OK"
      });
    } finally {
      setSavingMarks(false);
    }
  };
  const indexOfLastStudent = (pagination?.page || currentPage) * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = students; // server returns current page items
  const totalPages = pagination ? pagination.total_pages : Math.ceil(students.length / studentsPerPage);
  const totalCount = pagination ? pagination.total : students.length;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (key: string) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  };

  const getButtonClassName = (): string => `text-sm ml-2 font-medium ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`;

  const getBadgeClassName = (): string => `${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'} border-0`;

  const getQuestionCardClassName = (): string => `border rounded-md p-3 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`;

  const groupQuestionsByMain = (): Record<string, Question[]> => {
    const grouped: Record<string, Question[]> = {};
    questions.forEach((q) => {
      const main = q.number.charAt(0);
      if (!grouped[main]) grouped[main] = [];
      grouped[main].push(q);
    });
    return grouped;
  };

  const groupQuestionsByPart = (): { name: string; questions: Question[] }[] => {
    const partsMap = new Map<string, Question[]>();
    questions.forEach((q) => {
      const p = q.partName || 'PART-A';
      if (!partsMap.has(p)) {
        partsMap.set(p, []);
      }
      partsMap.get(p)!.push(q);
    });
    return Array.from(partsMap.entries()).map(([name, qs]) => ({
      name,
      questions: qs,
    }));
  };

  const calculateQPMaxMarks = (questionsList: any[]): number => {
    if (!questionsList || questionsList.length === 0) return 0;

    const mainQuestions: Array<{ partName: string; mainNum: string; maxMarks: number; isOr: boolean }> = [];
    const seenMap = new Map<string, { partName: string; mainNum: string; maxMarks: number; isOr: boolean }>();

    questionsList.forEach((q, idx) => {
      if (Array.isArray(q.subparts) && q.subparts.length > 0) {
        const partName = q.part_name || q.partName || 'PART-A';
        const isOr = Boolean(q.is_or || q.isOr);
        const rawNum = String(q.question_number || q.questionNumber || q.number || (idx + 1));
        const cleanNum = rawNum.replace(/^[Qq]\.?\s*/, '').trim();
        const match = cleanNum.match(/^(\d+)/);
        const mainNum = match ? match[1] : (cleanNum || String(idx + 1));
        const subpartsSum = q.subparts.reduce((sum: number, s: any) => {
          const m = parseFloat(String(s.max_marks ?? s.maxMarks ?? 0));
          return sum + (isNaN(m) ? 0 : m);
        }, 0);
        const key = `${partName}_${mainNum}`;
        if (!seenMap.has(key)) {
          const obj = { partName, mainNum, maxMarks: subpartsSum, isOr };
          seenMap.set(key, obj);
          mainQuestions.push(obj);
        } else {
          seenMap.get(key)!.maxMarks += subpartsSum;
          if (isOr) seenMap.get(key)!.isOr = true;
        }
        return;
      }

      const partName = q.part_name || q.partName || 'PART-A';
      const isOr = Boolean(q.is_or || q.isOr);
      const rawNum = String(q.question_number || q.questionNumber || q.number || (idx + 1));
      const cleanNum = rawNum.replace(/^[Qq]\.?\s*/, '').trim();
      const match = cleanNum.match(/^(\d+)/);
      const mainNum = match ? match[1] : (cleanNum || String(idx + 1));
      const marks = parseFloat(String(q.max_marks ?? q.maxMarks ?? 0)) || 0;

      const key = `${partName}_${mainNum}`;
      if (!seenMap.has(key)) {
        const obj = { partName, mainNum, maxMarks: marks, isOr };
        seenMap.set(key, obj);
        mainQuestions.push(obj);
      } else {
        const existing = seenMap.get(key)!;
        existing.maxMarks += marks;
        if (isOr) existing.isOr = true;
      }
    });

    let calculatedTotal = 0;
    let prevMarks = 0;

    mainQuestions.forEach((mq, i) => {
      if (mq.isOr && i > 0) {
        calculatedTotal = calculatedTotal - prevMarks + Math.max(prevMarks, mq.maxMarks);
        prevMarks = Math.max(prevMarks, mq.maxMarks);
      } else {
        calculatedTotal += mq.maxMarks;
        prevMarks = mq.maxMarks;
      }
    });

    return calculatedTotal;
  };

  const calculateStudentTotalFromMarks = (
    marksRecord: Record<string, string | number>,
    questionsList: any[],
    qpMaxMarks: number
  ): string => {
    if (!marksRecord || Object.keys(marksRecord).length === 0) return "";

    const hasAnyMark = Object.values(marksRecord).some(v => v !== undefined && v !== "" && v !== null);
    if (!hasAnyMark) return "";

    const mainQuestions: Array<{
      partName: string;
      mainNum: string;
      isOr: boolean;
      subpartNumbers: string[];
    }> = [];
    const seenMap = new Map<string, { partName: string; mainNum: string; isOr: boolean; subpartNumbers: string[] }>();

    questionsList.forEach((q, idx) => {
      const partName = q.part_name || q.partName || 'PART-A';
      const isOr = Boolean(q.is_or || q.isOr);
      const rawNum = String(q.question_number || q.questionNumber || q.number || (idx + 1));
      const cleanNum = rawNum.replace(/^[Qq]\.?\s*/, '').trim();
      const match = cleanNum.match(/^(\d+)/);
      const mainNum = match ? match[1] : (cleanNum || String(idx + 1));
      const qNumKey = q.number || rawNum;

      const key = `${partName}_${mainNum}`;
      if (!seenMap.has(key)) {
        const obj = { partName, mainNum, isOr, subpartNumbers: [qNumKey] };
        seenMap.set(key, obj);
        mainQuestions.push(obj);
      } else {
        const existing = seenMap.get(key)!;
        if (!existing.subpartNumbers.includes(qNumKey)) {
          existing.subpartNumbers.push(qNumKey);
        }
        if (isOr) existing.isOr = true;
      }
    });

    const mainScores = mainQuestions.map((mq) => {
      let sum = 0;
      let attempted = false;
      mq.subpartNumbers.forEach((num) => {
        const val = marksRecord[num];
        if (val !== undefined && val !== "" && val !== null) {
          attempted = true;
          const parsed = parseFloat(String(val));
          if (!isNaN(parsed)) sum += parsed;
        }
      });
      return { ...mq, score: sum, attempted };
    });

    let totalObtained = 0;
    let prevScore = 0;

    mainScores.forEach((mq, i) => {
      if (mq.isOr && i > 0) {
        const best = Math.max(prevScore, mq.score);
        totalObtained = totalObtained - prevScore + best;
        prevScore = best;
      } else {
        totalObtained += mq.score;
        prevScore = mq.score;
      }
    });

    const finalTotal = qpMaxMarks > 0 ? Math.min(totalObtained, qpMaxMarks) : totalObtained;
    return Number.isInteger(finalTotal) ? String(finalTotal) : String(parseFloat(finalTotal.toFixed(2)));
  };

  const totalMarks = calculateQPMaxMarks(questions);
  const handleSelectChange = async (field: string, value: string | number) => {

    setErrorMessage("");
    const updated = { ...selected };
    if (field.endsWith('_id')) {
      updated[field] = value as number;
      if (field === 'branch_id') {
        const branchObj = dropdownData.branch.find((b) => b.id === value);
        updated.branch = branchObj ? branchObj.name : "";
      } else if (field === 'semester_id') {
        const semObj = dropdownData.semester.find((s) => s.id === value);
        updated.semester = semObj ? semObj.number.toString() : "";
      } else if (field === 'section_id') {
        const secObj = dropdownData.section.find((s) => s.id === value);
        updated.section = secObj ? secObj.name : "";
      } else if (field === 'subject_id') {
        const subjObj = dropdownData.subject.find((s) => s.id === value);
        updated.subject = subjObj ? subjObj.name : "";
      }
    } else {
      updated[field] = value as string;
    }

    if (field === 'subject_id' && value) {
      const subjIdNum = Number(value);
      const filteredBySubject = assignments.filter((a) => a.subject_id === subjIdNum);
      const branches = Array.from(new Map(filteredBySubject.filter((a) => a.branch_id).map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])).values());
      const semesters = Array.from(new Map(filteredBySubject.filter((a) => a.semester_id).map((a) => [a.semester_id, { id: a.semester_id, number: a.semester }])).values());
      const sections = Array.from(new Map(filteredBySubject.filter((a) => a.section_id).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values());

      setDropdownData((prev) => ({ ...prev, branch: branches, semester: semesters, section: sections }));

      const autoBranchId = branches.length === 1 ? branches[0].id : undefined;
      const autoSemesterId = semesters.length === 1 ? semesters[0].id : undefined;
      const autoSectionId = sections.length === 1 ? sections[0].id : undefined;

      updated.branch_id = autoBranchId;
      updated.branch = autoBranchId ? branches[0].name : "";
      updated.semester_id = autoSemesterId;
      updated.semester = autoSemesterId ? semesters[0].number.toString() : "";
      updated.section_id = autoSectionId;
      updated.section = autoSectionId ? sections[0].name : "";
      if (!updated.testType) updated.testType = "IA1";
    } else if (field === "branch_id") {
      const filtered = assignments.filter((a) => a.subject_id === updated.subject_id && a.branch_id === updated.branch_id);
      const semesters = Array.from(new Map(filtered.filter((a) => a.semester_id).map((a) => [a.semester_id, { id: a.semester_id, number: a.semester }])).values());
      setDropdownData((prev) => ({ ...prev, semester: semesters, section: [] }));
      updated.semester_id = undefined;
      updated.semester = "";
      updated.section_id = undefined;
      updated.section = "";
    } else if (field === "semester_id") {
      const filtered = assignments.filter((a) => a.subject_id === updated.subject_id && a.branch_id === updated.branch_id && a.semester_id === updated.semester_id);
      const sections = Array.from(new Map(filtered.filter((a) => a.section_id).map((a) => [a.section_id, { id: a.section_id, name: a.section }])).values());
      setDropdownData((prev) => ({ ...prev, section: sections }));
      updated.section_id = undefined;
      updated.section = "";
      updated.setNumber = "";
    } else if (field === "section_id" || field === "testType") {
      updated.setNumber = "";
    }

    setSelected(updated);

    // Auto-open next dropdown based on selection flow
    if (field === 'batch_id') {
      setTimeout(() => setIsSubjectOpen(true), 150);
    } else if (field === 'subject_id') {
      if (updated.branch_id && updated.semester_id && updated.section_id) {
        setTimeout(() => setIsTestTypeOpen(true), 150);
      } else if (updated.branch_id && updated.semester_id) {
        setTimeout(() => setIsSectionOpen(true), 150);
      } else {
        setTimeout(() => setIsBranchOpen(true), 150);
      }
    } else if (field === 'branch_id') {
      setTimeout(() => setIsSemesterOpen(true), 150);
    } else if (field === 'semester_id') {
      setTimeout(() => setIsSectionOpen(true), 150);
    } else if (field === 'section_id') {
      setTimeout(() => setIsTestTypeOpen(true), 150);
    } else if (field === 'testType') {
      setTimeout(() => setIsSetNumberOpen(true), 150);
    }
  };

  // Remove the old areAllDropdownsSelected (we've moved it up)

  // Add the download PDF function inside the component
  const downloadQuestionPaperPDF = async () => {
    if (!existingQpSummary?.id) {
      toast({
        title: "Error",
        description: "Question Paper is not saved or loaded yet.",
        variant: "destructive"
      });
      return;
    }
    setDownloadingPDF(true);
    try {
      const url = `${API_ENDPOINT}/admin/qps/${existingQpSummary.id}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF from backend");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Question_Paper_${selected.subject}_${selected.testType}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast({
        title: "Success",
        description: "Question Paper PDF downloaded successfully"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to download PDF",
        variant: "destructive"
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleExportExcelMarksSheet = async () => {
    if (!areAllDropdownsSelected()) {
      toast({
        title: "Selection Required",
        description: "Please select all dropdown fields before exporting.",
        variant: "destructive"
      });
      return;
    }

    if (!existingQpSummary || existingQpSummary.status !== 'approved') {
      toast({
        title: "Question Paper Not Approved",
        description: "The question paper must be approved before exporting marks statement.",
        variant: "destructive"
      });
      return;
    }

    setIsExportingExcel(true);
    try {
      // 1. Fetch complete student list for excel (up to 1000 students to bypass pagination limit)
      const params: any = {
        subject_id: selected.subject_id?.toString(),
        test_type: selected.testType,
        page: 1,
        page_size: 1000
      };
      if (selected.batch_id) params.batch_id = selected.batch_id.toString();
      if (selected.branch_id) params.branch_id = selected.branch_id.toString();
      if (selected.semester_id) params.semester_id = selected.semester_id.toString();
      if (selected.section_id) params.section_id = selected.section_id.toString();
      if (selected.setNumber) params.set_number = selected.setNumber;

      let studentList: any[] = [];
      const res: StudentsForMarksResponse = await getStudentsForMarks(params);
      if (res && res.success && res.data && res.data.length > 0) {
        studentList = res.data;
      } else if (students && students.length > 0) {
        studentList = students;
      } else {
        toast({
          title: "No Students Found",
          description: "There are no students to export for the selected criteria.",
          variant: "destructive"
        });
        setIsExportingExcel(false);
        return;
      }

      const qpMax = calculateQPMaxMarks(questions);

      // 2. Prepare merged data for every student
      const exportRows = studentList.map((s, idx) => {
        const studentId = s.id;
        const studentIdStr = studentId.toString();

        // Check local storage draft
        const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${selected.setNumber || 'default'}_${studentId}`;
        let draftMarks: Record<string, string> = {};
        let draftTotal = '';
        try {
          const localDataStr = localStorage.getItem(localKey);
          if (localDataStr) {
            const parsed = JSON.parse(localDataStr);
            if (parsed.questionMarks) draftMarks = parsed.questionMarks;
            if (parsed.total) draftTotal = parsed.total;
          }
        } catch (e) {
          // ignore
        }

        // Check in-memory state
        const stateMarks = studentMarks[studentIdStr] || {};
        const currentStudentObj = students.find((st) => st.id === studentId);
        const stateTotal = currentStudentObj?.total ?? '';

        // Check backend existing_mark
        const backendMarks: Record<string, string> = {};
        let backendTotal = '';
        if (s.existing_mark) {
          if (s.existing_mark.marks_detail) {
            Object.keys(s.existing_mark.marks_detail).forEach((k) => {
              backendMarks[k] = String(s.existing_mark.marks_detail[k]);
            });
          }
          if (s.existing_mark.total_obtained !== undefined && s.existing_mark.total_obtained !== null) {
            backendTotal = String(s.existing_mark.total_obtained);
          }
        }

        // Precedence: current state > local draft > backend DB
        const mergedMarks: Record<string, string> = { ...backendMarks, ...draftMarks, ...stateMarks };
        let finalTotal = stateTotal || draftTotal || backendTotal;
        if (!finalTotal || finalTotal === '') {
          finalTotal = calculateStudentTotalFromMarks(mergedMarks, questions, qpMax);
        }

        return {
          index: idx + 1,
          usn: s.usn || '--',
          name: s.name || '--',
          marks: mergedMarks,
          total: finalTotal || '-'
        };
      });

      // 3. Organization & Header Metadata
      const orgName = getOrgName(existingQpSummary?.org_name);
      const batchName = dropdownData.batch.find((b) => String(b.id) === String(selected.batch_id))?.name || '';
      const subjectObj = dropdownData.subject.find((s) => String(s.id) === String(selected.subject_id));
      const subjectName = subjectObj?.name || selected.subject || '--';
      const subjectCode = subjectObj?.code || (subjectObj as any)?.subject_code || assignments.find((a) => String(a.subject_id) === String(selected.subject_id))?.subject_code || '--';
      const branchName = dropdownData.branch.find((b) => String(b.id) === String(selected.branch_id))?.name || selected.branch || '--';
      const semNumber = selected.semester || dropdownData.semester.find((s) => String(s.id) === String(selected.semester_id))?.number || '--';
      const sectionName = selected.section || dropdownData.section.find((s) => String(s.id) === String(selected.section_id))?.name || '--';
      const formattedTest = formatTestType(selected.testType);

      let facultyName = 'Faculty';
      try {
        const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        facultyName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.full_name || u.name || u.username || 'Faculty';
      } catch (e) {
        // ignore
      }

      const formattedDate = existingQpSummary?.exam_date || existingQpSummary?.date
        ? format(new Date((existingQpSummary.exam_date || existingQpSummary.date).includes('T') ? (existingQpSummary.exam_date || existingQpSummary.date) : `${existingQpSummary.exam_date || existingQpSummary.date}T00:00:00`), "dd/MM/yyyy")
        : format(new Date(), "dd/MM/yyyy");

      // Total columns calculation
      // Col 0: #, Col 1: USN, Col 2: Student Name
      // Questions: 3 sub-columns each (CO, Max, Marks)
      // Last Col: Total Marks
      const totalColumns = 3 + (questions.length * 3) + 1;
      const lastColIdx = totalColumns - 1;
      const midColIdx = Math.floor(totalColumns / 2);

      // Build Array of Arrays (aoa)
      const aoa: any[][] = [];

      // Row 0: Org Title
      const row0 = new Array(totalColumns).fill("");
      row0[0] = orgName.toUpperCase();
      aoa.push(row0);

      // Row 1: Test Title
      const row1 = new Array(totalColumns).fill("");
      row1[0] = `${formattedTest.toUpperCase()} MARKS STATEMENT`;
      aoa.push(row1);

      // Row 2: Date
      const row2 = new Array(totalColumns).fill("");
      row2[lastColIdx - 1] = `Date: ${formattedDate}`;
      aoa.push(row2);

      // Row 3: Subject & Subject Code
      const row3 = new Array(totalColumns).fill("");
      row3[0] = "Subject:";
      row3[1] = subjectName;
      row3[midColIdx] = "Subject Code:";
      row3[midColIdx + 1] = subjectCode;
      aoa.push(row3);

      // Row 4: Branch / Sem / Sec & Academic Batch
      const row4 = new Array(totalColumns).fill("");
      row4[0] = "Branch / Sem / Sec:";
      row4[1] = `${branchName} / Sem ${semNumber} / Sec ${sectionName}`;
      row4[midColIdx] = "Academic Batch:";
      row4[midColIdx + 1] = batchName || "--";
      aoa.push(row4);

      // Row 5: Faculty & Maximum Marks
      const row5 = new Array(totalColumns).fill("");
      row5[0] = "Faculty:";
      row5[1] = facultyName;
      row5[midColIdx] = "Maximum Marks:";
      row5[midColIdx + 1] = totalMarks;
      aoa.push(row5);

      // Row 6: Blank row
      aoa.push(new Array(totalColumns).fill(""));

      // Row 7 (Header Tier 1): #, USN, Student Name, Q1a, Q1b..., Total Marks
      const row7 = new Array(totalColumns).fill("");
      row7[0] = "#";
      row7[1] = "USN";
      row7[2] = "Student Name";
      questions.forEach((q, idx) => {
        row7[3 + idx * 3] = `Q${q.number}`;
      });
      row7[lastColIdx] = "Total Marks";
      aoa.push(row7);

      // Row 8 (Header Tier 2): CO, Max, Marks
      const row8 = new Array(totalColumns).fill("");
      questions.forEach((q, idx) => {
        row8[3 + idx * 3] = "CO";
        row8[3 + idx * 3 + 1] = "Max";
        row8[3 + idx * 3 + 2] = "Marks";
      });
      aoa.push(row8);

      // Row 9 (Header Tier 3): e.g. CO2, 7, IA Test 1
      const row9 = new Array(totalColumns).fill("");
      questions.forEach((q, idx) => {
        row9[3 + idx * 3] = formatCO(q.co) || "CO";
        row9[3 + idx * 3 + 1] = Number(q.maxMarks) || q.maxMarks;
        row9[3 + idx * 3 + 2] = formattedTest;
      });
      aoa.push(row9);

      // Student Rows (Row 10+)
      exportRows.forEach((row) => {
        const studentRow = new Array(totalColumns).fill("");
        studentRow[0] = row.index;
        studentRow[1] = row.usn;
        studentRow[2] = row.name;
        questions.forEach((q, idx) => {
          studentRow[3 + idx * 3] = formatCO(q.co) || "-";
          studentRow[3 + idx * 3 + 1] = Number(q.maxMarks) || q.maxMarks;
          const markVal = row.marks[q.number];
          studentRow[3 + idx * 3 + 2] = markVal !== undefined && markVal !== "" ? (isNaN(Number(markVal)) ? markVal : Number(markVal)) : "-";
        });
        studentRow[lastColIdx] = row.total !== undefined && row.total !== "" && row.total !== "-" ? (isNaN(Number(row.total)) ? row.total : Number(row.total)) : "-";
        aoa.push(studentRow);
      });

      // Footer Signatures
      aoa.push(new Array(totalColumns).fill(""));
      aoa.push(new Array(totalColumns).fill(""));

      const sigRow1 = new Array(totalColumns).fill("");
      sigRow1[1] = "Staff In-charge / Faculty";
      sigRow1[midColIdx] = "Head of Department";
      sigRow1[lastColIdx - 2] = "Controller of Examinations";
      aoa.push(sigRow1);

      const sigRow2 = new Array(totalColumns).fill("");
      sigRow2[1] = `(${facultyName})`;
      sigRow2[midColIdx] = `Department of ${branchName}`;
      sigRow2[lastColIdx - 2] = orgName;
      aoa.push(sigRow2);

      // Generate worksheet from aoa
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Define Merges
      const merges: any[] = [
        // Title Rows
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
        // Metadata Rows
        { s: { r: 3, c: 1 }, e: { r: 3, c: midColIdx - 1 } },
        { s: { r: 3, c: midColIdx + 1 }, e: { r: 3, c: lastColIdx } },
        { s: { r: 4, c: 1 }, e: { r: 4, c: midColIdx - 1 } },
        { s: { r: 4, c: midColIdx + 1 }, e: { r: 4, c: lastColIdx } },
        { s: { r: 5, c: 1 }, e: { r: 5, c: midColIdx - 1 } },
        { s: { r: 5, c: midColIdx + 1 }, e: { r: 5, c: lastColIdx } },
        // Table Headers
        { s: { r: 7, c: 0 }, e: { r: 9, c: 0 } }, // #
        { s: { r: 7, c: 1 }, e: { r: 9, c: 1 } }, // USN
        { s: { r: 7, c: 2 }, e: { r: 9, c: 2 } }, // Student Name
        { s: { r: 7, c: lastColIdx }, e: { r: 9, c: lastColIdx } }, // Total Marks
      ];

      // Question headers merge (spanning 3 columns)
      questions.forEach((_, idx) => {
        const startC = 3 + idx * 3;
        merges.push({ s: { r: 7, c: startC }, e: { r: 7, c: startC + 2 } });
      });

      ws["!merges"] = merges;

      // Define Column Widths
      const colWidths: any[] = [
        { wch: 6 },  // #
        { wch: 16 }, // USN
        { wch: 28 }, // Student Name
      ];
      questions.forEach(() => {
        colWidths.push({ wch: 8 });  // CO
        colWidths.push({ wch: 8 });  // Max
        colWidths.push({ wch: 10 }); // Marks
      });
      colWidths.push({ wch: 14 }); // Total Marks
      ws["!cols"] = colWidths;

      // Create Workbook and save as .xlsx
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, `${selected.testType} Marks`);

      const safeSubject = subjectName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeTestType = selected.testType.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeSet = (selected.setNumber || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeBatch = (batchName || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeSubject}_${safeTestType}${safeSet ? `_${safeSet}` : ""}_Marks_Statement${safeBatch ? `_${safeBatch}` : ""}.xlsx`;

      XLSX.writeFile(workbook, filename);

      toast({
        title: "Excel Downloaded",
        description: `Successfully exported ${exportRows.length} students to ${filename}`
      });
    } catch (error: any) {
      console.error("Excel export error:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate Excel file",
        variant: "destructive"
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}>
      <Tabs id="upload-marks-tabs" value={tabValue} onValueChange={(newTab) => {
        // Prevent switching to Marks Entry if QP is not approved
        if (newTab === 'manual' && (!existingQpSummary || existingQpSummary.status !== 'approved')) {
          toast({
            title: 'Cannot Access Tab',
            description: 'The question paper must be approved by COE before you can enter marks.',
            variant: 'destructive'
          });
          return;
        }
        setTabValue(newTab);
      }} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
        <div id="upload-marks-header-section" className="border-b border-border/50 pb-4">
          <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b mb-3">
            <div className="flex-1 min-w-0">
              <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Upload Marks</CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} mt-1`}>
                Enter and publish exam marks and internal assessment scores for students.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pb-0 space-y-6">
            <div id="upload-marks-selectors" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <Select value={selected.batch_id?.toString()} onValueChange={(value) => handleSelectChange('batch_id', Number(value))}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.batch.length > 0 ? (
                    dropdownData.batch.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No batches found
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selected.subject_id?.toString()} onValueChange={(value) => handleSelectChange('subject_id', Number(value))} disabled={!selected.batch_id} open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} disabled={!selected.batch_id}>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.subject.length > 0 ? (
                    dropdownData.subject.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No subject assigned
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selected.branch_id?.toString()} onValueChange={(value) => handleSelectChange('branch_id', Number(value))} disabled={!selected.subject_id} open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} disabled={!selected.subject_id}>
                  <SelectValue placeholder={translateTerminology("Select Branch")} />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.branch.length > 0 ? (
                    dropdownData.branch.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No branch assigned
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selected.semester_id?.toString()} onValueChange={(value) => handleSelectChange('semester_id', Number(value))} disabled={!selected.branch_id || dropdownData.semester.length === 0} open={isSemesterOpen} onOpenChange={setIsSemesterOpen}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} disabled={!selected.branch_id || dropdownData.semester.length === 0}>
                  <SelectValue placeholder={translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.semester.length > 0 ? (
                    dropdownData.semester.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.number}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No semester
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selected.section_id?.toString()} onValueChange={(value) => handleSelectChange('section_id', Number(value))} disabled={!selected.semester_id || dropdownData.section.length === 0} open={isSectionOpen} onOpenChange={setIsSectionOpen}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} disabled={!selected.semester_id || dropdownData.section.length === 0}>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.section.length > 0 ? (
                    dropdownData.section.map((item) =>
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No section
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selected.testType} onValueChange={(value) => handleSelectChange('testType', value)} disabled={!selected.section_id} open={isTestTypeOpen} onOpenChange={setIsTestTypeOpen}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} disabled={!selected.section_id}>
                  <SelectValue placeholder="Select TestType" />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.testType.length > 0 ? (
                    dropdownData.testType.map((item) =>
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No test type
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selected.setNumber} onValueChange={(value) => handleSelectChange('setNumber', value)} disabled={!selected.testType || dropdownData.setNumber.length === 0} open={isSetNumberOpen} onOpenChange={setIsSetNumberOpen}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} disabled={!selected.testType || dropdownData.setNumber.length === 0}>
                  <SelectValue placeholder={dropdownData.setNumber.length > 0 ? "Select Set" : "No approved set"} />
                </SelectTrigger>
                <SelectContent className={`${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'} max-h-[200px]`}>
                  {dropdownData.setNumber.length > 0 ? (
                    dropdownData.setNumber.map((item) =>
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No approved set
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <TabsList className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-gray-100 border border-gray-300 text-gray-900'}>
              {/* Question Format tab removed per UX simplification */}
              <TabsTrigger
                value="questionPaper"
                id="upload-marks-tab-qp"
                className={`data-[state=active]:bg-primary data-[state=active]:text-white ${theme === 'dark' ? 'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground' : 'data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900'}`}>

                Question Paper
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                id="upload-marks-tab-manual"
                className={`data-[state=active]:bg-primary data-[state=active]:text-white transition-all ${existingQpSummary?.status === 'approved' ?
                  theme === 'dark' ?
                    'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground cursor-pointer' :
                    'data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900 cursor-pointer' :
                  'opacity-50 cursor-not-allowed'}`
                }
                disabled={!existingQpSummary || existingQpSummary.status !== 'approved'}
                title={!existingQpSummary || existingQpSummary.status !== 'approved' ? 'Question paper must be approved before accessing marks entry' : ''}>

                Marks Entry
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </div>

        <CardContent className="pt-4">
          <TabsContent value="manual">
            {!areAllDropdownsSelected() ?
              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-6 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`
              }>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <Layers className="w-12 h-12 opacity-80" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selection Required</h3>
                <p className="max-w-xs text-base leading-relaxed">
                  Please select all the dropdown options above to view and enter student marks.
                </p>
              </div> :

              <>
                {/* Students Table - only shown after saving question format */}
                {qpReady &&
                  <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-white'}`}>
                    {/* Header */}
                    <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${theme === 'dark' ? 'border-border bg-muted' : 'border-gray-300 bg-gray-50'}`}>
                      <h3 className="text-lg font-semibold">Internal Assessment Test</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleExportExcelMarksSheet}
                          disabled={isExportingExcel || loadingStudents || currentStudents.length === 0}
                          className="h-9 px-3.5 flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-300 font-medium border-emerald-300 dark:border-emerald-800 shadow-sm transition-all text-xs sm:text-sm"
                        >
                          {isExportingExcel ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span>{isExportingExcel ? "Generating Excel..." : "Export to Excel (.xlsx)"}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Table with new structure based on question format */}
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="min-w-full divide-y divide-gray-200  dark:divide-border">
                        <thead>
                          <tr>
                            <th rowSpan={3} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider align-middle">#</th>
                            <th rowSpan={3} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider align-middle">USN</th>
                            <th rowSpan={3} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider align-middle">Name</th>

                            {/* Dynamic Question Groups based on question format */}
                            {questions.map((question) =>
                              <th key={`q-${question.id}`} colSpan={3} className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">
                                Q{question.number}
                              </th>
                            )}

                            {/* Final Columns - Removed Marks After Weightage */}
                            <th rowSpan={3} className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider align-middle">Total Marks</th>
                          </tr>
                          <tr>
                            {/* Sub-columns for each question */}
                            {questions.map((question) =>
                              <Fragment key={`sub-${question.id}`}>
                                <th className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wider">CO</th>
                                <th className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wider">Max Marks</th>
                                <th className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wider">Marks</th>
                              </Fragment>
                            )}
                          </tr>
                          <tr>
                            {/* CO and Max Marks rows */}
                            {questions.map((question, index) =>
                              <Fragment key={`row-${question.id}`}>
                                <td className="px-2 py-1 text-center text-xs italic">CO</td>
                                <td className="px-2 py-1 text-center text-xs italic">Max marks</td>
                                <td className="px-2 py-1 text-center text-xs italic">{formatTestType(selected.testType)}</td>
                              </Fragment>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-border">
                          {loadingStudents ?
                            <tr>
                              <td colSpan={questions.length * 3 + 5} className="p-0">
                                <div className="w-full h-20 flex items-center justify-center">
                                  <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Loading students...</span>
                                  </div>
                                </div>
                              </td>
                            </tr> :
                            currentStudents.length === 0 ?
                              <tr>
                                <td colSpan={questions.length * 3 + 4} className="p-0">
                                  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center transition-all duration-300 ${theme === 'dark' ? 'text-muted-foreground bg-card/30' : 'text-gray-500 bg-gray-50/50'}`}>
                                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                                      <Layers className="w-8 h-8 opacity-80" />
                                    </div>
                                    <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
                                    <p className="max-w-md text-sm leading-relaxed">
                                      No students match the selected criteria (Batch, Subject, Branch, Semester, and Section). Please verify your assignments or contact the administrator.
                                    </p>
                                  </div>
                                </td>
                              </tr> :

                              currentStudents.map((student, index) =>
                                <tr key={student.id} className={`${theme === 'dark' ? 'hover:bg-muted' : 'hover:bg-gray-50'}`}>
                                  <td className="px-4 py-2 text-sm">{indexOfFirstStudent + index + 1}</td>
                                  <td className="px-4 py-2 text-sm">{student.usn}</td>
                                  <td className="px-4 py-2 text-sm whitespace-nowrap">{student.name}</td>

                                  {/* Dynamic question inputs based on question format */}
                                  {questions.map((question, qIndex) =>
                                    <Fragment key={`input-${question.id}-${student.id}`}>
                                      <td className="px-2 py-1 text-center">
                                        <Input
                                          type="text"
                                          className="w-16 text-center mx-auto"
                                          placeholder="CO"
                                          value={question.co}
                                          readOnly />

                                      </td>
                                      <td className="px-2 py-1 text-center">
                                        <Input
                                          type="text"
                                          className="w-16 text-center mx-auto"
                                          placeholder="Max"
                                          value={question.maxMarks}
                                          readOnly />

                                      </td>
                                      <td className="px-2 py-1 text-center">
                                        <Input
                                          type="number"
                                          className="w-16 text-center mx-auto"
                                          placeholder="Marks"
                                          value={studentMarks[student.id]?.[question.number] || ""}
                                          min="0"
                                          max={question.maxMarks}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const maxMarks = parseFloat(question.maxMarks);
                                            const numValue = parseFloat(value);

                                            // Validate that the entered value doesn't exceed max marks
                                            if (value !== "" && (isNaN(numValue) || numValue < 0 || numValue > maxMarks)) {
                                              // If invalid, don't update the state
                                              return;
                                            }

                                            const nextStudentMarks = {
                                              ...(studentMarks[student.id] || {}),
                                              [question.number]: value
                                            };

                                            setStudentMarks((prev) => {
                                              const updated = { ...prev };
                                              updated[student.id] = nextStudentMarks;
                                              return updated;
                                            });

                                            // Auto-update student total if not manually edited or if total was empty
                                            setStudents((prev) => prev.map((s) => {
                                              if (s.id !== student.id) return s;
                                              if (!s.totalEdited) {
                                                const newTotal = calculateStudentTotalFromMarks(nextStudentMarks, questions, totalMarks);
                                                return { ...s, total: newTotal };
                                              }
                                              return s;
                                            }));
                                          }} />

                                      </td>
                                    </Fragment>
                                  )}

                                  {/* Final columns */}
                                  <td className="px-4 py-2 text-center">
                                    {(() => {
                                      const displayTotal = student.total ?? '';

                                      // Check if current page state matches localStorage
                                      const isSaved = (() => {
                                        const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${student.id}`;
                                        const localDataStr = localStorage.getItem(localKey);
                                        if (!localDataStr) return false;
                                        try {
                                          const localData = JSON.parse(localDataStr);
                                          const savedQuestions = localData.questionMarks || {};
                                          const currentQuestions = studentMarks[student.id] || {};

                                          // Compare all question marks
                                          const qKeys = new Set([...Object.keys(currentQuestions), ...Object.keys(savedQuestions)]);
                                          for (const key of qKeys) {
                                            if ((currentQuestions[key] || "") !== (savedQuestions[key] || "")) {
                                              return false;
                                            }
                                          }
                                          // Compare total and override flag
                                          if ((displayTotal || "") !== (localData.total || "")) return false;
                                          if ((student.totalEdited || false) !== (localData.totalEdited || false)) return false;
                                          return true;
                                        } catch {
                                          return false;
                                        }
                                      })();

                                      return (
                                        <div className="flex items-center justify-center gap-2">
                                          <Input
                                            type="text"
                                            className="w-20 text-center mx-auto font-semibold"
                                            placeholder="Total"
                                            value={displayTotal}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              if (v === "") {
                                                setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, total: "", totalEdited: true } : s));
                                                return;
                                              }
                                              if (!/^\d*\.?\d*$/.test(v)) return;

                                              const numV = parseFloat(v);
                                              if (isNaN(numV) || numV < 0) return;

                                              if (totalMarks > 0 && numV > totalMarks) {
                                                MySwal.fire({
                                                  title: "Limit Exceeded",
                                                  text: `Total marks cannot exceed the maximum QP marks (${totalMarks}).`,
                                                  icon: "warning",
                                                  confirmButtonText: "OK"
                                                });
                                                return;
                                              }

                                              const studentQuestions = studentMarks[student.id] || {};
                                              const hasAnyQuestionMark = Object.values(studentQuestions).some(val => val !== undefined && val !== "");
                                              
                                              if (!hasAnyQuestionMark) {
                                                MySwal.fire({
                                                  title: "Action Not Allowed",
                                                  text: "You must enter marks for at least one question before you can enter the total.",
                                                  icon: "warning",
                                                  confirmButtonText: "OK"
                                                });
                                                return;
                                              }
                                              setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, total: v, totalEdited: true } : s));
                                            }} />

                                          {/* Save locally button */}
                                          <Button
                                            title={isSaved ? "Marks are saved locally as draft" : "Save marks locally as draft"}
                                            variant="outline"
                                            size="sm"
                                            className={`h-8 px-2 text-xs flex items-center gap-1 border-dashed shrink-0 ${isSaved
                                              ? "text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-950 dark:hover:border-emerald-900 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                                              : "text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 dark:border-blue-950 dark:hover:border-blue-900 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                                              }`}
                                            disabled={isSaved}
                                            onClick={() => {
                                              const studentQuestions = studentMarks[student.id] || {};
                                              const hasAnyQuestionMark = Object.values(studentQuestions).some(val => val !== undefined && val !== "");
                                              
                                              if (hasAnyQuestionMark && (!displayTotal || displayTotal === "")) {
                                                MySwal.fire({
                                                  title: "Missing Total",
                                                  text: "Please enter the total marks before saving.",
                                                  icon: "warning",
                                                  confirmButtonText: "OK"
                                                });
                                                return;
                                              }

                                              const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${selected.setNumber || 'default'}_${student.id}`;
                                              const marksData = {
                                                questionMarks: studentMarks[student.id] || {},
                                                total: displayTotal,
                                                totalEdited: student.totalEdited || false,
                                              };
                                              localStorage.setItem(localKey, JSON.stringify(marksData));

                                              // Force a re-render of this student's row
                                              setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s } : s));

                                              MySwal.fire({
                                                title: "Draft Saved Locally!",
                                                text: `Marks for ${student.name} have been saved locally.`,
                                                icon: "success",
                                                timer: 2000,
                                                showConfirmButton: false,
                                              });
                                            }}
                                          >
                                            {isSaved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                                            {isSaved ? "Saved" : "Save"}
                                          </Button>
                                        </div>);

                                    })()}
                                  </td>
                                </tr>
                              )
                          }
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                        <div>
                          Showing {Math.min((currentPage - 1) * studentsPerPage + 1, totalCount)} to {Math.min(currentPage * studentsPerPage, totalCount)} of {totalCount} students
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                            onClick={handlePrevPage}
                            disabled={pagination ? !pagination.has_previous : currentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center justify-center min-w-[2rem]">
                            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {currentPage}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                            onClick={handleNextPage}
                            disabled={pagination ? !pagination.has_next : currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </CardFooter>
                    )}
                  </div>
                }

                {/* Message to configure question format first */}
                {!qpReady &&
                  <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-6 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`
                  }>
                    <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      <Settings2 className="w-12 h-12 opacity-80" />
                    </div>
                    <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Configuration Needed</h3>
                    <p className="max-w-xs text-base leading-relaxed mb-6">
                      Please configure the question paper format first to enable marks entry for this subject.
                    </p>
                    <Button
                      onClick={handleRedirectToUploadQP}
                      className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20">

                      View Question Paper
                    </Button>
                  </div>
                }

                {/* Save button for Marks Entry */}
                {qpReady &&
                  <div className="flex justify-end mt-6">
                    <Button
                      className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
                      onClick={handleSubmit}
                      disabled={savingMarks}>

                      {savingMarks ?
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </> :

                        "Save"
                      }
                    </Button>
                  </div>
                }
              </>
            }
          </TabsContent>

          {/* Question Paper Tab - For viewing the saved format */}
          <TabsContent value="questionPaper" className="w-full max-w-full overflow-hidden mt-0">
            {qpReady && areAllDropdownsSelected() ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <h3 className="font-semibold text-lg">Question Paper Preview</h3>
                    {/* Mobile Download PDF Icon Button */}
                    <Button
                      onClick={downloadQuestionPaperPDF}
                      disabled={downloadingPDF}
                      size="icon"
                      variant="outline"
                      className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                    >
                      {downloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Desktop Download PDF Button */}
                    <Button
                      onClick={downloadQuestionPaperPDF}
                      disabled={downloadingPDF}
                      className="hidden sm:flex w-full sm:w-auto bg-primary text-white hover:bg-primary/90 transition-all duration-200 items-center justify-center gap-2"
                    >
                      {downloadingPDF ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {downloadingPDF ? "Downloading..." : "Download PDF"}
                    </Button>
                  </div>
                </div>

                {/* Status panel showing approval status and history */}
                {existingQpSummary && (
                  <div className={`p-4 rounded-lg border ${existingQpSummary.status === 'approved' ?
                    theme === 'dark' ?
                      'bg-green-500/10 text-green-300 border-green-500/30' :
                      'bg-green-50 text-green-800 border-green-200' :
                    theme === 'dark' ?
                      'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' :
                      'bg-yellow-50 text-yellow-800 border-yellow-200'}`
                  }>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Status:</span>
                        <span className="capitalize font-medium">
                          {existingQpSummary.status || 'Pending'}
                        </span>
                      </div>
                      {existingQpSummary.last_action && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span>Last Action:</span>
                            <span className="capitalize">
                              {existingQpSummary.last_action.action}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>By:</span>
                            <span>
                              {existingQpSummary.last_action.actor} ({existingQpSummary.last_action.role})
                            </span>
                          </div>
                          {existingQpSummary.last_action.timestamp && (
                            <div className="flex items-center justify-between text-sm">
                              <span>Date:</span>
                              <span>
                                {new Date(existingQpSummary.last_action.timestamp).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {existingQpSummary.last_action.comment && (
                            <div className="text-sm pt-2 border-t border-current border-opacity-30">
                              <span className="block font-medium mb-1">Comment:</span>
                              <span className="block italic">{existingQpSummary.last_action.comment}</span>
                            </div>
                          )}
                        </>
                      )}
                      {existingQpSummary.status !== 'approved' && (
                        <div className="pt-2 border-t border-current border-opacity-30 text-sm">
                          Once approved by COE, you can proceed to submit marks.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Question Paper Preview Sheet */}
                <div className="overflow-x-auto p-1 custom-scrollbar">
                  <div className={`min-w-[650px] max-w-4xl mx-auto ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-slate-900 border-slate-300'} border rounded-xl shadow-lg p-6 sm:p-8 space-y-4`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between pb-3 border-b-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                      <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-start">
                        {getOrgLogoUrl(existingQpSummary?.org_logo) ? (
                          <img
                            src={getOrgLogoUrl(existingQpSummary?.org_logo)}
                            alt="Logo"
                            className="max-h-16 max-w-[80px] sm:max-w-[90px] object-contain rounded"
                            onError={(e) => {
                              if ((e.currentTarget as HTMLImageElement).src !== window.location.origin + '/logo.jpeg') {
                                (e.currentTarget as HTMLImageElement).src = '/logo.jpeg';
                              }
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 text-center space-y-1">
                        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide">
                          {getOrgName(existingQpSummary?.org_name)}
                        </h2>
                        <div className="text-sm sm:text-base font-bold text-primary">
                          {selected.testType ? selected.testType.replace('_', ' ') : 'Internal Assessment'} {existingQpSummary?.set_number ? `- ${existingQpSummary.set_number}` : ''}
                        </div>
                      </div>
                      <div className="w-20 sm:w-24 flex-shrink-0" />
                    </div>

                    {/* Master Info Table */}
                    <div className={`border ${theme === 'dark' ? 'border-border' : 'border-slate-900'} rounded-sm overflow-hidden text-xs sm:text-sm`}>
                      <div className={`grid grid-cols-12 border-b ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                        <div className={`col-span-3 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Subject :</div>
                        <div className={`col-span-4 p-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'} border-r font-medium`}>
                          {dropdownData.subject.find(s => String(s.id) === String(selected.subject_id))?.name || selected.subject || '--'}
                        </div>
                        <div className={`col-span-2 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Date:</div>
                        <div className="col-span-3 p-2 font-medium">
                          {existingQpSummary?.exam_date || existingQpSummary?.date ? format(new Date((existingQpSummary.exam_date || existingQpSummary.date).includes('T') ? (existingQpSummary.exam_date || existingQpSummary.date) : `${existingQpSummary.exam_date || existingQpSummary.date}T00:00:00`), "MMM. dd, yyyy") : '--'}
                        </div>
                      </div>

                      <div className={`grid grid-cols-12 border-b ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                        <div className={`col-span-3 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Subject Code :</div>
                        <div className={`col-span-4 p-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'} border-r font-medium`}>
                          {(() => {
                            const currentSubject = dropdownData.subject.find(s => String(s.id) === String(selected.subject_id));
                            const currentAssignment = assignments.find(a => String(a.subject_id) === String(selected.subject_id) || (currentSubject && a.subject_name === currentSubject.name));
                            return currentSubject?.code || currentSubject?.subject_code || currentAssignment?.subject_code || '--';
                          })()}
                        </div>
                        <div className={`col-span-2 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Time:</div>
                        <div className="col-span-3 p-2 font-medium">
                          {existingQpSummary?.exam_time || existingQpSummary?.duration || '--'}
                        </div>
                      </div>

                      <div className="grid grid-cols-12">
                        <div className={`col-span-3 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Prepared by:</div>
                        <div className={`col-span-4 p-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'} border-r font-medium`}>
                          {(() => {
                            try {
                              const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
                              if (u.first_name || u.last_name) return `${u.first_name || ''} ${u.last_name || ''}`.trim();
                              if (u.full_name) return u.full_name;
                              if (u.name) return u.name;
                              if (u.username) return u.username;
                              return 'Faculty';
                            } catch {
                              return 'Faculty';
                            }
                          })()}
                        </div>
                        <div className={`col-span-2 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Semester / Div:</div>
                        <div className="col-span-3 p-2 font-medium">
                          {(() => {
                            const assign = assignments.find(a => String(a.subject_id) === String(selected.subject_id));
                            const semNum = selected.semester || selected.semester_id || assign?.semester || '--';
                            const branchName = dropdownData.branch.find(b => String(b.id) === String(selected.branch_id))?.name || selected.branch || assign?.branch || '';
                            const sec = selected.section || (selected.section_id ? (assign?.section || selected.section_id) : (assign?.section || '--'));
                            return `Semester ${semNum}${branchName ? ` - ${branchName}` : ''} / ${sec}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Instructions & Max Marks */}
                    <div className={`flex justify-between items-end border ${theme === 'dark' ? 'border-border bg-muted/20' : 'border-slate-900 bg-slate-50/50'} p-2.5 text-xs sm:text-sm`}>
                      <div>
                        <span className="font-bold italic">NOTE:</span>
                        <ol className="list-decimal list-inside text-xs mt-0.5 space-y-0.5 text-muted-foreground">
                          <li>Answer one FULL question from each part.</li>
                          <li>Assume missing data suitably.</li>
                        </ol>
                      </div>
                      <div className="text-right font-bold italic text-sm">
                        Max Marks: <span className="text-primary font-bold text-base not-italic ml-1">{totalMarks}</span>
                      </div>
                    </div>

                    {/* Question Parts Table */}
                    <div className={`border ${theme === 'dark' ? 'border-border' : 'border-slate-900'} rounded-sm overflow-hidden`}>
                      <table className="w-full text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className={`${theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-slate-100 border-slate-900'} border-b font-bold`}>
                            <th className={`w-16 p-2 text-center border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>Q No.</th>
                            <th className={`p-2 text-left border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>Question Content</th>
                            <th className={`w-16 p-2 text-center border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>Marks</th>
                            <th className={`w-24 p-2 text-center border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>RBT</th>
                            <th className="w-20 p-2 text-center">CO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupQuestionsByPart().map((part) => (
                            <React.Fragment key={part.name}>
                              {/* Part Header */}
                              <tr className={`${theme === 'dark' ? 'bg-muted/70 border-border' : 'bg-slate-200/80 border-slate-900'} border-b border-t font-bold text-center`}>
                                <td colSpan={5} className="py-1.5 uppercase tracking-wider text-xs sm:text-sm">
                                  {part.name}
                                </td>
                              </tr>

                              {part.questions.map((q) => (
                                <React.Fragment key={q.id}>
                                  {/* OR Separator */}
                                  {q.isOr && (
                                    <tr className={`border-b ${theme === 'dark' ? 'border-border bg-amber-950/20 text-amber-400' : 'border-slate-900 bg-amber-50/60 text-amber-700'} font-bold text-center`}>
                                      <td colSpan={5} className="py-1 text-xs tracking-widest uppercase">
                                        — OR —
                                      </td>
                                    </tr>
                                  )}

                                  {/* Question Row */}
                                  <tr className={`border-b ${theme === 'dark' ? 'border-border hover:bg-muted/30' : 'border-slate-900 hover:bg-slate-50/50'} transition-colors`}>
                                    <td className={`p-2.5 text-center font-bold align-top border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'} whitespace-nowrap`}>
                                      Q.{q.number}
                                    </td>
                                    <td className={`p-2.5 text-left align-top border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                                      <div
                                        className="whitespace-pre-line break-words text-xs sm:text-sm"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.content || 'Question content') }}
                                      />
                                    </td>
                                    <td className={`p-2.5 text-center font-semibold align-top border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                                      {q.maxMarks}
                                    </td>
                                    <td className={`p-2.5 text-center align-middle border-r ${theme === 'dark' ? 'border-border' : 'border-slate-900'} text-xs font-medium`}>
                                      {formatBloomsList(q.bloomsLevel).length > 0 ? (
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                          {formatBloomsList(q.bloomsLevel).map((bl, idx) => (
                                            <div key={idx} className="leading-tight">{bl}</div>
                                          ))}
                                        </div>
                                      ) : (
                                        '--'
                                      )}
                                    </td>
                                    <td className="p-2.5 text-center align-middle font-medium text-xs">
                                      {formatCO(q.co) || '--'}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Revised Bloom's Taxonomy Footer Table */}
                    <div className="space-y-1.5 pt-2">
                      <div className="font-bold text-xs">RBT – Revised Bloom’s Taxonomy</div>
                      <table className={`w-full max-w-md text-xs border ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-slate-300 text-slate-700'}`}>
                        <tbody>
                          <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-slate-300'}`}>
                            <td className={`p-1.5 border-r ${theme === 'dark' ? 'border-border' : 'border-slate-300'}`}>L1. Remembering</td>
                            <td className={`p-1.5 border-r ${theme === 'dark' ? 'border-border' : 'border-slate-300'}`}>L2. Understanding</td>
                            <td className="p-1.5">L3. Applying</td>
                          </tr>
                          <tr>
                            <td className={`p-1.5 border-r ${theme === 'dark' ? 'border-border' : 'border-slate-300'}`}>L4. Analyzing</td>
                            <td className={`p-1.5 border-r ${theme === 'dark' ? 'border-border' : 'border-slate-300'}`}>L5. Evaluating</td>
                            <td className="p-1.5">L6. Creating</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    onClick={() => setTabValue("manual")}
                    disabled={!existingQpSummary || existingQpSummary.status !== 'approved'}
                    className={`${existingQpSummary?.status === 'approved' ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    title={existingQpSummary?.status !== 'approved' ? 'Question paper must be approved by COE before proceeding to marks entry' : ''}>
                    Proceed to Marks Entry
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-6 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  {areAllDropdownsSelected() ? (
                    <Settings2 className="w-12 h-12 opacity-80" />
                  ) : (
                    <Layers className="w-12 h-12 opacity-80" />
                  )}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {areAllDropdownsSelected() ? "Configuration Needed" : "Selection Required"}
                </h3>
                <p className="max-w-xs text-base leading-relaxed mb-6">
                  {areAllDropdownsSelected() ?
                    "Please configure the question paper format first to view the final document." :
                    "Please select all the dropdown options first to view the question paper."}
                </p>
                {areAllDropdownsSelected() && (
                  <Button
                    onClick={handleRedirectToUploadQP}
                    className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20">
                    View Question Paper
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default UploadMarks;









// @contextScopeItemMention
// Subject selection: Only updates dropdowns, no API calls
// Branch/Semester/Section/TestType selection: after selecting all only then the qp shoudl be loaded correctly when all the dropdown is selcted but qp is stored based on the branch subject and test type when uploading the qp

// but if that. subject has multiple section user has to select one then only qp shodul be loaded and api shoudl be called to load it to ui
// and to load the students to upload the marks the user has to
// Switch to "Marks Entry" tab: Students load only then only the student list api shoudl be called until it no

// and until the qp is approved the marks entry and bulk upload tab shoudl be disabled correctly

// explain in shoert what you will do no code changes onyl explain in short