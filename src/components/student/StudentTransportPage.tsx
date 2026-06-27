import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { SkeletonList } from "../ui/skeleton";
import {
  fetchMyBusDetails, fetchMyTripHistory, submitStudentComplaint
} from "../../utils/transport_api";
import {
  Bus, MapPin, Clock, Calendar, CheckCircle, XCircle,
  AlertTriangle, Navigation, Send, ChevronRight, ChevronLeft, Activity, Radio, Sunrise, Sunset, PenTool, X
} from "lucide-react";

const formatTimeTo12Hour = (timeStr: string) => {
  if (!timeStr || timeStr === 'N/A' || timeStr === '—') return timeStr;
  try {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours.toString().padStart(2, '0')}:${formattedMinutes} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

const StudentTransportPage: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [busData, setBusData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'history' | 'complaint'>('info');

  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View resolution modal state
  const [viewComplaint, setViewComplaint] = useState<any>(null);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';
  const input = theme === 'dark' ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400';

  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const bd = await fetchMyBusDetails();
      setBusData(bd);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (tab === 'history' && history.length === 0) {
      (async () => {
        setHistoryLoading(true);
        const hist = await fetchMyTripHistory();
        if (hist.success) setHistory(hist.history || []);
        setHistoryLoading(false);
      })();
    }
    setCurrentPage(1);
  }, [tab]);

  const handleComplaint = async () => {
    if (!complaintTitle.trim() || !complaintDesc.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in both fields.' });
      return;
    }
    setSubmitting(true);
    const res = await submitStudentComplaint(complaintTitle, complaintDesc);
    setSubmitting(false);
    if (res.success) {
      toast({ title: 'Submitted', description: 'Your complaint has been filed.' });
      setComplaintTitle('');
      setComplaintDesc('');
      if (res.complaint) {
        setBusData((prev: any) => ({
          ...prev,
          recent_complaints: [res.complaint, ...(prev?.recent_complaints || [])].slice(0, 5)
        }));
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.message || 'Submission failed.' });
    }
  };

  const statusIcon = (s: string) => 
    s === 'boarded' || s === 'picked_up' || s === 'dropped_off' 
      ? <CheckCircle size={14} className="text-emerald-500" /> 
      : s === 'absent' 
        ? <XCircle size={14} className="text-red-500" /> 
        : <Clock size={14} className="text-amber-500" />;

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginatedHistory = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card id="transport-card" className={`${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-gray-200 shadow-sm'}`}>
        <CardHeader id="transport-header" className="p-3 sm:p-4 lg:p-6 border-b">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>My Transport</CardTitle>
              <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                Bus details, trip history, and support
              </CardDescription>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex gap-2 p-2 rounded-2xl mt-6 border ${theme === 'dark' ? 'bg-background border-border' : 'bg-gray-50 border-gray-100'} shadow-sm`}>
            {[{ id: 'info', label: 'Bus Info' }, { id: 'history', label: 'Trip History' }, { id: 'complaint', label: 'Complaint' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-primary text-white shadow-md' : theme === 'dark' ? 'text-muted-foreground hover:bg-accent' : 'text-gray-600 hover:bg-gray-100'}`}>{t.label}</button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">

      {loading ? (
        <div className="p-4">
          <SkeletonList items={3} />
        </div>
      ) : tab === 'info' ? (
        <div className="space-y-4">
          {!busData?.has_bus ? (
            <div className={`rounded-2xl border shadow-sm p-12 text-center ${card}`}>
              <Bus size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-2">No Bus Assigned</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{busData?.message || 'Contact your transport admin to get a bus assigned.'}</p>
            </div>
          ) : (
            <>
              {/* Emergency Banner */}
              {busData.active_emergency && (
                <div className={`rounded-2xl border-2 border-red-500 p-4 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'} shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse mb-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={18} className="text-red-600" />
                    <p className="font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">{busData.active_emergency.title}</p>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300 font-medium">
                    The driver has reported an emergency. Administration has been notified.
                  </p>
                </div>
              )}

              {/* Active Trip Banner */}
              {busData.active_trip && (
                <div className={`rounded-2xl border-2 border-emerald-400 overflow-hidden ${theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                  <div className="p-4 border-b border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <Radio size={16} className="text-emerald-500 animate-pulse" />
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">Your bus is currently running!</p>
                    </div>
                    <p className={`text-xs mt-1 flex items-center gap-1.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      {busData.active_trip.trip_type === 'morning' ? (
                        <><Sunrise size={12} className="text-amber-500" /> Morning</>
                      ) : (
                        <><Sunset size={12} className="text-amber-500" /> Evening</>
                      )} trip started at {new Date(busData.active_trip.start_time).toLocaleTimeString()}
                    </p>
                  </div>
                  {busData.active_trip.current_latitude && (
                    <iframe
                      title="Live Bus Location"
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${busData.active_trip.current_latitude},${busData.active_trip.current_longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    ></iframe>
                  )}
                </div>
              )}

              {/* Route Card */}
              <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Navigation size={22} className="text-primary" /></div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-base">{busData.allocation?.route_details?.route_name}</h2>
                    <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {busData.allocation?.route_details?.start_location} → {busData.allocation?.route_details?.end_location}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                        <p className={`text-xs mb-1 flex items-center gap-1.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          <Sunrise size={12} className="text-amber-500" /> Morning
                        </p>
                        <p className="font-semibold text-sm">{formatTimeTo12Hour(busData.allocation?.route_details?.morning_start_time) || 'N/A'}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                        <p className={`text-xs mb-1 flex items-center gap-1.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          <Sunset size={12} className="text-amber-500" /> Evening
                        </p>
                        <p className="font-semibold text-sm">{formatTimeTo12Hour(busData.allocation?.route_details?.evening_start_time) || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Stop Card */}
              <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><MapPin size={18} className="text-amber-600" /></div>
                  <div>
                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Your Boarding Stop</p>
                    <p className="font-semibold text-base">{busData.allocation?.stop_details?.stop_name}</p>
                    <p className={`text-xs flex items-center gap-3 mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
                      <span className="flex items-center gap-1"><Sunrise size={12} className="text-amber-500" /> {formatTimeTo12Hour(busData.allocation?.stop_details?.arrival_time_morning) || 'N/A'}</span>
                      <span className="opacity-40">·</span>
                      <span className="flex items-center gap-1"><Sunset size={12} className="text-amber-500" /> {formatTimeTo12Hour(busData.allocation?.stop_details?.arrival_time_evening) || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bus & Driver Card */}
              {busData.bus_assignment && (
                <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
                  <h3 className="font-semibold text-sm mb-3">Bus & Driver Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                      <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Bus Number</p>
                      <p className="font-semibold text-sm">{busData.bus_assignment?.bus_details?.bus_number}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
                        {busData.bus_assignment?.bus_details?.model_name}
                        {busData.bus_assignment?.bus_details?.registration_number && ` (${busData.bus_assignment.bus_details.registration_number})`}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                      <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Driver</p>
                      <p className="font-semibold text-sm">{busData.bus_assignment?.driver_details?.first_name} {busData.bus_assignment?.driver_details?.last_name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>{busData.bus_assignment?.driver_details?.mobile_number}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stop Timeline */}
              {busData.allocation?.route_details?.stops?.length > 0 && (
                <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><MapPin size={14} className="text-primary" /> Route Stop Timeline</h3>
                  <div className="ml-2 pl-4 border-l-2 border-primary/30 space-y-4">
                    {busData.allocation.route_details.stops.map((s: any) => {
                      const isMyStop = s.id === busData.allocation.stop;
                      return (
                        <div key={s.id} className="flex items-start gap-3 relative">
                          <div className={`absolute -left-[1.35rem] w-3.5 h-3.5 rounded-full border-2 border-white mt-0.5 ${isMyStop ? 'bg-primary' : 'bg-gray-300'}`} />
                          <div className={`flex-1 rounded-xl p-2.5 ${isMyStop ? theme === 'dark' ? 'bg-primary/20 border border-primary/40' : 'bg-primary/5 border border-primary/20' : ''}`}>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold ${isMyStop ? 'text-primary' : ''}`}>{s.stop_name}</p>
                              {isMyStop && (
                                <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-primary/30 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                                  You
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 flex items-center gap-3 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              <span className="flex items-center gap-1"><Sunrise size={11} className="text-amber-500" /> {formatTimeTo12Hour(s.arrival_time_morning) || '—'}</span>
                              <span className="opacity-40">·</span>
                              <span className="flex items-center gap-1"><Sunset size={11} className="text-amber-500" /> {formatTimeTo12Hour(s.arrival_time_evening) || '—'}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : tab === 'history' ? (
        <div className={`rounded-2xl border shadow-sm ${card}`}>
          <div className="p-5 border-b border-inherit">
            <h2 className="font-semibold text-base flex items-center gap-2"><Calendar size={16} /> Trip Attendance History</h2>
          </div>
          {historyLoading ? (
            <div className="p-4">
              <SkeletonList items={3} />
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm opacity-60">No trip records found yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-inherit">
              {paginatedHistory.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-all">
                  <div className="flex items-center gap-3">
                    {statusIcon(h.status)}
                    <div>
                      <p className="font-semibold text-sm">{h.trip_log_details?.route_details?.route_name}</p>
                      <div className={`flex flex-wrap items-center gap-2 mt-0.5 text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        <span>{new Date(h.trip_log_details?.start_time).toLocaleDateString()}</span>
                        <span className="opacity-40">·</span>
                        {h.trip_log_details?.trip_type === 'morning' ? (
                          <span className="flex items-center gap-1"><Sunrise size={12} className="text-amber-500" /> Morning</span>
                        ) : (
                          <span className="flex items-center gap-1"><Sunset size={12} className="text-amber-500" /> Evening</span>
                        )}
                        <span className="opacity-40">·</span>
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {h.stop_details?.stop_name}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    h.status === 'boarded' || h.status === 'picked_up' || h.status === 'dropped_off' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : h.status === 'absent' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {h.status === 'picked_up' ? 'boarded' : h.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
          <h2 className="font-semibold text-lg sm:text-xl mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> File Transport Complaint</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm sm:text-xs font-semibold mb-1.5 block">Subject</label>
              <input
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${input}`}
                placeholder="e.g. Bus arrived late"
                value={complaintTitle}
                onChange={e => setComplaintTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm sm:text-xs font-semibold mb-1.5 block">Description</label>
              <textarea
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${input}`}
                placeholder="Describe the issue in detail..."
                rows={5}
                value={complaintDesc}
                onChange={e => setComplaintDesc(e.target.value)}
              />
            </div>
            {!readOnly && (
              <button
                disabled={submitting}
                onClick={handleComplaint}
                className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-semibold text-sm sm:text-base hover:bg-primary/90 transition-all disabled:opacity-60 shadow-sm"
              >
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            )}
          </div>
 
          {/* Recent Complaints */}
          {busData?.recent_complaints?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-inherit">
              <h3 className="font-bold text-base sm:text-lg mb-4">Recent Complaints</h3>
              <div className="space-y-3">
                {busData.recent_complaints.map((c: any) => (
                  <div key={c.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-base sm:text-sm">{c.title}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                    </div>
                    <p className={`text-sm sm:text-xs mb-2 leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{c.description}</p>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-inherit">
                      <p className={`text-xs sm:text-[10px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>{new Date(c.created_at).toLocaleString()}</p>
                      {c.status === 'resolved' && c.action_taken && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-1 border text-xs h-7 px-2 ${
                            theme === 'dark'
                              ? 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/40'
                              : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200/80'
                          }`}
                          onClick={() => setViewComplaint(c)}
                        >
                          View Log
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Complaint Resolution Modal */}
          {viewComplaint && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setViewComplaint(null)}
              />
              <div className="relative w-full max-w-md z-50">
                <Card className={`p-6 border shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar ${card}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                      <PenTool className="w-5 h-5" /> Resolution Log
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setViewComplaint(null)}>
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Actions Taken</label>
                      <div className={`w-full border rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${input} min-h-[100px]`}>
                        {viewComplaint.action_taken || "No action details logged."}
                      </div>
                    </div>
                    {viewComplaint.resolved_at && (
                      <p className="text-xs opacity-60">
                        Resolved on {new Date(viewComplaint.resolved_at).toLocaleDateString()} {new Date(viewComplaint.resolved_at).toLocaleTimeString()}
                      </p>
                    )}
                    <div className="pt-2">
                      <Button
                        onClick={() => setViewComplaint(null)}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg h-10"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
        </CardContent>

        {tab === 'history' && totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, history.length)} to {Math.min(currentPage * itemsPerPage, history.length)} of {history.length} trips
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default StudentTransportPage;
