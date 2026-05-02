import { useState, useEffect } from "react";
import {
  CalendarDays,
  Users,
  CheckSquare,
  PlusCircle,
  GraduationCap,
  FileBarChart,
  Clock,
  MapPin,
  User,
  ClipboardList,
  GitBranch,
  UserCheck,
  Bell,
  Settings,
  
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { motion } from "framer-motion";
import DashboardCard from "../common/DashboardCard";
import { FaUserGraduate, FaChalkboardTeacher, FaUserCheck } from "react-icons/fa";
import { getFacultyDashboardBootstrap } from "@/utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonStatsGrid, SkeletonChart, SkeletonCard } from "../ui/skeleton";

interface Stat {
  label: string;
  value: string | number;
  icon: JSX.Element;
  sub?: string;
  color?: string;
}

interface SubjectPerformanceTrend {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  avg_attendance_percent_30d: number;
  avg_ia_mark: number;
}

interface TodayClass {
  subject: string;
  section?: string;
  semester?: number | string;
  branch?: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  room?: string;
}

interface FacultyStatsProps {
  setActivePage: (page: string) => void;
}

const FacultyStats = ({ setActivePage }: FacultyStatsProps) => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [proctorStudentsCount, setProctorStudentsCount] = useState<number>(0);
  const [performanceTrends, setPerformanceTrends] = useState<{avg_attendance_percent_30d?: number; avg_ia_mark?: number}>({});
  const [subjectPerformanceTrends, setSubjectPerformanceTrends] = useState<SubjectPerformanceTrend[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [ongoingClass, setOngoingClass] = useState<TodayClass | null>(null);
  const [nextClass, setNextClass] = useState<TodayClass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const { theme } = useTheme();

  // class/section filters removed; use per-subject trends instead
  const subjectOptions = [
    { value: "all", label: "All Subjects" },
    ...subjectPerformanceTrends.map((trend) => ({
      value: trend.subject_id.toString(),
      label: `${trend.subject_name} (${trend.subject_code})`
    }))
  ];

  // Get filtered performance trends based on selected subject
  const getFilteredTrends = () => {
    if (selectedSubject === "all") {
      return subjectPerformanceTrends;
    }
    return subjectPerformanceTrends.filter(trend => trend.subject_id.toString() === selectedSubject);
  };

  // Prepare chart data
  const chartData = getFilteredTrends().map(trend => ({
    subject: trend.subject_code || trend.subject_name,
    attendance: trend.avg_attendance_percent_30d,
    iaMarks: trend.avg_ia_mark
  }));

  // Helper function to determine ongoing and next classes
  const determineClassStatus = (classes: TodayClass[]) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    let ongoing: TodayClass | null = null;
    let next: TodayClass | null = null;
    let earliestFuture: TodayClass | null = null;

    for (const cls of classes) {
      const [startHour, startMin] = cls.start_time.split(':').map(Number);
      const [endHour, endMin] = cls.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        ongoing = cls;
      } else if (currentTime < startMinutes) {
        if (!earliestFuture || startMinutes < (earliestFuture.start_time.split(':').map(Number)[0] * 60 + earliestFuture.start_time.split(':').map(Number)[1])) {
          earliestFuture = cls;
        }
      }
    }

    setOngoingClass(ongoing);
    setNextClass(earliestFuture);
  };

  // Live time for header (for display like student dashboard)
  const [nowDate, setNowDate] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNowDate(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Helper to get status/color/message for a class (used for Next class display)
  const getClassStatus = (cls?: TodayClass | null) => {
    if (!cls) return { status: null as null | string, color: theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500', message: '' };
    const now = new Date();
    const [sh, sm] = cls.start_time.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const minutesUntil = startMinutes - minutesNow;
    if (minutesUntil >= 0 && minutesUntil <= 15) {
      return { status: 'starting-soon', color: theme === 'dark' ? 'text-orange-400' : 'text-orange-600', message: `Starts in ${minutesUntil} min${minutesUntil === 1 ? '' : 's'}` };
    }
    if (minutesUntil > 15) {
      return { status: 'upcoming', color: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600', message: `Starts at ${cls.start_time}` };
    }
    return { status: null as null | string, color: theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500', message: `Starts at ${cls.start_time}` };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      console.log('Starting to fetch faculty dashboard data...');
      try {
        // Fetch bootstrap data (proctor students, performance trends)
        console.log('Fetching bootstrap data...');
        const bootstrapRes = await getFacultyDashboardBootstrap();
        console.log('Bootstrap response:', bootstrapRes);
        if (bootstrapRes.success && bootstrapRes.data) {
          const { proctor_students_count, performance_trends, subject_performance_trends } = bootstrapRes.data;
          setProctorStudentsCount(proctor_students_count || 0);
          setPerformanceTrends(performance_trends || {});
          setSubjectPerformanceTrends(subject_performance_trends || []);

          // Set stats after data is loaded (use local response values safely)
          setStats([
            {
              label: "Total Proctor Students",
              value: proctor_students_count || 0,
              icon: <Users className="text-green-600 w-5 h-5" />,
              color: "green",
            },
            {
              label: "Attendance (30d)",
              value: bootstrapRes.data?.attendance_snapshot ?? (performance_trends?.avg_attendance_percent_30d ?? 0),
              icon: <CheckSquare className="text-indigo-600 w-5 h-5" />,
              color: "indigo",
            },
            {
              label: "Avg IA Marks",
              value: performance_trends?.avg_ia_mark ?? bootstrapRes.data?.avg_ia_mark ?? 0.0,
              icon: <GraduationCap className="text-purple-600 w-5 h-5" />,
              color: "purple",
            },
          ]);
        } else {
          setError(bootstrapRes.message || "Failed to load dashboard data");
        }

        // Use today's classes from bootstrap response (single-call dashboard)
        const todayClassesFromBootstrap = bootstrapRes.data?.today_classes || [];
        console.log('Today classes (from bootstrap):', todayClassesFromBootstrap);
        setTodayClasses(todayClassesFromBootstrap);
        determineClassStatus(todayClassesFromBootstrap);

        
      } catch (err) {
        setError("Network error occurred while fetching data");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  // We no longer load the full proctor student list on the dashboard.
  // Charts are replaced by aggregated performance metrics provided by the bootstrap API.

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid items={3} />
        <SkeletonChart />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }
  if (error) {
    return <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground' : 'bg-red-100 text-red-700'}`}>{error}</div>;
  }

  return (
    <div className={`space-y-6 w-full max-w-full min-h-0 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Stats Cards (admin style) */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <DashboardCard
            title="Total Proctor Students"
            value={proctorStudentsCount || 0}
            description="Students under your proctoring"
            icon={<FaUserGraduate className={theme === 'dark' ? "text-blue-400 text-3xl" : "text-blue-500 text-3xl"} />}
            className="h-full"
          />
        </motion.div>

        <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <DashboardCard
            title="Attendance (30d)"
            value={`${Math.round((performanceTrends?.avg_attendance_percent_30d ?? 0) * 10) / 10}%`}
            description="Average attendance (last 30 days)"
            icon={<FaChalkboardTeacher className={theme === 'dark' ? "text-purple-400 text-3xl" : "text-purple-500 text-3xl"} />}
            className="h-full"
          />
        </motion.div>

        <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <DashboardCard
            title="Avg IA Marks"
            value={performanceTrends?.avg_ia_mark ?? 0}
            description="Average internal assessment"
            icon={<FaUserCheck className={theme === 'dark' ? "text-green-400 text-3xl" : "text-green-500 text-3xl"} />}
            className="h-full"
          />
        </motion.div>
      </motion.div>

      {/* Main Content - stacked full-width rows */}
      <div className="flex flex-col gap-6 w-full">
        {/* Performance Trends (full width) */}
        <Card className={`h-full flex flex-col w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'} shadow-sm`}>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3">
            <div className="flex-1 text-left">
              <CardTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Performance Trends</CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Average Attendance and IA marks per subject</p>
            </div>
            <div className="mt-3 md:mt-0 md:ml-4 flex-none w-full md:w-48">
              <Select onValueChange={(v) => setSelectedSubject(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 h-full">
            <div className="h-full flex flex-col md:flex-row gap-4 items-stretch">
              {/* Bar chart - Average Attendance */}
              <div className="flex-1 min-h-[240px]">
                <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Average Attendance (30 days)</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2a2a2a' : '#eaeaea'} />
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Bar dataKey="attendance" fill="#3b82f6" radius={[6,6,0,0]}>
                      <LabelList dataKey="attendance" position="top" formatter={(v: any) => `${v}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Line chart - IA Marks */}
              <div className="flex-1 min-h-[240px]">
                <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Average IA Marks</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2a2a2a' : '#eaeaea'} />
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="iaMarks" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current & Next Session (full width row) */}
        <section className="w-full">
          <Card className={`h-full flex flex-col justify-between w-full ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
            <CardHeader className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-0">
                <CardTitle className={theme === 'dark' ? 'text-sm md:text-sm text-card-foreground' : 'text-sm md:text-sm text-gray-900'}>Current & Next Session</CardTitle>
                <div className="flex items-center gap-2 text-xs md:text-xs">
                  <Clock className="w-4 h-4" />
                  <span className={`flex items-center gap-2 px-3 py-1 rounded-full font-medium shadow-sm ${
                    theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-900'
                  }`}>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Live: {nowDate.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="w-full flex-1 flex flex-col gap-3 md:gap-4 p-3 md:p-4">
              {ongoingClass ? (
                <>
                  <div className={`border-2 border-blue-500 rounded-md p-3 md:p-4 w-full shadow-md flex flex-col items-center sm:items-start gap-2 ${
                    theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                  }`}>
                    <h4 className={`font-semibold text-sm mb-2 line-clamp-2 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                      {ongoingClass.subject}
                    </h4>
                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Teacher: {ongoingClass.section ?? ''}
                    </p>
                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Room: {ongoingClass.room}
                    </p>
                    <p className={`text-[10px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {ongoingClass.start_time} - {ongoingClass.end_time}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Currently Running</p>
                  </div>
                  {nextClass && (
                    <div className={`border rounded-md p-3 w-full shadow-md ${
                      getClassStatus(nextClass).status === 'starting-soon'
                        ? (theme === 'dark' ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50')
                        : getClassStatus(nextClass).status === 'upcoming'
                        ? (theme === 'dark' ? 'border-yellow-500 bg-yellow-900/20' : 'border-yellow-500 bg-yellow-50')
                        : (theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-gray-50')
                    }`}>
                      <h4 className={`font-semibold text-sm mb-2 line-clamp-2 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                        {nextClass.subject}
                      </h4>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Teacher: {nextClass.section ?? ''}
                      </p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Room: {nextClass.room}
                      </p>
                      <p className={`text-[10px] mt-1 font-medium line-clamp-2 ${getClassStatus(nextClass).color || (theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500')}`}>
                        {getClassStatus(nextClass).message || `Starts at ${nextClass.start_time}`}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full text-center">
                  <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No class is currently running</p>
                  {nextClass && (
                    <div className={`border rounded-md p-3 mt-3 shadow-md ${
                      getClassStatus(nextClass).status === 'starting-soon'
                        ? (theme === 'dark' ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50')
                        : getClassStatus(nextClass).status === 'upcoming'
                        ? (theme === 'dark' ? 'border-yellow-500 bg-yellow-900/20' : 'border-yellow-500 bg-yellow-50')
                        : (theme === 'dark' ? 'border-border bg-card' : 'border-gray-300 bg-gray-50')
                    }`}>
                      <h4 className={`font-semibold text-sm mb-2 line-clamp-2 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                        Next: {nextClass.subject}
                      </h4>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Teacher: {nextClass.section ?? ''}
                      </p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Room: {nextClass.room}
                      </p>
                      <p className={`text-[10px] mt-1 font-medium line-clamp-2 ${getClassStatus(nextClass).color || (theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500')}`}>
                        {getClassStatus(nextClass).message || `Starts at ${nextClass.start_time}`}
                      </p>
                      {getClassStatus(nextClass).status === 'starting-soon' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>Get ready!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </div>

      {/* Action Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DashboardCard
          title="Take Attendance"
          description="Quickly mark attendance"
          icon={<CheckSquare size={20} />}
          onClick={() => setActivePage("take-attendance")}
        />

        <DashboardCard
          title="Schedule Class"
          description="Create or edit class schedule"
          icon={<PlusCircle size={20} />}
          onClick={() => setActivePage("timetable")}
        />

        <DashboardCard
          title="Mentoring"
          description="Open mentoring / proctor students"
          icon={<GraduationCap size={20} />}
          onClick={() => setActivePage("proctor-students")}
        />

        <DashboardCard
          title="View Reports"
          description="Open performance and attendance reports"
          icon={<FileBarChart size={20} />}
          onClick={() => setActivePage("statistics")}
        />
      </motion.div>
    </div>
  );
};

export default FacultyStats;