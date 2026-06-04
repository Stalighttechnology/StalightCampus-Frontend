import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Trash2, Layers, Loader2, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useFacultyAssignmentsQuery } from "../../hooks/useApiQueries";
import { createQuestionPaper, updateQuestionPaper, getQuestionPapers, submitQPForApproval, getQuestionPaperDetail } from "../../utils/faculty_api";
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
  last_action?: {actor?: string;role: string;action: string;comment: string;};
}

interface QuestionPaper {
  id: number;
  status: string;
  subject: number;
  subject_name?: string;
  test_type: string;
  set_number?: string;
  branch?: {id: number;name: string;} | number;
  semester?: number;
  section?: number;
  last_action?: {actor?: string;role: string;action: string;comment: string;};
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
    subparts_data: Array<{subpart_label: string;content: string;max_marks: number;}>;
  }>;
  branch: number;
  semester: number;
  section: number;
}

const UploadQP = () => {
  const location = useLocation();
  const { data: assignments = [] } = useFacultyAssignmentsQuery();
  const { toast } = useToast();
  const [dropdownData, setDropdownData] = useState({
    branch: [] as {id: number;name: string;}[],
    semester: [] as {id: number;number: number;}[],
    section: [] as {id: number;name: string;}[],
    subject: [] as {id: number;name: string;}[],
    testType: ["IA1", "IA2", "IA3", "IA4", "IA5", "SEE"],
    setNumber: ["Set 1", "Set 2"]
  });

  const [selected, setSelected] = useState({
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

  const [tabValue, setTabValue] = useState('questionFormat');
  const [qpId, setQpId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectedQPs, setRejectedQPs] = useState<QuestionPaper[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  const getDerivedIds = (assignForSubject: {branch_id?: number;semester_id?: number;section_id?: number;} | undefined) => ({
    branch: selected.branch_id || assignForSubject?.branch_id,
    semester: selected.semester_id || assignForSubject?.semester_id,
    section: selected.section_id || assignForSubject?.section_id
  });

  useEffect(() => {
    const branches = Array.from(new Map(assignments.map((a) => [a.branch_id, { id: a.branch_id, name: a.branch }])).values());
    const subjects = Array.from(new Map(assignments.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values());
    setDropdownData((prev) => ({ ...prev, branch: branches, subject: subjects }));
  }, [assignments]);

  // Load existing QP when Branch + Subject + Test Type are selected
  useEffect(() => {
    const loadIfReady = async () => {
      if (!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber) return;
      // default template to show when no saved QP exists
      const defaultTemplate: QuestionRow[] = [
      { id: '1a', number: '1a', content: 'Question 1a', maxMarks: '7', co: 'CO2', bloomsLevel: 'Apply' },
      { id: '1b', number: '1b', content: 'Question 1b', maxMarks: '7', co: 'CO2', bloomsLevel: 'Apply' },
      { id: '1c', number: '1c', content: 'Question 1c', maxMarks: '6', co: 'CO1', bloomsLevel: 'Remember' }];

      try {
        setLoading(true);
        const res = await getQuestionPapers({ branch_id: selected.branch_id?.toString(), semester_id: selected.semester_id?.toString(), section_id: selected.section_id?.toString(), subject_id: selected.subject_id?.toString(), test_type: selected.testType, set_number: selected.setNumber, detail: true });
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
  }, [selected.branch_id, selected.subject_id, selected.testType, selected.setNumber, selected.semester_id, selected.section_id]);

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
    if (!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber) {
      const MySwal = withReactContent(Swal);
      MySwal.fire('Validation Error', 'Please select branch, subject, test type and set number', 'error');
      return false;
    }
    return true;
  };

  const buildPayload = (branch: number | undefined, semester: number | undefined, section: number | undefined) => {
    interface GroupedQuestion {
      co: string;
      blooms_level: string;
      subparts: Array<{subpart_label: string;content: string;max_marks: number;}>;
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
    <div>
      <Card className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}>
        <Tabs value={tabValue} onValueChange={(v) => setTabValue(v)}>
          <div id="upload-qp-header-section" className="border-b border-border/50 pb-4">
            <CardHeader>
              <CardTitle>Upload QP Pattern</CardTitle>
            </CardHeader>
            <CardContent className="pb-0">
              <div id="upload-qp-selectors" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label htmlFor="branch-select" className="text-sm">Branch</label>
                  <Select value={selected.branch_id ? String(selected.branch_id) : undefined} onValueChange={(v) => {
                    const branchId = Number(v);
                    // Auto-select first subject for this branch
                    const subjectsForBranch = assignments.filter((a) => a.branch_id === branchId);
                    const firstSubject = subjectsForBranch.length > 0 ? subjectsForBranch[0].subject_id : undefined;
                    setSelected((s) => ({ ...s, branch_id: branchId, subject_id: firstSubject }));
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Branch" />
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
                  <label htmlFor="subject-select" className="text-sm">Subject</label>
                  <Select value={selected.subject_id ? String(selected.subject_id) : undefined} onValueChange={(v) => {
                    setSelected((s) => ({ ...s, subject_id: Number(v) }));
                  }} disabled={!selected.branch_id} open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                    <SelectTrigger className="w-full" disabled={!selected.branch_id}>
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
                  <label htmlFor="test-type-select" className="text-sm">Test Type</label>
                  <Select value={selected.testType} onValueChange={(v) => setSelected((s) => ({ ...s, testType: String(v) }))} disabled={!selected.subject_id} open={isTestTypeOpen} onOpenChange={setIsTestTypeOpen}>
                    <SelectTrigger className="w-full" disabled={!selected.subject_id}>
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

            <TabsContent value="questionFormat">
              <div className="space-y-2">
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
                        Please select Branch, Subject, Test Type, and Set Number to load or create a question paper.
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
                                      <TableCell className="p-2 whitespace-nowrap">
                                        <Input value={q.number} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'number', e.target.value)} className="h-9 w-full text-center focus-visible:ring-1" />
                                      </TableCell>
                                      <TableCell className="p-2 whitespace-nowrap">
                                        <Input value={q.content} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'content', e.target.value)} className="h-9 w-full focus-visible:ring-1" />
                                      </TableCell>
                                      <TableCell className="p-2 whitespace-nowrap">
                                        <Input value={q.maxMarks} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'maxMarks', e.target.value)} className="h-9 w-full text-center focus-visible:ring-1" />
                                      </TableCell>
                                      <TableCell className="p-2 whitespace-nowrap">
                                        <Input value={q.co} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'co', e.target.value)} className="h-9 w-full text-center focus-visible:ring-1" />
                                      </TableCell>
                                      <TableCell className="p-2 whitespace-nowrap">
                                        <Input value={q.bloomsLevel} disabled={isLocked} onChange={(e) => updateQuestion(q.id, 'bloomsLevel', e.target.value)} className="h-9 w-full text-center focus-visible:ring-1" />
                                      </TableCell>
                                      {!isLocked && (
                                        <TableCell className="p-2 text-right whitespace-nowrap">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeQuestion(q.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-9 w-9 p-0">
                                            <Trash2 size={16} />
                                          </Button>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                            {!isLocked && (
                              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                <Button
                                  onClick={addQuestion}
                                  disabled={!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber}
                                  className="bg-primary text-white hover:bg-primary/90 transition-all duration-200">
                                  <Plus size={14} className="mr-2" /> Add Question
                                </Button>
                                <Button
                                  onClick={saveFormat}
                                  disabled={!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber}
                                  className="bg-primary text-white hover:bg-primary/90 transition-all duration-200">
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
            <TabsContent value="questionPaper">
              {!selected.branch_id || !selected.subject_id || !selected.testType || !selected.setNumber ?
                <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 mt-2 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                  <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Layers className="w-12 h-12 opacity-80" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selection Required</h3>
                  <p className="max-w-xs text-base leading-relaxed">
                    Please select Branch, Subject, Test Type, and Set Number to preview the question paper.
                  </p>
                </div> :

                <div className="mb-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-semibold text-lg">Question Paper Preview</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        onClick={downloadPDF}
                        disabled={downloadingPDF}
                        className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 transition-all duration-200 flex items-center gap-2">
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
                  <div className={`border rounded-lg ${theme === 'dark' ? 'bg-gray-800 border-border' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="space-y-4 p-4">
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
                                  <div key={s.id} className={getQuestionCardClassName()}>
                                    <div className="flex items-start gap-3">
                                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center font-medium text-sm`}>
                                        {s.number}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex justify-between items-start gap-4">
                                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'} mb-1 flex-1`}>
                                            {isExpanded ? s.content : shortContent}
                                          </div>
                                          <div className="ml-2 flex-shrink-0">
                                            <Badge className={`font-semibold text-sm ${getBadgeClassName()}`}>{s.maxMarks}m</Badge>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
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
                                  </div>);
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
    </div>
  );

};

export default UploadQP;