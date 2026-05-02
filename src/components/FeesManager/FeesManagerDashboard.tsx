import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../common/DashboardLayout';
import { useTheme } from '@/context/ThemeContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardCard from '../common/DashboardCard';
import {
  FileText,
  AlertTriangle,
  Calendar,
  IndianRupee,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  UserCheck,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import {
  getFeesManagerDashboard
} from "../../utils/fees_manager_api";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard,
  SkeletonChart
} from "@/components/ui/skeleton";


// Sub-components
import FeeTemplates from './FeeTemplates';
import FeeAssignments from './FeeAssignments';
import FeeComponents from './FeeComponents';
import IndividualFeeAssignment from './IndividualFeeAssignment';
import BulkAssignment from './BulkAssignment';
import InvoiceManagement from './InvoiceManagement';
import PaymentMonitoring from './PaymentMonitoring';
import Reports from './Reports';
import StudentFeeReports from './StudentFeeReports';
import FeesManagerLeave from './FeesManagerLeave';
import FeesManagerProfile from './FeesManagerProfile';

interface DashboardStats {
  total_students: number;
  total_collected: number;
  outstanding_amount: number;
  overdue_amount: number;
  collection_rate: number;
  pending_invoices: number;
  overdue_count: number;
}

interface TrendData {
  month: string;
  amount: number;
}

interface Transaction {
  id: number;
  student_name: string;
  amount: number;
  method: string;
  date: string;
  transaction_id: string;
}

interface DashboardData {
  user: { name: string };
  stats: DashboardStats;
  trends: TrendData[];
  recent_transactions: Transaction[];
}

interface FeesManagerDashboardProps {
  user: any;
  setPage: (page: string) => void;
}

const FeesManagerDashboard: React.FC<FeesManagerDashboardProps> = ({ user, setPage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getActivePageFromPath = (pathname: string) => {
    const path = pathname.replace('/fees-manager', '').replace('/', '');
    return path || 'dashboard';
  };

  const activePage = getActivePageFromPath(location.pathname);

  useEffect(() => {
    if (activePage === 'dashboard') {
      fetchDashboardData();
    }
  }, [activePage]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await getFeesManagerDashboard();

      if (!res.success) {
        if (res.message?.includes('401') || res.status === 401) {
          localStorage.clear();
          setPage("login");
          return;
        }
        throw new Error(res.message || 'Failed to fetch dashboard data');
      }

      setDashboardData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: string) => {
    const path = page === 'dashboard' ? '/fees-manager' : `/fees-manager/${page}`;
    navigate(path);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderDashboard = () => (
    <div className="space-y-8 pb-10">
      {/* Dashboard Cards - Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className={`lg:col-span-2 rounded-lg shadow p-6 ${theme === 'dark' ? 'border border-border bg-card' : 'border border-gray-200 bg-white'}`}>
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
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
          <div className={`rounded-lg shadow p-6 overflow-hidden relative min-h-[200px] flex flex-col justify-center border transition-all ${theme === 'dark'
              ? 'bg-blue-950/20 border-blue-800/30 text-blue-100'
              : 'bg-blue-50 border-blue-100 text-blue-900'
            }`}>
            <div className={`absolute -right-4 -bottom-4 opacity-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-200'}`}>
              <IndianRupee className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-2">Need Financial Assistance?</h4>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-700/80'}`}>Generate automated recovery notices for students with overdue balances exceeding ₹10,000.</p>
              <Button
                className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                onClick={() => handlePageChange('invoices')}
              >
                Run Recovery Notice
              </Button>
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

      {/* Recent Transactions Table */}
      <div className={`rounded-lg shadow mt-5 overflow-hidden ${theme === 'dark' ? 'border border-border bg-card' : 'border border-gray-200 bg-white'}`}>
        <div className="flex flex-row items-center justify-between p-6 border-b dark:border-slate-800">
          <div>
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Transactions</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Last 5 successful fee collections</p>
          </div>
          <Button variant="ghost" size="sm" className="font-bold text-blue-500 hover:text-blue-600" onClick={() => handlePageChange('payments')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-border text-foreground bg-slate-800/50' : 'border-gray-200 text-gray-900 bg-slate-50/50'}`}>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Student</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Transaction ID</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Method</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Date</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {dashboardData?.recent_transactions.map((txn, i) => (
                <tr key={i} className={`transition-colors ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold">{txn.student_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{txn.transaction_id}</code>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-bold capitalize">{txn.method}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{txn.date}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(txn.amount)}
                  </td>
                </tr>
              ))}
              {!dashboardData?.recent_transactions?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No recent transactions recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Cards Grid - Replaces Quick Actions Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <DashboardCard
          title="Bulk Assignment"
          description="Assign fees to batches"
          icon={<Plus size={20} />}
          onClick={() => handlePageChange("bulk-assignment")}
        />
        <DashboardCard
          title="Invoice Management"
          description="View or issue invoices"
          icon={<FileText size={20} />}
          onClick={() => handlePageChange("invoices")}
        />
        <DashboardCard
          title="Fee Components"
          description="Manage fee categories"
          icon={<Settings size={20} />}
          onClick={() => handlePageChange("components")}
        />
        <DashboardCard
          title="Fee Templates"
          description="Manage reusable templates"
          icon={<ClipboardList size={20} />}
          onClick={() => handlePageChange("templates")}
        />
        <DashboardCard
          title="Payment Monitoring"
          description="Track payments & refunds"
          icon={<IndianRupee size={20} />}
          onClick={() => handlePageChange("payments")}
        />
        <DashboardCard
          title="Financial Reports"
          description="Download collection reports"
          icon={<BarChart3 size={20} />}
          onClick={() => handlePageChange("reports")}
        />
        <DashboardCard
          title="Student Fee Reports"
          description="Individual student ledgers"
          icon={<UserCheck size={20} />}
          onClick={() => handlePageChange("student-reports")}
        />
        <DashboardCard
          title="Leave Requests"
          description="Manage your leave"
          icon={<Calendar size={20} />}
          onClick={() => handlePageChange("leave")}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return renderDashboard();
      case 'components': return <FeeComponents />;
      case 'templates': return <FeeTemplates />;
      case 'assignments': return <FeeAssignments />;
      case 'individual-fees': return <IndividualFeeAssignment />;
      case 'bulk-assignment': return <BulkAssignment />;
      case 'invoices': return <InvoiceManagement />;
      case 'payments': return <PaymentMonitoring />;
      case 'reports': return <Reports />;
      case 'student-reports': return <StudentFeeReports />;
      case 'leave': return <FeesManagerLeave />;
      case 'profile': return <FeesManagerProfile user={user} />;
      default: return renderDashboard();
    }
  };

  return (
    <DashboardLayout
      role="fees_manager"
      user={user}
      activePage={activePage}
      onPageChange={handlePageChange}
      pageTitle="Fees Manager Dashboard"
    >
      <div key={activePage}>
        {loading && activePage === 'dashboard' ? (
          <div className="space-y-8 pb-10">
            <SkeletonStatsGrid items={4} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <SkeletonChart className="h-[400px]" />
              </div>
              <div className="space-y-6">
                <SkeletonCard className="h-[200px]" />
                <SkeletonCard className="h-[200px]" />
              </div>
            </div>
            <SkeletonTable rows={5} cols={5} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </div>

    </DashboardLayout>
  );
};

export default FeesManagerDashboard;