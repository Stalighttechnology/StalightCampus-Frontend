import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Download, ClipboardCheck, Loader2 } from "lucide-react";
import { SkeletonTable } from "../ui/skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { API_ENDPOINT } from "../../utils/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { sanitizeHtml } from "../../utils/sanitize";
import QPWorkflowStepper from "../common/QPWorkflowStepper";

const getOrgLogoUrl = (extraLogo?: string | null): string => {
  let logo = '';
  try {
    if (extraLogo && typeof extraLogo === 'string' && extraLogo.trim() && extraLogo !== 'null' && extraLogo !== 'undefined') {
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

const formatCO = (co: any) => {
  if (!co) return '--';
  const str = String(co).trim();
  if (!str) return '--';
  const items = str.split(',').map(s => s.trim()).filter(Boolean);
  return items.map(item => item.toUpperCase().startsWith('CO') ? item.toUpperCase() : `CO${item}`).join(', ');
};

const formatBloomsList = (bloomsLevel: any): string[] => {
  if (!bloomsLevel) return [];
  if (Array.isArray(bloomsLevel)) return bloomsLevel.map(s => String(s).trim()).filter(Boolean);
  return String(bloomsLevel).split(',').map(s => s.trim()).filter(Boolean);
};

interface FlatQuestion {
  id: string | number;
  number: string;
  content: string;
  maxMarks: number | string;
  bloomsLevel: string | string[];
  co: string;
  isOr: boolean;
  partName: string;
}

const getFlattenedQuestions = (qp: any): FlatQuestion[] => {
  if (!qp || !qp.questions) return [];
  const list: FlatQuestion[] = [];

  qp.questions.forEach((q: any, qIdx: number) => {
    const partName = q.part_name || q.partName || 'PART-A';
    const isOr = Boolean(q.is_or || q.isOr);
    const co = q.co || '';
    const bloomsLevel = q.blooms_level || q.bloomsLevel || '';
    const qNum = String(q.question_number || q.questionNumber || (qIdx + 1));

    if (Array.isArray(q.subparts) && q.subparts.length > 0) {
      q.subparts.forEach((s: any, sIdx: number) => {
        const rawLabel = (s.subpart_label || s.label || '').replace(/[()]/g, '').trim();
        const displayNum = `${qNum}${rawLabel}`;
        list.push({
          id: `${qIdx}-${sIdx}`,
          number: displayNum,
          content: s.content || '',
          maxMarks: s.max_marks || s.maxMarks || 0,
          bloomsLevel,
          co,
          isOr: isOr && sIdx === 0,
          partName,
        });
      });
    } else {
      list.push({
        id: `${qIdx}`,
        number: qNum,
        content: q.content || '',
        maxMarks: q.max_marks || q.maxMarks || 0,
        bloomsLevel,
        co,
        isOr,
        partName,
      });
    }
  });

  return list;
};

const groupFlatQuestionsByPart = (flatQuestions: FlatQuestion[]) => {
  const partsMap = new Map<string, FlatQuestion[]>();
  flatQuestions.forEach((q) => {
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

const calculateFlatTotalMarks = (flatQuestions: FlatQuestion[]) => {
  if (!flatQuestions || flatQuestions.length === 0) return 0;

  const mainQuestions: Array<{ partName: string; mainNum: string; maxMarks: number; isOr: boolean }> = [];
  const seenMap = new Map<string, { partName: string; mainNum: string; maxMarks: number; isOr: boolean }>();

  flatQuestions.forEach((q, idx) => {
    const partName = q.partName || 'PART-A';
    const isOr = Boolean(q.isOr);
    const rawNum = String(q.number || (idx + 1));
    const cleanNum = rawNum.replace(/^[Qq]\.?\s*/, '').trim();
    const match = cleanNum.match(/^(\d+)/);
    const mainNum = match ? match[1] : (cleanNum || String(idx + 1));
    const marks = parseFloat(String(q.maxMarks) || '0') || 0;

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

interface QPPending {
  id: number;
  subject: string;
  subject_code?: string;
  test_type: string;
  set_number?: string;
  faculty: string;
  submitted_at: string;
  exam_date?: string;
  exam_time?: string;
  branch?: any;
  semester?: any;
  section?: any;
  status?: string;
  current_holder?: string | null;
  last_action?: { actor?: string; role?: string; action?: string; comment?: string; timestamp?: string; } | null;
}

interface QPDetail {
  id: number;
  subject: string;
  subject_code?: string;
  test_type: string;
  set_number?: string;
  faculty: string;
  exam_date?: string;
  exam_time?: string;
  branch?: any;
  semester?: any;
  section?: any;
  questions: Array<any>;
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from
  "../ui/dialog";

const QPApprovals = () => {
  const [pendingQPs, setPendingQPs] = useState<QPPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQP, setSelectedQP] = useState<QPPending | null>(null);
  const [qpDetail, setQpDetail] = useState<QPDetail | null>(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const MySwal = withReactContent(Swal);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [historyQPs, setHistoryQPs] = useState<QPPending[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [approvalChain, setApprovalChain] = useState<string[]>(['hod', 'principal', 'coe']);

  useEffect(() => {
    const fetchApprovalChain = async () => {
      try {
        const response = await fetch(`${API_ENDPOINT}/organizations/qp-approval-chain/`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.qp_approval_chain) {
            setApprovalChain(data.qp_approval_chain);
          }
        }
      } catch (err) {}
    };
    fetchApprovalChain();
  }, []);

  const toggleExpanded = (key: string) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    const base = "w-full flex items-center justify-center text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-200";
    if (s.includes('approve') || s.includes('finalized') || s.includes('pass')) {
      return `${base} bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50`;
    }
    if (s.includes('reject') || s.includes('fail') || s.includes('expire')) {
      return `${base} bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50`;
    }
    return `${base} bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50`;
  };

  // Ensure SweetAlert appears above the dialog and is interactive
  useEffect(() => {
    try {
      const styleId = 'swal2-global-fix';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .swal2-container, .swal2-popup {
            z-index: 99999 !important;
            pointer-events: auto !important;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {

      // ignore when DOM not available
    }
  }, []);

  useEffect(() => {
    fetchPendingQPs(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryQPs(historyPage);
    }
  }, [historyPage, activeTab]);

  const fetchPendingQPs = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/hod-pending/?page=${page}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      const responseData = await response.json();

      const hasResults = responseData && typeof responseData === 'object' && 'results' in responseData;
      const dataSource = hasResults ? responseData.results : Array.isArray(responseData.data) ? responseData.data : [];

      setPendingQPs(dataSource);

      if (hasResults && responseData.count) {
        setTotalPages(responseData.total_pages || Math.ceil(responseData.count / 10));
        setTotalCount(responseData.count);
      } else {
        setTotalPages(1);
        setTotalCount(dataSource.length);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryQPs = async (page: number = 1) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/hod-history/?page=${page}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      const responseData = await response.json();

      const hasResults = responseData && typeof responseData === 'object' && 'results' in responseData;
      const dataSource = hasResults ? responseData.results : Array.isArray(responseData.data) ? responseData.data : [];

      setHistoryQPs(dataSource);

      if (hasResults && responseData.count) {
        setHistoryTotalPages(responseData.total_pages || Math.ceil(responseData.count / 10));
        setHistoryTotalCount(responseData.count);
      } else {
        setHistoryTotalPages(1);
        setHistoryTotalCount(dataSource.length);
      }
    } catch (error) {

    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchQPDetail = async (qpId: number) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-detail/`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const qp = data.data[0];
        // Transform the data to match our interface
        const transformedQP: QPDetail = {
          id: qp.id,
          subject: qp.subject,
          subject_code: qp.subject_code,
          test_type: qp.test_type,
          set_number: qp.set_number,
          faculty: qp.faculty,
          exam_date: qp.exam_date,
          exam_time: qp.exam_time,
          branch: qp.branch,
          semester: qp.semester,
          section: qp.section,
          questions: qp.questions || []
        };
        setQpDetail(transformedQP);
      }
    } catch (error) {

    } finally {
      setDetailLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!qpDetail) return;
    setDownloadingPDF(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpDetail.id}/export-pdf/`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `QP_${qpDetail.id}_${(qpDetail.test_type || 'test').replace(/\s+/g, '_')}_${(qpDetail.set_number || '').replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        toast({ title: 'Error', description: result.message || 'Failed to download question paper PDF.' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error while exporting PDF.' });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleReview = (qp: QPPending, isHistory: boolean = false) => {
    setSelectedQP(qp);
    setQpDetail(null);
    setIsHistoryView(isHistory);
    setDialogOpen(true);
    fetchQPDetail(qp.id);
  };

  const getNextRole = (currentRole: string = 'hod') => {
    const idx = approvalChain.indexOf(currentRole);
    if (idx !== -1 && idx + 1 < approvalChain.length) {
      const next = approvalChain[idx + 1];
      if (next === 'hod') return translateTerminology('HOD') || 'Head of Branch';
      if (next === 'coe') return 'COE';
      if (next === 'principal') return 'Principal';
      if (next === 'dean') return 'Dean';
      return next.charAt(0).toUpperCase() + next.slice(1);
    }
    return null;
  };

  const getPrevRole = (currentRole: string = 'hod') => {
    const idx = approvalChain.indexOf(currentRole);
    if (idx > 0) {
      const prev = approvalChain[idx - 1];
      if (prev === 'hod') return translateTerminology('HOD') || 'Head of Branch';
      if (prev === 'coe') return 'COE';
      if (prev === 'principal') return 'Principal';
      if (prev === 'dean') return 'Dean';
      return prev.charAt(0).toUpperCase() + prev.slice(1);
    }
    return 'Faculty';
  };

  const handleApprove = async (qpId: number) => {
    const nextRole = getNextRole('hod');
    const isLastRole = !nextRole;
    const textMsg = !isLastRole 
      ? `Are you sure you want to approve and forward this question paper to ${nextRole}?`
      : 'Are you sure you want to finalize and approve this question paper?';

    const result = await MySwal.fire({
      title: isLastRole ? 'Confirm Final Approval' : 'Confirm Approval',
      text: textMsg,
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonText: isLastRole ? 'Yes, Finalize & Approve' : 'Yes, Approve & Forward',
      cancelButtonText: 'Cancel',
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      target: document.body
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try { MySwal.close(); } catch (e) { }
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-approve/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ comment })
      });
      const data = await response.json();
      if (data.success) {
        try { MySwal.close(); } catch (e) { }
        const t = toast({
          title: isLastRole ? 'Finalized & Approved' : 'Approved',
          description: data.message || (isLastRole ? 'Question paper finalized and approved.' : `QP approved and forwarded to ${nextRole}.`)
        });
        setTimeout(() => t.dismiss(), 3000);
        fetchPendingQPs(currentPage);
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        setDialogOpen(false);
      } else {
        MySwal.fire('Error', data.message || 'Failed to approve QP.', 'error');
      }
    } catch (error) {

      toast({ title: 'Network error', description: 'Network error while approving QP.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (qpId: number) => {
    const prevRoleName = getPrevRole('hod');
    const result = await MySwal.fire({
      title: 'Confirm Rejection',
      text: `Are you sure you want to reject this question paper and send it back to ${prevRoleName}?`,
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      confirmButtonText: 'Yes, Reject & Send Back',
      cancelButtonText: 'Cancel',
      target: document.body
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try { MySwal.close(); } catch (e) { }
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-reject/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ comment })
      });
      const data = await response.json();
      if (data.success) {
        try { MySwal.close(); } catch (e) { }
        const t = toast({
          title: 'Rejected & Sent Back',
          description: data.message || `QP rejected and sent back to ${prevRoleName} for edits.`
        });
        setTimeout(() => t.dismiss(), 3000);
        fetchPendingQPs(currentPage);
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        setDialogOpen(false);
      } else {
        MySwal.fire('Error', data.message || 'Failed to reject QP.', 'error');
      }
    } catch (error) {

      toast({ title: 'Network error', description: 'Network error while rejecting QP.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && pendingQPs.length === 0) {
    return (
      <Card className="p-6">
        <SkeletonTable rows={5} cols={4} />
      </Card>);

  }

  const formatActionText = (lastAction: any, qpStatus?: string) => {
    if (!lastAction) return null;
    const action = (lastAction.action || '').toLowerCase();
    const actor = lastAction.actor || 'Unknown';
    const rawRole = (lastAction.role || '').toLowerCase();
    let roleDisplay = rawRole.toUpperCase();
    if (rawRole === 'hod') {
      roleDisplay = translateTerminology('HOD') || 'Head of Branch';
    } else if (rawRole === 'principal' || rawRole === 'admin') {
      roleDisplay = 'Principal';
    } else if (rawRole === 'coe') {
      roleDisplay = 'Chief Examiner (COE)';
    } else if (rawRole === 'dean') {
      roleDisplay = 'Dean';
    } else if (rawRole === 'teacher' || rawRole === 'faculty') {
      roleDisplay = 'Faculty';
    }
    const dateStr = lastAction.timestamp ? ` on ${new Date(lastAction.timestamp).toLocaleDateString()}` : '';

    if (action === 'finalize' || (action === 'approve' && qpStatus === 'approved')) {
      return `Action: Finalized & Approved by ${actor} (${roleDisplay})${dateStr}`;
    }
    if (action === 'approve') {
      return `Action: Approved & Forwarded by ${actor} (${roleDisplay})${dateStr}`;
    }
    if (action === 'reject') {
      return `Action: Rejected & Sent Back by ${actor} (${roleDisplay})${dateStr}`;
    }
    if (action === 'submit' || action === 'submitted') {
      return `Action: Submitted by ${actor} (${roleDisplay})${dateStr}`;
    }
    return `Action: ${lastAction.action}${lastAction.role !== 'system' ? ` by ${actor}` : ''} (${roleDisplay})${dateStr}`;
  };

  const renderQPGrid = (qps: QPPending[], isHistory: boolean = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {qps.map((qp) =>
        <Card key={qp.id} className={`p-4 border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card/50 border-border' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className="flex flex-col h-full justify-between gap-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-base line-clamp-2">{qp.subject}</h3>
                <Badge variant="outline" className={theme === 'dark' ? 'border-primary/50 text-primary' : 'border-blue-200 text-blue-700'}>
                  {qp.test_type} {qp.set_number ? `Set ${qp.set_number}` : ''}
                </Badge>
              </div>

              <div className="space-y-1.5 mb-2">
                <p className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Faculty:</span>
                  <span>{qp.faculty}</span>
                </p>
                <p className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Submitted:</span>
                  <span>{new Date(qp.submitted_at).toLocaleDateString()}</span>
                </p>
                {qp.branch &&
                  <p className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">{translateTerminology("Branch")}:</span>
                    <span className="truncate">{qp.branch.name}</span>
                  </p>
                }
              </div>

              {/* Stepper on HOD card */}
              <div className="pt-1 pb-2 border-t border-b border-border/40 my-2">
                <QPWorkflowStepper chain={approvalChain} currentStatus={qp.status || 'pending_hod'} />
              </div>

              {qp.last_action &&
                <div className={`mt-2 p-2 rounded text-xs ${theme === 'dark' ? 'bg-primary/20 border border-primary/30' : 'bg-primary/5 border border-primary/20'}`}>
                  <p className="font-medium mb-1">
                    {formatActionText(qp.last_action, qp.status)}
                  </p>
                  <p className="text-muted-foreground italic line-clamp-2">
                    "{qp.last_action.comment || 'No comment provided'}"
                  </p>
                </div>
              }
              {isHistory && qp.status && (
                <div className="mt-2 space-y-1">
                  <span className={getStatusBadgeStyle(qp.status)}>Status: {qp.status.replace('admin', 'principal').replace('_', ' ').toUpperCase()}</span>
                  {qp.current_holder && (
                    <div className="text-center text-xs text-muted-foreground">
                      Waiting on: {qp.current_holder}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className={`w-full gap-1.5 font-medium ${theme === 'dark' ? 'hover:bg-primary/90 hover:text-white bg-primary text-white border-primary' : 'hover:bg-primary/90 hover:text-white bg-primary text-white border-primary'}`}
                onClick={() => handleReview(qp, isHistory)}>
                <Eye className="w-4 h-4" />
                {isHistory ? 'View Details' : 'Review & Action'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        .qp-content {
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .qp-content img {
          max-width: 100% !important;
          height: auto !important;
          max-height: 420px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          margin-top: 10px;
          margin-bottom: 10px;
          display: block;
          box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.1);
          background-color: #ffffff;
          padding: 6px;
        }
        .qp-content table {
          max-width: 100% !important;
          overflow-x: auto;
          display: block;
        }
        @media (max-width: 480px) {
          .qp-dialog-content { padding: 12px !important; }
          .qp-dialog-footer { 
            display: flex !important;
            flex-direction: column !important;
            padding: 16px !important; 
            gap: 12px !important; 
          }
          .action-buttons-group { gap: 10px !important; width: 100% !important; }
          .action-btn-mobile { flex: 1 !important; height: 40px !important; font-size: 0.875rem !important; }
          .download-btn-mobile { 
            width: 100% !important; 
            height: 42px !important; 
            background-color: hsl(var(--primary)) !important; 
            color: hsl(var(--primary-foreground)) !important; 
            border: none !important;
            margin-top: 4px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }
      `}</style>

      <div id="hod-qp-approvals-container" className={`w-full min-h-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Card className={theme === 'dark' ? 'bg-card border border-border flex flex-col min-h-[550px]' : 'bg-white border border-gray-200 flex flex-col min-h-[550px]'}>
            <CardHeader className="border-b pb-4">
              <div id="qp-approvals-header-section" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className={`text-xl sm:text-2xl font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Question Paper Approvals</CardTitle>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Review and track question papers from your department faculty</p>
                  </div>
                </div>
                <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                  <TabsTrigger value="pending" className="px-4 data-[state=active]:bg-primary data-[state=active]:text-white">Pending Requests</TabsTrigger>
                  <TabsTrigger value="history" className="px-4 data-[state=active]:bg-primary data-[state=active]:text-white">History</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            <TabsContent value="pending" className="flex-1 mt-0">
              <CardContent className="px-4 sm:px-6 pt-3">
                <div className="h-full overflow-y-auto custom-scrollbar border rounded-md p-4 mb-4">
                  {pendingQPs.length === 0 ?
                    <div className={`flex flex-col h-full items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                      <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'} animate-pulse`}>
                        <ClipboardCheck className="w-12 h-12 opacity-80" />
                      </div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Pending QPs</h3>
                      <p className="max-w-xs text-base leading-relaxed">
                        All question papers have been reviewed. Check back later for new submissions.
                      </p>
                    </div> :
                    renderQPGrid(pendingQPs, false)
                  }
                </div>
              </CardContent>
              {totalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                  <div>
                    Showing {totalCount === 0 ? 0 : (currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} requests
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || loading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
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
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0">
              <CardContent className="px-4 sm:px-6 pt-4">
                <div className="h-full overflow-y-auto custom-scrollbar border rounded-md p-4 mb-4">
                  {historyLoading && historyQPs.length === 0 ? (
                    <SkeletonTable rows={3} cols={3} />
                  ) : historyQPs.length === 0 ? (
                    <div className={`flex flex-col h-full items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                      <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-accent/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                        <ClipboardCheck className="w-12 h-12 opacity-80" />
                      </div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No History Found</h3>
                      <p className="max-w-xs text-base leading-relaxed">
                        You haven't approved or rejected any question papers yet.
                      </p>
                    </div>
                  ) : (
                    renderQPGrid(historyQPs, true)
                  )}
                </div>
              </CardContent>
              {historyTotalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                  <div>
                    Showing {historyTotalCount === 0 ? 0 : (historyPage - 1) * 10 + 1} to {Math.min(historyPage * 10, historyTotalCount)} of {historyTotalCount} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                      disabled={historyPage === 1 || historyLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {historyPage}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage(Math.min(historyTotalPages, historyPage + 1))}
                      disabled={historyPage === historyTotalPages || historyLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </TabsContent>
          </Card>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedQP(null);
            setQpDetail(null);
            setComment("");
          }
          setDialogOpen(open);
        }}>
          <DialogContent
            onPointerDownOutside={() => {
              setDialogOpen(false);
              setSelectedQP(null);
              setQpDetail(null);
              setComment("");
            }}
            className={`qp-dialog-content ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-4xl sm:max-w-5xl w-[95%] rounded-xl flex flex-col max-h-[90vh]`}>
            <DialogHeader className="pb-2 border-b border-border/40">
              <DialogTitle className={`text-left pr-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Review QP: {selectedQP?.subject} - {selectedQP?.test_type} {selectedQP?.set_number ? `Set ${selectedQP?.set_number}` : ''}
              </DialogTitle>
              <DialogDescription className="sr-only">Review question paper details and approval workflow progress</DialogDescription>
              <div className="pt-2">
                <QPWorkflowStepper chain={approvalChain} currentStatus={selectedQP?.status || 'pending_hod'} />
              </div>
            </DialogHeader>
            <div className="overflow-auto custom-scrollbar px-4 py-2 space-y-4 flex-1">
              {detailLoading ?
                <div className="text-center py-4">Loading QP details...</div> :
                qpDetail ?
                  <div className="overflow-x-auto p-1 custom-scrollbar">
                    <div className={`min-w-[650px] max-w-4xl mx-auto ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-slate-900 border-slate-300'} border rounded-xl shadow-lg p-6 sm:p-8 space-y-4`}>
                      {/* Header */}
                      <div className={`flex items-center justify-between pb-3 border-b-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                        <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-start">
                          {getOrgLogoUrl(qpDetail?.org_logo || selectedQP?.org_logo) ? (
                            <img
                              src={getOrgLogoUrl(qpDetail?.org_logo || selectedQP?.org_logo)}
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
                            {getOrgName(qpDetail?.org_name || selectedQP?.org_name)}
                          </h2>
                          <div className="text-sm sm:text-base font-bold text-primary">
                            {qpDetail.test_type ? qpDetail.test_type.replace('_', ' ') : (selectedQP?.test_type ? selectedQP.test_type.replace('_', ' ') : 'Internal Assessment')} {qpDetail.set_number ? `- Set ${qpDetail.set_number}` : (selectedQP?.set_number ? `- Set ${selectedQP.set_number}` : '')}
                          </div>
                        </div>
                        <div className="w-20 sm:w-24 flex-shrink-0" />
                      </div>

                      {/* Master Info Table */}
                      <div className={`border ${theme === 'dark' ? 'border-border' : 'border-slate-900'} rounded-sm overflow-hidden text-xs sm:text-sm`}>
                        <div className={`grid grid-cols-12 border-b ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                          <div className={`col-span-3 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Subject :</div>
                          <div className={`col-span-4 p-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'} border-r font-medium`}>
                            {qpDetail.subject || selectedQP?.subject || '--'}
                          </div>
                          <div className={`col-span-2 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Date:</div>
                          <div className="col-span-3 p-2 font-medium">
                            {qpDetail.exam_date ? format(new Date(qpDetail.exam_date.includes('T') ? qpDetail.exam_date : `${qpDetail.exam_date}T00:00:00`), "MMM. dd, yyyy") : (selectedQP?.exam_date ? format(new Date(selectedQP.exam_date.includes('T') ? selectedQP.exam_date : `${selectedQP.exam_date}T00:00:00`), "MMM. dd, yyyy") : '--')}
                          </div>
                        </div>

                        <div className={`grid grid-cols-12 border-b ${theme === 'dark' ? 'border-border' : 'border-slate-900'}`}>
                          <div className={`col-span-3 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Subject Code :</div>
                          <div className={`col-span-4 p-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'} border-r font-medium`}>
                            {qpDetail.subject_code || selectedQP?.subject_code || '--'}
                          </div>
                          <div className={`col-span-2 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Time:</div>
                          <div className="col-span-3 p-2 font-medium">
                            {qpDetail.exam_time || selectedQP?.exam_time || '--'}
                          </div>
                        </div>

                        <div className="grid grid-cols-12">
                          <div className={`col-span-3 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Prepared by:</div>
                          <div className={`col-span-4 p-2 ${theme === 'dark' ? 'border-border' : 'border-slate-900'} border-r font-medium`}>
                            {qpDetail.faculty || selectedQP?.faculty || 'Faculty'}
                          </div>
                          <div className={`col-span-2 font-bold p-2 ${theme === 'dark' ? 'bg-muted/40 border-border' : 'bg-slate-50 border-slate-900'} border-r`}>Semester / Div:</div>
                          <div className="col-span-3 p-2 font-medium">
                            {`Semester ${qpDetail.semester || selectedQP?.semester || '--'}${qpDetail.branch || (typeof selectedQP?.branch === 'object' ? selectedQP?.branch?.name : selectedQP?.branch) ? ` - ${qpDetail.branch || (typeof selectedQP?.branch === 'object' ? selectedQP?.branch?.name : selectedQP?.branch)}` : ''} / ${qpDetail.section || selectedQP?.section || '--'}`}
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
                          Max Marks: <span className="text-primary font-bold text-base not-italic ml-1">{calculateFlatTotalMarks(getFlattenedQuestions(qpDetail))}</span>
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
                            {groupFlatQuestionsByPart(getFlattenedQuestions(qpDetail)).map((part) => (
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
                  </div> :

                  <div className="text-center py-4 text-muted-foreground">
                    Failed to load QP details
                  </div>
              }


              {selectedQP?.has_exam_started && (
                selectedQP?.status === 'approved' ? (
                  <div className={`p-3 rounded-md border text-sm mb-4 ${
                    theme === 'dark' 
                      ? 'bg-green-950/40 border-green-500/30 text-green-400' 
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    ✅ <strong>Approved & Locked:</strong> This question paper is approved for the exam. Actions are locked as the exam has started.
                  </div>
                ) : (
                  <div className={`p-3 rounded-md border text-sm mb-4 ${
                    theme === 'dark' 
                      ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    ⚠️ <strong>Exam Locked:</strong> This exam started on {selectedQP.exam_start ? new Date(selectedQP.exam_start).toLocaleString() : 'N/A'}. Question paper approvals and actions are disabled.
                  </div>
                )
              )}

              {!isHistoryView && (
                <div>
                  <label className="block text-sm font-medium mb-2">Comment (optional)</label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={!getNextRole('hod') ? "Add a final comment..." : `Add a comment for ${getNextRole('hod')}...`}
                    rows={3} />
                </div>
              )}
            </div>
            <DialogFooter className="qp-dialog-footer flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/40">
              <div className="action-buttons-group flex flex-wrap gap-2 w-full sm:w-auto">
                {!isHistoryView && (
                  <>
                    <Button
                      onClick={() => selectedQP && handleApprove(selectedQP.id)}
                      disabled={actionLoading || !!selectedQP?.has_exam_started}
                      className={`action-btn-mobile flex-1 sm:w-auto justify-center transition-none font-medium ${
                        theme === 'dark'
                          ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20 border'
                          : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100 border'
                      }`}
                    >
                      <CheckCircle className={`w-4 h-4 mr-1.5 shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      <span className="whitespace-normal">
                        {!getNextRole('hod') ? 'Finalize & Approve' : 'Approve & Forward'}
                      </span>
                    </Button>
                    <Button
                      onClick={() => selectedQP && handleReject(selectedQP.id)}
                      disabled={actionLoading || !!selectedQP?.has_exam_started}
                      className={`action-btn-mobile flex-1 sm:w-auto justify-center transition-none font-medium ${
                        theme === 'dark'
                          ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20 border'
                          : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100 border'
                      }`}
                    >
                      <XCircle className={`w-4 h-4 mr-1.5 shrink-0 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                      <span className="whitespace-normal">Reject & Send Back</span>
                    </Button>
                  </>
                )}
                {isHistoryView && (
                  <div className="flex items-center justify-center text-sm font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border w-full sm:w-auto">
                    <CheckCircle className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span>Archived Request (Read Only)</span>
                  </div>
                )}
              </div>
              <div className="w-full sm:w-auto sm:ml-auto">
                <Button
                  variant="outline"
                  onClick={() => downloadPDF()}
                  disabled={downloadingPDF}
                  className="download-btn-mobile bg-primary hover:bg-primary/90 text-white hover:text-white w-full sm:w-auto justify-center transition-none disabled:opacity-50"
                >
                  {downloadingPDF ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  <span className="whitespace-normal">{downloadingPDF ? "Exporting..." : "Export PDF"}</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>);

};

export default QPApprovals;