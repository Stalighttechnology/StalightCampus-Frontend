import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from
"../ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useTheme } from "../../context/ThemeContext";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { SkeletonList, SkeletonCard } from '../ui/skeleton';
import { sanitizeHtml } from "../../utils/sanitize";
import { translateTerminology } from "../../utils/institutionConfig";
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
  last_action?: {actor?: string;role?: string;action?: string;comment?: string; timestamp?: string;} | null;
  exam_start?: string;
  has_exam_started?: boolean;
}

interface PaginationInfo {
  count: number;
  next: string | null;
  previous: string | null;
  current_page: number;
  total_pages: number;
  page_size: number;
}

const COEQPApprovals = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [pendingQPs, setPendingQPs] = useState<QPPending[]>([]);
  const [finalizedQPs, setFinalizedQPs] = useState<QPPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQP, setSelectedQP] = useState<QPPending | null>(null);
  const [qpDetail, setQpDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingPagination, setPendingPagination] = useState<PaginationInfo | null>(null);
  const [finalizedPagination, setFinalizedPagination] = useState<PaginationInfo | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [finalizedPage, setFinalizedPage] = useState(1);
  const [activeTab, setActiveTab] = useState("pending");
  const [conflictQP, setConflictQP] = useState<{id: number; subject: string; test_type: string; set_number?: string; faculty: string} | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const downloadPDF = async () => {
    if (!qpDetail) return;
    setDownloadingPDF(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/qps/${qpDetail.id}/export-pdf/`, {
        method: "GET"
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `qp-${(qpDetail.subject || 'qp').replace(/\s+/g, '_')}-${(qpDetail.test_type || 'test').replace(/\s+/g, '_')}_${(qpDetail.set_number || '').replace(/\s+/g, '_')}.pdf`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json().catch(() => ({}));
        MySwal.fire('Error', result.message || "Failed to download PDF", 'error');
      }
    } catch (error) {
      MySwal.fire('Error', "Network error while exporting PDF", 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [approvalChain, setApprovalChain] = useState<string[]>(['hod', 'coe', 'principal']);

  const fetchApprovalChain = async () => {
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/qp-approval-chain/`);
      if (res.ok) {
        const data = await res.json();
        if (data.qp_approval_chain && Array.isArray(data.qp_approval_chain) && data.qp_approval_chain.length > 0) {
          setApprovalChain(data.qp_approval_chain);
        }
      }
    } catch (error) {
      // Keep default
    }
  };

  const getNextRole = (currentRole: string = 'coe') => {
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

  const getPrevRole = (currentRole: string = 'coe') => {
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

  useEffect(() => {
    fetchApprovalChain();
  }, []);

  useEffect(() => {
    fetchPendingQPs();
  }, [pendingPage]);

  useEffect(() => {
    if (activeTab === "finalized") {
      fetchFinalizedQPs();
    }
  }, [finalizedPage, activeTab]);

  useEffect(() => {

    // Ensure SweetAlert appears above the dialog and is interactive
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
    }}, []);

  const fetchPendingQPs = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/coe-pending/?page=${pendingPage}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      const data = await response.json();
      const norm = normalizePaginatedResponse(data, 'results');
      const items = Array.isArray(norm.items) ? norm.items : [];
      setPendingQPs(items);
      const count = norm.meta.totalItems ?? data.count ?? items.length;
      setPendingPagination({
        count,
        next: norm.meta.next ?? data.next ?? null,
        previous: norm.meta.previous ?? data.previous ?? null,
        current_page: norm.meta.currentPage ?? data.current_page ?? pendingPage,
        total_pages: norm.meta.totalPages ?? data.total_pages ?? Math.max(1, Math.ceil(count / 10)),
        page_size: 10
      });
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const fetchFinalizedQPs = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/coe-finalized/?page=${finalizedPage}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
        }
      });
      const data = await response.json();
      // Debug log
      const norm = normalizePaginatedResponse(data, 'results');
      const items = Array.isArray(norm.items) ? norm.items : [];
      setFinalizedQPs(items);
      const count = norm.meta.totalItems ?? data.count ?? items.length;
      setFinalizedPagination({
        count,
        next: norm.meta.next ?? data.next ?? null,
        previous: norm.meta.previous ?? data.previous ?? null,
        current_page: norm.meta.currentPage ?? data.current_page ?? finalizedPage,
        total_pages: norm.meta.totalPages ?? data.total_pages ?? Math.max(1, Math.ceil(count / 10)),
        page_size: 10
      });
    } catch (error) {

      setFinalizedQPs([]);
    }
  };

  const handleFinalize = async (qpId: number) => {
    const nextRole = getNextRole('coe');
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
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      confirmButtonText: isLastRole ? 'Yes, Finalize & Approve' : 'Yes, Approve & Forward',
      cancelButtonText: 'Cancel',
      target: dialogContentRef.current ?? document.body
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      MySwal.close();
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/coe-finalize/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ comment })
      });
      const data = await response.json();
      if (data.success) {
        MySwal.fire(
          isLastRole ? 'Finalized & Approved!' : 'Approved!',
          data.message || (isLastRole ? 'QP finalized and approved for use.' : `QP approved and forwarded to ${nextRole}.`),
          'success'
        );
        // Remove from both lists (QP could be from pending or finalized list)
        setPendingQPs((prev) => prev.filter((qp) => qp.id !== qpId));
        if (selectedQP) {
          const approvedItem = { ...selectedQP, status: isLastRole ? 'approved' : `pending_${nextRole?.toLowerCase()}` };
          // Update finalized list (remove old entry and insert updated one at top if approved)
          if (isLastRole) {
            setFinalizedQPs((prev) => [approvedItem, ...prev.filter((q) => q.id !== qpId)]);
          }
        }
        setDialogOpen(false);
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        // Refresh both lists from server
        fetchPendingQPs();
        fetchFinalizedQPs();
      } else {
        if (data.conflict_qp) {
          setConflictQP(data.conflict_qp);
          setShowConflictDialog(true);
        } else {
          MySwal.fire('Error', data.message || 'Failed to finalize QP.', 'error');
        }
      }
    } catch (error) {

      MySwal.fire('Network error', 'Network error while finalizing QP.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAndApprove = async () => {
    if (!conflictQP || !selectedQP) return;
    setActionLoading(true);
    try {
      // 1. Reject old
      const rejRes = await fetch(`${API_ENDPOINT}/admin/qps/${conflictQP.id}/coe-reject/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "Revoked in favor of a newly submitted paper." })
      });
      const rejData = await rejRes.json();
      if (!rejData.success) {
        MySwal.fire('Error', 'Failed to revoke previous QP. Cannot proceed.', 'error');
        setActionLoading(false);
        return;
      }
      
      // 2. Approve new
      const appRes = await fetch(`${API_ENDPOINT}/admin/qps/${selectedQP.id}/coe-finalize/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment || "Approved after revoking previous conflict." })
      });
      const appData = await appRes.json();
      if (appData.success) {
        MySwal.fire('Success', 'Previous QP revoked and new QP approved successfully.', 'success');
        setShowConflictDialog(false);
        setConflictQP(null);
        setDialogOpen(false);
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        fetchPendingQPs();
        fetchFinalizedQPs();
      } else {
        MySwal.fire('Error', appData.message || 'Failed to approve new QP.', 'error');
      }
    } catch (err) {
      MySwal.fire('Network error', 'Network error during resolution.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchQPDetail = async (qpId: number) => {
    setDetailLoading(true);
    try {
      // use fetchWithTokenRefresh so we attempt token refresh on 401
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/qps/${qpId}/coe-detail/`, { method: 'GET' });

      if (response.status === 401 || response.status === 403) {
        // try authenticated HOD detail as a fallback (may be accessible to other admin roles)
        try {
          const hodResp = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/qps/${qpId}/hod-detail/`, { method: 'GET' });
          if (hodResp.ok) {
            const hodData = await hodResp.json();
            if (hodData.success && hodData.data && hodData.data.length > 0) {
              setQpDetail(hodData.data[0]);
              MySwal.fire('Notice', 'Loaded QP via HOD detail endpoint.', 'info');
              return;
            }
          }
        } catch (e) {

        }

        // try a public fetch (no auth) as a last resort — some finalized QPs may be publicly viewable
        try {
          const publicResp = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/coe-detail/`);
          if (publicResp.ok) {
            const publicData = await publicResp.json();
            if (publicData.success && publicData.data && publicData.data.length > 0) {
              setQpDetail(publicData.data[0]);
              MySwal.fire('Notice', 'Loaded QP via public endpoint.', 'info');
              return;
            }
          }
        } catch (e) {

        }

        MySwal.fire('Forbidden', 'You do not have permission to view this QP detail (401/403).', 'error');
        return;
      }

      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setQpDetail(data.data[0]);
      } else if (data.success === false && data.message) {
        MySwal.fire('Error', data.message, 'error');
      }
    } catch (err) {

      MySwal.fire('Error', 'Failed to load QP detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const printQP = (qp: any) => {
    if (!qp) return;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return;
    const title = `Question Paper - ${qp.subject} - ${qp.test_type} ${qp.set_number || ''}`.trim();
    const styles = `
      body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      .qp-meta { margin-bottom: 12px; }
      .question { margin-bottom: 10px; }
      .subpart { margin-left: 8px; margin-bottom: 6px; }
    `;

    let html = `<!doctype html><html><head><title>${title}</title><style>${styles}</style></head><body>`;
    html += `<h1>Question Paper</h1>`;
    html += `<div class="qp-meta"><strong>Subject:</strong> ${qp.subject} &nbsp; <strong>Test:</strong> ${qp.test_type} ${qp.set_number || ''} &nbsp; <strong>Faculty:</strong> ${qp.faculty}</div>`;
    qp.questions.forEach((q: any) => {
      html += `<div class="question">`;
      q.subparts.forEach((s: any) => {
        html += `<div class="subpart"><strong>${q.question_number}${s.subpart_label}.</strong> ${s.content} <em>(${s.max_marks} marks)</em></div>`;
      });
      html += `</div>`;
    });
    // total marks
    const total = qp.questions.reduce((total: number, q: any) => total + q.subparts.reduce((st: number, s: any) => st + (s.max_marks || 0), 0), 0);
    html += `<div style="margin-top:16px;"><strong>Total Marks:</strong> ${total}</div>`;
    html += `</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    // give browser a bit of time to render before printing
    setTimeout(() => {
      try {win.focus();win.print();} catch (e) {}
    }, 300);
  };

  const MySwal = withReactContent(Swal);

  const handleReject = async (qpId: number) => {
    const prevRoleName = getPrevRole('coe');
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
      // Render at document.body so it's not trapped under portal layers.
      target: dialogContentRef.current ?? document.body
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      MySwal.close();
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/coe-reject/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ comment })
      });
      const data = await response.json();
      if (data.success) {
        MySwal.fire('Rejected!', data.message || `QP rejected and sent back to ${prevRoleName} for review.`, 'success');
        // Remove from both lists (QP could be from pending or finalized list)
        setPendingQPs((prev) => prev.filter((qp) => qp.id !== qpId));
        if (selectedQP) {
          const rejectedItem = { ...selectedQP, status: 'rejected' };
          // Keep in finalized list temporarily before refresh
          setFinalizedQPs((prev) => [rejectedItem, ...prev.filter((q) => q.id !== qpId)]);
        }
        setDialogOpen(false);
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        // Refresh both lists from server
        fetchPendingQPs();
        fetchFinalizedQPs();
      } else {
        MySwal.fire('Error', data.message || 'Failed to reject QP.', 'error');
      }
    } catch (error) {
      MySwal.fire('Network error', 'Network error while rejecting QP.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SkeletonList items={3} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={ref} id="coe-qp-approvals-container" className={`w-full min-h-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.4); }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.4); }
      `}</style>
      <Tabs defaultValue="pending" className="w-full flex flex-col flex-1" onValueChange={setActiveTab}>
        <Card className="flex flex-col flex-1">
          <CardHeader className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Question Paper Approvals</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Review, approve, and finalize question papers for upcoming examinations.</p>
              </div>
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
                <TabsTrigger value="finalized">Finalized Papers</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <TabsContent value="pending" className="flex-1 mt-0">
            <CardContent>
              {pendingQPs.length === 0 ?
              <Card className="border-dashed border-2 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="bg-primary/5 p-6 rounded-full mb-4">
                        <CheckCircle className="w-12 h-12 text-primary/40" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No pending approvals</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        All question papers have been processed. New submissions will appear here for review and approval.
                      </p>
                    </CardContent>
                 </Card> :
              <div className="space-y-4">
                  {Array.isArray(pendingQPs) && pendingQPs.map((qp) =>
                <Card key={qp.id} className="p-4 sm:p-5 hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="w-full">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="font-semibold text-[18px] sm:text-base">{qp.subject} - {qp.test_type} {qp.set_number ? `Set ${qp.set_number}` : ''}</h3>
                            {qp.status &&
                        (() => {
                          const s = qp.status;
                          if (s === 'rejected') return <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">Rejected</Badge>;
                          if (s === 'approved') return <Badge className="bg-green-100 text-green-800 dark:bg-emerald-950/40 dark:text-emerald-300">Approved</Badge>;
                          if (s.startsWith('pending')) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Pending</Badge>;
                          return <Badge variant="outline">{s}</Badge>;
                        })()
                        }
                          </div>
                          <div className="space-y-1 sm:space-y-0.5 text-sm text-muted-foreground mb-2">
                            <p>Faculty: {qp.faculty}</p>
                            <p>Submitted: {new Date(qp.submitted_at).toLocaleDateString()}</p>
                            {qp.branch &&
                              <p>Branch: {qp.branch.name}</p>
                            }
                          </div>

                          {/* Stepper on pending card */}
                          <div className="pt-1 pb-2 border-t border-b border-border/40 my-2">
                            <QPWorkflowStepper chain={approvalChain} currentStatus={qp.status || 'pending_coe'} />
                          </div>

                          {qp.last_action && (
                            <div className={`mt-2 p-2 rounded text-xs ${theme === 'dark' ? 'bg-primary/20 border border-primary/30' : 'bg-primary/5 border border-primary/20'}`}>
                              <p className="font-medium mb-1">
                                {formatActionText(qp.last_action, qp.status)}
                              </p>
                              {qp.last_action.comment ?
                                <p className="text-muted-foreground italic line-clamp-2">"{qp.last_action.comment}"</p> :
                                null}
                            </div>
                          )}
                        </div>
                        <div className="flex w-full sm:w-auto gap-2 sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {setSelectedQP(qp);setQpDetail(null);fetchQPDetail(qp.id);setDialogOpen(true);}}
                            className="w-full sm:w-auto h-11 sm:h-9 text-sm font-semibold bg-primary text-white hover:bg-primary/90 hover:text-white shrink-0">
                            <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                            Review & Action
                          </Button>
                        </div>
                      </div>
                    </Card>
                )}
                </div>
              }
            </CardContent>
            {pendingPagination && (pendingPagination.next || pendingPagination.previous) && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing page {pendingPage} of {pendingPagination.total_pages} — {pendingPagination.count} entries
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))}
                    disabled={pendingPage === 1 || !pendingPagination.previous}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  <span className="text-sm font-semibold px-2">
                    {pendingPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingPage((prev) => Math.min(pendingPagination.total_pages, prev + 1))}
                    disabled={pendingPage === pendingPagination.total_pages || !pendingPagination.next}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </TabsContent>
          <TabsContent value="finalized" className="flex-1 mt-0">
            <CardContent>
              {finalizedQPs.length === 0 ?
              <Card className="border-dashed border-2 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="bg-primary/5 p-6 rounded-full mb-4">
                        <CheckCircle className="w-12 h-12 text-primary/40" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No finalized papers</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        Approved question papers will be archived here for examination management.
                      </p>
                    </CardContent>
                 </Card> :
              <div className="space-y-4">
                  {Array.isArray(finalizedQPs) && finalizedQPs.map((qp) =>
                <Card key={qp.id} className="p-4 sm:p-5 hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="w-full">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="font-semibold text-[18px] sm:text-base">{qp.subject} - {qp.test_type} {qp.set_number ? `Set ${qp.set_number}` : ''}</h3>
                            {qp.status &&
                        (() => {
                          const s = qp.status;
                          if (s === 'rejected') return <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">Rejected</Badge>;
                          if (s === 'approved') return <Badge className="bg-green-100 text-green-800 dark:bg-emerald-950/40 dark:text-emerald-300">Approved</Badge>;
                          if (s.startsWith('pending')) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Pending</Badge>;
                          return <Badge variant="outline">{s}</Badge>;
                        })()
                        }
                          </div>
                          <div className="space-y-1 sm:space-y-0.5 text-sm text-muted-foreground mb-2">
                            <p>Faculty: {qp.faculty}</p>
                            <p>Submitted: {new Date(qp.submitted_at).toLocaleDateString()}</p>
                            {qp.branch &&
                              <p>Branch: {qp.branch.name}</p>
                            }
                          </div>

                          {/* Stepper on finalized card */}
                          <div className="pt-1 pb-2 border-t border-b border-border/40 my-2">
                            <QPWorkflowStepper chain={approvalChain} currentStatus={qp.status || 'approved'} />
                          </div>

                          {qp.last_action && (
                            <div className={`mt-2 p-2 rounded text-xs ${theme === 'dark' ? 'bg-primary/20 border border-primary/30' : 'bg-primary/5 border border-primary/20'}`}>
                              <p className="font-medium mb-1">
                                {formatActionText(qp.last_action, qp.status)}
                              </p>
                              {qp.last_action.comment ?
                                <p className="text-muted-foreground italic line-clamp-2">"{qp.last_action.comment}"</p> :
                                null}
                            </div>
                          )}
                        </div>
                        <div className="flex w-full sm:w-auto gap-2 sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQP(qp);
                              setQpDetail(null);
                              fetchQPDetail(qp.id);
                              setDialogOpen(true);
                            }}
                            className="w-full sm:w-auto h-11 sm:h-9 text-sm font-semibold bg-primary text-white hover:bg-primary/90 hover:text-white shrink-0">
                            <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                )}
                </div>
              }
            </CardContent>
            {finalizedPagination && (finalizedPagination.next || finalizedPagination.previous) && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing page {finalizedPage} of {finalizedPagination.total_pages} — {finalizedPagination.count} entries
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFinalizedPage((prev) => Math.max(1, prev - 1))}
                    disabled={finalizedPage === 1 || !finalizedPagination.previous}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {finalizedPage} / {finalizedPagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFinalizedPage((prev) => prev + 1)}
                    disabled={!finalizedPagination.next}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </TabsContent>
        </Card>
      </Tabs>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedQP(null);
            setQpDetail(null);
            setComment("");
          }
          setDialogOpen(open);
        }}>
        
        <DialogContent
          ref={dialogContentRef}
          className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[95vw] max-w-4xl sm:max-w-5xl h-[90vh] max-h-[90vh] rounded-xl flex flex-col`}>
          
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className={`text-left pr-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Review QP: {selectedQP?.subject} - {selectedQP?.test_type} {selectedQP?.set_number ? `Set ${selectedQP?.set_number}` : ''}
            </DialogTitle>
            <DialogDescription className="sr-only">Review question paper details and approval workflow progress</DialogDescription>
            <div className="pt-2">
              <QPWorkflowStepper chain={approvalChain} currentStatus={selectedQP?.status || 'pending_coe'} />
            </div>
          </DialogHeader>

          <div className="overflow-auto custom-scrollbar px-4 py-2 space-y-4 flex-1">
            {detailLoading ?
            <div className="space-y-4">
                <SkeletonCard className="h-40 w-full" />
                <SkeletonList items={3} />
              </div> :
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

            <div className="text-center py-4 text-muted-foreground">Failed to load QP details</div>
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

            <div>
              <label className="block text-sm font-medium mb-2">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={!getNextRole('coe') ? "Add a final comment..." : `Add a comment for ${getNextRole('coe')}...`}
                rows={3} />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/40">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {/* Show Finalize & Approve / Approve & Forward for all statuses EXCEPT already-approved */}
              {selectedQP?.status !== 'approved' && (
                <Button
                  onClick={() => selectedQP && handleFinalize(selectedQP.id)}
                  disabled={actionLoading || selectedQP?.has_exam_started}
                  className={`flex-1 sm:w-auto justify-center transition-none font-medium text-xs px-3 h-10 sm:h-9 ${
                    theme === 'dark'
                      ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20 border'
                      : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100 border'
                  }`}
                >
                  <CheckCircle className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>
                    {!getNextRole('coe') ? 'Finalize & Approve' : 'Approve & Forward'}
                  </span>
                </Button>
              )}

              {/* Show Reject & Send Back / Revoke & Send Back button only if exam has not started */}
              {!(selectedQP?.status === 'approved' && selectedQP?.has_exam_started) && (
                <Button
                  onClick={() => selectedQP && handleReject(selectedQP.id)}
                  disabled={actionLoading || selectedQP?.has_exam_started}
                  className={`flex-1 sm:w-auto justify-center transition-none font-medium text-xs px-3 h-10 sm:h-9 ${
                    theme === 'dark'
                      ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20 border'
                      : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100 border'
                  }`}
                >
                  <XCircle className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                  <span>
                    {selectedQP?.status === 'approved' ? 'Revoke & Send Back' : 'Reject & Send Back'}
                  </span>
                </Button>
              )}
            </div>

            {qpDetail && (
              <div className="w-full sm:w-auto sm:ml-auto">
                <Button
                  onClick={downloadPDF}
                  disabled={downloadingPDF}
                  className="w-full sm:w-auto justify-center whitespace-normal text-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50 h-10 sm:h-9 text-xs font-medium"
                >
                  {downloadingPDF ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  <span>{downloadingPDF ? "Exporting..." : "Export PDF"}</span>
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConflictDialog}
        onOpenChange={(open) => {
          setShowConflictDialog(open);
          if (!open) setConflictQP(null);
        }}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} sm:max-w-[500px]`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <XCircle className="w-5 h-5" />
              Approval Conflict Detected
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">A question paper for this subject and test has already been approved. You must revoke it before approving this new one.</p>
            {conflictQP && (
              <div className="p-3 border rounded bg-muted/50 text-sm space-y-1">
                <p><strong>Subject:</strong> {conflictQP.subject}</p>
                <p><strong>Test Type:</strong> {conflictQP.test_type}</p>
                {conflictQP.set_number && <p><strong>Set Number:</strong> {conflictQP.set_number}</p>}
                <p><strong>Approved Faculty:</strong> {conflictQP.faculty}</p>
              </div>
            )}
            <p className="text-sm font-medium text-muted-foreground">What would you like to do?</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setShowConflictDialog(false);
              if (conflictQP) {
                 setDialogOpen(false);
                 setTimeout(() => {
                   setSelectedQP({ id: conflictQP.id, subject: conflictQP.subject, test_type: conflictQP.test_type, set_number: conflictQP.set_number, faculty: conflictQP.faculty, submitted_at: new Date().toISOString() });
                   setQpDetail(null);
                   fetchQPDetail(conflictQP.id);
                   setDialogOpen(true);
                 }, 300);
              }
            }}>
              View Approved QP
            </Button>
            <Button 
              onClick={handleRevokeAndApprove}
              disabled={actionLoading || selectedQP?.has_exam_started}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Revoke Previous & Approve New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

});

COEQPApprovals.displayName = 'COEQPApprovals';

export default COEQPApprovals;