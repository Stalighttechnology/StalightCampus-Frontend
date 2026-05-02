import {
  FaBookOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaGraduationCap,
  FaCalendarAlt,
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
  Legend,
} from "chart.js";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getDashboardOverview } from "../../utils/student_api";
import { useTheme } from "@/context/ThemeContext";

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

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
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
      message: `Starts at ${session.start_time}`,
      color: theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    };
  }, [currentTime, parseTimeToMinutes, theme]);

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
              `http://127.0.0.1:8000${response.data.student_profile.profile_picture}`;
          }
          
          setDashboardData(response.data);
          setError(null);
        } else {
          setError(response.message || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Dashboard fetch error:', err);
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
        setViewportTrigger(prev => prev + 1);
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
    
    return {
      labels: subjects.map(subject => subject.subject),
      datasets: [
        {
          label: 'Attendance %',
          data: subjects.map(subject => subject.attendance_percentage),
          backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)',
          borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 1)' : 'rgba(37, 99, 235, 1)',
          borderWidth: 0,
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          label: 'Average Marks',
          data: subjects.map(subject => subject.average_mark),
          backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(5, 150, 105, 0.8)',
          borderColor: theme === 'dark' ? 'rgba(16, 185, 129, 1)' : 'rgba(5, 150, 105, 1)',
          borderWidth: 0,
          borderRadius: 4,
          yAxisID: 'y1',
        }
      ]
    };
  }, [dashboardData, theme]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
          font: { size: 11 }
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? "rgba(31, 31, 33, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: theme === 'dark' ? "#f3f4f6" : "#111827",
        bodyColor: theme === 'dark' ? "#d1d5db" : "#4b5563",
        borderColor: theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        ticks: { 
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
          maxRotation: 45,
          font: { size: 10 }
        },
        grid: { display: false },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Attendance (%)',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: { size: 10 }
        },
        ticks: { 
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
          font: { size: 10 }
        },
        grid: { color: theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Avg Marks',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: { size: 10 }
        },
        grid: { drawOnChartArea: false },
        ticks: { 
          color: theme === 'dark' ? "#9ca3af" : "#6b7280",
          font: { size: 10 }
        },
      },
    },
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
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        <div className={`rounded-xl p-8 text-center shadow-xl ${theme === 'dark' ? 'bg-destructive/10 border border-destructive/20' : 'bg-red-50 border border-red-100'}`}>
          <div className="bg-destructive/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaExclamationTriangle className={`w-8 h-8 ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`} />
          </div>
          <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-destructive-foreground' : 'text-red-700'}`}>System Interruption</h3>
          <p className={`max-w-md mx-auto mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="rounded-full px-8 shadow-lg hover:scale-105 transition-transform"
          >
            Reconnect
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;
  return (
    <div className={`w-full space-y-5  ${theme === 'dark' ? 'bg-background text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Lectures Card */}
        <Card className={`group relative overflow-hidden transition-all duration-300 ${
          theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'
        } shadow-sm hover:shadow-md`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                <FaCalendarAlt className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Schedule</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{dashboardData.today_lectures.count}</span>
                  <span className="text-sm font-medium text-muted-foreground">Lectures</span>
                </div>
                <div className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dashboardData.today_lectures.next_lecture ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <p className="font-medium truncate max-w-[200px]">
                    {dashboardData.today_lectures.next_lecture 
                      ? `Next: ${dashboardData.today_lectures.next_lecture.subject}`
                      : "No more lectures today"
                    }
                  </p>
                  {dashboardData.today_lectures.next_lecture && (
                    <span className="ml-auto opacity-70 font-bold">{dashboardData.today_lectures.next_lecture.start_time}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status Card */}
        <Card className={`group relative overflow-hidden transition-all duration-300 ${
          theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'
        } shadow-sm hover:shadow-md`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                dashboardData.attendance_status.percentage >= 75 
                  ? (theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                  : (theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
              }`}>
                <FaCheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance Rating</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${
                    dashboardData.attendance_status.percentage >= 75 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>{dashboardData.attendance_status.percentage}%</span>
                  <span className="text-sm font-medium text-muted-foreground">Overall</span>
                </div>
                <div className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'
                }`}>
                  <p className="font-medium truncate">
                    {dashboardData.attendance_status.warnings.length > 0
                      ? `Action required: ${dashboardData.attendance_status.warnings[0].subject}`
                      : "Excellent consistency across all units"
                  }
                  </p>
                  {dashboardData.attendance_status.warnings.length > 0 && (
                    <span className="ml-auto font-bold text-destructive">{dashboardData.attendance_status.warnings[0].percentage}%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Current & Next Session */}
      <section className="w-full">
        <Card className={`overflow-hidden border border-border shadow-sm ${
          theme === 'dark' ? 'bg-card' : 'bg-white'
        }`}>
          <CardHeader className="p-5 border-b border-border/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <CardTitle className="text-lg font-bold">Active Timeline</CardTitle>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-inner ${
                theme === 'dark' ? 'bg-white/5 text-primary' : 'bg-primary/10 text-primary'
              }`}>
                <FaClock className="w-4 h-4 animate-pulse" />
                <span className="text-sm">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentSession ? (
                <div className={`relative group p-5 rounded-2xl border transition-all duration-500 overflow-hidden ${
                  theme === 'dark' 
                    ? 'border-primary/40 bg-primary/10 hover:bg-primary/20' 
                    : 'border-primary bg-primary/5 hover:bg-primary/10'
                }`}>
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-colors"></div>
                  
                  <div className="relative flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold uppercase tracking-widest mb-2 shadow-lg animate-pulse">
                        Live Now
                      </span>
                      <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                        {currentSession.subject}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase opacity-50">Location</p>
                      <p className="font-bold text-sm">{currentSession.room}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">Instructor</p>
                      <p className="font-semibold text-sm truncate">{currentSession.teacher}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">Duration</p>
                      <p className="font-semibold text-sm">{currentSession.start_time} - {currentSession.end_time}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center ${
                  theme === 'dark' ? 'border-border bg-muted/20' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <FaClock className="text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">Class Break</p>
                  <p className="text-xs opacity-60">No academic sessions active right now</p>
                </div>
              )}

              {nextSession && (
                <div className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                  theme === 'dark' ? 'bg-muted/30 border-border hover:border-primary/50' : 'bg-gray-50 border-gray-100 hover:border-gray-300'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest mb-2 ${
                        getSessionStatus(nextSession)?.status === 'starting-soon' ? 'bg-orange-500 text-white animate-bounce' : 'bg-muted-foreground/20'
                      }`}>
                        Next Up
                      </span>
                      <h4 className="font-bold text-lg leading-tight">
                        {nextSession.subject}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase opacity-50">Starts In</p>
                      <p className={`font-bold text-sm ${getSessionStatus(nextSession)?.color}`}>
                        {getSessionStatus(nextSession)?.message.split('at')[0].trim()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">Room</p>
                      <p className="font-semibold text-sm">{nextSession.room}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">Instructor</p>
                      <p className="font-semibold text-sm truncate">{nextSession.teacher}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Performance Overview */}
      <section>
        <Card className={`overflow-hidden transition-all duration-300 ${
          theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'
        } shadow-sm`}>
          <CardHeader className="p-5 pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <CardTitle className="text-lg font-bold">Performance Metrics</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Comparative analytics of attendance vs academic scores</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-6">
            <div className="w-full h-[250px] md:h-[320px]">
              {dashboardData.performance_overview.subject_performance.length > 0 ? (
                <Bar key={`chart-${viewportTrigger}`} data={generateChartData} options={chartOptions} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <FaBookOpen className="w-12 h-12 mb-2" />
                  <p className="text-sm font-bold">Awaiting academic results</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default React.memo(StudentDashboardOverview);