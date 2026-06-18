import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { useToast } from "../../../hooks/use-toast";
import { fetchAssignments, enrollDriver, createAssignment, deleteAssignment, fetchAssignmentOptions, updateAssignment, fetchDrivers, deleteDriver } from "../../../utils/transport_api";
import { Badge } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { SkeletonList, SkeletonTable } from "../../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { UserCheck, Plus, CheckCircle, X, Mail, Phone, RefreshCw, Briefcase, Award, Trash2, Pencil } from "lucide-react";

const TransportDrivers: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const ROWS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ first_name: '', last_name: '', email: '', phone: '', designation: 'Driver' });

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ driver_id: '', bus_id: '', route_id: '' });
  const [assignOptions, setAssignOptions] = useState({ drivers: [] as any[], routes: [] as any[], buses: [] as any[] });

  // Edit states
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editAssignForm, setEditAssignForm] = useState({ driver_id: '', bus_id: '', route_id: '' });

  useEffect(() => {
    if (showDriverForm || showAssignForm || editingAssignment) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [showDriverForm, showAssignForm, editingAssignment]);

  const ok = (msg: string) => toast({ title: 'Success', description: msg });
  const err = (msg: string) => toast({ variant: 'destructive', title: 'Error', description: msg });

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([
        fetchAssignments(),
        fetchDrivers()
      ]);
      if (a.results || Array.isArray(a)) setAssignments(a.results || a);
      if (d.success && Array.isArray(d.drivers)) setDrivers(d.drivers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleEnrollDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.first_name.trim() || !driverForm.email.trim() || !driverForm.phone.trim()) {
      Swal.fire("Warning", "First name, email, and phone number are required.", "warning");
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(driverForm.phone.trim())) {
      Swal.fire("Warning", "Please enter a valid 10-digit phone number.", "warning");
      return;
    }

    try {
      const res = await enrollDriver(driverForm);
      if (res.success) {
        Swal.fire("Enrolled!", "Driver has been enrolled successfully.", "success");
        setShowDriverForm(false);
        setDriverForm({ first_name: '', last_name: '', email: '', phone: '', designation: 'Driver' });

        // Refresh options list
        const opts = await fetchAssignmentOptions();
        if (opts.success) {
          setAssignOptions({ drivers: opts.drivers, routes: opts.routes, buses: opts.buses });
        }
        loadAssignments();
      } else {
        Swal.fire("Error", res.message || 'Failed to enroll driver', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error enrolling driver", "error");
    }
  };

  const handleOpenAssignForm = async (driverId?: string) => {
    setShowAssignForm(true);
    const actualDriverId = typeof driverId === 'string' ? driverId : '';
    setAssignForm({ driver_id: actualDriverId, bus_id: '', route_id: '' });
    if (assignOptions.drivers.length === 0) {
      const res = await fetchAssignmentOptions();
      if (res.success) {
        setAssignOptions({ drivers: res.drivers, routes: res.routes, buses: res.buses });
      } else {
        err("Failed to load options");
      }
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.driver_id || !assignForm.bus_id || !assignForm.route_id) {
      Swal.fire("Warning", "Please select a driver, bus, and route.", "warning");
      return;
    }

    try {
      const res = await createAssignment({
        driver: assignForm.driver_id,
        bus: assignForm.bus_id,
        route: assignForm.route_id,
      });
      if (res.id) {
        Swal.fire("Assigned!", "Driver assigned successfully.", "success");
        loadAssignments();
        setAssignForm({ driver_id: '', bus_id: '', route_id: '' });
        setShowAssignForm(false);
      } else {
        Swal.fire("Error", res.message || 'Failed to assign driver', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing driver assignment", "error");
    }
  };

  const startEditAssignment = async (a: any) => {
    setEditingAssignment(a);
    setEditAssignForm({
      driver_id: String(a.driver_details?.id || a.driver || ''),
      bus_id: String(a.bus_details?.id || a.bus || ''),
      route_id: String(a.route_details?.id || a.route || '')
    });
    if (assignOptions.drivers.length === 0) {
      const res = await fetchAssignmentOptions();
      if (res.success) {
        setAssignOptions({ drivers: res.drivers, routes: res.routes, buses: res.buses });
      }
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    if (editAssignForm.driver_id === "none" || !editAssignForm.driver_id) {
      try {
        await deleteAssignment(editingAssignment.id);
        Swal.fire("Unassigned", "Driver assignment removed successfully.", "success");
        loadAssignments();
        setEditingAssignment(null);
      } catch (err) {
        Swal.fire("Error", "Server error unassigning driver", "error");
      }
      return;
    }
    if (!editAssignForm.bus_id || !editAssignForm.route_id) {
      Swal.fire("Warning", "Please select a driver, bus, and route.", "warning");
      return;
    }

    try {
      const res = await updateAssignment(editingAssignment.id, {
        driver: parseInt(editAssignForm.driver_id),
        bus: parseInt(editAssignForm.bus_id),
        route: parseInt(editAssignForm.route_id)
      });
      if (res.id) {
        Swal.fire("Updated!", "Assignment updated successfully.", "success");
        loadAssignments();
        setEditingAssignment(null);
      } else {
        Swal.fire("Error", res.message || 'Failed to update assignment', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error updating driver assignment", "error");
    }
  };

  const handleRemoveAssignment = async (id: number) => {
    const confirmResult = await Swal.fire({
      title: "Remove Assignment?",
      text: "Are you sure you want to unassign this driver from their route?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, unassign"
    });

    if (confirmResult.isConfirmed) {
      try {
        const res = await deleteAssignment(id);
        if (res.success !== false) {
          Swal.fire("Unassigned", "Driver assignment removed successfully.", "success");
          loadAssignments();
        } else {
          Swal.fire("Error", res.message || 'Failed to remove assignment', "error");
        }
      } catch (e) {
        Swal.fire("Unassigned", "Driver assignment removed.", "success");
        loadAssignments();
      }
    }
  };

  const handleDeleteDriver = async (driverId: number) => {
    const confirmResult = await Swal.fire({
      title: "Delete Driver?",
      text: "Are you sure you want to delete this driver? This action cannot be undone and will remove any active route assignments.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete"
    });

    if (confirmResult.isConfirmed) {
      try {
        const res = await deleteDriver(driverId);
        if (res.success) {
          Swal.fire("Deleted!", "Driver has been deleted successfully.", "success");
          setDrivers(prev => prev.filter(d => d.id !== driverId));
          setAssignments(prev => prev.filter(a => (a.driver_details?.id !== driverId && a.driver !== driverId)));
        } else {
          Swal.fire("Error", res.message || 'Failed to delete driver', "error");
        }
      } catch (e) {
        Swal.fire("Error", "Server error deleting driver", "error");
      }
    }
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

  return (
    <div id="transport-drivers-header" className="space-y-6">

      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Assignments List */}
        <div className="lg:col-span-3">
          <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
            <CardHeader className="pb-3 border-b border-inherit">
              <div id="transport-drivers-action-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="sm:text-2xl text-xl font-semibold flex items-center gap-2">
                  Driver Assignments Register
                </CardTitle>
                <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:justify-end">
                  <Button variant="outline" onClick={() => handleOpenAssignForm()} className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-9 text-sm">
                    <CheckCircle size={15} /> Assign Route
                  </Button>
                  <Button onClick={() => setShowDriverForm(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1 h-9 text-sm">
                    <Plus size={15} /> Enroll Driver
                  </Button>
                </div>
              </div>
            </CardHeader>
            <div>
              {loading ? (
                <div className="p-4"><SkeletonTable rows={5} cols={6} /></div>
              ) : drivers.length === 0 ? (
                <div className="p-6">
                  <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      <UserCheck size={32} className="opacity-80" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Drivers Enrolled</h3>
                    <p className="max-w-xs text-xs leading-relaxed opacity-80">
                      No driver assignments configured yet. Add and enroll campus drivers to assign them.
                    </p>
                  </div>
                </div>
              ) : (() => {
                const totalPages = Math.ceil(drivers.length / ROWS_PER_PAGE);
                const safePage = Math.min(currentPage, totalPages);
                const pageDrivers = drivers.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
                return (
                  <>
                    {/* Mobile View: Stacked Cards */}
                    <div className="md:hidden space-y-4 p-4">
                      {pageDrivers.map(d => {
                        const a = assignments.find(item => item.driver_details?.id === d.id || item.driver === d.id);
                        return (
                          <div
                            key={d.id}
                            className={`p-4 rounded-xl border ${
                              theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
                            } flex flex-col gap-3 shadow-sm`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-emerald-600 text-sm">
                                  {d.first_name?.[0] || ''}{d.last_name?.[0] || ''}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-base leading-tight">{d.first_name} {d.last_name}</h4>
                                  <div className="mt-1">
                                    <Badge label={d.designation || 'Driver'} color="allocated" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-border/25">
                              {d.email && (
                                <div className="flex items-center gap-2 text-sm opacity-80">
                                  <Mail size={14} className="opacity-60 shrink-0 text-primary" />
                                  <span className="truncate">{d.email}</span>
                                </div>
                              )}
                              {d.mobile_number && (
                                <div className="flex items-center gap-2 text-sm opacity-80">
                                  <Phone size={14} className="opacity-60 shrink-0 text-primary" />
                                  <span>{d.mobile_number}</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/25">
                              <div>
                                <span className="text-xs uppercase font-bold opacity-60 block mb-0.5">Assigned Route</span>
                                <span className="text-base font-semibold text-primary">
                                  {a ? (a.route_details?.route_name || '—') : 'Unassigned'}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs uppercase font-bold opacity-60 block mb-0.5">Assigned Bus</span>
                                {a ? (
                                  a.bus_details ? (
                                    <div className="text-sm">
                                      <div className="font-semibold text-gray-800 dark:text-gray-100">{a.bus_details.bus_number}</div>
                                      <div className="text-xs font-bold text-primary opacity-80">{a.bus_details.registration_number}</div>
                                    </div>
                                  ) : (
                                    <span className="opacity-60 text-sm font-semibold text-gray-800 dark:text-gray-100">Bus {a.bus || '—'}</span>
                                  )
                                ) : (
                                  <span className="opacity-40 text-sm">—</span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/25 mt-1 w-full">
                              {a ? (
                                <Button size="sm" variant="outline" onClick={() => startEditAssignment(a)} className="h-9 text-sm flex items-center justify-center gap-1.5 w-full font-medium">
                                  <Pencil size={14} /> Edit Route
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleOpenAssignForm(d.id.toString())} className="h-9 text-sm flex items-center justify-center gap-1.5 w-full font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                  <CheckCircle size={14} /> Assign Route
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteDriver(d.id)} className="h-9 text-sm flex items-center justify-center gap-1.5 w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                                <Trash2 size={14} /> Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto thin-scrollbar">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className={`sticky top-0 z-10 border-b text-sm sm:text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'}`}>
                            <th className="p-4">Driver Info</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Assigned Route</th>
                            <th className="p-4">Assigned Bus</th>
                            <th className="p-4">Designation</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageDrivers.map(d => {
                            const a = assignments.find(item => item.driver_details?.id === d.id || item.driver === d.id);
                            return (
                              <tr key={d.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-emerald-600 text-xs">
                                      {d.first_name?.[0] || ''}{d.last_name?.[0] || ''}
                                    </div>
                                    <span className="font-semibold text-base sm:text-sm">{d.first_name} {d.last_name}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-sm sm:text-xs space-y-1">
                                  {d.email && (
                                    <div className="flex items-center gap-1.5 opacity-80">
                                      <Mail size={12} className="opacity-60" />
                                      <span>{d.email}</span>
                                    </div>
                                  )}
                                  {d.mobile_number && (
                                    <div className="flex items-center gap-1.5 opacity-80">
                                      <Phone size={12} className="opacity-60" />
                                      <span>{d.mobile_number}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 font-semibold text-sm sm:text-xs text-primary">
                                  {a ? (a.route_details?.route_name || '—') : <Badge label="Unassigned" color="bg-gray-100 text-gray-600" />}
                                </td>
                                <td className="p-4 text-sm sm:text-xs font-medium">
                                  {a ? (
                                    a.bus_details ? (
                                      <div>
                                        <div className="font-semibold text-gray-800 dark:text-gray-100">{a.bus_details.bus_number}</div>
                                        <div className="text-xs sm:text-[10px] font-bold text-primary mt-0.5">{a.bus_details.registration_number}</div>
                                      </div>
                                    ) : (
                                      <span className="opacity-40 text-xs sm:text-[11px]">Bus {a.bus || '—'}</span>
                                    )
                                  ) : (
                                    <span className="opacity-40 text-xs sm:text-[11px]">—</span>
                                  )}
                                </td>
                                <td className="p-4 text-sm sm:text-xs">
                                  <Badge label={d.designation || 'Driver'} color="allocated" />
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {a ? (
                                      <Button size="icon" variant="ghost" onClick={() => startEditAssignment(a)} className="h-8 w-8 text-primary" title="Edit Assignment">
                                        <Pencil size={15} />
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="outline" onClick={() => handleOpenAssignForm(d.id.toString())} className="h-8 flex items-center gap-1">
                                        <CheckCircle size={13} /> Assign Route
                                      </Button>
                                    )}
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteDriver(d.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Delete Driver">
                                      <Trash2 size={15} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
            {drivers.length > ROWS_PER_PAGE && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  {drivers.length > 0 && (() => {
                    const safePage2 = Math.min(currentPage, Math.ceil(drivers.length / ROWS_PER_PAGE));
                    const start2 = Math.min((safePage2 - 1) * ROWS_PER_PAGE + 1, drivers.length);
                    const end2 = Math.min(safePage2 * ROWS_PER_PAGE, drivers.length);
                    return <>Showing {start2} to {end2} of {drivers.length} drivers</>;
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
                      {Math.min(currentPage, Math.max(1, Math.ceil(drivers.length / ROWS_PER_PAGE)))}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(drivers.length / ROWS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(drivers.length / ROWS_PER_PAGE) || loading}
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

      {/* Modals for Form Overlays */}
      {showDriverForm && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setShowDriverForm(false)} />
          <div className="relative w-full max-w-md z-[1000000]">
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Plus className="w-5 h-5" /> Enroll Driver
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowDriverForm(false)}>
                  <X size={16} />
                </Button>
              </div>
              <form onSubmit={handleEnrollDriver} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">First Name</label>
                    <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} placeholder="e.g. John" value={driverForm.first_name} onChange={e => setDriverForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Last Name</label>
                    <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} placeholder="e.g. Doe" value={driverForm.last_name} onChange={e => setDriverForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Email Address</label>
                  <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} placeholder="e.g. john.doe@example.com" value={driverForm.email} onChange={e => setDriverForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Phone Number</label>
                  <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} placeholder="e.g. 9876543210" value={driverForm.phone} onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Designation</label>
                  <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} placeholder="e.g. Driver" value={driverForm.designation} onChange={e => setDriverForm(f => ({ ...f, designation: e.target.value }))} />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                    <CheckCircle size={16} /> Enroll Driver
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>,
        document.body
      )}

      {showAssignForm && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setShowAssignForm(false)} />
          <div className="relative w-full max-w-md z-[1000000]">
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Award className="w-5 h-5" /> Route Assignment
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAssignForm(false)}>
                  <X size={16} />
                </Button>
              </div>
              <form onSubmit={handleAssignDriver} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Driver</label>
                  <Select
                    value={assignForm.driver_id || undefined}
                    onValueChange={(val) => setAssignForm(f => ({ ...f, driver_id: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Driver" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {assignOptions.drivers.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.first_name} {d.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Route</label>
                  <Select
                    value={assignForm.route_id || undefined}
                    onValueChange={(val) => setAssignForm(f => ({ ...f, route_id: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Route" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {assignOptions.routes.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Bus</label>
                  <Select
                    value={assignForm.bus_id || undefined}
                    onValueChange={(val) => setAssignForm(f => ({ ...f, bus_id: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Bus" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {assignOptions.buses.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>{b.bus_number} — {b.registration_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                    <CheckCircle size={16} /> Save Assignment
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>,
        document.body
      )}

      {editingAssignment && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setEditingAssignment(null)} />
          <div className="relative w-full max-w-md z-[1000000]">
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Award className="w-5 h-5" /> Edit Assignment
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingAssignment(null)}>
                  <X size={16} />
                </Button>
              </div>
              <form onSubmit={handleUpdateAssignment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Driver</label>
                  <Select
                    value={editAssignForm.driver_id}
                    onValueChange={(val) => setEditAssignForm(f => ({ ...f, driver_id: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Driver" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      <SelectItem value="none">None</SelectItem>
                      {assignOptions.drivers.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.first_name} {d.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Route</label>
                  <Select
                    value={editAssignForm.route_id}
                    onValueChange={(val) => setEditAssignForm(f => ({ ...f, route_id: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Route" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {assignOptions.routes.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Bus</label>
                  <Select
                    value={editAssignForm.bus_id}
                    onValueChange={(val) => setEditAssignForm(f => ({ ...f, bus_id: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Bus" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {assignOptions.buses.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>{b.bus_number} — {b.registration_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                    <CheckCircle size={16} /> Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransportDrivers;
