import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, Download, Eye, XCircle } from 'lucide-react';
import { getRevaluationRequests, getExamRequestFilters, updateRevaluationRequestStatus, getSemesters, RevaluationRequest, ExamRequestFilters } from '@/utils/coe_api';
import { fetchWithTokenRefresh } from '@/utils/authService';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';

const EXAM_PERIODS = [
  { value: 'june_july', label: 'June/July' },
  { value: 'nov_dec', label: 'November/December' },
  { value: 'jan_feb', label: 'January/February' },
  { value: 'apr_may', label: 'April/May' },
  { value: 'supplementary', label: 'Supplementary' },
];

const RevaluationRequests = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<RevaluationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExamRequestFilters | null>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RevaluationRequest | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [batchId, setBatchId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [semesterId, setSemesterId] = useState<string>('');
  const [examPeriod, setExamPeriod] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadFilters();
    // Don't load requests on initial mount - wait for filters to be selected
  }, []);

  useEffect(() => {
    // Only load requests when all required filters are selected
    if (batchId && batchId !== 'all' && branchId && branchId !== 'all' && semesterId && semesterId !== 'all' && examPeriod && examPeriod !== 'all') {
      // Reset to page 1 when filters change
      setCurrentPage(1);
      loadRequests(1);
    } else {
      // Clear requests if filters are not complete
      setRequests([]);
      setTotalCount(0);
      setTotalPages(0);
    }
  }, [batchId, branchId, semesterId, examPeriod, status, search]);

  useEffect(() => {
    // Reload requests when page or page size changes (but only if filters are complete)
    if (batchId && batchId !== 'all' && branchId && branchId !== 'all' && semesterId && semesterId !== 'all' && examPeriod && examPeriod !== 'all') {
      loadRequests(currentPage);
    }
  }, [currentPage, pageSize]);

  const loadFilters = async () => {
    try {
      const result = await getExamRequestFilters();
      if (result.success && result.data) {
        setFilters(result.data);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
      toast.error('Failed to load filter options');
    }
  };

  const loadRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page: page,
        page_size: pageSize
      };
      if (batchId && batchId !== 'all') params.batch_id = parseInt(batchId);
      if (branchId && branchId !== 'all') params.branch_id = parseInt(branchId);
      if (semesterId && semesterId !== 'all') params.semester_id = parseInt(semesterId);
      if (examPeriod && examPeriod !== 'all') params.exam_period = examPeriod;
      if (status && status !== 'all') params.status = status;
      if (search) params.search = search;

      const result = await getRevaluationRequests(params);
      if (result.success && result.data) {
        setRequests(result.data.requests || []);
        // Update pagination state
        if (result.data.pagination) {
          setTotalCount(result.data.pagination.count || 0);
          setTotalPages(Math.ceil((result.data.pagination.count || 0) / pageSize));
        } else {
          // Fallback for direct API response
          setTotalCount(result.data.requests?.length || 0);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load revaluation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (request: RevaluationRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setResponseNote('');
    setActionDialogOpen(true);
  };

  const handleActionDialogOpenChange = (open: boolean) => {
    setActionDialogOpen(open);
    if (!open) {
      setSelectedRequest(null);
      setActionType(null);
      setResponseNote('');
    }
  };

  const submitAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setProcessing(true);
      const result = await updateRevaluationRequestStatus(
        selectedRequest.id,
        actionType === 'approve' ? 'approved' : 'rejected',
        responseNote
      );

      if (result.success) {
        toast.success(`Revaluation request ${actionType}d successfully`);
        // Update the request status in local state instead of refetching
        setRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === selectedRequest.id
              ? { ...req, status: actionType === 'approve' ? 'approved' : 'rejected' }
              : req
          )
        );
        setActionDialogOpen(false);
        loadRequests(); // Refresh the list
      } else {
        toast.error(result.message || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = 'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm';

    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className={`${baseClass} border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200`}><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className={`${baseClass} border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200`}><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className={`${baseClass} border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200`}><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline" className={baseClass}>{status}</Badge>;
    }
  };

  const fetchSemesters = async (branchId: string) => {
    if (!branchId) {
      setSemesters([]);
      return;
    }
    try {
      const sems = await getSemesters(parseInt(branchId));
      setSemesters(sems);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setSemesters([]);
    }
  };

  const getAvailableSemesters = () => {
    return semesters;
  };

  return (
    <div ref={ref} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Revaluation Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <Label htmlFor="batch">Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {filters?.batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id.toString()}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={branchId} onValueChange={(value) => { setBranchId(value); setSemesterId(''); fetchSemesters(value); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {filters?.branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select value={semesterId} onValueChange={setSemesterId} disabled={!branchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {getAvailableSemesters().map(semester => (
                    <SelectItem key={semester.id} value={semester.id.toString()}>{semester.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="examPeriod">Exam Period</Label>
              <Select value={examPeriod} onValueChange={setExamPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {EXAM_PERIODS.map(period => (
                    <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, USN, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Requests Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Batch/Branch/Sem</TableHead>
                  <TableHead>Previous Marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : !batchId || batchId === 'all' || !branchId || branchId === 'all' || !semesterId || semesterId === 'all' || !examPeriod || examPeriod === 'all' ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Please select Batch, Branch, Semester, and Exam Period to load revaluation requests
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">No revaluation requests found</TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.student_name}</div>
                          <div className="text-sm text-muted-foreground">{request.student_usn}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.subject_name}</div>
                          <div className="text-sm text-muted-foreground">{request.subject_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.batch} / {request.branch} / Sem {request.semester}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          CIE: {request.previous_cie || 'N/A'}<br />
                          SEE: {request.previous_see || 'N/A'}<br />
                          Total: {request.previous_total || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {request.attachment && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(request.attachment!, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(request, 'approve')}
                                className="text-green-700 border-green-600 hover:bg-green-100"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(request, 'reject')}
                                className="text-red-700 border-red-600 hover:bg-red-100"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="page-size">Items per page:</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {requests.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                </span>
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !actionDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[720px] w-[calc(100vw-2rem)] sm:w-[90vw] rounded-lg flex flex-col max-h-[92vh]`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Revaluation Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 overflow-auto px-1 sm:px-2 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Student</Label>
                  <p className="font-medium">{selectedRequest.student_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.student_usn}</p>
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Subject</Label>
                  <p className="font-medium">{selectedRequest.subject_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.subject_code}</p>
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Batch/Branch/Semester</Label>
                  <p>{selectedRequest.batch} / {selectedRequest.branch} / Sem {selectedRequest.semester}</p>
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Exam Period</Label>
                  <p>{selectedRequest.exam_period}</p>
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Status : </Label>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Requested Date</Label>
                  <p>{new Date(selectedRequest.requested_at).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Request Types</Label>
                <p className={`mt-1 rounded-md p-3 whitespace-pre-wrap ${theme === 'dark' ? 'bg-muted/20' : 'bg-gray-50 border border-gray-200'}`}>
                  {(selectedRequest.types || []).map((type: string) => type === 'photocopy' ? 'Photocopy' : 'Revaluation').join(', ') || '-'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Previous CIE</Label>
                  <p className="font-medium">{selectedRequest.previous_cie || 'N/A'}</p>
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Previous SEE</Label>
                  <p className="font-medium">{selectedRequest.previous_see || 'N/A'}</p>
                </div>
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Previous Total</Label>
                  <p className="font-medium">{selectedRequest.previous_total || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Reason</Label>
                <p className={`mt-1 rounded-md p-3 whitespace-pre-wrap ${theme === 'dark' ? 'bg-muted/20' : 'bg-gray-50 border border-gray-200'}`}>{selectedRequest.reason}</p>
              </div>
              {selectedRequest.response_note && (
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Response Note</Label>
                  <p className={`mt-1 rounded-md p-3 whitespace-pre-wrap ${theme === 'dark' ? 'bg-muted/20' : 'bg-gray-50 border border-gray-200'}`}>{selectedRequest.response_note}</p>
                </div>
              )}
              {selectedRequest.processed_by && (
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Processed By</Label>
                  <p>{selectedRequest.processed_by}</p>
                  {selectedRequest.processed_at && (
                    <p className="text-sm text-muted-foreground">
                      on {new Date(selectedRequest.processed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {/* Photocopy upload UI for approved requests that include photocopy type and lack attachment */}
              {selectedRequest && selectedRequest.types?.includes('photocopy') && selectedRequest.status === 'approved' && !selectedRequest.attachment && (
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Upload Photocopy</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    <Button
                      disabled={!uploadFile || uploading}
                      onClick={async () => {
                        if (!selectedRequest || !uploadFile) return;
                        setUploading(true);
                        try {
                          const form = new FormData();
                          form.append('attachment', uploadFile);
                          const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/revaluation-requests/${selectedRequest.id}/upload-photocopy/`, {
                            method: 'POST',
                            body: form
                          });
                          const json = await res.json();
                          if (json.success && json.revaluation_request) {
                            toast.success('Photocopy uploaded');
                            // refresh list
                            loadRequests(currentPage);
                            setSelectedRequest(json.revaluation_request as RevaluationRequest);
                          } else {
                            toast.error(json.message || 'Upload failed');
                          }
                        } catch (err) {
                          console.error('Upload error', err);
                          toast.error('Upload failed');
                        }
                        setUploading(false);
                        setUploadFile(null);
                      }}
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={handleActionDialogOpenChange}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[80%] sm:max-w-md mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-lg font-semibold`}>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Revaluation Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`p-4 rounded-md ${actionType === 'approve' ? 'bg-green-50 border border-green-200 text-green-700 space-y-2': 'bg-red-50 border border-red-200 text-red-700 space-y-2'}`}>
              <Label htmlFor="response-note" className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Response Note (Optional)</Label>
              <Textarea
                id="response-note"
                placeholder="Add a note for the student..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className={theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'} onClick={() => handleActionDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitAction}
                disabled={processing}
                variant="outline"
                className={actionType === 'approve' ? 'text-green-700 border-green-600 hover:bg-green-100' : 'text-red-700 border-red-600 hover:bg-red-100'}              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

RevaluationRequests.displayName = 'RevaluationRequests';

export default RevaluationRequests;