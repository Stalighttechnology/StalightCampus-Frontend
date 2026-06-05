import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CheckCircle, UserCheck, Loader2, AlertCircle, TrendingUp, BarChart2 } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AnalyticsData {
  total_enquiries: number;
  total_applications: number;
  admissions_confirmed: number;
  enrolled: number;
  status_counts: Array<{ status: string; count: number }>;
  course_counts?: Array<{ course_interested__name: string; count: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

const AdmissionDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="p-6 flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  // Calculate new leads
  const newLeads = data?.status_counts?.find(s => s.status.toLowerCase() === 'new' || s.status.toLowerCase() === 'enquiry_received' || s.status.toLowerCase() === 'pending')?.count || 0;

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="h-[300px] w-full mt-2">
              {data?.status_counts && data.status_counts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.status_counts}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                      label={(entry) => entry.status.replace(/_/g, ' ').toUpperCase()}
                    >
                      {data.status_counts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name: string) => [value, name.replace(/_/g, ' ').toUpperCase()]} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
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
            <div className="h-[300px] w-full mt-2">
              {data?.course_counts && data.course_counts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.course_counts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="course_interested__name" 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(val) => val || 'Unknown'} 
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <RechartsTooltip 
                      formatter={(value) => [value, 'Enquiries']}
                      labelFormatter={(label) => label || 'Unknown Course'}
                    />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {data.course_counts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
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
