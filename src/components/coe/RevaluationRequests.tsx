import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Swal from 'sweetalert2';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, Download, Eye, XCircle, Search } from 'lucide-react';
import { getRevaluationRequests, getExamRequestFilters, getSemesters, RevaluationRequest, ExamRequestFilters, toggleRevalApplications } from '@/utils/coe_api';
import { paginationToUI } from '@/utils/paginationToUI';
import { fetchWithTokenRefresh } from '@/utils/authService';
import { downloadFileViaBackendProxy } from '@/utils/common_api';
import { API_ENDPOINT } from '@/utils/config';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';

const EXAM_PERIODS = [
  { value: 'june_july', label: 'June/July' },
  { value: 'nov_dec', label: 'November/December' },
  { value: 'jan_feb', label: 'January/February' },
  { value: 'apr_may', label: 'April/May' },
  { value: 'supplementary', label: 'Supplementary' }];


const RevaluationRequests = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<RevaluationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExamRequestFilters | null>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RevaluationRequest | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [revalApplicationsOpen, setRevalApplicationsOpen] = useState<boolean>(false);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [togglingReval, setTogglingReval] = useState<boolean>(false);

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isExamPeriodOpen, setIsExamPeriodOpen] = useState(false);

  useEffect(() => {
    loadFilters();
    // Don't load requests on initial mount - wait for filters to be selected
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  useEffect(() => {
    // Load requests if search term is entered OR if all dropdown filters are selected
    if (debouncedSearch || (batchId && batchId !== 'all' && branchId && branchId !== 'all' && semesterId && semesterId !== 'all' && examPeriod && examPeriod !== 'all')) {
      // Reset to page 1 when filters change
      setCurrentPage(1);
      loadRequests(1);
    } else {
      // Clear requests if filters are not complete and no search is entered
      setRequests([]);
      setTotalCount(0);
      setTotalPages(0);
      setRevalApplicationsOpen(false);
      setUploadId(null);
    }
  }, [batchId, branchId, semesterId, examPeriod, status, debouncedSearch]);

  useEffect(() => {
    // Reload requests when page or page size changes
    if (debouncedSearch || (batchId && batchId !== 'all' && branchId && branchId !== 'all' && semesterId && semesterId !== 'all' && examPeriod && examPeriod !== 'all')) {
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
      if (debouncedSearch) params.search = debouncedSearch;

      const result = await getRevaluationRequests(params);
      if (result.success && result.data) {
        setRequests(result.data.requests || []);
        // Update pagination state using helper that covers multiple shapes
        const uiPag = paginationToUI(result.data, result.data.requests || [], pageSize);
        setTotalCount(uiPag.total_items || 0);
        setTotalPages(uiPag.total_pages || 1);
        setRevalApplicationsOpen(!!result.data.reval_applications_open);
        setUploadId(result.data.upload_id || null);
      }
    } catch (error) {

      toast.error('Failed to load revaluation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRevalWindow = async () => {
    if (!uploadId) return;
    setTogglingReval(true);
    try {
      const res = await toggleRevalApplications(uploadId);
      if (res.success) {
        setRevalApplicationsOpen(!!res.reval_applications_open);
        toast.success(res.message || 'Updated revaluation status successfully');
      } else {
        toast.error(res.message || 'Failed to update revaluation status');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setTogglingReval(false);
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

      setSemesters([]);
    }
  };

  const getAvailableSemesters = () => {
    return semesters;
  };

  return (
    <div ref={ref} id="coe-revaluation-requests-container" className="space-y-6">
      <Card id="coe-revaluation-requests-filters">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            Revaluation Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <Label htmlFor="batch">Batch</Label>
              <Select value={batchId} onValueChange={(value) => {
                setBatchId(value);
                setBranchId('');
                setSemesterId('');
                setExamPeriod('');
                setStatus('');
                setSearch('');
                setDebouncedSearch('');
                setTimeout(() => setIsBranchOpen(true), 150);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {filters?.batches.map((batch) =>
                    <SelectItem key={batch.id} value={batch.id.toString()}>{batch.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={branchId} onValueChange={(value) => {
                setBranchId(value);
                setSemesterId('');
                setSearch('');
                setDebouncedSearch('');
                fetchSemesters(value);
                setTimeout(() => setIsSemesterOpen(true), 150);
              }} open={isBranchOpen} onOpenChange={setIsBranchOpen} disabled={!batchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {filters?.branches.map((branch) =>
                    <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select value={semesterId} onValueChange={(value) => {
                setSemesterId(value);
                setSearch('');
                setDebouncedSearch('');
                setTimeout(() => setIsExamPeriodOpen(true), 150);
              }} disabled={!branchId} open={isSemesterOpen} onOpenChange={setIsSemesterOpen}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSemesters().map((semester) =>
                    <SelectItem key={semester.id} value={semester.id.toString()}>{semester.number}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="examPeriod">Exam Period</Label>
              <Select value={examPeriod} onValueChange={setExamPeriod} open={isExamPeriodOpen} onOpenChange={setIsExamPeriodOpen} disabled={!semesterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam period" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_PERIODS.map((period) =>
                    <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={!examPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photocopy">Photocopy Only</SelectItem>
                  <SelectItem value="revaluation">Revaluation Only</SelectItem>
                  <SelectItem value="both">Both Photocopy & Reval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-4 mb-0">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                <Input
                  id="search"
                  placeholder="Search by name, USN, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-16" />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      {!debouncedSearch && (!batchId || batchId === 'all' || !branchId || branchId === 'all' || !semesterId || semesterId === 'all' || !examPeriod || examPeriod === 'all') ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-primary/5 p-6 rounded-full mb-4">
              <Search className="w-12 h-12 text-primary/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Select filters to view requests</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Please select a batch, branch, semester, and exam period from the dropdowns above to load the revaluation requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            {/* Revaluation applications window control */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold">Revaluation Application Window</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Control student submissions for the selected batch, branch, semester, and exam period.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  {revalApplicationsOpen ? (
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                      Active / Open
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                      Inactive / Closed
                    </Badge>
                  )}
                </div>
                {uploadId ? (
                  <Button
                    onClick={async () => {
                      const result = await Swal.fire({
                        title: revalApplicationsOpen ? 'Close Revaluation Applications?' : 'Open Revaluation Applications?',
                        text: revalApplicationsOpen
                          ? 'Students will no longer be able to submit revaluation requests.'
                          : 'Students will be able to submit revaluation requests.',
                        icon: revalApplicationsOpen ? 'warning' : 'question',
                        showCancelButton: true,
                        confirmButtonColor: revalApplicationsOpen ? '#ef4444' : '#22c55e',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: revalApplicationsOpen ? 'Yes, Close' : 'Yes, Open',
                        cancelButtonText: 'Cancel',
                      });
                      if (result.isConfirmed) handleToggleRevalWindow();
                    }}
                    disabled={togglingReval}
                    variant={revalApplicationsOpen ? "destructive" : "default"}
                    size="sm"
                    className="font-medium shadow-sm transition-all animate-in fade-in duration-200"
                  >
                    {togglingReval ? 'Updating...' : revalApplicationsOpen ? 'Close Applications' : 'Open Applications'}
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground italic max-w-xs text-right">
                    No result batch found. Create the result upload batch first to manage applications.
                  </div>
                )}
              </div>
            </div>

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
                      <TableCell colSpan={7} className="p-0 border-none">
                        <SkeletonTable rows={pageSize} cols={7} />
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
                              onClick={() => setSelectedRequest(request)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {request.attachment && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFileViaBackendProxy(request.attachment!, `${request.student_usn}_${request.subject_code}_Photocopy`)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
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
                    Showing {requests.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                  </span>
                </div>
              </div>

              <Pagination className="w-auto m-0 justify-end">
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
            </CardFooter>
          )}
        </Card>
      )}

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[720px] w-[calc(100vw-2rem)] sm:w-[90vw] rounded-lg flex flex-col max-h-[92vh]`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Revaluation Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest &&
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
              {selectedRequest.response_note &&
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Response Note</Label>
                  <p className={`mt-1 rounded-md p-3 whitespace-pre-wrap ${theme === 'dark' ? 'bg-muted/20' : 'bg-gray-50 border border-gray-200'}`}>{selectedRequest.response_note}</p>
                </div>
              }
              {selectedRequest.processed_by &&
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Processed By</Label>
                  <p>{selectedRequest.processed_by}</p>
                  {selectedRequest.processed_at &&
                    <p className="text-sm text-muted-foreground">
                      on {new Date(selectedRequest.processed_at).toLocaleString()}
                    </p>
                  }
                </div>
              }
              {/* Photocopy upload UI for approved requests that include photocopy type and lack attachment */}
              {selectedRequest && selectedRequest.types?.includes('photocopy') && selectedRequest.status === 'approved' && !selectedRequest.attachment &&
                <div>
                  <Label className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Upload Photocopy</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
                            toast.error('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.');
                            e.target.value = '';
                            setUploadFile(null);
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Photocopy file size must be below 5MB');
                            e.target.value = '';
                            setUploadFile(null);
                            return;
                          }
                        }
                        setUploadFile(file);
                      }}
                    />
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
                            setShowSuccessDialog(true);
                          } else {
                            toast.error(json.message || 'Upload failed');
                          }
                        } catch (err) {

                          toast.error('Upload failed');
                        }
                        setUploading(false);
                        setUploadFile(null);
                      }}>

                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              }
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Upload Confirmation Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-sm rounded-lg`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Upload Successful</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm">The photocopy has been uploaded successfully.</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-primary hover:bg-primary/90 text-white w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>);

});

RevaluationRequests.displayName = 'RevaluationRequests';

export default RevaluationRequests;