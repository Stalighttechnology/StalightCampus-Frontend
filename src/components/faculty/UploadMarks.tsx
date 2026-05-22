import { useState, useEffect, Fragment } from "react";
import { Pencil, Plus, Trash2, Layers, Settings2 } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem } from
"@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadCloud, X } from "lucide-react";
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
  getQuestionPaperDetail } from
"../../utils/faculty_api";
import { useFacultyAssignmentsQuery } from "../../hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { normalizePaginatedResponse } from "../../utils/normalizePagination";
import { useToast } from "@/hooks/use-toast";
import { SkeletonTable } from "@/components/ui/skeleton";

const MySwal = withReactContent(Swal);

// Constants for validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const REQUIRED_HEADERS = ['usn', 'name', 'marks'];
const MAX_RECORDS = 500;
const SAMPLE_ROW = ['1AM22CI064', 'Amit Kumar', '85/100'];

// Add new constants for Excel template
const EXCEL_TEMPLATE_HEADERS = [
'SL No', 'USN', '1a', '1b', '1c', 'T1', '2a', '2b', '2c', 'T2', 'P-A TOT',
'3a', '3b', '3c', 'T3', '4a', '4b', '4c', 'T4', 'P-B TOT', '5a', '5b', 'T5',
'6a', '6b', 'T6', 'P-C TOT', 'TOT', 'IA1 (25)'];


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
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useFacultyAssignmentsQuery();
  const { toast } = useToast();
  const [dropdownData, setDropdownData] = useState({
    branch: [] as {id: number;name: string;}[],
    semester: [] as {id: number;number: number;}[],
    section: [] as {id: number;name: string;}[],
    subject: [] as {id: number;name: string;}[],
    testType: ["IA1", "IA2", "IA3", "SEE"]
  });
  const [selected, setSelected] = useState({
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
  const [students, setStudents] = useState<(ClassStudent & {marks: string;total: string;isEditing: boolean;totalEdited?: boolean;})[]>([]);
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
  const [bulkUploadCompleted, setBulkUploadCompleted] = useState(false);

  const calculateTotal = (marks: Record<string, string>) => {
    // Group marks by main question number and SUM subpart marks per main question
    const mainMarks: Record<string, number> = {};
    Object.keys(marks).forEach((key) => {
      const mainQ = key.charAt(0);
      const mark = parseFloat(marks[key]) || 0;
      mainMarks[mainQ] = (mainMarks[mainQ] || 0) + mark;
    });

    // Attended main questions
    const attended = Object.keys(mainMarks).filter((q) => mainMarks[q] > 0);

    // If no questions attempted, return 0
    if (attended.length === 0) return '0';

    // If only one question attempted, return its summed marks
    if (attended.length === 1) {
      return mainMarks[attended[0]].toString();
    }

    // If two questions attempted:
    // - if the pair is an allowed combo (1+3,1+4,2+3,2+4) return sum
    // - otherwise (e.g., 1 and 2 only) return the maximum of the two main marks
    if (attended.length === 2) {
      const a = attended[0];
      const b = attended[1];
      const pairAllowed =
      a === '1' && (b === '3' || b === '4') ||
      a === '2' && (b === '3' || b === '4') ||
      b === '1' && (a === '3' || a === '4') ||
      b === '2' && (a === '3' || a === '4');

      if (pairAllowed) {
        return (mainMarks[a] + mainMarks[b]).toString();
      }
      return Math.max(mainMarks[a], mainMarks[b]).toString();
    }

    // For three or more questions, use combination logic to find best valid combination
    // Possible combos: 1+3, 1+4, 2+3, 2+4
    const combos: number[] = [];
    const has1 = attended.includes('1');
    const has2 = attended.includes('2');
    const has3 = attended.includes('3');
    const has4 = attended.includes('4');

    if (has1 && has3) combos.push(mainMarks['1'] + mainMarks['3']);
    if (has1 && has4) combos.push(mainMarks['1'] + mainMarks['4']);
    if (has2 && has3) combos.push(mainMarks['2'] + mainMarks['3']);
    if (has2 && has4) combos.push(mainMarks['2'] + mainMarks['4']);

    if (combos.length > 0) {
      // If student attempted 1,2,3 then combos include 1+3 and 2+3; pick max
      return Math.max(...combos).toString();
    }

    // If no valid combos but multiple questions attempted, sum all attempted main question marks
    const total = attended.reduce((sum, q) => sum + mainMarks[q], 0);
    return total.toString();
  };

  const fetchStudentsPage = async (page: number) => {
    if (!selected.subject_id || !selected.testType) return;
    const params: any = { subject_id: selected.subject_id.toString(), test_type: selected.testType, page, page_size: studentsPerPage };
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
          const marksForStudent = initialMarks[s.id?.toString()] || {};
          const autoTotal = calculateTotal(marksForStudent) || '';
          const existingTotal = existingTotals[s.id];
          const totalValue = existingTotal != null ? String(existingTotal) : String(totalMarks);
          const isEdited = existingTotal != null ? String(existingTotal) !== String(autoTotal) : false;
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
          newStudents.forEach((st) => {m[st.id] = 'view';});
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null); // New state for bulk upload
  const [tabValue, setTabValue] = useState("questionPaper");
  const [dragActive, setDragActive] = useState(false);
  const [bulkDragActive, setBulkDragActive] = useState(false); // New state for bulk upload drag
  const [errorMessage, setErrorMessage] = useState("");
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
    return () => {mounted = false;};
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
      const isQuestionPaperTab = tabValue === 'questionPaper';
      const qpResponse = await getQuestionPapers({
        branch_id: selected.branch_id?.toString(),
        semester_id: selected.semester_id?.toString(),
        section_id: selected.section_id?.toString(),
        subject_id: selected.subject_id?.toString(),
        test_type: selected.testType,
        detail: isQuestionPaperTab,
        approved_only: false
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

          if (isQuestionPaperTab && existingQp.questions) {
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
    const groupedQuestions: Record<string, {co: string;blooms_level: string;subparts: Array<{subpart_label: string;content: string;max_marks: number;}>;}> = {};
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

    // Prepare marks data
    const marksData: UploadIAMarksRequest = {
      question_paper_id: existingQpSummary.id,
      marks_data: students.map((s) => {
        const marksDetail = Object.fromEntries(
          Object.entries(studentMarks[s.id.toString()] || {}).map(([key, value]) => [key, parseFloat(value) || 0])
        );
        // If instructor manually edited total for this student, prefer that value
        const autoTotal = parseFloat(calculateTotal(studentMarks[s.id.toString()] || {})) || 0;
        const manualTotal = s.totalEdited ? parseFloat(s.total as any) || autoTotal : null;
        return {
          student_id: s.id,
          marks_detail: marksDetail,
          total_obtained: manualTotal !== null ? manualTotal : autoTotal
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
        MySwal.fire({
          title: "Marks uploaded!",
          icon: "success",
          confirmButtonText: "OK"
        });
        // Update local state to reflect saved status without a fresh GET call
        setStudents((prev) => prev.map((s) => ({ ...s, totalEdited: false })));
        setOriginalStudentMarks(JSON.parse(JSON.stringify(studentMarks)));
        setActionModes((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((id) => {updated[id] = 'view';});
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size exceeds the 5MB limit.');
      return;
    }
    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
    if (!isCSV && !isExcel) {
      setErrorMessage('Unsupported file type. Please upload CSV or Excel file.');
      return;
    }
    setSelectedFile(file);
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = async (event) => {
      let data: (string | number)[][] = [];
      if (isCSV) {
        const text = event.target?.result as string;
        const parsed = Papa.parse(text, { skipEmptyLines: true });
        data = parsed.data;
      } else {
        const workbook = XLSX.read(event.target?.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      }
      const header = data[0]?.map((cell: string | number) => String(cell).trim().toLowerCase());
      const expectedHeader = REQUIRED_HEADERS.map((h) => h.toLowerCase());
      if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
        setErrorMessage('Invalid header. Required: usn, name, marks');
        return;
      }
      const firstRow = data[1]?.map((cell: string | number) => String(cell).trim());
      if (!firstRow || firstRow.length < 3) {
        setErrorMessage("Invalid first row. It must contain at least 3 values: USN, Name, and Marks.");
        return;
      }
      if (!firstRow[0]?.trim()) {
        setErrorMessage("USN in the first row is empty.");
        return;
      }
      const [usn, name, marksStr] = firstRow;
      const [marks, total] = (marksStr as string).split("/").map((s: string) => s.trim());
      if (isNaN(parseInt(marks, 10)) || isNaN(parseInt(total, 10))) {
        setErrorMessage(`Invalid Marks or Total in first row. Expected: Numeric values`);
        return;
      }
      const recordCount = data.length - 1;
      if (recordCount > MAX_RECORDS) {
        setErrorMessage('File contains more than 500 records.');
        return;
      }
      try {
        const { branch_id, semester_id, section_id, subject_id } = selected;
        if (!branch_id || !semester_id || !section_id || !subject_id) {
          setErrorMessage("Select all class details before uploading.");
          return;
        }
        const studentsList = await getStudentsForClass(branch_id, semester_id, section_id, subject_id);
        if (!studentsList) {
          setErrorMessage("Failed to fetch student list.");
          return;
        }
        const studentMap = new Map(studentsList.map((s) => [s.usn, s]));
        const studentData: (ClassStudent & {marks: string;total: string;isEditing: boolean;})[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const usn = row[0]?.toString().trim();
          const name = row[1]?.toString().trim();
          const marksStr = row[2]?.toString().trim();
          if (!usn || !name || !marksStr) {
            setErrorMessage(`Row ${i + 1} is incomplete. Please provide USN, Name, and Marks.`);
            return;
          }
          const student = studentMap.get(usn);
          if (!student) {
            setErrorMessage(`Student with USN ${usn} not found.`);
            return;
          }
          const [marks, total] = marksStr.split("/").map((s: string) => s.trim());
          if (isNaN(parseInt(marks, 10)) || isNaN(parseInt(total, 10))) {
            setErrorMessage(`Invalid Marks or Total in row ${i + 1}. Expected: Numeric values`);
            return;
          }
          studentData.push({
            ...student,
            marks,
            total,
            isEditing: false,
            totalEdited: false
          });
        }
        setStudents(studentData);
        setErrorMessage("");
      } catch (error) {

        setErrorMessage("Failed to fetch students.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // New function to handle bulk upload file change
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size exceeds the 5MB limit.');
      return;
    }

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isExcel) {
      setErrorMessage('Unsupported file type. Please upload Excel file (.xlsx or .xls).');
      return;
    }

    setBulkUploadFile(file);
    setErrorMessage("");
  };

  // New function to handle bulk upload drag events
  const handleBulkDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragActive(true);
  };

  const handleBulkDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragActive(false);
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleBulkFileChange(event);
    }
  };

  // New function to clear bulk upload file
  const handleClearBulkFile = () => {
    setBulkUploadFile(null);
    setErrorMessage("");
  };

  const handleProcessBulkUpload = async () => {
    if (bulkUploadFile) {
      await processBulkUpload(bulkUploadFile);
    }
  };

  const processBulkUpload = async (file: File) => {
    try {
      setErrorMessage("");

      // Read the Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header rows (first 8 rows based on template)
      const dataRows = jsonData.slice(8) as (string | number)[][];

      // Process each row and update student marks
      const updatedStudentMarks: Record<string, Record<string, string>> = {};

      // Get student list for the selected class
      const { branch_id, semester_id, section_id, subject_id } = selected;
      const studentsList = await getStudentsForClass(
        branch_id!,
        semester_id!,
        section_id!,
        subject_id!
      );

      if (!studentsList) {
        setErrorMessage("Failed to fetch student list.");
        return;
      }

      // Create USN to student ID mapping
      const usnToIdMap = new Map<string, number>();
      studentsList.forEach((student: ClassStudent) => {
        usnToIdMap.set(student.usn.toUpperCase(), student.id);
      });



      // Process each row
      for (const row of dataRows) {
        if (row.length < 2) continue;

        const usn = String(row[1]).trim().toUpperCase(); // USN is in column B (index 1)
        const studentId = usnToIdMap.get(usn);



        if (!studentId) {

          continue;
        }

        // Initialize marks for this student
        updatedStudentMarks[studentId.toString()] = {};

        // Map Excel columns to question numbers
        // Column mapping based on the template:
        // C(2): 1a, D(3): 1b, E(4): 1c, G(6): 2a, H(7): 2b, I(8): 2c
        // L(11): 3a, M(12): 3b, N(13): 3c, P(15): 4a, Q(16): 4b, R(17): 4c

        const columnMapping: Record<number, string> = {
          2: '1a', 3: '1b', 4: '1c',
          6: '2a', 7: '2b', 8: '2c',
          11: '3a', 12: '3b', 13: '3c',
          15: '4a', 16: '4b', 17: '4c'
        };

        // Extract marks from columns
        Object.entries(columnMapping).forEach(([colIndex, questionNumber]) => {
          const colIdx = parseInt(colIndex);
          if (colIdx < row.length) {
            const value = row[colIdx];
            const marks = value !== null && value !== undefined ? String(value).trim() : '';

            if (marks !== '' && !isNaN(Number(marks))) {
              updatedStudentMarks[studentId.toString()][questionNumber] = marks;
            }
          }
        });
      }

      // Update student marks state

      setStudentMarks(updatedStudentMarks);
      setBulkUploadCompleted(true);

      // Switch to manual tab to show the results

      setTabValue("manual");

      MySwal.fire({
        title: "Bulk Upload Successful!",
        text: "Marks have been imported successfully. Please review and save.",
        icon: "success",
        confirmButtonText: "OK"
      });
    } catch (error) {

      setErrorMessage("Failed to process the Excel file. Please check the format and try again.");
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setErrorMessage("");
  };

  const handleDownloadTemplate = () => {
    const csvContent = [
    ['usn', 'name', 'marks'],
    ['1AM22CI064', 'Pannaga J A', '85/100']].

    map((row) => row.join(',')).
    join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  };

  // New function to download Excel template
  const downloadExcelTemplate = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet data
    const ws_data = [
    // Header rows
    ["Department of Computer Science & Engineering (AIML)"],
    ["FIRST SEMESTER"],
    [""],
    ["FIRST INTERNAL ASSESSMENT – NOVEMBER 2025"],
    [""],
    ["Subject Code: 1BEIT105", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Subject Name: PROGRAMMING IN C"],
    [""],
    // Column headers
    ["SL No", "USN", "1a", "1b", "1c", "T1", "2a", "2b", "2c", "T2", "P-A TOT", "3a", "3b", "3c", "T3", "4a", "4b", "4c", "T4", "P-B TOT", "5a", "5b", "T5", "6a", "6b", "T6", "P-C TOT", "TOT", "IA1 (25)"],
    // Sample data row
    ["1", "COM240109", "7", "6", "6", "20", "3", "2", "5", "16", "20", "3", "0", "6", "10", "5", "6", "6", "18", "18", "7", "2", "9", "3", "2", "5", "9", "23.5", ""],
    ["2", "COM240117", "7", "7", "6", "", "7", "7", "6", "", "", "7", "7", "6", "", "7", "7", "6", "", "", "", "", "", "", "", "", "", "", ""],
    ["3", "1AM25C003", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["4", "1AM25C004", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["5", "1AM25C005", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["6", "1AM25C006", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["7", "1AM25C007", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["8", "1AM25C008", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["9", "1AM25C009", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["10", "1AM25C010", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["11", "1AM25C011", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["12", "1AM25C012", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["13", "1AM25C013", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["14", "1AM25C014", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["15", "1AM25C015", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["16", "1AM25C016", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["17", "1AM25C017", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["18", "1AM25C018", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]];


    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Merge cells for header
    if (!ws['!merges']) ws['!merges'] = [];

    // Merge cells for title
    ws['!merges'].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 28 } }, // Department title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 28 } }, // Semester
      { s: { r: 3, c: 0 }, e: { r: 3, c: 28 } }, // Assessment
      { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } }, // Subject code
      { s: { r: 5, c: 28 }, e: { r: 5, c: 28 } } // Subject name
    );

    // Set column widths
    const columnWidths = [
    { wch: 8 }, // SL No
    { wch: 12 }, // USN
    { wch: 5 }, // 1a
    { wch: 5 }, // 1b
    { wch: 5 }, // 1c
    { wch: 5 }, // T1
    { wch: 5 }, // 2a
    { wch: 5 }, // 2b
    { wch: 5 }, // 2c
    { wch: 5 }, // T2
    { wch: 8 }, // P-A TOT
    { wch: 5 }, // 3a
    { wch: 5 }, // 3b
    { wch: 5 }, // 3c
    { wch: 5 }, // T3
    { wch: 5 }, // 4a
    { wch: 5 }, // 4b
    { wch: 5 }, // 4c
    { wch: 5 }, // T4
    { wch: 8 }, // P-B TOT
    { wch: 5 }, // 5a
    { wch: 5 }, // 5b
    { wch: 5 }, // T5
    { wch: 5 }, // 6a
    { wch: 5 }, // 6b
    { wch: 5 }, // T6
    { wch: 8 }, // P-C TOT
    { wch: 8 }, // TOT
    { wch: 10 } // IA1 (25)
    ];

    ws['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Marks Entry");

    // Export the workbook
    XLSX.writeFile(wb, "Marks_Entry_Template.xlsx");
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
  };

  // Remove the old areAllDropdownsSelected (we've moved it up)

  // Add the download PDF function inside the component
  const downloadQuestionPaperPDF = () => {
    const doc = new jsPDF();

    // Set font properties
    doc.setFont('helvetica');

    // Add title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Question Paper Format', 105, 20, { align: 'center' });

    // Add horizontal line
    doc.setDrawColor(162, 89, 255); // Purple color
    doc.line(20, 25, 190, 25);

    // Add subject and test type info
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0); // Black color
    doc.text(`Subject: ${selected.subject}`, 20, 35);
    doc.text(`Test Type: ${selected.testType}`, 20, 42);
    doc.text(`Total Marks: ${totalMarks}`, 20, 49);

    // Add questions header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(162, 89, 255); // Purple color
    doc.text('Questions:', 20, 65);

    // Add questions with improved formatting
    let yPosition = 75;
    questions.forEach((question, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Add question number with purple color
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(162, 89, 255); // Purple color
      doc.text(`${question.number}.`, 20, yPosition);

      // Add question content
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0); // Black color
      const questionText = question.content || "No question content entered";
      const splitText = doc.splitTextToSize(questionText, 120);
      doc.text(splitText, 35, yPosition);

      // Calculate text height for proper positioning of metadata
      const textHeight = splitText.length * 5;
      const metadataYPosition = yPosition + textHeight + 5;

      // Add CO, Blooms Level, and marks information below the question text
      let additionalInfo = `Marks: ${question.maxMarks}`;
      if (question.co) {
        additionalInfo += ` | CO: ${question.co}`;
      }
      if (question.bloomsLevel) {
        additionalInfo += ` | Blooms: ${question.bloomsLevel}`;
      }

      doc.setFont(undefined, 'italic');
      doc.setTextColor(100, 100, 100); // Gray color
      doc.text(additionalInfo, 35, metadataYPosition);

      // Calculate new Y position based on text height with proper spacing
      const metadataHeight = 5; // Height of metadata line
      yPosition += Math.max(textHeight, 10) + metadataHeight + 15;

      // Add a subtle separator line
      doc.setDrawColor(200, 200, 200); // Light gray
      doc.line(25, yPosition - 8, 185, yPosition - 8);
    });

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(150, 150, 150); // Light gray
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    // Save the PDF
    const fileName = `Question_Paper_Format_${selected.subject}_${selected.testType}.pdf`;
    doc.save(fileName);
  };

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}>
      <Tabs id="upload-marks-tabs" value={tabValue} onValueChange={(newTab) => {
        // Prevent switching to Marks Entry or Bulk Upload if QP is not approved
        if ((newTab === 'manual' || newTab === 'bulkUpload') && (!existingQpSummary || existingQpSummary.status !== 'approved')) {
          toast({
            title: 'Cannot Access Tab',
            description: 'The question paper must be approved by COE before you can enter or upload marks.',
            variant: 'destructive'
          });
          return;
        }
        setTabValue(newTab);
      }} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
        <div id="upload-marks-header-section" className="border-b border-border/50 pb-4">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Upload Marks</CardTitle>
          </CardHeader>
          <CardContent className="pb-0 space-y-6">
            <div id="upload-marks-selectors" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select value={selected.subject_id?.toString()} onValueChange={(value) => handleSelectChange('subject_id', Number(value))}>
            <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              {dropdownData.subject.map((item) =>
              <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selected.branch_id?.toString()} onValueChange={(value) => handleSelectChange('branch_id', Number(value))}>
            <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              {dropdownData.branch.map((item) =>
              <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selected.semester_id?.toString()} onValueChange={(value) => handleSelectChange('semester_id', Number(value))}>
            <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              {dropdownData.semester.map((item) =>
              <SelectItem key={item.id} value={item.id.toString()}>
                  {item.number}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selected.section_id?.toString()} onValueChange={(value) => handleSelectChange('section_id', Number(value))}>
            <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              {dropdownData.section.map((item) =>
              <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selected.testType} onValueChange={(value) => handleSelectChange('testType', value)}>
            <SelectTrigger className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              <SelectValue placeholder="Select TestType" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
              {dropdownData.testType.map((item) =>
              <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
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
            <TabsTrigger
              value="bulkUpload"
              id="upload-marks-tab-bulk"
              className={`data-[state=active]:bg-primary data-[state=active]:text-white transition-all ${existingQpSummary?.status === 'approved' ?
              theme === 'dark' ?
              'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground cursor-pointer' :
              'data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-900 cursor-pointer' :
              'opacity-50 cursor-not-allowed'}`
              }
              disabled={!existingQpSummary || existingQpSummary.status !== 'approved'}
              title={!existingQpSummary || existingQpSummary.status !== 'approved' ? 'Question paper must be approved before accessing bulk upload' : ''}>
              
              Bulk Upload
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
                    <div className="overflow-x-auto">
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
                            <th rowSpan={3} className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider align-middle">Action</th>
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
                              <td colSpan={questions.length * 3 + 5} className={`text-center text-sm p-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                No students found for selected criteria.
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
                              readOnly={actionModes[student.id] !== 'edit'}
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
                            const autoTotal = calculateTotal(studentMarks[student.id] || {});
                            const displayTotal = student.totalEdited ? student.total ?? '' : autoTotal || (student.total ?? '');
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
                                    setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, total: v, totalEdited: true } : s));
                                  }} />
                                
                                        {/* Reset to auto-calc */}
                                        <button
                                  title="Reset to auto"
                                  className="text-xs text-muted-foreground"
                                  onClick={() => {
                                    setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, totalEdited: false, total: calculateTotal(studentMarks[student.id] || {}) } : s));
                                  }}>
                                  
                                          Reset
                                        </button>
                                      </div>);

                          })()}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {actionModes[student.id] === 'edit' ?
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-white"
                            disabled={JSON.stringify(studentMarks[student.id] || {}) === JSON.stringify(originalStudentMarks[student.id] || {})}
                            onClick={() => {
                              // Row-level save only locks the row locally
                              setActionModes((prev) => ({
                                ...prev,
                                [student.id]: 'view'
                              }));
                            }}>
                            
                                      Save
                                    </Button> :

                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-white"
                            onClick={() => {
                              setActionModes((prev) => ({
                                ...prev,
                                [student.id]: 'edit'
                              }));
                            }}>
                            
                                      Edit
                                    </Button>
                          }
                                </td>
                              </tr>
                      )
                      }
                        </tbody>
                      </table>
                    </div>

                    <div className={`flex justify-between items-center mt-4 px-4 py-2 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="space-x-2">
                        <Button
                      variant="outline"
                      size="sm"
                      className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out"
                      onClick={handlePrevPage}
                      disabled={pagination ? !pagination.has_previous : currentPage === 1}>
                      
                          Previous
                        </Button>
                        <Button
                      variant="outline"
                      size="sm"
                      className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out"
                      onClick={handleNextPage}
                      disabled={pagination ? !pagination.has_next : currentPage === totalPages}>
                      
                          Next
                        </Button>
                      </div>
                    </div>
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
                  onClick={() => setTabValue("questionPaper")}
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
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Question Paper Format</h3>
                    <Button
                    onClick={downloadQuestionPaperPDF}
                    className="bg-primary text-white hover:bg-primary/90">
                    
                      Download PDF
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

                  <div className="space-y-6">
                    {questions.map((question, index) =>
                  <div key={question.id} className="flex items-start gap-3">
                        <span className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {question.number}.
                        </span>
                        <div className="flex-1">
                          <p className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                            {question.content || "No question content entered"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            ({question.maxMarks} marks)
                          </div>
                          {question.co &&
                      <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              CO: {question.co}
                            </div>
                      }
                          {question.bloomsLevel &&
                      <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              Blooms: {question.bloomsLevel}
                            </div>
                      }
                        </div>
                      </div>
                  )}
                    <div className={`pt-4 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total Marks:</span>
                        <span>{totalMarks}</span>
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
                onClick={() => setTabValue("questionPaper")}
                className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20">
                
                    View Question Paper
                  </Button>
              }
              </div>
            }
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulkUpload">
            <div className={`border rounded-lg p-4 sm:p-6 lg:p-8 w-full space-y-4 sm:space-y-6 ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-white'}`}>
              <div className="space-y-1 sm:space-y-2">
                <h2 className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bulk Upload Marks</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Upload Excel file with student marks
                </p>
              </div>

              {areAllDropdownsSelected() ?
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Main Upload Area - Takes 2/3 on desktop, full width on tablet/mobile */}
                  <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <div
                    onDrop={handleBulkDrop}
                    onDragOver={handleBulkDragOver}
                    onDragLeave={handleBulkDragLeave}
                    className={`border rounded-md p-6 sm:p-8 lg:p-10 text-center space-y-3 sm:space-y-4 transition-all duration-300 min-h-[300px] sm:min-h-[320px] lg:min-h-[360px] flex flex-col items-center justify-center ${bulkDragActive ?
                    theme === 'dark' ? "border-primary bg-primary/10" : "border-blue-400 bg-blue-50" :
                    theme === 'dark' ? "border-dashed border-border bg-muted" : "border-dashed border-gray-300 bg-gray-50"}`
                    }>
                    
                      <UploadCloud
                      className={`mx-auto h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 transition-transform duration-300 ${bulkDragActive ?
                      theme === 'dark' ? "scale-110 text-primary" : "scale-110 text-blue-400" :
                      theme === 'dark' ? "text-muted-foreground" : "text-gray-400"}`
                      } />
                    
                      <div className="space-y-1 sm:space-y-2">
                        <p className={`text-sm sm:text-base lg:text-lg font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                          Drag & drop Excel file here
                        </p>
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Supports .xlsx, .xls (max 5MB)
                        </p>
                      </div>
                      {!bulkUploadFile ?
                    <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 flex-wrap justify-center">
                          <button
                        onClick={() => document.getElementById("bulkFileInput")?.click()}
                        className={`px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base rounded-md font-medium transition-all duration-200 whitespace-nowrap ${theme === 'dark' ? 'border border-border hover:bg-accent text-foreground bg-primary text-white hover:bg-primary/90' : 'border border-gray-300 hover:bg-gray-100 text-gray-700 bg-primary text-white hover:bg-primary/90'}`}>
                        
                            Select File
                          </button>
                          <input
                        id="bulkFileInput"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleBulkFileChange}
                        className="hidden" />
                      
                        </div> :

                    <div className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4 p-3 sm:p-4 rounded-md w-full ${theme === 'dark' ? 'bg-green-400/10 border border-green-400/30' : 'bg-green-50 border border-green-200'}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs sm:text-sm font-medium truncate ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                              ✓ {bulkUploadFile.name}
                            </p>
                          </div>
                          <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearBulkFile}
                        className="flex-shrink-0">
                        
                            <X className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-900'}`} />
                          </Button>
                        </div>
                    }
                    </div>

                    {errorMessage &&
                  <div className={`text-sm font-medium text-center p-3 sm:p-4 rounded-md ${theme === 'dark' ? 'text-destructive border border-destructive/30 bg-destructive/10' : 'text-red-600 border border-red-200 bg-red-50'}`}>
                        {errorMessage}
                      </div>
                  }

                    <div className="flex gap-2 sm:gap-3 flex-col-reverse sm:flex-row justify-end">
                      <Button
                      onClick={handleProcessBulkUpload}
                      disabled={!bulkUploadFile}
                      className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 font-medium py-2 sm:py-2.5 px-4 sm:px-6 transition-all duration-200">
                      
                        Process Upload
                      </Button>
                    </div>
                  </div>

                  {/* Instructions Panel - Right sidebar on desktop */}
                  <div className={`lg:col-span-1 rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4 ${theme === 'dark' ? 'bg-muted border border-border' : 'bg-gray-50 border border-gray-200'}`}>
                    <div>
                      <p className={`font-semibold text-sm sm:text-base mb-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        Upload Instructions
                      </p>
                      <ul className={`space-y-2 text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 mt-0.5">•</span>
                          <span>Use the provided Excel template for proper data formatting</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 mt-0.5">•</span>
                          <span>File must contain all required columns as per the template</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 mt-0.5">•</span>
                          <span>Maximum 500 records per file</span>
                        </li>
                      </ul>
                    </div>

                    <div className={`border-t pt-3 sm:pt-4 ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                      <button
                      onClick={downloadExcelTemplate}
                      className={`w-full text-center py-2 sm:py-2.5 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${theme === 'dark' ? 'bg-primary text-white hover:bg-primary/90' : 'bg-primary text-white hover:bg-primary/90'}`}>
                      
                        Download Template
                      </button>
                    </div>

                    {/* File Info Panel */}
                    {bulkUploadFile &&
                  <div className={`border-t pt-3 sm:pt-4 space-y-2 ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          Selected File
                        </p>
                        <p className={`text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          📄 {bulkUploadFile.name}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Size: {(bulkUploadFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                  }
                  </div>
                </div> :

              <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 w-full ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`
              }>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Layers className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selection Required</h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    Please select all the dropdown options first to enable bulk marks upload.
                  </p>
                </div>
              }
            </div>
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