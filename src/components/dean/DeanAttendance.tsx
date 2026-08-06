import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { FaUserTie, FaUserCheck, FaUserSlash, FaUserShield } from "react-icons/fa";
import { AlertCircle } from "lucide-react";
import DashboardCard from "../common/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { translateTerminology } from "../../utils/institutionConfig";

const DeanAttendance = ({ isReadOnly = false }: { isReadOnly?: boolean }) => {
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
          <SkeletonStatsGrid items={4} columns={4} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard
                title={translateTerminology(`HODs Present ${isMonthly ? 'Days' : ''}`)}
                value={hodPresentCount}
                description={translateTerminology(`Total HODs: ${totalHods}`)}
                icon={<FaUserTie className={theme === 'dark' ? 'text-green-400 text-3xl' : 'text-green-500 text-3xl'} />}
              />
              <DashboardCard
                title={translateTerminology(`HODs Absent ${isMonthly ? 'Days' : ''}`)}
                value={hodAbsentCount}
                description={isMonthly ? 'Absent days in period' : 'Absent today'}
                icon={<FaUserSlash className={theme === 'dark' ? 'text-red-400 text-3xl' : 'text-red-500 text-3xl'} />}
              />
              <DashboardCard
                title={translateTerminology("Admins Present")}
                value={adminPresentCount}
                description={translateTerminology(`Admin presence ${isMonthly ? 'in period' : '(today)'}`)}
                icon={<FaUserShield className={theme === 'dark' ? 'text-indigo-400 text-3xl' : 'text-indigo-500 text-3xl'} />}
              />
              <DashboardCard
                title={translateTerminology("Admins Absent")}
                value={isMonthly ? '—' : adminAbsentCount}
                description={isMonthly ? '(not tracked)' : 'Absent today'}
                icon={<FaUserSlash className={theme === 'dark' ? 'text-gray-400 text-3xl' : 'text-gray-500 text-3xl'} />}
              />
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className={`flex flex-col shadow ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl sm:text-lg font-semibold">{translateTerminology("HODs")} — {isMonthly ? 'Monthly Report' : 'Today'}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid grid-cols-1 gap-3">
                  {hodList.length > 0 ? hodList.map((h: any) => (
                    <div key={h.id} className={`flex items-center justify-between p-3 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="font-medium break-words">{h.name}</div>
                        {isMonthly ? (
                          <div className={`text-xs break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            Present: {h.present_days} days • Absent: {h.absent_days} days • {translateTerminology("Branch")}: {h.branch}
                          </div>
                        ) : (
                          <div className={`text-xs break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            <div className="mb-1">{h.status === 'present' ? 'Present' : h.status === 'absent' ? 'Absent' : h.status === 'holiday' ? 'Holiday' : 'Not Marked'}</div>
                            {h.check_in_time || h.check_out_time ? (
                              <div className="flex flex-col gap-0.5 mt-1">
                                {h.check_in_time && <div><span className="font-semibold">In:</span> {new Date(h.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                                {h.check_out_time && <div><span className="font-semibold">Out:</span> {new Date(h.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                                {h.total_hours && <div className="text-[10px] mt-0.5 py-0.5 px-1 bg-gray-200/50 rounded-sm inline-block w-fit dark:bg-gray-700/50">Total: {h.total_hours} hrs</div>}
                              </div>
                            ) : h.marked_at ? (
                              `Marked: ${new Date(h.marked_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                            ) : null}
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
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${h.status === 'present'
                              ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800')
                              : h.status === 'absent'
                              ? (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800')
                              : h.status === 'holiday'
                              ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800')
                              : (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                            }`}>
                            {h.status === 'present' ? 'Present' : h.status === 'absent' ? 'Absent' : h.status === 'holiday' ? 'Holiday' : 'Not Marked'}
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
                        <p className="text-sm text-muted-foreground font-semibold">No {translateTerminology("HOD")} records found</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
              {hodPagination.total_pages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto w-full">
                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Showing Page {hodPage} of {hodPagination.total_pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={hodPage === 1 || loading}
                      onClick={() => setHodPage(p => Math.max(1, p - 1))}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {hodPage}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={hodPage === hodPagination.total_pages || loading}
                      onClick={() => setHodPage(p => p + 1)}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            <Card className={`flex flex-col shadow ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl sm:text-lg font-semibold">{translateTerminology("Admins")} — {isMonthly ? 'In Period' : 'Today'}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid grid-cols-1 gap-3">
                  {allAdmins.length > 0 ? allAdmins.map((a: any) => {
                    const isPresent = a.status === 'present' || a.is_present === true;
                    return (
                      <div key={a.id} className={`flex items-center justify-between p-3 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="font-medium break-words">{a.name}</div>
                          <div className={`text-xs break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{a.email || a.mobile || ''}</div>
                          {!isMonthly && (a.check_in_time || a.check_out_time) && (
                            <div className={`text-xs mt-1.5 flex flex-col gap-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              {a.check_in_time && <div><span className="font-semibold">In:</span> {new Date(a.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                              {a.check_out_time && <div><span className="font-semibold">Out:</span> {new Date(a.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                              {a.total_hours && <div className="text-[10px] mt-0.5 py-0.5 px-1 bg-gray-200/50 rounded-sm inline-block w-fit dark:bg-gray-700/50">Total: {a.total_hours} hrs</div>}
                            </div>
                          )}
                          {!isMonthly && !a.check_in_time && !a.check_out_time && a.marked_at && (
                             <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                Marked: {new Date(a.marked_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isPresent
                              ? (theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-800')
                              : a.status === 'absent'
                              ? (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800')
                              : a.status === 'holiday'
                              ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800')
                              : (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                            }`}>
                            {isPresent ? (isMonthly ? 'Active in Period' : 'Present') : (isMonthly ? 'Inactive' : a.status === 'absent' ? 'Absent' : a.status === 'holiday' ? 'Holiday' : 'Not Marked')}
                          </span>
                        </div>
                      </div>
                    )
                  }) : (
                    <Card className="border-dashed border-2 shadow-none bg-transparent">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className={`p-4 rounded-full bg-primary/10 mb-3`}>
                          <FaUserShield className="w-8 h-8 text-primary/40" />
                        </div>
                        <p className="text-sm text-muted-foreground font-semibold">No {translateTerminology("admin")} records found</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
              {adminPagination.total_pages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto w-full">
                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Showing Page {adminPage} of {adminPagination.total_pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={adminPage === 1 || loading}
                      onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {adminPage}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={adminPage === adminPagination.total_pages || loading}
                      onClick={() => setAdminPage(p => p + 1)}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DeanAttendance;
