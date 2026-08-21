import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { FaUserTie, FaUserSlash, FaUserShield } from "react-icons/fa";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import DashboardCard from "../common/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { translateTerminology } from "../../utils/institutionConfig";

const formatTotalHours = (decimalHours: number): string => {
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
};

const DeanAttendance = ({ isReadOnly = false }: { isReadOnly?: boolean }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [hodPage, setHodPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

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
                title={translateTerminology("Principals Present")}
                value={adminPresentCount}
                description={translateTerminology(`Principal presence ${isMonthly ? 'in period' : '(today)'}`)}
                icon={<FaUserShield className={theme === 'dark' ? 'text-indigo-400 text-3xl' : 'text-indigo-500 text-3xl'} />}
              />
              <DashboardCard
                title={translateTerminology("Principals Absent")}
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
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!isMonthly && h.status === 'present' && (
                          <button
                            onClick={() => setSelectedRecord(h)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
                          >
                            View
                          </button>
                        )}
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
                <CardTitle className="text-xl sm:text-lg font-semibold">{translateTerminology("Principals")} — {isMonthly ? 'In Period' : 'Today'}</CardTitle>
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
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {!isMonthly && (a.status === 'present' || a.is_present) && (
                            <button
                              onClick={() => setSelectedRecord(a)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
                            >
                              View
                            </button>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(a.status === 'present' || a.is_present)
                              ? (theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-800')
                              : a.status === 'absent'
                              ? (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800')
                              : a.status === 'holiday'
                              ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800')
                              : (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                            }`}>
                            {(a.status === 'present' || a.is_present) ? (isMonthly ? 'Active in Period' : 'Present') : (isMonthly ? 'Inactive' : a.status === 'absent' ? 'Absent' : a.status === 'holiday' ? 'Holiday' : 'Not Marked')}
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

      {/* Attendance Details Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={(open) => { if (!open) setSelectedRecord(null); }}>
          <DialogContent className={`w-[90%] max-w-[360px] p-0 border-0 rounded-2xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
            <div className={`p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-primary/5'} border-b ${theme === 'dark' ? 'border-white/10' : 'border-primary/10'}`}>
              <DialogTitle className="text-lg font-bold">{selectedRecord.name}</DialogTitle>
              <p className={`text-sm mt-1 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Today's Attendance Details</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-green-500 bg-green-500/10 p-3 rounded-xl font-bold flex items-center gap-2 text-base">
                <CheckCircle className="w-5 h-5" /> Present
              </div>

              {selectedRecord.checkin_timestamps && selectedRecord.checkin_timestamps.length > 0 ? (
                <div className={`space-y-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  {selectedRecord.checkin_timestamps.map((ts: any, idx: number) => (
                    <div key={idx} className={`flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                      <span className="font-semibold text-gray-500">
                        {selectedRecord.checkin_timestamps.length === 4
                          ? (idx === 0 ? '1st Half In' : idx === 1 ? '1st Half Out' : idx === 2 ? '2nd Half In' : '2nd Half Out')
                          : (idx === 0 ? 'Check In' : 'Check Out')}
                      </span>
                      <div className="flex items-center gap-2">
                        {ts === 'Missed' ? (
                          <span className="text-red-500 font-bold">Missed</span>
                        ) : ts ? (
                          <>
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                            {selectedRecord.delays && selectedRecord.delays[idx] > 0 && (
                              <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded">+{selectedRecord.delays[idx]}m</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedRecord.check_out_time && (
                    <div className={`flex items-center justify-between font-bold pt-2 border-t mt-2 ${theme === 'dark' ? 'border-white/10' : 'border-gray-300'}`}>
                      <span className="text-gray-500">Check Out</span>
                      <span>{new Date(selectedRecord.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                  )}
                </div>
              ) : (selectedRecord.first_check_in || selectedRecord.check_in_time || selectedRecord.second_check_out || selectedRecord.check_out_time) && (
                <div className={`space-y-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  {(selectedRecord.first_check_in || selectedRecord.check_in_time) && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-500">{selectedRecord.first_check_in ? '1st Half In' : 'Check In'}</span>
                      <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(selectedRecord.first_check_in || selectedRecord.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {selectedRecord.delays?.[0] > 0 && (
                          <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                            +{selectedRecord.delays[0]}m
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {selectedRecord.first_check_out && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-500">1st Half Out</span>
                      <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(selectedRecord.first_check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  )}
                  {selectedRecord.second_check_in && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-500">2nd Half In</span>
                      <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(selectedRecord.second_check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {selectedRecord.delays?.[2] > 0 && (
                          <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                            +{selectedRecord.delays[2]}m
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {(selectedRecord.second_check_out || selectedRecord.check_out_time) && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-500">{selectedRecord.second_check_out ? '2nd Half Out' : 'Check Out'}</span>
                      <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(selectedRecord.second_check_out || selectedRecord.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedRecord.total_hours && (
                <div className="flex items-center justify-between font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20">
                  <span>Total Worked</span>
                  <span>{formatTotalHours(Number(selectedRecord.total_hours))}</span>
                </div>
              )}
            </div>
            <div className={`p-4 border-t ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
              <Button variant="outline" className="w-full" onClick={() => setSelectedRecord(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DeanAttendance;
