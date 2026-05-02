import React, { useEffect, useState } from "react";
import { FileText, BookOpen, Clock, CheckCircle, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
  Cell
} from "recharts";
import { getCOEDashboardStats, DashboardStats } from "../../utils/coe_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonChart, SkeletonTable } from "../ui/skeleton";

const COEDashboardStats = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await getCOEDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setStats(null);
      }
    } catch (e) {
      console.error("Error loading COE dashboard:", e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("approved")) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
    }
    if (s.includes("rejected")) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
    }
    if (s.includes("applied") || s.includes("pending")) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid items={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="p-6 rounded-lg border bg-card space-y-4">
          <SkeletonTable rows={5} cols={5} />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load dashboard statistics</p>
      </div>
    );
  }

  // Application Pie Chart Data
  const appStatusData = [
    { name: "Approved", value: stats.approved_applications || 0, color: "#10b981" },
    { name: "Pending", value: stats.pending_applications || 0, color: "#f59e0b" },
    { name: "Rejected", value: stats.rejected_applications || 0, color: "#ef4444" },
  ];

  // Dummy Application Trend Chart Data (until backend sends it)
  const trendData = (stats as any).application_trend || [
    { week: "Week 1", count: 12 },
    { week: "Week 2", count: 18 },
    { week: "Week 3", count: 25 },
    { week: "Week 4", count: 14 },
    { week: "Week 5", count: stats.total_applications > 0 ? stats.total_applications : 0 },
  ];

  const totalApplications = stats.total_applications || 0;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const entry = appStatusData[index] || { name: '', value: 0 };
    if (entry.value === 0) return null;
    return (
      <text x={x} y={y} fill={theme === 'dark' ? '#e5e7eb' : '#111827'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {entry.name}: {entry.value}
      </text>
    );
  };

  return (
    <div ref={ref} className={`space-y-6 font-sans min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Applications",
            value: stats.total_applications?.toString() || "0",
            icon: <FileText />,
            color: "text-blue-600",
            bg: "bg-blue-600/10"
          },
          {
            title: "Pending Approval",
            value: stats.pending_applications?.toString() || "0",
            icon: <Clock />,
            color: "text-yellow-600",
            bg: "bg-yellow-600/10"
          },
          {
            title: "Question Papers",
            value: stats.qp_stats?.total_qps?.toString() || "0",
            icon: <BookOpen />,
            color: "text-indigo-600",
            bg: "bg-indigo-600/10"
          },
          {
            title: "Published Results",
            value: stats.published_results_summary?.total_published_results?.toString() || "0",
            icon: <CheckCircle />,
            color: "text-green-600",
            bg: "bg-green-600/10"
          },
        ].map((item, i) => (
          <div
            key={i}
            className={`p-5 rounded-lg shadow-sm flex items-center gap-4 border transition-shadow hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}
          >
            <div className={`flex items-center justify-center w-14 h-14 rounded-full ${item.bg}`}>
              <span className={`text-2xl ${item.color}`}>{item.icon}</span>
            </div>
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{item.title}</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trend Chart */}
        <div className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Application Trends</h3>
          </div>
          <p className="text-sm mb-6 text-muted-foreground">Weekly application submission volume</p>
          <div className="min-h-[250px]">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#3f3f46' : '#e5e7eb'} />
                <XAxis dataKey="week" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={12} />
                <YAxis allowDecimals={false} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', borderRadius: "8px", border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb' }}
                  itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} name="Applications" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Application Status</h3>
          </div>
          <p className="text-sm mb-6 text-muted-foreground">Distribution of exam application statuses</p>
          <div className="min-h-[250px] focus:outline-none">
            {totalApplications === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm italic">
                No applications submitted yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={appStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {appStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {theme === 'dark' && <circle cx="50%" cy="50%" r={50} fill="#0b1220" opacity={0.06} />}
                  <text x="50%" y="46%" textAnchor="middle" fill={theme === 'dark' ? '#cbd5e1' : '#6b7280'} fontSize={12}>Total</text>
                  <text x="50%" y="58%" textAnchor="middle" fill={theme === 'dark' ? '#e5e7eb' : '#0f172a'} fontSize={24} fontWeight={700}>
                    {totalApplications}
                  </text>
                  <Tooltip
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', borderRadius: "8px", border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Published Results Table */}
        <div className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border flex flex-col h-full`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Recent Published Results</h3>
            <a href="/coe/publish-results" className={`text-sm font-medium px-4 py-2 rounded-md transition ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
              View All
            </a>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="py-3 px-4 font-medium">Batch / Details</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Published Date</th>
                  <th className="py-3 px-4 font-medium text-right">Action Links</th>
                </tr>
              </thead>
              <tbody>
                {(!stats.published_results_summary || stats.published_results_summary.recent_published_results.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">No recent published results</td>
                  </tr>
                ) : (
                  (stats.published_results_summary.recent_published_results || []).slice(0, 5).map((pr: any, idx) => (
                    <tr key={idx} className={`border-b last:border-none transition-colors ${theme === 'dark' ? 'border-border hover:bg-accent/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <td className="py-4 px-4">
                        <div className="font-medium text-sm text-primary">{pr.batch_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Sem {pr.semester_number} • {pr.exam_period}</div>
                        <span className="text-[10px] text-muted-foreground sm:hidden block mt-1">{pr.published_at}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">{pr.published_at}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/results/view/${pr.token}`;
                              navigator.clipboard.writeText(url);
                              alert('Link copied to clipboard!');
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${theme === 'dark' ? 'bg-muted/50 hover:bg-muted text-foreground' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                            title="Copy Link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy Link
                          </button>
                          <button
                            onClick={() => window.open(`/results/view/${pr.token}`, '_blank')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${theme === 'dark' ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
                            title="Open Link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            Open Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

COEDashboardStats.displayName = 'COEDashboardStats';

export default COEDashboardStats;
