import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import DashboardCard from "../common/DashboardCard";
import { Activity, BookOpen, Calendar, Clock } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonStatsGrid } from "../ui/skeleton";

const API_BASE_URL = "http://127.0.0.1:8000";

const StudentStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/student/dashboard/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        });
        
        const data = await response.json();
        
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        setError("Network error while fetching dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid items={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border-l-4 p-4 mb-4 ${theme === 'dark' ? 'bg-destructive/20 border-destructive' : 'bg-red-50 border-red-500'}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${theme === 'dark' ? 'text-destructive' : 'text-red-400'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className={`text-sm ${theme === 'dark' ? 'text-destructive-foreground' : 'text-red-700'}`}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Overall Attendance"
          value={formatAttendancePercentage(stats?.attendance_status?.average || 0)}
          icon={<Activity className="text-blue-500" />}
          trend={{
            value: 2.5,
            isPositive: true
          }}
        />
        <DashboardCard
          title="Next Class"
          value={stats?.next_class?.subject || "No upcoming classes"}
          description={stats?.next_class ? `${stats.next_class.start_time} | Room ${stats.next_class.room}` : ""}
          icon={<Clock className="text-green-500" />}
        />
        <DashboardCard
          title="Today's Classes"
          value={stats?.today_classes || 0}
          icon={<Calendar className="text-purple-500" />}
        />
        <DashboardCard
          title="Pending Assignments"
          value={stats?.pending_assignments || 0}
          icon={<BookOpen className="text-orange-500" />}
        />
      </div>

      {/* Recent Activity */}
      <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Recent Activity</CardTitle>
          <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
            Your latest academic activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recent_activities?.map((activity: any, index: number) => (
              <div
                key={index}
                className={`flex items-center p-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}`}
              >
                <div className="mr-4">
                  <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/10'}`}>
                    <Activity className={`w-4 h-4 ${theme === 'dark' ? 'text-primary' : 'text-primary'}`} />
                  </div>
                </div>
                <div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{activity.title}</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{activity.timestamp}</p>
                </div>
              </div>
            ))}
            {(!stats?.recent_activities || stats.recent_activities.length === 0) && (
              <p className={`text-center py-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                No recent activities
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Low Attendance Warning */}
      {stats?.attendance_status?.below_75_count > 0 && (
        <Card className={theme === 'dark' ? 'border-destructive/50 bg-destructive/20' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-destructive' : 'text-red-700'}>Attendance Warning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={theme === 'dark' ? 'text-destructive-foreground' : 'text-red-600'}>
              Your attendance is below 75% in {stats.attendance_status.below_75_count}{" "}
              subject{stats.attendance_status.below_75_count > 1 ? "s" : ""}. Please improve your attendance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentStats;