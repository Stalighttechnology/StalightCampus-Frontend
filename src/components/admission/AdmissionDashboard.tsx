import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CheckCircle, UserCheck, AlertCircle, BarChart2 } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { useTheme } from "../../context/ThemeContext";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface AnalyticsData {
  total_enquiries: number;
  total_applications: number;
  admissions_confirmed: number;
  enrolled: number;
  status_counts: Array<{ status: string; count: number }>;
  course_counts?: Array<{ course_interested__name: string; count: number }>;
}

const COLORS = [
  "rgba(59, 130, 246, 0.6)",
  "rgba(168, 85, 247, 0.6)",
  "rgba(234, 179, 8, 0.6)",
  "rgba(236, 72, 153, 0.6)",
  "rgba(34, 197, 94, 0.6)",
  "rgba(249, 115, 22, 0.6)"
];

const BORDER_COLORS = [
  "rgba(59, 130, 246, 1)",
  "rgba(168, 85, 247, 1)",
  "rgba(234, 179, 8, 1)",
  "rgba(236, 72, 153, 1)",
  "rgba(34, 197, 94, 1)",
  "rgba(249, 115, 22, 1)"
];

const AdmissionDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/analytics/`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-border">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-7 w-12 bg-muted rounded" />
                  <div className="h-3 w-28 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse border-border">
              <CardHeader className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-3 w-60 bg-muted rounded" />
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-[12px] border-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate new leads
  const newLeads = data?.status_counts?.find(s => s.status.toLowerCase() === 'new' || s.status.toLowerCase() === 'enquiry_received' || s.status.toLowerCase() === 'pending')?.count || 0;

  // Prepare Pie Chart Data
  const pieData = {
    labels: data?.status_counts?.map(s => s.status.replace(/_/g, ' ').toUpperCase()) || [],
    datasets: [
      {
        data: data?.status_counts?.map(s => s.count) || [],
        backgroundColor: COLORS,
        borderColor: BORDER_COLORS,
        borderWidth: 1
      }
    ]
  };

  // Prepare Bar Chart Data
  const barData = {
    labels: data?.course_counts?.map(c => c.course_interested__name || 'Unknown') || [],
    datasets: [
      {
        label: "Enquiries",
        data: data?.course_counts?.map(c => c.count) || [],
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-6">
      {newLeads > 0 && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-primary font-semibold text-lg">Action Required: New Leads</h3>
            <p className="text-primary/80 text-sm">You have <strong>{newLeads}</strong> new enquiries in your pipeline waiting to be contacted. Prompt responses increase conversion rates!</p>
          </div>
        </div>
      )}
      
      {/* Premium Stats Grid */}
      <div id="admission-stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Enquiries",
            value: data?.total_enquiries || 0,
            subtitle: "Total leads captured",
            icon: <Users className="text-blue-600 w-6 h-6" />,
            bgColor: "bg-blue-100 dark:bg-blue-950/50",
            textColor: "text-blue-600 dark:text-blue-400"
          },
          {
            title: "Active Applications",
            value: data?.total_applications || 0,
            subtitle: "Forms submitted",
            icon: <FileText className="text-purple-600 w-6 h-6" />,
            bgColor: "bg-purple-100 dark:bg-purple-950/50",
            textColor: "text-purple-600 dark:text-purple-400"
          },
          {
            title: "Admissions Confirmed",
            value: data?.admissions_confirmed || 0,
            subtitle: "Seats allocated",
            icon: <CheckCircle className="text-green-600 w-6 h-6" />,
            bgColor: "bg-green-100 dark:bg-green-950/50",
            textColor: "text-green-600 dark:text-green-400"
          },
          {
            title: "Enrolled Students",
            value: data?.enrolled || 0,
            subtitle: "Admission complete",
            icon: <UserCheck className="text-amber-600 w-6 h-6" />,
            bgColor: "bg-amber-100 dark:bg-amber-950/50",
            textColor: "text-amber-600 dark:text-amber-400"
          },
        ].map((item, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-border">
            <CardContent className="p-6 flex items-center gap-5">
              <div className={`flex items-center justify-center w-14 h-14 rounded-full flex-shrink-0 ${item.bgColor} ${item.textColor}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.title}</p>
                <p className="text-3xl font-bold text-foreground my-0.5">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div id="admission-charts-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Breakdown Pie Chart */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              <CardTitle>Pipeline Breakdown</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Distribution of students across stages</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-2 flex items-center justify-center">
              {data?.status_counts && data.status_counts.length > 0 ? (
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "right",
                        labels: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      },
                      tooltip: { enabled: true }
                    }
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  No pipeline data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Preferences Bar Chart */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              <CardTitle>Course Demand</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Number of enquiries per course</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-2 flex items-center justify-center">
              {data?.course_counts && data.course_counts.length > 0 ? (
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: 800,
                      easing: "easeInOutQuart"
                    },
                    plugins: {
                      legend: {
                        position: "top",
                        labels: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      },
                      tooltip: { enabled: true }
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      },
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "Count",
                          color: theme === 'dark' ? "#fff" : "#000"
                        },
                        ticks: {
                          color: theme === 'dark' ? "#fff" : "#000"
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  No course preference data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdmissionDashboard;
