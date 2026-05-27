import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useToast } from "../../../hooks/use-toast";
import {
  fetchDriverAssignment, startTrip, endTrip, cancelTrip, updateLocation,
  fetchTripStudents, markStudentAttendance, triggerEmergency
} from "../../../utils/transport_api";
import {
  Bus, Users, CheckCircle, XCircle, AlertTriangle, Play, Square, Radio, LogOut, X
} from "lucide-react";

interface Student { id: number; student_name: string; student_usn: string; stop_name: string; status: string; student_details?: any; stop_details?: any; }
interface Trip { id: number; trip_type: string; status: string; start_time: string; route_details: any; bus_details: any; }

const DriverDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [gpsActive, setGpsActive] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyDesc, setEmergencyDesc] = useState('');
  const gpsRef = useRef<number | null>(null);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';
  const input = theme === 'dark' ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400';

  const ok = (msg: string) => toast({ title: 'Success', description: msg });
  const err = (msg: string) => toast({ variant: 'destructive', title: 'Error', description: msg });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchDriverAssignment();
    if (res.success) {
      setAssignment(res.assignment);
      setActiveTrip(res.active_trip || null);
      if (res.active_trip) {
        const st = await fetchTripStudents(res.active_trip.id);
        if (st.success) setStudents(st.students || []);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); return () => { if (gpsRef.current) navigator.geolocation.clearWatch(gpsRef.current); }; }, [load]);

  useEffect(() => {
    if (activeTrip && !gpsActive) {
      startGps(activeTrip.id);
    }
  }, [activeTrip, gpsActive]);

  const handleStartTrip = async (type: 'morning' | 'evening') => {
    if (!navigator.geolocation) {
      err("Geolocation is not supported by your browser.");
      return;
    }
    
    // Test GPS permission before starting
    navigator.geolocation.getCurrentPosition(
      async () => {
        const res = await startTrip(type);
        if (res.success) { 
          ok('Trip started!'); 
          setActiveTrip(res.trip);
          startGps(res.trip.id); 
          const s = await fetchTripStudents(res.trip.id);
          if (s.success) setStudents(s.students);
        }
        else err(res.message || 'Failed to start trip');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          err("Trip blocked. GPS Permission Denied. Please enable location services in your browser.");
        } else {
          err("Failed to acquire GPS location. Trip cannot start.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    const res = await endTrip(activeTrip.id);
    if (res.success) { 
      ok('Trip ended.'); 
      stopGps(); 
      setActiveTrip(null); 
      setStudents([]); 
    }
    else err(res.message || 'Failed');
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    if (!window.confirm("Are you sure you want to cancel this trip? It will be permanently removed.")) return;
    
    const res = await cancelTrip(activeTrip.id);
    if (res.success) { 
      ok('Trip cancelled and removed.'); 
      stopGps(); 
      setActiveTrip(null); 
      setStudents([]); 
    }
    else err(res.message || 'Failed to cancel trip');
  };

  const startGps = (tripId: number) => {
    if (navigator.geolocation) {
      if (gpsRef.current) navigator.geolocation.clearWatch(gpsRef.current);
      setGpsActive(true);
      gpsRef.current = navigator.geolocation.watchPosition(
        pos => updateLocation(tripId, pos.coords.latitude, pos.coords.longitude),
        (error) => {
          console.error("GPS Error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            err("GPS Permission Denied. Please enable location services in your browser to track live location.");
          } else {
            err("Failed to get live location. Retrying...");
          }
          setGpsActive(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } else {
      err("Geolocation is not supported by your browser.");
    }
  };
  const stopGps = () => { setGpsActive(false); if (gpsRef.current) navigator.geolocation.clearWatch(gpsRef.current); };

  const handleMark = async (id: number, status: string) => {
    const res = await markStudentAttendance(id, status);
    if (res.success) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      ok(`Marked ${status}`);
    } else err(res.message || 'Failed');
  };

  const handleEmergency = async () => {
    if (!activeTrip) return;
    const res = await triggerEmergency(activeTrip.id, emergencyDesc);
    if (res.success) { ok('Emergency alert sent!'); setShowEmergency(false); setEmergencyDesc(''); }
    else err(res.message || 'Failed');
  };

  return (
    <div className={`min-h-screen ${bg} p-4 md:p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="text-primary" size={26} /> Driver Dashboard</h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage your daily trips and student pickups</p>
        </div>
        {gpsActive && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            <Radio size={12} className="animate-pulse" /> GPS Live
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !assignment ? (
        <div className={`rounded-2xl border shadow-sm p-12 text-center ${card}`}>
          <Bus size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold mb-2">No Route Assigned</p>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Your transport admin hasn't assigned you a route yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Your Assignment</p>
                <h2 className="text-lg font-bold">{assignment.route_details?.route_name}</h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {assignment.route_details?.start_location} → {assignment.route_details?.end_location}
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>🚌 Bus: <strong>{assignment.bus_details?.bus_number}</strong></span>
                  <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>💺 Cap: <strong>{assignment.bus_details?.capacity}</strong></span>
                  <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>🌅 <strong>{assignment.route_details?.morning_start_time || 'N/A'}</strong></span>
                  <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>🌇 <strong>{assignment.route_details?.evening_start_time || 'N/A'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {!activeTrip ? (
            <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
              <h3 className="font-semibold text-sm mb-4">Start Today's Trip</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleStartTrip('morning')} className="flex items-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-sm">
                  <Play size={16} /> Start Morning Trip 🌅
                </button>
                <button onClick={() => handleStartTrip('evening')} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                  <Play size={16} /> Start Evening Trip 🌇
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border-2 border-emerald-400 shadow-md p-5 ${theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
                    {activeTrip.trip_type === 'morning' ? '🌅 Morning' : '🌇 Evening'} Trip In Progress
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCancelTrip} className="flex items-center gap-1.5 bg-gray-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-600 transition-all">
                    <X size={13} /> Cancel
                  </button>
                  <button onClick={() => setShowEmergency(true)} className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-600 transition-all animate-pulse">
                    <AlertTriangle size={13} /> EMERGENCY
                  </button>
                  <button onClick={handleEndTrip} className="flex items-center gap-1.5 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-900 transition-all">
                    <Square size={13} /> End Trip
                  </button>
                </div>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Started: {new Date(activeTrip.start_time).toLocaleTimeString()}</p>
            </div>
          )}

          {showEmergency && (
            <div className={`rounded-2xl border-2 border-red-400 p-5 ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <h3 className="font-bold text-red-600 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Report Emergency</h3>
              <textarea placeholder="Describe the emergency situation..." className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} rows={3} value={emergencyDesc} onChange={e => setEmergencyDesc(e.target.value)} />
              <div className="flex gap-2 mt-3">
                <button onClick={handleEmergency} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">Send Emergency Alert</button>
                <button onClick={() => setShowEmergency(false)} className={`px-4 py-2 rounded-lg text-sm border ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-300 text-gray-600'}`}>Cancel</button>
              </div>
            </div>
          )}

          {activeTrip && (
            <div className={`rounded-2xl border shadow-sm ${card}`}>
              <div className="p-5 border-b border-inherit flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2"><Users size={15} /> Student Pickup List ({students.length})</h3>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600 font-semibold">{students.filter(s => s.status === 'picked_up').length} Boarded</span>
                  <span className="text-amber-600 font-semibold">{students.filter(s => s.status === 'absent').length} Absent</span>
                </div>
              </div>
              <div className="divide-y divide-inherit">
                {students.length === 0 ? (
                  <p className="p-5 text-sm text-center opacity-60">No students assigned to this route.</p>
                ) : students.map((s: any) => (
                  <div key={s.id} className={`flex items-center justify-between px-5 py-3 hover:bg-primary/5 transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{s.student_details?.name?.[0] || 'S'}</div>
                      <div>
                        <p className="font-semibold text-sm">{s.student_details?.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {s.student_details?.usn} · 📍 {s.stop_details?.stop_name} 
                          {s.student_details?.phone && <span> · 📞 <a href={`tel:${s.student_details?.phone}`} className="hover:text-primary transition-colors">{s.student_details?.phone}</a></span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === 'pending' ? (
                        <>
                          <button onClick={() => handleMark(s.id, 'picked_up')} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all" title="Mark Picked Up"><CheckCircle size={16} /></button>
                          <button onClick={() => handleMark(s.id, 'absent')} className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-all" title="Mark Absent"><XCircle size={16} /></button>
                        </>
                      ) : s.status === 'picked_up' ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-emerald-100 text-emerald-700`}>Boarded</span>
                          <button onClick={() => handleMark(s.id, 'dropped_off')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all text-xs font-bold"><LogOut size={14} /> Drop Off</button>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${s.status === 'dropped_off' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>{s.status.replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
