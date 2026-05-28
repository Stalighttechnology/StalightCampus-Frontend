import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { fetchRoutes, createRoute, updateRoute, deleteRoute, updateRouteStops, fetchBuses, exportRoutesPDF } from "../../../utils/transport_api";
import { RouteT, StopT } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { SkeletonList } from "../../ui/skeleton";
import { Navigation, MapPin, Plus, Trash2, Save, X, RefreshCw, Calendar, MapPin as StopIcon, Pencil, FileDown, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  labelClass?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, labelClass }) => {
  const [h24Str, minute] = (value || "08:00").split(":");
  let h24 = parseInt(h24Str, 10);
  if (isNaN(h24)) h24 = 8;
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hour12Str = h12.toString().padStart(2, "0");

  const to24h = (h12Val: string, minVal: string, periodVal: string) => {
    let h = parseInt(h12Val, 10);
    if (periodVal === "PM") {
      if (h < 12) h += 12;
    } else {
      if (h === 12) h = 0;
    }
    const h24Val = h.toString().padStart(2, "0");
    return `${h24Val}:${minVal}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const periods = ["AM", "PM"];

  return (
    <div className="w-full">
      <label className={labelClass || "block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2"}>{label}</label>
      <div className="flex gap-1 items-center w-full flex-nowrap">
        <Select value={hour12Str} onValueChange={h => onChange(to24h(h, minute, period))}>
          <SelectTrigger className="flex-1 h-10 border rounded-lg focus:ring-1 focus:ring-primary bg-background text-foreground px-2 text-xs">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] z-[10001]">
            {hours.map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-bold opacity-60">:</span>
        <Select value={minute} onValueChange={m => onChange(to24h(hour12Str, m, period))}>
          <SelectTrigger className="flex-1 h-10 border rounded-lg focus:ring-1 focus:ring-primary bg-background text-foreground px-2 text-xs">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] z-[10001]">
            {minutes.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={p => onChange(to24h(hour12Str, minute, p))}>
          <SelectTrigger className="w-[68px] h-10 border rounded-lg focus:ring-1 focus:ring-primary bg-background text-foreground px-2 text-xs">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent className="z-[10001]">
            {periods.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const formatTo12h = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "—";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hh = parseInt(parts[0], 10);
  const mm = parts[1];
  if (isNaN(hh)) return timeStr;
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  const hhStr = hh.toString().padStart(2, "0");
  return `${hhStr}:${mm} ${ampm}`;
};

const TransportRoutes: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteT[]>([]);

  // Form states
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeForm, setRouteForm] = useState({ route_name: '', start_location: '', end_location: '', distance: '', duration_minutes: 0, morning_start_time: '', evening_start_time: '', bus_id: '' });
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Buses for dropdown
  const [buses, setBuses] = useState<{ id: number; bus_number: string; registration_number: string }[]>([]);
  const [busesLoading, setBusesLoading] = useState(false);

  // Stop editor states
  const [editingRouteStops, setEditingRouteStops] = useState<number | null>(null);
  const [stopDraft, setStopDraft] = useState<StopT[]>([]);

  // Edit route states
  const [editingRoute, setEditingRoute] = useState<RouteT | null>(null);
  const [editRouteForm, setEditRouteForm] = useState({ route_name: '', start_location: '', end_location: '', distance: '', duration_minutes: 0, morning_start_time: '', evening_start_time: '', bus_id: '' });

  // Pagination
  const ROWS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRoutes();
      if (r.results || Array.isArray(r)) setRoutes(r.results || r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    if (showRouteForm && buses.length === 0) {
      setBusesLoading(true);
      // fetch all pages until done — buses are usually few
      const loadAllBuses = async () => {
        try {
          let page = 1, all: any[] = [];
          while (true) {
            const res = await fetchBuses(page, '');
            const items = res.results || (Array.isArray(res) ? res : []);
            all = [...all, ...items];
            if (!res.next) break;
            page++;
          }
          setBuses(all.map((b: any) => ({ id: b.id, bus_number: b.bus_number, registration_number: b.registration_number })));
        } finally {
          setBusesLoading(false);
        }
      };
      loadAllBuses();
    }
  }, [showRouteForm]);

  useEffect(() => {
    if (showRouteForm || editingRouteStops || editingRoute) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [showRouteForm, editingRouteStops, editingRoute]);

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.route_name.trim() || !routeForm.start_location.trim() || !routeForm.end_location.trim()) {
      Swal.fire("Warning", "Route name, start and end locations are required.", "warning");
      return;
    }

    try {
      const payload: any = { ...routeForm };
      if (routeForm.bus_id) payload.bus = parseInt(routeForm.bus_id);
      else delete payload.bus;
      delete payload.bus_id;
      const res = await createRoute(payload);
      if (res.id) {
        Swal.fire("Created!", "Route created successfully.", "success");
        setShowRouteForm(false);
        const chosenBus = buses.find(b => b.id === parseInt(routeForm.bus_id));
        setRoutes([{ id: res.id, ...routeForm, bus: res.bus ?? null, bus_details: chosenBus ? { id: chosenBus.id, bus_number: chosenBus.bus_number, registration_number: chosenBus.registration_number } : null, stops: [] } as RouteT, ...routes]);
        setRouteForm({ route_name: '', start_location: '', end_location: '', distance: '', duration_minutes: 0, morning_start_time: '', evening_start_time: '', bus_id: '' });
      } else {
        Swal.fire("Error", res.detail || res.message || 'Failed to create route', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing route creation", "error");
    }
  };

  const handleDeleteRoute = async (id: number) => {
    const confirmResult = await Swal.fire({
      title: "Remove Route?",
      text: "Deleting this route will delete all stops and student allocations associated with it.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it"
    });

    if (confirmResult.isConfirmed) {
      try {
        await deleteRoute(id);
        Swal.fire("Deleted", "Route has been successfully removed.", "success");
        setRoutes(routes.filter(r => r.id !== id));
      } catch (error) {
        Swal.fire("Error", "Failed to remove route.", "error");
      }
    }
  };

  const startStopEdit = (route: RouteT) => {
    setEditingRouteStops(route.id);
    const normalizedStops = (route.stops || []).map(s => ({
      ...s,
      arrival_time_morning: s.arrival_time_morning || "07:30",
      arrival_time_evening: s.arrival_time_evening || "16:30"
    }));
    setStopDraft(normalizedStops);
  };

  const addStopRow = () => {
    setStopDraft(d => [...d, { id: 0, stop_name: '', sequence_order: d.length + 1, arrival_time_morning: '07:30', arrival_time_evening: '16:30', latitude: '', longitude: '' }]);
  };

  const removeStopRow = async (i: number) => {
    const stopName = stopDraft[i]?.stop_name?.trim() || `Stop #${i + 1}`;
    const result = await Swal.fire({
      title: "Remove Stop?",
      text: `"${stopName}" will be removed from this route. This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, remove it",
      cancelButtonText: "Keep it",
    });
    if (result.isConfirmed) {
      setStopDraft(d => d.filter((_, idx) => idx !== i));
    }
  };

  const handleSaveStops = async () => {
    if (!editingRouteStops) return;
    try {
      const res = await updateRouteStops(editingRouteStops, stopDraft);
      if (res.success) {
        Swal.fire("Saved", "Bus stops updated successfully.", "success");
        setRoutes(routes.map(r => r.id === editingRouteStops ? { ...r, stops: stopDraft } : r));
        setEditingRouteStops(null);
      } else {
        Swal.fire("Error", res.message || 'Failed to save bus stops', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error saving bus stops", "error");
    }
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await exportRoutesPDF();
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Active_Routes_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        Swal.fire("Success", "Route list PDF exported successfully", "success");
      } else {
        Swal.fire("Error", "Failed to export PDF", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error while exporting PDF", "error");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    if (!editRouteForm.route_name.trim() || !editRouteForm.start_location.trim() || !editRouteForm.end_location.trim()) {
      Swal.fire("Warning", "Route name, start and end locations are required.", "warning");
      return;
    }
    try {
      const payload: any = { ...editRouteForm };
      if (editRouteForm.bus_id) payload.bus = parseInt(editRouteForm.bus_id);
      else payload.bus = null;
      delete payload.bus_id;
      const res = await updateRoute(editingRoute.id, payload);
      if (res.id || res.route_name) {
        Swal.fire("Updated!", "Route updated successfully.", "success");
        const chosenBus = buses.find(b => b.id === parseInt(editRouteForm.bus_id));
        setRoutes(routes.map(r => r.id === editingRoute.id ? {
          ...r,
          ...editRouteForm,
          bus: chosenBus?.id ?? null,
          bus_details: chosenBus ? { id: chosenBus.id, bus_number: chosenBus.bus_number, registration_number: chosenBus.registration_number } : null,
        } : r));
        setEditingRoute(null);
      } else {
        Swal.fire("Error", res.detail || res.message || 'Failed to update route', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error updating route", "error");
    }
  };

  const startEditRoute = (r: RouteT) => {
    setEditingRoute(r);
    setEditRouteForm({
      route_name: r.route_name,
      start_location: r.start_location,
      end_location: r.end_location,
      distance: r.distance,
      duration_minutes: r.duration_minutes,
      morning_start_time: r.morning_start_time || '07:30',
      evening_start_time: r.evening_start_time || '16:30',
      bus_id: r.bus ? String(r.bus) : '',
    });
    // Ensure buses are loaded
    if (buses.length === 0) {
      setBusesLoading(true);
      const loadAllBuses = async () => {
        try {
          let page = 1, all: any[] = [];
          while (true) {
            const res = await fetchBuses(page, '');
            const items = res.results || (Array.isArray(res) ? res : []);
            all = [...all, ...items];
            if (!res.next) break;
            page++;
          }
          setBuses(all.map((b: any) => ({ id: b.id, bus_number: b.bus_number, registration_number: b.registration_number })));
        } finally {
          setBusesLoading(false);
        }
      };
      loadAllBuses();
    }
  };

  const selectedRoute = routes.find(r => r.id === editingRouteStops);

  return (
    <div id="transport-routes-header" className="space-y-6">
      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Form Modal Panel */}
        {showRouteForm && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Modal Backdrop overlay */}
            <div
              className="modal-overlay"
              onClick={() => setShowRouteForm(false)}
            />

            {/* Modal Window Container */}
            <div className="relative w-full max-w-md z-[10000]">
              <Card className={`p-6 border shadow-2xl backdrop-blur-sm ${cardBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <Plus className="w-5 h-5" /> New Route
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowRouteForm(false)}>
                    <X size={16} />
                  </Button>
                </div>
                <form onSubmit={handleSaveRoute} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Route Name</label>
                    <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={routeForm.route_name} placeholder="e.g. Route 3A" onChange={e => setRouteForm(f => ({ ...f, route_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Start Location</label>
                      <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={routeForm.start_location} placeholder="e.g. Majestic" onChange={e => setRouteForm(f => ({ ...f, start_location: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">End Location</label>
                      <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={routeForm.end_location} placeholder="e.g. Campus" onChange={e => setRouteForm(f => ({ ...f, end_location: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Distance (km)</label>
                      <input type="number" className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={routeForm.distance} onChange={e => setRouteForm(f => ({ ...f, distance: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Duration (mins)</label>
                      <input type="number" className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={routeForm.duration_minutes} onChange={e => setRouteForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <TimePicker
                      label="Morning Start"
                      value={routeForm.morning_start_time || "07:30"}
                      onChange={val => setRouteForm(f => ({ ...f, morning_start_time: val }))}
                    />
                    <TimePicker
                      label="Evening Start"
                      value={routeForm.evening_start_time || "16:30"}
                      onChange={val => setRouteForm(f => ({ ...f, evening_start_time: val }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Bus Number</label>
                    <Select
                      value={routeForm.bus_id || "__none__"}
                      onValueChange={val => setRouteForm(f => ({ ...f, bus_id: val === "__none__" ? '' : val }))}
                    >
                      <SelectTrigger className={`w-full h-10 border rounded-lg focus:ring-1 focus:ring-primary text-sm ${input}`}>
                        <SelectValue placeholder={busesLoading ? "Loading buses…" : "Select a bus"} />
                      </SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="__none__">— No Bus —</SelectItem>
                        {buses.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.bus_number} — {b.registration_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                      <Save size={16} /> Save Route
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>,
          document.body
        )}

        {/* Edit Route Modal */}
        {editingRoute && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="modal-overlay" onClick={() => setEditingRoute(null)} />
            <div className="relative w-full max-w-md z-[10000]">
              <Card className={`p-6 border shadow-2xl backdrop-blur-sm ${cardBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <Pencil className="w-5 h-5" /> Edit Route
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setEditingRoute(null)}>
                    <X size={16} />
                  </Button>
                </div>
                <form onSubmit={handleUpdateRoute} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Route Name</label>
                    <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={editRouteForm.route_name} placeholder="e.g. Route 3A" onChange={e => setEditRouteForm(f => ({ ...f, route_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Start Location</label>
                      <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={editRouteForm.start_location} placeholder="e.g. Majestic" onChange={e => setEditRouteForm(f => ({ ...f, start_location: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">End Location</label>
                      <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={editRouteForm.end_location} placeholder="e.g. Campus" onChange={e => setEditRouteForm(f => ({ ...f, end_location: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Distance (km)</label>
                      <input type="number" className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={editRouteForm.distance} onChange={e => setEditRouteForm(f => ({ ...f, distance: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Duration (mins)</label>
                      <input type="number" className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={editRouteForm.duration_minutes} onChange={e => setEditRouteForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <TimePicker
                      label="Morning Start"
                      value={editRouteForm.morning_start_time || "07:30"}
                      onChange={val => setEditRouteForm(f => ({ ...f, morning_start_time: val }))}
                    />
                    <TimePicker
                      label="Evening Start"
                      value={editRouteForm.evening_start_time || "16:30"}
                      onChange={val => setEditRouteForm(f => ({ ...f, evening_start_time: val }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-200 mb-2">Bus Number</label>
                    <Select
                      value={editRouteForm.bus_id || "__none__"}
                      onValueChange={val => setEditRouteForm(f => ({ ...f, bus_id: val === "__none__" ? '' : val }))}
                    >
                      <SelectTrigger className={`w-full h-10 border rounded-lg focus:ring-1 focus:ring-primary text-sm ${input}`}>
                        <SelectValue placeholder={busesLoading ? "Loading buses…" : "Select a bus"} />
                      </SelectTrigger>
                      <SelectContent className="z-[10001]">
                        <SelectItem value="__none__">— No Bus —</SelectItem>
                        {buses.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.bus_number} — {b.registration_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                      <Save size={16} /> Update Route
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>,
          document.body
        )}

        {/* Route List & Timeline */}
        <div className="lg:col-span-3">
          <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
            <CardHeader className="pb-3 border-b border-inherit">
              <div id="transport-routes-action-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="sm:text-2xl text-xl font-semibold flex items-center gap-2">
                  <Navigation size={20} className="text-primary" /> Active Route Register
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                  <Button onClick={() => setShowRouteForm(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1 h-9">
                    <Plus size={15} /> Add Route
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-1.5 h-9"
                  >
                    {downloadingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown size={15} />
                    )}
                    {downloadingPDF ? "Exporting..." : "Export PDF"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto thin-scrollbar">
              {loading ? (
                <div className="p-4"><SkeletonList items={3} /></div>
              ) : routes.length === 0 ? (
                <p className="p-8 text-sm text-center opacity-60">No routes created yet. Add a route to begin planning.</p>
              ) : (() => {
                const totalPages = Math.ceil(routes.length / ROWS_PER_PAGE);
                const safePage = Math.min(currentPage, totalPages);
                const pageRoutes = routes.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
                const startEntry = (safePage - 1) * ROWS_PER_PAGE + 1;
                const endEntry = Math.min(safePage * ROWS_PER_PAGE, routes.length);
                return (
                  <>
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className={`border-b text-sm sm:text-xs font-semibold uppercase opacity-70 ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                          <th className="p-4">Route Info</th>
                          <th className="p-4">Start → End</th>
                          <th className="p-4">Distance & Duration</th>
                          <th className="p-4">Bus</th>
                          <th className="p-4">Timings</th>
                          <th className="p-4">Stops</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {pageRoutes.map(r => (
                          <React.Fragment key={r.id}>
                            <tr className="hover:bg-primary/5 transition-colors duration-150">
                              <td className="p-4 font-semibold text-base sm:text-sm">{r.route_name}</td>
                              <td className="p-4 text-sm sm:text-xs font-medium">
                                <span className="text-primary">{r.start_location}</span>
                                <span className="mx-2 opacity-50">→</span>
                                <span className="text-purple-500 font-semibold">{r.end_location}</span>
                              </td>
                              <td className="p-4 text-sm sm:text-xs opacity-80">
                                {r.distance} km / {r.duration_minutes} mins
                              </td>
                              <td className="p-4 text-sm sm:text-xs">
                                {r.bus_details ? (
                                  <div>
                                    <div className="font-semibold text-gray-800 dark:text-gray-100">{r.bus_details.bus_number}</div>
                                    <div className="text-xs sm:text-[10px] font-bold text-primary mt-0.5">{r.bus_details.registration_number}</div>
                                  </div>
                                ) : (
                                  <span className="opacity-40 text-xs sm:text-[11px]">No bus</span>
                                )}
                              </td>
                              <td className="p-4 text-sm sm:text-xs space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="opacity-50 text-xs sm:text-[10px] uppercase font-bold">Morning:</span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatTo12h(r.morning_start_time)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="opacity-50 text-xs sm:text-[10px] uppercase font-bold">Evening:</span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatTo12h(r.evening_start_time)}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm sm:text-xs">
                                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs sm:text-[10px] font-bold">
                                  {r.stops?.length || 0} stops
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex gap-2 justify-end items-center">
                                  <Button size="icon" variant="ghost" onClick={() => startEditRoute(r)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                    <Pencil size={14} />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => startStopEdit(r)} className="text-xs bg-primary text-white hover:bg-primary/90 hover:text-white">
                                    Add Stops
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteRoute(r.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                    <Trash2 size={15} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {r.stops && r.stops.length > 0 && (
                              <tr className={theme === 'dark' ? 'bg-background/20' : 'bg-gray-50/40'}>
                                <td colSpan={7} className="px-6 py-3">
                                  <div className="flex flex-wrap gap-3 items-center pl-4 border-l-2 border-primary/20">
                                    <span className="text-[10px] uppercase font-bold opacity-60 mr-2">Route Timeline:</span>
                                    {r.stops.map((s, i) => (
                                      <div key={s.id} className="flex items-center gap-1.5 text-xs bg-white dark:bg-accent border dark:border-border px-2.5 py-1 rounded-lg shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <span className="font-medium">{s.stop_name}</span>
                                        <span className="text-[10px] opacity-75 font-semibold text-primary">
                                          ({formatTo12h(s.arrival_time_morning)} / {formatTo12h(s.arrival_time_evening)})
                                        </span>
                                        {i < r.stops.length - 1 && <span className="opacity-40 ml-1">→</span>}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>

                  </>
                );
              })()}
            </div>
            {routes.length > ROWS_PER_PAGE && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  {routes.length > 0 && (() => {
                    const safePage2 = Math.min(currentPage, Math.ceil(routes.length / ROWS_PER_PAGE));
                    const start2 = Math.min((safePage2 - 1) * ROWS_PER_PAGE + 1, routes.length);
                    const end2 = Math.min(safePage2 * ROWS_PER_PAGE, routes.length);
                    return <>Showing {start2} to {end2} of {routes.length} routes</>;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {Math.min(currentPage, Math.max(1, Math.ceil(routes.length / ROWS_PER_PAGE)))}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(routes.length / ROWS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(routes.length / ROWS_PER_PAGE) || loading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Stop Editor Drawer / Card Section */}
      {editingRouteStops && selectedRoute && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Modal Backdrop overlay */}
          <div
            className="modal-overlay"
            onClick={() => setEditingRouteStops(null)}
          />

          {/* Modal Window Container */}
          <div className="relative w-full max-w-2xl z-[10000] max-h-[90vh] flex flex-col">
            <Card className={`border shadow-2xl p-6 backdrop-blur-sm flex flex-col overflow-hidden ${cardBg}`}>
              {/* Header */}
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-inherit">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <StopIcon size={18} className="text-primary" /> Edit Bus Stops — <span className="text-primary">{selectedRoute.route_name}</span>
                  </h3>
                  <p className="text-xs opacity-75 mt-0.5">Define stop points, order sequences, and pick-up times</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditingRouteStops(null)} className="h-8 w-8 rounded-full">
                  <X size={16} />
                </Button>
              </div>

              {/* Scrollable List */}
              <div className="space-y-3 overflow-y-auto thin-scrollbar pr-2 flex-1 pb-4">
                {stopDraft.map((s, i) => (
                  <div key={i} className={`grid grid-cols-1 md:grid-cols-7 gap-3 p-3 rounded-xl border items-center ${theme === 'dark' ? 'border-border bg-background/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-700 dark:text-gray-200 mb-1 block">Stop Name</label>
                      <input placeholder="e.g. Silk Board" className={`w-full border rounded-lg px-3 py-1.5 text-xs ${input}`} value={s.stop_name} onChange={e => setStopDraft(d => d.map((x, j) => j === i ? { ...x, stop_name: e.target.value } : x))} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <TimePicker
                        label="Morning Time"
                        labelClass="text-[10px] uppercase font-bold text-gray-700 dark:text-gray-200 mb-1 block"
                        value={s.arrival_time_morning || "07:30"}
                        onChange={val => setStopDraft(d => d.map((x, j) => j === i ? { ...x, arrival_time_morning: val } : x))}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <TimePicker
                        label="Evening Time"
                        labelClass="text-[10px] uppercase font-bold text-gray-700 dark:text-gray-200 mb-1 block"
                        value={s.arrival_time_evening || "16:30"}
                        onChange={val => setStopDraft(d => d.map((x, j) => j === i ? { ...x, arrival_time_evening: val } : x))}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1 flex items-end justify-end h-full pt-4 md:pt-0">
                      <Button size="icon" variant="ghost" onClick={() => removeStopRow(i)} className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                {stopDraft.length === 0 && <p className="text-xs text-center opacity-60 py-6">No stops configured. Click "Add Stop" to start planning route points.</p>}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-inherit">
                <Button size="sm" variant="outline" onClick={addStopRow} className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary/90 hover:text-white">
                  <Plus size={14} /> Add Stop
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingRouteStops(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveStops} className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold shadow-md">
                    <Save size={14} /> Save All Stops
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransportRoutes;
