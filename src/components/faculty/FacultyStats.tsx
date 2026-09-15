import UpcomingMeetingsWidget from "../common/UpcomingMeetingsWidget";
import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from "react";
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
  Calendar,
  Video,
  ListTodo,
  Receipt,
  CreditCard,
  TrendingUp,
  Activity,
  QrCode,
  ShieldCheck,
  LogOut,
  LogIn,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Phone,
  Home,
  CheckCircle2
} from
  "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from
  "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { getSecurityGatePasses } from "@/utils/hms_api";
import { API_BASE_URL } from "@/utils/config";
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
  LabelList
} from
  "recharts";
import { motion } from "framer-motion";
import DashboardCard from "../common/DashboardCard";
import { FaUserGraduate, FaChalkboardTeacher, FaUserCheck } from "react-icons/fa";
import { getFacultyDashboardBootstrap } from "@/utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { PLAN_TIERS } from "@/utils/planGating";
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

const FacultyStats = React.forwardRef<HTMLDivElement, FacultyStatsProps>(({ setActivePage }, ref) => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [proctorStudentsCount, setProctorStudentsCount] = useState<number>(0);
  const [performanceTrends, setPerformanceTrends] = useState<{ avg_attendance_percent_30d?: number; avg_ia_mark?: number; }>({});
  const [subjectPerformanceTrends, setSubjectPerformanceTrends] = useState<SubjectPerformanceTrend[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [ongoingClasses, setOngoingClasses] = useState<TodayClass[]>([]);
  const [nextClasses, setNextClasses] = useState<TodayClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const { theme } = useTheme();

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;

  const branchName = (user?.branch_name || user?.branch || '').toString().toLowerCase();
  const deptName = (user?.department || '').toString().toLowerCase();
  const isSecurityRole = user?.role === 'security';
  const isGroupDRole = user?.role === 'group_d';
  const isNonTeaching = isSecurityRole || isGroupDRole || branchName.includes('non-teaching') || branchName.includes('non teaching') || deptName.includes('non-teaching') || deptName.includes('non teaching');

  // class/section filters removed; use per-subject trends instead
  const subjectOptions = [
    { value: "all", label: "All Subjects" },
    ...Array.from(new Set(subjectPerformanceTrends.map((t) => t.subject_id))).map((id) => {
      const trend = subjectPerformanceTrends.find((t) => t.subject_id === id)!;
      return {
        value: id.toString(),
        label: `${trend.subject_name} (${trend.subject_code})`
      };
    })];


  // Get filtered performance trends based on selected subject
  const getFilteredTrends = () => {
    if (selectedSubject === "all") {
      return subjectPerformanceTrends;
    }
    return subjectPerformanceTrends.filter((trend) => trend.subject_id.toString() === selectedSubject);
  };

  // Prepare chart data
  const chartData = getFilteredTrends().map((trend) => ({
    subject: trend.subject_code || trend.subject_name,
    attendance: trend.avg_attendance_percent_30d,
    iaMarks: trend.avg_ia_mark
  }));

  // Helper function to determine ongoing and next classes (supports split-view / multiple classes per slot)
  const determineClassStatus = (classes: TodayClass[]) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    const ongoingList: TodayClass[] = [];
    let earliestFutureMinutes: number | null = null;

    for (const cls of classes) {
      if (!cls.start_time || !cls.end_time) continue;
      const [startHour, startMin] = cls.start_time.split(':').map(Number);
      const [endHour, endMin] = cls.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        ongoingList.push(cls);
      } else if (currentTime < startMinutes) {
        if (earliestFutureMinutes === null || startMinutes < earliestFutureMinutes) {
          earliestFutureMinutes = startMinutes;
        }
      }
    }

    const nextList: TodayClass[] = [];
    if (earliestFutureMinutes !== null) {
      for (const cls of classes) {
        if (!cls.start_time) continue;
        const [startHour, startMin] = cls.start_time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        if (startMinutes === earliestFutureMinutes) {
          nextList.push(cls);
        }
      }
    }

    setOngoingClasses(ongoingList);
    setNextClasses(nextList);
  };

  // Live time for header (for display like student dashboard)
  const [nowDate, setNowDate] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => {
      setNowDate(new Date());
      if (todayClasses.length > 0) {
        determineClassStatus(todayClasses);
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [todayClasses]);

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
    if (isNonTeaching) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        // Fetch bootstrap data (proctor students, performance trends)

        const bootstrapRes = await getFacultyDashboardBootstrap();

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
              color: "green"
            },
            {
              label: "Attendance (30d)",
              value: bootstrapRes.data?.attendance_snapshot ?? performance_trends?.avg_attendance_percent_30d ?? 0,
              icon: <CheckSquare className="text-indigo-600 w-5 h-5" />,
              color: "indigo"
            },
            {
              label: "Avg IA Marks",
              value: performance_trends?.avg_ia_mark ?? bootstrapRes.data?.avg_ia_mark ?? 0.0,
              icon: <GraduationCap className="text-purple-600 w-5 h-5" />,
              color: "purple"
            }]
          );
        } else {
          setError(bootstrapRes.message || "Failed to load dashboard data");
        }

        // Use today's classes from bootstrap response (single-call dashboard)
        const todayClassesFromBootstrap = bootstrapRes.data?.today_classes || [];

        setTodayClasses(todayClassesFromBootstrap);
        determineClassStatus(todayClassesFromBootstrap);


      } catch (err) {
        setError("Network error occurred while fetching data");

      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  // We no longer load the full proctor student list on the dashboard.
  // Charts are replaced by aggregated performance metrics provided by the bootstrap API.

  // Security Portal State & Data Fetching
  const [securityPasses, setSecurityPasses] = useState<any[]>([]);
  const [securityStats, setSecurityStats] = useState({
    outside: 0,
    approved: 0,
    overdue: 0,
    checked_in: 0,
    today_movement: 0,
  });
  const [securityLoading, setSecurityLoading] = useState<boolean>(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  const isSecurityFetchingRef = React.useRef(false);

  const fetchSecurityInsights = async () => {
    if (!isSecurityRole || isSecurityFetchingRef.current) return;
    try {
      isSecurityFetchingRef.current = true;
      setSecurityLoading(true);
      setSecurityError(null);

      const [statsRes, passesRes] = await Promise.all([
        getSecurityGatePasses({ stats_only: true }),
        getSecurityGatePasses({ page_size: 20 }),
      ]);

      const statsObj = statsRes?.stats || (statsRes as any)?.data?.stats || (statsRes as any)?.data;
      if (statsObj && typeof statsObj === 'object') {
        setSecurityStats({
          outside: Number(statsObj.outside) || 0,
          approved: Number(statsObj.approved) || 0,
          overdue: Number(statsObj.overdue) || 0,
          checked_in: Number(statsObj.checked_in || statsObj.checked_in_today) || 0,
          today_movement: Number(statsObj.today_movement) || 0,
        });
      }

      const list = Array.isArray(passesRes?.results)
        ? passesRes.results
        : Array.isArray(passesRes?.data)
        ? passesRes.data
        : Array.isArray(passesRes?.data?.results)
        ? passesRes.data.results
        : Array.isArray(passesRes)
        ? passesRes
        : [];
      setSecurityPasses(list);
    } catch (err: any) {
      console.error("Error fetching security gate passes:", err);
      setSecurityError("Unable to load live gate pass data");
    } finally {
      isSecurityFetchingRef.current = false;
      setSecurityLoading(false);
    }
  };

  useEffect(() => {
    if (isSecurityRole) {
      fetchSecurityInsights();
      const interval = setInterval(fetchSecurityInsights, 30000);
      return () => clearInterval(interval);
    }
  }, [isSecurityRole]);

  const isPassOverdue = (pass: any) => {
    if (pass?.status !== 'checked_out') return false;
    if (!pass?.expected_return_time) return false;
    const exp = new Date(pass.expected_return_time);
    return !isNaN(exp.getTime()) && new Date() > exp;
  };

  const formatPassTime = (timeStr?: string) => {
    if (!timeStr) return "--:--";
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const formatPassDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getStudentPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) return photoPath;
    return `${API_BASE_URL.replace(/\/+$/, "")}/${photoPath.replace(/^\/+/, "")}`;
  };

  // If user is non-teaching staff
  if (isNonTeaching) {
    if (isSecurityRole) {
      const outsidePasses = securityPasses.filter(p => p.status === 'checked_out');
      const approvedPasses = securityPasses.filter(p => p.status === 'approved');
      const overduePasses = outsidePasses.filter(isPassOverdue);
      const checkedInPasses = securityPasses.filter(p => p.status === 'checked_in');

      const outsideCount = securityStats.outside || outsidePasses.length;
      const approvedCount = securityStats.approved || approvedPasses.length;
      const overdueCount = securityStats.overdue || overduePasses.length;
      const checkedInCount = securityStats.checked_in || checkedInPasses.length;

      return (
        <div className="w-full max-w-full space-y-6">
          {/* Security KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Outside Campus */}
            <Card className={`border shadow-sm transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currently Outside</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-amber-500">{outsideCount}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Students out on active pass</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <LogOut className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approved Ready for Exit */}
            <Card className={`border shadow-sm transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved for Exit</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-blue-500">{approvedCount}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Ready at gate for checkout</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue Returns */}
            <Card className={`border shadow-sm transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overdue Returns</p>
                    <h3 className={`text-3xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {overdueCount}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {overdueCount > 0 ? 'Late beyond return schedule' : 'All returns on time'}
                    </p>
                  </div>
                  <div className={`p-3.5 rounded-2xl ${overdueCount > 0 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Returned / Completed Today */}
            <Card className={`border shadow-sm transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Returned Safely</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-emerald-500">{checkedInCount}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Verified check-ins logged</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <LogIn className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2-Column Live Operational Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Live Gate Movement Activity Feed (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Live Gate Movement Register
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recent checkout / check-in events logged at campus gates
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePage("gate-pass-scanner")}
                    className="text-xs gap-1 text-primary hover:text-primary/80"
                  >
                    Open Scanner <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {securityLoading && securityPasses.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground space-y-3">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary opacity-60" />
                      <p className="text-sm">Loading live gate movements...</p>
                    </div>
                  ) : securityPasses.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl p-6">
                      <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-medium text-foreground">No gate movements found</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Approved gate passes and student check-out / check-in logs will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {securityPasses.slice(0, 10).map((pass: any) => {
                        const isOver = isPassOverdue(pass);
                        const photoUrl = getStudentPhotoUrl(pass.student_photo);

                        return (
                          <div
                            key={pass.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              isOver
                                ? 'bg-rose-500/10 border-rose-500/30'
                                : pass.status === 'checked_out'
                                ? 'bg-amber-500/5 border-amber-500/20'
                                : pass.status === 'checked_in'
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : theme === 'dark' ? 'bg-accent/30 border-border' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={pass.student_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm truncate">{pass.student_name || "Student"}</h4>
                                  <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {pass.student_usn || pass.pass_number}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                  {pass.hostel_name && (
                                    <span className="flex items-center gap-1">
                                      <Home className="w-3 h-3" /> {pass.hostel_name} {pass.room_number ? `(${pass.room_number})` : ''}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span className="truncate max-w-[160px]">"{pass.reason || 'Gate Pass'}"</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 pt-0.5">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    Warden: {pass.approved_by_name || pass.warden_name || "Approved"}
                                  </span>
                                  {pass.checked_out_by_name && (
                                    <>
                                      <span>•</span>
                                      <span className="text-blue-700 dark:text-blue-400 font-medium">
                                        Out by: {pass.checked_out_by_name}
                                      </span>
                                    </>
                                  )}
                                  {pass.checked_in_by_name && (
                                    <>
                                      <span>•</span>
                                      <span className="text-purple-700 dark:text-purple-400 font-medium">
                                        In by: {pass.checked_in_by_name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                              <div className="text-right">
                                {pass.status === 'checked_out' && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
                                    <LogOut className="w-3 h-3" /> Checked Out: {formatPassTime(pass.actual_out_time || pass.expected_out_time)}
                                  </Badge>
                                )}
                                {pass.status === 'checked_in' && (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
                                    <LogIn className="w-3 h-3" /> Returned: {formatPassTime(pass.actual_in_time)}
                                  </Badge>
                                )}
                                {pass.status === 'approved' && (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" /> Approved: Exit {formatPassTime(pass.expected_out_time)}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActivePage("gate-pass-scanner")}
                                className="h-8 px-2.5 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                              >
                                Scan
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Students Outside Campus & Expected Return Watch (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <LogOut className="w-5 h-5 text-amber-500" /> Currently Outside ({outsidePasses.length})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Active passes awaiting student return check-in
                    </p>
                  </div>
                  {overduePasses.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse text-xs">
                      {overduePasses.length} Overdue
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {outsidePasses.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl p-6">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60 mb-2" />
                      <p className="font-medium text-foreground">All students on campus</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        No students are currently recorded outside the campus grounds.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {outsidePasses.map((pass: any) => {
                        const isOver = isPassOverdue(pass);
                        const photoUrl = getStudentPhotoUrl(pass.student_photo);

                        return (
                          <div
                            key={pass.id}
                            className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                              isOver
                                ? 'bg-rose-500/10 border-rose-500/40'
                                : theme === 'dark' ? 'bg-accent/20 border-border' : 'bg-amber-50/50 border-amber-200/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {photoUrl ? (
                                    <img
                                      src={photoUrl}
                                      alt={pass.student_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-amber-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-sm truncate leading-tight">{pass.student_name}</h5>
                                  <p className="text-xs text-muted-foreground font-mono">{pass.student_usn}</p>
                                </div>
                              </div>

                              {isOver ? (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <AlertTriangle className="w-3 h-3" /> OVERDUE
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  Out Since {formatPassTime(pass.actual_out_time)}
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs grid grid-cols-2 gap-2 bg-background/60 p-2.5 rounded-lg border border-border/50">
                              <div>
                                <span className="text-muted-foreground block text-[10px] uppercase">Left Campus</span>
                                <span className="font-semibold">{formatPassTime(pass.actual_out_time || pass.expected_out_time)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] uppercase">Expected Back</span>
                                <span className={`font-semibold ${isOver ? 'text-rose-500' : ''}`}>
                                  {formatPassTime(pass.expected_return_time)}
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-border/40">
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                Warden: {pass.approved_by_name || pass.warden_name || "Approved"}
                              </span>
                              {pass.checked_out_by_name && (
                                <span className="text-blue-700 dark:text-blue-400 font-medium">
                                  Out by: {pass.checked_out_by_name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              {pass.student_phone ? (
                                <a
                                  href={`tel:${pass.student_phone}`}
                                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                                >
                                  <Phone className="w-3 h-3" /> {pass.student_phone}
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Home className="w-3 h-3" /> {pass.hostel_name || "Hostel"}
                                </span>
                              )}
                              <Button
                                size="sm"
                                onClick={() => setActivePage("gate-pass-scanner")}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 px-3"
                              >
                                <LogIn className="w-3.5 h-3.5" /> Check In
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    // Default portal view for other non-teaching staff (e.g. Group D)
    const portalTitle = isGroupDRole ? "Group D Portal" : "Non-Teaching Staff Portal";
    const portalDesc = "Access staff tools, submit leave requests, view tasks, and check payroll.";

    const nonTeachingActions = [
      { title: "My Attendance", desc: "View and track attendance history", icon: <CheckSquare className="w-6 h-6 text-indigo-500" />, page: "faculty-attendance" },
      { title: "Apply Leave", desc: "Request leave and check approval status", icon: <Calendar className="w-6 h-6 text-blue-500" />, page: "apply-leave" },
      { title: "Announcements", desc: "Read latest campus notifications", icon: <Bell className="w-6 h-6 text-amber-500" />, page: "faculty-announcement-management" },
      { title: "Schedule Meeting", desc: "View online meeting schedules", icon: <Video className="w-6 h-6 text-emerald-500" />, page: "schedule-meeting" },
      { title: "Staff Tasks", desc: "Check and update assigned tasks", icon: <ListTodo className="w-6 h-6 text-purple-500" />, page: "staff-tasks" },
      { title: "Reimbursements & Claims", desc: "Submit expense claims", icon: <Receipt className="w-6 h-6 text-rose-500" />, page: "reimbursements" },
      { title: "My Salary & Payroll", desc: "View payslips and salary details", icon: <CreditCard className="w-6 h-6 text-teal-500" />, page: "my-payroll" },
      { title: "My Profile", desc: "Manage personal information", icon: <User className="w-6 h-6 text-cyan-500" />, page: "faculty-profile" },
    ];

    return (
      <div className="w-full max-w-full space-y-6">
        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">{portalTitle}</h2>
          <p className="text-sm text-muted-foreground mb-6">{portalDesc}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
            {nonTeachingActions.map((act) => (
              <Card 
                key={act.page} 
                onClick={() => setActivePage(act.page)}
                className={`p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] border min-w-0 overflow-hidden flex flex-col justify-between ${theme === 'dark' ? 'bg-card/50 hover:bg-card border-border' : 'bg-gray-50/50 hover:bg-white border-gray-200'} shadow-sm hover:shadow-md`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2 min-w-0">
                    <div className="p-2 rounded-xl bg-background border shadow-xs flex-shrink-0">{act.icon}</div>
                    <h3 className="font-semibold text-sm sm:text-base leading-snug break-words min-w-0 flex-1">{act.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{act.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-full space-y-6">
        <SkeletonStatsGrid items={userTier >= 2 ? 3 : 1} columns={3} />
        <SkeletonChart className="h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground' : 'bg-red-100 text-red-700'}`}>
        {error}
      </div>
    );
  }

  return (
    <div ref={ref} className={`w-full max-w-full space-y-6 min-h-0 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Stats Cards (admin style) */}
      <motion.div id="faculty-stats-cards" className={`grid grid-cols-1 ${userTier >= 2 ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4 items-stretch`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        {userTier >= 2 && (
          <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <DashboardCard
              title={translateTerminology("Total Proctor Students")}
              value={proctorStudentsCount || 0}
              description="Students under your proctoring"
              icon={<FaUserGraduate className={theme === 'dark' ? "text-blue-400 text-3xl" : "text-blue-500 text-3xl"} />}
              className="h-full" />

          </motion.div>
        )}

        <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <DashboardCard
            title="Attendance (30d)"
            value={`${Math.round((performanceTrends?.avg_attendance_percent_30d ?? 0) * 10) / 10}%`}
            description="Average attendance (last 30 days)"
            icon={<FaChalkboardTeacher className={theme === 'dark' ? "text-purple-400 text-3xl" : "text-purple-500 text-3xl"} />}
            className="h-full" />

        </motion.div>

        {userTier >= 2 && (
          <motion.div className="h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <DashboardCard
              title="Avg IA Marks"
              value={performanceTrends?.avg_ia_mark ?? 0}
              description="Average internal assessment"
              icon={<FaUserCheck className={theme === 'dark' ? "text-green-400 text-3xl" : "text-green-500 text-3xl"} />}
              className="h-full" />

          </motion.div>
        )}
      </motion.div>

      {/* Main Content - stacked full-width rows */}
      <div className="flex flex-col gap-6 w-full">
        {/* Performance Trends (full width) */}
        {userTier >= 2 && (
          <Card id="faculty-charts" className={`h-full flex flex-col w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'} shadow-sm`}>
            <CardHeader id="faculty-charts-header" className="flex flex-col md:flex-row items-start md:items-center justify-between ">
              <div className="flex-1 text-left">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Performance Trends</CardTitle>
                <p className={`text-[16px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Average Attendance and IA marks per subject</p>
              </div>
              <div className="mt-3 md:mt-0 md:ml-4 flex-none w-full md:w-48">
                <Select onValueChange={(v) => setSelectedSubject(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {subjectOptions.map((opt) =>
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 h-full mt-3">
              {chartData.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <TrendingUp className="w-8 h-8 opacity-80" />
                  </div>
                  <h4 className={`text-lg sm:text-xl font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    No Performance Data Found
                  </h4>
                  <p className="text-sm sm:text-base max-w-md mx-auto leading-relaxed opacity-75">
                    Performance trends and IA averages will appear once attendance records and internal assessment marks are uploaded.
                  </p>
                </div>
              ) : (
                <div className="h-full flex flex-col md:flex-row gap-4 items-stretch">
                  {/* Bar chart - Average Attendance */}
                  <div className="flex-1 min-h-[240px] overflow-hidden custom-scrollbar">
                    <h4 className={`text-base sm:text-base font-semibold mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Average Attendance (30 days)</h4>
                    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                      <div style={{ width: chartData.length > 6 ? `${chartData.length * 70}px` : "100%", minWidth: "100%" }}>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2a2a2a' : '#eaeaea'} />
                            <XAxis dataKey="subject" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={45} />
                            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              formatter={(value: any) => `${value}%`}
                              contentStyle={{ backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', borderRadius: "8px", border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb' }}
                              labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                              itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                              cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                            />
                            <Bar dataKey="attendance" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                              <LabelList dataKey="attendance" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10 }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Line chart - IA Marks */}
                  <div className="flex-1 min-h-[240px] overflow-hidden custom-scrollbar">
                    <h4 className={`text-base sm:text-base font-semibold mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Average IA Marks</h4>
                    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                      <div style={{ width: chartData.length > 6 ? `${chartData.length * 70}px` : "100%", minWidth: "100%" }}>
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2a2a2a' : '#eaeaea'} />
                            <XAxis dataKey="subject" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={45} />
                            <YAxis />
                            <Tooltip
                              contentStyle={{ backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', borderRadius: "8px", border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb' }}
                              labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                              itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                            />
                            <Line type="monotone" dataKey="iaMarks" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current & Next Session (full width row) */}
        <section id="faculty-live-timer" className="w-full">
          <Card className={`h-full flex flex-col justify-between w-full ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
            <CardHeader className="p-3 md:p-4">
              <div id="live-session-timer-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-0">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Current & Next Session</CardTitle>
                <div className="flex items-center gap-2 text-xs md:text-xs">
                  <Clock className="w-4 h-4" />
                  <span className={`flex items-center gap-2 px-3 py-1 rounded-full font-medium shadow-sm text-sm sm:text-xs ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-900'}`
                  }>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Live: {nowDate.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="w-full flex-1 flex flex-col gap-3 md:gap-4 p-3 md:p-4">
              {ongoingClasses.length > 0 ? (
                <div className="flex flex-col gap-3.5 w-full">
                  {/* Ongoing Session Container */}
                  <div className={`border-2 border-blue-500/80 rounded-xl p-3.5 md:p-4 w-full shadow-sm flex flex-col gap-3 ${
                    theme === 'dark' ? 'bg-blue-950/20' : 'bg-blue-50/70'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className={`text-xs sm:text-sm font-bold tracking-wide uppercase ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                          Currently Running ({ongoingClasses[0].start_time} - {ongoingClasses[0].end_time})
                        </span>
                      </div>
                      {ongoingClasses.length > 1 && (
                        <Badge variant="secondary" className="text-[10.5px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                          {ongoingClasses.length} Concurrent Classes / Sections
                        </Badge>
                      )}
                    </div>

                    {/* Split-wise grid */}
                    <div className={`grid gap-3 w-full ${ongoingClasses.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {ongoingClasses.map((cls, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all ${
                            theme === 'dark' ? 'bg-card/90 border-blue-500/30' : 'bg-white border-blue-200 shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {cls.branch && (
                                  <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/5">
                                    {cls.branch}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10.5px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  {cls.semester ? `Sem ${cls.semester}` : 'Sem 1'} • Sec {cls.section || 'N/A'}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                                <span>{cls.room ? (cls.room.toLowerCase().startsWith('room') ? cls.room : `Room ${cls.room}`) : 'Room N/A'}</span>
                              </div>
                            </div>

                            <h4 className={`font-semibold text-base sm:text-lg leading-snug line-clamp-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {cls.subject}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-medium text-muted-foreground mt-3 pt-2.5 border-t border-border/60">
                            <div className="flex items-center gap-1.5 font-medium text-foreground/85">
                              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>Sem {cls.semester ?? '1'}, Section {cls.section ?? 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 font-semibold text-foreground">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>{cls.start_time} - {cls.end_time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Session Container */}
                  {nextClasses.length > 0 && (
                    <div className={`border rounded-xl p-3.5 md:p-4 w-full shadow-sm flex flex-col gap-3 ${
                      getClassStatus(nextClasses[0]).status === 'starting-soon'
                        ? (theme === 'dark' ? 'border-orange-500/40 bg-orange-950/20' : 'border-orange-300 bg-orange-50/60')
                        : (theme === 'dark' ? 'border-border bg-card/60' : 'border-gray-200 bg-gray-50/60')
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className={`text-xs sm:text-sm font-semibold tracking-wide ${getClassStatus(nextClasses[0]).color}`}>
                            {getClassStatus(nextClasses[0]).message || `Starts at ${nextClasses[0].start_time}`}
                          </span>
                        </div>
                        {nextClasses.length > 1 && (
                          <Badge variant="secondary" className="text-[10.5px] font-semibold px-2 py-0.5">
                            {nextClasses.length} Upcoming Classes
                          </Badge>
                        )}
                      </div>

                      {/* Split-wise grid for next classes */}
                      <div className={`grid gap-3 w-full ${nextClasses.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                        {nextClasses.map((cls, idx) => (
                          <div
                            key={idx}
                            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all ${
                              theme === 'dark' ? 'bg-card/90 border-border/80' : 'bg-white border-gray-200 shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {cls.branch && (
                                    <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border">
                                      {cls.branch}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10.5px] font-semibold">
                                    {cls.semester ? `Sem ${cls.semester}` : 'Sem 1'} • Sec {cls.section || 'N/A'}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                                  <span>{cls.room ? (cls.room.toLowerCase().startsWith('room') ? cls.room : `Room ${cls.room}`) : 'Room N/A'}</span>
                                </div>
                              </div>

                              <h4 className={`font-semibold text-base sm:text-lg leading-snug line-clamp-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {cls.subject}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-medium text-muted-foreground mt-3 pt-2.5 border-t border-border/60">
                              <div className="flex items-center gap-1.5 font-medium text-foreground/85">
                                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>Sem {cls.semester ?? '1'}, Section {cls.section ?? 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1 font-semibold text-foreground">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>{cls.start_time} - {cls.end_time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No Ongoing Class */
                <div className="w-full flex flex-col gap-3.5">
                  <div className={`flex flex-col items-center justify-center py-7 px-3 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${
                    theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'
                  }`}>
                    <div className={`p-4 rounded-full mb-3 ${theme === 'dark' ? 'bg-accent/20 text-primary/80' : 'bg-primary/10 text-primary/80'}`}>
                      <Activity className="w-7 h-7 opacity-60" />
                    </div>
                    <h4 className={`text-base sm:text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      No class is currently running
                    </h4>
                    <p className="text-xs sm:text-sm max-w-[240px] sm:max-w-md mx-auto leading-relaxed opacity-70">
                      Take a break or prepare for your next scheduled session.
                    </p>
                  </div>

                  {nextClasses.length > 0 && (
                    <div className={`border rounded-xl p-3.5 md:p-4 w-full shadow-sm flex flex-col gap-3 ${
                      getClassStatus(nextClasses[0]).status === 'starting-soon'
                        ? (theme === 'dark' ? 'border-orange-500/40 bg-orange-950/20' : 'border-orange-300 bg-orange-50/60')
                        : (theme === 'dark' ? 'border-border bg-card/60' : 'border-gray-200 bg-gray-50/60')
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className={`text-xs sm:text-sm font-semibold tracking-wide ${getClassStatus(nextClasses[0]).color}`}>
                            Next: {getClassStatus(nextClasses[0]).message || `Starts at ${nextClasses[0].start_time}`}
                          </span>
                        </div>
                        {nextClasses.length > 1 && (
                          <Badge variant="secondary" className="text-[10.5px] font-semibold px-2 py-0.5">
                            {nextClasses.length} Upcoming Classes
                          </Badge>
                        )}
                      </div>

                      {/* Split-wise grid for next classes */}
                      <div className={`grid gap-3 w-full ${nextClasses.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                        {nextClasses.map((cls, idx) => (
                          <div
                            key={idx}
                            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all ${
                              theme === 'dark' ? 'bg-card/90 border-border/80' : 'bg-white border-gray-200 shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {cls.branch && (
                                    <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border">
                                      {cls.branch}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10.5px] font-semibold">
                                    {cls.semester ? `Sem ${cls.semester}` : 'Sem 1'} • Sec {cls.section || 'N/A'}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                                  <span>{cls.room ? (cls.room.toLowerCase().startsWith('room') ? cls.room : `Room ${cls.room}`) : 'Room N/A'}</span>
                                </div>
                              </div>

                              <h4 className={`font-semibold text-base sm:text-lg leading-snug line-clamp-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {cls.subject}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-medium text-muted-foreground mt-3 pt-2.5 border-t border-border/60">
                              <div className="flex items-center gap-1.5 font-medium text-foreground/85">
                                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>Sem {cls.semester ?? '1'}, Section {cls.section ?? 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1 font-semibold text-foreground">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>{cls.start_time} - {cls.end_time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
        id="faculty-action-cards"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}>

        <DashboardCard
          title="Take Attendance"
          description="Quickly mark attendance"
          icon={<CheckSquare size={20} />}
          onClick={() => setActivePage("take-attendance")} />


        <DashboardCard
          title="Timetable"
          description="Know your upcoming/ongoing classes"
          icon={<PlusCircle size={20} />}
          onClick={() => setActivePage("timetable")} />


        {userTier >= 2 && (
          <DashboardCard
            title={translateTerminology("Mentoring")}
            description="Open mentoring / proctor students"
            icon={<GraduationCap size={20} />}
            onClick={() => setActivePage("proctor-students")} />
        )}

        {userTier >= 3 && (
          <DashboardCard
            title="View Reports"
            description="Open performance and attendance reports"
            icon={<FileBarChart size={20} />}
            onClick={() => setActivePage("statistics")} />
        )}
      </motion.div>
    </div>);

});

export default FacultyStats;