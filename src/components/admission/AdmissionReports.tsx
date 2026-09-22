import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, PieChart as PieChartIcon, TrendingUp, Users, Loader2 } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonStatsGrid, SkeletonForm, SkeletonChart } from '../ui/skeleton';

export default function AdmissionReports() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportFormat, setReportFormat] = useState('csv');
  const [reportType, setReportType] = useState('course');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/analytics/`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const { theme } = useTheme();

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid items={3} columns={3} />
        <SkeletonForm fields={4} />
        <SkeletonChart />
      </div>
    );
  }

  const conversionRate = analytics.total_enquiries > 0
    ? ((analytics.total_applications / analytics.total_enquiries) * 100).toFixed(1)
    : 0;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

  const handleGenerateReport = () => {
    const isCourseReport = reportType === 'course';
    const dataList = isCourseReport ? analytics.course_counts : analytics.status_counts;

    if (!dataList || dataList.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = isCourseReport
      ? ['Course Name', 'Total Enquiries']
      : ['Status', 'Total Enquiries'];

    const rows = dataList.map((c: any) => isCourseReport
      ? [c.course_interested__name || 'Unknown', c.count]
      : [(c.status || '').replace(/_/g, ' ').toUpperCase(), c.count]
    );

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map((e: any[]) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const reportName = isCourseReport ? 'Course_Preference_Report' : 'Status_Breakdown_Report';
    link.setAttribute("download", `${reportName}_${new Date().toISOString().split('T')[0]}.${reportFormat}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admission-reports-container" className="space-y-6">
      <div id="admission-reports-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Enquiries</p>
                <h3 className="text-3xl font-semibold text-foreground">{analytics.total_enquiries}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-medium">
              Total leads captured in pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Applications</p>
                <h3 className="text-3xl font-semibold text-foreground">{analytics.total_applications}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <FileTextIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-medium">
              Total submitted applications
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Conversion Rate</p>
                <h3 className="text-3xl font-semibold text-foreground">{conversionRate}%</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <PieChartIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-medium">
              Enquiry to Application conversion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader id="admission-reports-header" className="border-b pb-4">
          <CardTitle className="sm:text-2xl text-xl font-semibold">Admission Reports & Analytics</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Generate custom csv reports and view metrics visualization.</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={val => setReportType(val)}>
                <SelectTrigger className="w-full bg-background border-input text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Course Preference Report</SelectItem>
                  <SelectItem value="status">Status Breakdown Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select defaultValue="30days">
                <SelectTrigger className="w-full bg-background border-input text-sm">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="alltime">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={reportFormat} onValueChange={val => setReportFormat(val)}>
                <SelectTrigger className="w-full bg-background border-input text-sm">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV Data</SelectItem>
                  <SelectItem value="xlsx">Excel Spreadsheet (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleGenerateReport}>
              <Download className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </div>

          <div className="border-t border-border pt-8">
            <h3 className="text-lg font-semibold mb-6">
              Visual Preview: {reportType === 'course' ? 'Course Preferences' : 'Pipeline Status Breakdown'}
            </h3>
            <div className="h-[300px] w-full">
              {(reportType === 'course' ? analytics?.course_counts : analytics?.status_counts)?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportType === 'course' ? analytics.course_counts : analytics.status_counts}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="count"
                      nameKey={reportType === 'course' ? 'course_interested__name' : 'status'}
                      label={reportType === 'status' ? (entry) => entry.status.replace(/_/g, ' ').toUpperCase() : true}
                    >
                      {(reportType === 'course' ? analytics.course_counts : analytics.status_counts).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name: string) => [value, reportType === 'status' ? name.replace(/_/g, ' ').toUpperCase() : (name || 'Unknown Course')]}
                      contentStyle={{ backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', borderRadius: "8px", border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb' }}
                      labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                      itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-sm font-medium" style={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}>
                          {reportType === 'status' ? value.replace(/_/g, ' ').toUpperCase() : (value || 'Unknown Course')}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  No data available for this report type yet
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Temporary Icon Component
const FileTextIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
);
