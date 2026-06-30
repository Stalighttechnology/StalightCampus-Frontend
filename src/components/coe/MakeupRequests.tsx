import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Swal from 'sweetalert2';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Clock, Download, Eye, XCircle, Search } from 'lucide-react';
import { getMakeupRequests, getExamRequestFilters, updateMakeupRequestStatus, getSemesters, toggleMakeupApplications, MakeupRequest, ExamRequestFilters } from '@/utils/coe_api';
import { paginationToUI } from '@/utils/paginationToUI';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/utils/config';

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


const MakeupRequests = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<MakeupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExamRequestFilters | null>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MakeupRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [processing, setProcessing] = useState(false);
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

  // Makeup window state
  const [makeupApplicationsOpen, setMakeupApplicationsOpen] = useState<boolean>(false);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [togglingMakeup, setTogglingMakeup] = useState(false);

  useEffect(() => {
    loadFilters();
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
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

      const result = await getMakeupRequests(params);
      if (result.success && result.data) {
        setRequests(result.data.requests || []);
        const uiPag = paginationToUI(result.data, result.data.requests || [], pageSize);
        setTotalCount(uiPag.total_items || 0);
        setTotalPages(uiPag.total_pages || 1);
        // Update makeup window state
        if (typeof (result.data as any).makeup_applications_open === 'boolean') {
          setMakeupApplicationsOpen((result.data as any).makeup_applications_open);
        }
        if ((result.data as any).upload_id) {
          setUploadId((result.data as any).upload_id);
        }
      }
    } catch (error) {

      toast.error('Failed to load makeup requests');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMakeup = async () => {
    if (!uploadId) {
      toast.error('Please select all filters (batch, branch, semester, exam period) first to toggle the makeup window.');
      return;
    }
    try {
      setTogglingMakeup(true);
      const result = await toggleMakeupApplications(uploadId);
      if (result.success) {
        setMakeupApplicationsOpen(result.makeup_applications_open ?? !makeupApplicationsOpen);
        toast.success(result.message || (result.makeup_applications_open ? 'Makeup applications opened' : 'Makeup applications closed'));
      } else {
        Swal.fire({
          title: 'Cannot Open Makeup Exams',
          text: result.message || 'Failed to toggle makeup window',
          icon: 'error',
          confirmButtonText: 'Understood'
        });
      }
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.message) {
        Swal.fire({
          title: 'Cannot Open Makeup Exams',
          text: error.response.data.message,
          icon: 'error',
          confirmButtonText: 'Understood'
        });
      } else {
        toast.error('Failed to toggle makeup window');
      }
    } finally {
      setTogglingMakeup(false);
    }
  };

  const handleAction = async (request: MakeupRequest, action: 'approve' | 'reject') => {
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
      const result = await updateMakeupRequestStatus(
        selectedRequest.id,
        actionType === 'approve' ? 'approved' : 'rejected',
        responseNote
      );

      if (result.success) {
        toast.success(`Makeup request ${actionType}d successfully`);
        // Update the request status in local state instead of refetching
        setRequests((prevRequests) =>
        prevRequests.map((req) =>
        req.id === selectedRequest.id ?
        { ...req, status: actionType === 'approve' ? 'approved' : 'rejected' } :
        req
        )
        );
        setActionDialogOpen(false);
        loadRequests(); // Refresh the list
      } else {
        toast.error(result.message || 'Failed to update request');
      }
    } catch (error) {

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
          .makeup-window-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .makeup-window-actions {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
        }
      `}</style>
      <div ref={ref} id="coe-makeup-requests-container" className="space-y-6">
      <Card id="coe-makeup-requests-filters">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>
              Makeup Exam Requests
            </CardTitle>
          </div>
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
              <Label htmlFor="exam-period">Exam Period</Label>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
              Please select a batch, branch, semester, and exam period from the dropdowns above to load the makeup exam requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            {/* Makeup Application Window Toggle (Placed Above Table) */}
            <div className="makeup-window-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold">Makeup Application Window</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Control student submissions for the selected batch, branch, semester, and exam period.
                </p>
              </div>
              <div className="makeup-window-actions flex flex-row items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                  <span className="text-sm font-medium">Status:</span>
                  {makeupApplicationsOpen ? (
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
                        title: makeupApplicationsOpen ? 'Close Makeup Applications?' : 'Open Makeup Applications?',
                        text: makeupApplicationsOpen
                          ? 'Students will no longer be able to submit makeup exam requests.'
                          : 'Students will be able to submit makeup exam requests.',
                        icon: makeupApplicationsOpen ? 'warning' : 'question',
                        showCancelButton: true,
                        confirmButtonColor: makeupApplicationsOpen ? '#ef4444' : '#22c55e',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: makeupApplicationsOpen ? 'Yes, Close' : 'Yes, Open',
                        cancelButtonText: 'Cancel',
                      });
                      if (result.isConfirmed) handleToggleMakeup();
                    }}
                    disabled={togglingMakeup}
                    variant={makeupApplicationsOpen ? "destructive" : "default"}
                    size="sm"
                    className="w-full sm:w-auto font-medium shadow-sm transition-all"
                  >
                    {togglingMakeup ? 'Updating...' : makeupApplicationsOpen ? 'Close Applications' : 'Open Applications'}
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
                    <TableHead className={theme === 'dark' ? 'font-semibold text-foreground' : 'font-semibold text-slate-900'}>Exam Period</TableHead>
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
                          <h4 className="text-base font-semibold mb-1">No makeup requests found</h4>
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
                            {request.section && ` / ${request.section}`}
                          </div>
                        </TableCell>
                        <TableCell>{request.exam_period}</TableCell>
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
                                onClick={() => window.open(request.attachment!, '_blank')}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAction(request, 'approve')}
                                  className="text-green-700 border-green-600 hover:bg-green-100">
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAction(request, 'reject')}
                                  className="text-red-700 border-red-600 hover:bg-red-100">
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
 
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-xl bg-transparent">
                  <div className="bg-primary/5 p-4 rounded-full mb-3">
                    <Search className="w-8 h-8 text-primary/45" />
                  </div>
                  <h4 className="text-base font-semibold mb-1">No makeup requests found</h4>
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
                          onClick={() => window.open(request.attachment!, '_blank')}
                          className="flex-1 h-9 justify-center items-center gap-1.5 text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" /> Document
                        </Button>
                      )}
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(request, 'approve')}
                            className="flex-1 h-9 text-green-700 border-green-600 hover:bg-green-50 hover:text-green-800 justify-center items-center text-xs font-semibold"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(request, 'reject')}
                            className="flex-1 h-9 text-red-700 border-red-600 hover:bg-red-50 hover:text-red-800 justify-center items-center text-xs font-semibold"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
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
      <Dialog open={!!selectedRequest && !actionDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border shadow-2xl' : 'bg-white text-gray-900 border border-gray-200 shadow-2xl'} max-w-[640px] w-[calc(100vw-2rem)] sm:w-[90vw] rounded-2xl flex flex-col max-h-[85vh] p-0 overflow-hidden`}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
            <DialogHeader>
              <DialogTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-lg font-semibold`}>
                Makeup Request Details
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

              {/* Reason for makeup */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reason for request</span>
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

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={handleActionDialogOpenChange}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[90vw] max-w-[90%] sm:max-w-md mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-lg font-semibold`}>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Makeup Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`p-4 rounded-md ${actionType === 'approve' ? 'bg-green-50 border border-green-200 text-green-700 space-y-2' : 'bg-red-50 border border-red-200 text-red-700 space-y-2'}`}>
              <Label htmlFor="response-note">Response Note (Optional)</Label>
              <Textarea
                id="response-note"
                placeholder="Add a note for the student..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)} />
              
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className={theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'} onClick={() => handleActionDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitAction}
                disabled={processing}
                variant="outline"
                className={actionType === 'approve' ? 'text-green-700 border-green-600 hover:bg-green-100' : 'text-red-700 border-red-600 hover:bg-red-100'}>
                
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </>
  );

});

MakeupRequests.displayName = 'MakeupRequests';

export default MakeupRequests;