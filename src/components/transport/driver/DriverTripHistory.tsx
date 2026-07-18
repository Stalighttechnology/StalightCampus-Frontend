import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { fetchDriverHistory, fetchTripStudents } from "../../../utils/transport_api";
import { Calendar, Bus, Eye, X, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";

const DriverTripHistory: React.FC = () => {
  const { theme } = useTheme();
  
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [tripStudents, setTripStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedTripStudentsCount, setSelectedTripStudentsCount] = useState<number>(3);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';

  useEffect(() => {
    loadHistory(1);
  }, []);

  const loadHistory = async (page: number) => {
    setLoadingHistory(true);
    const res = await fetchDriverHistory(page);
    if (res.results) {
      setHistory(res.results);
      setTotalCount(res.count || 0);
      setTotalPages(Math.max(1, Math.ceil((res.count || 0) / 10)));
      setHistoryPage(page);
    }
    setLoadingHistory(false);
  };

  const handleViewTrip = async (trip: any) => {
    setSelectedTrip(trip.id);
    const sum = trip.attendance_summary;
    const count = sum ? (sum.picked_up || 0) + (sum.absent || 0) + (sum.dropped_off || 0) + (sum.pending || 0) : 3;
    setSelectedTripStudentsCount(count);
    setLoadingStudents(true);
    const res = await fetchTripStudents(trip.id);
    if (res.success) setTripStudents(res.students || []);
    setLoadingStudents(false);
  };

  return (
    <div>
      <Card id="driver-trip-history-card" className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <CardHeader id="driver-trip-history-header" className="pb-3 border-b border-inherit">
          <CardTitle className="sm:text-2xl text-xl font-semibold flex items-center gap-2">
             Trip History
          </CardTitle>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Track and view records of your past trips
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {loadingHistory ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`p-4 rounded-xl border animate-pulse ${theme === 'dark' ? 'bg-card border-border' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-2 w-1/3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-inherit">
                    <div className="flex gap-x-4 w-1/2">
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                    <div className="h-8 bg-muted rounded w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <Bus size={32} className="opacity-80" />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Trip History</h3>
              <p className="max-w-md text-xs leading-relaxed opacity-85">
                No past trips recorded on this driver account yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border hover:bg-accent/40 text-foreground' : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50 text-gray-900'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{h.route_details?.route_name}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {new Date(h.start_time).toLocaleDateString()} · {h.trip_type === 'morning' ? 'Morning' : 'Evening'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-accent hover:bg-accent/80 rounded-full text-xs font-semibold capitalize">
                      {h.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-inherit">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="text-red-500 dark:text-red-400 font-semibold">{h.attendance_summary?.absent || 0} Absent</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{h.attendance_summary?.dropped_off || 0} Dropped Off</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleViewTrip(h)} 
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 h-8"
                    >
                      <Eye size={14} /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {!loadingHistory && totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((historyPage - 1) * 10 + 1, totalCount)} to {Math.min(historyPage * 10, totalCount)} of {totalCount} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadHistory(Math.max(1, historyPage - 1))}
                disabled={historyPage === 1 || loadingHistory}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {historyPage}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadHistory(Math.min(totalPages, historyPage + 1))}
                disabled={historyPage === totalPages || loadingHistory}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {selectedTrip && (
        <div 
          onClick={() => { setSelectedTrip(null); setTripStudents([]); }} 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative w-[90%] md:w-full max-w-lg z-50">
            <Card className={`shadow-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[85vh] border ${cardBg}`}>
              <CardHeader className="p-4 border-b border-inherit bg-primary/5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Student Attendance List
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setSelectedTrip(null); setTripStudents([]); }} 
                  className="h-8 w-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </Button>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto flex-1 thin-scrollbar">
                {loadingStudents ? (
                  <div className="space-y-3">
                    {Array.from({ length: selectedTripStudentsCount }).map((_, i) => (
                      <div key={i} className={`p-3 rounded-xl border flex items-center justify-between animate-pulse ${theme === 'dark' ? 'bg-card border-border' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 w-1/2">
                          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="h-6 bg-muted rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : tripStudents.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      <Users size={32} className="opacity-80" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Student Records</h3>
                    <p className="max-w-md text-xs leading-relaxed opacity-85">
                      No student records found for this trip.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tripStudents.map((s: any) => (
                      <div key={s.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-card border-border hover:bg-accent/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'}`}>
                        <div>
                          <p className="font-semibold text-sm">{s.student_details?.name}</p>
                          <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {s.student_details?.usn} · 📍 {s.stop_details?.stop_name}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                          s.status === 'picked_up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          s.status === 'absent' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
                          s.status === 'dropped_off' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>{s.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTripHistory;
