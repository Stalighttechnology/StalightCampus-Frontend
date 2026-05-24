import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { BookOpen, Users, Download } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCourseApplicationStats, getFilterOptions, getSemesters, FilterOptions } from "../../utils/coe_api";
import { SkeletonStatsGrid, SkeletonTable } from "../ui/skeleton";
import "./CourseStatistics.css";

const CourseStatistics = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
  } | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
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
      fetchCourseStatistics();
    }
  }, [filters]);
  useEffect(() => {
    if (filters.batch && filters.exam_period && filters.branch && filters.semester) {
      fetchCourseStatistics();
    }
  }, [page, pageSize]);

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

  const fetchCourseStatistics = async () => {
    setLoading(true);
    try {
      const result = await getCourseApplicationStats({ ...filters, page: String(page), page_size: String(pageSize) } as any);
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

    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!filters.batch || !filters.branch || !filters.semester) return;
    setExporting(true);
    try {
      const perPage = 200; // matches backend AdminPagination.max_page_size
      let p = 1;
      const allCourses: any[] = [];

      while (true) {
        const res = await getCourseApplicationStats({ ...filters, page: String(p), page_size: String(perPage) } as any);
        if (!res.success || !res.data) break;
        allCourses.push(...(res.data.courses || []));
        // Pagination info is now at the response root level
        if (!res.next) break;
        p += 1;
      }

      // Generate PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const head = [['Subject Code', 'Subject Name', 'Total Students', 'Applications', 'Application Rate', 'Faculty']];
      const body = allCourses.map((c) => [c.subject_code || '', c.subject_name || '', c.total_students || 0, c.applied_students || 0, `${c.application_rate || 0}%`, c.faculty_name || '']);
      autoTable(doc, { head, body, startY: 20, styles: { fontSize: 9 } });
      const fileName = `course_statistics_${filters.branch}_${filters.semester}.pdf`;
      doc.save(fileName);
    } catch (e) {

    } finally {
      setExporting(false);
    }
  };

  // CSV export removed. Use PDF export handler above (handleExport).

  const getApplicationRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getApplicationRateBadge = (rate: number) => {
    if (rate >= 80) return <Badge variant="secondary" className="bg-green-100 text-green-800">High</Badge>;
    if (rate >= 60) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge variant="secondary" className="bg-red-100 text-red-800">Low</Badge>;
  };

  const totalCount = pagination?.count ?? null;
  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 3),
    Math.max(5, page + 2)
  );

  return (
    <div ref={ref} id="coe-course-statistics-container" className="course-statistics-main space-y-6">
      {/* Filters */}
      <Card id="coe-course-statistics-filters" className="course-statistics-filters">
        <CardHeader className="pb-2">
          <CardTitle>Course Statistics</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2 course-statistics-filters-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 course-statistics-filter-grid">
            <div>
              <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">Batch</label>
              <Select value={filters.batch} onValueChange={(value) => setFilters({ ...filters, batch: value })}>
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
              <Select value={filters.exam_period} onValueChange={(value) => setFilters({ ...filters, exam_period: value })}>
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
              <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">Branch</label>
              <Select value={filters.branch} onValueChange={(value) => {
                setFilters({ ...filters, branch: value, semester: "" });
                fetchSemesters(value);
              }}>
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
              <label className="text-[18px] sm:text-sm font-semibold sm:font-medium mb-3 sm:mb-2 block">Semester</label>
              <Select value={filters.semester} onValueChange={(value) => setFilters({ ...filters, semester: value })}>
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

      {/* Summary Cards */}
      {data &&
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 course-statistics-summary">
          <Card className="course-statistics-summary-card overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-row items-center justify-between w-full h-full">
                <div className="flex flex-col justify-center space-y-1 sm:space-y-0">
                  <div className="text-[18px] sm:text-md font-semibold sm:font-medium mb-1 sm:mb-2">Total Subjects</div>
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-[26px] sm:text-2xl font-semibold sm:font-semibold self-center">
                  {data?.summary?.total_courses ?? 0}
                </div>
              </div>
            </CardContent>
          </Card>
 
          <Card className="course-statistics-summary-card overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-row items-center justify-between w-full h-full">
                <div className="flex flex-col justify-center space-y-1 sm:space-y-0">
                  <div className="text-[18px] sm:text-md font-semibold sm:font-medium mb-1 sm:mb-2">Total Applications</div>
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div className="text-[26px] sm:text-2xl font-semibold sm:font-semibold text-blue-600 self-center">
                  {data?.summary?.total_applications ?? 0}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }

      {/* Course Statistics Table */}
      {data &&
      <Card className="course-statistics-table-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <CardTitle className="text-lg sm:text-xl font-semibold">Subject-wise Application Statistics ({totalCount !== null ? totalCount : data?.courses?.length ?? 0})</CardTitle>
               <Button
              size="sm"
              onClick={handleExport}
              className="w-full sm:w-auto h-12 sm:h-9 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 text-[18px] sm:text-sm font-semibold sm:font-semibold">
              
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="course-statistics-table-wrapper w-full overflow-x-auto">
              <Table className="min-w-full">
              <TableHeader>
                <TableRow className="sm:table-row">
                  <TableHead className="text-[18px] sm:text-sm whitespace-nowrap font-semibold">Subject Code</TableHead>
                  <TableHead className="text-[18px] sm:text-sm whitespace-nowrap font-semibold">Subject Name</TableHead>
                  <TableHead className="text-[18px] sm:text-sm whitespace-nowrap font-semibold">Total Students</TableHead>
                  <TableHead className="text-[18px] sm:text-sm whitespace-nowrap font-semibold">Applications</TableHead>
                  <TableHead className="text-[18px] sm:text-sm whitespace-nowrap font-semibold">Application Rate</TableHead>
                  <TableHead className="text-[18px] sm:text-sm whitespace-nowrap font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.courses || []).map((course: any) =>
                <TableRow key={course.subject_id} className="sm:table-row">
                    <TableCell className="font-semibold sm:font-medium text-[18px] sm:text-sm py-4 sm:py-2" data-label="Subject Code">{course.subject_code}</TableCell>
                    <TableCell className="text-[18px] sm:text-sm py-4 sm:py-2" data-label="Subject Name">{course.subject_name}</TableCell>
                    <TableCell className="text-[18px] sm:text-sm py-4 sm:py-2" data-label="Total Students">{course.total_students}</TableCell>
                    <TableCell className="text-[18px] sm:text-sm py-4 sm:py-2" data-label="Applications">{course.applied_students}</TableCell>
                    <TableCell className="text-[18px] sm:text-sm py-4 sm:py-2" data-label="Application Rate">
                      <span className={`font-semibold ${getApplicationRateColor(course.application_rate)}`}>
                        {course.application_rate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-[18px] sm:text-sm py-4 sm:py-2" data-label="Status">{getApplicationRateBadge(course.application_rate)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
            {(data?.courses?.length ?? 0) === 0 &&
          <div className="text-center py-8 text-muted-foreground">
                No course statistics found for the selected filters.
              </div>
          }
          {/* Pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between mt-6 gap-4 border-t pt-4 pagination-container">
            <div className="text-[16px] sm:text-sm text-muted-foreground pagination-info">
              {totalCount !== null && totalCount > 0 ?
              `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalCount)} of ${totalCount} subjects` :
              `Showing 0 subjects`}
            </div>
            <div className="flex items-center gap-2 pagination-controls">
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-10 sm:h-9 px-4 sm:px-3 text-[16px] sm:text-sm font-semibold bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50">
                
                Prev
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="h-10 sm:h-9 px-4 sm:px-3 text-[18px] sm:text-sm font-semibold bg-white text-black border-2 cursor-default hover:bg-primary">
                  
                  {page}
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination?.next}
                className="h-10 sm:h-9 px-4 sm:px-3 text-[16px] sm:text-sm font-semibold bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50">
                
                Next
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>
      }

      {loading &&
      <div className="space-y-6">
          <SkeletonStatsGrid items={2} columns={2} />
          <Card>
            <CardContent className="p-6">
              <SkeletonTable rows={10} cols={6} />
            </CardContent>
          </Card>
        </div>
      }

      {!data && !loading &&
      <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
             <div className="bg-primary/5 p-8 rounded-full mb-6">
              <BookOpen className="w-14 h-14 text-primary/40" />
            </div>
            <h3 className="text-xl sm:text-xl font-semibold mb-3">Select filters to view stats</h3>
            <p className="text-[16px] sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Please select a batch, exam period, branch, and semester from the dropdowns above to load the subject-wise application statistics.
            </p>
          </CardContent>
        </Card>
      }
    </div>);

});

CourseStatistics.displayName = 'CourseStatistics';

export default CourseStatistics;