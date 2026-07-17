import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { useToast } from "../../../hooks/use-toast";
import {
  fetchDriverAssignment, startTrip, endTrip, cancelTrip, updateLocation,
  fetchTripStudents, markStudentAttendance, triggerEmergency
} from "../../../utils/transport_api";
import {
  Bus, Users, CheckCircle, XCircle, AlertTriangle, Play, Square, Radio, LogOut, X, MapPin, Navigation, Clock, Sunrise, Sunset, Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import DashboardCard from "../../common/DashboardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";

interface Student { id: number; student_name: string; student_usn: string; stop_name: string; status: string; student_details?: any; stop_details?: any; }
interface Trip { id: number; trip_type: string; status: string; start_time: string; route_details: any; bus_details: any; }

const DriverDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [gpsActive, setGpsActive] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyDesc, setEmergencyDesc] = useState('');
  const gpsRef = useRef<number | null>(null);

  const [isStartingTrip, setIsStartingTrip] = useState<"morning" | "evening" | null>(null);
  const [isEndingTrip, setIsEndingTrip] = useState(false);

  const PAGE_SIZE = 10;
  const totalCount = students.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const displayedStudents = students.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

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
        if (st.success) {
          setStudents(st.students || []);
          setCurrentPage(1);
        }
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

    const currentHour = new Date().getHours();
    
    // Morning trips must be started before 1:00 PM (13:00)
    if (type === 'morning' && currentHour >= 13) {
      err("Morning trips can only be started before 1:00 PM.");
      return;
    }
    
    // Evening trips must be started after 12:00 PM (Noon)
    if (type === 'evening' && currentHour < 12) {
      err("Evening trips can only be started after 12:00 PM.");
      return;
    }
    
    setIsStartingTrip(type);
    
    // Test GPS permission before starting
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const res = await startTrip(type);
          if (res.success) { 
            setActiveTrip(res.trip);
            startGps(res.trip.id); 
            const s = await fetchTripStudents(res.trip.id);
            if (s.success) {
              setStudents(s.students);
              setCurrentPage(1);
            }
          }
          else err(res.message || 'Failed to start trip');
        } catch (e) {
          err("An unexpected error occurred while starting the trip.");
        } finally {
          setIsStartingTrip(null);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          err("Trip blocked. GPS Permission Denied. Please enable location services in your browser.");
        } else {
          err("Failed to acquire GPS location. Trip cannot start.");
        }
        setIsStartingTrip(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;

    const unmarkedStudents = students.filter(s => s.status === 'pending');
    const boardedStudents = students.filter(s => s.status === 'picked_up');

    if (unmarkedStudents.length > 0 || boardedStudents.length > 0) {
      let warningText = "";
      if (unmarkedStudents.length > 0 && boardedStudents.length > 0) {
        warningText = `There are ${unmarkedStudents.length} unmarked student(s) and ${boardedStudents.length} student(s) boarded but not dropped off.`;
      } else if (unmarkedStudents.length > 0) {
        warningText = `There are ${unmarkedStudents.length} unmarked student(s).`;
      } else {
        warningText = `There are ${boardedStudents.length} student(s) boarded but not dropped off.`;
      }

      Swal.fire({
        title: "Cannot End Trip",
        text: `${warningText} All students must be marked as either Absent or Dropped Off before ending the trip.`,
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK"
      });
      return;
    }

    setIsEndingTrip(true);
    try {
      const res = await endTrip(activeTrip.id);
      if (res.success) { 
        toast({ title: 'Success', description: 'Trip ended.' });
        stopGps(); 
        setActiveTrip(null); 
        setStudents([]); 
        setCurrentPage(1);
      }
      else err(res.message || 'Failed');
    } catch (e) {
      err("An unexpected error occurred while ending the trip.");
    } finally {
      setIsEndingTrip(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "Are you sure you want to cancel this trip? It will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3b82f6",
      confirmButtonText: "Yes, cancel trip",
      cancelButtonText: "No, keep it"
    });

    if (!confirmResult.isConfirmed) return;
    
    const res = await cancelTrip(activeTrip.id);
    if (res.success) { 
      toast({ title: 'Success', description: 'Trip cancelled and removed.' });
      stopGps(); 
      setActiveTrip(null); 
      setStudents([]); 
      setCurrentPage(1);
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
    } else err(res.message || 'Failed');
  };

  const handleEmergency = async () => {
    if (!activeTrip) return;
    const res = await triggerEmergency(activeTrip.id, emergencyDesc);
    if (res.success) { ok('Emergency alert sent!'); setShowEmergency(false); setEmergencyDesc(''); }
    else err(res.message || 'Failed');
  };

  return (
    <div >
      {loading ? (
        <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm animate-pulse ${cardBg}`}>
          <CardHeader className="pb-3 border-b border-inherit">
            <div className="h-5 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-inherit">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`p-4 rounded-xl border flex items-center gap-3 ${theme === 'dark' ? 'bg-[#1c1c1e] border-border' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pb-6 border-b border-inherit space-y-3">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="flex gap-3">
                <div className="h-12 bg-muted rounded-xl w-40"></div>
                <div className="h-12 bg-muted rounded-xl w-40"></div>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-3 border-b border-inherit">
                <div className="h-5 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
              <div className="divide-y divide-inherit border rounded-xl overflow-hidden">
                {Array.from({ length: students.length > 0 ? students.length : 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3 w-full sm:w-1/2">
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-muted rounded w-full sm:w-24"></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !assignment ? (
        <Card className={`border overflow-hidden shadow-sm p-12 text-center backdrop-blur-sm ${cardBg}`}>
          <Bus size={48} className="mx-auto mb-4 opacity-30 text-primary animate-bounce" />
          <p className="text-lg font-semibold mb-2">No Route Assigned</p>
          <p className={`text-sm max-w-sm mx-auto ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Your transport admin has not configured a route assignment for you yet. Contact support for assistance.
          </p>
        </Card>
      ) : (
        <Card id="driver-dashboard-card" className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
          <CardHeader className="pb-3 border-b border-inherit">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Driver Dashboard Control Center</span>
              {gpsActive && (
                <span className="flex items-center gap-1 self-start sm:self-auto px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 rounded-full text-[10px] font-bold whitespace-nowrap">
                  <Radio size={10} className="animate-pulse flex-shrink-0" /> Live Tracking Active
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Dashboard Metrics Grid */}
            <div id="driver-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-inherit">
              <DashboardCard icon={<Navigation size={20} />} title="Assigned Route" value={assignment.route_details?.route_name} description={`${assignment.route_details?.start_location} → ${assignment.route_details?.end_location}`} />
              <DashboardCard icon={<Bus size={20} />} title="Assigned Bus" value={assignment.bus_details?.bus_number} description={assignment.bus_details?.registration_number} />
              <DashboardCard icon={<Clock size={20} />} title="Morning Start" value={assignment.route_details?.morning_start_time || 'N/A'} description={`Evening: ${assignment.route_details?.evening_start_time || 'N/A'}`} />
              <DashboardCard icon={<Users size={20} />} title="Bus Capacity" value={`${assignment.bus_details?.capacity} Seats`} description="Maximum passenger count" />
            </div>

            {/* Trip Controls */}
            <div id="driver-trip-controls" className="pb-6 border-b border-inherit">
              {!activeTrip ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Start Today's Trip</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => handleStartTrip('morning')} 
                      disabled={isStartingTrip !== null}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl px-5 h-12 shadow-sm transition-all disabled:opacity-50"
                    >
                      {isStartingTrip === 'morning' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Initializing Morning Trip...
                        </>
                      ) : (
                        <>
                          <Sunrise size={18} /> Start Morning Trip 
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleStartTrip('evening')} 
                      disabled={isStartingTrip !== null}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 h-12 shadow-sm transition-all disabled:opacity-50"
                    >
                      {isStartingTrip === 'evening' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Initializing Evening Trip...
                        </>
                      ) : (
                        <>
                          <Sunset size={18} /> Start Evening Trip 
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-xl border-2 border-emerald-500 ${theme === 'dark' ? 'bg-emerald-950/20 text-white' : 'bg-emerald-50 text-gray-900'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Radio size={18} className="text-emerald-500 animate-pulse" />
                      <h3 className="font-bold text-base text-emerald-800 dark:text-emerald-400">
                        {activeTrip.trip_type === 'morning' ? 'Morning' : 'Evening'} Trip In Progress
                      </h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelTrip} 
                        className="border-gray-300 dark:border-border hover:bg-gray-100 dark:hover:bg-accent/40 text-xs font-semibold h-9 w-full sm:w-auto flex justify-center items-center gap-1.5"
                      >
                        <X size={13} /> Cancel
                      </Button>
                      <Button 
                        onClick={() => setShowEmergency(true)} 
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold h-9 animate-pulse w-full sm:w-auto flex justify-center items-center gap-1.5"
                      >
                        <AlertTriangle size={13} /> EMERGENCY
                      </Button>
                      <Button 
                        onClick={handleEndTrip} 
                        disabled={isEndingTrip}
                        className="bg-gray-800 hover:bg-gray-900 dark:bg-accent dark:hover:bg-accent/80 text-white text-xs font-semibold h-9 w-full sm:w-auto flex justify-center items-center gap-1.5 disabled:opacity-50"
                      >
                        {isEndingTrip ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Ending Trip...
                          </>
                        ) : (
                          <>
                            <Square size={13} /> End Trip
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 opacity-85 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Started: {new Date(activeTrip.start_time).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>



            {/* Student Boarding List */}
            {activeTrip && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-2 pb-3 border-b border-inherit">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users size={16} className="text-primary " /> Student Boarding List ({students.length})
                  </h3>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {students.filter(s => s.status === 'picked_up').length} Boarded
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {students.filter(s => s.status === 'absent').length} Absent
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-inherit border rounded-xl overflow-hidden">
                  {students.length === 0 ? (
                    <div className="p-4">
                      <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                        <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                          <Users size={32} className="opacity-80" />
                        </div>
                        <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Assigned Students</h3>
                        <p className="max-w-md text-xs leading-relaxed opacity-85">
                          No students are currently assigned to this route.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {displayedStudents.map((s: any) => (
                        <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-primary/5 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs flex-shrink-0">
                              {s.student_details?.name?.[0] || 'S'}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{s.student_details?.name}</p>
                              <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                {s.student_details?.usn} · 📍 {s.stop_details?.stop_name} 
                                {s.student_details?.phone && (
                                  <span className="block sm:inline"> · 📞 <a href={`tel:${s.student_details?.phone}`} className="hover:text-primary transition-colors">{s.student_details?.phone}</a></span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center sm:justify-end gap-2 w-full sm:w-auto">
                            {s.status === 'pending' ? (
                              <>
                                <Button 
                                  onClick={() => handleMark(s.id, 'picked_up')} 
                                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 h-8 px-3 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1"
                                  title="Mark Picked Up"
                                >
                                  <CheckCircle size={14} /> Board
                                </Button>
                                <Button 
                                  onClick={() => handleMark(s.id, 'absent')} 
                                  className="bg-red-100 hover:bg-red-200 text-red-700 h-8 px-3 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1"
                                  title="Mark Absent"
                                >
                                  <XCircle size={14} /> Absent
                                </Button>
                              </>
                            ) : s.status === 'picked_up' ? (
                              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  Boarded
                                </span>
                                <Button 
                                  onClick={() => handleMark(s.id, 'dropped_off')} 
                                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-bold h-8"
                                >
                                  <LogOut size={14} /> Drop Off
                                </Button>
                              </div>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                s.status === 'dropped_off' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                              }`}>{s.status.replace('_', ' ')}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                          <div>
                            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} students
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                            >
                              Previous
                            </Button>
                            <div className="flex items-center justify-center min-w-[2rem]">
                              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {currentPage}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Emergency Reporting Dialog */}
      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6'}>
          <DialogHeader>
            <DialogTitle className={`font-bold text-red-600 flex items-center gap-2 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`}>
              <AlertTriangle size={18} className="flex-shrink-0" /> Report Emergency Situation
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <textarea 
              placeholder="Describe the emergency situation (accident, vehicle breakdown, traffic jam, etc.)..." 
              className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-1 focus:outline-none ${input}`} 
              rows={4} 
              value={emergencyDesc} 
              onChange={e => setEmergencyDesc(e.target.value)} 
            />
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleEmergency} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 w-full sm:w-auto flex justify-center items-center flex-1"
              >
                Send Emergency Alert
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEmergency(false)} 
                className="border-gray-300 dark:border-border h-10 w-full sm:w-auto flex justify-center items-center flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
