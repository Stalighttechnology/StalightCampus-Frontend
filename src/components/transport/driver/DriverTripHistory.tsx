import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { fetchDriverHistory, fetchTripStudents } from "../../../utils/transport_api";
import { Calendar, Bus, Eye, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";

const DriverTripHistory: React.FC = () => {
  const { theme } = useTheme();
  
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [tripStudents, setTripStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';

  useEffect(() => {
    loadHistory(1);
  }, []);

  const loadHistory = async (page: number) => {
    setLoadingHistory(true);
    const res = await fetchDriverHistory(page);
    if (res.results) {
      setHistory(prev => page === 1 ? res.results : [...prev, ...res.results]);
      setHasMoreHistory(!!res.next);
      setHistoryPage(page);
    }
    setLoadingHistory(false);
  };

  const handleViewTrip = async (tripId: number) => {
    setSelectedTrip(tripId);
    setLoadingStudents(true);
    const res = await fetchTripStudents(tripId);
    if (res.success) setTripStudents(res.students || []);
    setLoadingStudents(false);
  };

  return (
    <div>
      <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <CardHeader className="pb-3 border-b border-inherit">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bus className="text-primary" size={22} /> Trip History
          </CardTitle>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Track and view records of your past trips
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {history.length === 0 && !loadingHistory ? (
            <div className="py-12 text-center opacity-60 text-sm">
              No trip history found.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border hover:bg-accent/40 text-foreground' : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50 text-gray-900'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm">{h.route_details?.route_name}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {new Date(h.start_time).toLocaleDateString()} · {h.trip_type === 'morning' ? 'Morning' : 'Evening'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-accent hover:bg-accent/80 rounded-full text-xs font-bold capitalize">
                      {h.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-inherit">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{h.attendance_summary?.picked_up || 0} Boarded</span>
                      <span className="text-red-500 dark:text-red-400 font-semibold">{h.attendance_summary?.absent || 0} Absent</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{h.attendance_summary?.dropped_off || 0} Dropped Off</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleViewTrip(h.id)} 
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 h-8"
                    >
                      <Eye size={14} /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {hasMoreHistory && (
          <CardFooter className="flex justify-center border-t border-border p-4 bg-muted/20">
            <Button 
              onClick={() => loadHistory(historyPage + 1)} 
              disabled={loadingHistory} 
              className="bg-primary hover:bg-primary/95 text-white w-full sm:w-auto h-9 px-6 transition-all"
            >
              {loadingHistory ? 'Loading...' : 'Load More'}
            </Button>
          </CardFooter>
        )}
      </Card>

      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg z-50">
            <Card className={`shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border ${cardBg}`}>
              <CardHeader className="p-4 border-b border-inherit bg-primary/5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-bold flex items-center gap-2">
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
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : tripStudents.length === 0 ? (
                  <div className="text-center py-10 text-sm opacity-60">
                    No student records found for this trip.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tripStudents.map((s: any) => (
                      <div key={s.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${theme === 'dark' ? 'bg-card border-border hover:bg-accent/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'}`}>
                        <div>
                          <p className="font-bold text-sm">{s.student_details?.name}</p>
                          <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {s.student_details?.usn} · 📍 {s.stop_details?.stop_name}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap ${
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
