import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import {
  fetchTransportDashboardStats, fetchBuses, fetchRoutes, fetchDrivers,
  fetchAllocations, fetchIncidents, fetchLiveTracking, fetchEligibleStudents,
  fetchAssignments, createBus, updateBus, deleteBus, createRoute, updateRoute,
  deleteRoute, updateRouteStops, enrollDriver, createAllocation, deleteAllocation,
  createAssignment, deleteAssignment, resolveIncident, fetchDriverAssignment,
  fetchTransportFilters
} from "../../utils/transport_api";
import {
  Bus, Navigation, MapPin, Users, UserCheck, AlertTriangle,
  BarChart2, Plus, Trash2, Edit3, CheckCircle, Clock, RefreshCw,
  Activity, Shield, X, Save, ChevronRight, Phone, Mail,
  TrendingUp, Radio, Search, Filter, ChevronLeft
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────
interface Stats { total_buses: number; total_routes: number; total_drivers: number; allocated_students: number; active_trips: number; pending_complaints: number; }
interface BusT { id: number; bus_number: string; registration_number: string; capacity: number; model_name: string; status: string; is_active: boolean; }
interface RouteT { id: number; route_name: string; start_location: string; end_location: string; distance: string; duration_minutes: number; morning_start_time: string; evening_start_time: string; stops: StopT[]; }
interface StopT { id: number; stop_name: string; sequence_order: number; arrival_time_morning: string; arrival_time_evening: string; latitude: string; longitude: string; }
interface DriverT { id: number; first_name: string; last_name: string; email: string; mobile_number: string; designation: string; }
interface AllocationT { id: number; student: number; student_details: any; route: number; route_details: any; stop: number; stop_details: any; status: string; }
interface IncidentT { id: number; type: string; title: string; description: string; status: string; created_at: string; reported_by_details: any; }

// ─── Stat Card ──────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, accent, theme }: any) => (
  <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
      {icon}
    </div>
    <div>
      <p className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{value ?? '—'}</p>
    </div>
  </div>
);

// ─── Tab Button ─────────────────────────────────────────────────────────
const Tab = ({ icon, label, active, onClick, theme }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary text-white shadow-md' : theme === 'dark' ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'text-gray-600 hover:bg-gray-100'}`}>
    {icon}<span>{label}</span>
  </button>
);

// ─── Badge ──────────────────────────────────────────────────────────────
const Badge = ({ label, color }: any) => {
  const colors: any = { active: 'bg-emerald-100 text-emerald-700', maintenance: 'bg-amber-100 text-amber-700', inactive: 'bg-red-100 text-red-700', allocated: 'bg-blue-100 text-blue-700', pending: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', emergency: 'bg-red-100 text-red-700', incident: 'bg-orange-100 text-orange-700', complaint: 'bg-purple-100 text-purple-700', running: 'bg-emerald-100 text-emerald-700' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${colors[color || label?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>{label}</span>;
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
interface TransportAdminDashboardProps {
  initialTab?: string;
}

const TransportAdminDashboard: React.FC<TransportAdminDashboardProps> = ({ initialTab = 'overview' }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

  // State
  const [stats, setStats] = useState<Stats | null>(null);
  const [buses, setBuses] = useState<BusT[]>([]);
  const [routes, setRoutes] = useState<RouteT[]>([]);
  const [drivers, setDrivers] = useState<DriverT[]>([]);
  const [allocations, setAllocations] = useState<AllocationT[]>([]);
  const [incidents, setIncidents] = useState<IncidentT[]>([]);
  const [liveTrips, setLiveTrips] = useState<any[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  
  // Filter Options
  const [filterOptions, setFilterOptions] = useState({ branches: [], batches: [], semesters: [] });

  // Pagination & Filters State
  const [allocPage, setAllocPage] = useState(1);
  const [allocTotalPages, setAllocTotalPages] = useState(1);
  const [allocFilters, setAllocFilters] = useState({ route: "", status: "", search: "", branch: "", batch: "", semester: "" });
  
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
  const [eligibleFilters, setEligibleFilters] = useState({ search: "", branch: "", batch: "", semester: "" });

  // Form state
  const [busForm, setBusForm] = useState({ bus_number: '', registration_number: '', capacity: 40, model_name: '', status: 'active' });
  const [routeForm, setRouteForm] = useState({ route_name: '', start_location: '', end_location: '', distance: '', duration_minutes: 0, morning_start_time: '', evening_start_time: '' });
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ first_name: '', last_name: '', email: '', phone: '', designation: 'Driver' });
  const [assignForm, setAssignForm] = useState({ driver_id: '', bus_id: '', route_id: '' });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allocationForm, setAllocationForm] = useState({ student: '', route: '', stop: '' });
  const [resolveText, setResolveText] = useState('');

  const [editBusId, setEditBusId] = useState<number | null>(null);
  const [showBusForm, setShowBusForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [resolveId, setResolveId] = useState<number | null>(null);

  // Stop editor for selected route
  const [editingRouteStops, setEditingRouteStops] = useState<number | null>(null);
  const [stopDraft, setStopDraft] = useState<StopT[]>([]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const s = await fetchTransportDashboardStats();
        if (s.success) setStats(s.stats);
      } else if (tab === 'buses') {
        const b = await fetchBuses();
        if (b.results || Array.isArray(b)) setBuses(b.results || b);
      } else if (tab === 'routes') {
        const r = await fetchRoutes();
        if (r.results || Array.isArray(r)) setRoutes(r.results || r);
      } else if (tab === 'drivers') {
        const [d, a, b, r] = await Promise.all([
          fetchDrivers(), fetchAssignments(), fetchBuses(), fetchRoutes()
        ]);
        if (d.success) setDrivers(d.drivers || []);
        if (a.results || Array.isArray(a)) setAssignments(a.results || a);
        if (b.results || Array.isArray(b)) setBuses(b.results || b);
        if (r.results || Array.isArray(r)) setRoutes(r.results || r);
      } else if (tab === 'allocations') {
        const [r, filters] = await Promise.all([
          fetchRoutes(), fetchTransportFilters()
        ]);
        if (r.results || Array.isArray(r)) setRoutes(r.results || r);
        if (filters.success) {
          setFilterOptions({ branches: filters.branches || [], batches: filters.batches || [], semesters: filters.semesters || [] });
        }
      } else if (tab === 'incidents') {
        const inc = await fetchIncidents();
        if (inc.results || Array.isArray(inc)) setIncidents(inc.results || inc);
      } else if (tab === 'tracking') {
        const live = await fetchLiveTracking();
        if (live.success) setLiveTrips(live.trips || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAllocations = async () => {
    const a = await fetchAllocations(allocPage, allocFilters.route, allocFilters.status, allocFilters.search);
    if (a.results) {
      setAllocations(a.results);
      setAllocTotalPages(Math.ceil((a.count || 1) / 20));
    } else if (Array.isArray(a)) setAllocations(a);
  };
  
  const loadEligibleStudents = async () => {
    if (!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester) {
      setEligibleStudents([]);
      setEligibleTotalPages(1);
      return;
    }
    const r = await fetchEligibleStudents(eligiblePage, eligibleFilters.branch, eligibleFilters.batch, eligibleFilters.semester, eligibleFilters.search);
    if (r.results) {
      setEligibleStudents(r.results);
      setEligibleTotalPages(Math.ceil((r.count || 1) / 25));
    } else if (r.students) setEligibleStudents(r.students);
  };

  useEffect(() => { loadTabContent(); }, [tab]);

  useEffect(() => {
    if (tab === 'allocations') {
      const timeout = setTimeout(() => {
        loadAllocations();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [tab, allocPage, allocFilters]);
  
  useEffect(() => {
    if (tab === 'allocations' && showAllocForm) {
      const timeout = setTimeout(() => {
        loadEligibleStudents();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [tab, showAllocForm, eligiblePage, eligibleFilters]);

  const ok = (msg: string) => toast({ title: 'Success', description: msg });
  const err = (msg: string) => toast({ variant: 'destructive', title: 'Error', description: msg });

  // ─── Bus handlers ──────────────────────────────────────────────────
  const handleSaveBus = async () => {
    const res = editBusId ? await updateBus(editBusId, busForm) : await createBus(busForm);
    if (res.id || res.success) { 
      ok(editBusId ? 'Bus updated' : 'Bus added'); 
      setShowBusForm(false); 
      if (editBusId) {
        setBuses(buses.map(b => b.id === editBusId ? { ...b, ...busForm } : b));
      } else if (res.id) {
        setBuses([{ id: res.id, ...busForm, is_active: true } as BusT, ...buses]);
      }
      setEditBusId(null); 
      setBusForm({ bus_number: '', registration_number: '', capacity: 40, model_name: '', status: 'active' }); 
    }
    else err(res.detail || res.message || 'Failed');
  };
  const handleDeleteBus = async (id: number) => { await deleteBus(id); ok('Bus removed'); setBuses(buses.filter(b => b.id !== id)); };
  const startEditBus = (b: BusT) => { setBusForm({ bus_number: b.bus_number, registration_number: b.registration_number, capacity: b.capacity, model_name: b.model_name, status: b.status }); setEditBusId(b.id); setShowBusForm(true); };

  // ─── Route handlers ────────────────────────────────────────────────
  const handleSaveRoute = async () => {
    const res = await createRoute(routeForm);
    if (res.id) { 
      ok('Route created'); 
      setShowRouteForm(false); 
      setRoutes([{ id: res.id, ...routeForm, stops: [] } as RouteT, ...routes]);
      setRouteForm({ route_name: '', start_location: '', end_location: '', distance: '', duration_minutes: 0, morning_start_time: '', evening_start_time: '' }); 
    }
    else err(res.detail || res.message || 'Failed');
  };
  const handleDeleteRoute = async (id: number) => { await deleteRoute(id); ok('Route removed'); setRoutes(routes.filter(r => r.id !== id)); };


  const handleAssignDriver = async () => {
    if (!assignForm.driver_id || !assignForm.bus_id || !assignForm.route_id) {
      err('Select a driver, bus, and route.');
      return;
    }
    const res = await createAssignment({
      driver: assignForm.driver_id,
      bus: assignForm.bus_id,
      route: assignForm.route_id,
    });
    if (res.id) {
      ok('Driver assigned successfully');
      setAssignments(prev => [res, ...prev]);
      setAssignForm({ driver_id: '', bus_id: '', route_id: '' });
    } else {
      err(res.message || 'Failed to assign driver');
    }
  };

  const handleRemoveAssignment = async (id: number) => {
    try {
      const res = await deleteAssignment(id);
      if (res.success !== false) { // DRF delete returns empty response on success usually
        ok('Assignment removed');
        setAssignments(prev => prev.filter(a => a.id !== id));
      } else {
        err(res.message || 'Failed to remove assignment');
      }
    } catch(e) {
      ok('Assignment removed');
      setAssignments(prev => prev.filter(a => a.id !== id));
    }
  };

  const startStopEdit = (route: RouteT) => { setEditingRouteStops(route.id); setStopDraft(route.stops || []); };
  const addStopRow = () => setStopDraft(d => [...d, { id: 0, stop_name: '', sequence_order: d.length + 1, arrival_time_morning: '', arrival_time_evening: '', latitude: '', longitude: '' }]);
  const removeStopRow = (i: number) => setStopDraft(d => d.filter((_, idx) => idx !== i));
  const handleSaveStops = async () => {
    if (!editingRouteStops) return;
    const res = await updateRouteStops(editingRouteStops, stopDraft);
    if (res.success) { 
      ok('Stops saved'); 
      setRoutes(routes.map(r => r.id === editingRouteStops ? { ...r, stops: stopDraft } : r));
      setEditingRouteStops(null); 
    }
    else err(res.message || 'Failed');
  };

  // ─── Driver handlers ───────────────────────────────────────────────
  const handleEnrollDriver = async () => {
    const res = await enrollDriver(driverForm);
    if (res.success) { 
      ok('Driver enrolled'); 
      setShowDriverForm(false); 
      setDrivers([{ id: res.id || Date.now(), ...driverForm, mobile_number: driverForm.phone } as unknown as DriverT, ...drivers]);
      setDriverForm({ first_name: '', last_name: '', email: '', phone: '', designation: 'Driver' }); 
    }
    else err(res.message || 'Failed');
  };

  // ─── Allocation handlers ───────────────────────────────────────────
  const handleAllocate = async () => {
    const res = await createAllocation({ student: parseInt(allocationForm.student), route: parseInt(allocationForm.route), stop: parseInt(allocationForm.stop) });
    if (res.id) { 
      ok('Student allocated'); 
      setShowAllocForm(false); 
      const sObj = eligibleStudents.find(s => s.id === parseInt(allocationForm.student));
      const rObj = routes.find(r => r.id === parseInt(allocationForm.route));
      const stopObj = rObj?.stops?.find(s => s.id === parseInt(allocationForm.stop));
      setAllocations([{
        id: res.id,
        student: parseInt(allocationForm.student),
        student_details: sObj,
        route: parseInt(allocationForm.route),
        route_details: rObj,
        stop: parseInt(allocationForm.stop),
        stop_details: stopObj,
        status: 'allocated'
      }, ...allocations]);
      setAllocationForm({ student: '', route: '', stop: '' }); 
    }
    else err(res.detail || res.message || 'Failed');
  };
  const handleRemoveAllocation = async (id: number) => { await deleteAllocation(id); ok('Allocation removed'); setAllocations(allocations.filter(a => a.id !== id)); };

  // ─── Incident resolve ─────────────────────────────────────────────
  const handleResolve = async () => {
    if (!resolveId) return;
    const res = await resolveIncident(resolveId, resolveText);
    if (res.success) { 
      ok('Resolved'); 
      setIncidents(incidents.map(inc => inc.id === resolveId ? { ...inc, status: 'resolved' } : inc));
      setResolveId(null); 
      setResolveText(''); 
    }
    else err(res.message || 'Failed');
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';
  const input = theme === 'dark' ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400';

  const selectedRoute = routes.find(r => r.id === editingRouteStops);

  return (
    <div className={`min-h-screen ${bg} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bus className="text-primary" size={26} /> Transport Management
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage buses, routes, drivers, and student allocations</p>
        </div>
        <button onClick={loadTabContent} className={`p-2.5 rounded-xl border transition-all hover:bg-primary hover:text-white hover:border-primary ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-gray-200 text-gray-500'}`}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={<Bus size={20} className="text-white" />} label="Total Buses" value={stats?.total_buses} accent="bg-blue-500" theme={theme} />
            <StatCard icon={<Navigation size={20} className="text-white" />} label="Active Routes" value={stats?.total_routes} accent="bg-purple-500" theme={theme} />
            <StatCard icon={<UserCheck size={20} className="text-white" />} label="Drivers" value={stats?.total_drivers} accent="bg-emerald-500" theme={theme} />
            <StatCard icon={<Users size={20} className="text-white" />} label="Students Allocated" value={stats?.allocated_students} accent="bg-amber-500" theme={theme} />
            <StatCard icon={<Activity size={20} className="text-white" />} label="Active Trips" value={stats?.active_trips} accent="bg-green-500" theme={theme} />
            <StatCard icon={<AlertTriangle size={20} className="text-white" />} label="Pending Complaints" value={stats?.pending_complaints} accent="bg-red-500" theme={theme} />
          </div>

          {/* Active Trips Mini-List */}
          {liveTrips.length > 0 && (
            <div className={`rounded-2xl p-5 border shadow-sm ${card}`}>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Radio size={15} className="text-green-500 animate-pulse" /> Live Trips
              </h3>
              <div className="space-y-2">
                {liveTrips.map((t: any) => (
                  <div key={t.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <p className="font-semibold text-sm">{t.route_details?.route_name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{t.driver_details?.first_name} · Bus {t.bus_details?.bus_number}</p>
                    </div>
                    <Badge label={t.trip_type} color="running" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BUSES ────────────────────────────────────────────────── */}
      {tab === 'buses' && (
        <div className={`rounded-2xl border shadow-sm ${card}`}>
          <div className="flex items-center justify-between p-5 border-b border-inherit">
            <h2 className="font-bold text-base">Fleet Management</h2>
            <button onClick={() => { setShowBusForm(true); setEditBusId(null); setBusForm({ bus_number: '', registration_number: '', capacity: 40, model_name: '', status: 'active' }); }} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">
              <Plus size={15} /> Add Bus
            </button>
          </div>

          {showBusForm && (
            <div className={`m-5 p-5 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-blue-100 bg-blue-50'}`}>
              <h3 className="font-semibold mb-4 text-sm">{editBusId ? 'Edit Bus' : 'New Bus'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[['Bus Number', 'bus_number'], ['Registration No.', 'registration_number'], ['Model Name', 'model_name']].map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs font-medium mb-1 block">{label}</label>
                    <input className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${input}`} value={(busForm as any)[key]} onChange={e => setBusForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium mb-1 block">Capacity</label>
                  <input type="number" className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${input}`} value={busForm.capacity} onChange={e => setBusForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Status</label>
                  <select className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${input}`} value={busForm.status} onChange={e => setBusForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveBus} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"><Save size={14} /> Save</button>
                <button onClick={() => setShowBusForm(false)} className={`px-4 py-2 rounded-lg text-sm font-semibold border ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}><X size={14} className="inline mr-1" />Cancel</button>
              </div>
            </div>
          )}

          <div className="divide-y divide-inherit">
            {loading ? <p className="p-5 text-sm text-center opacity-60">Loading buses...</p> : buses.length === 0 ? <p className="p-5 text-sm text-center opacity-60">No buses added yet.</p> : buses.map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Bus size={18} className="text-blue-600" /></div>
                  <div>
                    <p className="font-semibold text-sm">{b.bus_number}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{b.registration_number} · {b.capacity} seats{b.model_name ? ` · ${b.model_name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={b.status} color={b.status} />
                  <button onClick={() => startEditBus(b)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-all"><Edit3 size={15} /></button>
                  <button onClick={() => handleDeleteBus(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ROUTES & STOPS ───────────────────────────────────────── */}
      {tab === 'routes' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border shadow-sm ${card}`}>
            <div className="flex items-center justify-between p-5 border-b border-inherit">
              <h2 className="font-bold text-base">Routes & Stop Planning</h2>
              <button onClick={() => setShowRouteForm(true)} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"><Plus size={15} /> Add Route</button>
            </div>

            {showRouteForm && (
              <div className={`m-5 p-5 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-purple-100 bg-purple-50'}`}>
                <h3 className="font-semibold mb-4 text-sm">New Route</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[['Route Name', 'route_name'], ['Start Location', 'start_location'], ['End Location', 'end_location']].map(([label, key]) => (
                    <div key={key}>
                      <label className="text-xs font-medium mb-1 block">{label}</label>
                      <input className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${input}`} value={(routeForm as any)[key]} onChange={e => setRouteForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Distance (km)</label>
                    <input type="number" className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={routeForm.distance} onChange={e => setRouteForm(f => ({ ...f, distance: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Duration (mins)</label>
                    <input type="number" className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={routeForm.duration_minutes} onChange={e => setRouteForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Morning Start</label>
                    <input type="time" className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={routeForm.morning_start_time} onChange={e => setRouteForm(f => ({ ...f, morning_start_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Evening Start</label>
                    <input type="time" className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={routeForm.evening_start_time} onChange={e => setRouteForm(f => ({ ...f, evening_start_time: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveRoute} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"><Save size={14} /> Save Route</button>
                  <button onClick={() => setShowRouteForm(false)} className={`px-4 py-2 rounded-lg text-sm font-semibold border ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}><X size={14} className="inline mr-1" />Cancel</button>
                </div>
              </div>
            )}

            <div className="divide-y divide-inherit">
              {routes.map(r => (
                <div key={r.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{r.route_name}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{r.start_location} → {r.end_location} · {r.distance} km · {r.duration_minutes} mins</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>🌅 {r.morning_start_time || 'N/A'}  🌇 {r.evening_start_time || 'N/A'}  · {r.stops?.length || 0} stops</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startStopEdit(r)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-semibold hover:bg-primary/20 transition-all"><MapPin size={13} /> Edit Stops</button>
                      <button onClick={() => handleDeleteRoute(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {/* Stop timeline (read view) */}
                  {r.stops && r.stops.length > 0 && editingRouteStops !== r.id && (
                    <div className="mt-3 ml-2 pl-4 border-l-2 border-primary/30 space-y-2">
                      {r.stops.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2 relative">
                          <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-primary border-2 border-white" />
                          <p className="text-xs font-medium">{s.stop_name}</p>
                          <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>🌅 {s.arrival_time_morning || '—'}  🌇 {s.arrival_time_evening || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {!loading && routes.length === 0 && <p className="p-5 text-sm text-center opacity-60">No routes created yet.</p>}
            </div>
          </div>

          {/* Stop Editor Modal */}
          {editingRouteStops && selectedRoute && (
            <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Edit Stops — {selectedRoute.route_name}</h3>
                <div className="flex gap-2">
                  <button onClick={addStopRow} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold"><Plus size={13} /> Add Stop</button>
                  <button onClick={handleSaveStops} className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"><Save size={13} /> Save All</button>
                  <button onClick={() => setEditingRouteStops(null)} className={`px-3 py-1.5 rounded-lg text-xs border font-semibold ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-300 text-gray-600'}`}><X size={13} className="inline" /> Cancel</button>
                </div>
              </div>
              <div className="space-y-3">
                {stopDraft.map((s, i) => (
                  <div key={i} className={`grid grid-cols-2 md:grid-cols-5 gap-2 p-3 rounded-xl border items-center ${theme === 'dark' ? 'border-border bg-background' : 'border-gray-100 bg-gray-50'}`}>
                    <input placeholder="Stop name" className={`border rounded-lg px-2 py-1.5 text-xs ${input}`} value={s.stop_name} onChange={e => setStopDraft(d => d.map((x, j) => j === i ? { ...x, stop_name: e.target.value } : x))} />
                    <input type="time" placeholder="Morning" className={`border rounded-lg px-2 py-1.5 text-xs ${input}`} value={s.arrival_time_morning} onChange={e => setStopDraft(d => d.map((x, j) => j === i ? { ...x, arrival_time_morning: e.target.value } : x))} />
                    <input type="time" placeholder="Evening" className={`border rounded-lg px-2 py-1.5 text-xs ${input}`} value={s.arrival_time_evening} onChange={e => setStopDraft(d => d.map((x, j) => j === i ? { ...x, arrival_time_evening: e.target.value } : x))} />
                    <input placeholder="Lat" className={`border rounded-lg px-2 py-1.5 text-xs ${input}`} value={s.latitude} onChange={e => setStopDraft(d => d.map((x, j) => j === i ? { ...x, latitude: e.target.value } : x))} />
                    <button onClick={() => removeStopRow(i)} className="p-1 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
                {stopDraft.length === 0 && <p className="text-xs text-center opacity-60 py-4">No stops yet. Click "Add Stop" to begin.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DRIVERS ──────────────────────────────────────────────── */}
      {tab === 'drivers' && (
        <div className={`rounded-2xl border shadow-sm ${card}`}>
          <div className="flex items-center justify-between p-5 border-b border-inherit">
            <h2 className="font-bold text-base">Driver Management</h2>
            <button onClick={() => setShowDriverForm(true)} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"><Plus size={15} /> Enroll Driver</button>
          </div>

          {showDriverForm && (
            <div className={`m-5 p-5 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-emerald-100 bg-emerald-50'}`}>
              <h3 className="font-semibold mb-4 text-sm">Enroll New Driver</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[['First Name', 'first_name'], ['Last Name', 'last_name'], ['Email', 'email'], ['Phone', 'phone'], ['Designation', 'designation']].map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs font-medium mb-1 block">{label}</label>
                    <input className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={(driverForm as any)[key]} onChange={e => setDriverForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleEnrollDriver} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"><UserCheck size={14} /> Enroll</button>
                <button onClick={() => setShowDriverForm(false)} className={`px-4 py-2 rounded-lg text-sm font-semibold border ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-600'}`}><X size={14} className="inline mr-1" />Cancel</button>
              </div>
            </div>
          )}

          <div className="m-5 mb-0 p-5 rounded-xl border bg-gray-50 dark:bg-accent/20">
            <h3 className="font-semibold mb-4 text-sm">Assign Driver to Route</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Select Driver</label>
                <select className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={assignForm.driver_id} onChange={e => setAssignForm(f => ({...f, driver_id: e.target.value}))}>
                  <option value="">-- Driver --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Select Route</label>
                <select className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={assignForm.route_id} onChange={e => setAssignForm(f => ({...f, route_id: e.target.value}))}>
                  <option value="">-- Route --</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Select Bus</label>
                <select className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={assignForm.bus_id} onChange={e => setAssignForm(f => ({...f, bus_id: e.target.value}))}>
                  <option value="">-- Bus --</option>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button onClick={handleAssignDriver} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"><CheckCircle size={14} /> Assign Driver</button>
            </div>
          </div>

          <div className="divide-y divide-inherit">
            {drivers.length === 0 ? <p className="p-5 text-sm text-center opacity-60">No drivers enrolled yet.</p> : drivers.map(d => {
              const driverAssignments = assignments.filter(a => a.driver === d.id || a.driver_details?.id === d.id);
              return (
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-all">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm">{d.first_name[0]}{d.last_name?.[0] || ''}</div>
                    <div>
                      <p className="font-semibold text-sm">{d.first_name} {d.last_name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}><Mail size={10} className="inline mr-1" />{d.email} {d.mobile_number && <><Phone size={10} className="inline mx-1" />{d.mobile_number}</>}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {driverAssignments.length > 0 ? (
                      <div className="space-y-2">
                        {driverAssignments.map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-primary/10 px-3 py-1.5 rounded-lg text-xs">
                            <div>
                              <strong className="text-primary">{a.route_details?.route_name || 'Route'}</strong>
                              <span className="opacity-70 ml-2">Bus {a.bus_details?.bus_number || a.bus}</span>
                            </div>
                            <button onClick={() => handleRemoveAssignment(a.id)} className="text-red-500 hover:bg-red-100 p-1 rounded-md transition-all"><X size={13} /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Badge label="Not Assigned" color="pending" />
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <Badge label={d.designation || 'Driver'} color="allocated" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALLOCATIONS ───────────────────────────────────────────── */}
      {tab === 'allocations' && (
        <div className={`rounded-2xl border shadow-sm ${card} overflow-hidden`}>
          <div className="flex items-center justify-between p-5 border-b border-inherit bg-primary/5">
            <h2 className="font-bold text-base flex items-center gap-2"><Users size={18} className="text-primary" /> Student Allocations</h2>
            <button onClick={() => setShowAllocForm(true)} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"><Plus size={15} /> Allocate Student</button>
          </div>

          {/* Filters Bar */}
          {!showAllocForm && (
            <div className={`p-4 border-b border-inherit flex flex-wrap gap-3 items-center ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium opacity-70"><Filter size={14} /> Filters</div>
              <select className={`border rounded-lg px-3 py-1.5 text-sm ${input}`} value={allocFilters.route} onChange={e => setAllocFilters(f => ({ ...f, route: e.target.value }))}>
                <option value="">All Routes</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
              </select>
              <select className={`border rounded-lg px-3 py-1.5 text-sm ${input}`} value={allocFilters.status} onChange={e => setAllocFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Statuses</option>
                <option value="allocated">Allocated</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex-1 relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by name or USN..." className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm ${input}`} value={allocFilters.search} onChange={e => setAllocFilters(f => ({ ...f, search: e.target.value }))} />
              </div>
            </div>
          )}

          {showAllocForm && (
            <div className={`m-5 p-5 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-amber-100 bg-amber-50'}`}>
              <h3 className="font-semibold mb-4 text-sm flex items-center justify-between">
                <span>Assign Student to Bus Stop</span>
                <button onClick={() => setShowAllocForm(false)} className={`p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all`}><X size={16} /></button>
              </h3>
              
              {/* Eligible Student Filters */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <select className={`border rounded-lg px-3 py-1.5 text-sm ${input}`} value={eligibleFilters.branch} onChange={e => setEligibleFilters(f => ({ ...f, branch: e.target.value }))}>
                  <option value="">Select Branch...</option>
                  {filterOptions.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className={`border rounded-lg px-3 py-1.5 text-sm ${input}`} value={eligibleFilters.batch} onChange={e => setEligibleFilters(f => ({ ...f, batch: e.target.value }))}>
                  <option value="">Select Batch...</option>
                  {filterOptions.batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className={`border rounded-lg px-3 py-1.5 text-sm ${input} disabled:opacity-50`} value={eligibleFilters.semester} onChange={e => setEligibleFilters(f => ({ ...f, semester: e.target.value }))} disabled={!eligibleFilters.branch || !eligibleFilters.batch}>
                  <option value="">{(!eligibleFilters.branch || !eligibleFilters.batch) ? 'Select Branch & Batch first...' : 'Select Semester...'}</option>
                  {filterOptions.semesters.filter((s: any) => String(s.branch__id) === eligibleFilters.branch).map((s: any) => <option key={s.id} value={s.id}>Sem {s.number}</option>)}
                </select>
                <div className="flex-1 relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search unallocated students..." className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm ${input}`} value={eligibleFilters.search} onChange={e => setEligibleFilters(f => ({ ...f, search: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 flex justify-between items-center">
                    <span>Student</span>
                    {eligibleTotalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEligiblePage(p => Math.max(1, p - 1))} disabled={eligiblePage === 1} className="p-0.5 rounded bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition-all text-gray-700" type="button"><ChevronLeft size={12} /></button>
                        <span className="text-[10px] opacity-70">Pg {eligiblePage}/{eligibleTotalPages}</span>
                        <button onClick={() => setEligiblePage(p => Math.min(eligibleTotalPages, p + 1))} disabled={eligiblePage === eligibleTotalPages} className="p-0.5 rounded bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition-all text-gray-700" type="button"><ChevronRight size={12} /></button>
                      </div>
                    )}
                  </label>
                  <select className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={allocationForm.student} onChange={e => setAllocationForm(f => ({ ...f, student: e.target.value }))} disabled={eligibleStudents.length === 0}>
                    <option value="">{(!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester) ? 'Select filters first...' : 'Select student...'}</option>
                    {eligibleStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.usn})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Route</label>
                  <select className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={allocationForm.route} onChange={e => setAllocationForm(f => ({ ...f, route: e.target.value, stop: '' }))}>
                    <option value="">Select route...</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Stop</label>
                  <select className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} value={allocationForm.stop} onChange={e => setAllocationForm(f => ({ ...f, stop: e.target.value }))}>
                    <option value="">Select stop...</option>
                    {(routes.find(r => r.id === parseInt(allocationForm.route))?.stops || []).map(s => <option key={s.id} value={s.id}>{s.stop_name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-3 border-t border-inherit">
                <button onClick={handleAllocate} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"><CheckCircle size={14} /> Allocate</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className={`text-xs uppercase font-semibold ${theme === 'dark' ? 'bg-accent/50 text-muted-foreground' : 'bg-gray-50 text-gray-500'}`}>
                <tr>
                  <th className="px-5 py-3">USN</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">Branch & Sem</th>
                  <th className="px-5 py-3">Route → Stop</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {allocations.length === 0 ? (
                  <tr><td colSpan={6} className="p-5 text-center opacity-60">No allocations found.</td></tr>
                ) : allocations.map(a => (
                  <tr key={a.id} className="hover:bg-primary/5 transition-all">
                    <td className="px-5 py-4 font-mono text-xs">{a.student_details?.usn}</td>
                    <td className="px-5 py-4 font-medium">{a.student_details?.name}</td>
                    <td className="px-5 py-4 text-xs opacity-80">{a.student_details?.branch_name} (Sem {a.student_details?.semester_number})</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Navigation size={12} className="opacity-50" />
                        <span>{a.route_details?.route_name} <span className="opacity-50 mx-1">→</span> {a.stop_details?.stop_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge label={a.status} color={a.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleRemoveAllocation(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all" title="Remove Allocation"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className={`p-4 border-t border-inherit flex items-center justify-between text-sm ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
            <div className="opacity-70">
              Page {allocPage} of {allocTotalPages || 1}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAllocPage(p => Math.max(1, p - 1))} disabled={allocPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50"><ChevronLeft size={14} /> Prev</button>
              <button onClick={() => setAllocPage(p => Math.min(allocTotalPages, p + 1))} disabled={allocPage === allocTotalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE TRACKING ─────────────────────────────────────────── */}
      {tab === 'tracking' && (
        <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base flex items-center gap-2"><Radio size={16} className="text-green-500 animate-pulse" /> Live Bus Tracking</h2>
            <button onClick={loadTabContent} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold"><RefreshCw size={13} /> Refresh</button>
          </div>
          {liveTrips.length === 0 ? (
            <div className="text-center py-12">
              <Bus size={40} className="mx-auto opacity-30 mb-3" />
              <p className="text-sm opacity-60">No buses are currently running.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveTrips.map((t: any) => (
                <div key={t.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{t.route_details?.route_name}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Bus {t.bus_details?.bus_number} · Driver: {t.driver_details?.first_name} {t.driver_details?.last_name}</p>
                    </div>
                    <Badge label={t.trip_type === 'morning' ? '🌅 Morning' : '🌇 Evening'} color="running" />
                  </div>
                  {t.current_latitude && (
                    <div className="mt-4 border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-primary/5 p-2 px-3 border-b border-inherit flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-primary">
                          <MapPin size={12} className="animate-bounce" /> Live GPS Location
                        </div>
                        <span className={`opacity-60`}>Updated: {new Date(t.last_updated).toLocaleTimeString()}</span>
                      </div>
                      <iframe
                        title="Bus Live Location"
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${t.current_latitude},${t.current_longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INCIDENTS ─────────────────────────────────────────────── */}
      {tab === 'incidents' && (
        <div className={`rounded-2xl border shadow-sm ${card}`}>
          <div className="p-5 border-b border-inherit"><h2 className="font-bold text-base">Complaints & Incidents</h2></div>
          {resolveId && (
            <div className={`m-5 p-4 rounded-xl border ${theme === 'dark' ? 'border-border bg-background' : 'border-green-100 bg-green-50'}`}>
              <h3 className="font-semibold text-sm mb-2">Resolve Incident</h3>
              <textarea placeholder="Describe the action taken..." className={`w-full border rounded-lg px-3 py-2 text-sm ${input}`} rows={3} value={resolveText} onChange={e => setResolveText(e.target.value)} />
              <div className="flex gap-2 mt-3">
                <button onClick={handleResolve} className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-600"><CheckCircle size={14} /> Mark Resolved</button>
                <button onClick={() => setResolveId(null)} className={`px-4 py-2 rounded-lg text-sm border font-semibold ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-300 text-gray-600'}`}><X size={14} className="inline mr-1" />Cancel</button>
              </div>
            </div>
          )}
          <div className="divide-y divide-inherit">
            {incidents.length === 0 ? <p className="p-5 text-sm text-center opacity-60">No complaints or incidents filed.</p> : incidents.map(i => (
              <div key={i.id} className="px-5 py-4 hover:bg-primary/5 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge label={i.type} color={i.type} />
                      <Badge label={i.status} color={i.status} />
                    </div>
                    <p className="font-semibold text-sm">{i.title}</p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{i.description}</p>
                    <p className={`text-xs mt-1 opacity-60`}>By {i.reported_by_details?.first_name} · {new Date(i.created_at).toLocaleDateString()}</p>
                  </div>
                  {i.status !== 'resolved' && (
                    <button onClick={() => setResolveId(i.id)} className="ml-4 flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-200 transition-all"><CheckCircle size={13} /> Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportAdminDashboard;
