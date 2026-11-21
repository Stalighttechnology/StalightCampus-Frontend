import React, { useState, useEffect, useRef, Fragment } from "react";
import { Layers, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTheme } from "@/context/ThemeContext";
import { normalizePaginatedResponse } from "../../utils/normalizePagination";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { sanitizeHtml } from "../../utils/sanitize";
import {
  getBatches,
  getQuestionPapers,
  getQuestionPaperDetail,
  getStudentsForMarks,
  getSemesters,
  getSections,
  StudentsForMarksResponse
} from "../../utils/faculty_api";
import { getSemesterBootstrap } from "../../utils/hod_api";
import { manageBranches } from "../../utils/admin_api";

interface Question {
  id: string;
  number: string;
  content: string;
  maxMarks: string;
  co: string;
  bloomsLevel: string;
  partName?: string;
  isOr?: boolean;
}

const formatCO = (co: string | string[] | undefined | null): string => {
  if (!co) return "";
  let items: string[] = [];
  if (Array.isArray(co)) {
    items = co;
  } else if (typeof co === "string") {
    if (/^CO\d+(?:,\d+)*$/i.test(co.trim())) {
      return co.trim().toUpperCase();
    }
    items = co.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (items.length === 0) return "";
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
    numbers.sort((a, b) => a - b);
    return `CO${numbers.join(",")}`;
  }
  return items.join(", ");
};

const formatTestType = (testType: string | undefined): string => {
  if (!testType) return "IA";
  const num = testType.replace(/\D/g, "");
  return num ? `IA Test ${num}` : testType;
};

const getOrgLogoUrl = (orgLogoPath?: string | null): string => {
  if (!orgLogoPath) return "/logo.jpeg";
  if (orgLogoPath.startsWith("http://") || orgLogoPath.startsWith("https://")) {
    return orgLogoPath;
  }
  return `${API_ENDPOINT.replace(/\/api$/, "")}${orgLogoPath.startsWith("/") ? "" : "/"}${orgLogoPath}`;
};

const getOrgName = (rawName?: string | null): string => {
  if (rawName && rawName.trim().length > 0) {
    return rawName.trim();
  }
  const cachedUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (cachedUserStr) {
    try {
      const u = JSON.parse(cachedUserStr);
      if (u.org_name && u.org_name.trim().length > 0) return u.org_name.trim();
      if (u.organization_name && u.organization_name.trim().length > 0) return u.organization_name.trim();
    } catch (_) {}
  }
  return "Stalight";
};

const calculateQPMaxMarks = (qList: Question[]): number => {
  if (!qList || qList.length === 0) return 0;
  const groups: { [key: string]: Question[] } = {};
  qList.forEach((q) => {
    const mainNum = q.number ? q.number.replace(/[a-zA-Z]/g, "") : q.id;
    if (!groups[mainNum]) groups[mainNum] = [];
    groups[mainNum].push(q);
  });
  return Object.values(groups).reduce((sum, qGroup) => {
    const groupMax = qGroup.reduce((subSum, q) => subSum + (parseFloat(q.maxMarks) || 0), 0);
    return sum + groupMax;
  }, 0);
};

const parseQuestionsFromQList = (qList: any[]): Question[] => {
  if (!Array.isArray(qList) || qList.length === 0) return [];
  const parsedQuestions: Question[] = [];
  qList.forEach((q: any) => {
    const subParts = Array.isArray(q.sub_questions) && q.sub_questions.length > 0
      ? q.sub_questions
      : Array.isArray(q.subparts) && q.subparts.length > 0
      ? q.subparts
      : null;

    if (subParts && subParts.length > 0) {
      subParts.forEach((sq: any) => {
        parsedQuestions.push({
          id: String(sq.id || `${q.id}-${sq.sub_label || sq.part}`),
          number: `${q.q_num || q.question_number || q.number || ""}${sq.sub_label || sq.part || ""}`,
          content: sq.text || sq.content || "",
          maxMarks: String(sq.max_marks || sq.marks || "0"),
          co: sq.co ? String(sq.co) : q.co ? String(q.co) : "",
          bloomsLevel: sq.bt ? String(sq.bt) : q.bt ? String(q.bt) : "",
          partName: q.part_name || q.part || "PART-A"
        });
      });
    } else {
      parsedQuestions.push({
        id: String(q.id || Math.random()),
        number: String(q.q_num || q.question_number || q.number || ""),
        content: q.text || q.content || "",
        maxMarks: String(q.max_marks || q.marks || "0"),
        co: q.co ? String(q.co) : "",
        bloomsLevel: q.bt ? String(q.bt) : "",
        partName: q.part_name || q.part || "PART-A"
      });
    }
  });
  return parsedQuestions;
};

const getSafeSheetName = (name: string, existingNames: Set<string>): string => {
  let clean = name.replace(/[\\/?*[\]:]/g, "_").trim().substring(0, 31);
  if (!clean) clean = "Subject";
  let finalName = clean;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    const suffix = `_${counter}`;
    finalName = clean.substring(0, 31 - suffix.length) + suffix;
    counter++;
  }
  existingNames.add(finalName.toLowerCase());
  return finalName;
};

const buildSubjectWorksheet = (params: {
  orgName: string;
  formattedTest: string;
  formattedDate: string;
  subjectName: string;
  subjectCode: string;
  branchName: string;
  semNumber: string | number;
  sectionName: string;
  batchName: string;
  facultyName: string;
  qpMax: number;
  questions: Question[];
  exportRows: Array<{ index: number; usn: string; name: string; marks: Record<string, string>; total: string }>;
}) => {
  const {
    orgName,
    formattedTest,
    formattedDate,
    subjectName,
    subjectCode,
    branchName,
    semNumber,
    sectionName,
    batchName,
    facultyName,
    qpMax,
    questions,
    exportRows
  } = params;

  const totalColumns = questions.length > 0 ? 3 + (questions.length * 3) + 1 : 4;
  const lastColIdx = totalColumns - 1;
  const midColIdx = Math.floor(totalColumns / 2);

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
  row5[midColIdx + 1] = qpMax;
  aoa.push(row5);

  // Row 6: Blank row
  aoa.push(new Array(totalColumns).fill(""));

  if (questions.length > 0) {
    // Row 7 (Tier 1): #, USN, Student Name, Q1a, Q1b..., Total Marks
    const row7 = new Array(totalColumns).fill("");
    row7[0] = "#";
    row7[1] = "USN";
    row7[2] = "Student Name";
    questions.forEach((q, idx) => {
      row7[3 + idx * 3] = `Q${q.number}`;
    });
    row7[lastColIdx] = "Total Marks";
    aoa.push(row7);

    // Row 8 (Tier 2): CO, Max, Marks
    const row8 = new Array(totalColumns).fill("");
    questions.forEach((q, idx) => {
      row8[3 + idx * 3] = "CO";
      row8[3 + idx * 3 + 1] = "Max";
      row8[3 + idx * 3 + 2] = "Marks";
    });
    aoa.push(row8);

    // Row 9 (Tier 3): CO number, Max marks number, Test name
    const row9 = new Array(totalColumns).fill("");
    questions.forEach((q, idx) => {
      row9[3 + idx * 3] = formatCO(q.co) || "CO";
      row9[3 + idx * 3 + 1] = Number(q.maxMarks) || q.maxMarks;
      row9[3 + idx * 3 + 2] = formattedTest;
    });
    aoa.push(row9);
  } else {
    aoa.push(["#", "USN", "Student Name", "Total Marks"]);
  }

  // Student Rows
  exportRows.forEach((student) => {
    const row = new Array(totalColumns).fill("");
    row[0] = student.index;
    row[1] = student.usn;
    row[2] = student.name;
    questions.forEach((q, idx) => {
      const marksVal = student.marks[q.number];
      row[3 + idx * 3] = formatCO(q.co) || "";
      row[3 + idx * 3 + 1] = Number(q.maxMarks) || q.maxMarks;
      row[3 + idx * 3 + 2] = marksVal !== undefined && marksVal !== "" ? Number(marksVal) || marksVal : "-";
    });
    row[lastColIdx] = student.total !== "-" && student.total !== "" ? Number(student.total) || student.total : "-";
    aoa.push(row);
  });

  // Footer Signatures
  aoa.push(new Array(totalColumns).fill(""));
  aoa.push(new Array(totalColumns).fill(""));

  const sigRow1 = new Array(totalColumns).fill("");
  sigRow1[1] = "Course Faculty";
  sigRow1[midColIdx] = "Head of Department";
  sigRow1[lastColIdx - 1] = "Principal";
  aoa.push(sigRow1);

  const sigRow2 = new Array(totalColumns).fill("");
  sigRow2[1] = `(${facultyName})`;
  sigRow2[midColIdx] = `Department of ${branchName}`;
  sigRow2[lastColIdx - 1] = orgName;
  aoa.push(sigRow2);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: midColIdx - 1 } },
    { s: { r: 3, c: midColIdx + 1 }, e: { r: 3, c: lastColIdx } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: midColIdx - 1 } },
    { s: { r: 4, c: midColIdx + 1 }, e: { r: 4, c: lastColIdx } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: midColIdx - 1 } },
    { s: { r: 5, c: midColIdx + 1 }, e: { r: 5, c: lastColIdx } }
  ];

  if (questions.length > 0) {
    merges.push(
      { s: { r: 7, c: 0 }, e: { r: 9, c: 0 } },
      { s: { r: 7, c: 1 }, e: { r: 9, c: 1 } },
      { s: { r: 7, c: 2 }, e: { r: 9, c: 2 } },
      { s: { r: 7, c: lastColIdx }, e: { r: 9, c: lastColIdx } }
    );
    questions.forEach((_, idx) => {
      const colStart = 3 + idx * 3;
      merges.push({ s: { r: 7, c: colStart }, e: { r: 7, c: colStart + 2 } });
    });
  }

  ws["!merges"] = merges;

  const colWidths = [{ wch: 6 }, { wch: 16 }, { wch: 28 }];
  questions.forEach(() => {
    colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 10 });
  });
  colWidths.push({ wch: 14 });
  ws["!cols"] = colWidths;

  return ws;
};

const buildOverviewWorksheet = (params: {
  orgName: string;
  formattedTest: string;
  formattedDate: string;
  branchName: string;
  semNumber: string | number;
  sectionName: string;
  batchName: string;
  subjects: Array<{ id: number; name: string; subject_code?: string }>;
  studentsList: Array<{ usn: string; name: string }>;
  studentSubjectMarks: Record<string, Record<number, number | string>>;
}) => {
  const {
    orgName,
    formattedTest,
    formattedDate,
    branchName,
    semNumber,
    sectionName,
    batchName,
    subjects,
    studentsList,
    studentSubjectMarks
  } = params;

  const totalCols = 3 + subjects.length + 3;
  const lastColIdx = totalCols - 1;
  const midColIdx = Math.floor(totalCols / 2);

  const aoa: any[][] = [];

  // Row 0: Org Header
  const row0 = new Array(totalCols).fill("");
  row0[0] = orgName.toUpperCase();
  aoa.push(row0);

  // Row 1: Title
  const row1 = new Array(totalCols).fill("");
  row1[0] = `${formattedTest.toUpperCase()} CONSOLIDATED MARKS STATEMENT (ALL SUBJECTS)`;
  aoa.push(row1);

  // Row 2: Date
  const row2 = new Array(totalCols).fill("");
  row2[lastColIdx - 1] = `Date: ${formattedDate}`;
  aoa.push(row2);

  // Row 3: Branch / Sem / Sec
  const row3 = new Array(totalCols).fill("");
  row3[0] = "Branch / Sem / Sec:";
  row3[1] = `${branchName} / Sem ${semNumber} / Sec ${sectionName}`;
  row3[midColIdx] = "Academic Batch:";
  row3[midColIdx + 1] = batchName || "--";
  aoa.push(row3);

  // Row 4: Blank
  aoa.push(new Array(totalCols).fill(""));

  // Row 5: Table Headers
  const headerRow = ["#", "USN", "Student Name"];
  subjects.forEach((sub) => {
    headerRow.push(sub.subject_code ? `${sub.name} (${sub.subject_code})` : sub.name);
  });
  headerRow.push("Grand Total", "Subjects Count", "Percentage (%)");
  aoa.push(headerRow);

  // Student rows
  studentsList.forEach((st, idx) => {
    const row: any[] = [idx + 1, st.usn || "--", st.name || "--"];
    let grandTotal = 0;
    let scoredCount = 0;
    subjects.forEach((sub) => {
      const mark = studentSubjectMarks[st.usn]?.[sub.id];
      if (mark !== undefined && mark !== null && mark !== "" && mark !== "-") {
        const num = Number(mark);
        if (!isNaN(num)) {
          grandTotal += num;
          scoredCount++;
          row.push(num);
        } else {
          row.push(mark);
        }
      } else {
        row.push("-");
      }
    });

    row.push(scoredCount > 0 ? grandTotal : "-");
    row.push(scoredCount);
    row.push(scoredCount > 0 && subjects.length > 0 ? (grandTotal / (scoredCount * 20) * 100).toFixed(1) + "%" : "-");
    aoa.push(row);
  });

  // Signatures
  aoa.push(new Array(totalCols).fill(""));
  aoa.push(new Array(totalCols).fill(""));

  const sigRow1 = new Array(totalCols).fill("");
  sigRow1[1] = "Class Coordinator";
  sigRow1[midColIdx] = "Head of Department";
  sigRow1[lastColIdx - 1] = "Principal";
  aoa.push(sigRow1);

  const sigRow2 = new Array(totalCols).fill("");
  sigRow2[1] = "(Department Faculty)";
  sigRow2[midColIdx] = `Department of ${branchName}`;
  sigRow2[lastColIdx - 1] = orgName;
  aoa.push(sigRow2);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: midColIdx - 1 } },
    { s: { r: 3, c: midColIdx + 1 }, e: { r: 3, c: lastColIdx } }
  ];
  ws["!merges"] = merges;

  const colWidths = [{ wch: 6 }, { wch: 16 }, { wch: 28 }];
  subjects.forEach(() => colWidths.push({ wch: 22 }));
  colWidths.push({ wch: 14 }, { wch: 12 }, { wch: 14 });
  ws["!cols"] = colWidths;

  return ws;
};

export default function AdminIAMarksView() {
  const { theme } = useTheme();
  const [tabValue, setTabValue] = useState<string>("manual");
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);
  const [loadingBootstrap, setLoadingBootstrap] = useState<boolean>(true);
  const [loadingBranchMeta, setLoadingBranchMeta] = useState<boolean>(false);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [loadingQP, setLoadingQP] = useState<boolean>(false);

  // Dropdown states
  const [dropdownData, setDropdownData] = useState({
    batch: [] as { id: number; name: string }[],
    branch: [] as { id: number; name: string }[],
    allSemesters: [] as { id: number; number: number }[],
    allSections: [] as { id: number; name: string; semester_id: string }[],
    allSubjects: [] as { id: number; name: string; subject_code?: string; semester_id: string }[],
    testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"],
    setNumber: [] as string[]
  });

  // Selected filters
  const [selected, setSelected] = useState({
    batch_id: undefined as number | undefined,
    branch: "",
    branch_id: undefined as number | undefined,
    semester: "",
    semester_id: undefined as number | undefined,
    section: "",
    section_id: undefined as number | undefined,
    subject: "",
    subject_id: undefined as number | string | undefined,
    subject_code: "",
    testType: "",
    setNumber: ""
  });

  const isAllSubjects = String(selected.subject_id) === "all";

  // Dropdown open states for automatic cascading trigger
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isTestTypeOpen, setIsTestTypeOpen] = useState(false);
  const [isSetNumberOpen, setIsSetNumberOpen] = useState(false);

  // Questions from approved QP
  const [questions, setQuestions] = useState<Question[]>([]);
  const [existingQpSummary, setExistingQpSummary] = useState<any>(null);
  const [qpReady, setQpReady] = useState<boolean>(false);

  // Request counter refs
  const qpFetchReqCounter = useRef<number>(0);
  const studentFetchReqCounter = useRef<number>(0);
  const approvedQPsCache = useRef<any[]>([]);
  const questionsRef = useRef<Question[]>([]);

  // Students and Marks
  const [students, setStudents] = useState<any[]>([]);
  const [studentMarks, setStudentMarks] = useState<Record<string, Record<string, string>>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [studentsPerPage, setStudentsPerPage] = useState<number>(10);
  const [pagination, setPagination] = useState<any>(null);

  // Filtered lists based on semester selection
  const availableSections = selected.semester_id
    ? dropdownData.allSections.filter((s) => String(s.semester_id) === String(selected.semester_id))
    : dropdownData.allSections;

  const availableSubjects = selected.semester_id
    ? dropdownData.allSubjects.filter((sub) => String(sub.semester_id) === String(selected.semester_id))
    : dropdownData.allSubjects;

  // Fetch branch-specific metadata (semesters, sections, subjects) when branch changes
  const fetchBranchMetadata = async (branchId: string) => {
    setLoadingBranchMeta(true);
    try {
      const res = await getSemesterBootstrap(["semesters", "sections", "subjects"], branchId);
      let semestersList: { id: number; number: number }[] = [];
      let sectionsList: { id: number; name: string; semester_id: string }[] = [];
      let subjectsList: { id: number; name: string; subject_code?: string; semester_id: string }[] = [];

      if (res?.success && res.data) {
        const d = res.data;
        if (Array.isArray(d.semesters)) {
          semestersList = d.semesters.map((s) => ({ id: Number(s.id), number: s.number }));
        }
        if (Array.isArray(d.sections)) {
          sectionsList = d.sections.map((sec) => ({
            id: Number(sec.id),
            name: sec.name,
            semester_id: String(sec.semester_id)
          }));
        }
        if (Array.isArray(d.subjects)) {
          subjectsList = d.subjects.map((sub) => ({
            id: Number(sub.id),
            name: sub.name,
            subject_code: sub.subject_code,
            semester_id: String(sub.semester_id)
          }));
        }
      }

      // Robust fallback: if semestersList is empty, fetch via faculty getSemesters
      if (semestersList.length === 0) {
        try {
          const semRes = await getSemesters(branchId);
          if (semRes?.success && Array.isArray(semRes.data) && semRes.data.length > 0) {
            semestersList = semRes.data.map((s) => ({ id: Number(s.id), number: s.number }));
          }
        } catch (_) {}
      }

      setDropdownData((prev) => ({
        ...prev,
        allSemesters: semestersList,
        allSections: sectionsList,
        allSubjects: subjectsList,
        setNumber: []
      }));
    } catch (err) {
      console.error("Failed to load branch metadata", err);
      try {
        const semRes = await getSemesters(branchId);
        if (semRes?.success && Array.isArray(semRes.data) && semRes.data.length > 0) {
          setDropdownData((prev) => ({
            ...prev,
            allSemesters: semRes.data!.map((s) => ({ id: Number(s.id), number: s.number })),
            setNumber: []
          }));
        }
      } catch (_) {}
    } finally {
      setLoadingBranchMeta(false);
    }
  };

  // Handle dropdown selection and auto-trigger next dropdown
  const handleFilterChange = (field: string, value: string | number) => {
    if (field === "branch_id") {
      const branchObj = dropdownData.branch.find((b) => String(b.id) === String(value));
      setSelected((prev) => ({
        ...prev,
        branch_id: Number(value),
        branch: branchObj?.name || "",
        semester_id: undefined,
        semester: "",
        section_id: undefined,
        section: "",
        subject_id: undefined,
        subject: "",
        subject_code: "",
        testType: "",
        setNumber: ""
      }));
      setQuestions([]);
      setExistingQpSummary(null);
      setStudents([]);
      setStudentMarks({});
      fetchBranchMetadata(String(value));
      setTimeout(() => setIsBatchOpen(true), 150);
    } else if (field === "batch_id") {
      setSelected((prev) => ({
        ...prev,
        batch_id: Number(value)
      }));
      setTimeout(() => setIsSemesterOpen(true), 150);
    } else if (field === "semester_id") {
      const semObj = dropdownData.allSemesters.find((s) => String(s.id) === String(value));
      setSelected((prev) => ({
        ...prev,
        semester_id: Number(value),
        semester: String(semObj?.number || value),
        section_id: undefined,
        section: "",
        subject_id: undefined,
        subject: "",
        subject_code: "",
        testType: "",
        setNumber: ""
      }));
      setQuestions([]);
      setExistingQpSummary(null);
      setStudents([]);
      setStudentMarks({});

      // Proactively fetch sections if matching section list is empty
      if (selected.branch_id) {
        const currentSecs = dropdownData.allSections.filter((s) => String(s.semester_id) === String(value));
        if (currentSecs.length === 0) {
          getSections(String(selected.branch_id), String(value)).then((secRes) => {
            if (secRes?.success && Array.isArray(secRes.data) && secRes.data.length > 0) {
              const newSecs = secRes.data.map((sec) => ({
                id: Number(sec.id),
                name: sec.name,
                semester_id: String(value)
              }));
              setDropdownData((prev) => {
                const existing = new Set(prev.allSections.map((x) => String(x.id)));
                const toAdd = newSecs.filter((x) => !existing.has(String(x.id)));
                return { ...prev, allSections: [...prev.allSections, ...toAdd] };
              });
            }
          }).catch(() => {});
        }
      }

      setTimeout(() => setIsSectionOpen(true), 150);
    } else if (field === "section_id") {
      const secObj = dropdownData.allSections.find((s) => String(s.id) === String(value));
      setSelected((prev) => ({
        ...prev,
        section_id: Number(value),
        section: secObj?.name || "",
        subject_id: undefined,
        subject: "",
        subject_code: "",
        testType: "",
        setNumber: ""
      }));
      setQuestions([]);
      setExistingQpSummary(null);
      setStudents([]);
      setStudentMarks({});
      setTimeout(() => setIsSubjectOpen(true), 150);
    } else if (field === "subject_id") {
      if (String(value) === "all") {
        setSelected((prev) => ({
          ...prev,
          subject_id: "all",
          subject: "All Subjects",
          subject_code: "ALL",
          testType: prev.testType || "IA1",
          setNumber: "All Sets"
        }));
        setQuestions([]);
        setExistingQpSummary(null);
        setStudents([]);
        setStudentMarks({});
        setTimeout(() => setIsTestTypeOpen(true), 150);
      } else {
        const subObj = dropdownData.allSubjects.find((s) => String(s.id) === String(value));
        setSelected((prev) => ({
          ...prev,
          subject_id: Number(value),
          subject: subObj?.name || "",
          subject_code: subObj?.subject_code || "",
          testType: "",
          setNumber: ""
        }));
        setQuestions([]);
        setExistingQpSummary(null);
        setStudents([]);
        setStudentMarks({});
        setTimeout(() => setIsTestTypeOpen(true), 150);
      }
    } else if (field === "testType") {
      setSelected((prev) => ({
        ...prev,
        testType: String(value),
        setNumber: String(prev.subject_id) === "all" ? "All Sets" : ""
      }));
      setQuestions([]);
      setExistingQpSummary(null);
      setStudents([]);
      setStudentMarks({});
    } else if (field === "setNumber") {
      setSelected((prev) => ({
        ...prev,
        setNumber: String(value)
      }));
    }
  };

  // 1. Initial Load: Batches and all active branches in the organization
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      setLoadingBootstrap(true);
      try {
        const [batchesRes, bootstrapRes] = await Promise.all([
          getBatches(),
          getSemesterBootstrap(["profile", "semesters", "sections", "subjects", "branches"])
        ]);

        if (!isMounted) return;

        let batchList: { id: number; name: string }[] = [];
        if (batchesRes?.success && Array.isArray(batchesRes.data)) {
          batchList = batchesRes.data.map((b: any) => ({
            id: Number(b.id),
            name: b.name
          }));
        }

        let branchList: { id: number; name: string }[] = [];
        let semestersList: { id: number; number: number }[] = [];
        let sectionsList: { id: number; name: string; semester_id: string }[] = [];
        let subjectsList: { id: number; name: string; subject_code?: string; semester_id: string }[] = [];

        if (bootstrapRes?.success && bootstrapRes.data) {
          const d = bootstrapRes.data;
          if (Array.isArray(d.branches) && d.branches.length > 0) {
            branchList = d.branches.map((b: any) => ({
              id: Number(b.id),
              name: b.name
            }));
          } else if (d.profile?.branch_id) {
            branchList = [{ id: Number(d.profile.branch_id), name: d.profile.branch || "Branch" }];
          }

          if (Array.isArray(d.semesters)) {
            semestersList = d.semesters.map((s) => ({ id: Number(s.id), number: s.number }));
          }
          if (Array.isArray(d.sections)) {
            sectionsList = d.sections.map((sec) => ({
              id: Number(sec.id),
              name: sec.name,
              semester_id: String(sec.semester_id)
            }));
          }
          if (Array.isArray(d.subjects)) {
            subjectsList = d.subjects.map((sub) => ({
              id: Number(sub.id),
              name: sub.name,
              subject_code: sub.subject_code,
              semester_id: String(sub.semester_id)
            }));
          }
        }

        // If branches wasn't populated from bootstrap, fall back to manageBranches
        if (branchList.length === 0) {
          try {
            const bRes = await manageBranches();
            if (bRes?.branches && Array.isArray(bRes.branches)) {
              branchList = bRes.branches.map((b: any) => ({ id: Number(b.id), name: b.name }));
            }
          } catch (_) {}
        }

        setDropdownData({
          batch: batchList,
          branch: branchList,
          allSemesters: semestersList,
          allSections: sectionsList,
          allSubjects: subjectsList,
          testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"],
          setNumber: []
        });
      } catch (err) {
        console.error("Failed to load initial Principal Marks metadata", err);
      } finally {
        if (isMounted) setLoadingBootstrap(false);
      }
    };

    initData();
    return () => {
      isMounted = false;
    };
  }, []);

  const applyQuestionPaper = (qp: any) => {
    setExistingQpSummary(qp);
    const qList = qp.questions || qp.questions_list;
    if (qList && qList.length > 0) {
      const loadedQuestions = parseQuestionsFromQList(qList);
      setQuestions(loadedQuestions);
      questionsRef.current = loadedQuestions;
      setQpReady(true);
    } else {
      setQuestions([]);
      questionsRef.current = [];
      setQpReady(false);
    }
  };

  // 2. Load Question Papers ONLY AFTER single subject and exam type are selected
  useEffect(() => {
    if (
      isAllSubjects ||
      !selected.batch_id ||
      !selected.branch_id ||
      !selected.semester_id ||
      !selected.section_id ||
      !selected.subject_id ||
      !selected.testType
    ) {
      setDropdownData((prev) => ({ ...prev, setNumber: isAllSubjects ? ["All Sets"] : [] }));
      setExistingQpSummary(null);
      setQuestions([]);
      questionsRef.current = [];
      setQpReady(false);
      approvedQPsCache.current = [];
      return;
    }

    let isMounted = true;
    const currentReq = ++qpFetchReqCounter.current;
    setLoadingQP(true);

    const fetchQPs = async () => {
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

        if (!isMounted || currentReq !== qpFetchReqCounter.current) return;

        if (qpResponse?.success && Array.isArray(qpResponse.data)) {
          const matchingQPs = qpResponse.data.filter((q: any) => {
            const bId = typeof q.branch === "object" ? q.branch?.id : q.branch;
            return (
              String(bId) === String(selected.branch_id) &&
              String(q.subject) === String(selected.subject_id) &&
              String(q.test_type).toLowerCase() === String(selected.testType).toLowerCase()
            );
          });

          const approvedQPs = matchingQPs.filter((q: any) => (q.status || q.approval_status || q.approval?.status) === "approved");
          approvedQPsCache.current = approvedQPs;

          const approvedSets = Array.from(
            new Set(approvedQPs.map((q: any) => q.set_number || "Set 1").filter(Boolean))
          ).sort() as string[];

          setDropdownData((prev) => ({ ...prev, setNumber: approvedSets }));

          let targetSet = selected.setNumber;
          if (!targetSet || !approvedSets.includes(targetSet)) {
            targetSet = approvedSets.length > 0 ? approvedSets[0] : (matchingQPs[0]?.set_number || "Set 1");
            setSelected((prev) => (prev.setNumber === targetSet ? prev : { ...prev, setNumber: targetSet }));
          }

          if (approvedSets.length > 0) {
            setTimeout(() => setIsSetNumberOpen(true), 150);
          }

          let existingQp =
            approvedQPs.find((q: any) => (q.set_number || "Set 1") === targetSet) ||
            approvedQPs[0] ||
            matchingQPs[0];

          if (existingQp) {
            if (!existingQp.questions || existingQp.questions.length === 0) {
              const dRes = await getQuestionPaperDetail(existingQp.id);
              const raw = dRes?.success && dRes.data ? dRes.data : null;
              const dObj = Array.isArray(raw) ? raw[0] : raw;
              if (dObj) {
                existingQp = { ...existingQp, ...dObj };
              }
            }

            if (!isMounted || currentReq !== qpFetchReqCounter.current) return;
            applyQuestionPaper(existingQp);
          } else {
            setExistingQpSummary(null);
            setQuestions([]);
            questionsRef.current = [];
            setQpReady(false);
          }
        }
      } catch (err) {
        console.error("Error fetching QPs for Principal", err);
      } finally {
        if (isMounted && currentReq === qpFetchReqCounter.current) setLoadingQP(false);
      }
    };

    fetchQPs();
    return () => {
      isMounted = false;
    };
  }, [
    isAllSubjects,
    selected.batch_id,
    selected.branch_id,
    selected.semester_id,
    selected.section_id,
    selected.subject_id,
    selected.testType
  ]);

  // Handle set number switch from memory cache without duplicate network roundtrips
  useEffect(() => {
    if (!selected.setNumber || approvedQPsCache.current.length === 0) return;
    const targetSet = selected.setNumber;
    let existingQp = approvedQPsCache.current.find((q: any) => (q.set_number || "Set 1") === targetSet);
    if (existingQp && existingQp.id !== existingQpSummary?.id) {
      let isMounted = true;
      (async () => {
        if (!existingQp.questions || existingQp.questions.length === 0) {
          const dRes = await getQuestionPaperDetail(existingQp.id);
          const raw = dRes?.success && dRes.data ? dRes.data : null;
          const dObj = Array.isArray(raw) ? raw[0] : raw;
          if (dObj) {
            existingQp = { ...existingQp, ...dObj };
          }
        }
        if (!isMounted) return;
        applyQuestionPaper(existingQp);
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [selected.setNumber]);

  // Keep questionsRef updated and calculate student totals in memory without triggering duplicate network calls
  useEffect(() => {
    questionsRef.current = questions;
    if (questions.length > 0 && students.length > 0) {
      const qpMax = calculateQPMaxMarks(questions);
      setStudents((prev) =>
        prev.map((s) => {
          const sMarks = studentMarks[s.id.toString()] || {};
          const calcTotal = calculateStudentTotalFromMarks(sMarks, questions, qpMax);
          return {
            ...s,
            total: s.total && s.total !== "-" ? s.total : calcTotal || "-"
          };
        })
      );
    }
  }, [questions]);

  // 3. Fetch Students and Entered Marks with pagination
  const fetchStudents = async (page: number = 1, pageSizeOverride?: number) => {
    if (isAllSubjects || !areAllDropdownsSelected()) {
      setStudents([]);
      setStudentMarks({});
      return;
    }

    const currentReq = ++studentFetchReqCounter.current;
    const size = pageSizeOverride || studentsPerPage;
    setLoadingStudents(true);
    try {
      const params: any = {
        branch_id: selected.branch_id?.toString(),
        subject_id: selected.subject_id?.toString(),
        semester_id: selected.semester_id?.toString(),
        section_id: selected.section_id?.toString(),
        test_type: selected.testType,
        batch_id: selected.batch_id?.toString(),
        set_number: selected.setNumber,
        page,
        page_size: size
      };

      const response: StudentsForMarksResponse = await getStudentsForMarks(params);

      if (currentReq !== studentFetchReqCounter.current) {
        return;
      }

      if (response?.success && Array.isArray(response.data)) {
        const initialMarks: Record<string, Record<string, string>> = {};
        const qpMax = calculateQPMaxMarks(questionsRef.current);

        const mappedStudents = response.data.map((s: any) => {
          const studentIdStr = s.id.toString();
          initialMarks[studentIdStr] = {};

          let totalVal = "";
          if (s.existing_mark) {
            if (s.existing_mark.marks_detail) {
              Object.keys(s.existing_mark.marks_detail).forEach((k) => {
                initialMarks[studentIdStr][k] = String(s.existing_mark.marks_detail[k]);
              });
            }
            if (s.existing_mark.total_obtained !== undefined && s.existing_mark.total_obtained !== null) {
              totalVal = String(s.existing_mark.total_obtained);
            }
          }

          if (!totalVal) {
            totalVal = calculateStudentTotalFromMarks(initialMarks[studentIdStr], questionsRef.current, qpMax);
          }

          return {
            id: s.id,
            name: s.name,
            usn: s.usn,
            total: totalVal || "-"
          };
        });

        setStudents(mappedStudents);
        setStudentMarks(initialMarks);

        const normalized = normalizePaginatedResponse(response, "students");
        if (normalized.meta && Object.keys(normalized.meta).length > 0) {
          setPagination({
            page: normalized.meta.currentPage || page,
            page_size: size,
            total: normalized.meta.totalItems || mappedStudents.length,
            total_pages: normalized.meta.totalPages || Math.ceil((normalized.meta.totalItems || mappedStudents.length) / size),
            has_next: Boolean(normalized.meta.next),
            has_previous: Boolean(normalized.meta.previous)
          });
          setCurrentPage(normalized.meta.currentPage || page);
        } else if (response.pagination) {
          setPagination({
            page: response.pagination.page || page,
            page_size: size,
            total: response.pagination.total || mappedStudents.length,
            total_pages: response.pagination.total_pages || Math.ceil((response.pagination.total || mappedStudents.length) / size),
            has_next: Boolean(response.pagination.has_next),
            has_previous: Boolean(response.pagination.has_previous)
          });
          setCurrentPage(response.pagination.page || page);
        } else {
          setPagination({
            page,
            page_size: size,
            total: mappedStudents.length,
            total_pages: Math.ceil(mappedStudents.length / size) || 1,
            has_next: false,
            has_previous: false
          });
          setCurrentPage(page);
        }
      } else {
        setStudents([]);
        setStudentMarks({});
      }
    } catch (err) {
      console.error("Failed to fetch students for Principal view", err);
      if (currentReq === studentFetchReqCounter.current) {
        setStudents([]);
      }
    } finally {
      if (currentReq === studentFetchReqCounter.current) {
        setLoadingStudents(false);
      }
    }
  };

  useEffect(() => {
    if (areAllDropdownsSelected()) {
      fetchStudents(1, studentsPerPage);
    }
  }, [
    selected.branch_id,
    selected.batch_id,
    selected.semester_id,
    selected.section_id,
    selected.subject_id,
    selected.testType,
    selected.setNumber,
    isAllSubjects
  ]);

  // Are all filters selected?
  const areAllDropdownsSelected = () => {
    if (isAllSubjects) {
      return (
        selected.branch_id !== undefined &&
        selected.batch_id !== undefined &&
        selected.semester_id !== undefined &&
        selected.section_id !== undefined &&
        Boolean(selected.testType)
      );
    }
    return (
      selected.branch_id !== undefined &&
      selected.batch_id !== undefined &&
      selected.semester_id !== undefined &&
      selected.section_id !== undefined &&
      selected.subject_id !== undefined &&
      Boolean(selected.testType) &&
      Boolean(selected.setNumber)
    );
  };

  // Group questions by part for preview
  const groupQuestionsByPart = () => {
    const parts: { [key: string]: Question[] } = {};
    questions.forEach((q) => {
      const part = q.partName || "PART-A";
      if (!parts[part]) parts[part] = [];
      parts[part].push(q);
    });
    return Object.entries(parts).map(([name, qList]) => ({ name, questions: qList }));
  };

  // Download Question Paper PDF
  const downloadQuestionPaperPDF = async () => {
    if (!existingQpSummary?.id) return;
    setDownloadingPDF(true);
    try {
      const url = `${API_ENDPOINT}/admin/qps/${existingQpSummary.id}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `QP_${selected.subject_code || selected.subject}_${selected.testType}_${existingQpSummary.set_number || "Set1"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error("Failed to download QP PDF", err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!areAllDropdownsSelected()) return;

    setIsExportingExcel(true);
    try {
      const orgName = getOrgName(existingQpSummary?.org_name);
      const formattedTest = formatTestType(selected.testType);
      const formattedDate = format(new Date(), "dd-MMM-yyyy");
      const batchObj = dropdownData.batch.find((b) => b.id === selected.batch_id);
      const batchName = batchObj?.name || "";

      // CASE 1: ALL SUBJECTS EXPORT
      if (isAllSubjects) {
        const wb = XLSX.utils.book_new();
        const existingSheetNames = new Set<string>();

        const subjectsToExport = availableSubjects.length > 0 ? availableSubjects : dropdownData.allSubjects;
        if (subjectsToExport.length === 0) {
          alert("No subjects available for export in the selected branch, semester and section.");
          setIsExportingExcel(false);
          return;
        }

        const studentSubjectMarks: Record<string, Record<number, number | string>> = {};
        const studentsDirectory: Record<string, { usn: string; name: string }> = {};

        for (const sub of subjectsToExport) {
          try {
            let subQPs: any[] = [];
            try {
              const qpRes = await getQuestionPapers({
                branch_id: selected.branch_id,
                subject_id: sub.id,
                test_type: selected.testType,
                approved_only: true,
                batch_id: selected.batch_id
              });
              if (qpRes?.success && Array.isArray(qpRes.data)) {
                subQPs = qpRes.data.filter((q: any) => (q.status || q.approval?.status) === "approved");
              }
            } catch (_) {}

            const activeQP = subQPs.length > 0 ? subQPs[0] : null;
            let subQuestions: Question[] = [];
            let subFaculty = "Course Faculty";
            let subMax = 20;

            if (activeQP && activeQP.id) {
              try {
                const qpDet = await getQuestionPaperDetail(activeQP.id);
                const qpData = qpDet?.success && qpDet.data ? qpDet.data : activeQP;
                subQuestions = parseQuestionsFromQList(qpData.questions_list || qpData.questions || []);
                subFaculty = qpData.faculty_name || qpData.faculty?.name || subFaculty;
                subMax = calculateQPMaxMarks(subQuestions) || qpData.total_marks || qpData.max_marks || subMax;
              } catch (_) {}
            }

            let subStudents: any[] = [];
            try {
              const stRes = await getStudentsForMarks({
                branch_id: selected.branch_id,
                semester_id: selected.semester_id,
                section_id: selected.section_id,
                subject_id: sub.id,
                test_type: selected.testType,
                set_number: activeQP?.set_number || "Set 1",
                batch_id: selected.batch_id,
                page: 1,
                page_size: 500
              });
              if (stRes?.success && stRes.data) {
                const norm = normalizePaginatedResponse(stRes.data);
                subStudents = norm.results || [];
              }
            } catch (_) {}

            const subExportRows = subStudents.map((st: any, idx: number) => {
              const usnKey = st.usn || `ID-${st.id}`;
              if (!studentsDirectory[usnKey]) {
                studentsDirectory[usnKey] = { usn: st.usn || "--", name: st.name || "--" };
              }
              if (!studentSubjectMarks[usnKey]) {
                studentSubjectMarks[usnKey] = {};
              }
              studentSubjectMarks[usnKey][sub.id] = st.total !== undefined && st.total !== null ? st.total : "-";

              const marksRec: Record<string, string> = {};
              if (st.marks && typeof st.marks === "object") {
                Object.entries(st.marks).forEach(([k, v]) => {
                  marksRec[k] = v !== null && v !== undefined ? String(v) : "";
                });
              }

              return {
                index: idx + 1,
                usn: st.usn || "--",
                name: st.name || "--",
                marks: marksRec,
                total: st.total !== undefined && st.total !== null ? String(st.total) : "-"
              };
            });

            const subWs = buildSubjectWorksheet({
              orgName,
              formattedTest,
              formattedDate,
              subjectName: sub.name,
              subjectCode: sub.subject_code || "--",
              branchName: selected.branch,
              semNumber: selected.semester,
              sectionName: selected.section,
              batchName,
              facultyName: subFaculty,
              qpMax: subMax,
              questions: subQuestions,
              exportRows: subExportRows
            });

            const sheetTitle = sub.subject_code ? `${sub.subject_code}` : sub.name;
            const safeTitle = getSafeSheetName(sheetTitle, existingSheetNames);
            XLSX.utils.book_append_sheet(wb, subWs, safeTitle);
          } catch (subjectExportErr) {
            console.error(`Failed to export subject ${sub.name}`, subjectExportErr);
          }
        }

        const consolidatedList = Object.values(studentsDirectory).sort((a, b) => a.usn.localeCompare(b.usn));

        const overviewWs = buildOverviewWorksheet({
          orgName,
          formattedTest,
          formattedDate,
          branchName: selected.branch,
          semNumber: selected.semester,
          sectionName: selected.section,
          batchName,
          subjects: subjectsToExport,
          studentsList: consolidatedList,
          studentSubjectMarks
        });

        if (wb.SheetNames.length > 0) {
          const overviewSafeName = getSafeSheetName("Consolidated Overview", new Set());
          XLSX.utils.book_append_sheet(wb, overviewWs, overviewSafeName);
          const lastIdx = wb.SheetNames.length - 1;
          const reorderedNames = [wb.SheetNames[lastIdx], ...wb.SheetNames.slice(0, lastIdx)];
          wb.SheetNames = reorderedNames;
        } else {
          XLSX.utils.book_append_sheet(wb, overviewWs, "Overview");
        }

        const fileName = `${selected.branch}_Sem${selected.semester}_Sec${selected.section}_${selected.testType}_All_Subjects_Marks.xlsx`.replace(
          /\s+/g,
          "_"
        );
        XLSX.writeFile(wb, fileName);
        return;
      }

      // CASE 2: SINGLE SUBJECT EXPORT
      let allStudentsForExport: any[] = [];
      const exportPageSize = 250;
      let p = 1;
      let totalPages = 1;

      while (p <= totalPages) {
        const resp = await getStudentsForMarks({
          branch_id: selected.branch_id,
          semester_id: selected.semester_id,
          section_id: selected.section_id,
          subject_id: Number(selected.subject_id),
          test_type: selected.testType,
          set_number: selected.setNumber,
          batch_id: selected.batch_id,
          page: p,
          page_size: exportPageSize
        });

        if (resp && resp.success) {
          const norm = normalizePaginatedResponse(resp.data);
          allStudentsForExport = allStudentsForExport.concat(norm.results || []);
          totalPages = norm.total_pages || 1;
          p++;
        } else {
          break;
        }
      }

      if (allStudentsForExport.length === 0) {
        allStudentsForExport = students;
      }

      const qpMax = calculateQPMaxMarks(questions) || existingQpSummary?.max_marks || 20;
      const facultyName = existingQpSummary?.faculty_name || "Course Faculty";

      const exportRows = allStudentsForExport.map((s, idx) => ({
        index: idx + 1,
        usn: s.usn || "--",
        name: s.name || "--",
        marks: (s.marks as Record<string, string>) || {},
        total: s.total !== undefined && s.total !== null ? String(s.total) : "-"
      }));

      const ws = buildSubjectWorksheet({
        orgName,
        formattedTest,
        formattedDate,
        subjectName: selected.subject,
        subjectCode: selected.subject_code,
        branchName: selected.branch,
        semNumber: selected.semester,
        sectionName: selected.section,
        batchName,
        facultyName,
        qpMax,
        questions,
        exportRows
      });

      const wb = XLSX.utils.book_new();
      const sheetName = getSafeSheetName(selected.subject_code || selected.subject || "Marks", new Set());
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const fileName = `${selected.branch}_${selected.subject_code || selected.subject}_Sem${selected.semester}_Sec${selected.section}_${selected.testType}_Marks.xlsx`.replace(
        /\s+/g,
        "_"
      );
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Failed to export Excel", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const calculatedTotalMaxMarks = calculateQPMaxMarks(questions);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">View Marks</h1>
          <p className="text-sm text-muted-foreground">
            View and export exam marks and internal assessment scores across all branches.
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border shadow-sm">
        <div className="p-3.5 sm:p-6 pb-2">
          {/* 7 Filter Dropdowns in natural order: Branch -> Batch -> Semester -> Section -> Subject -> Exam Type -> Set */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
            {/* 1. Branch */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Branch
              </label>
              <Select
                value={selected.branch_id ? String(selected.branch_id) : ""}
                onValueChange={(val) => handleFilterChange("branch_id", val)}
                open={isBranchOpen}
                onOpenChange={setIsBranchOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder={dropdownData.branch.length === 0 ? "Loading..." : "Select Branch"} />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {dropdownData.branch.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Batch */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Batch
              </label>
              <Select
                value={selected.batch_id ? String(selected.batch_id) : ""}
                onValueChange={(val) => handleFilterChange("batch_id", val)}
                disabled={!selected.branch_id}
                open={isBatchOpen}
                onOpenChange={setIsBatchOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder={!selected.branch_id ? "Select Branch First" : "Select Batch"} />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {dropdownData.batch.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Semester */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Semester
              </label>
              <Select
                value={selected.semester_id ? String(selected.semester_id) : ""}
                onValueChange={(val) => handleFilterChange("semester_id", val)}
                disabled={!selected.branch_id || !selected.batch_id || loadingBranchMeta}
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue
                    placeholder={
                      !selected.branch_id
                        ? "Select Branch First"
                        : !selected.batch_id
                        ? "Select Batch First"
                        : loadingBranchMeta
                        ? "Loading..."
                        : dropdownData.allSemesters.length === 0
                        ? "No semesters"
                        : "Select Semester"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {dropdownData.allSemesters.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      Semester {s.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Section */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Section
              </label>
              <Select
                value={selected.section_id ? String(selected.section_id) : ""}
                onValueChange={(val) => handleFilterChange("section_id", val)}
                disabled={!selected.semester_id || availableSections.length === 0}
                open={isSectionOpen}
                onOpenChange={setIsSectionOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue
                    placeholder={
                      !selected.semester_id
                        ? "Select Sem First"
                        : availableSections.length === 0
                        ? "No sections"
                        : "Select Section"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {availableSections.map((sec) => (
                    <SelectItem key={sec.id} value={String(sec.id)}>
                      Section {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Subject */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Subject
              </label>
              <Select
                value={selected.subject_id ? String(selected.subject_id) : ""}
                onValueChange={(val) => handleFilterChange("subject_id", val)}
                disabled={!selected.section_id || availableSubjects.length === 0}
                open={isSubjectOpen}
                onOpenChange={setIsSubjectOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue
                    placeholder={
                      !selected.section_id
                        ? "Select Sec First"
                        : availableSubjects.length === 0
                        ? "No subjects"
                        : "Select Subject"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {availableSubjects.length > 0 && (
                    <SelectItem value="all" className="font-semibold text-primary">
                      All Subjects ({availableSubjects.length})
                    </SelectItem>
                  )}
                  {availableSubjects.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.name} {sub.subject_code ? `(${sub.subject_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Exam Type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Exam Type
              </label>
              <Select
                value={selected.testType}
                onValueChange={(val) => handleFilterChange("testType", val)}
                disabled={!selected.subject_id}
                open={isTestTypeOpen}
                onOpenChange={setIsTestTypeOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder={!selected.subject_id ? "Select Subject First" : "Select Exam"} />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {dropdownData.testType.map((tt) => (
                    <SelectItem key={tt} value={tt}>
                      {tt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 7. Set */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Set
              </label>
              <Select
                value={isAllSubjects ? "All Sets" : selected.setNumber}
                onValueChange={(val) => handleFilterChange("setNumber", val)}
                disabled={isAllSubjects || !selected.testType || dropdownData.setNumber.length === 0}
                open={isSetNumberOpen}
                onOpenChange={setIsSetNumberOpen}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue
                    placeholder={
                      isAllSubjects
                        ? "All Sets"
                        : dropdownData.setNumber.length > 0
                        ? "Select Set"
                        : "No approved set"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {isAllSubjects ? (
                    <SelectItem value="All Sets">All Sets</SelectItem>
                  ) : dropdownData.setNumber.length > 0 ? (
                    dropdownData.setNumber.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-center text-muted-foreground">
                      No approved set
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <TabsList className="bg-muted w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-9 sm:h-10">
                <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                  Marks View
                </TabsTrigger>
                <TabsTrigger value="questionPaper" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                  Question Paper
                </TabsTrigger>
              </TabsList>

              {/* Action Buttons */}
              {tabValue === "manual" && areAllDropdownsSelected() && (isAllSubjects || qpReady) && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel || (!isAllSubjects && (loadingStudents || students.length === 0))}
                    className="w-full sm:w-auto h-9 px-3.5 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-300 font-medium border-emerald-300 dark:border-emerald-800 shadow-sm transition-all text-xs sm:text-sm"
                  >
                    {isExportingExcel ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>
                      {isExportingExcel
                        ? "Generating Excel..."
                        : isAllSubjects
                        ? `Export All Subjects (${availableSubjects.length}) (.xlsx)`
                        : "Export to Excel (.xlsx)"}
                    </span>
                  </Button>
                </div>
              )}
            </div>

            {/* Tab: Question Paper */}
            <TabsContent value="questionPaper" className="w-full max-w-full overflow-hidden mt-0 pt-4">
              {isAllSubjects ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-xl mt-4">
                  <div className="p-4 rounded-full mb-4 bg-primary/10 text-primary">
                    <Layers className="w-10 h-10 opacity-80" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Single Subject Required</h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Question Paper preview is available when viewing a specific individual subject. Please select a specific subject from the dropdown above to preview its question paper.
                  </p>
                </div>
              ) : !areAllDropdownsSelected() ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-xl mt-4">
                  <div className="p-4 rounded-full mb-4 bg-primary/10 text-primary">
                    <Layers className="w-10 h-10 opacity-80" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Selection Required</h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Please select Branch, Batch, Semester, Section, Subject, Exam Type, and Set above.
                  </p>
                </div>
              ) : loadingQP ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading Question Paper details...</p>
                </div>
              ) : !existingQpSummary || questions.length === 0 ? (
                <div className="py-16 text-center border rounded-lg p-6 bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    No approved question paper found for this subject and exam.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Bar with Download PDF Button */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                      <h3 className="font-semibold text-lg text-foreground">Question Paper Preview</h3>
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
                        <span>{downloadingPDF ? "Downloading..." : "Download PDF"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Status Panel */}
                  <div
                    className={`p-4 rounded-lg border ${
                      existingQpSummary.status === "approved"
                        ? theme === "dark"
                          ? "bg-green-500/10 text-green-300 border-green-500/30"
                          : "bg-green-50 text-green-800 border-green-200"
                        : theme === "dark"
                        ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
                        : "bg-yellow-50 text-yellow-800 border-yellow-200"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Status:</span>
                        <span className="capitalize font-medium">{existingQpSummary.status || "Pending"}</span>
                      </div>
                      {existingQpSummary.last_action && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span>Last Action:</span>
                            <span className="capitalize">{existingQpSummary.last_action.action}</span>
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
                              <span>{new Date(existingQpSummary.last_action.timestamp).toLocaleString()}</span>
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
                    </div>
                  </div>

                  {/* Question Paper Preview Sheet */}
                  <div className="overflow-x-auto p-1 custom-scrollbar">
                    <div
                      className={`min-w-[650px] max-w-4xl mx-auto ${
                        theme === "dark"
                          ? "bg-card text-foreground border-border"
                          : "bg-white text-slate-900 border-slate-300"
                      } border rounded-xl shadow-lg p-6 sm:p-8 space-y-4`}
                    >
                      {/* Header */}
                      <div
                        className={`flex items-center justify-between pb-3 border-b-2 ${
                          theme === "dark" ? "border-border" : "border-slate-900"
                        }`}
                      >
                        <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-start">
                          {getOrgLogoUrl(existingQpSummary?.org_logo) ? (
                            <img
                              src={getOrgLogoUrl(existingQpSummary?.org_logo)}
                              alt="Logo"
                              className="max-h-16 max-w-[80px] sm:max-w-[90px] object-contain rounded"
                              onError={(e) => {
                                if ((e.currentTarget as HTMLImageElement).src !== window.location.origin + "/logo.jpeg") {
                                  (e.currentTarget as HTMLImageElement).src = "/logo.jpeg";
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
                            {selected.testType ? selected.testType.replace("_", " ") : "Internal Assessment"}{" "}
                            {existingQpSummary?.set_number ? `- ${existingQpSummary.set_number}` : ""}
                          </div>
                        </div>
                        <div className="w-20 sm:w-24 flex-shrink-0" />
                      </div>

                      {/* Master Info Table */}
                      <div
                        className={`border ${
                          theme === "dark" ? "border-border" : "border-slate-900"
                        } rounded-sm overflow-hidden text-xs sm:text-sm`}
                      >
                        <div className={`grid grid-cols-12 border-b ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                          <div className={`col-span-3 font-bold p-2 ${theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"} border-r`}>
                            Subject :
                          </div>
                          <div className={`col-span-4 p-2 ${theme === "dark" ? "border-border" : "border-slate-900"} border-r font-medium`}>
                            {existingQpSummary?.subject_name || selected.subject || "--"}
                          </div>
                          <div className={`col-span-2 font-bold p-2 ${theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"} border-r`}>
                            Date:
                          </div>
                          <div className="col-span-3 p-2 font-medium">
                            {existingQpSummary?.exam_date || existingQpSummary?.date
                              ? format(
                                  new Date(
                                    (existingQpSummary.exam_date || existingQpSummary.date).includes("T")
                                      ? existingQpSummary.exam_date || existingQpSummary.date
                                      : `${existingQpSummary.exam_date || existingQpSummary.date}T00:00:00`
                                  ),
                                  "MMM. dd, yyyy"
                                )
                              : "--"}
                          </div>
                        </div>

                        <div className={`grid grid-cols-12 border-b ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                          <div className={`col-span-3 font-bold p-2 ${theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"} border-r`}>
                            Subject Code :
                          </div>
                          <div className={`col-span-4 p-2 ${theme === "dark" ? "border-border" : "border-slate-900"} border-r font-medium`}>
                            {existingQpSummary?.subject_code || selected.subject_code || "--"}
                          </div>
                          <div className={`col-span-2 font-bold p-2 ${theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"} border-r`}>
                            Time:
                          </div>
                          <div className="col-span-3 p-2 font-medium">
                            {existingQpSummary?.time || "10:00 AM - 01:00 PM"}
                          </div>
                        </div>

                        <div className={`grid grid-cols-12 border-b ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                          <div className={`col-span-3 font-bold p-2 ${theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"} border-r`}>
                            Prepared by:
                          </div>
                          <div className={`col-span-4 p-2 ${theme === "dark" ? "border-border" : "border-slate-900"} border-r font-medium`}>
                            {existingQpSummary?.faculty_name || "Faculty"}
                          </div>
                          <div className={`col-span-2 font-bold p-2 ${theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"} border-r`}>
                            Semester / Div:
                          </div>
                          <div className="col-span-3 p-2 font-medium">
                            {`Semester ${selected.semester || "--"} - ${selected.branch || "--"} / ${selected.section || "--"}`}
                          </div>
                        </div>

                        <div className="p-2 space-y-0.5">
                          <div className="font-bold">NOTE:</div>
                          <div className="text-muted-foreground leading-relaxed pl-2">
                            1. Answer one FULL question from each part.
                            <br />
                            2. Assume missing data suitably.
                          </div>
                        </div>
                      </div>

                      {/* Total Max Marks Header */}
                      <div className="flex justify-end text-sm sm:text-base font-bold pr-2 text-primary">
                        Max Marks: {calculatedTotalMaxMarks}
                      </div>

                      {/* Question Content Table */}
                      <div
                        className={`border ${
                          theme === "dark" ? "border-border" : "border-slate-900"
                        } rounded-sm overflow-hidden`}
                      >
                        <table className="w-full text-xs sm:text-sm border-collapse">
                          <thead>
                            <tr
                              className={`${
                                theme === "dark" ? "bg-muted/50 border-border" : "bg-slate-100 border-slate-900"
                              } border-b font-bold`}
                            >
                              <th className={`w-16 p-2 text-center border-r ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                                Q No.
                              </th>
                              <th className={`p-2 text-left border-r ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                                Question Content
                              </th>
                              <th className={`w-16 p-2 text-center border-r ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                                Marks
                              </th>
                              <th className={`w-24 p-2 text-center border-r ${theme === "dark" ? "border-border" : "border-slate-900"}`}>
                                RBT
                              </th>
                              <th className="w-20 p-2 text-center">CO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupQuestionsByPart().map((part) => (
                              <Fragment key={part.name}>
                                <tr
                                  className={`${
                                    theme === "dark" ? "bg-muted/70 border-border" : "bg-slate-200/80 border-slate-900"
                                  } border-b border-t font-bold text-center`}
                                >
                                  <td colSpan={5} className="py-1.5 uppercase tracking-wider text-xs sm:text-sm">
                                    {part.name}
                                  </td>
                                </tr>
                                {part.questions.map((q, idx) => (
                                  <Fragment key={q.id}>
                                    <tr
                                      className={`border-b ${
                                        theme === "dark" ? "border-border hover:bg-muted/30" : "border-slate-300 hover:bg-slate-50"
                                      } transition-colors`}
                                    >
                                      <td className={`p-2 text-center font-bold align-top border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                        Q.{q.number}
                                      </td>
                                      <td className={`p-2 align-top border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                        <div
                                          className="prose dark:prose-invert max-w-none text-xs sm:text-sm"
                                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.content) }}
                                        />
                                      </td>
                                      <td className={`p-2 text-center font-semibold align-top border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                        {q.maxMarks}
                                      </td>
                                      <td className={`p-2 text-center text-xs align-top border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                        {q.bloomsLevel || "--"}
                                      </td>
                                      <td className="p-2 text-center text-xs font-medium align-top">
                                        {formatCO(q.co) || "--"}
                                      </td>
                                    </tr>
                                    {idx < part.questions.length - 1 && (
                                      <tr className={`${theme === "dark" ? "bg-muted/20 border-border" : "bg-slate-100/50 border-slate-300"} border-b`}>
                                        <td colSpan={5} className="py-1 text-center text-xs italic font-semibold text-muted-foreground">
                                          — OR —
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                ))}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Revised Bloom's Taxonomy Footer Table */}
                      <div className="space-y-1.5 pt-2">
                        <div className="font-bold text-xs">RBT – Revised Bloom’s Taxonomy</div>
                        <table
                          className={`w-full max-w-md text-xs border ${
                            theme === "dark" ? "border-border text-muted-foreground" : "border-slate-300 text-slate-700"
                          }`}
                        >
                          <tbody>
                            <tr className={`border-b ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                              <td className={`p-1.5 border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                L1. Remembering
                              </td>
                              <td className={`p-1.5 border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                L2. Understanding
                              </td>
                              <td className="p-1.5">L3. Applying</td>
                            </tr>
                            <tr>
                              <td className={`p-1.5 border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                L4. Analyzing
                              </td>
                              <td className={`p-1.5 border-r ${theme === "dark" ? "border-border" : "border-slate-300"}`}>
                                L5. Evaluating
                              </td>
                              <td className="p-1.5">L6. Creating</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab: Marks View */}
            <TabsContent value="manual" className="pt-4">
              {isAllSubjects ? (
                <div className="border rounded-2xl p-4 sm:p-8 bg-card shadow-sm text-center max-w-2xl mx-auto my-4 sm:my-6 space-y-4 sm:space-y-5 border-border">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                      All Subjects Selected for Export
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                      Marks table preview is designed for individual subjects. With <strong>All Subjects</strong> selected, you can export the complete marks statement for all <strong>{availableSubjects.length} subjects</strong> in Sem {selected.semester} (Sec {selected.section} • {selected.branch}) into a single comprehensive Excel workbook.
                    </p>
                  </div>

                  <div className="bg-muted/40 rounded-xl p-3 sm:p-4 text-left border">
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Subjects included in export ({availableSubjects.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSubjects.map((sub) => (
                        <span
                          key={sub.id}
                          className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs rounded-md bg-background border font-medium text-foreground shadow-2xs"
                        >
                          {sub.name} {sub.subject_code ? `(${sub.subject_code})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleExportExcel}
                      disabled={isExportingExcel || availableSubjects.length === 0}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all gap-2 text-xs sm:text-sm"
                    >
                      {isExportingExcel ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          <span>Generating Consolidated Excel Workbook...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>Export All {availableSubjects.length} Subjects to Excel (.xlsx)</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : !areAllDropdownsSelected() ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl mt-4">
                  <div className="p-6 rounded-full mb-6 bg-primary/10 text-primary">
                    <Layers className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Selection Required</h3>
                  <p className="max-w-xs text-base text-muted-foreground leading-relaxed">
                    Please select all the dropdown options above to view student marks.
                  </p>
                </div>
              ) : !qpReady ? (
                <div className="py-16 text-center border rounded-xl p-8 bg-muted/20">
                  <p className="text-base text-muted-foreground">
                    An approved question paper is required before viewing marks.
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                  {/* Table Title Bar */}
                  <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 bg-muted/30">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">
                        {formatTestType(selected.testType)} — Marks Statement
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        {selected.subject} • Sem {selected.semester} • Sec {selected.section} • {selected.branch}
                      </p>
                    </div>
                    <div className="inline-flex items-center justify-between sm:justify-end gap-2 text-xs sm:text-sm font-semibold text-foreground bg-background/80 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border sm:border-0 w-fit">
                      <span className="text-muted-foreground">Max Marks:</span>
                      <strong className="text-primary text-sm sm:text-base font-bold">{calculatedTotalMaxMarks}</strong>
                    </div>
                  </div>

                  {/* Horizontally & Vertically Scrollable Marks Table Container */}
                  <div className="overflow-x-auto w-full custom-scrollbar max-w-full touch-pan-x">
                    <table className="w-max min-w-full divide-y divide-border border-collapse text-sm">
                      <thead className="bg-muted/70">
                        {/* Tier 1 Header */}
                        <tr>
                          <th
                            rowSpan={3}
                            className="sm:sticky sm:left-0 bg-muted z-20 px-2.5 py-2 sm:px-3 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r min-w-[36px] sm:min-w-[48px] max-w-[54px]"
                          >
                            #
                          </th>
                          <th
                            rowSpan={3}
                            className="sm:sticky sm:left-[48px] bg-muted z-20 px-2.5 py-2 sm:px-3 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r min-w-[105px] sm:min-w-[130px]"
                          >
                            USN
                          </th>
                          <th
                            rowSpan={3}
                            className="sm:sticky sm:left-[178px] bg-muted z-20 px-2.5 py-2 sm:px-3 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r min-w-[140px] sm:min-w-[180px] sm:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                          >
                            Student Name
                          </th>

                          {questions.map((question) => (
                            <th
                              key={`th-q-${question.id}`}
                              colSpan={3}
                              className="px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider border-r bg-primary/5 text-primary min-w-[125px] sm:min-w-[150px]"
                            >
                              Q{question.number}
                            </th>
                          ))}

                          <th
                            rowSpan={3}
                            className="px-3 sm:px-4 py-2 text-center text-xs font-bold uppercase tracking-wider align-middle min-w-[85px] sm:min-w-[110px] bg-primary/10 text-primary"
                          >
                            Total Marks
                          </th>
                        </tr>

                        {/* Tier 2 Header: CO, Max, Marks */}
                        <tr>
                          {questions.map((question) => (
                            <Fragment key={`th-sub-${question.id}`}>
                              <th className="px-1.5 sm:px-2 py-1 text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r min-w-[38px] sm:min-w-[45px]">
                                CO
                              </th>
                              <th className="px-1.5 sm:px-2 py-1 text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r min-w-[38px] sm:min-w-[45px]">
                                Max
                              </th>
                              <th className="px-1.5 sm:px-2 py-1 text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r min-w-[48px] sm:min-w-[60px]">
                                Marks
                              </th>
                            </Fragment>
                          ))}
                        </tr>

                        {/* Tier 3 Header: e.g. CO2, 7, IA4 */}
                        <tr>
                          {questions.map((question) => (
                            <Fragment key={`th-val-${question.id}`}>
                              <td className="px-1.5 sm:px-2 py-1 text-center text-xs font-medium text-muted-foreground border-r bg-muted/40">
                                {formatCO(question.co) || "CO"}
                              </td>
                              <td className="px-1.5 sm:px-2 py-1 text-center text-xs font-bold text-foreground border-r bg-muted/40">
                                {question.maxMarks}
                              </td>
                              <td className="px-1.5 sm:px-2 py-1 text-center text-xs italic text-muted-foreground border-r bg-muted/40">
                                {selected.testType}
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {loadingStudents ? (
                          <tr>
                            <td colSpan={questions.length * 3 + 4} className="py-20 text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                              <span className="text-sm text-muted-foreground">Loading student marks...</span>
                            </td>
                          </tr>
                        ) : students.length === 0 ? (
                          <tr>
                            <td colSpan={questions.length * 3 + 4} className="py-20 text-center text-muted-foreground">
                              No students found matching the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          students.map((student, idx) => (
                            <tr key={student.id} className="hover:bg-muted/30 group transition-colors">
                              {/* Sticky Column 1: # */}
                              <td className="sm:sticky sm:left-0 bg-card group-hover:bg-muted/40 z-10 px-2.5 py-2 sm:px-3 text-xs font-medium text-muted-foreground border-r text-center">
                                {(currentPage - 1) * studentsPerPage + idx + 1}
                              </td>

                              {/* Sticky Column 2: USN */}
                              <td className="sm:sticky sm:left-[48px] bg-card group-hover:bg-muted/40 z-10 px-2.5 py-2 sm:px-3 text-xs font-semibold text-foreground border-r font-mono">
                                {student.usn || "--"}
                              </td>

                              {/* Sticky Column 3: Student Name */}
                              <td className="sm:sticky sm:left-[178px] bg-card group-hover:bg-muted/40 z-10 px-2.5 py-2 sm:px-3 text-xs text-foreground font-medium border-r whitespace-nowrap sm:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]">
                                {student.name || "--"}
                              </td>

                              {/* Question Marks: 3 Sub-columns per question matching Tier 2 & 3 */}
                              {questions.map((question) => {
                                const val = studentMarks[student.id.toString()]?.[question.number];
                                return (
                                  <Fragment key={`st-q-${student.id}-${question.id}`}>
                                    <td className="px-1.5 sm:px-2 py-2 text-center text-xs text-muted-foreground border-r">
                                      {formatCO(question.co) || "-"}
                                    </td>
                                    <td className="px-1.5 sm:px-2 py-2 text-center text-xs text-muted-foreground border-r">
                                      {question.maxMarks}
                                    </td>
                                    <td className="px-1.5 sm:px-2 py-2 text-center text-xs font-semibold border-r">
                                      {val !== undefined && val !== "" && val !== null ? (
                                        <span className="inline-block px-2 sm:px-2.5 py-0.5 rounded bg-muted font-bold text-foreground">
                                          {val}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">-</span>
                                      )}
                                    </td>
                                  </Fragment>
                                );
                              })}

                              {/* Total Marks */}
                              <td className="px-3 sm:px-4 py-2 text-center text-sm font-bold bg-primary/5 text-primary">
                                {student.total !== "-" && student.total !== "" ? student.total : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {pagination && (pagination.total !== undefined ? pagination.total > 0 : students.length > 0) && (
                    <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
                      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                        <span className="text-[11px] sm:text-xs">
                          Showing{" "}
                          <strong className="text-foreground">
                            {students.length > 0 ? (currentPage - 1) * studentsPerPage + 1 : 0}
                          </strong>{" "}
                          to{" "}
                          <strong className="text-foreground">
                            {Math.min(currentPage * studentsPerPage, pagination?.total ?? students.length)}
                          </strong>{" "}
                          of <strong className="text-foreground">{pagination?.total ?? students.length}</strong>
                        </span>

                        <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                          <span className="text-[11px] sm:text-xs text-muted-foreground">Rows:</span>
                          <Select
                            value={String(studentsPerPage)}
                            onValueChange={(val) => {
                              const newSize = Number(val);
                              setStudentsPerPage(newSize);
                              fetchStudents(1, newSize);
                            }}
                          >
                            <SelectTrigger className="h-7 w-14 sm:w-16 text-xs px-2">
                              <SelectValue placeholder={String(studentsPerPage)} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(Math.max(currentPage - 1, 1))}
                          disabled={!pagination.has_previous || currentPage <= 1 || loadingStudents}
                          className="h-8 px-2.5 sm:px-3 text-xs flex-1 sm:flex-initial"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                          Previous
                        </Button>

                        <span className="px-2 font-medium text-foreground text-xs whitespace-nowrap">
                          {currentPage} / {pagination.total_pages || 1}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(Math.min(currentPage + 1, pagination.total_pages))}
                          disabled={!pagination.has_next || currentPage >= (pagination.total_pages || 1) || loadingStudents}
                          className="h-8 px-2.5 sm:px-3 text-xs flex-1 sm:flex-initial"
                        >
                          Next
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
