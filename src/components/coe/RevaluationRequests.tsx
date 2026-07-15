import { translateTerminology, getTerm } from "@/utils/institutionConfig";
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
import { API_BASE_URL, API_ENDPOINT } from '@/utils/config';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';

const getPhotoUrl = (photoPath?: string | null) => {
  if (!photoPath) return null;
  return photoPath.startsWith("http") ? photoPath : `${API_BASE_URL}${photoPath}`;
};

const getInitials = (name?: string) => {
  if (!name) return "";
  const cleaned = name.trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const EXAM_PERIODS = [
  { value: 'june_july', label: 'June/July' },
  { value: 'nov_dec', label: 'November/December' },
  { value: 'jan_feb', label: 'January/February' },
  { value: 'apr_may', label: 'April/May' },
  { value: 'sept_oct', label: 'September/October' },
  { value: 'feb_mar', label: 'February/March' },
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
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [selectedImageError, setSelectedImageError] = useState(false);

  useEffect(() => {
    setSelectedImageError(false);
  }, [selectedRequest]);

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
        Swal.fire({
          title: 'Cannot Open Revaluation',
          text: res.message || 'Failed to update revaluation status',
          icon: 'error',
          confirmButtonText: 'Understood'
        });
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        Swal.fire({
          title: 'Cannot Open Revaluation',
          text: err.response.data.message,
          icon: 'error',
          confirmButtonText: 'Understood'
        });
      } else {
        toast.error('An error occurred');
      }
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
    <>
      <style>{`
        @media (max-width: 639px) {
          .reval-window-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .reval-window-actions {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
        }
      `}</style>
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
                <Label htmlFor="branch">{translateTerminology("Branch")}</Label>
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
                <Label htmlFor="semester">{translateTerminology("Semester")}</Label>
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
              <div className="reval-window-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-border">
                <div>
                  <h3 className="text-lg font-semibold">Revaluation Application Window</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Control student submissions for the selected batch, branch, semester, and exam period.
                  </p>
                </div>
                <div className="reval-window-actions flex flex-row items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
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
                      className="w-full sm:w-auto font-medium shadow-sm transition-all animate-in fade-in duration-200"
                    >
                      {togglingReval ? 'Updating...' : revalApplicationsOpen ? 'Close Applications' : 'Open Applications'}
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground italic max-w-xs text-right w-full sm:w-auto">
                      No result batch found. Create the result upload batch first to manage applications.
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className={theme === 'dark' ? 'bg-muted/40 border-b border-border' : 'bg-slate-100 border-b border-slate-200'}>
                      <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Student</TableHead>
                      <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Subject</TableHead>
                      <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Batch/Branch/Sem</TableHead>
                      <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Previous Marks</TableHead>
                      <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Status</TableHead>
                      <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Requested</TableHead>
                      <TableHead className={theme === 'dark' ? 'font-bold text-foreground' : 'font-bold text-slate-900'}>Actions</TableHead>
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
                        <TableCell colSpan={7} className="p-4 border-none">
                          <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-xl bg-transparent">
                            <div className="bg-primary/5 p-4 rounded-full mb-3">
                              <Search className="w-8 h-8 text-primary/45" />
                            </div>
                            <h4 className="text-base font-semibold mb-1">No revaluation requests found</h4>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                              No requests match the selected filters or search criteria.
                            </p>
                          </div>
                        </TableCell>
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
                              CIE: {request.previous_cie ?? 'N/A'}<br />
                              SEE: {request.previous_see ?? 'N/A'}<br />
                              Total: {request.previous_total ?? 'N/A'}
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

              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Loading requests...</div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-xl bg-transparent">
                    <div className="bg-primary/5 p-4 rounded-full mb-3">
                      <Search className="w-8 h-8 text-primary/45" />
                    </div>
                    <h4 className="text-base font-semibold mb-1">No revaluation requests found</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      No requests match the selected filters or search criteria.
                    </p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-white border-slate-200'} space-y-3`}>
                      {/* Student Info & Status */}
                      <div className="flex items-center gap-3">
                        {request.student_profile_pic && !imageErrors[request.id] ? (
                          <img 
                            src={getPhotoUrl(request.student_profile_pic) || undefined} 
                            alt={request.student_name}
                            onError={() => setImageErrors(prev => ({ ...prev, [request.id]: true }))}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/50 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                            {getInitials(request.student_name)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-base leading-tight">{request.student_name}</div>
                          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                            <span>{request.student_usn}</span>
                            {getStatusBadge(request.status)}
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-border/40 my-2" />

                      {/* Details section */}
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-[11.5px] font-bold text-muted-foreground uppercase block tracking-wider mb-0.5">Subject</span>
                          <div className="font-medium text-foreground">{request.subject_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{request.subject_code}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[11.5px] font-bold text-muted-foreground uppercase block tracking-wider mb-0.5">Batch / Sem</span>
                            <div className="text-xs font-semibold text-foreground">{request.batch} / Sem {request.semester}</div>
                          </div>
                          <div>
                            <span className="text-[11.5px] font-bold text-muted-foreground uppercase block tracking-wider mb-0.5">Exam Period</span>
                            <div className="text-xs font-semibold text-foreground">{request.exam_period}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[11.5px] font-bold text-muted-foreground uppercase block tracking-wider mb-0.5">Branch</span>
                            <div className="text-xs font-semibold text-foreground truncate">{request.branch}</div>
                          </div>
                          <div>
                            <span className="text-[11.5px] font-bold text-muted-foreground uppercase block tracking-wider mb-0.5">Requested Date</span>
                            <div className="text-xs font-semibold text-foreground">{new Date(request.requested_at).toLocaleDateString()}</div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-border/30 bg-muted/5 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">CIE</span>
                            <span className="text-xs font-semibold">{request.previous_cie ?? 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">SEE</span>
                            <span className="text-xs font-semibold">{request.previous_see ?? 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Total</span>
                            <span className="text-xs font-semibold">{request.previous_total ?? 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-border/40 my-2" />

                      {/* Action buttons toolbar */}
                      <div className="flex gap-2 w-full pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                          className="flex-1 h-9 justify-center items-center gap-1.5 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                        {request.attachment && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFileViaBackendProxy(request.attachment!, `${request.student_usn}_${request.subject_code}_Photocopy`)}
                            className="flex-1 h-9 justify-center items-center gap-1.5 text-xs font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> Document
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Details Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border shadow-2xl' : 'bg-white text-gray-900 border border-gray-200 shadow-2xl'} w-[90vw] max-w-[640px] h-[80vh] max-h-[80vh] rounded-2xl flex flex-col p-0 overflow-hidden`}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <DialogHeader>
                <DialogTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-lg font-semibold`}>
                  Revaluation Request Details
                </DialogTitle>
              </DialogHeader>
            </div>
            
            {selectedRequest && (
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6 custom-scrollbar">
                {/* Student Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/20 border border-border/40">
                  <div className="flex items-center gap-3">
                    {selectedRequest.student_profile_pic && !selectedImageError ? (
                      <img 
                        src={getPhotoUrl(selectedRequest.student_profile_pic) || undefined} 
                        alt={selectedRequest.student_name}
                        onError={() => setSelectedImageError(true)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0 border border-border/50 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-inner">
                        {getInitials(selectedRequest.student_name)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-foreground text-sm sm:text-base">{selectedRequest.student_name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{selectedRequest.student_usn}</div>
                    </div>
                  </div>
                  <div className="shrink-0 sm:self-center">
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                {/* Grid of properties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/30 bg-muted/5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Subject</span>
                    <div className="font-semibold text-foreground text-sm leading-snug">{selectedRequest.subject_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{selectedRequest.subject_code}</div>
                  </div>

                  <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/30 bg-muted/5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Batch / Semester</span>
                    <div className="text-xs font-semibold text-foreground leading-normal mt-0.5">
                      {selectedRequest.batch} / Sem {selectedRequest.semester}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/30 bg-muted/5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Branch</span>
                    <div className="text-xs font-semibold text-foreground leading-normal mt-0.5">
                      {selectedRequest.branch}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/30 bg-muted/5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Exam Period</span>
                    <div className="text-xs font-semibold text-foreground leading-normal mt-0.5">
                      {selectedRequest.exam_period}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/30 bg-muted/5 sm:col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Requested Date</span>
                    <div className="text-xs font-semibold text-foreground leading-normal mt-0.5">
                      {new Date(selectedRequest.requested_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Previous Marks Grid */}
                <div className="p-3.5 sm:p-5 rounded-xl border border-border/30 bg-muted/5 space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Previous Marks</span>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">CIE</span>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{selectedRequest.previous_cie ?? 'N/A'}</span>
                    </div>
                    <div className="border-x border-border/50">
                      <span className="text-xs text-muted-foreground block mb-0.5">SEE</span>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{selectedRequest.previous_see ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Total</span>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{selectedRequest.previous_total ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Request Types */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Request Types</span>
                  <div className={`p-3 rounded-xl text-sm font-semibold border ${theme === 'dark' ? 'bg-muted/15 border-border/50' : 'bg-gray-50 border-gray-100'}`}>
                    {(selectedRequest.types || []).map((type: string) => type === 'photocopy' ? 'Photocopy' : 'Revaluation').join(', ') || '-'}
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reason</span>
                  <div className={`p-3 sm:p-4 rounded-xl text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap border ${theme === 'dark' ? 'bg-muted/15 border-border/50' : 'bg-gray-50 border-gray-100'}`}>
                    {selectedRequest.reason || <span className="italic text-muted-foreground">No reason provided.</span>}
                  </div>
                </div>

                {/* Response Note (If exists) */}
                {selectedRequest.response_note && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Response Note</span>
                    <div className={`p-3 sm:p-4 rounded-xl text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap border ${selectedRequest.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                      {selectedRequest.response_note}
                    </div>
                  </div>
                )}

                {/* Processed By Info */}
                {selectedRequest.processed_by && (
                  <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Processed by: <span className="font-semibold text-foreground/80">{selectedRequest.processed_by}</span>
                    </div>
                    {selectedRequest.processed_at && (
                      <div>
                        {new Date(selectedRequest.processed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Photocopy upload UI */}
                {selectedRequest && selectedRequest.types?.includes('photocopy') && selectedRequest.status === 'approved' && !selectedRequest.attachment && (
                  <div className="pt-4 border-t border-border/40 space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Upload Photocopy</span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="text-xs block w-full text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
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
                        className="bg-primary text-white hover:bg-primary/95 h-9 rounded-xl text-xs font-semibold px-6"
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
                )}
              </div>
            )}

            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end bg-muted/10">
              <Button
                onClick={() => setSelectedRequest(null)}
                className="bg-primary text-white hover:bg-primary/95 px-5 h-9 rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
            </div>
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

    </div>
    </>);

});

RevaluationRequests.displayName = 'RevaluationRequests';

export default RevaluationRequests;