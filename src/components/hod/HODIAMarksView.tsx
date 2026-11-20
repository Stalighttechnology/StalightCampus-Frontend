import React, { useState, useEffect, useRef, Fragment } from "react";
import { Layers, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  StudentsForMarksResponse
} from "../../utils/faculty_api";
import { getSemesterBootstrap } from "../../utils/hod_api";

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
    const sortedUnique = Array.from(new Set(numbers)).sort((a, b) => a - b);
    return `CO${sortedUnique.join(",")}`;
  }
  return items.join(", ");
};

const formatBloomsList = (blooms: string | string[] | undefined | null): string[] => {
  if (!blooms) return [];
  if (Array.isArray(blooms)) return blooms;
  return blooms.split(",").map((s) => s.trim()).filter(Boolean);
};

const formatTestType = (testType: string): string => {
  if (!testType) return "";
  if (testType.startsWith("IA")) {
    const num = testType.replace("IA", "");
    return `IA Test ${num}`;
  }
  return `${testType} Test`;
};

const getOrgName = (extraName?: string | null): string => {
  try {
    if (extraName && typeof extraName === "string" && extraName.trim() && extraName !== "null" && extraName !== "undefined") {
      return extraName.trim();
    }
    const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const name = u.organization?.name || u.org?.name || u.org_name || u.organization_name;
        if (name && typeof name === "string" && name.trim()) return name.trim();
      } catch {
        // ignore
      }
    }
    const stored = localStorage.getItem("org_name") || sessionStorage.getItem("org_name");
    if (stored && stored.trim() && stored !== "null" && stored !== "undefined") return stored.trim();
  } catch {
    // ignore
  }
  return "STALIGHT INSTITUTE";
};

const getOrgLogoUrl = (extraLogo?: string | null): string => {
  let logo = "";
  try {
    if (extraLogo && typeof extraLogo === "string" && extraLogo.trim()) {
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
  if (!logo || logo === "null" || logo === "undefined") {
    return "/logo.jpeg";
  }
  if (logo.startsWith("http://") || logo.startsWith("https://") || logo.startsWith("data:")) {
    return logo;
  }
  const base = (typeof API_ENDPOINT !== "undefined" ? API_ENDPOINT.replace(/\/api\/?$/, "") : "") ||
               (window as any).API_BASE_URL ||
               (import.meta as any).env?.VITE_API_URL || "";
  const cleanBase = base ? base.replace(/\/$/, "") : "";
  if (logo.startsWith("/")) {
    return cleanBase ? `${cleanBase}${logo}` : logo;
  }
  return cleanBase ? `${cleanBase}/${logo}` : `/${logo}`;
};

const calculateQPMaxMarks = (questionsList: any[]): number => {
  if (!questionsList || questionsList.length === 0) return 0;

  const partsMap = new Map<string, Array<{ mainNum: string; maxMarks: number; isOr: boolean }>>();
  const seenMap = new Map<string, { mainNum: string; maxMarks: number; isOr: boolean }>();

  questionsList.forEach((q, idx) => {
    const partName = q.part_name || q.partName || "PART-A";
    const isOr = Boolean(q.is_or || q.isOr);
    const rawNum = String(q.question_number || q.questionNumber || q.number || (idx + 1));
    const cleanNum = rawNum.replace(/^[Qq]\.?\s*/, "").trim();
    const match = cleanNum.match(/^(\d+)/);
    const mainNum = match ? match[1] : (cleanNum || String(idx + 1));

    let marks = 0;
    if (Array.isArray(q.subparts) && q.subparts.length > 0) {
      marks = q.subparts.reduce((sum: number, s: any) => {
        const m = parseFloat(String(s.max_marks ?? s.maxMarks ?? 0));
        return sum + (isNaN(m) ? 0 : m);
      }, 0);
    } else {
      marks = parseFloat(String(q.max_marks ?? q.maxMarks ?? 0)) || 0;
    }

    const key = `${partName}_${mainNum}`;
    if (!seenMap.has(key)) {
      const obj = { mainNum, maxMarks: marks, isOr };
      seenMap.set(key, obj);
      if (!partsMap.has(partName)) {
        partsMap.set(partName, []);
      }
      partsMap.get(partName)!.push(obj);
    } else {
      const existing = seenMap.get(key)!;
      existing.maxMarks += marks;
      if (isOr) existing.isOr = true;
    }
  });

  let grandTotal = 0;
  partsMap.forEach((mainQuestions) => {
    let partTotal = 0;
    let prevMarks = 0;
    mainQuestions.forEach((mq, i) => {
      if (mq.isOr && i > 0) {
        partTotal = partTotal - prevMarks + Math.max(prevMarks, mq.maxMarks);
        prevMarks = Math.max(prevMarks, mq.maxMarks);
      } else {
        partTotal += mq.maxMarks;
        prevMarks = mq.maxMarks;
      }
    });
    grandTotal += partTotal;
  });

  return Number.isInteger(grandTotal) ? grandTotal : parseFloat(grandTotal.toFixed(2));
};

const calculateStudentTotalFromMarks = (
  marksRecord: Record<string, string | number>,
  questionsList: any[],
  qpMaxMarks: number
): string => {
  if (!marksRecord || Object.keys(marksRecord).length === 0) return "";

  const hasAnyMark = Object.values(marksRecord).some((v) => v !== undefined && v !== "" && v !== null);
  if (!hasAnyMark) return "";

  const partsMap = new Map<string, Array<{ mainNum: string; isOr: boolean; subpartNumbers: string[] }>>();
  const seenMap = new Map<string, { mainNum: string; isOr: boolean; subpartNumbers: string[] }>();

  questionsList.forEach((q, idx) => {
    const partName = q.part_name || q.partName || "PART-A";
    const isOr = Boolean(q.is_or || q.isOr);
    const rawNum = String(q.question_number || q.questionNumber || q.number || (idx + 1));
    const cleanNum = rawNum.replace(/^[Qq]\.?\s*/, "").trim();
    const match = cleanNum.match(/^(\d+)/);
    const mainNum = match ? match[1] : (cleanNum || String(idx + 1));
    const qNumKey = q.number || rawNum;

    const key = `${partName}_${mainNum}`;
    if (!seenMap.has(key)) {
      const obj = { mainNum, isOr, subpartNumbers: [qNumKey] };
      seenMap.set(key, obj);
      if (!partsMap.has(partName)) {
        partsMap.set(partName, []);
      }
      partsMap.get(partName)!.push(obj);
    } else {
      const existing = seenMap.get(key)!;
      if (!existing.subpartNumbers.includes(qNumKey)) {
        existing.subpartNumbers.push(qNumKey);
      }
      if (isOr) existing.isOr = true;
    }
  });

  let totalObtained = 0;
  partsMap.forEach((mainQuestions) => {
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

    let partTotal = 0;
    let prevScore = 0;
    mainScores.forEach((mq, i) => {
      if (mq.isOr && i > 0) {
        const best = Math.max(prevScore, mq.score);
        partTotal = partTotal - prevScore + best;
        prevScore = best;
      } else {
        partTotal += mq.score;
        prevScore = mq.score;
      }
    });
    totalObtained += partTotal;
  });

  const rounded = Math.round(totalObtained * 100) / 100;
  return rounded > qpMaxMarks && qpMaxMarks > 0 ? String(qpMaxMarks) : String(rounded);
};

export default function HODIAMarksView() {
  const { theme } = useTheme();
  const [tabValue, setTabValue] = useState<string>("manual");
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);
  const [loadingBootstrap, setLoadingBootstrap] = useState<boolean>(true);
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
    subject_id: undefined as number | undefined,
    subject_code: "",
    testType: "",
    setNumber: ""
  });

  // Dropdown open states for automatic cascading trigger
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

  // Request counter refs to prevent duplicate concurrent network calls
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

  // Filtered dropdown lists based on semester selection
  const availableSections = selected.semester_id
    ? dropdownData.allSections.filter((s) => String(s.semester_id) === String(selected.semester_id))
    : dropdownData.allSections;

  const availableSubjects = selected.semester_id
    ? dropdownData.allSubjects.filter((sub) => String(sub.semester_id) === String(selected.semester_id))
    : dropdownData.allSubjects;

  // Handle dropdown selection and auto-trigger next dropdown
  const handleFilterChange = (field: string, value: string | number) => {
    if (field === "batch_id") {
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
    } else if (field === "testType") {
      setSelected((prev) => ({
        ...prev,
        testType: String(value),
        setNumber: ""
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

  // 1. Initial Load: Batches and HOD Branch Metadata only (NO student/marks queries)
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      setLoadingBootstrap(true);
      try {
        const [batchesRes, hodBootstrapRes] = await Promise.all([
          getBatches(),
          getSemesterBootstrap(["profile", "semesters", "sections", "subjects"])
        ]);

        if (!isMounted) return;

        let batchList: { id: number; name: string }[] = [];
        if (batchesRes?.success && Array.isArray(batchesRes.data)) {
          batchList = batchesRes.data.map((b: any) => ({
            id: Number(b.id),
            name: b.name
          }));
        }

        let branchObj: { id: number; name: string }[] = [];
        let semestersList: { id: number; number: number }[] = [];
        let sectionsList: { id: number; name: string; semester_id: string }[] = [];
        let subjectsList: { id: number; name: string; subject_code?: string; semester_id: string }[] = [];

        if (hodBootstrapRes?.success && hodBootstrapRes.data) {
          const d = hodBootstrapRes.data;
          if (d.profile?.branch_id) {
            branchObj = [{ id: Number(d.profile.branch_id), name: d.profile.branch || "My Branch" }];
            setSelected((prev) => ({
              ...prev,
              branch_id: Number(d.profile.branch_id),
              branch: d.profile.branch || "My Branch"
            }));
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

        setDropdownData({
          batch: batchList,
          branch: branchObj,
          allSemesters: semestersList,
          allSections: sectionsList,
          allSubjects: subjectsList,
          testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"],
          setNumber: []
        });
      } catch (err) {
        console.error("Failed to load initial HOD Marks metadata", err);
      } finally {
        if (isMounted) setLoadingBootstrap(false);
      }
    };

    initData();
    return () => {
      isMounted = false;
    };
  }, []);

  const areAllDropdownsSelected = () => {
    return Boolean(
      selected.batch_id &&
      selected.branch_id &&
      selected.semester_id &&
      selected.section_id &&
      selected.subject_id &&
      selected.testType &&
      selected.setNumber
    );
  };

  const applyQuestionPaper = (qp: any) => {
    setExistingQpSummary(qp);
    const qList = qp.questions;
    if (qList && qList.length > 0) {
      const loadedQuestions: Question[] = [];
      qList.forEach((q: any) => {
        const qnum = q.question_number || q.number || "";
        const rawPartName = q.part_name || "PART-A";
        const isOr = Boolean(q.is_or);
        const co = q.co || "";
        const bloomsLevel = q.blooms_level || q.bloomsLevel || "";

        if (Array.isArray(q.subparts) && q.subparts.length > 0) {
          q.subparts.forEach((sub: any) => {
            const subLabel = sub.subpart_label || sub.subpart || "";
            const fullNum = subLabel && !qnum.endsWith(subLabel) ? `${qnum}${subLabel}` : qnum;
            loadedQuestions.push({
              id: `${fullNum}_${Math.random().toString(36).substring(2, 7)}`,
              number: fullNum,
              content: sub.content || "",
              maxMarks: String(sub.max_marks ?? sub.maxMarks ?? 0),
              co,
              bloomsLevel,
              partName: rawPartName,
              isOr
            });
          });
        } else {
          loadedQuestions.push({
            id: `${qnum}_${Math.random().toString(36).substring(2, 7)}`,
            number: qnum,
            content: q.content || "",
            maxMarks: String(q.max_marks ?? q.maxMarks ?? 0),
            co,
            bloomsLevel,
            partName: rawPartName,
            isOr
          });
        }
      });
      setQuestions(loadedQuestions);
      setQpReady(true);
    } else {
      setQuestions([]);
      setQpReady(false);
    }
  };

  // 2. Load Question Papers ONLY AFTER subject and exam type are selected
  useEffect(() => {
    if (
      !selected.batch_id ||
      !selected.branch_id ||
      !selected.semester_id ||
      !selected.section_id ||
      !selected.subject_id ||
      !selected.testType
    ) {
      setDropdownData((prev) => ({ ...prev, setNumber: [] }));
      setExistingQpSummary(null);
      setQuestions([]);
      setQpReady(false);
      approvedQPsCache.current = [];
      return;
    }

    let isMounted = true;
    const currentReq = ++qpFetchReqCounter.current;

    const fetchQPs = async () => {
      setLoadingQP(true);
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

          const approvedQPs = matchingQPs.filter((q: any) => q.status === "approved");
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
              if (dRes?.success && Array.isArray(dRes.data) && dRes.data.length > 0) {
                existingQp = { ...existingQp, ...dRes.data[0] };
              }
            }

            if (!isMounted || currentReq !== qpFetchReqCounter.current) return;
            applyQuestionPaper(existingQp);
          } else {
            setExistingQpSummary(null);
            setQuestions([]);
            setQpReady(false);
          }
        }
      } catch (err) {
        console.error("Error fetching QPs for HOD", err);
      } finally {
        if (isMounted && currentReq === qpFetchReqCounter.current) setLoadingQP(false);
      }
    };

    fetchQPs();
    return () => {
      isMounted = false;
    };
  }, [
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
          if (dRes?.success && Array.isArray(dRes.data) && dRes.data.length > 0) {
            existingQp = { ...existingQp, ...dRes.data[0] };
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

  // 3. Fetch Students and Entered Marks with pagination (guards against duplicate calls)
  const fetchStudents = async (page: number = 1, pageSizeOverride?: number) => {
    if (!areAllDropdownsSelected()) {
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

      // If a newer request was dispatched while this was in flight, ignore this response
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
      console.error("Failed to fetch students for HOD view", err);
      if (currentReq === studentFetchReqCounter.current) {
        setStudents([]);
      }
    } finally {
      if (currentReq === studentFetchReqCounter.current) {
        setLoadingStudents(false);
      }
    }
  };

  // Only trigger student marks fetch when all required dropdowns are selected (questions removed from deps to eliminate double calls)
  useEffect(() => {
    if (areAllDropdownsSelected()) {
      fetchStudents(1);
    } else {
      setStudents([]);
      setStudentMarks({});
    }
  }, [
    selected.batch_id,
    selected.branch_id,
    selected.semester_id,
    selected.section_id,
    selected.subject_id,
    selected.testType,
    selected.setNumber,
    studentsPerPage
  ]);

  // Group questions by Part (e.g. PART-A, PART-B) for the Question Paper Preview
  const groupQuestionsByPart = (): { name: string; questions: Question[] }[] => {
    const partsMap = new Map<string, Question[]>();
    questions.forEach((q) => {
      const p = q.partName || "PART-A";
      if (!partsMap.has(p)) {
        partsMap.set(p, []);
      }
      partsMap.get(p)!.push(q);
    });
    return Array.from(partsMap.entries()).map(([name, qs]) => ({
      name,
      questions: qs
    }));
  };

  // Download QP PDF
  const downloadQuestionPaperPDF = async () => {
    if (!existingQpSummary?.id) return;
    setDownloadingPDF(true);
    try {
      const url = `${API_ENDPOINT}/admin/qps/${existingQpSummary.id}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF from backend");
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const cleanSub = (selected.subject || "Subject").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `${cleanSub}_${selected.testType || "QP"}_${existingQpSummary?.set_number || "Set1"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading QP PDF", error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  // 4. Excel Export Function
  const handleExportExcel = async () => {
    if (!areAllDropdownsSelected()) return;

    setIsExportingExcel(true);
    try {
      // Fetch all students without pagination for complete Excel report
      let allStudentsList: any[] = [];
      const allRes: StudentsForMarksResponse = await getStudentsForMarks({
        branch_id: selected.branch_id?.toString(),
        subject_id: selected.subject_id?.toString(),
        semester_id: selected.semester_id?.toString(),
        section_id: selected.section_id?.toString(),
        test_type: selected.testType,
        batch_id: selected.batch_id?.toString(),
        set_number: selected.setNumber,
        page: 1,
        page_size: 1000
      });

      if (allRes?.success && Array.isArray(allRes.data) && allRes.data.length > 0) {
        allStudentsList = allRes.data;
      } else {
        allStudentsList = students;
      }

      const qpMax = calculateQPMaxMarks(questions);

      const exportRows = allStudentsList.map((s, idx) => {
        const studentIdStr = s.id.toString();
        const rowMarks: Record<string, string> = {};

        if (s.existing_mark?.marks_detail) {
          Object.keys(s.existing_mark.marks_detail).forEach((k) => {
            rowMarks[k] = String(s.existing_mark.marks_detail[k]);
          });
        } else if (studentMarks[studentIdStr]) {
          Object.assign(rowMarks, studentMarks[studentIdStr]);
        }

        let rowTotal = s.existing_mark?.total_obtained !== undefined ? String(s.existing_mark.total_obtained) : "";
        if (!rowTotal) {
          rowTotal = calculateStudentTotalFromMarks(rowMarks, questions, qpMax);
        }

        return {
          index: idx + 1,
          usn: s.usn || "--",
          name: s.name || "--",
          marks: rowMarks,
          total: rowTotal || "-"
        };
      });

      const orgName = getOrgName(existingQpSummary?.org_name);
      const batchName = dropdownData.batch.find((b) => String(b.id) === String(selected.batch_id))?.name || "";
      const subjectName = selected.subject || "--";
      const subjectCode = selected.subject_code || "--";
      const branchName = selected.branch || "--";
      const semNumber = selected.semester || "--";
      const sectionName = selected.section || "--";
      const formattedTest = formatTestType(selected.testType);
      const facultyName = existingQpSummary?.faculty_name || "Faculty";
      const formattedDate = existingQpSummary?.exam_date || existingQpSummary?.date
        ? format(new Date((existingQpSummary.exam_date || existingQpSummary.date).includes('T') ? (existingQpSummary.exam_date || existingQpSummary.date) : `${existingQpSummary.exam_date || existingQpSummary.date}T00:00:00`), "dd/MM/yyyy")
        : format(new Date(), "dd/MM/yyyy");

      const totalColumns = 3 + (questions.length * 3) + 1;
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

      // Row 9 (Header Tier 3): CO number, Max marks number, Test name
      const row9 = new Array(totalColumns).fill("");
      questions.forEach((q, idx) => {
        row9[3 + idx * 3] = formatCO(q.co) || "CO";
        row9[3 + idx * 3 + 1] = Number(q.maxMarks) || q.maxMarks;
        row9[3 + idx * 3 + 2] = formattedTest;
      });
      aoa.push(row9);

      // Student rows
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

      // Footer signatures
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

      const ws = XLSX.utils.aoa_to_sheet(aoa);

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

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, `${selected.testType} Marks`);

      const safeSubject = subjectName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeTestType = selected.testType.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeSet = (selected.setNumber || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeBatch = (batchName || "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeSubject}_${safeTestType}${safeSet ? `_${safeSet}` : ""}_Marks_Statement${safeBatch ? `_${safeBatch}` : ""}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Export to Excel failed", err);
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
            View and export exam marks and internal assessment scores for students.
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border shadow-sm">
        <div className="p-6 pb-2">
          {/* 6 Filter Dropdowns in natural order: Batch -> Semester -> Section -> Subject -> Exam Type -> Set */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {/* 1. Batch */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Batch
              </label>
              <Select
                value={selected.batch_id ? String(selected.batch_id) : ""}
                onValueChange={(val) => handleFilterChange("batch_id", val)}
                open={isBatchOpen}
                onOpenChange={setIsBatchOpen}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Batch" />
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

            {/* 2. Semester */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Semester
              </label>
              <Select
                value={selected.semester_id ? String(selected.semester_id) : ""}
                onValueChange={(val) => handleFilterChange("semester_id", val)}
                disabled={!selected.batch_id}
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!selected.batch_id ? "Select Batch First" : "Select Semester"} />
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

            {/* 3. Section */}
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!selected.semester_id ? "Select Sem First" : availableSections.length === 0 ? "No sections" : "Select Section"} />
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

            {/* 4. Subject */}
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!selected.section_id ? "Select Sec First" : availableSubjects.length === 0 ? "No subjects" : "Select Subject"} />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {availableSubjects.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.name} {sub.subject_code ? `(${sub.subject_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Exam Type */}
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
                <SelectTrigger className="w-full">
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

            {/* 6. Set */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Set
              </label>
              <Select
                value={selected.setNumber}
                onValueChange={(val) => handleFilterChange("setNumber", val)}
                disabled={!selected.testType || dropdownData.setNumber.length === 0}
                open={isSetNumberOpen}
                onOpenChange={setIsSetNumberOpen}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dropdownData.setNumber.length > 0 ? "Select Set" : "No approved set"} />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {dropdownData.setNumber.length > 0 ? (
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
              <TabsList className="bg-muted">
                <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Marks View
                </TabsTrigger>
                <TabsTrigger value="questionPaper" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Question Paper
                </TabsTrigger>
              </TabsList>

              {/* Action Buttons */}
              {tabValue === "manual" && areAllDropdownsSelected() && qpReady && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel || loadingStudents || students.length === 0}
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
              )}
            </div>

            {/* Tab: Question Paper (Identical to Faculty Question Paper Preview Sheet) */}
            <TabsContent value="questionPaper" className="w-full max-w-full overflow-hidden mt-0 pt-4">
              {!areAllDropdownsSelected() ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-xl mt-4">
                  <div className="p-4 rounded-full mb-4 bg-primary/10 text-primary">
                    <Layers className="w-10 h-10 opacity-80" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Selection Required</h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Please select Batch, Semester, Section, Subject, Exam Type, and Set above.
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
                      {/* Mobile Download PDF Button */}
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

                    {/* Desktop Download PDF Button */}
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

                  {/* Status Panel showing approval status and history */}
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
                          <div
                            className={`col-span-3 font-bold p-2 ${
                              theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"
                            } border-r`}
                          >
                            Subject :
                          </div>
                          <div className={`col-span-4 p-2 ${theme === "dark" ? "border-border" : "border-slate-900"} border-r font-medium`}>
                            {existingQpSummary?.subject_name || selected.subject || "--"}
                          </div>
                          <div
                            className={`col-span-2 font-bold p-2 ${
                              theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"
                            } border-r`}
                          >
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
                          <div
                            className={`col-span-3 font-bold p-2 ${
                              theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"
                            } border-r`}
                          >
                            Subject Code :
                          </div>
                          <div className={`col-span-4 p-2 ${theme === "dark" ? "border-border" : "border-slate-900"} border-r font-medium`}>
                            {existingQpSummary?.subject_code || selected.subject_code || "--"}
                          </div>
                          <div
                            className={`col-span-2 font-bold p-2 ${
                              theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"
                            } border-r`}
                          >
                            Time:
                          </div>
                          <div className="col-span-3 p-2 font-medium">
                            {existingQpSummary?.exam_time || existingQpSummary?.duration || "10:00 AM - 01:00 PM"}
                          </div>
                        </div>

                        <div className="grid grid-cols-12">
                          <div
                            className={`col-span-3 font-bold p-2 ${
                              theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"
                            } border-r`}
                          >
                            Prepared by:
                          </div>
                          <div className={`col-span-4 p-2 ${theme === "dark" ? "border-border" : "border-slate-900"} border-r font-medium`}>
                            {existingQpSummary?.faculty_name || existingQpSummary?.prepared_by || "Faculty"}
                          </div>
                          <div
                            className={`col-span-2 font-bold p-2 ${
                              theme === "dark" ? "bg-muted/40 border-border" : "bg-slate-50 border-slate-900"
                            } border-r`}
                          >
                            Semester / Div:
                          </div>
                          <div className="col-span-3 p-2 font-medium">
                            Semester {selected.semester} - {selected.branch} / {selected.section}
                          </div>
                        </div>
                      </div>

                      {/* Instructions & Max Marks */}
                      <div
                        className={`flex justify-between items-end border ${
                          theme === "dark" ? "border-border bg-muted/20" : "border-slate-900 bg-slate-50/50"
                        } p-2.5 text-xs sm:text-sm`}
                      >
                        <div>
                          <span className="font-bold italic">NOTE:</span>
                          <ol className="list-decimal list-inside text-xs mt-0.5 space-y-0.5 text-muted-foreground">
                            <li>Answer one FULL question from each part.</li>
                            <li>Assume missing data suitably.</li>
                          </ol>
                        </div>
                        <div className="text-right font-bold italic text-sm">
                          Max Marks: <span className="text-primary font-bold text-base not-italic ml-1">{calculatedTotalMaxMarks}</span>
                        </div>
                      </div>

                      {/* Question Parts Table */}
                      <div className={`border ${theme === "dark" ? "border-border" : "border-slate-900"} rounded-sm overflow-hidden`}>
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
                              <React.Fragment key={part.name}>
                                {/* Part Header */}
                                <tr
                                  className={`${
                                    theme === "dark" ? "bg-muted/70 border-border" : "bg-slate-200/80 border-slate-900"
                                  } border-b border-t font-bold text-center`}
                                >
                                  <td colSpan={5} className="py-1.5 uppercase tracking-wider text-xs sm:text-sm">
                                    {part.name}
                                  </td>
                                </tr>

                                {part.questions.map((q) => (
                                  <React.Fragment key={q.id}>
                                    {/* OR Separator */}
                                    {q.isOr && (
                                      <tr
                                        className={`border-b ${
                                          theme === "dark"
                                            ? "border-border bg-amber-950/20 text-amber-400"
                                            : "border-slate-900 bg-amber-50/60 text-amber-700"
                                        } font-bold text-center`}
                                      >
                                        <td colSpan={5} className="py-1 text-xs tracking-widest uppercase">
                                          — OR —
                                        </td>
                                      </tr>
                                    )}

                                    {/* Question Row */}
                                    <tr
                                      className={`border-b ${
                                        theme === "dark"
                                          ? "border-border hover:bg-muted/30"
                                          : "border-slate-900 hover:bg-slate-50/50"
                                      } transition-colors`}
                                    >
                                      <td
                                        className={`p-2.5 text-center font-bold align-top border-r ${
                                          theme === "dark" ? "border-border" : "border-slate-900"
                                        } whitespace-nowrap`}
                                      >
                                        Q.{q.number}
                                      </td>
                                      <td
                                        className={`p-2.5 text-left align-top border-r ${
                                          theme === "dark" ? "border-border" : "border-slate-900"
                                        }`}
                                      >
                                        <div
                                          className="whitespace-pre-line break-words text-xs sm:text-sm"
                                          dangerouslySetInnerHTML={{
                                            __html: sanitizeHtml(q.content || "Question content")
                                          }}
                                        />
                                      </td>
                                      <td
                                        className={`p-2.5 text-center font-semibold align-top border-r ${
                                          theme === "dark" ? "border-border" : "border-slate-900"
                                        }`}
                                      >
                                        {q.maxMarks}
                                      </td>
                                      <td
                                        className={`p-2.5 text-center align-middle border-r ${
                                          theme === "dark" ? "border-border" : "border-slate-900"
                                        } text-xs font-medium`}
                                      >
                                        {formatBloomsList(q.bloomsLevel).length > 0 ? (
                                          <div className="flex flex-col items-center justify-center space-y-1">
                                            {formatBloomsList(q.bloomsLevel).map((bl, idx) => (
                                              <div key={idx} className="leading-tight">
                                                {bl}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          "--"
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center align-middle font-medium text-xs">
                                        {formatCO(q.co) || "--"}
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

            {/* Tab: Marks View (Horizontally scrollable with sticky student identifiers & verified pagination) */}
            <TabsContent value="manual" className="pt-4">
              {!areAllDropdownsSelected() ? (
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
                  <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/30">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {formatTestType(selected.testType)} — Marks Statement
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selected.subject} • Sem {selected.semester} • Sec {selected.section} • {selected.branch}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Max Marks: <strong className="text-primary text-base ml-1">{calculatedTotalMaxMarks}</strong>
                    </div>
                  </div>

                  {/* Horizontally & Vertically Scrollable Marks Table Container */}
                  <div className="overflow-x-auto w-full custom-scrollbar max-w-full">
                    <table className="w-max min-w-full divide-y divide-border border-collapse text-sm">
                      <thead className="bg-muted/70">
                        {/* Tier 1 Header */}
                        <tr>
                          <th
                            rowSpan={3}
                            className="sticky left-0 bg-muted z-30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r min-w-[48px] max-w-[54px]"
                          >
                            #
                          </th>
                          <th
                            rowSpan={3}
                            className="sticky left-[48px] bg-muted z-30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r min-w-[130px]"
                          >
                            USN
                          </th>
                          <th
                            rowSpan={3}
                            className="sticky left-[178px] bg-muted z-30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r min-w-[180px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                          >
                            Student Name
                          </th>

                          {questions.map((question) => (
                            <th
                              key={`th-q-${question.id}`}
                              colSpan={3}
                              className="px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider border-r bg-primary/5 text-primary min-w-[150px]"
                            >
                              Q{question.number}
                            </th>
                          ))}

                          <th
                            rowSpan={3}
                            className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider align-middle min-w-[110px] bg-primary/10 text-primary"
                          >
                            Total Marks
                          </th>
                        </tr>

                        {/* Tier 2 Header: CO, Max, Marks */}
                        <tr>
                          {questions.map((question) => (
                            <Fragment key={`th-sub-${question.id}`}>
                              <th className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r min-w-[45px]">
                                CO
                              </th>
                              <th className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r min-w-[45px]">
                                Max
                              </th>
                              <th className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r min-w-[60px]">
                                Marks
                              </th>
                            </Fragment>
                          ))}
                        </tr>

                        {/* Tier 3 Header: e.g. CO2, 7, IA4 */}
                        <tr>
                          {questions.map((question) => (
                            <Fragment key={`th-val-${question.id}`}>
                              <td className="px-2 py-1 text-center text-xs font-medium text-muted-foreground border-r bg-muted/40">
                                {formatCO(question.co) || "CO"}
                              </td>
                              <td className="px-2 py-1 text-center text-xs font-bold text-foreground border-r bg-muted/40">
                                {question.maxMarks}
                              </td>
                              <td className="px-2 py-1 text-center text-xs italic text-muted-foreground border-r bg-muted/40">
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
                              <td className="sticky left-0 bg-card group-hover:bg-muted/40 z-10 px-3 py-2 text-xs font-medium text-muted-foreground border-r text-center">
                                {(currentPage - 1) * studentsPerPage + idx + 1}
                              </td>

                              {/* Sticky Column 2: USN */}
                              <td className="sticky left-[48px] bg-card group-hover:bg-muted/40 z-10 px-3 py-2 text-xs font-semibold text-foreground border-r font-mono">
                                {student.usn || "--"}
                              </td>

                              {/* Sticky Column 3: Student Name */}
                              <td className="sticky left-[178px] bg-card group-hover:bg-muted/40 z-10 px-3 py-2 text-xs text-foreground font-medium border-r whitespace-nowrap shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]">
                                {student.name || "--"}
                              </td>

                              {/* Question Marks: 3 Sub-columns per question matching Tier 2 & 3 */}
                              {questions.map((question) => {
                                const val = studentMarks[student.id]?.[question.number];
                                return (
                                  <Fragment key={`st-q-${student.id}-${question.id}`}>
                                    <td className="px-2 py-2 text-center text-xs text-muted-foreground border-r">
                                      {formatCO(question.co) || "-"}
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs text-muted-foreground border-r">
                                      {question.maxMarks}
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs font-semibold border-r">
                                      {val !== undefined && val !== "" && val !== null ? (
                                        <span className="inline-block px-2.5 py-0.5 rounded bg-muted font-bold text-foreground">
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
                              <td className="px-4 py-2 text-center text-sm font-bold bg-primary/5 text-primary">
                                {student.total !== "-" && student.total !== "" ? student.total : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {pagination && (
                    <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
                      <div className="flex items-center gap-3">
                        <span>
                          Showing{" "}
                          <strong className="text-foreground">
                            {pagination.total > 0 ? (currentPage - 1) * studentsPerPage + 1 : 0}
                          </strong>{" "}
                          to{" "}
                          <strong className="text-foreground">
                            {Math.min(currentPage * studentsPerPage, pagination.total || students.length)}
                          </strong>{" "}
                          of <strong className="text-foreground">{pagination.total || students.length}</strong> students
                        </span>

                        <div className="flex items-center gap-1.5 ml-2">
                          <span>Rows per page:</span>
                          <Select
                            value={String(studentsPerPage)}
                            onValueChange={(val) => {
                              const newSize = Number(val);
                              setStudentsPerPage(newSize);
                              fetchStudents(1, newSize);
                            }}
                          >
                            <SelectTrigger className="h-7 w-16 text-xs">
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

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(Math.max(currentPage - 1, 1))}
                          disabled={!pagination.has_previous || currentPage <= 1 || loadingStudents}
                          className="h-8 px-3 text-xs"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                          Previous
                        </Button>

                        <span className="px-2 font-medium text-foreground">
                          Page {currentPage} of {pagination.total_pages || 1}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(Math.min(currentPage + 1, pagination.total_pages))}
                          disabled={!pagination.has_next || currentPage >= (pagination.total_pages || 1) || loadingStudents}
                          className="h-8 px-3 text-xs"
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
