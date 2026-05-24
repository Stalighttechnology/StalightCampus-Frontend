import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { fetchDriverHistory, fetchTripStudents } from "../../utils/transport_api";
import { Calendar, Bus, Eye, X } from "lucide-react";

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
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';

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
    <div className={`min-h-screen ${bg} p-4 md:p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="text-primary" size={26} /> Trip History</h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Track and view records of your past trips</p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
        <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Calendar size={16} /> Past Trips</h2>
        {history.length === 0 && !loadingHistory ? (
          <div className="py-12 text-center opacity-60 text-sm">No trip history found.</div>
        ) : (
          <div className="space-y-4">
            {history.map(h => (
              <div key={h.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{h.route_details?.route_name}</p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {new Date(h.start_time).toLocaleDateString()} · {h.trip_type === 'morning' ? '🌅 Morning' : '🌇 Evening'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-gray-200 dark:bg-gray-800 rounded-full text-xs font-bold capitalize">{h.status}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-inherit">
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-600 font-semibold">{h.attendance_summary?.picked_up || 0} Picked Up</span>
                    <span className="text-red-500 font-semibold">{h.attendance_summary?.absent || 0} Absent</span>
                    <span className="text-blue-600 font-semibold">{h.attendance_summary?.dropped_off || 0} Dropped Off</span>
                  </div>
                  <button onClick={() => handleViewTrip(h.id)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMoreHistory && (
          <button onClick={() => loadHistory(historyPage + 1)} disabled={loadingHistory} className="mt-4 w-full py-2.5 rounded-lg border border-inherit text-sm font-semibold hover:bg-primary/5 transition-all">
            {loadingHistory ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>

      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] ${card}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between bg-primary/5">
              <h3 className="font-bold text-lg flex items-center gap-2">Student Attendance</h3>
              <button onClick={() => { setSelectedTrip(null); setTripStudents([]); }} className="p-1 rounded-full hover:bg-black/10 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : tripStudents.length === 0 ? (
                <div className="text-center py-10 text-sm opacity-60">No student records found for this trip.</div>
              ) : (
                <div className="space-y-3">
                  {tripStudents.map((s: any) => (
                    <div key={s.id} className={`p-3 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                      <div>
                        <p className="font-bold text-sm">{s.student_details?.name}</p>
                        <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {s.student_details?.usn} · 📍 {s.stop_details?.stop_name}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                        s.status === 'picked_up' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'absent' ? 'bg-red-100 text-red-600' :
                        s.status === 'dropped_off' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>{s.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTripHistory;
