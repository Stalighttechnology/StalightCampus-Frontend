import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { ProctorStudent, getProctorStudentsForStats } from '../../utils/faculty_api';
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { paginationToUI } from '../../utils/paginationToUI';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonChart, SkeletonTable, SkeletonCard } from "@/components/ui/skeleton";

const GenerateStatistics: React.FC = () => {
  const [proctorStudents, setProctorStudents] = useState<ProctorStudent[]>([]);
  const [proctorStudentsLoading, setProctorStudentsLoading] = useState<boolean>(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Initial fetch and subsequent refetches are handled by the effect below

  // refetch when page or pageSize changes
  useEffect(() => {
    let mounted = true;
    const refetch = async () => {
      setProctorStudentsLoading(true);
      try {
        const res = await getProctorStudentsForStats({ page, page_size: pageSize });
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
  }, [page, pageSize]);
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
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/proctor-students/export-pdf/`
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
  const attendanceData = proctorStudents.map(s => ({ name: s.name, attendance: getNumericAttendance(s.attendance) }));
  const marksData = proctorStudents.map(s => ({
    name: s.name,
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

  if (proctorStudentsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonCard className="h-[400px]">
          <SkeletonTable rows={10} cols={4} />
        </SkeletonCard>
      </div>
    );
  }

  return (
    <div id="generate-statistics-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} space-y-4 sm:space-y-6 min-h-screen`}>
      {/* Charts */}
      <div id="statistics-charts-container" className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {/* Attendance Overview */}
        <Card className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg`}>
          <CardHeader>
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={attendanceData} margin={{ bottom: 30, left: 0, right: 10, top: 10 }}>
                <CartesianGrid stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={theme === 'dark' ? '#d1d5db' : '#6b7280'}
                  interval="preserveStartEnd"
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
          </CardContent>
        </Card>

        {/* Average Marks */}
        <Card className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg`}>
          <CardHeader>
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Average Marks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={marksData} margin={{ bottom: 30, left: 0, right: 10, top: 10 }}>
                <CartesianGrid stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={theme === 'dark' ? '#d1d5db' : '#6b7280'}
                  interval="preserveStartEnd"
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
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card id="statistics-table-card" className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg flex flex-col`}>
        <CardHeader id="statistics-table-header" className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <CardTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor Students</CardTitle>
                {totalCount > 0 &&
                  <span className={`text-xs font-medium px-2.5 py-0.5 mt-1 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {totalCount} Total
                  </span>
                }
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                View and export performance and attendance statistics for your proctored students
              </p>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                id="generate-stats-export-pdf-btn"
                onClick={handleExportPDF}
                disabled={downloadingPDF || proctorStudents.length === 0}
                className="flex items-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md gap-2"
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
        <CardContent className="p-2 sm:p-6">
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
        </CardContent>

        {totalCount > 0 && (
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