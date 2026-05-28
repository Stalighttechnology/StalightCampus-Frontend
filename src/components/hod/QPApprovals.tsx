import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Download, ClipboardCheck } from "lucide-react";
import { SkeletonTable } from "../ui/skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { API_ENDPOINT } from "../../utils/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
interface QPPending {
  id: number;
  subject: string;
  test_type: string;
  faculty: string;
  submitted_at: string;
  branch?: {id: number | null;name: string | null;};
  status?: string;
  current_holder?: string | null;
  last_action?: {actor?: string;role?: string;action?: string;comment?: string;} | null;
}

interface QPDetail {
  id: number;
  subject: string;
  test_type: string;
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
  DialogFooter } from
"../ui/dialog";

const QPApprovals = () => {
  const [pendingQPs, setPendingQPs] = useState<QPPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQP, setSelectedQP] = useState<QPPending | null>(null);
  const [qpDetail, setQpDetail] = useState<QPDetail | null>(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const toggleExpanded = (key: string) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
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
    }}, []);

  useEffect(() => {
    fetchPendingQPs(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchHistoryQPs(historyPage);
  }, [historyPage]);

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
    try {
      const jspdfModule: any = await import('jspdf');
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default || jspdfModule;
      const doc: any = new jsPDF();
      let y = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;

      doc.setFontSize(16);
      doc.text('Question Paper', margin, y);
      y += 10;

      doc.setFontSize(12);
      const headerLines = [
      `Subject: ${qpDetail.subject}`,
      `Test Type: ${qpDetail.test_type}`,
      `Faculty: ${qpDetail.faculty}`];

      headerLines.forEach((ln: string) => {
        const lines = doc.splitTextToSize(ln, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 6;
      });

      y += 4;

      let totalMarks = 0;
      (qpDetail.questions || []).forEach((q: any) => {
        (q.subparts || []).forEach((s: any) => {
          totalMarks += s.max_marks || 0;
        });
      });

      (qpDetail.questions || []).forEach((q: any) => {
        (q.subparts || []).forEach((s: any) => {
          const qLabel = `${q.question_number}${s.subpart_label}. `;
          const content = qLabel + (s.content || '');
          const contentLines = doc.splitTextToSize(content, maxWidth);

          // page break safety
          if (y + Math.max(1, contentLines.length) * 6 + 60 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            y = margin;
          }

          doc.setFontSize(12);
          const lineHeight = 6;

          if (contentLines.length > 0) {
            // write first line and place marks at the right end of the same line
            doc.text(contentLines[0], margin, y);
            try {doc.setFont(undefined, 'bold');} catch (e) {}
            doc.text(`${s.max_marks}m`, pageWidth - margin, y, { align: 'right' });
            try {doc.setFont(undefined, 'normal');} catch (e) {}
            y += lineHeight;
          }

          if (contentLines.length > 1) {
            const remaining = contentLines.slice(1);
            doc.text(remaining, margin, y);
            y += remaining.length * lineHeight;
          }

          // CO and Blooms on next line(s)
          doc.setFontSize(10);
          const metaText = `CO: ${q.co}  Blooms: ${q.blooms_level}`;
          const metaLines = doc.splitTextToSize(metaText, maxWidth);
          doc.text(metaLines, margin, y);
          y += metaLines.length * lineHeight + 6;
        });
      });

      if (y + 20 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(12);
      doc.text(`Total Marks: ${totalMarks}`, margin, y);
      const fileName = `qp-${(qpDetail.subject || 'qp').replace(/\s+/g, '_')}-${(qpDetail.test_type || 'test').replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {

      toast({ title: 'Error', description: 'Failed to generate PDF.' });
    }
  };

  const handleReview = (qp: QPPending) => {
    setSelectedQP(qp);
    setQpDetail(null);
    setDialogOpen(true);
    fetchQPDetail(qp.id);
  };

  const handleApprove = async (qpId: number) => {
    const result = await MySwal.fire({
      title: 'Confirm approval',
      text: 'Are you sure you want to approve and forward this question paper to Admin?',
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonText: 'Yes, approve',
      cancelButtonText: 'Cancel',
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      target: document.body
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try {MySwal.close();} catch (e) {}
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
        try {MySwal.close();} catch (e) {}
        const t = toast({ title: 'Approved', description: data.message || 'QP approved and forwarded to Admin.' });
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
    const result = await MySwal.fire({
      title: 'Confirm rejection',
      text: 'Are you sure you want to reject this question paper and send it back to Faculty?',
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      confirmButtonText: 'Yes, reject',
      cancelButtonText: 'Cancel',
      target: document.body
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try {MySwal.close();} catch (e) {}
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
        try {MySwal.close();} catch (e) {}
        const t = toast({ title: 'Rejected', description: data.message || 'QP rejected and sent back to Faculty for edits.' });
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

  const renderQPGrid = (qps: QPPending[], isHistory: boolean = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {qps.map((qp) =>
        <Card key={qp.id} className={`p-4 border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card/50 border-border' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className="flex flex-col h-full justify-between gap-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-base line-clamp-2">{qp.subject}</h3>
                <Badge variant="outline" className={theme === 'dark' ? 'border-primary/50 text-primary' : 'border-blue-200 text-blue-700'}>
                  {qp.test_type}
                </Badge>
              </div>

              <div className="space-y-1.5 mb-3">
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
                    <span className="text-muted-foreground font-medium">Branch:</span>
                    <span className="truncate">{qp.branch.name}</span>
                  </p>
                }
              </div>

              {qp.last_action &&
                <div className={`mt-3 p-2 rounded text-xs ${theme === 'dark' ? 'bg-primary/30' : 'bg-primary/5 border'}`}>
                  <p className="font-medium mb-1">Action: {qp.last_action.action}</p>
                  <p className="text-muted-foreground italic line-clamp-2">
                    "{qp.last_action.comment || 'No comment provided'}"
                  </p>
                </div>
              }
              {isHistory && qp.status && (
                <div className="mt-2">
                  <Badge variant="secondary" className="w-full justify-center">Current Status: {qp.status.replace('_', ' ').toUpperCase()}</Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className={`w-full gap-1.5 ${theme === 'dark' ? 'hover:bg-primary/90 hover:text-white bg-primary text-white border-primary' : 'hover:bg-primary/90 hover:text-white bg-primary text-white border-primary'}`}
                onClick={() => handleReview(qp)}>
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
    <div id="hod-qp-approvals-container" className={`w-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Tabs defaultValue="pending" className="w-full">
        <Card className={theme === 'dark' ? 'bg-card border border-border flex flex-col min-h-[550px]' : 'bg-white border border-gray-200 flex flex-col min-h-[550px]'}>
          <CardHeader className="pb-2">
            <div id="qp-approvals-header-section" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className={`mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Question Paper Approvals</CardTitle>
                <div className="flex items-center gap-3">
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Review and track question papers from your department faculty</p>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="pending" className="px-4">Pending Requests</TabsTrigger>
                <TabsTrigger value="history" className="px-4">History</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <TabsContent value="pending" className="flex-1 mt-0">
            <CardContent className="px-4 sm:px-6 pt-0">
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
            {pendingQPs.length > 0 && (
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
            <CardContent className="px-4 sm:px-6 pt-0">
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
            {historyQPs.length > 0 && (
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
          className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[720px] w-[90vw] mx-4 rounded-lg flex flex-col max-h-[92vh] custom-scrollbar`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Review QP: {selectedQP?.subject} - {selectedQP?.test_type}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto px-4 py-2 space-y-4 flex-1">
            {detailLoading ?
            <div className="text-center py-4">Loading QP details...</div> :
            qpDetail ?
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold mb-4">Question Paper Preview</h4>
                <div className="space-y-4">
                  {qpDetail.questions.map((q, qIndex) =>
                <div key={qIndex} className="space-y-3">
                      {q.subparts.map((s, sIndex) => {
                    const key = `${qIndex}-${sIndex}`;
                    const isExpanded = !!expanded[key];
                    const shortContent = (s.content || '').length > 160 ? (s.content || '').slice(0, 160) + '…' : s.content || '';
                    return (
                      <div key={sIndex} className="border rounded-md p-3 bg-white dark:bg-gray-900">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-medium text-sm">
                                {q.question_number}{s.subpart_label}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="text-sm text-gray-900 dark:text-gray-100 mb-1 flex-1">
                                    {isExpanded ? s.content : shortContent}
                                  </div>
                                  <div className="ml-2 flex-shrink-0">
                                    <Badge className="text-black font-semibold text-sm bg-transparent">{s.max_marks}m</Badge>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge className="text-black bg-transparent">CO: {q.co}</Badge>
                                  <Badge className="text-black bg-transparent">{q.blooms_level}</Badge>
                                  {(s.content || '').length > 160 &&
                              <button onClick={() => toggleExpanded(key)} className="text-sm text-primary-600 dark:text-primary-400 ml-2">
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
                    Total Marks: {qpDetail.questions.reduce((total, q) =>
                  total + q.subparts.reduce((subTotal, s) => subTotal + s.max_marks, 0), 0
                  )}
                  </div>
                </div>
              </div> :

            <div className="text-center py-4 text-muted-foreground">
                Failed to load QP details
              </div>
            }

            <div>
              <label className="block text-sm font-medium mb-2">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the faculty..."
                rows={3} />
              
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => selectedQP && handleApprove(selectedQP.id)}
                disabled={actionLoading}
                className={`flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-md transition border whitespace-nowrap w-full sm:w-auto justify-center transition-none ${theme === 'dark' ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'}`}>
                
                <CheckCircle className={`w-4 h-4 mr-1 hidden sm:inline-block ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <span className="whitespace-normal">Approve</span>
              </Button>
              <Button
                onClick={() => selectedQP && handleReject(selectedQP.id)}
                disabled={actionLoading}
                className={`flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-md transition border whitespace-nowrap w-full sm:w-auto justify-center transition-none ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}>
                
                <XCircle className={`w-4 h-4 mr-1 hidden sm:inline-block ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                <span className="whitespace-normal">Reject</span>
              </Button>
              {qpDetail && qpDetail.id && historyQPs.some(q => q.id === qpDetail.id) && (
                <div className="ml-2 flex items-center text-xs text-muted-foreground">
                  (History View)
                </div>
              )}
            </div>
            <div className="ml-auto">
              <Button variant="outline" onClick={() => downloadPDF()} className="bg-transparent hover:bg-transparent w-full sm:w-auto justify-center transition-none">
                <Download className="w-4 h-4 mr-1 hidden sm:inline-block" />
                <span className="whitespace-normal">Download</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog removed — using SweetAlert (MySwal) like Admin page */}
    </div>);

};

export default QPApprovals;