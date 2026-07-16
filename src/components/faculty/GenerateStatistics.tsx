import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Users, Search } from "lucide-react";
import { Input } from "../ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { ProctorStudent, getProctorStudentsForStats } from '../../utils/faculty_api';
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { paginationToUI } from '../../utils/paginationToUI';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { useTheme } from "@/context/ThemeContext";
import { useDebouncedSearch } from "@/hooks/useOptimizations";
import { SkeletonChart, SkeletonTable, SkeletonCard, Skeleton } from "@/components/ui/skeleton";

const GenerateStatistics: React.FC = () => {
  const [proctorStudents, setProctorStudents] = useState<ProctorStudent[]>([]);
  const [proctorStudentsLoading, setProctorStudentsLoading] = useState<boolean>(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Initial fetch and subsequent refetches are handled by the effect below

  // refetch when page, pageSize, or debouncedSearch changes
  useEffect(() => {
    let mounted = true;
    const refetch = async () => {
      setProctorStudentsLoading(true);
      try {
        const res = await getProctorStudentsForStats({ page, page_size: pageSize, search: debouncedSearch });
        if (res.success && res.data) {
          const norm = normalizePaginatedResponse(res, 'data');
          const items = norm.items && norm.items.length ? norm.items : res.data;
          if (mounted) setProctorStudents(items as ProctorStudent[]);
          const ui = paginationToUI(res, items || [], pageSize);
          if (mounted) setTotalPages(ui.total_pages || Math.max(1, Math.ceil((ui.total_items || 0) / pageSize)));
          if (mounted) setTotalCount(ui.total_items || 0);
        }
      } catch (e) {
        if (mounted) setProctorStudents([]);
      } finally {
        if (mounted) setProctorStudentsLoading(false);
      }
    };
    refetch();
    return () => { mounted = false; };
  }, [page, pageSize, debouncedSearch]);
  const { theme } = useTheme();

  // Helper function to format attendance percentage
  const formatAttendancePercentage = (percentage: number | string): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "NA";
    }
    if (typeof percentage === "string") {
      return percentage;
    }
    return `${percentage}%`;
  };

  // Helper function to get numeric value for charts (NA becomes 0 for visualization)
  const getNumericAttendance = (percentage: number | string): number => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return 0;
    }
    if (typeof percentage === "string") {
      return 0;
    }
    return percentage;
  };

  const handleExportPDF = async () => {
    setDownloadingPDF(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/proctor-students/export-pdf/?${params.toString()}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cd = response.headers.get('Content-Disposition');
        let filename = 'Proctor_Students_Report.pdf';
        if (cd) {
          const m = /filename="?([^"]+)"?/.exec(cd);
          if (m && m[1]) filename = m[1];
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.message || 'Failed to export PDF');
      }
    } catch {
      alert('Network error while exporting PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Prepare chart data
  const attendanceData = proctorStudents.map(s => ({ name: s.usn, attendance: getNumericAttendance(s.attendance) }));
  const marksData = proctorStudents.map(s => ({
    name: s.usn,
    // Prefer backend-provided average when available (minimal response), else compute from arrays
    avgMark: (s as any).avg_mark !== undefined ? (s as any).avg_mark : (() => {
      const internalMarks = s.marks || [];
      const iaMarks = s.ia_marks || [];
      const allMarks = [
        ...internalMarks.map(m => m.mark),
        ...iaMarks.map(m => m.total_obtained)
      ];
      return allMarks.length > 0
        ? Number((allMarks.reduce((sum, mark) => sum + (mark || 0), 0) / allMarks.length).toFixed(2))
        : 0;
    })(),
  }));



  return (
    <div id="generate-statistics-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} space-y-4 sm:space-y-6 min-h-screen`}>
      {/* Charts */}
      <div id="statistics-charts-container" className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {/* Attendance Overview */}
        <Card id="statistics-attendance-overview-card" className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg overflow-hidden`}>
          <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {proctorStudentsLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : proctorStudents.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                <div style={{ width: proctorStudents.length > 6 ? `${proctorStudents.length * 70}px` : "100%", minWidth: "100%" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={attendanceData} margin={{ bottom: 30, left: 0, right: 10, top: 10 }}>
                      <CartesianGrid stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke={theme === 'dark' ? '#d1d5db' : '#6b7280'}
                        interval={0}
                        tick={{ fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis stroke={theme === 'dark' ? '#d1d5db' : '#6b7280'} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1c1c1e' : '#ffffff',
                          border: theme === 'dark' ? '1px solid #2e2e30' : '1px solid #e5e7eb',
                          color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                        }}
                        itemStyle={{ color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <p className="text-sm italic">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Average Marks */}
        <Card id="statistics-average-marks-card" className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg overflow-hidden`}>
          <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Average Marks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {proctorStudentsLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : proctorStudents.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                <div style={{ width: proctorStudents.length > 6 ? `${proctorStudents.length * 70}px` : "100%", minWidth: "100%" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={marksData} margin={{ bottom: 30, left: 0, right: 10, top: 10 }}>
                      <CartesianGrid stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke={theme === 'dark' ? '#d1d5db' : '#6b7280'}
                        interval={0}
                        tick={{ fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis stroke={theme === 'dark' ? '#d1d5db' : '#6b7280'} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1c1c1e' : '#ffffff',
                          border: theme === 'dark' ? '1px solid #2e2e30' : '1px solid #e5e7eb',
                          color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                        }}
                        itemStyle={{ color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}
                      />
                      <Bar dataKey="avgMark" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {/* 👇 Label inside each bar, only if marks exist */}
                        <LabelList
                          dataKey="avgMark"
                          position="top"
                          fill={theme === 'dark' ? '#94a3b8' : '#64748b'}
                          fontSize={9}
                          formatter={(val: any) => val > 0 ? val : ''}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <p className="text-sm italic">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card id="statistics-table-card" className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg flex flex-col`}>
        <CardHeader id="statistics-table-header" className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor Students</CardTitle>
                {totalCount > 0 &&
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {totalCount} Total
                  </span>
                }
              </div>
              <p className={`text-[16px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                View and export performance and attendance statistics for your proctored students
              </p>
            </div>
            <div className="hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                id="generate-stats-export-pdf-btn"
                onClick={handleExportPDF}
                disabled={downloadingPDF || proctorStudents.length === 0}
                className="w-full sm:w-auto flex items-center justify-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md gap-2 h-9 text-sm"
              >
                {downloadingPDF
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <FileDown className="h-4 w-4" />
                }
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-2 sm:p-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              <Input
                placeholder="Search by USN or name..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className={`pl-10 pr-12 ${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}
              />
              {search && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Mobile Export PDF Icon Button */}
            <Button
              onClick={handleExportPDF}
              disabled={downloadingPDF || proctorStudents.length === 0}
              size="icon"
              variant="outline"
              className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
            >
              {downloadingPDF
                ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <FileDown className="h-4 w-4" />
              }
            </Button>
          </div>
          {proctorStudentsLoading ? (
            <SkeletonTable rows={10} cols={4} />
          ) : proctorStudents.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                  <tr>
                    <th className={`p-2 sm:p-3 text-left text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                    <th className={`p-2 sm:p-3 text-left text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                    <th className={`p-2 sm:p-3 text-left text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance</th>
                    <th className={`p-2 sm:p-3 text-left text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {proctorStudents.map((student, idx) => (
                    <tr key={idx} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <td className={`p-2 sm:p-3 text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                      <td className={`p-2 sm:p-3 text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                      <td className={`p-2 sm:p-3 text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{formatAttendancePercentage(student.attendance)}</td>
                      <td className={`p-2 sm:p-3 text-md sm:text-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{((student as any).avg_mark !== undefined ? (student as any).avg_mark : (() => {
                        const internalMarks = student.marks || [];
                        const iaMarks = student.ia_marks || [];
                        const allMarks = [
                          ...internalMarks.map(m => m.mark),
                          ...iaMarks.map(m => m.total_obtained)
                        ];
                        return allMarks.length > 0
                          ? Number((allMarks.reduce((sum, mark) => sum + (mark || 0), 0) / allMarks.length).toFixed(2))
                          : 0;
                      })())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/20 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No students found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {debouncedSearch
                  ? `We couldn't find any proctor students matching "${debouncedSearch}".`
                  : "You don't have any students assigned for proctoring yet."}
              </p>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default GenerateStatistics;