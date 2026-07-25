import React, { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardCard from '../common/DashboardCard';
import {
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { motion } from "framer-motion";
import { SkeletonStatsGrid, SkeletonCard } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

const DeanFinance = ({ isReadOnly = false }: { isReadOnly?: boolean }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/finance-summary/`);
        const json = await res.json();
        if (!mounted) return;
        if (json.success) {
          setDashboardData(json.data);
        }
        else setError(json.message || 'Failed to load dashboard data');
      } catch (e: any) {
        setError(e?.message || 'Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStatsGrid items={4} columns={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SkeletonCard className="lg:col-span-2 h-[400px]" />
          <SkeletonCard className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* Dashboard Cards - Stats Grid */}
      <div id="dean-finance-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 min-[1250px]:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Collected"
          value={formatCurrency(dashboardData?.stats?.total_collected || 0)}
          description="Cumulative fee collection"
          icon={<IndianRupee className={theme === 'dark' ? "text-emerald-400" : "text-emerald-500"} />}
        />
        <DashboardCard
          title="Outstanding Amount"
          value={formatCurrency(dashboardData?.stats?.outstanding_amount || 0)}
          description="Pending fee balance"
          icon={<AlertTriangle className={theme === 'dark' ? "text-amber-400" : "text-amber-500"} />}
        />
        <DashboardCard
          title="Overdue Amount"
          value={formatCurrency(dashboardData?.stats?.overdue_amount || 0)}
          description="Requires immediate attention"
          icon={<AlertCircle className={theme === 'dark' ? "text-rose-400" : "text-rose-500"} />}
        />
        <DashboardCard
          title="Collection Rate"
          value={`${dashboardData?.stats?.collection_rate || 0}%`}
          description="Efficiency Target: 95%"
          icon={<TrendingUp className={theme === 'dark' ? "text-blue-400" : "text-blue-500"} />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend Chart */}
        <div id="dean-finance-charts-container" className={`lg:col-span-2 rounded-lg shadow p-6 ${theme === 'dark' ? 'border border-border bg-card' : 'border border-gray-200 bg-white'}`}>
          <div className="flex flex-row items-center justify-between mb-6">
            <div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Revenue Trends</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Monthly collection performance</p>
            </div>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none font-bold">Last 6 Months</Badge>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.trends || []}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Card */}
        <div className="space-y-6">
          <div className={`rounded-lg shadow p-6 overflow-hidden relative min-h-[200px] flex flex-col justify-center border transition-all ${
            theme === 'dark' 
              ? 'bg-blue-950/20 border-blue-800/30 text-blue-100' 
              : 'bg-blue-50 border-blue-100 text-blue-900'
          }`}>
            <div className={`absolute -right-4 -bottom-4 opacity-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-200'}`}>
              <TrendingUp className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-2">Collection Target Progress</h4>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-700/80'}`}>
                Our current fee collection rate is <strong>{dashboardData?.stats?.collection_rate || 0}%</strong>. A collection rate of <strong>95%</strong> is required to meet this semester's targets.
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, dashboardData?.stats?.collection_rate || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Current: {dashboardData?.stats?.collection_rate || 0}%</span>
                <span>Target: 95%</span>
              </div>
            </div>
          </div>

          <div className={`rounded-lg shadow p-6 ${theme === 'dark' ? 'border border-border bg-card' : 'border border-gray-200 bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Stats</h3>
            <div className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Pending Invoices</span>
                <span className="font-bold">{dashboardData?.stats?.pending_invoices || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Overdue Count</span>
                <span className="font-bold text-rose-500">{dashboardData?.stats?.overdue_count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Total Students</span>
                <span className="font-bold">{dashboardData?.stats?.total_students || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DeanFinance;
