import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect, Fragment } from "react";
import { Pencil, Plus, Trash2, Layers, Settings2, FileDown, RotateCcw, Save, Check } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
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
}

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
  const [tabValue, setTabValue] = useState("questionPaper");
  const [errorMessage, setErrorMessage] = useState("");
  const [dropdownData, setDropdownData] = useState({
    batch: [] as { id: number; name: string; }[],
    branch: [] as { id: number; name: string; }[],
    semester: [] as { id: number; number: number; }[],
    section: [] as { id: number; name: string; }[],
    subject: [] as { id: number; name: string; }[],
    testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"]
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
    testType: ""
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

  // Auto calculation logic has been removed. Total is manually entered by the teacher.

  const fetchStudentsPage = async (page: number) => {
    if (!selected.subject_id || !selected.testType) return;
    const params: any = { subject_id: selected.subject_id.toString(), test_type: selected.testType, page, page_size: studentsPerPage };
    if (selected.batch_id) params.batch_id = selected.batch_id.toString();
    if (selected.branch_id) params.branch_id = selected.branch_id.toString();
    if (selected.semester_id) params.semester_id = selected.semester_id.toString();
    if (selected.section_id) params.section_id = selected.section_id.toString();
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
          const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${s.id}`;
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
  const [totalMarks, setTotalMarks] = useState(0);


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
      } catch (err) {}
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

  // Calculate total marks when questions change
  useEffect(() => {
    const total = questions.reduce((sum, q) => {
      const marks = parseInt(q.maxMarks) || 0;
      return sum + marks;
    }, 0);
    setTotalMarks(total);
  }, [questions]);

  // Load existing QP when all required dropdowns are selected
  useEffect(() => {
    if (areAllDropdownsSelected()) {
      loadExistingQP();
    } else {
      setQpId(null);
      setExistingQpSummary(null);
      setQuestions([]);
    }
  }, [selected.branch_id, selected.semester_id, selected.section_id, selected.subject_id, selected.testType]);

  // Load students only when switching to Marks Entry tab and all criteria met
  useEffect(() => {
    if (tabValue === 'manual' && areAllDropdownsSelected() && existingQpSummary?.status === 'approved') {
      fetchStudentsPage(1);
    } else if (tabValue === 'manual') {
      setStudents([]);
      setStudentMarks({});
    }
  }, [tabValue, selected.branch_id, selected.semester_id, selected.section_id, selected.subject_id, selected.testType, existingQpSummary]);

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
          const loadedQuestions: Question[] = [];
          (full.questions || []).forEach((q: any) => {
            if (q.subparts && q.subparts.length > 0) {
              q.subparts.forEach((sub: any) => {
                loadedQuestions.push({
                  id: `${q.question_number}${sub.subpart_label}`,
                  number: `${q.question_number}${sub.subpart_label}`,
                  content: sub.content || '',
                  maxMarks: String(sub.max_marks || 0),
                  co: q.co || 'UNMAPPED',
                  bloomsLevel: q.blooms_level || ''
                });
              });
            } else {
              loadedQuestions.push({
                id: `${q.question_number}`,
                number: `${q.question_number}`,
                content: q.content || '',
                maxMarks: String(q.max_marks || 0),
                co: q.co || 'UNMAPPED',
                bloomsLevel: q.blooms_level || ''
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
        detail: true,
        approved_only: true
      });
      if (qpResponse.success && qpResponse.data) {
        const existingQp = qpResponse.data.find((q: any) => {
          const branchId = typeof q.branch === 'object' ? q.branch?.id : q.branch;
          return branchId === selected.branch_id &&
            q.subject === selected.subject_id &&
            q.test_type === selected.testType;
        });

        if (existingQp) {
          setQpId(existingQp.id);
          setExistingQpSummary(existingQp);

          if (existingQp.questions) {
            const loadedQuestions: Question[] = [];
            (existingQp.questions || []).forEach((q: any) => {
              if (q.subparts && q.subparts.length > 0) {
                q.subparts.forEach((sub: any) => {
                  loadedQuestions.push({
                    id: `${q.question_number}${sub.subpart_label || sub.subpart}`,
                    number: `${q.question_number}${sub.subpart_label || sub.subpart}`,
                    content: sub.content || '',
                    maxMarks: String(sub.max_marks || 0),
                    co: q.co || 'UNMAPPED',
                    bloomsLevel: q.blooms_level || ''
                  });
                });
              } else {
                loadedQuestions.push({
                  id: `${q.question_number}`,
                  number: `${q.question_number}`,
                  content: q.content || '',
                  maxMarks: String(q.max_marks || 0),
                  co: q.co || 'UNMAPPED',
                  bloomsLevel: q.blooms_level || ''
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
          const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${s.id}`;
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
          <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b mb-3">
            <div className="flex-1 min-w-0">
              <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Upload Marks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-0 space-y-6">
            <div id="upload-marks-selectors" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

        <CardContent className="pt-6">
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
                    <div className={`p-4 border-b ${theme === 'dark' ? 'border-border bg-muted' : 'border-gray-300 bg-gray-50'}`}>
                      <h3 className="text-lg font-semibold">Internal Assessment Test</h3>
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
                                            const maxMarks = parseInt(question.maxMarks);
                                            const numValue = parseInt(value);

                                            // Validate that the entered value doesn't exceed max marks
                                            if (value !== "" && (isNaN(numValue) || numValue < 0 || numValue > maxMarks)) {
                                              // If invalid, don't update the state
                                              return;
                                            }

                                            setStudentMarks((prev) => {
                                              const updated = { ...prev };
                                              if (!updated[student.id]) updated[student.id] = {};
                                              updated[student.id][question.number] = value;
                                              return updated;
                                            });
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
                                            className="w-20 text-center mx-auto"
                                            placeholder="Total"
                                            value={displayTotal}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              if (!/^\d*$/.test(v)) return;

                                              // Cap total to 100
                                              if (v !== "" && parseInt(v) > 100) return;

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
                                              const localKey = `local_marks_${selected.subject_id}_${selected.testType}_${student.id}`;
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

          {/* Question Format tab content removed */}

          {/* Question Paper Tab - For viewing the saved format */}
          <TabsContent value="questionPaper">
            {qpReady && areAllDropdownsSelected() ?
              <div>
                <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-background border border-border' : 'bg-white border border-gray-300'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                      <h3 className="text-lg font-semibold">Question Paper Format</h3>
                      {/* Mobile Download PDF Icon Button */}
                      <Button
                        onClick={downloadQuestionPaperPDF}
                        disabled={downloadingPDF}
                        size="icon"
                        variant="outline"
                        className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                      >
                        {downloadingPDF ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      onClick={downloadQuestionPaperPDF}
                      disabled={downloadingPDF}
                      className="hidden sm:flex w-full sm:w-auto bg-primary text-white hover:bg-primary/90 items-center justify-center gap-2">
                      {downloadingPDF ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {downloadingPDF ? "Downloading..." : "Download PDF"}
                    </Button>
                  </div>

                  {/* Status panel showing approval status and history */}
                  {existingQpSummary &&
                    <div className={`mb-6 p-4 rounded-md border ${existingQpSummary.status === 'approved' ?
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
                        {existingQpSummary.last_action &&
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
                            {existingQpSummary.last_action.timestamp &&
                              <div className="flex items-center justify-between text-sm">
                                <span>Date:</span>
                                <span>
                                  {new Date(existingQpSummary.last_action.timestamp).toLocaleString()}
                                </span>
                              </div>
                            }
                            {existingQpSummary.last_action.comment &&
                              <div className="text-sm pt-2 border-t border-current border-opacity-30">
                                <span className="block font-medium mb-1">Comment:</span>
                                <span className="block italic">{existingQpSummary.last_action.comment}</span>
                              </div>
                            }
                          </>
                        }
                        {existingQpSummary.status !== 'approved' &&
                          <div className="pt-2 border-t border-current border-opacity-30 text-sm">
                            Once approved, you can submit marks.
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <div className={`border-0 sm:border rounded-none sm:rounded-lg ${theme === 'dark' ? 'bg-transparent sm:bg-gray-800 border-border' : 'bg-transparent sm:bg-gray-50 border-gray-200'}`}>
                    <div className="space-y-3 p-0 sm:p-4">
                      {Object.keys(groupQuestionsByMain()).map((mainQ) => {
                        const grouped = groupQuestionsByMain();
                        return (
                          <div key={mainQ} className="space-y-3">
                            {grouped[mainQ].map((s, sIndex) => {
                              const key = `${mainQ}-${sIndex}`;
                              const isExpanded = !!expanded[key];
                              const shortContent = (s.content || '').length > 160 ? (s.content || '').slice(0, 160) + '…' : s.content || '';
                              return (
                                <div key={s.id} className={`${getQuestionCardClassName()} shadow-sm hover:shadow-md transition-all duration-200`}>
                                  {/* Mobile View Layout */}
                                  <div className="block sm:hidden space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2 border-border/50">
                                      <div className="flex items-center gap-2">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center font-medium text-xs`}>
                                          {s.number}
                                        </div>
                                      </div>
                                      <Badge className={`font-semibold text-xs ${getBadgeClassName()}`}>
                                        {s.maxMarks}m
                                      </Badge>
                                    </div>
                                    <div 
                                      className={`text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'} text-left whitespace-pre-line break-words`}
                                      dangerouslySetInnerHTML={{ __html: isExpanded ? (s.content || '') : (shortContent || '') }}
                                    />
                                    {(s.content || '').length > 160 && (
                                      <div className="pt-1 text-left">
                                        <button
                                          onClick={() => toggleExpanded(key)}
                                          className={getButtonClassName()}>
                                          {isExpanded ? 'Show less' : 'Show more'}
                                        </button>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      <Badge className={getBadgeClassName()}>CO: {s.co}</Badge>
                                      <Badge className={getBadgeClassName()}>{s.bloomsLevel}</Badge>
                                    </div>
                                  </div>

                                  {/* Desktop View Layout */}
                                  <div className="hidden sm:flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center font-medium text-sm`}>
                                      {s.number}
                                    </div>
                                    <div className="flex-1 pt-2">
                                      <div className="flex justify-between items-start gap-4">
                                        <div 
                                          className={`text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'} mb-1 flex-1 text-left whitespace-pre-line break-words`}
                                          dangerouslySetInnerHTML={{ __html: isExpanded ? (s.content || '') : (shortContent || '') }}
                                        />
                                        <div className="ml-2 flex-shrink-0">
                                          <Badge className={`font-semibold text-sm ${getBadgeClassName()}`}>{s.maxMarks}m</Badge>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center justify-start gap-2 mt-2 w-full text-left">
                                        <Badge className={getBadgeClassName()}>CO: {s.co}</Badge>
                                        <Badge className={getBadgeClassName()}>{s.bloomsLevel}</Badge>
                                        {(s.content || '').length > 160 &&
                                          <button
                                            onClick={() => toggleExpanded(key)}
                                            className={getButtonClassName()}>
                                            {isExpanded ? 'Show less' : 'Show more'}
                                          </button>
                                        }
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      <div className={`font-semibold pt-2 border-t ${theme === 'dark' ? 'border-gray-700 text-foreground' : 'border-gray-200 text-gray-900'}`}>
                        Total Marks: {totalMarks}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    {/* Edit removed — QP editing happens on the Upload QP page */}
                    <Button
                      onClick={() => setTabValue("manual")}
                      disabled={!existingQpSummary || existingQpSummary.status !== 'approved'}
                      className={`${existingQpSummary?.status === 'approved' ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      title={existingQpSummary?.status !== 'approved' ? 'Question paper must be approved by COE before proceeding to marks entry' : ''}>

                      Proceed to Marks Entry
                    </Button>
                  </div>
                </div>
              </div> :

              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-6 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`
              }>
                <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  {areAllDropdownsSelected() ?
                    <Settings2 className="w-12 h-12 opacity-80" /> :

                    <Layers className="w-12 h-12 opacity-80" />
                  }
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {areAllDropdownsSelected() ? "Configuration Needed" : "Selection Required"}
                </h3>
                <p className="max-w-xs text-base leading-relaxed mb-6">
                  {areAllDropdownsSelected() ?
                    "Please configure the question paper format first to view the final document." :
                    "Please select all the dropdown options first to view the question paper."}
                </p>
                {areAllDropdownsSelected() &&
                  <Button
                    onClick={handleRedirectToUploadQP}
                    className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20">

                    View Question Paper
                  </Button>
                }
              </div>
            }
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>);

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