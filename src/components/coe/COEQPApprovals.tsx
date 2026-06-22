import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"../ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useTheme } from "../../context/ThemeContext";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { SkeletonList, SkeletonCard } from '../ui/skeleton';

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
  last_action?: {actor?: string;role?: string;action?: string;comment?: string;} | null;
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

  useEffect(() => {
    fetchPendingQPs();
    fetchFinalizedQPs();

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
    const result = await MySwal.fire({
      title: 'Confirm approval',
      text: 'Are you sure you want to finalize and approve this question paper?',
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      confirmButtonText: 'Yes, approve',
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
        MySwal.fire('Approved!', 'QP finalized and approved for use.', 'success');
        // Remove from both lists (QP could be from pending or finalized list)
        setPendingQPs((prev) => prev.filter((qp) => qp.id !== qpId));
        if (selectedQP) {
          const approvedItem = { ...selectedQP, status: 'approved' };
          // Update finalized list (remove old entry and insert updated one at top)
          setFinalizedQPs((prev) => [approvedItem, ...prev.filter((q) => q.id !== qpId)]);
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
    const result = await MySwal.fire({
      title: 'Confirm rejection',
      text: 'Are you sure you want to reject this question paper and return it to the faculty?',
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      confirmButtonText: 'Yes, reject',
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
        MySwal.fire('Rejected!', data.message || 'QP rejected and returned to the faculty.', 'success');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SkeletonCard className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <SkeletonList items={5} />
          </CardContent>
        </Card>
      </div>);

  }

  return (
    <div ref={ref} id="coe-qp-approvals-container" className="space-y-6">
      <Card>
        <CardHeader id="coe-qp-approvals-card">
          <CardTitle>Question Paper Final Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingQPs.length === 0 ?
          <Card className="border-dashed border-2 shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-primary/5 p-6 rounded-full mb-4">
                    <CheckCircle className="w-12 h-12 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No pending approvals</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    All question papers have been processed. New submissions will appear here for your final review and approval.
                  </p>
                </CardContent>
             </Card> :

          <div className="space-y-4">
              {Array.isArray(pendingQPs) && pendingQPs.map((qp) =>
            <Card key={qp.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="w-full">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="font-semibold text-[18px] sm:text-base">{qp.subject} - {qp.test_type} {qp.set_number}</h3>
                        {qp.status &&
                    (() => {
                      const s = qp.status;
                      if (s === 'rejected') return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
                      if (s === 'approved') return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
                      if (s.startsWith('pending')) return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
                      return <Badge className="bg-gray-100 text-gray-800">{s}</Badge>;
                    })()
                    }
                      </div>
                      <div className="space-y-1 sm:space-y-0.5">
                        <p className="text-[16px] sm:text-sm text-muted-foreground">Faculty: {qp.faculty}</p>
                        <p className="text-[16px] sm:text-sm text-muted-foreground">Submitted: {new Date(qp.submitted_at).toLocaleDateString()}</p>
                        {qp.branch &&
                    <p className="text-[16px] sm:text-sm text-muted-foreground">Branch: {qp.branch.name}</p>
                    }
                        {qp.last_action ?
                    <div className="mt-1">
                            <p className="text-[16px] sm:text-sm text-muted-foreground capitalize">Last: {qp.last_action.action} by {qp.last_action.actor || 'Unknown'} ({qp.last_action.role || 'N/A'})</p>
                            {qp.last_action.comment ?
                      <p className="text-[16px] sm:text-sm text-muted-foreground italic">"{qp.last_action.comment}"</p> :
                      null}
                          </div> :
                    null}
                      </div>
                    </div>
                    <div className="flex w-full sm:w-auto gap-2">
                      <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {setSelectedQP(qp);setQpDetail(null);fetchQPDetail(qp.id);setDialogOpen(true);}}
                    className="w-full sm:w-auto h-12 sm:h-9 text-[18px] sm:text-sm font-semibold sm:font-normal bg-primary text-white hover:bg-primary/90 hover:text-white">
                    
                        <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                        Review
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
                <span className="text-sm font-medium px-2">
                  {pendingPage} / {pendingPagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingPage((prev) => prev + 1)}
                  disabled={!pendingPagination.next}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardFooter>
          )}
      </Card>

      {/* Finalized QPs section */}
      <Card>
        <CardHeader>
          <CardTitle>Finalized Question Papers</CardTitle>
        </CardHeader>
        <CardContent>
          {finalizedQPs.length === 0 ?
          <Card className="border-dashed border-2 shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-primary/5 p-6 rounded-full mb-4">
                    <Eye className="w-12 h-12 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No finalized papers</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Approved and finalized question papers will be archived here for your reference.
                  </p>
                </CardContent>
             </Card> :

          <div className="space-y-4">
              {Array.isArray(finalizedQPs) && finalizedQPs.map((qp) =>
            <Card key={`final-${qp.id}`} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="w-full">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="font-semibold text-[18px] sm:text-base">{qp.subject} - {qp.test_type} {qp.set_number}</h3>
                        {qp.status &&
                    (() => {
                      const s = qp.status;
                      if (s === 'rejected') return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
                      if (s === 'approved') return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
                      if (s.startsWith('pending')) return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
                      return <Badge className="bg-gray-100 text-gray-800">{s}</Badge>;
                    })()
                    }
                      </div>
                      <div className="space-y-1 sm:space-y-0.5">
                        <p className="text-[16px] sm:text-sm text-muted-foreground">Faculty: {qp.faculty}</p>
                        <p className="text-[16px] sm:text-sm text-muted-foreground">Submitted: {new Date(qp.submitted_at).toLocaleDateString()}</p>
                        {qp.branch &&
                    <p className="text-[16px] sm:text-sm text-muted-foreground">Branch: {qp.branch.name}</p>
                    }
                        {qp.last_action ?
                    <div className="mt-1">
                            <p className="text-[16px] sm:text-sm text-muted-foreground capitalize">Last: {qp.last_action.action} by {qp.last_action.actor || 'Unknown'} ({qp.last_action.role || 'N/A'})</p>
                            {qp.last_action.comment ?
                      <p className="text-[16px] sm:text-sm text-muted-foreground italic">"{qp.last_action.comment}"</p> :
                      null}
                          </div> :
                    null}
                      </div>
                    </div>
                    <div className="flex w-full sm:w-auto gap-2">
                      <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedQP(qp);
                      setQpDetail(null);
                      fetchQPDetail(qp.id);
                      setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto h-12 sm:h-9 text-[18px] sm:text-sm font-semibold bg-primary text-white hover:bg-primary/90 hover:text-white sm:font-semibold">
                    
                        <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                        View
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
      </Card>
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
          className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[90vw] max-w-[720px] h-[80vh] max-h-[80vh] rounded-lg flex flex-col`}>
          
          <DialogHeader>
            <DialogTitle className={`pr-8 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Review QP: {selectedQP?.subject} - {selectedQP?.test_type} {selectedQP?.set_number}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto custom-scrollbar px-4 py-2 space-y-4 flex-1">
            {detailLoading ?
            <div className="space-y-4">
                <SkeletonCard className="h-40 w-full" />
                <SkeletonList items={3} />
              </div> :
            qpDetail ?
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold mb-4">Question Paper Preview</h4>
                <div className="space-y-4">
                  {qpDetail.questions.map((q: any, qIndex: number) =>
                <div key={qIndex} className="space-y-3">
                      {q.subparts.map((s: any, sIndex: number) => {
                    const key = `${qIndex}-${sIndex}`;
                    const isExpanded = !!expanded[key];
                    const content = s.content || '';
                    const shortContent = content.length > 160 ? content.slice(0, 160) + '...' : content;

                    return (
                      <div key={sIndex} className="border rounded-md p-3 bg-white dark:bg-gray-900">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-medium text-sm">
                                {q.question_number}{s.subpart_label}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="text-sm text-gray-900 dark:text-gray-100 mb-1 flex-1">
                                    {isExpanded ? content : shortContent}
                                  </div>
                                  <div className="ml-2 flex-shrink-0">
                                    <Badge className="text-black font-semibold text-sm bg-transparent">{s.max_marks}m</Badge>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge className="text-black bg-transparent">CO: {q.co}</Badge>
                                  <Badge className="text-black bg-transparent">{q.blooms_level}</Badge>
                                  {content.length > 160 &&
                              <button
                                onClick={() => toggleExpanded(key)}
                                className="text-sm text-primary-600 dark:text-primary-400 ml-2">
                                
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                              }
                                </div>
                              </div>
                            </div>
                          </div>);

                  })}
                    </div>
                )}

                  <div className="font-semibold pt-2 border-t">
                    Total Marks: {qpDetail.questions.reduce((total: number, q: any) =>
                  total + q.subparts.reduce((subTotal: number, s: any) => subTotal + s.max_marks, 0), 0
                  )}
                  </div>
                </div>
              </div> :

            <div className="text-center py-4 text-muted-foreground">Failed to load QP details</div>
            }

            {selectedQP?.has_exam_started && (
              <div className={`p-3 rounded-md border text-sm mb-4 ${
                theme === 'dark' 
                  ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                ⚠️ <strong>Exam Locked:</strong> This exam started on {selectedQP.exam_start ? new Date(selectedQP.exam_start).toLocaleString() : 'N/A'}. Question paper approvals and actions are disabled.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a final comment..."
                rows={3} />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-row gap-2 w-full sm:w-auto">
              {/* Show Finalize & Approve for all statuses EXCEPT already-approved — COE can re-approve rejected/sent-back QPs */}
              {selectedQP?.status !== 'approved' && (
                <Button
                  onClick={() => selectedQP && handleFinalize(selectedQP.id)}
                  disabled={actionLoading || selectedQP?.has_exam_started}
                  className={`flex-1 sm:w-auto justify-center transition-none text-xs px-2 h-10 sm:h-9 ${theme === 'dark' ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20 border' : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100 border'}`}
                >
                  <CheckCircle className={`w-3.5 h-3.5 mr-1 shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  {selectedQP?.status === 'pending_admin' ? (
                    <>
                      <span className="hidden sm:inline">Re-Approve QP</span>
                      <span className="inline sm:hidden">Re-Approve</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Finalize & Approve</span>
                      <span className="inline sm:hidden">Finalize</span>
                    </>
                  )}
                </Button>
              )}

              {/* Show Reject & Send Back for all statuses — COE can reject an approved QP or re-reject */}
              <Button
                onClick={() => selectedQP && handleReject(selectedQP.id)}
                disabled={actionLoading || selectedQP?.has_exam_started}
                className={`flex-1 sm:w-auto justify-center transition-none text-xs px-2 h-10 sm:h-9 ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20 border' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100 border'}`}
              >
                <XCircle className={`w-3.5 h-3.5 mr-1 shrink-0 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                {selectedQP?.status === 'approved' ? (
                  <>
                    <span className="hidden sm:inline">Revoke & Send Back</span>
                    <span className="inline sm:hidden">Revoke</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Reject & Send Back</span>
                    <span className="inline sm:hidden">Reject</span>
                  </>
                )}
              </Button>
            </div>

            {qpDetail && (
              <div className="w-full sm:w-auto sm:ml-auto">
                <Button
                  onClick={downloadPDF}
                  disabled={downloadingPDF}
                  className="w-full sm:w-auto justify-center whitespace-normal text-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50"
                >
                  {downloadingPDF ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  {downloadingPDF ? "Downloading..." : "Export PDF"}
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