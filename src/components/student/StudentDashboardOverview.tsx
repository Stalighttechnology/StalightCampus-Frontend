import {
  FaBookOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaGraduationCap,
  FaCalendarAlt,
  FaPhone,
  FaWhatsapp,
  FaEnvelope
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from
  "chart.js";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getDashboardOverview } from "../../utils/student_api";
import { useTheme } from "@/context/ThemeContext";
import { API_BASE_URL } from "../../utils/config";
import { PLAN_TIERS } from "@/utils/planGating";

import { SkeletonStatsGrid, SkeletonChart, SkeletonPageHeader } from "../ui/skeleton";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface StudentDashboardOverviewProps {
  user: any;
  setPage: (page: string) => void;
}

interface DashboardData {
  student_profile?: {
    name: string;
    usn: string;
    branch: string;
    semester: number;
    section: string;
    profile_picture?: string;
    email: string;
    mobile_number: string;
    proctor?: {
      name: string | null;
      email: string | null;
      phone_number: string | null;
    } | null;
  };
  today_lectures: {
    count: number;
    next_lecture: {
      subject: string;
      start_time: string;
      teacher: string;
      room: string;
    } | null;
  };
  attendance_status: {
    percentage: number;
    warnings: Array<{
      subject: string;
      percentage: number;
    }>;
  };
  current_next_session: {
    live_time: string;
    current_session: {
      subject: string;
      teacher: string;
      room: string;
      start_time: string;
      end_time: string;
    } | null;
    next_session: {
      subject: string;
      teacher: string;
      room: string;
      start_time: string;
      starts_at: string;
    } | null;
  };
  performance_overview: {
    correlation: number;
    subject_performance: Array<{
      subject: string;
      attendance_percentage: number;
      average_mark: number;
    }>;
  };
}

const StudentDashboardOverview: React.FC<StudentDashboardOverviewProps> = ({ user, setPage }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [nextSession, setNextSession] = useState<any>(null);
  const [viewportTrigger, setViewportTrigger] = useState(0);
  const { theme } = useTheme();

  const userStr = typeof window !== 'undefined' ? sessionStorage.getItem("user") || localStorage.getItem("user") : null;
  const sessionUser = userStr ? JSON.parse(userStr) : null;
  const orgPlan = sessionUser?.org_plan || user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const format12Hour = useCallback((timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }, []);

  const parseTimeToMinutes = useCallback((timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  const isCurrentSession = useCallback((startTime: string, endTime: string) => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }, [currentTime, parseTimeToMinutes]);

  const getSessionStatus = useCallback((session: any) => {
    if (!session || !session.start_time) return null;

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = parseTimeToMinutes(session.start_time);
    const timeDifference = startMinutes - currentMinutes;

    if (timeDifference <= 0) return null;

    if (timeDifference <= 5) {
      return {
        status: 'starting-soon',
        message: `Starting in ${timeDifference} min`,
        color: theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
      };
    }

    if (timeDifference <= 15) {
      return {
        status: 'upcoming',
        message: `Starting in ${timeDifference} min`,
        color: theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
      };
    }

    return {
      status: 'later',
      message: `Starts at ${format12Hour(session.start_time)}`,
      color: theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    };
  }, [currentTime, parseTimeToMinutes, theme, format12Hour]);

  useEffect(() => {
    if (dashboardData && dashboardData.current_next_session) {
      const backendCurrentSession = dashboardData.current_next_session.current_session;
      const backendNextSession = dashboardData.current_next_session.next_session;

      if (backendCurrentSession && backendCurrentSession.start_time && backendCurrentSession.end_time) {
        if (isCurrentSession(backendCurrentSession.start_time, backendCurrentSession.end_time)) {
          setCurrentSession(backendCurrentSession);
        } else {
          setCurrentSession(null);
        }
      } else {
        setCurrentSession(null);
      }

      setNextSession(backendNextSession);
    }
  }, [dashboardData, currentTime, isCurrentSession]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const response = await getDashboardOverview();

        if (response.success && response.data) {
          if (response.data.student_profile?.profile_picture &&
            response.data.student_profile.profile_picture.startsWith('/media/')) {
            response.data.student_profile.profile_picture =
              `${API_BASE_URL}${response.data.student_profile.profile_picture}`;
          }

          setDashboardData(response.data);
          setError(null);
        } else {
          setError(response.message || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError('Network error occurred');

      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    const dataRefreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(dataRefreshInterval);
  }, []);

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setViewportTrigger((prev) => prev + 1);
      }, 250);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, []);

  const generateChartData = useMemo(() => {
    if (!dashboardData?.performance_overview.subject_performance) {
      return { labels: [], datasets: [] };
    }

    const subjects = dashboardData.performance_overview.subject_performance;
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

    return {
      labels: subjects.map((subject) => isMobile ? ((subject as any).subject_code || subject.subject) : subject.subject),
      datasets: [
        {
          label: 'Attendance %',
          data: subjects.map((subject) => subject.attendance_percentage),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Average Marks',
          data: subjects.map((subject) => subject.average_mark),
          backgroundColor: "rgba(168, 85, 247, 0.6)",
          borderColor: "rgba(168, 85, 247, 1)",
          borderWidth: 1,
          yAxisID: 'y1'
        }]

    };
  }, [dashboardData, theme]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: "easeInOutQuart"
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? "#fff" : "#000",
          font: { size: 11 }
        }
      },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? "#fff" : "#000",
          maxRotation: 45,
          font: { size: 10 }
        },
        grid: { display: false }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Attendance (%)',
          color: theme === 'dark' ? '#fff' : '#000',
          font: { size: 10 }
        },
        ticks: {
          color: theme === 'dark' ? "#fff" : "#000",
          font: { size: 10 }
        },
        grid: { color: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Avg Marks',
          color: theme === 'dark' ? '#fff' : '#000',
          font: { size: 10 }
        },
        grid: { drawOnChartArea: false },
        ticks: {
          color: theme === 'dark' ? "#fff" : "#000",
          font: { size: 10 }
        }
      }
    }
  }), [theme]);

  if (isLoading) {
    return (
      <div className={`p-4 space-y-6 ${theme === 'dark' ? 'bg-background text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={2} />
        <div className="space-y-4">
          <SkeletonChart className="h-[300px]" />
          <SkeletonChart className="h-[300px]" />
        </div>
      </div>);

  }

  if (error) {
    return (
      <div className={`p-4 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        <div className={`rounded-xl p-8 text-center shadow-xl ${theme === 'dark' ? 'bg-destructive/10 border border-destructive/20' : 'bg-red-50 border border-red-100'}`}>
          <div className="bg-destructive/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaExclamationTriangle className={`w-8 h-8 ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`} />
          </div>
          <h3 className={`text-xl font-semibold mb-3 ${theme === 'dark' ? 'text-destructive-foreground' : 'text-red-700'}`}>System Interruption</h3>
          <p className={`max-w-md mx-auto mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-full px-8 shadow-lg hover:scale-105 transition-transform">

            Reconnect
          </Button>
        </div>
      </div>);

  }

  // Render with skeleton loaders while loading (for onboarding tour to work)
  if (isLoading || !dashboardData) {
    return (
      <div className={`w-full space-y-5 ${theme === 'dark' ? 'bg-background text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
        {/* Skeleton Top Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card id="student-schedule-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}>
            <CardContent className="p-5">
              <SkeletonStatsGrid />
            </CardContent>
          </Card>
          <Card id="student-attendance-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}>
            <CardContent className="p-5">
              <SkeletonStatsGrid />
            </CardContent>
          </Card>
        </section>
        <Card id="student-timeline-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}>
          <CardContent className="p-5">
            <SkeletonChart />
          </CardContent>
        </Card>
        <Card id="student-performance-card" className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}>
          <CardContent className="p-5">
            <SkeletonChart />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-5  ${theme === 'dark' ? 'bg-background text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Lectures Card */}
        <Card
          id="student-schedule-card"
          className={`group relative overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm hover:shadow-md`}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`
              }>
                <FaCalendarAlt className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Schedule</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{dashboardData.today_lectures.count}</span>
                  <span className="text-sm font-medium text-muted-foreground">Lectures</span>
                </div>
                <div className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`
                }>
                  <div className={`w-1.5 h-1.5 rounded-full ${dashboardData.today_lectures.next_lecture ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <p className="font-medium truncate max-w-[200px]">
                    {dashboardData.today_lectures.next_lecture ?
                      `Next: ${dashboardData.today_lectures.next_lecture.subject}` :
                      "No more lectures today"
                    }
                  </p>
                  {dashboardData.today_lectures.next_lecture &&
                    <span className="ml-auto opacity-70 font-semibold">{dashboardData.today_lectures.next_lecture.start_time}</span>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status Card */}
        <Card
          id="student-attendance-card"
          className={`group relative overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm hover:shadow-md`}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${dashboardData.attendance_status.percentage >= 75 ?
                theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600' :
                theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`
              }>
                <FaCheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance Rating</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-semibold ${dashboardData.attendance_status.percentage >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>{dashboardData.attendance_status.percentage}%</span>
                  <span className="text-sm font-medium text-muted-foreground">Overall</span>
                </div>
                <div className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}`
                }>
                  <p className="font-medium truncate">
                    {dashboardData.attendance_status.warnings.length > 0 ?
                      `Action required: ${dashboardData.attendance_status.warnings[0].subject}` :
                      "Excellent consistency across all units"
                    }
                  </p>
                  {dashboardData.attendance_status.warnings.length > 0 &&
                    <span className="ml-auto font-semibold text-destructive">{dashboardData.attendance_status.warnings[0].percentage}%</span>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Parent Only: Proctor Card */}
      {user.role === 'parent' && dashboardData.student_profile?.proctor && (
        <section className="w-full">
          <Card className={`overflow-hidden border border-border shadow-sm mb-6 ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
            <CardHeader className="p-5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <CardTitle className="text-lg font-semibold">Proctor Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{dashboardData.student_profile.proctor.name || 'Not Assigned'}</h3>
                  <p className="text-sm text-muted-foreground">Academic Proctor</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {dashboardData.student_profile.proctor.phone_number ? (
                    <>
                      <a href={`tel:${dashboardData.student_profile.proctor.phone_number}`} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                        <FaPhone className="w-4 h-4" /> Call
                      </a>
                      <a
                        href={`https://wa.me/${dashboardData.student_profile.proctor.phone_number.length === 10 ? '91' + dashboardData.student_profile.proctor.phone_number : dashboardData.student_profile.proctor.phone_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        <FaWhatsapp className="w-4 h-4" /> WhatsApp
                      </a>
                    </>
                  ) : (
                    <div className="flex gap-3 w-full sm:w-auto opacity-50 cursor-not-allowed">
                      <button disabled className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        <FaPhone className="w-4 h-4" /> None
                      </button>
                      <button disabled className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium">
                        <FaWhatsapp className="w-4 h-4" /> None
                      </button>
                    </div>
                  )}
                  {dashboardData.student_profile.proctor.email ? (
                    <a href={`mailto:${dashboardData.student_profile.proctor.email}`} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                      <FaEnvelope className="w-4 h-4" /> Email
                    </a>
                  ) : (
                    <button disabled className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">
                      <FaEnvelope className="w-4 h-4" /> None
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Current & Next Session */}
      <section className="w-full">
        <Card
          id="student-timeline-card"
          className={`overflow-hidden border border-border shadow-sm ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}
        >
          <CardHeader className="p-5 border-b border-border/50">
            <div className="flex flex-row items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <CardTitle className="text-lg font-semibold">Active Timeline</CardTitle>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow-inner ${theme === 'dark' ? 'bg-white/5 text-primary' : 'bg-primary/10 text-primary'}`
              }>
                <FaClock className="w-4 h-4 animate-pulse" />
                <span className="text-sm">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentSession ?
                <div className={`relative group p-5 rounded-2xl border transition-all duration-500 overflow-hidden ${theme === 'dark' ?
                  'border-primary/40 bg-primary/10 hover:bg-primary/20' :
                  'border-primary bg-primary/5 hover:bg-primary/10'}`
                }>
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-colors"></div>

                  <div className="relative flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-semibold uppercase tracking-widest mb-2 shadow-lg animate-pulse">
                        Live Now
                      </span>
                      <h4 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                        {currentSession.subject}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase opacity-50">Location</p>
                      <p className="font-semibold text-sm">{currentSession.room}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                      <p className="text-[10px] font-semibold uppercase opacity-50">Instructor</p>
                      <p className="font-semibold text-sm truncate">{currentSession.teacher}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase opacity-50">Duration</p>
                      <p className="font-semibold text-sm">{format12Hour(currentSession.start_time)} - {format12Hour(currentSession.end_time)}</p>
                    </div>
                  </div>
                </div> :

                <div className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'border-border bg-muted/20' : 'border-gray-200 bg-gray-50'}`
                }>
                  <FaClock className={`w-8 h-8 mb-3 ${theme === 'dark' ? 'text-primary/60' : 'text-primary/60'}`} />
                  <div className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    <p className="text-lg font-semibold">No Active Session</p>
                    <p className="text-sm">There are no academic sessions currently in progress.</p>
                  </div>
                </div>
              }

              {nextSession ?
                <div className={`relative p-5 rounded-2xl border transition-all duration-300 ${theme === 'dark' ? 'bg-muted/30 border-border hover:border-primary/50' : 'bg-gray-50 border-gray-100 hover:border-gray-300'}`
                }>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-widest mb-2 ${getSessionStatus(nextSession)?.status === 'starting-soon' ? 'bg-orange-500 text-white animate-bounce' : 'bg-muted-foreground/20'}`
                      }>
                        Next Up
                      </span>
                      <h4 className="font-semibold text-lg leading-tight">
                        {nextSession.subject}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase opacity-50">
                        {getSessionStatus(nextSession)?.status === 'later' ? 'Starts At' : 'Starts In'}
                      </p>
                      <p className={`font-semibold text-sm ${getSessionStatus(nextSession)?.color}`}>
                        {getSessionStatus(nextSession)?.message.replace('Starts at ', '').replace('Starting in ', '')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                      <p className="text-[10px] font-semibold uppercase opacity-50">Room</p>
                      <p className="font-semibold text-sm">{nextSession.room}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase opacity-50">Instructor</p>
                      <p className="font-semibold text-sm truncate">{nextSession.teacher}</p>
                    </div>
                  </div>
                </div> :

                <div className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'border-border bg-muted/20' : 'border-gray-200 bg-gray-50'}`
                }>
                  <FaCalendarAlt className={`w-8 h-8 mb-3 ${theme === 'dark' ? 'text-primary/60' : 'text-primary/60'}`} />
                  <div className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    <p className="text-lg font-semibold">No Upcoming Sessions</p>
                    <p className="text-sm">No more lectures are scheduled for today.</p>
                  </div>
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Performance Overview */}
      {userTier >= 2 && (
        <section>
          <Card
            id="student-performance-card"
            className={`overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}
          >
            <CardHeader className="p-5 pb-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Comparative analytics of attendance vs academic scores</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="w-full h-[250px] md:h-[320px]">
                {dashboardData.performance_overview.subject_performance.length > 0 ?
                  <Bar key={`chart-${viewportTrigger}`} data={generateChartData} options={chartOptions} /> :

                  <div className="h-full flex flex-col items-center justify-center">
                    <div className={`p-10 w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-2 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                      <FaBookOpen className={`w-12 h-12 mb-2 ${theme === 'dark' ? 'text-primary/60' : 'text-primary/60'}`} />
                      <div className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        <p className="text-lg font-semibold">No Results Found</p>
                        <p className="text-sm">Academic performance metrics will be available once assessment data is published.</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>);

};

export default React.memo(StudentDashboardOverview);
