import React, { useMemo } from "react";
import { FaBookOpen, FaCheckCircle, FaFlag, FaCalendarPlus } from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useStudentAttendanceQuery } from "../../hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { useVirtualizer } from '@tanstack/react-virtual';
import { SkeletonChart, SkeletonTable, Skeleton } from "../ui/skeleton";

// Memoized Chart Component
const MemoizedLineChart = React.memo(({ data, theme }: { data: any[], theme: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#444" : "#ddd"} />
      <XAxis
        dataKey="name"
        stroke={theme === 'dark' ? "#ccc" : "#666"}
        tick={{ fill: theme === 'dark' ? "#ccc" : "#666", fontSize: 12 }}
        axisLine={{ stroke: theme === 'dark' ? "#ccc" : "#666" }}
        tickLine={{ stroke: theme === 'dark' ? "#ccc" : "#666" }}
      />
      <YAxis
        stroke={theme === 'dark' ? "#ccc" : "#666"}
        tick={{ fill: theme === 'dark' ? "#ccc" : "#666", fontSize: 12 }}
        axisLine={{ stroke: theme === 'dark' ? "#ccc" : "#666" }}
        tickLine={{ stroke: theme === 'dark' ? "#ccc" : "#666" }}
        domain={[0, 100]}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: theme === 'dark' ? "#1c1c1e" : "#fff",
          border: theme === 'dark' ? "1px solid #333" : "1px solid #ddd",
          color: theme === 'dark' ? "#fff" : "#000",
        }}
      />
      {Object.keys(data[0] || {}).filter(key => key !== 'name').map((subject, idx) => (
        <Line
          key={subject}
          type="monotone"
          dataKey={subject}
          stroke={
            ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"][
              idx % 5
            ]
          }
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      ))}
    </LineChart>
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

  const virtualizer = useVirtualizer({
    count: attendanceEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
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
          <div className={`grid grid-cols-5 gap-4 p-4 uppercase text-[10px] sm:text-xs font-bold tracking-wider ${theme === 'dark' ? 'text-muted-foreground bg-card' : 'text-gray-500 bg-white'}`}>
            <div className="break-words">Subject</div>
            <div>Total</div>
            <div>Present</div>
            <div>Percent</div>
            <div>Status</div>
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
                className={`grid grid-cols-5 gap-4 p-4 text-xs sm:text-sm border-b transition-colors ${theme === 'dark' ? 'border-border text-card-foreground hover:bg-muted/50' : 'border-gray-100 text-gray-900 hover:bg-gray-50'}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="font-medium truncate pr-2" title={subject}>{subject}</div>
                <div className="tabular-nums">{data.total}</div>
                <div className="tabular-nums">{data.present}</div>
                <div className="font-bold tabular-nums">{percentage}%</div>
                <div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full ${
                      status === "Good"
                        ? (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                        : (theme === 'dark' ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")
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
    const months = ["Jan", "Feb", "Mar", "Apr", "May"];
    const subjects = Object.keys(attendanceData);
    return months.map((month) => {
      const obj: any = { name: month };
      subjects.forEach((sub) => {
        obj[sub] = attendanceData[sub]?.percentage || 0;
      });
      return obj;
    });
  }, [attendanceData]);

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
              <CardTitle className={theme === 'dark' ? 'text-base text-card-foreground' : 'text-base text-gray-900'}>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent className={`h-[300px] ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              <SkeletonChart />
            </CardContent>
          </Card>

          <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
            <CardHeader>
              <CardTitle className={theme === 'dark' ? 'text-base text-card-foreground' : 'text-base text-gray-900'}>Overview</CardTitle>
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
            <CardTitle className={theme === 'dark' ? 'text-base text-card-foreground' : 'text-base text-gray-900'}>Subject-wise Attendance</CardTitle>
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
        <Card className={theme === 'dark' ? 'col-span-2 bg-card text-card-foreground border-border' : 'col-span-2 bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent className={`h-[300px] ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
            <MemoizedLineChart data={generateTrendData} theme={theme} />
          </CardContent>
        </Card>

        <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Overview</CardTitle>
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

      <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-base text-card-foreground' : 'text-base text-gray-900'}>Subject-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <VirtualizedAttendanceTable attendanceData={attendanceData} theme={theme} />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendance;