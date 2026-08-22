import React, { useState, useEffect, useRef } from "react";
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

interface QPPending {
  id: number;
  subject: string;
  test_type: string;
  set_number?: string;
  faculty: string;
  submitted_at: string;
  branch?: {id: number | null;name: string | null;};
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
          className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[92vw] max-w-[760px] h-[85vh] max-h-[85vh] rounded-lg flex flex-col`}>
          
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
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/60">
                <h4 className="font-semibold mb-4">Question Paper Preview</h4>
                <div className="space-y-3">
                  {qpDetail.questions.map((q: any, qIndex: number) =>
                <div key={qIndex} className="space-y-3">
                      {q.subparts.map((s: any, sIndex: number) => {
                    const key = `${qIndex}-${sIndex}`;
                    const isExpanded = !!expanded[key];
                    const content = s.content || '';
                    const textOnly = content.replace(/<[^>]*>/g, '').trim();
                    const hasMedia = content.includes('<img') || content.includes('<table') || content.includes('<svg');
                    const isLong = textOnly.length > 130 || hasMedia;

                    let displayContent = content;
                    if (!isExpanded && isLong) {
                      if (hasMedia) {
                        displayContent = textOnly.slice(0, 130) + '… (diagram/attachment attached)';
                      } else {
                        displayContent = content.length > 130 ? content.slice(0, 130) + '…' : content;
                      }
                    }

                    return (
                      <div key={sIndex} className="border rounded-md p-3 bg-white dark:bg-gray-900 shadow-sm overflow-hidden w-full">
                            <div className="flex items-start gap-2.5 sm:gap-3 w-full min-w-0">
                              <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs sm:text-sm">
                                {q.question_number}{s.subpart_label}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <div 
                                    className="text-sm sm:text-[15px] text-gray-900 dark:text-gray-100 flex-1 min-w-0 break-words [overflow-wrap:anywhere] leading-relaxed qp-content"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(isExpanded ? content : displayContent) }}
                                  />
                                  <div className="flex-shrink-0 ml-1.5">
                                    <Badge className="text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm bg-transparent border border-border shrink-0 whitespace-nowrap">{s.max_marks}m</Badge>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs text-gray-600 dark:text-gray-400 bg-transparent">CO: {q.co}</Badge>
                                  <Badge variant="outline" className="text-xs text-gray-600 dark:text-gray-400 bg-transparent">{q.blooms_level}</Badge>
                                  {isLong && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(key)}
                                      className="text-xs text-primary font-medium hover:underline p-0 bg-transparent border-0 inline-flex items-center cursor-pointer ml-1 focus:outline-none"
                                    >
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>);

                  })}
                    </div>
                )}

                  <div className="font-semibold pt-2 border-t flex items-center justify-between">
                    <span>Total Marks:</span>
                    <span className="text-lg font-bold text-primary">
                      {qpDetail.questions.reduce((total: number, q: any) =>
                        total + q.subparts.reduce((subTotal: number, s: any) => subTotal + (s.max_marks || 0), 0), 0
                      )}
                    </span>
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