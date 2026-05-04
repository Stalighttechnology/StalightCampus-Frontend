import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Users, CheckCircle, XCircle, Search, Download } from "lucide-react";
import { getStudentApplicationStatus, getFilterOptions, getSemesters, FilterOptions } from "../../utils/coe_api";
import { SkeletonStatsGrid, SkeletonTable } from "../ui/skeleton";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { toast } from "sonner";
import "./StudentStatus.css";


const StudentStatus = React.forwardRef<HTMLDivElement>((props, ref) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    batch: "",
    exam_period: "",
    branch: "",
    semester: ""
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    batches: [],
    branches: []
  });
  const [semesters, setSemesters] = useState<any[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (filters.batch && filters.exam_period && filters.branch && filters.semester) {
      fetchStudentStatus();
    }
  }, [filters]);
  useEffect(() => {
    if (filters.batch && filters.exam_period && filters.branch && filters.semester) {
      fetchStudentStatus();
    }
  }, [page, pageSize]);

  const fetchFilterOptions = async () => {
    try {
      const options = await getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Error fetching filter options:', error);
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

  const fetchStudentStatus = async () => {
    setLoading(true);
    try {
      const result = await getStudentApplicationStatus({ ...filters, page: String(page), page_size: String(pageSize) } as any);
      if (result.success) {
        setData(result.data);
        // Pagination info is now at the response root level
        setPagination({
          count: result.count || 0,
          next: result.next || null,
          previous: result.previous || null
        });
      }
    } catch (error) {
      console.error('Error fetching student status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Applied</Badge>;
      case 'not_applied':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Not Applied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalCount = pagination?.count ?? null;
  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const handleExport = async () => {
    if (!filters.batch || !filters.exam_period || !filters.branch || !filters.semester) return;
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      toast.error("Authentication Required: You must be logged in to export.");
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams({
        batch: filters.batch,
        exam_period: filters.exam_period,
        branch: filters.branch,
        semester: filters.semester,
        format: 'pdf'
      });
      const url = `${API_ENDPOINT}/coe/export-student-status/?${params.toString()}`;
      const resp = await fetchWithTokenRefresh(url, { method: 'GET' });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${resp.status}`);
      }
      
      const blob = await resp.blob();
      const disposition = resp.headers.get('content-disposition') || '';
      const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^";]+)"?/i);
      let filename = `not_applied_${filters.semester}_${filters.batch}.pdf`;
      if (match) filename = decodeURIComponent((match[1] || match[2] || '').trim());
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);
      
      toast.success(`Export Successful: Downloaded ${filename}`);
    } catch (err) {
      console.error('Export error', err);
      toast.error(`Export Failed: ${err instanceof Error ? err.message : "An unknown error occurred"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={ref} className="student-status-main-container w-full max-w-full">
      <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Batch</label>
              <Select value={filters.batch} onValueChange={(value) => setFilters({...filters, batch: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.batches.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id.toString()}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Exam Period</label>
              <Select value={filters.exam_period} onValueChange={(value) => setFilters({...filters, exam_period: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="june_july">June/July</SelectItem>
                  <SelectItem value="nov_dec">November/December</SelectItem>
                  <SelectItem value="jan_feb">January/February</SelectItem>
                  <SelectItem value="apr_may">April/May</SelectItem>
                  <SelectItem value="supplementary">Supplementary</SelectItem>
                  <SelectItem value="revaluation">Revaluation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Branch</label>
              <Select value={filters.branch} onValueChange={(value) => {
                setFilters({...filters, branch: value, semester: ""});
                fetchSemesters(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Semester</label>
              <Select value={filters.semester} onValueChange={(value) => setFilters({...filters, semester: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester: any) => (
                    <SelectItem key={semester.id} value={semester.id.toString()}>
                      Semester {semester.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6 summary-cards">
          <Card className="summary-card w-full max-w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium summary-card-title">Total Students</CardTitle>
              <Users className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold summary-card-value">{data.summary.total_students}</div>
            </CardContent>
          </Card>

          <Card className="summary-card w-full max-w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium summary-card-title">Applied</CardTitle>
              <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600 summary-card-value">{data.summary.applied_students}</div>
            </CardContent>
          </Card>

          <Card className="summary-card w-full max-w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium summary-card-title">Not Applied</CardTitle>
              <XCircle className="h-3 sm:h-4 w-3 sm:w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-red-600 summary-card-value">{data.summary.not_applied_students}</div>
            </CardContent>
          </Card>

          <Card className="summary-card w-full max-w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium summary-card-title">App Rate</CardTitle>
              <Search className="h-3 sm:h-4 w-3 sm:w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-blue-600 summary-card-value">{data.summary.application_rate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Table */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Student Application Status ({totalCount !== null ? totalCount : data.students.length})</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting || !(filters.batch && filters.exam_period && filters.branch && filters.semester)}
                  className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 export-button text-xs sm:text-sm"
                >
                  <Download className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="w-full overflow-x-auto table-wrapper">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Roll Number</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Student Name</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Applied Subjects</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap text-center sm:text-left">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((student: any) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium text-xs sm:text-sm" data-label="Roll Number">{student.roll_number}</TableCell>
                      <TableCell className="text-xs sm:text-sm" data-label="Student Name">{student.student_name}</TableCell>
                      <TableCell className="text-xs sm:text-sm" data-label="Status">{getStatusBadge(student.status)}</TableCell>
                      <TableCell className="text-xs sm:text-sm" data-label="Applied Subjects">
                        <div className="max-w-xs truncate" title={student.applied_subjects.join(', ')}>
                          {student.applied_subjects.length > 0
                            ? student.applied_subjects.join(', ')
                            : 'None'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-center" data-label="Count">{student.applied_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.students.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground empty-state">
                No students found for the selected filters.
              </div>
            )}
            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">{totalCount !== null ? `Showing page ${page} — ${totalCount} students` : `Page ${page}`}</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-white text-black border-2 cursor-default hover:bg-primary"
                  >
                    {page}
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination?.next}
                  className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-6">
          <SkeletonStatsGrid items={4} />
          <Card>
            <CardContent className="p-6">
              <SkeletonTable rows={10} cols={5} />
            </CardContent>
          </Card>
        </div>
      )}

      {!data && !loading && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-primary/5 p-6 rounded-full mb-4">
              <Search className="w-12 h-12 text-primary/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Select filters to view data</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Please select a batch, exam period, branch, and semester from the dropdowns above to load the student application status.
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
});

StudentStatus.displayName = "StudentStatus";

export default StudentStatus;