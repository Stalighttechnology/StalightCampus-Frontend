import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Pie, Bar } from "react-chartjs-2";
import DashboardCard from "../common/DashboardCard";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonChart, SkeletonTable, SkeletonPageHeader } from "../ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { FaUserGraduate, FaChalkboardTeacher, FaUserTie, FaUserCheck, FaBuilding } from "react-icons/fa";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  TimeScale,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement, TimeScale);

type HodInfo = {
  hod_id: string;
  hod_name: string;
  contact?: string;
  status?: string;
  marked_at?: string | null;
  notes?: string | null;
};

type BranchRow = {
  branch_id: number;
  branch: string;
  hod: HodInfo | null;
  total_students: number;
  present_today: number;
  percent_present: number;
  faculty?: number;
};

const DeanStats = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [roleDistribution, setRoleDistribution] = useState<{[k:string]:number} | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/today-attendance/`, { method: 'GET' });
        const data = await res.json();
        if (!mounted) return;
        if (data.success) {
          // Backend may return either attendance rows + summary or a summary object with branch_distribution
            // Backend may return two shapes:
            // 1) compact: { success: true, summary: { ... } }
            // 2) full: { success: true, data: [...], summary: { ... } }
            if (data.summary) {
              const s = data.summary || {};
              setSummary(s);
              if (s.role_distribution) setRoleDistribution(s.role_distribution);
              // populate rows from summary.branch_distribution when available
              const branches = (s.branch_distribution || []).map((b: any, idx: number) => ({
                branch_id: idx + 1,
                branch: b.name,
                hod: null,
                total_students: b.students || 0,
                faculty: b.faculty || 0,
                present_today: 0,
                percent_present: 0,
              }));
              setRows(branches);
            } else {
              const payload = data.data || {};
              // If payload is an array of rows (old format)
              if (Array.isArray(payload)) {
                setRows(payload || []);
                setSummary(data.summary || null);
                if (data.summary && data.summary.role_distribution) setRoleDistribution(data.summary.role_distribution);
              } else {
                const s = payload || {};
                setSummary(s);
                const branches = (s.branch_distribution || []).map((b: any, idx: number) => ({
                  branch_id: idx + 1,
                  branch: b.name,
                  hod: null,
                  total_students: b.students || 0,
                  faculty: b.faculty || 0,
                  present_today: 0,
                  percent_present: 0,
                }));
                setRows(branches);
                if (s.role_distribution) setRoleDistribution(s.role_distribution);
              }
            }
        } else {
          setError(data.message || 'Failed to load');
        }
      } catch (e: any) {
        setError(e?.message || 'Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);


  const totalBranches = summary?.total_branches ?? rows.length;
  const totalStudents = summary?.total_students ?? summary?.total_students_all ?? rows.reduce((s, r) => s + (r.total_students || 0), 0);
  const totalFaculty = summary?.total_faculty ?? rows.reduce((s, r) => s + (r.faculty || 0), 0);
  const totalHods = summary?.total_hods ?? 0;
  const totalCoe = summary?.total_coe ?? 0;
  const totalPresent = summary?.total_present_all ?? rows.reduce((s, r) => s + (r.present_today || 0), 0);
  const overallPercent = totalStudents ? Math.round((totalPresent / totalStudents) * 100) : 0;
  
  // Prefer summary.branch_distribution when available (backend summary-only payload)
  const branchStats = (summary && Array.isArray(summary.branch_distribution))
    ? summary.branch_distribution.map((b: any, idx: number) => ({
        branch_id: idx + 1,
        branch: b.name,
        total_students: b.students || 0,
        faculty: b.faculty || 0,
      }))
    : rows.map((r) => ({ branch_id: r.branch_id, branch: r.branch, total_students: r.total_students || 0, faculty: r.faculty || 0 }));
  
  const topBranches = branchStats.slice().sort((a, b) => (b.total_students || 0) - (a.total_students || 0)).slice(0, 6);

  // Pie: use roleDistribution if provided, otherwise fallback to present/absent pie
  const pieData = roleDistribution
    ? {
        labels: Object.keys(roleDistribution),
        datasets: [
          {
            data: Object.values(roleDistribution),
            backgroundColor: ['#60a5fa', '#34d399', '#f97316', '#ef4444'],
          },
        ],
      }
    : {
        labels: ['Present', 'Absent'],
        datasets: [
          {
            data: [totalPresent, Math.max(0, totalStudents - totalPresent)],
            backgroundColor: ['#10b981', '#ef4444'],
          },
        ],
      };

  const barData = {
    labels: branchStats.map((b) => b.branch),
    datasets: [
      {
        label: 'Students',
        data: branchStats.map((b) => b.total_students || 0),
        backgroundColor: '#6366f1',
      },
    ],
  };


  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: { color: theme === 'dark' ? '#ffffff' : '#111827' },
      },
    },
    scales: {
      x: { ticks: { color: theme === 'dark' ? '#ffffff' : '#111827' } },
      y: { beginAtZero: true, ticks: { color: theme === 'dark' ? '#ffffff' : '#111827' } },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: theme === 'dark' ? '#ffffff' : '#111827' },
      },
    },
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card border border-border shadow-md' : 'bg-white border border-gray-200 shadow-md'}>
        <CardContent className="space-y-8 p-2">
          {loading ? (
            <div className="space-y-8">
              <SkeletonStatsGrid items={5} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonChart className="h-80" />
                <SkeletonChart className="h-80" />
              </div>
              <SkeletonTable rows={5} cols={3} />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <DashboardCard
                  title="Branches"
                  value={totalBranches}
                  description="Active branches"
                  icon={<FaBuilding className={theme === 'dark' ? 'text-indigo-400 text-3xl' : 'text-indigo-500 text-3xl'} />}
                />
                <DashboardCard
                  title="Total Students"
                  value={totalStudents}
                  description="Across branches"
                  icon={<FaUserGraduate className={theme === 'dark' ? 'text-blue-400 text-3xl' : 'text-blue-500 text-3xl'} />}
                />
                <DashboardCard
                  title="Total Faculty"
                  value={totalFaculty}
                  description="Teaching staff"
                  icon={<FaChalkboardTeacher className={theme === 'dark' ? 'text-purple-400 text-3xl' : 'text-purple-500 text-3xl'} />}
                />
                <DashboardCard
                  title="HODs"
                  value={totalHods}
                  description="Dept heads"
                  icon={<FaUserTie className={theme === 'dark' ? 'text-yellow-400 text-3xl' : 'text-yellow-500 text-3xl'} />}
                />
                <DashboardCard
                  title="COE"
                  value={totalCoe}
                  description="Exams controller"
                  icon={<FaUserCheck className={theme === 'dark' ? 'text-green-400 text-3xl' : 'text-green-500 text-3xl'} />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`rounded-xl shadow-sm p-6 border ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch Distribution</h3>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Students and faculty across branches</p>
                  <div className="h-80">
                    <Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} />
                  </div>
                </div>

                <div className={`rounded-xl shadow-sm p-6 border ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Role Distribution</h3>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Current user role composition</p>
                  <div className="h-80">
                    <Pie data={pieData} options={{ ...pieOptions, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm overflow-hidden border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                <div className="px-6 py-4 border-b bg-muted/20">
                  <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
                    <thead className={theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Branch</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Students</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r) => (
                        <tr key={r.branch_id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{r.branch}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{r.total_students}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{r.faculty ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeanStats;
