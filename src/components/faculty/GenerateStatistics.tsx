import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { ProctorStudent, getProctorStudentsForStats } from '../../utils/faculty_api';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonChart, SkeletonTable, SkeletonCard } from "@/components/ui/skeleton";

const GenerateStatistics: React.FC = () => {
  const [proctorStudents, setProctorStudents] = useState<ProctorStudent[]>([]);
  const [proctorStudentsLoading, setProctorStudentsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Initial fetch and subsequent refetches are handled by the effect below

  // refetch when page or pageSize changes
  useEffect(() => {
    let mounted = true;
    const refetch = async () => {
      setProctorStudentsLoading(true);
      try {
        const res = await getProctorStudentsForStats({ page, page_size: pageSize });
        if (res.success && res.data) {
          if (mounted) setProctorStudents(res.data);
          if (res.pagination) {
            if (mounted) setTotalPages(res.pagination.total_pages || 1);
          }
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Proctor Students Report", 14, 16);
    const tableColumn = ["USN", "Name", "Attendance %", "Avg Mark"];
    const tableRows = proctorStudents.map(student => [
      student.usn,
      student.name,
      formatAttendancePercentage(student.attendance),
      (() => {
        const internalMarks = student.marks || [];
        const iaMarks = student.ia_marks || [];
        const allMarks = [
          ...internalMarks.map(m => m.mark),
          ...iaMarks.map(m => m.total_obtained)
        ];
        return allMarks.length > 0
          ? (allMarks.reduce((sum, mark) => sum + (mark || 0), 0) / allMarks.length).toFixed(2)
          : '0';
      })(),
    ]);
    autoTable(doc, {
      startY: 20,
      head: [tableColumn],
      body: tableRows,
    });
    doc.save("proctor_students_report.pdf");
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
    <div className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} space-y-4 sm:space-y-6 min-h-screen`}>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
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
      <Card className={`${theme === 'dark' ? 'shadow-sm bg-card text-foreground' : 'shadow-sm bg-white text-gray-900'} rounded-lg`}>
        <CardHeader className="flex flex-row justify-between items-center gap-3 p-3 sm:p-6">
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor Students Table</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md"
          >
            <FileTextIcon className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
                <tr>
                  <th className={`p-2 sm:p-3 text-left text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                  <th className={`p-2 sm:p-3 text-left text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                  <th className={`p-2 sm:p-3 text-left text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance %</th>
                  <th className={`p-2 sm:p-3 text-left text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {proctorStudents.map((student, idx) => (
                  <tr key={idx} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                    <td className={`p-2 sm:p-3 text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                    <td className={`p-2 sm:p-3 text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                    <td className={`p-2 sm:p-3 text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{formatAttendancePercentage(student.attendance)}</td>
                    <td className={`p-2 sm:p-3 text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{((student as any).avg_mark !== undefined ? (student as any).avg_mark : (() => {
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

          {/* Pagination controls */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="text-xs px-2 sm:px-3 h-8 sm:h-9 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
              >
                Prev
              </Button>

              {/* Dynamic page numbers */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                {(() => {
                  const pages: (number | string)[] = [];
                  const maxPagesToShow = 5;
                  const halfWindow = Math.floor(maxPagesToShow / 2);

                  let startPage = Math.max(1, page - halfWindow);
                  let endPage = Math.min(totalPages, page + halfWindow);

                  // Adjust window if near boundaries
                  if (endPage - startPage + 1 < maxPagesToShow) {
                    if (startPage === 1) {
                      endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                    } else if (endPage === totalPages) {
                      startPage = Math.max(1, endPage - maxPagesToShow + 1);
                    }
                  }

                  // Add first page
                  if (startPage > 1) {
                    pages.push(1);
                    if (startPage > 2) pages.push('...');
                  }

                  // Add page range
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }

                  // Add last page
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push('...');
                    pages.push(totalPages);
                  }

                  return pages.map((p, idx) => (
                    typeof p === 'number' ? (
                      <Button
                        key={idx}
                        size="sm"
                        variant={page === p ? "default" : "outline"}
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs ${page === p ? 'bg-white text-gray-900 hover:bg-gray-200 border border-gray-300' : ''}`}
                      >
                        {p}
                      </Button>
                    ) : (
                      <span key={idx} className="px-1 text-gray-500">...</span>
                    )
                  ));
                })()}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="text-xs px-2 sm:px-3 h-8 sm:h-9 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateStatistics;