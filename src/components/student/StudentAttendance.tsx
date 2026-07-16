import React, { useMemo } from "react";
import { FaBookOpen, FaCheckCircle, FaFlag, FaCalendarPlus } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useStudentAttendanceQuery } from "../../hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { useVirtualizer } from '@tanstack/react-virtual';
import { SkeletonChart, SkeletonTable, Skeleton } from "../ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Memoized Chart Component
const MemoizedWavyChart = React.memo(({ data, theme }: { data: any[], theme: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={theme === 'dark' ? 0.3 : 0.2} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#333" : "#eee"} />
      <XAxis
        dataKey="name"
        stroke={theme === 'dark' ? "#888" : "#999"}
        tick={{ fill: theme === 'dark' ? "#888" : "#666", fontSize: 12 }}
        axisLine={false}
        tickLine={false}
        dy={10}
      />
      <YAxis
        stroke={theme === 'dark' ? "#888" : "#999"}
        tick={{ fill: theme === 'dark' ? "#888" : "#666", fontSize: 12 }}
        axisLine={false}
        tickLine={false}
        domain={[0, 100]}
        tickFormatter={(v) => `${v}%`}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: theme === 'dark' ? "#1c1c1e" : "#fff",
          borderRadius: "12px",
          border: theme === 'dark' ? "1px solid #333" : "1px solid #eee",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        }}
        itemStyle={{ color: "#3b82f6", fontWeight: "bold" }}
        formatter={(value: any) => [`${value}%`, 'Attendance']}
      />
      <Area
        type="monotone"
        dataKey="Attendance"
        stroke="#3b82f6"
        strokeWidth={3}
        fillOpacity={1}
        fill="url(#colorAttendance)"
        animationDuration={2000}
        dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: theme === 'dark' ? "#1c1c1e" : "#fff" }}
        activeDot={{ r: 6, strokeWidth: 0 }}
      />
    </AreaChart>
  </ResponsiveContainer>
));

interface AttendanceRecord {
  date: string;
  status: "Present" | "Absent";
}

interface SubjectAttendance {
  records: AttendanceRecord[];
  present: number;
  total: number;
  percentage: number;
}

interface AttendanceData {
  [subject: string]: SubjectAttendance;
}

// Virtualized Attendance Table Component
const VirtualizedAttendanceTable = React.memo(({
  attendanceData,
  theme
}: {
  attendanceData: AttendanceData;
  theme: string
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const attendanceEntries = Object.entries(attendanceData);
  if (attendanceEntries.length === 0) {
    return (
      <div className={`py-12 flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'}`}>
        <FaCheckCircle className="w-10 h-10 text-primary opacity-50 mb-3" />
        <h4 className={`text-base font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Attendance Records</h4>
        <p className="text-xs max-w-xs mx-auto mt-1 opacity-80">Check back once your faculty starts marking attendance.</p>
      </div>
    );
  }

  const virtualizer = useVirtualizer({
    count: attendanceEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Increased for mobile wrapping
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-64 sm:h-80 md:h-96 overflow-auto border rounded-xl"
      style={{ contain: 'strict' }}
    >
      <div className="min-w-[600px]">
        {/* Fixed Header */}
        <div className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
          <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 p-4 uppercase text-[14px] sm:text-xs font-bold tracking-wider ${theme === 'dark' ? 'text-muted-foreground bg-card' : 'text-gray-500 bg-white'}`}>
            <div className="pl-1">Subject</div>
            <div className="text-center">Total</div>
            <div className="text-center">Present</div>
            <div className="text-center">Percent</div>
            <div className="text-center">Status</div>
          </div>
        </div>

        {/* Virtualized Rows */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const [subject, data] = attendanceEntries[virtualItem.index];
            const percentage = Math.round(data.percentage);
            const status = percentage < 75 ? "At Risk" : "Good";

            return (
              <div
                key={virtualItem.key}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 p-4 text-[14px] sm:text-sm border-b transition-colors items-center ${theme === 'dark' ? 'border-border text-card-foreground hover:bg-muted/50' : 'border-gray-100 text-gray-900 hover:bg-gray-50'}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="font-semibold leading-tight pr-2 break-words" title={subject}>{subject}</div>
                <div className="tabular-nums text-center font-medium">{data.total}</div>
                <div className="tabular-nums text-center font-medium">{data.present}</div>
                <div className="font-bold tabular-nums text-center text-primary">{percentage}%</div>
                <div className="flex justify-center">
                  <span
                    className={`text-[12px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${status === "Good"
                      ? (theme === 'dark' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100")
                      : (theme === 'dark' ? "bg-red-500/20 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100")
                      }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const StudentAttendance = () => {
  const { theme } = useTheme();
  const { data: attendanceResponse, isLoading, error, pagination } = useStudentAttendanceQuery();

  // Extract attendance data from response
  const attendanceData = attendanceResponse?.data || {};

  const generateTrendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const backendTrend = attendanceResponse?.monthly_trend || [];

    // Create a map for quick lookup of backend values
    const trendMap = new Map(backendTrend.map((t: any) => [t.month, t.percentage]));

    return months.map((month) => {
      return {
        name: month,
        Attendance: trendMap.has(month) ? Math.round(trendMap.get(month)) : 0
      };
    });
  }, [attendanceResponse]);

  const overview = useMemo(() => {
    return Object.values(attendanceData).reduce(
      (acc, subject) => {
        acc.total += subject.total;
        acc.attended += subject.present;
        return acc;
      },
      { total: 0, attended: 0 }
    );
  }, [attendanceData]);

  const overallPercentage = useMemo(() =>
    overview.total > 0
      ? `${Math.round((overview.attended / overview.total) * 100)}%`
      : "0%",
    [overview]
  );

  if (isLoading) {
    return (
      <div className={`p-4 space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className={theme === 'dark' ? 'col-span-2 bg-card text-card-foreground border-border' : 'col-span-2 bg-white text-gray-900 border-gray-200'}>
            <CardHeader>
              <CardTitle className={`text-2xl ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent className={`h-[300px] ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              <SkeletonChart />
            </CardContent>
          </Card>

          <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
            <CardHeader>
              <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>Subject-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <SkeletonTable rows={8} cols={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="text-red-500">Error loading attendance data</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card id="attendance-trends-card" className={theme === 'dark' ? 'col-span-2 bg-card text-card-foreground border-border' : 'col-span-2 bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent className={`h-[300px] ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
            <MemoizedWavyChart data={generateTrendData} theme={theme} />
          </CardContent>
        </Card>

        <Card id="attendance-overview-card" className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`flex flex-col items-center justify-center p-3 mb-3 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20' : 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20'}`}>
              <span className={`text-3xl font-extrabold text-primary`}>{overallPercentage}</span>
              <p className="text-[10px] uppercase tracking-wider font-bold mt-1 opacity-70">Overall Attendance</p>
            </div>

            <div className="space-y-2">
              <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <FaBookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Total Classes</span>
                </div>
                <span className="text-sm font-bold">{overview.total}</span>
              </div>

              <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    <FaCheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Classes Attended</span>
                </div>
                <span className="text-sm font-bold">{overview.attended}</span>
              </div>

              <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                    <FaFlag className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Min Required</span>
                </div>
                <span className="text-sm font-bold text-orange-500">75%</span>
              </div>

              <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                    <FaCalendarPlus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Classes to Attend</span>
                </div>
                <span className="text-sm font-bold">{Math.max(0, Math.ceil((0.75 * overview.total - overview.attended) / 0.25))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="attendance-subject-card" className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader id="attendance-subject-card-header">
          <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Subject-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <VirtualizedAttendanceTable attendanceData={attendanceData} theme={theme} />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendance;