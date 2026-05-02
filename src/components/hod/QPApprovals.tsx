import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Download } from "lucide-react";
import { SkeletonTable } from "../ui/skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { API_ENDPOINT } from "../../utils/config";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface QPPending {
  id: number;
  subject: string;
  test_type: string;
  faculty: string;
  submitted_at: string;
  branch?: { id: number | null; name: string | null };
  status?: string;
  current_holder?: string | null;
  last_action?: { actor?: string; role?: string; action?: string; comment?: string } | null;
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
  DialogFooter,
} from "../ui/dialog";

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
    }
  }, []);

  useEffect(() => {
    fetchPendingQPs(currentPage);
  }, [currentPage]);

  const fetchPendingQPs = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/hod-pending/?page=${page}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const responseData = await response.json();
      
      const hasResults = responseData && typeof responseData === 'object' && 'results' in responseData;
      const dataSource = hasResults ? responseData.results : (Array.isArray(responseData.data) ? responseData.data : []);
      
      setPendingQPs(dataSource);
      
      if (hasResults && responseData.count) {
        setTotalPages(Math.ceil(responseData.count / 10));
        setTotalCount(responseData.count);
      } else {
        setTotalPages(1);
        setTotalCount(dataSource.length);
      }
    } catch (error) {
      console.error("Error fetching pending QPs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQPDetail = async (qpId: number) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-detail/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
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
      console.error("Error fetching QP detail:", error);
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
        `Faculty: ${qpDetail.faculty}`,
      ];
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
            try { doc.setFont(undefined, 'bold'); } catch (e) {}
            doc.text(`${s.max_marks}m`, pageWidth - margin, y, { align: 'right' });
            try { doc.setFont(undefined, 'normal'); } catch (e) {}
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
      console.error('Error generating PDF:', err);
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
      target: document.body,
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try { MySwal.close(); } catch (e) {}
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-approve/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      });
      const data = await response.json();
      if (data.success) {
        try { MySwal.close(); } catch (e) {}
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
      console.error("Error approving QP:", error);
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
      target: document.body,
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try { MySwal.close(); } catch (e) {}
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-reject/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      });
      const data = await response.json();
      if (data.success) {
        try { MySwal.close(); } catch (e) {}
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
      console.error("Error rejecting QP:", error);
      toast({ title: 'Network error', description: 'Network error while rejecting QP.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && pendingQPs.length === 0) {
    return (
      <Card className="p-6">
        <SkeletonTable rows={5} cols={4} />
      </Card>
    );
  }

  return (
    <div className={`w-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card border border-border flex flex-col h-[calc(100vh-280px)] min-h-[550px]' : 'bg-white border border-gray-200 flex flex-col h-[calc(100vh-280px)] min-h-[550px]'}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Question Paper Approvals</CardTitle>
              <div className="flex items-center gap-3">
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Review and approve question papers from your department faculty</p>
                {totalCount > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {totalCount} Total
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden px-4 sm:px-6 pt-0">
          <div className="h-full overflow-y-auto custom-scrollbar border rounded-md p-4">
            {pendingQPs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                <p className="text-lg">No pending QPs for approval.</p>
                <p className="text-sm">Check back later for new submissions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingQPs.map((qp) => (
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
                          {qp.branch && (
                            <p className="text-sm flex items-center gap-2">
                              <span className="text-muted-foreground font-medium">Branch:</span>
                              <span className="truncate">{qp.branch.name}</span>
                            </p>
                          )}
                        </div>

                        {qp.last_action && (
                          <div className={`mt-3 p-2 rounded text-xs ${theme === 'dark' ? 'bg-muted/30' : 'bg-white border'}`}>
                            <p className="font-medium mb-1">Last Action: {qp.last_action.action}</p>
                            <p className="text-muted-foreground italic line-clamp-2">
                              "{qp.last_action.comment || 'No comment provided'}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full gap-1.5 ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-white border-gray-300'}`}
                          onClick={() => handleReview(qp)}
                        >
                          <Eye className="w-4 h-4" />
                          Review & Action
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-border">
            <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
              Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
              >
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                  if (pageNum < 1) pageNum = i + 1;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={loading}
                      className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-primary text-white' : ''}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

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
          className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[720px] w-[90vw] mx-4 rounded-lg flex flex-col max-h-[92vh]`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Review QP: {selectedQP?.subject} - {selectedQP?.test_type}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto px-4 py-2 space-y-4 flex-1">
            {detailLoading ? (
              <div className="text-center py-4">Loading QP details...</div>
            ) : qpDetail ? (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-semibold mb-4">Question Paper Preview</h4>
                  <div className="space-y-4">
                    {qpDetail.questions.map((q, qIndex) => (
                      <div key={qIndex} className="space-y-3">
                        {q.subparts.map((s, sIndex) => {
                          const key = `${qIndex}-${sIndex}`;
                          const isExpanded = !!expanded[key];
                          const shortContent = (s.content || '').length > 160 ? (s.content || '').slice(0, 160) + '…' : (s.content || '');
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
                                    {((s.content || '').length > 160) && (
                                      <button onClick={() => toggleExpanded(key)} className="text-sm text-primary-600 dark:text-primary-400 ml-2">
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
                    ))}
                    <div className="font-semibold pt-2 border-t">
                      Total Marks: {qpDetail.questions.reduce((total, q) => 
                        total + q.subparts.reduce((subTotal, s) => subTotal + s.max_marks, 0), 0
                      )}
                    </div>
                  </div>
                </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Failed to load QP details
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the faculty..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => selectedQP && handleApprove(selectedQP.id)}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-600 text-white w-full sm:w-auto justify-center transition-none"
              >
                <CheckCircle className="w-4 h-4 mr-1 hidden sm:inline-block" />
                <span className="whitespace-normal">Approve</span>
              </Button>
              <Button
                onClick={() => selectedQP && handleReject(selectedQP.id)}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-600 text-white w-full sm:w-auto justify-center transition-none"
              >
                <XCircle className="w-4 h-4 mr-1 hidden sm:inline-block" />
                <span className="whitespace-normal">Reject</span>
              </Button>
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
    </div>
  );
};

export default QPApprovals;