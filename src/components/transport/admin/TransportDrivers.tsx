import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { useToast } from "../../../hooks/use-toast";
import { fetchAssignments, enrollDriver, createAssignment, deleteAssignment, fetchAssignmentOptions, updateAssignment } from "../../../utils/transport_api";
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
      const a = await fetchAssignments();
      if (a.results || Array.isArray(a)) setAssignments(a.results || a);
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
      } else {
        Swal.fire("Error", res.message || 'Failed to enroll driver', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error enrolling driver", "error");
    }
  };

  const handleOpenAssignForm = async () => {
    setShowAssignForm(true);
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
        setAssignments(prev => [res, ...prev]);
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
    if (!editAssignForm.driver_id || !editAssignForm.bus_id || !editAssignForm.route_id) {
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
        // Refetch or update locally
        setAssignments(prev => prev.map(item => item.id === editingAssignment.id ? res : item));
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
          setAssignments(prev => prev.filter(a => a.id !== id));
        } else {
          Swal.fire("Error", res.message || 'Failed to remove assignment', "error");
        }
      } catch (e) {
        Swal.fire("Unassigned", "Driver assignment removed.", "success");
        setAssignments(prev => prev.filter(a => a.id !== id));
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
                  <Briefcase size={20} className="text-primary" /> Driver Assignments Register
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                  <Button variant="outline" onClick={handleOpenAssignForm} className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-9">
                    <CheckCircle size={15} /> Assign Route
                  </Button>
                  <Button onClick={() => setShowDriverForm(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1 h-9">
                    <Plus size={15} /> Enroll Driver
                  </Button>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto thin-scrollbar">
              {loading ? (
                <div className="p-4"><SkeletonTable rows={5} cols={6} /></div>
              ) : (
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
                    {assignments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 opacity-60 text-sm">
                          No driver assignments configured yet.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const totalPages = Math.ceil(assignments.length / ROWS_PER_PAGE);
                        const safePage = Math.min(currentPage, totalPages);
                        const pageAssignments = assignments.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
                        return pageAssignments.map(a => {
                          const d = a.driver_details;
                          return (
                            <tr key={a.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-emerald-600 text-xs">
                                    {d?.first_name?.[0]}{d?.last_name?.[0] || ''}
                                  </div>
                                  <span className="font-semibold text-base sm:text-sm">{d?.first_name} {d?.last_name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm sm:text-xs space-y-1">
                                {d?.email && (
                                  <div className="flex items-center gap-1.5 opacity-80">
                                    <Mail size={12} className="opacity-60" />
                                    <span>{d.email}</span>
                                  </div>
                                )}
                                {d?.mobile_number && (
                                  <div className="flex items-center gap-1.5 opacity-80">
                                    <Phone size={12} className="opacity-60" />
                                    <span>{d.mobile_number}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-semibold text-sm sm:text-xs text-primary">
                                {a.route_details?.route_name || '—'}
                              </td>
                              <td className="p-4 text-sm sm:text-xs font-medium">
                                {a.bus_details ? (
                                  <div>
                                    <div className="font-semibold text-gray-800 dark:text-gray-100">{a.bus_details.bus_number}</div>
                                    <div className="text-xs sm:text-[10px] font-bold text-primary mt-0.5">{a.bus_details.registration_number}</div>
                                  </div>
                                ) : (
                                  <span className="opacity-40 text-xs sm:text-[11px]">Bus {a.bus || '—'}</span>
                                )}
                              </td>
                              <td className="p-4 text-sm sm:text-xs">
                                <Badge label={d?.designation || 'Driver'} color="allocated" />
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <Button size="icon" variant="ghost" onClick={() => startEditAssignment(a)} className="h-8 w-8 text-primary" title="Edit Assignment">
                                    <Pencil size={15} />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleRemoveAssignment(a.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Remove Assignment">
                                    <Trash2 size={15} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {assignments.length > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  {assignments.length > 0 && (() => {
                    const safePage2 = Math.min(currentPage, Math.ceil(assignments.length / ROWS_PER_PAGE));
                    const start2 = Math.min((safePage2 - 1) * ROWS_PER_PAGE + 1, assignments.length);
                    const end2 = Math.min(safePage2 * ROWS_PER_PAGE, assignments.length);
                    return <>Showing {start2} to {end2} of {assignments.length} assignments</>;
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
                      {Math.min(currentPage, Math.max(1, Math.ceil(assignments.length / ROWS_PER_PAGE)))}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(assignments.length / ROWS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(assignments.length / ROWS_PER_PAGE) || loading}
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
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm ${cardBg}`}>
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
                    <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={driverForm.first_name} onChange={e => setDriverForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Last Name</label>
                    <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={driverForm.last_name} onChange={e => setDriverForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Email Address</label>
                  <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={driverForm.email} onChange={e => setDriverForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Phone Number</label>
                  <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={driverForm.phone} onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Designation</label>
                  <input className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`} value={driverForm.designation} onChange={e => setDriverForm(f => ({ ...f, designation: e.target.value }))} />
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
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm ${cardBg}`}>
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
                    value={assignForm.driver_id}
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
                    value={assignForm.route_id}
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
                    value={assignForm.bus_id}
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
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm ${cardBg}`}>
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
