import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { FaUserTie, FaUserCheck, FaUserSlash, FaUserShield } from "react-icons/fa";
import { AlertCircle } from "lucide-react";
import DashboardCard from "../common/DashboardCard";
import { Card, CardContent } from "../ui/card";

const DeanAttendance = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [hodPage, setHodPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchData = async (hp = hodPage, ap = adminPage) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.append('hod_page', String(hp));
      qs.append('admin_page', String(ap));
      qs.append('compact', 'false');
      if (startDate) qs.append('start_date', startDate);
      if (endDate) qs.append('end_date', endDate);

      const resSummary = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/hod-admin-attendance/?${qs.toString()}`);
      const jsonSummary = await resSummary.json();
      if (!jsonSummary.success) {
        setError(jsonSummary.message || 'Failed to load HOD/admin summary');
        return;
      }
      setData(jsonSummary);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(hodPage, adminPage);
  }, [hodPage, adminPage, startDate, endDate]);

  const isMonthly = data?.summary?.period;



  const hodList = data?.summary?.hods || [];
  const totalHods = data?.summary?.total_hods ?? hodList.length;

  let hodPresentCount, hodAbsentCount;
  if (isMonthly) {
    hodPresentCount = data?.summary?.hod_present_total ?? 0;
    hodAbsentCount = data?.summary?.hod_absent_total ?? 0;
  } else {
    hodPresentCount = data?.summary?.hod_present_count ?? hodList.filter((h: any) => h.status === 'present').length;
    hodAbsentCount = totalHods - hodPresentCount;
  }

  const allAdmins = data?.summary?.admins || [];
  const adminPagination = data?.summary?.admin_pagination || { current_page: 1, total_pages: 1 };
  const hodPagination = data?.summary?.hod_pagination || { current_page: 1, total_pages: 1 };
  
  const adminPresentCount = data?.summary?.admin_present_count ?? 0;
  const adminAbsentCount = (data?.summary?.total_admins ?? allAdmins.length) - adminPresentCount;

  const statCardClass = theme === 'dark'
    ? 'rounded-lg border border-border bg-card p-4 shadow'
    : 'rounded-lg border border-gray-200 bg-white p-4 shadow';

  return (
    <div id="dean-attendance-container" className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {loading ? (
        <div className="space-y-6">
          <SkeletonPageHeader />
          <SkeletonStatsGrid items={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonList items={5} />
            <SkeletonList items={5} />
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div id="dean-attendance-stats-grid">
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Today's Attendance</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Real-time presence summary of HODs and Admins</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard
                title={`HODs Present ${isMonthly ? 'Days' : ''}`}
                value={hodPresentCount}
                description={`Total HODs: ${totalHods}`}
                icon={<FaUserTie className={theme === 'dark' ? 'text-green-400 text-3xl' : 'text-green-500 text-3xl'} />}
              />
              <DashboardCard
                title={`HODs Absent ${isMonthly ? 'Days' : ''}`}
                value={hodAbsentCount}
                description={isMonthly ? 'Absent days in period' : 'Absent today'}
                icon={<FaUserSlash className={theme === 'dark' ? 'text-red-400 text-3xl' : 'text-red-500 text-3xl'} />}
              />
              <DashboardCard
                title="Admins Present"
                value={adminPresentCount}
                description={`Admin presence ${isMonthly ? 'in period' : '(today)'}`}
                icon={<FaUserShield className={theme === 'dark' ? 'text-indigo-400 text-3xl' : 'text-indigo-500 text-3xl'} />}
              />
              <DashboardCard
                title="Admins Absent"
                value={isMonthly ? '—' : adminAbsentCount}
                description={isMonthly ? '(not tracked)' : 'Absent today'}
                icon={<FaUserSlash className={theme === 'dark' ? 'text-gray-400 text-3xl' : 'text-gray-500 text-3xl'} />}
              />
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-lg shadow p-6 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="text-lg font-semibold mb-3">HODs — {isMonthly ? 'Monthly Report' : 'Today'}</div>
              <div className="grid grid-cols-1 gap-3">
                {hodList.length > 0 ? hodList.map((h: any) => (
                  <div key={h.id} className={`flex items-center justify-between p-3 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-medium break-words">{h.name}</div>
                      {isMonthly ? (
                        <div className={`text-xs break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Present: {h.present_days} days • Absent: {h.absent_days} days • Branch: {h.branch}
                        </div>
                      ) : (
                        <div className={`text-xs break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {h.status === 'present' ? 'Present' : 'Absent'}{h.marked_at ? ` • ${new Date(h.marked_at).toLocaleTimeString()}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isMonthly ? (
                        <div className="text-xs flex gap-2">
                          <span className={`px-2 py-1 rounded-full font-semibold ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                            P: {h.present_days}
                          </span>
                          <span className={`px-2 py-1 rounded-full font-semibold ${theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'}`}>
                            A: {h.absent_days}
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          h.status === 'present' 
                            ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800') 
                            : (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800')
                        }`}>
                          {h.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      )}
                    </div>
                  </div>
                )) : (
                  <Card className="border-dashed border-2 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className={`p-4 rounded-full bg-primary/10 mb-3`}>
                        <FaUserTie className="w-8 h-8 text-primary/40" />
                      </div>
                      <p className="text-sm text-muted-foreground font-semibold">No HOD records found</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              {hodPagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border text-sm">
                  <button
                    disabled={hodPage === 1 || loading}
                    onClick={() => setHodPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                    Page {hodPage} of {hodPagination.total_pages}
                  </span>
                  <button
                    disabled={hodPage === hodPagination.total_pages || loading}
                    onClick={() => setHodPage(p => p + 1)}
                    className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className={`rounded-lg shadow p-6 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="text-lg font-semibold mb-3">Admins — {isMonthly ? 'In Period' : 'Today'}</div>
              <div className="grid grid-cols-1 gap-3">
                {allAdmins.length > 0 ? allAdmins.map((a: any) => {
                  const isPresent = a.is_present || false;
                  return (
                  <div key={a.id} className={`flex items-center justify-between p-3 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-medium break-words">{a.name}</div>
                      <div className={`text-xs break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{a.email || a.mobile || ''}</div>
                    </div>
                    <div className="flex-shrink-0">
                       <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isPresent 
                          ? (theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-800') 
                          : (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800')
                      }`}>
                        {isPresent ? (isMonthly ? 'Active in Period' : 'Present') : (isMonthly ? 'Inactive' : 'Absent')}
                      </span>
                    </div>
                  </div>
                )}) : (
                  <Card className="border-dashed border-2 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className={`p-4 rounded-full bg-primary/10 mb-3`}>
                        <FaUserShield className="w-8 h-8 text-primary/40" />
                      </div>
                      <p className="text-sm text-muted-foreground font-semibold">No admin records found</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              {adminPagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border text-sm">
                  <button
                    disabled={adminPage === 1 || loading}
                    onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                    Page {adminPage} of {adminPagination.total_pages}
                  </span>
                  <button
                    disabled={adminPage === adminPagination.total_pages || loading}
                    onClick={() => setAdminPage(p => p + 1)}
                    className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeanAttendance;
