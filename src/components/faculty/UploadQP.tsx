import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Trash2, Layers, Loader2, FileDown, Image, Eraser, RotateCcw, Check, X, Undo, Redo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useFacultyAssignmentsQuery } from "../../hooks/useApiQueries";
import { createQuestionPaper, updateQuestionPaper, getQuestionPapers, submitQPForApproval, getQuestionPaperDetail, getBatches } from "../../utils/faculty_api";
import { performR2Upload } from "../../utils/common_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonList, SkeletonTable } from "@/components/ui/skeleton";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";

interface QuestionRow {
  id: string;
  number: string;
  content: string;
  maxMarks: string;
  co: string;
  bloomsLevel: string;
}

interface QuestionData {
  question_number?: string;
  number?: string;
  co?: string;
  blooms_level?: string;
  bloomsLevel?: string;
  questions?: QuestionData[];
  questions_data?: QuestionData[];
  subparts?: SubPart[];
  subparts_data?: SubPart[];
}

interface SubPart {
  subpart_label?: string;
  content?: string;
  max_marks?: number;
  maxMarks?: number;
}

interface QPMetadata {
  status: string;
  last_action?: { actor?: string; role: string; action: string; comment: string; };
}

interface QuestionPaper {
  id: number;
  status: string;
  subject: number;
  subject_name?: string;
  test_type: string;
  set_number?: string;
  batch?: { id: number; name: string; } | number;
  semester?: number;
  section?: number;
  last_action?: { actor?: string; role: string; action: string; comment: string; };
  questions?: QuestionData[];
  questions_data?: QuestionData[];
}

interface CreateQPPayload {
  subject: number;
  test_type: string;
  set_number: string;
  questions_data: Array<{
    question_number: string;
    co: string;
    blooms_level: string;
    subparts_data: Array<{ subpart_label: string; content: string; max_marks: number; }>;
  }>;
  batch: number;
  branch: number;
  semester: number;
  section: number;
}

const UploadQP = () => {
  const location = useLocation();
  const { data: assignments = [] } = useFacultyAssignmentsQuery();
  const { toast } = useToast();
  const [dropdownData, setDropdownData] = useState({
    batch: [] as { id: number; name: string; }[],
    branch: [] as { id: number; name: string; }[],
    semester: [] as { id: number; number: number; }[],
    section: [] as { id: number; name: string; }[],
    subject: [] as { id: number; name: string; }[],
    testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"],
    setNumber: ["Set 1", "Set 2"]
  });

  const [selected, setSelected] = useState({
    batch_id: location.state?.batch_id || undefined as number | undefined,
    branch_id: location.state?.branch_id || undefined as number | undefined,
    semester_id: location.state?.semester_id || undefined as number | undefined,
    section_id: location.state?.section_id || undefined as number | undefined,
    subject_id: location.state?.subject_id || undefined as number | undefined,
    testType: location.state?.testType || undefined as string | undefined,
    setNumber: location.state?.setNumber || undefined as string | undefined
  });

  // start empty; populate only after Branch+Subject+TestType selection
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [currentQPMeta, setCurrentQPMeta] = useState<QPMetadata | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [drawingQuestionId, setDrawingQuestionId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [drawingSubmitting, setDrawingSubmitting] = useState(false);

  const [tabValue, setTabValue] = useState('questionFormat');
  const [qpId, setQpId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectedQPs, setRejectedQPs] = useState<QuestionPaper[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isTestTypeOpen, setIsTestTypeOpen] = useState(false);
  const [isSetNumberOpen, setIsSetNumberOpen] = useState(false);
  const { theme } = useTheme();

  const toggleExpanded = (key: string) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  };

  const buildQuestionRowsFromQP = (qp: QuestionPaper): QuestionRow[] => {
    const rows: QuestionRow[] = [];
    const questionsArray = qp.questions || qp.questions_data || [];
    questionsArray.forEach((q: QuestionData) => {
      const subpartsArray = q.subparts || q.subparts_data || [];
      subpartsArray.forEach((s: SubPart) => {
        const qnum = q.question_number || q.number;
        rows.push({
          id: `${qnum}${s.subpart_label}`,
          number: `${qnum}${s.subpart_label}`,
          content: s.content || '',
          maxMarks: String(s.max_marks || s.maxMarks || ''),
          co: q.co || '',
          bloomsLevel: q.blooms_level || q.bloomsLevel || ''
        });
      });
    });
    return rows;
  };

  const getDerivedIds = (assignForSubject: { branch_id?: number; semester_id?: number; section_id?: number; } | undefined) => ({
    branch: selected.branch_id || assignForSubject?.branch_id,
    semester: selected.semester_id || assignForSubject?.semester_id,
    section: selected.section_id || assignForSubject?.section_id
  });

  useEffect(() => {
    const branches = Array.from(new Map(assignments.map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])).values());
    const subjects = Array.from(new Map(assignments.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values());
    setDropdownData((prev) => ({ ...prev, branch: branches, subject: subjects }));
  }, [assignments]);

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

  // Load existing QP when Batch + Branch + Subject + Test Type are selected
  useEffect(() => {
    const loadIfReady = async () => {
      if (!selected.batch_id || !selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber) return;
      // default template to show when no saved QP exists
      const defaultTemplate: QuestionRow[] = [
        { id: '1a', number: '1a', content: 'Question 1a', maxMarks: '7', co: 'CO2', bloomsLevel: 'Apply' },
        { id: '1b', number: '1b', content: 'Question 1b', maxMarks: '7', co: 'CO2', bloomsLevel: 'Apply' },
        { id: '1c', number: '1c', content: 'Question 1c', maxMarks: '6', co: 'CO1', bloomsLevel: 'Remember' }];

      try {
        setLoading(true);
        const res = await getQuestionPapers({ batch_id: selected.batch_id?.toString(), branch_id: selected.branch_id?.toString(), semester_id: selected.semester_id?.toString(), section_id: selected.section_id?.toString(), subject_id: selected.subject_id?.toString(), test_type: selected.testType, set_number: selected.setNumber, detail: true });
        if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
          // prefer exact match on subject+test_type+set_number
          const qp = res.data.find((q: QuestionPaper) => q.subject === selected.subject_id && q.test_type === selected.testType && q.set_number === selected.setNumber);
          if (qp) {
            // build flat question rows from nested questions/subparts
            const rows = buildQuestionRowsFromQP(qp);
            if (rows.length) {
              setQuestions(rows);
              setQpId(qp.id);
              setCurrentQPMeta({ status: qp.status, last_action: qp.last_action });
            } else {
              setQuestions(defaultTemplate);
              setQpId(null);
              setCurrentQPMeta(null);
            }
          } else {
            // server returned QPs but none matched the requested test_type — treat as no saved QP
            setQuestions(defaultTemplate);
            setQpId(null);
          }
        } else {
          // no saved QP — use default template for this selection
          setQuestions(defaultTemplate);
          setQpId(null);
          setCurrentQPMeta(null);
        }
      } catch (err) {

      } finally {
        setLoading(false);
      }
    };
    loadIfReady();
  }, [selected.batch_id, selected.branch_id, selected.subject_id, selected.testType, selected.setNumber, selected.semester_id, selected.section_id]);

  // Load rejected QPs for this faculty to show editable items on the page
  useEffect(() => {
    const loadRejected = async () => {
      try {
        const res = await getQuestionPapers({});
        if (res?.success && Array.isArray(res?.data)) {
          const rejected = res.data.filter((q: QuestionPaper) => q.status === 'rejected');
          setRejectedQPs(rejected);
        }
      } catch (err) {

      }
    };
    loadRejected();
  }, []);

  useEffect(() => {

    // update total marks when questions change
  }, [questions]);
  const drawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const historyRef = useRef<string[]>([]);
  const historyStepRef = useRef(-1);

  const saveHistory = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    
    // Discard any redo states if we drew something new
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);
    nextHistory.push(dataUrl);
    
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;
  };

  // Initialize canvas with white background on open
  useEffect(() => {
    if (isDrawingOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      // Reset history and save initial blank white state
      historyRef.current = [];
      historyStepRef.current = -1;
      saveHistory();
    }
  }, [isDrawingOpen]);

  const getCoordinates = (e: any) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates in case canvas bounding box is resized
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    lastXRef.current = coords.x;
    lastYRef.current = coords.y;
    drawingRef.current = true;
  };

  const draw = (e: any) => {
    if (!drawingRef.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(coords.x, coords.y);
    
    ctx.strokeStyle = isEraser ? '#ffffff' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastXRef.current = coords.x;
    lastYRef.current = coords.y;
  };

  const stopDrawing = () => {
    if (drawingRef.current) {
      drawingRef.current = false;
      saveHistory();
    }
  };

  const handleUndo = () => {
    if (historyStepRef.current > 0 && canvasRef.current) {
      historyStepRef.current -= 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new window.Image();
        img.src = historyRef.current[historyStepRef.current];
        img.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const handleRedo = () => {
    if (historyStepRef.current < historyRef.current.length - 1 && canvasRef.current) {
      historyStepRef.current += 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new window.Image();
        img.src = historyRef.current[historyStepRef.current];
        img.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveHistory();
    }
  };

  const saveCanvasDrawing = async () => {
    if (!canvasRef.current || !drawingQuestionId) return;
    setDrawingSubmitting(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) {
        throw new Error("Failed to export canvas to Blob");
      }

      const filename = `drawing_${drawingQuestionId}_${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const fileUrl = await performR2Upload(file, 'question_papers');
      if (fileUrl) {
        const imageHtml = `<br/><img src="${fileUrl}" style="max-width: 100%; max-height: 250px; display: block; margin: 10px 0; border-radius: 6px; border: 1px solid #e2e8f0;" />`;
        const question = questions.find(q => q.id === drawingQuestionId);
        if (question) {
          updateQuestion(drawingQuestionId, 'content', question.content + imageHtml);
        }
        
        toast({
          title: "Drawing Saved",
          description: "Your drawing has been uploaded and inserted into the question content."
        });
        setIsDrawingOpen(false);
        setDrawingQuestionId(null);
      } else {
        toast({
          title: "Upload Failed",
          description: "Failed to upload drawing. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Drawing Error",
        description: err.message || "An error occurred while saving the drawing.",
        variant: "destructive"
      });
    } finally {
      setDrawingSubmitting(false);
    }
  };

  const addQuestion = () => {
    const nextId = `${Date.now()}`;
    setQuestions((prev) => [...prev, { id: nextId, number: `q${prev.length + 1}`, content: `Question ${prev.length + 1}`, maxMarks: '7', co: 'CO2', bloomsLevel: 'Apply' }]);
  };

  const removeQuestionById = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const removeQuestion = (id: string) => {
    const MySwal = withReactContent(Swal);
    const handleRemoveConfirmed = () => {
      removeQuestionById(id);
      MySwal.fire('Deleted!', 'Question has been deleted.', 'success');
    };
    MySwal.fire({
      title: 'Delete Question?',
      text: 'Are you sure you want to delete this question?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'hsl(var(--primary))',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        handleRemoveConfirmed();
      }
    });
  };

  const updateQuestion = (id: string, field: keyof QuestionRow, value: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, [field]: value } : q));
  };

  const totalMarks = questions.reduce((s, q) => s + (Number.parseInt(q.maxMarks || '0', 10) || 0), 0);

  const validateSelection = () => {
    if (!selected.batch_id || !selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber) {
      const MySwal = withReactContent(Swal);
      MySwal.fire('Validation Error', 'Please select batch, branch, subject, test type and set number', 'error');
      return false;
    }
    return true;
  };

  const buildPayload = (branch: number | undefined, semester: number | undefined, section: number | undefined) => {
    interface GroupedQuestion {
      co: string;
      blooms_level: string;
      subparts: Array<{ subpart_label: string; content: string; max_marks: number; }>;
    }
    const grouped: Record<string, GroupedQuestion> = {};
    questions.forEach((q) => {
      const main = q.number.charAt(0);
      if (!grouped[main]) grouped[main] = { co: q.co, blooms_level: q.bloomsLevel, subparts: [] };
      grouped[main].subparts.push({ subpart_label: q.number.slice(1), content: q.content, max_marks: Number.parseInt(q.maxMarks || '0', 10) });
    });
    return {
      subject: selected.subject_id,
      test_type: selected.testType,
      set_number: selected.setNumber as string,
      questions_data: Object.keys(grouped).map((k) => ({ question_number: k, co: grouped[k].co, blooms_level: grouped[k].blooms_level, subparts_data: grouped[k].subparts })),
      batch: selected.batch_id,
      branch,
      semester,
      section
    };
  };

  const validateDerivedIds = (branch: number | undefined, semester: number | undefined, section: number | undefined): branch is number => {
    return !!(branch && semester && section);
  };

  const findExistingQP = async (): Promise<QuestionPaper | null> => {
    try {
      const res = await getQuestionPapers({
        batch_id: selected.batch_id?.toString(),
        branch_id: selected.branch_id?.toString(),
        semester_id: selected.semester_id?.toString(),
        section_id: selected.section_id?.toString(),
        subject_id: selected.subject_id?.toString(),
        test_type: selected.testType,
        set_number: selected.setNumber,
        detail: false,
        mine_only: true
      });
      if (res?.success && Array.isArray(res.data)) {
        // Find exact match on Subject, Test Type, Set Number
        return res.data.find((q: QuestionPaper) =>
          q.subject === selected.subject_id &&
          q.test_type === selected.testType &&
          q.set_number === selected.setNumber &&
          q.semester === selected.semester_id &&
          q.section === selected.section_id
        ) || null;
      }
    } catch (err) {

    }
    return null;
  };

  const saveOrUpdateQP = async (payload: CreateQPPayload, existingId?: number) => {
    if (existingId) {
      const res = await updateQuestionPaper(existingId, payload);
      setQpId(existingId);
      return res;
    }
    const res = await createQuestionPaper(payload);
    if (res?.success && res?.data) setQpId(res.data.id);
    return res;
  };

  const saveFormat = async () => {
    if (!validateSelection()) return;

    const MySwal = withReactContent(Swal);
    const confirmResult = await MySwal.fire({
      title: 'Save Question Format?',
      text: 'This will save the question paper format. Do you want to continue?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: 'hsl(var(--primary))',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Save',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) return;

    const assignForSubject = assignments.find((a) => a.subject_id === selected.subject_id);
    const ids = getDerivedIds(assignForSubject);

    if (!validateDerivedIds(ids.branch, ids.semester, ids.section)) {
      alert('Please select or ensure assignment provides Branch, Semester and Section before saving the QP format.');
      return;
    }

    const payload = buildPayload(ids.branch, ids.semester, ids.section);

    try {
      // Prioritize local qpId if we already loaded one, otherwise double check with server
      let existingId = qpId;
      if (!existingId) {
        const existing = await findExistingQP();
        existingId = existing?.id || null;
      }

      const res = await saveOrUpdateQP(payload, existingId || undefined);

      if (res?.success) {
        // Update local ID and metadata after save
        if (res.data?.id) setQpId(res.data.id);
        if (res.data?.status) {
          setCurrentQPMeta({ status: res.data.status, last_action: res.data.last_action });
        }

        setTabValue('questionPaper');
        MySwal.fire('Success!', 'Question format saved successfully!', 'success');
      } else {
        const errorMsg = res?.message || 'Failed to save the format. Please try again.';
        MySwal.fire('Error', errorMsg, 'error');
      }
    } catch (err) {

      MySwal.fire('Network Error', 'Network error while saving. Please check your connection.', 'error');
    }
  };

  const downloadPDF = async () => {
    if (!qpId) {
      toast({
        title: "Error",
        description: "Question Paper is not saved or loaded yet.",
        variant: "destructive"
      });
      return;
    }
    setDownloadingPDF(true);
    try {
      const url = `${API_ENDPOINT}/admin/qps/${qpId}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF from backend");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Question_Paper_${qpId}.pdf`);
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

  const getButtonClassName = (): string => `text-sm ml-2 font-medium ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`;

  const getBadgeClassName = (): string => `${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'} border-0`;

  const getQuestionCardClassName = (): string => `border rounded-md p-3 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`;

  const groupQuestionsByMain = (): Record<string, QuestionRow[]> => {
    const grouped: Record<string, QuestionRow[]> = {};
    questions.forEach((q) => {
      const main = q.number.charAt(0);
      if (!grouped[main]) grouped[main] = [];
      grouped[main].push(q);
    });
    return grouped;
  };

  const getSubmitButtonLabel = (submitting: boolean, status: string | undefined) => {
    if (submitting) return 'Submitting...';
    if (status === 'approved') return 'Approved';
    if (status?.startsWith('pending')) return 'Submitted';
    return 'Submit for Approval';
  };

  const handleSubmitForApproval = async () => {
    if (!qpId) return;

    try {
      setSubmitting(true);
      const result = await submitQPForApproval(qpId);
      if (result.success) {
        // Show toast notification
        const toastMessage = result.message || 'QP submitted for approval successfully!';
        toast({
          title: 'Success',
          description: toastMessage
        });

        // optimistically set pending status so submit button disables immediately
        setCurrentQPMeta({ status: 'pending_hod', last_action: { actor: null, role: 'faculty', action: 'submitted', comment: '' } });
        // refresh metadata from server to reflect pending status
        try {
          const detail = await getQuestionPaperDetail(qpId);
          if (detail?.success && Array.isArray(detail?.data) && detail.data.length > 0) {
            const qp = detail.data[0];
            setCurrentQPMeta({ status: qp.status, last_action: qp.last_action });
          }
        } catch (err) {

        }
      } else {
        Swal.fire('Error', result.message || 'Failed to submit QP for approval', 'error');
      }
    } catch (error) {

      Swal.fire('Network error', 'Network error while submitting QP', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full overflow-hidden`}>
        <Tabs value={tabValue} onValueChange={(v) => setTabValue(v)}>
          <div id="upload-qp-header-section" className="border-b border-border/50 pb-4">
            <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b mb-3">
              <div className="flex-1 min-w-0">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Upload QP Pattern</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-0">
              <div id="upload-qp-selectors" className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <label htmlFor="batch-select" className="text-sm">Batch</label>
                  <Select value={selected.batch_id ? String(selected.batch_id) : undefined} onValueChange={(v) => {
                    const batchId = Number(v);
                    setSelected((s) => ({ ...s, batch_id: batchId }));
                    setTimeout(() => setIsSubjectOpen(true), 150);
                  }} open={isBatchOpen} onOpenChange={setIsBatchOpen}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {dropdownData.batch.length > 0 ? (
                        dropdownData.batch.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No batches found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="subject-select" className="text-sm">Subject</label>
                  <Select value={selected.subject_id ? String(selected.subject_id) : undefined} onValueChange={(v) => {
                    const subjIdNum = Number(v);
                    const filteredBySubject = assignments.filter((a) => a.subject_id === subjIdNum);
                    const branches = Array.from(new Map(filteredBySubject.filter((a) => a.branch_id).map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])).values());
                    const autoBranchId = branches.length === 1 ? branches[0].id : undefined;
                    setSelected((s) => ({ ...s, subject_id: subjIdNum, branch_id: autoBranchId }));
                    setDropdownData((prev) => ({ ...prev, branch: branches }));
                    if (autoBranchId) {
                      setTimeout(() => setIsTestTypeOpen(true), 150);
                    } else {
                      setTimeout(() => setIsBranchOpen(true), 150);
                    }
                  }} disabled={!selected.batch_id} open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                    <SelectTrigger className="w-full" disabled={!selected.batch_id}>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {dropdownData.subject.length > 0 ? (
                        dropdownData.subject.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No subject assigned
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="branch-select" className="text-sm">{translateTerminology("Branch")}</label>
                  <Select value={selected.branch_id ? String(selected.branch_id) : undefined} onValueChange={(v) => {
                    const branchId = Number(v);
                    setSelected((s) => ({ ...s, branch_id: branchId }));
                    setTimeout(() => setIsTestTypeOpen(true), 150);
                  }} disabled={!selected.subject_id} open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                    <SelectTrigger className="w-full" disabled={!selected.subject_id}>
                      <SelectValue placeholder={translateTerminology("Select Branch")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {dropdownData.branch.length > 0 ? (
                        dropdownData.branch.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No branch assigned
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="test-type-select" className="text-sm">Test Type</label>
                  <Select value={selected.testType} onValueChange={(v) => {
                    setSelected((s) => ({ ...s, testType: String(v) }));
                    setTimeout(() => setIsSetNumberOpen(true), 150);
                  }} disabled={!selected.branch_id} open={isTestTypeOpen} onOpenChange={setIsTestTypeOpen}>
                    <SelectTrigger className="w-full" disabled={!selected.branch_id}>
                      <SelectValue placeholder="Select Test Type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {dropdownData.testType.length > 0 ? (
                        dropdownData.testType.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No test type
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="set-number-select" className="text-sm">Set Number</label>
                  <Select value={selected.setNumber} onValueChange={(v) => setSelected((s) => ({ ...s, setNumber: String(v) }))} disabled={!selected.testType} open={isSetNumberOpen} onOpenChange={setIsSetNumberOpen}>
                    <SelectTrigger className="w-full" disabled={!selected.testType}>
                      <SelectValue placeholder="Select Set Number" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {dropdownData.setNumber.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="questionFormat">Question Format</TabsTrigger>
                <TabsTrigger value="questionPaper">Question Paper</TabsTrigger>
              </TabsList>
            </CardContent>
          </div>

          <CardContent className="pt-6">
            {rejectedQPs.length > 0 &&
              <div className="mb-4 space-y-2">
                <div className="font-semibold">Rejected Question Papers</div>
                <div className="grid grid-cols-1 gap-2">
                  {rejectedQPs.map((qp) =>
                    <div key={qp.id} className="p-3 border rounded flex justify-between items-start">
                      <div>
                        <div className="font-medium">{qp.subject_name || qp.subject} - {qp.test_type} {qp.set_number}</div>
                        <div className="text-sm text-muted-foreground">
                          Branch: {typeof qp.branch === 'object' ? qp.branch?.name || 'N/A' : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">Last: {qp.last_action?.action || 'reject'} by {qp.last_action?.actor || 'N/A'} ({qp.last_action?.role || 'N/A'})</div>
                        <div className="text-sm text-muted-foreground">Comment: {qp.last_action?.comment || 'No comment provided'}</div>
                      </div>
                      <div>
                        <Button onClick={() => {
                          // preselect and open question format tab for editing
                          setSelected((s) => ({
                            ...s,
                            branch_id: typeof qp.branch === 'object' ? qp.branch?.id : qp.branch,
                            subject_id: qp.subject,
                            testType: qp.test_type,
                            setNumber: qp.set_number
                          }));
                          setTabValue('questionFormat');
                          // ensure QP id is set so save/update operates on this qp
                          setQpId(qp.id);
                        }}>Edit</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            }
            {currentQPMeta?.status === 'rejected' &&
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <div className="font-semibold text-sm text-red-700">Rejected</div>
                <div className="text-sm text-muted-foreground">{currentQPMeta.last_action?.comment || 'No comment provided'}</div>
              </div>
            }

            <TabsContent value="questionFormat" className="w-full max-w-full overflow-hidden mt-0">
              <div className="space-y-2 w-full max-w-full">
                {loading ?
                  <div className="py-4">
                    <SkeletonList items={3} />
                  </div> :
                  !selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber ?
                    <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-2 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                      <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                        <Layers className="w-12 h-12 opacity-80" />
                      </div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selection Required</h3>
                      <p className="max-w-xs text-base leading-relaxed">
                        Please select Batch, Subject, Branch, Test Type, and Set Number to load or create a question paper.
                      </p>
                    </div> :

                    <>
                      {(() => {
                        const isLocked = currentQPMeta?.status && !['draft', 'rejected'].includes(currentQPMeta.status);
                        return (
                          <>
                            {isLocked && (
                              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                                <div className="font-semibold text-sm text-blue-700 dark:text-blue-400">Locked</div>
                                <div className="text-sm text-muted-foreground">This question paper has been submitted for approval and cannot be edited.</div>
                              </div>
                            )}
                            <div id="upload-qp-table" className="overflow-x-auto border rounded-lg mt-2 custom-scrollbar">
                              <Table>
                                <TableHeader className={theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}>
                                  <TableRow>
                                    <TableHead className="text-sm font-semibold whitespace-nowrap w-[80px] min-w-[80px]">Q No.</TableHead>
                                    <TableHead className="text-sm font-semibold whitespace-nowrap min-w-[280px]">Question Content</TableHead>
                                    <TableHead className="text-sm font-semibold whitespace-nowrap w-[80px] min-w-[80px]">Marks</TableHead>
                                    <TableHead className="text-sm font-semibold whitespace-nowrap w-[100px] min-w-[100px]">CO</TableHead>
                                    <TableHead className="text-sm font-semibold whitespace-nowrap w-[160px] min-w-[160px]">Blooms Level</TableHead>
                                    {!isLocked && <TableHead className="text-sm font-semibold text-right whitespace-nowrap w-[80px]">Action</TableHead>}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {questions.map((q) =>
                                    <TableRow key={q.id} className={theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50/50'}>
                                      <TableCell className="p-1 sm:p-2 whitespace-nowrap">
                                        <Input value={q.number} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'number', e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm w-full text-center focus-visible:ring-1 px-1 sm:px-3" />
                                      </TableCell>
                                      <TableCell className="p-1 sm:p-2 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Input value={q.content} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'content', e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm w-full focus-visible:ring-1 px-1 sm:px-3" />
                                          {!isLocked && (
                                            <div className="relative">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={uploadingId !== null}
                                                className="h-8 w-8 p-0 hover:bg-muted"
                                                onClick={() => {
                                                   const MySwal = withReactContent(Swal);
                                                   MySwal.fire({
                                                     title: 'Add Diagram / Image',
                                                     text: 'Select how you want to add a diagram/image to this question',
                                                     icon: 'question',
                                                     showCancelButton: true,
                                                     showDenyButton: true,
                                                     confirmButtonColor: 'hsl(var(--primary))',
                                                     denyButtonColor: '#0ea5e9',
                                                     cancelButtonColor: '#6c757d',
                                                     confirmButtonText: 'Upload Local Image',
                                                     denyButtonText: 'Draw Diagram',
                                                     cancelButtonText: 'Cancel'
                                                   }).then((result) => {
                                                     if (result.isConfirmed) {
                                                       const fileInput = document.getElementById(`diagram-upload-${q.id}`);
                                                       if (fileInput) (fileInput as HTMLInputElement).click();
                                                     } else if (result.isDenied) {
                                                       setDrawingQuestionId(q.id);
                                                       setIsDrawingOpen(true);
                                                     }
                                                   });
                                                 }}
                                              >
                                                {uploadingId === q.id ? (
                                                  <Loader2 size={16} className="animate-spin text-primary" />
                                                ) : (
                                                  <Image size={16} className="text-muted-foreground hover:text-primary" />
                                                )}
                                              </Button>
                                              <input
                                                id={`diagram-upload-${q.id}`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  if (!file) return;
                                                  if (!file.type.startsWith('image/')) {
                                                    toast({
                                                      title: "Invalid File Type",
                                                      description: "Only image files are allowed. Please select an image (PNG, JPG, etc.).",
                                                      variant: "destructive"
                                                    });
                                                    e.target.value = '';
                                                    return;
                                                  }
                                                  if (file.size > 2 * 1024 * 1024) {
                                                    toast({
                                                      title: "File Too Large",
                                                      description: "The selected image must be less than 2MB in size.",
                                                      variant: "destructive"
                                                    });
                                                    e.target.value = '';
                                                    return;
                                                  }
                                                  setUploadingId(q.id);
                                                  try {
                                                    const fileUrl = await performR2Upload(file, 'question_papers');
                                                    if (fileUrl) {
                                                      const imageHtml = `<br/><img src="${fileUrl}" style="max-width: 100%; max-height: 250px; display: block; margin: 10px 0; border-radius: 6px; border: 1px solid #e2e8f0;" />`;
                                                      updateQuestion(q.id, 'content', q.content + imageHtml);
                                                      toast({
                                                        title: "Diagram Uploaded",
                                                        description: "Diagram has been uploaded and inserted into the question content."
                                                      });
                                                    } else {
                                                      toast({
                                                        title: "Upload Failed",
                                                        description: "Failed to upload diagram. Please try again.",
                                                        variant: "destructive"
                                                      });
                                                    }
                                                  } catch (err) {
                                                    toast({
                                                      title: "Upload Error",
                                                      description: "An error occurred during upload.",
                                                      variant: "destructive"
                                                    });
                                                  } finally {
                                                    setUploadingId(null);
                                                    e.target.value = '';
                                                  }
                                                }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-1 sm:p-2 whitespace-nowrap">
                                        <Input value={q.maxMarks} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'maxMarks', e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm w-full text-center focus-visible:ring-1 px-1 sm:px-3" />
                                      </TableCell>
                                      <TableCell className="p-1 sm:p-2 whitespace-nowrap">
                                        <Input value={q.co} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'co', e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm w-full text-center focus-visible:ring-1 px-1 sm:px-3" />
                                      </TableCell>
                                      <TableCell className="p-1 sm:p-2 whitespace-nowrap">
                                        <Input value={q.bloomsLevel} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'bloomsLevel', e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm w-full text-center focus-visible:ring-1 px-1 sm:px-3" />
                                      </TableCell>
                                      {!isLocked && (
                                        <TableCell className="p-1 sm:p-2 text-right whitespace-nowrap">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeQuestion(q.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 sm:h-9 w-8 sm:w-9 p-0">
                                            <Trash2 size={14} className="sm:size-4" />
                                          </Button>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                            {!isLocked && (
                              <div className="flex flex-row justify-between items-center gap-3 mt-6 w-full">
                                <Button
                                  onClick={addQuestion}
                                  disabled={!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber}
                                  className="bg-primary text-white hover:bg-primary/90 transition-all duration-200 flex-1 sm:flex-none sm:w-auto text-[15px] sm:text-sm px-2 py-1.5 h-8 sm:h-10 sm:px-4 sm:py-2">
                                  <Plus size={12} className="mr-1 sm:mr-2" /> Add Question
                                </Button>
                                <Button
                                  onClick={saveFormat}
                                  disabled={!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber}
                                  className="bg-primary text-white hover:bg-primary/90 transition-all duration-200 flex-1 sm:flex-none sm:w-auto text-[15px] sm:text-sm px-2 py-1.5 h-8 sm:h-10 sm:px-4 sm:py-2">
                                  Save Format
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                }
              </div>
            </TabsContent>
            <TabsContent value="questionPaper" className="w-full max-w-full overflow-hidden mt-0">
              {!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber ?
                <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-2 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Layers className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selection Required</h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    Please select Batch, Subject, Branch, Test Type, and Set Number to preview the question paper.
                  </p>
                </div> :

                <div className="mb-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                      <h3 className="font-semibold text-lg">Question Paper Preview</h3>
                      {/* Mobile Download PDF Icon Button */}
                      <Button
                        onClick={downloadPDF}
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
                        onClick={downloadPDF}
                        disabled={downloadingPDF}
                        className="hidden sm:flex w-full sm:w-auto bg-primary text-white hover:bg-primary/90 transition-all duration-200 items-center justify-center gap-2">
                        {downloadingPDF ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        {downloadingPDF ? "Downloading..." : "Download PDF"}
                      </Button>
                      {qpId ?
                        (() => {
                          const status = currentQPMeta?.status;
                          const isPendingOrApproved = status && (status.startsWith('pending') || status === 'approved');
                          const buttonLabel = getSubmitButtonLabel(submitting, status);
                          return (
                            <Button
                              onClick={handleSubmitForApproval}
                              className="w-full sm:w-auto bg-green-600 text-white hover:bg-green-700"
                              disabled={isPendingOrApproved || submitting}>
                              {buttonLabel}
                            </Button>);
                        })() :
                        null}
                    </div>
                  </div>

                  {currentQPMeta?.status &&
                    <div className={`p-3 rounded-lg border ${currentQPMeta.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
                      <div className={`font-semibold text-sm ${currentQPMeta.status === 'rejected' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                        Status: {(() => {
                          const s = currentQPMeta.status;
                          if (s === 'rejected') return 'Rejected';
                          if (s === 'approved') return 'Approved';
                          if (s.startsWith('pending')) return 'Pending';
                          return s;
                        })()}
                      </div>
                      {currentQPMeta.last_action &&
                        <div className={`text-xs mt-1 ${currentQPMeta.status === 'rejected' ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'}`}>
                          <div>Last: {currentQPMeta.last_action?.action || 'N/A'} by {currentQPMeta.last_action?.actor || 'N/A'} ({currentQPMeta.last_action?.role || 'N/A'})</div>
                          {currentQPMeta.last_action?.comment && <div>Comment: {currentQPMeta.last_action.comment}</div>}
                        </div>
                      }
                    </div>
                  }
                  <div className={`border-0 sm:border rounded-none sm:rounded-lg ${theme === 'dark' ? 'bg-transparent sm:bg-gray-800 border-border' : 'bg-transparent sm:bg-gray-50 border-gray-200'}`}>
                    <div className="space-y-3 p-0 sm:p-4">
                      {loading ?
                        <SkeletonList items={4} /> :
                        Object.keys(groupQuestionsByMain()).map((mainQ) => {
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
                            </div>);
                        })}
                      <div className={`font-semibold pt-2 border-t ${theme === 'dark' ? 'border-gray-700 text-foreground' : 'border-gray-200 text-gray-900'}`}>
                        Total Marks: {totalMarks}
                      </div>
                    </div>
                  </div>
                </div>
              }
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={isDrawingOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDrawingOpen(false);
          setDrawingQuestionId(null);
        }
      }}>
        <DialogContent 
          onInteractOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={`max-w-2xl ${theme === 'dark' ? 'bg-card text-foreground border-gray-700' : 'bg-white text-gray-900'}`}
        >
          <DialogHeader>
            <DialogTitle>Draw Diagram</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 items-center">
            {/* Control Panel */}
            <div className="flex flex-wrap items-center gap-4 justify-between w-full p-2 border rounded-md">
              <div className="flex items-center gap-2">
                <Button 
                  variant={isEraser ? "outline" : "default"}
                  size="sm"
                  onClick={() => setIsEraser(false)}
                  className="flex items-center gap-1"
                >
                  Pen
                </Button>
                <Button
                  variant={isEraser ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEraser(true)}
                  className="flex items-center gap-1"
                >
                  <Eraser size={14} /> Eraser
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">Color:</span>
                <input 
                  type="color" 
                  value={brushColor} 
                  onChange={(e) => setBrushColor(e.target.value)} 
                  disabled={isEraser}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                <span className="text-xs whitespace-nowrap">Size: {brushSize}px</span>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  title="Undo"
                  className="h-8 w-8 p-0"
                >
                  <Undo size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  title="Redo"
                  className="h-8 w-8 p-0"
                >
                  <Redo size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  title="Clear Canvas"
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                >
                  <RotateCcw size={14} /> Clear
                </Button>
              </div>
            </div>

            {/* Drawing Area */}
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden w-full max-w-[600px] h-[400px]">
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                className="absolute inset-0 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            {/* Save / Close Actions */}
            <div className="flex justify-end gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDrawingOpen(false);
                  setDrawingQuestionId(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveCanvasDrawing} 
                disabled={drawingSubmitting}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {drawingSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Save & Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

};

export default UploadQP;