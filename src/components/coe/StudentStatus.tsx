import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Users, CheckCircle, XCircle, Search, Download, Loader2, FileDownIcon } from "lucide-react";
import { getStudentApplicationStatus, getFilterOptions, getSemesters, FilterOptions } from "../../utils/coe_api";
import { SkeletonStatsGrid, SkeletonTable } from "../ui/skeleton";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import "./StudentStatus.css";
import ExamWindowConfig from './ExamWindowConfig';


const StudentStatus = React.forwardRef<HTMLDivElement>((props, ref) => {
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [subjectsModalOpen, setSubjectsModalOpen] = useState(false);
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
  const [isExamPeriodOpen, setIsExamPeriodOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

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
  }, [filters, debouncedSearchQuery]);

  useEffect(() => {
    if (filters.batch && filters.exam_period && filters.branch && filters.semester) {
      fetchStudentStatus();
    }
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFilterOptions = async () => {
    try {
      const options = await getFilterOptions();
      setFilterOptions(options);
    } catch (error) {

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

  const fetchStudentStatus = async () => {
    setLoading(true);
    try {
      const result = await getStudentApplicationStatus({ ...filters, search: debouncedSearchQuery, page: String(page), page_size: String(pageSize) } as any);
      if (result.success) {
        setData(result.data);
        // Pagination info is now at the response root level
        setPagination({
          count: (result as any).pagination?.count ?? result.count ?? 0,
          next: (result as any).pagination?.next ?? result.next ?? null,
          previous: (result as any).pagination?.previous ?? result.previous ?? null
        });
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900">Applied</Badge>;
      case 'not_applied':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900">Not Applied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalCount = pagination?.count ?? null;
  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const handleExport = async () => {
    if (!filters.batch || !filters.exam_period || !filters.branch || !filters.semester) return;
    const accessToken = sessionStorage.getItem("access_token");
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

      toast.error(`Export Failed: ${err instanceof Error ? err.message : "An unknown error occurred"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={ref} id="coe-student-status-container" className="student-status-main-container w-full max-w-full">
      <div className="space-y-4 sm:space-y-6">
        {/* Filters */}
        <Card id="coe-student-status-filters">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col">
              <CardTitle className="text-xl sm:text-2xl font-semibold">Student Exam Application Status</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">Monitor and track student exam application submissions.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">Batch</label>
                <Select value={filters.batch} onValueChange={(value) => {
                  setFilters({ ...filters, batch: value });
                  setTimeout(() => setIsExamPeriodOpen(true), 150);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.batches.map((batch: any) =>
                      <SelectItem key={batch.id} value={batch.id.toString()}>
                        {batch.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">Exam Period</label>
                <Select value={filters.exam_period} onValueChange={(value) => {
                  setFilters({ ...filters, exam_period: value });
                  setTimeout(() => setIsBranchOpen(true), 150);
                }} open={isExamPeriodOpen} onOpenChange={setIsExamPeriodOpen} disabled={!filters.batch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="june_july">June/July</SelectItem>
                    <SelectItem value="nov_dec">November/December</SelectItem>
                    <SelectItem value="jan_feb">January/February</SelectItem>
                    <SelectItem value="apr_may">April/May</SelectItem>
                    <SelectItem value="sept_oct">September/October</SelectItem>
                    <SelectItem value="feb_mar">February/March</SelectItem>
                    <SelectItem value="supplementary">Supplementary</SelectItem>
                    <SelectItem value="revaluation">Revaluation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">{translateTerminology("Branch")}</label>
                <Select value={filters.branch} onValueChange={(value) => {
                  setFilters({ ...filters, branch: value, semester: "" });
                  fetchSemesters(value);
                  setTimeout(() => setIsSemesterOpen(true), 150);
                }} open={isBranchOpen} onOpenChange={setIsBranchOpen} disabled={!filters.exam_period}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.branches.map((branch: any) =>
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">{translateTerminology("Semester")}</label>
                <Select value={filters.semester} onValueChange={(value) => setFilters({ ...filters, semester: value })} open={isSemesterOpen} onOpenChange={setIsSemesterOpen} disabled={!filters.branch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester: any) =>
                      <SelectItem key={semester.id} value={semester.id.toString()}>
                        Semester {semester.number}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {filters.batch && filters.exam_period && filters.semester && (
          <ExamWindowConfig 
            batchId={filters.batch} 
            examPeriod={filters.exam_period} 
            branchId={filters.branch} 
            semesterId={filters.semester} 
          />
        )}

        {/* Summary Cards */}
        {data &&
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6 summary-cards">
            <Card className="summary-card w-full max-w-full overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-row items-center justify-between w-full h-full">
                  <div className="flex flex-col justify-center space-y-1 sm:space-y-0">
                    <div className="text-[18px] sm:text-md font-semibold sm:font-medium mb-1 sm:mb-2">Total Students</div>
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-[26px] sm:text-2xl font-bold sm:font-semibold summary-card-value self-center">
                    {data.summary.total_students}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="summary-card w-full max-w-full overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-row items-center justify-between w-full h-full">
                  <div className="flex flex-col justify-center space-y-1 sm:space-y-0">
                    <div className="text-[18px] sm:text-md font-semibold sm:font-medium mb-1 sm:mb-2">Applied</div>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="text-[26px] sm:text-2xl font-bold sm:font-semibold text-green-600 summary-card-value self-center">
                    {data.summary.applied_students}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="summary-card w-full max-w-full overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-row items-center justify-between w-full h-full">
                  <div className="flex flex-col justify-center space-y-1 sm:space-y-0">
                    <div className="text-[18px] sm:text-md font-semibold sm:font-medium mb-1 sm:mb-2">Not Applied</div>
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="text-[26px] sm:text-2xl font-bold sm:font-semibold text-red-600 summary-card-value self-center">
                    {data.summary.not_applied_students}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="summary-card w-full max-w-full overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-row items-center justify-between w-full h-full">
                  <div className="flex flex-col justify-center space-y-1 sm:space-y-0">
                    <div className="text-[18px] sm:text-md font-semibold sm:font-medium mb-1 sm:mb-2">App Rate</div>
                    <Search className="h-6 w-6  text-blue-500" />
                  </div>
                  <div className="text-[26px] sm:text-2xl font-bold sm:font-semibold text-blue-600 summary-card-value self-center">
                    {data.summary.application_rate}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        }

        {/* Students Table */}
        {data &&
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-[18px] sm:text-lg font-semibold flex items-center gap-2">
                  Student Application Status
                  <Badge variant="outline" className="ml-2 font-mono">{totalCount !== null ? totalCount : 0}</Badge>
                </h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by USN or Name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={exporting || !(filters.batch && filters.exam_period && filters.branch && filters.semester) || !data || data.students.length === 0}
                    className="h-9 px-4 gap-2 whitespace-nowrap hidden sm:flex"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDownIcon className="w-4 h-4" />}
                    Export
                  </Button>

                  {/* Mobile Export Button (same line, icon-only) */}
                  <Button
                    onClick={handleExport}
                    disabled={exporting || !(filters.batch && filters.exam_period && filters.branch && filters.semester) || !data || data.students.length === 0}
                    size="icon"
                    variant="outline"
                    className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDownIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {data.students.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'} text-center`}>
                  <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-4 shadow-sm`}>
                    <Users className="h-10 w-10 text-primary/40" />
                  </div>
                  <h3 className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    No students found
                  </h3>
                  <p className={`text-sm mt-2 max-w-xs mx-auto leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No students match the selected filters.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto table-wrapper">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="sm:table-row">
                        <TableHead className="text-[16px] sm:text-sm whitespace-nowrap font-semibold sm:font-semibold">USN</TableHead>
                        <TableHead className="text-[16px] sm:text-sm whitespace-nowrap font-semibold sm:font-semibold">Student Name</TableHead>
                        <TableHead className="text-[16px] sm:text-sm whitespace-nowrap font-semibold sm:font-semibold">Status</TableHead>
                        <TableHead className="text-[16px] sm:text-sm whitespace-nowrap font-semibold sm:font-semibold">Applied Subjects</TableHead>
                        <TableHead className="text-[16px] sm:text-sm whitespace-nowrap text-left font-semibold sm:font-semibold">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.students.map((student: any) =>
                        <TableRow key={student.student_id} className="sm:table-row">
                          <TableCell className="font-semibold sm:font-medium text-[16px] sm:text-sm py-4 sm:py-2 uppercase" data-label="USN">{student.usn || student.roll_number}</TableCell>
                          <TableCell className="text-[16px] sm:text-sm py-4 sm:py-2" data-label="Student Name">{student.student_name}</TableCell>
                          <TableCell className="text-[16px] sm:text-sm py-4 sm:py-2" data-label="Status">{getStatusBadge(student.status)}</TableCell>
                          <TableCell className="text-[16px] sm:text-sm py-4 sm:py-2" data-label="Applied Subjects">
                            {student.applied_subjects.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setSubjectsModalOpen(true);
                                }}
                                className="h-8 px-4 text-xs font-semibold rounded-lg transition border border-purple-300 text-purple-600 bg-white hover:bg-purple-50 dark:border-purple-500/30 dark:text-purple-400 dark:bg-card dark:hover:bg-purple-950/20"
                              >
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs font-normal">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[16px] sm:text-sm text-left py-4 sm:py-2" data-label="Count">{student.applied_count}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

            {/* Pagination controls */}
            {data.students.length > 0 && totalCount !== null && totalCount > pageSize && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div className="text-sm text-muted-foreground pagination-info">
                  {totalCount !== null && totalCount > 0 ?
                    `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalCount)} of ${totalCount} students` :
                    `Showing 0 students`}
                </div>
                <div className="flex items-center gap-2 pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Prev
                  </Button>

                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className="text-sm font-semibold text-primary">
                      {page}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination?.next}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        }

        {loading &&
          <div className="space-y-6">
            <SkeletonStatsGrid items={4} columns={4} />
            <Card>
              <CardContent className="p-6">
                <SkeletonTable rows={10} cols={5} />
              </CardContent>
            </Card>
          </div>
        }

        {!data && !loading &&
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <div className="bg-primary/5 p-8 rounded-full mb-6">
                <Search className="w-14 h-14 text-primary/40" />
              </div>
              <h3 className="text-xl sm:text-xl font-semibold sm:font-semibold mb-3">Select filters to view data</h3>
              <p className="text-[16px] sm:text-sm text-muted-foreground max-w-sm mx-auto">
                Please select a batch, exam period, branch, and semester from the dropdowns above to load the student application status.
              </p>
            </CardContent>
          </Card>
        }
      </div>

      <Dialog open={subjectsModalOpen} onOpenChange={setSubjectsModalOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border shadow-lg' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'} max-w-md w-[calc(100vw-2rem)] sm:w-[90vw] rounded-lg flex flex-col max-h-[80vh] p-0 overflow-hidden`}>
          {/* Fixed header */}
          <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogHeader>
              <DialogTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-lg font-semibold`}>
                Applied Subjects
              </DialogTitle>
              <DialogDescription className={`${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} text-sm mt-1`}>
                For {selectedStudent?.student_name} ({selectedStudent?.roll_number})
              </DialogDescription>
            </DialogHeader>
          </div>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedStudent?.applied_subjects && selectedStudent.applied_subjects.length > 0 ? (
              <ul className="divide-y divide-border">
                {selectedStudent.applied_subjects.map((sub: string, index: number) => (
                  <li key={index} className="py-2.5 text-sm leading-snug">
                    {sub}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No subjects applied.</p>
            )}
          </div>
          {/* Fixed footer */}
          <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
            <Button
              onClick={() => setSubjectsModalOpen(false)}
              className="bg-primary text-white hover:bg-primary/90 px-4 py-2 text-sm font-medium"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

});

StudentStatus.displayName = "StudentStatus";

export default StudentStatus;