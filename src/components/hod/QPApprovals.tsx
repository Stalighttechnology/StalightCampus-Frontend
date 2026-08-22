import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
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
interface QPPending {
  id: number;
  subject: string;
  test_type: string;
  set_number?: string;
  faculty: string;
  submitted_at: string;
  branch?: { id: number | null; name: string | null; };
  status?: string;
  current_holder?: string | null;
  last_action?: { actor?: string; role?: string; action?: string; comment?: string; timestamp?: string; } | null;
}

interface QPDetail {
  id: number;
  subject: string;
  test_type: string;
  set_number?: string;
  faculty: string;
  questions: Array<{
    question_number: string;
    co: string;
    blooms_level: string;
    subparts: Array<{
      subpart_label: string;
      content: string;
      max_marks: number;
    }>;
  }>;
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
          test_type: qp.test_type,
          set_number: qp.set_number,
          faculty: qp.faculty,
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
            className={`qp-dialog-content ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[760px] w-[92%] rounded-lg flex flex-col max-h-[85vh]`}>
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
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/60">
                    <h4 className="font-semibold mb-4">Question Paper Preview</h4>
                    <div className="space-y-4">
                      {qpDetail.questions.map((q, qIndex) =>
                        <div key={qIndex} className="space-y-3">
                          {q.subparts.map((s, sIndex) => {
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
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="font-semibold pt-2 border-t flex items-center justify-between">
                        <span>Total Marks:</span>
                        <span className="text-lg font-bold text-primary">
                          {qpDetail.questions.reduce((total, q) =>
                            total + q.subparts.reduce((subTotal, s) => subTotal + (s.max_marks || 0), 0), 0
                          )}
                        </span>
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