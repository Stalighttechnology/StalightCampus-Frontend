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
      console.error('Error fetching course statistics:', error);
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
      const body = allCourses.map(c => [c.subject_code || '', c.subject_name || '', c.total_students || 0, c.applied_students || 0, `${c.application_rate || 0}%`, c.faculty_name || '']);
      autoTable(doc, { head, body, startY: 20, styles: { fontSize: 9 } });
      const fileName = `course_statistics_${filters.branch}_${filters.semester}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error('Export error', e);
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
    <div ref={ref} className="course-statistics-main space-y-6">
      <div className="course-statistics-header flex justify-between items-center">
        <h1 className="text-3xl font-bold">Course Statistics</h1>
      </div>

      {/* Filters */}
      <Card className="course-statistics-filters">
        <CardContent className="p-6 course-statistics-filters-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 course-statistics-filter-grid">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 course-statistics-summary">
          <Card className="course-statistics-summary-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total_courses}</div>
            </CardContent>
          </Card>

          <Card className="course-statistics-summary-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.summary.total_applications}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Course Statistics Table */}
      {data && (
        <Card className="course-statistics-table-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Subject-wise Application Statistics ({totalCount !== null ? totalCount : data.courses.length})</CardTitle>
              <Button
                size="sm"
                onClick={handleExport}
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="course-statistics-table-wrapper w-full overflow-x-auto">
              <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Total Students</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Application Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.courses.map((course: any) => (
                  <TableRow key={course.subject_id}>
                    <TableCell className="font-medium" data-label="Subject Code">{course.subject_code}</TableCell>
                    <TableCell data-label="Subject Name">{course.subject_name}</TableCell>
                    <TableCell data-label="Total Students">{course.total_students}</TableCell>
                    <TableCell data-label="Applications">{course.applied_students}</TableCell>
                    <TableCell data-label="Application Rate">
                      <span className={`font-medium ${getApplicationRateColor(course.application_rate)}`}>
                        {course.application_rate}%
                      </span>
                    </TableCell>
                    <TableCell data-label="Status">{getApplicationRateBadge(course.application_rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
            {data.courses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No course statistics found for the selected filters.
              </div>
            )}
          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">{totalCount !== null ? `Showing page ${page} — ${totalCount} subjects` : `Page ${page}`}</div>
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
                {visiblePages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(pageNumber)}
                    className="bg-white text-black border-gray-300 hover:bg-gray-100"
                  >
                    {pageNumber}
                  </Button>
                ))}
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
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading course statistics...</p>
        </div>
      )}
    </div>
  );
});

CourseStatistics.displayName = 'CourseStatistics';

export default CourseStatistics;