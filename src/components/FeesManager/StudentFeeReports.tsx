import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Users,
  IndianRupee,
  FileText,
  Eye,
  Download,
  Filter,
  User,
  GraduationCap,
  Building,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  getStudentFeeReport,
  getStudentsFeeReports,
  getFeesManagerFilters,
  getFeesManagerSemesters,
  getFeesManagerSections,
  StudentFeeReport,
  StudentFeeSummary,
  Branch,
  Semester,
  Section,
  sendFeeReminder
} from '../../utils/fees_manager_api';
import { showSuccessAlert, showErrorAlert } from '../../utils/sweetalert';
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


const StudentFeeReports: React.FC = () => {
  // State for individual student search
  const [searchTerm, setSearchTerm] = useState('');
  const [usn, setUsn] = useState('');
  const [studentReport, setStudentReport] = useState<StudentFeeReport | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // State for bulk filtering
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [batches, setBatches] = useState<{ id: number, name: string }[]>([]);
  const [admissionModes, setAdmissionModes] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedAdmissionMode, setSelectedAdmissionMode] = useState<string>('');
  const [bulkReports, setBulkReports] = useState<StudentFeeSummary[]>([]);
  const [cohortStats, setCohortStats] = useState<any>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [pageSize] = useState(10); // Default page size

  // UI state
  const [activeTab, setActiveTab] = useState('individual');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Load filters when bulk tab is selected
  useEffect(() => {
    if (activeTab === 'bulk' && batches.length === 0) {
      loadInitialFilters();
    }
  }, [activeTab, batches.length]);

  const loadInitialFilters = async () => {
    const response = await getFeesManagerFilters();
    if (response.success) {
      setBatches(response.data.batches || []);
      setBranches(response.data.branches || []);
      setAdmissionModes(response.data.admission_modes || []);
    }
  };

  // Load semesters when branch changes
  useEffect(() => {
    if (selectedBranch && selectedBranch !== '') {
      loadSemesters(selectedBranch);
      setSelectedSemester('');
      setSelectedSection('');
      setSemesters([]);
      setSections([]);
    } else if (selectedBranch === '') {
      setSelectedSemester('');
      setSelectedSection('');
      setSemesters([]);
      setSections([]);
    }
  }, [selectedBranch]);

  // Load sections when semester changes
  useEffect(() => {
    if (selectedBranch && selectedBranch !== '' && selectedSemester && selectedSemester !== '') {
      loadSections(selectedBranch, selectedSemester);
      setSelectedSection('');
      setSections([]);
    } else if (selectedSemester === '') {
      setSelectedSection('');
      setSections([]);
    }
  }, [selectedSemester]);


  const loadSemesters = async (branchId: string) => {
    const response = await getFeesManagerSemesters(branchId);
    if (response.success) {
      setSemesters(response.data);
    }
  };

  const loadSections = async (branchId: string, semesterId: string) => {
    const response = await getFeesManagerSections(branchId, semesterId);
    if (response.success) {
      setSections(response.data);
    }
  };

  // Automatic data loading when filters are selected
  useEffect(() => {
    const isAcademicHierarchySelected =
      selectedBatch !== '' &&
      selectedBranch !== '' &&
      selectedSemester !== '' &&
      selectedSection !== '' &&
      selectedAdmissionMode !== '';

    if (isAcademicHierarchySelected) {
      handleBulkSearch(1);
    } else {
      setBulkReports([]);
      setCohortStats(null);
    }
  }, [selectedBatch, selectedBranch, selectedSemester, selectedSection, selectedAdmissionMode]);

  const handleIndividualSearch = async (usn?: string) => {
    const termToSearch = usn || searchTerm.trim();

    // Ensure termToSearch is a string
    const searchTermStr = typeof termToSearch === 'string' ? termToSearch : String(termToSearch);

    if (!searchTermStr.trim()) {
      showErrorAlert('Input Required', 'Please enter a USN or student name');
      return;
    }

    setSearchLoading(true);
    setStudentReport(null);

    const response = await getStudentFeeReport(searchTermStr.trim());
    setSearchLoading(false);

    if (response.success) {
      setStudentReport(response.data);
      if (!usn) {
        // Only update searchTerm if it wasn't passed as a parameter
        setSearchTerm(searchTermStr.trim());
      }
    } else {
      showErrorAlert('Search Failed', response.message || 'Student not found');
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      handleBulkSearch(page);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    handleBulkSearch(1);
  };

  const handleBulkSearch = async (page: number = 1) => {
    setBulkLoading(true);
    setBulkReports([]);

    const batchId = selectedBatch === '' || selectedBatch === 'all' ? undefined : selectedBatch;
    const branchId = selectedBranch === '' || selectedBranch === 'all' ? undefined : selectedBranch;
    const semesterId = selectedSemester === '' || selectedSemester === 'all' ? undefined : selectedSemester;
    const sectionId = selectedSection === '' || selectedSection === 'all' ? undefined : selectedSection;
    const admissionMode = selectedAdmissionMode === '' || selectedAdmissionMode === 'all' ? undefined : selectedAdmissionMode;

    const response = await getStudentsFeeReports(batchId, branchId, semesterId, sectionId, admissionMode, page);

    setBulkLoading(false);

    if (response.success) {
      setBulkReports(response.data.results.students || []);
      setCohortStats(response.data.results.cohort_stats || null);
      setTotalStudents(response.data.results.total_students || 0);
      setTotalPages(Math.ceil((response.data.results.total_students || 0) / pageSize));
      setHasNext(response.data.next !== null);
      setHasPrevious(response.data.previous !== null);
      setCurrentPage(page);
    } else {
      // Handle error - maybe set an error state
      console.error('Failed to load bulk reports:', response.message);
    }
  };

  const handleSendReminder = async (studentId: number, studentName: string) => {
    setSendingReminder(true);

    try {
      const response = await sendFeeReminder(studentId);
      if (response.success) {
        showSuccessAlert('Success', `Fee reminder sent successfully to ${studentName}`);
      } else {
        showErrorAlert('Failed', response.message || `Failed to send reminder to ${studentName}`);
      }
    } catch (error) {
      showErrorAlert('Error', 'An unexpected error occurred while sending the reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Individual Search
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bulk Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Student
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="searchTerm">USN or Student Name</Label>
                  <Input
                    id="searchTerm"
                    placeholder="Enter USN or student name"
                    value={typeof searchTerm === 'string' ? searchTerm : ''}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleIndividualSearch()}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => handleIndividualSearch()}
                    disabled={searchLoading}
                    className="w-full"
                  >
                    {searchLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Searching...
                      </div>
                    ) : 'Search'}
                  </Button>
                </div>
              </div>

              {searchLoading && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <SkeletonCard className="h-32" />
                  <SkeletonStatsGrid items={4} />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <SkeletonTable rows={5} cols={6} />
                </div>
              )}


              {/* Search Error Handled by SweetAlert */}
            </CardContent>
          </Card>

          {/* Student Details View */}
          {studentReport && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 pb-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Student Fee Report</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentReport(null)}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Clear Result
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Student Info */}
                <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-background to-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Student Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <p className="font-semibold text-lg">{studentReport.student.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">USN / ID</Label>
                        <p className="font-mono font-bold text-primary">{studentReport.student.usn}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Branch</Label>
                        <p className="font-medium">{studentReport.student.branch}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Current Semester</Label>
                        <Badge variant="secondary" className="px-3 py-1">Semester {studentReport.student.semester}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fee Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Total Fee</p>
                        <div className="p-2 bg-blue-50 rounded-full">
                          <IndianRupee className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(studentReport.fee_summary.total_fee)}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                        <div className="p-2 bg-green-50 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(studentReport.fee_summary.total_paid)}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                        <div className="p-2 bg-red-50 rounded-full">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(studentReport.fee_summary.total_pending)}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500 shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Custom Fee</p>
                        <div className="p-2 bg-purple-50 rounded-full">
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(studentReport.fee_summary.custom_fee_amount)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Send Notification Section - Only show if there's pending amount */}
                {studentReport.fee_summary.total_pending > 0 && (
                  <Card className="bg-orange-50/50 border-orange-100 shadow-none">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-full">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-orange-900 text-sm">Fee Payment Overdue</p>
                          <p className="text-xs text-orange-700">Send a quick reminder to the student regarding their outstanding balance.</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSendReminder(studentReport.student.id, studentReport.student.name)}
                        disabled={sendingReminder}
                        className="bg-orange-600 hover:bg-orange-700 rounded-xl whitespace-nowrap"
                      >
                        {sendingReminder ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending Notification...
                          </>
                        ) : (
                          <>
                            <IndianRupee className="w-4 h-4 mr-2" />
                            Send Fee Reminder
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}



                {/* Semester-wise Breakdown */}
                {studentReport.semester_wise_breakdown && studentReport.semester_wise_breakdown.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Semester-wise Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentReport.semester_wise_breakdown.map((semester, index) => (
                        <Card key={index} className="overflow-hidden border-muted/40 shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="bg-muted/30 py-3">
                            <CardTitle className="text-md flex justify-between items-center">
                              <span>{semester.semester_name}</span>
                              <Badge variant="outline" className="bg-background">{semester.invoices.length} Invoices</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                                <p className="text-sm font-bold text-blue-600">{formatCurrency(semester.total_fee)}</p>
                              </div>
                              <div className="text-center p-2 bg-green-50/50 rounded-lg border border-green-100">
                                <p className="text-[10px] uppercase text-muted-foreground">Paid</p>
                                <p className="text-sm font-bold text-green-600">{formatCurrency(semester.total_paid)}</p>
                              </div>
                              <div className="text-center p-2 bg-red-50/50 rounded-lg border border-red-100">
                                <p className="text-[10px] uppercase text-muted-foreground">Due</p>
                                <p className="text-sm font-bold text-red-600">{formatCurrency(semester.total_pending)}</p>
                              </div>
                            </div>

                            {/* Invoices List */}
                            {semester.invoices.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Invoices</p>
                                {semester.invoices.map((invoice) => (
                                  <div key={invoice.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-muted/50 text-xs">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">{invoice.invoice_number}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold">{formatCurrency(invoice.total_amount)}</span>
                                      {getStatusBadge(invoice.status)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Invoices Table */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Complete Invoice History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[180px]">Invoice No.</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentReport.invoices.map((invoice) => (
                          <TableRow key={invoice.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell className="text-muted-foreground">{invoice.template_name}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(invoice.total_amount)}</TableCell>
                            <TableCell className="text-green-600 font-medium">{formatCurrency(invoice.paid_amount)}</TableCell>
                            <TableCell className="text-red-600 font-medium">{formatCurrency(invoice.balance_amount)}</TableCell>
                            <TableCell className="text-right">{getStatusBadge(invoice.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Recent Payments */}
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Invoice Reference</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentReport.payment_history.length > 0 ? (
                          studentReport.payment_history.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-muted/20">
                              <TableCell>{new Date(payment.payment_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                              <TableCell className="font-bold text-green-600">{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-normal capitalize">{payment.payment_method}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{payment.invoice_number}</TableCell>
                              <TableCell className="text-right">{getStatusBadge(payment.status)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              No payment records found for this student.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Students
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Batch <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedBatch || undefined}
                    onValueChange={setSelectedBatch}
                  >
                    <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                      <SelectValue placeholder="Choose Batch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id.toString()} className="rounded-lg">
                          {batch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Branch <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedBranch || undefined}
                    onValueChange={setSelectedBranch}
                    disabled={selectedBatch === ''}
                  >
                    <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                      <SelectValue placeholder="Choose Branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()} className="rounded-lg">
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Semester <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedSemester || undefined}
                    onValueChange={setSelectedSemester}
                    disabled={selectedBranch === ''}
                  >
                    <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                      <SelectValue placeholder="Choose Semester" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id.toString()} className="rounded-lg">
                          Semester {semester.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Section <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedSection || undefined}
                    onValueChange={setSelectedSection}
                    disabled={selectedSemester === ''}
                  >
                    <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                      <SelectValue placeholder="Choose Section" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()} className="rounded-lg">
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] ml-1">Admission Mode</Label>
                  <Select
                    value={selectedAdmissionMode || undefined}
                    onValueChange={setSelectedAdmissionMode}
                    disabled={selectedSection === ''}
                  >
                    <SelectTrigger className="bg-background rounded-xl border-border/50 h-11">
                      <SelectValue placeholder="Choose Admission Mode" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="all" className="rounded-lg font-medium text-primary">All Admission Modes</SelectItem>
                      {admissionModes.map((mode) => (
                        <SelectItem key={mode} value={mode} className="rounded-lg">
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cohort Stats */}
          {cohortStats && bulkReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Students</p>
                  <p className="text-2xl font-bold">{cohortStats.total_students}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Fee</p>
                  <p className="text-2xl font-bold">{formatCurrency(cohortStats.total_fee)}</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Paid</p>
                  <p className="text-2xl font-bold">{formatCurrency(cohortStats.total_paid)}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(cohortStats.total_pending)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {bulkLoading && (
            <div className="space-y-4">
              <SkeletonStatsGrid items={4} />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <SkeletonTable rows={10} cols={10} />
              </div>
            </div>
          )}

          {/* Bulk Reports Table */}
          {bulkReports.length > 0 && !bulkLoading && (
            <div className="space-y-4">

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Student Fee Reports ({totalStudents} students)</span>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>USN</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Total Fee</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Invoices</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkReports.map((report) => (
                        <TableRow key={report.student.id}>
                          <TableCell className="font-medium">{report.student.usn}</TableCell>
                          <TableCell>{report.student.name}</TableCell>
                          <TableCell>{report.student.branch}</TableCell>
                          <TableCell>{report.student.semester}</TableCell>
                          <TableCell>{report.student.section || '-'}</TableCell>
                          <TableCell>{formatCurrency(report.fee_summary.total_fee)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(report.fee_summary.total_paid)}</TableCell>
                          <TableCell className={`font-medium ${report.fee_summary.total_pending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(report.fee_summary.total_pending)}
                          </TableCell>
                          <TableCell>{report.fee_summary.invoice_count}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveTab('individual');
                                handleIndividualSearch(report.student.usn);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pagination Controls */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({totalStudents} total students)
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!hasPrevious || bulkLoading}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <span className="text-sm text-muted-foreground px-2">
                        {currentPage}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!hasNext || bulkLoading}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {bulkReports.length === 0 && !bulkLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No students found</h3>
                <p className="text-muted-foreground">Select filters and click "View Reports" to see student fee data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentFeeReports;