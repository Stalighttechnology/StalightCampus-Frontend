import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { fetchBuses, createBus, updateBus, deleteBus, exportBusesPDF } from "../../../utils/transport_api";
import { Badge, BusT } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { SkeletonTable } from "../../ui/skeleton";
import { Bus, Plus, Trash2, Edit3, Save, X, RefreshCw, Tag, FileDown, Loader2 } from "lucide-react";

const TransportBuses: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<BusT[]>([]);

  // Form state
  const [showBusForm, setShowBusForm] = useState(false);
  const [editBusId, setEditBusId] = useState<number | null>(null);
  const [busForm, setBusForm] = useState({ bus_number: '', registration_number: '', capacity: 40, model_name: '', status: 'active' });
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const loadBuses = useCallback(async () => {
    setLoading(true);
    try {
      const b = await fetchBuses();
      if (b.results || Array.isArray(b)) setBuses(b.results || b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busForm.bus_number.trim() || !busForm.registration_number.trim()) {
      Swal.fire("Warning", "Bus number and registration number are required.", "warning");
      return;
    }

    const cleanedRegNo = busForm.registration_number.replace(/\s+/g, '').toUpperCase();
    const payload = { ...busForm, registration_number: cleanedRegNo };

    try {
      const res = editBusId ? await updateBus(editBusId, payload) : await createBus(payload);
      if (res.id || res.success) {
        Swal.fire("Success", editBusId ? 'Bus details updated successfully' : 'New bus added to fleet', "success");
        setShowBusForm(false);
        if (editBusId) {
          setBuses(buses.map(b => b.id === editBusId ? { ...b, ...payload } : b));
        } else if (res.id) {
          setBuses([{ id: res.id, ...payload, is_active: true } as BusT, ...buses]);
        }
        setEditBusId(null);
        setBusForm({ bus_number: '', registration_number: '', capacity: 40, model_name: '', status: 'active' });
      } else {
        Swal.fire("Error", res.detail || res.message || 'Failed to save bus details', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing fleet update", "error");
    }
  };

  const handleDeleteBus = async (id: number) => {
    const confirmResult = await Swal.fire({
      title: "Remove Bus?",
      text: "Are you sure you want to decommission and remove this bus from the system?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it"
    });

    if (confirmResult.isConfirmed) {
      try {
        await deleteBus(id);
        Swal.fire("Removed", "The bus has been removed from the fleet register.", "success");
        setBuses(buses.filter(b => b.id !== id));
      } catch (error) {
        Swal.fire("Error", "Failed to delete the bus copy.", "error");
      }
    }
  };

  const startEditBus = (b: BusT) => {
    setBusForm({ bus_number: b.bus_number, registration_number: b.registration_number, capacity: b.capacity, model_name: b.model_name, status: b.status });
    setEditBusId(b.id);
    setShowBusForm(true);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await exportBusesPDF();
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Bus_Fleet_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        Swal.fire("Success", "Bus list PDF exported successfully", "success");
      } else {
        Swal.fire("Error", "Failed to export PDF", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error while exporting PDF", "error");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

  return (
    <div id="transport-buses-header" className="space-y-6">

      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Form Modal Panel */}
        {showBusForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowBusForm(false)}
            />

            {/* Modal Window Container */}
            <div
              className="relative w-full max-w-md z-10"
            >
              <Card className={`p-6 border shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <Tag className="w-5 h-5" /> {editBusId ? 'Edit Bus Copy' : 'Add Fleet Bus'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowBusForm(false)}>
                    <X size={16} />
                  </Button>
                </div>
                <form onSubmit={handleSaveBus} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Bus Number</label>
                    <input
                      className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`}
                      value={busForm.bus_number}
                      placeholder="e.g. Bus-01"
                      onChange={e => setBusForm(f => ({ ...f, bus_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Registration Number</label>
                    <input
                      className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`}
                      value={busForm.registration_number}
                      placeholder="e.g. KA-01-1234"
                      onChange={e => setBusForm(f => ({ ...f, registration_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Model Name</label>
                    <input
                      className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`}
                      value={busForm.model_name}
                      placeholder="e.g. Tata Starbus"
                      onChange={e => setBusForm(f => ({ ...f, model_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Capacity</label>
                      <input
                        type="number"
                        className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 ${input}`}
                        value={busForm.capacity}
                        onChange={e => setBusForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Status</label>
                      <Select
                        value={busForm.status}
                        onValueChange={(val) => setBusForm(f => ({ ...f, status: val }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                      <Save size={16} /> Save Bus
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        )}

        <div className="lg:col-span-3">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : (
            <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
              <CardHeader className="pb-3 border-b border-inherit">
                <div id="transport-buses-action-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="sm:text-2xl text-xl font-semibold flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                    <span className="flex items-center gap-2">
                      <Bus size={20} className="text-primary" /> Active Fleet Register
                    </span>
                    {/* Mobile Download PDF Icon Button */}
                    <Button
                      onClick={handleDownloadPDF}
                      disabled={downloadingPDF}
                      size="icon"
                      variant="outline"
                      className="flex sm:hidden h-8 w-8 items-center justify-center shrink-0 border border-input bg-background"
                    >
                      {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown size={15} />}
                    </Button>
                  </CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <Button onClick={() => { setShowBusForm(true); setEditBusId(null); setBusForm({ bus_number: '', registration_number: '', capacity: 40, model_name: '', status: 'active' }); }} className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1 h-9">
                      <Plus size={15} /> Add Bus
                    </Button>
                    <Button
                      onClick={handleDownloadPDF}
                      disabled={downloadingPDF}
                      className="hidden sm:flex w-full sm:w-auto bg-primary hover:bg-primary/90 text-white items-center justify-center gap-1.5 h-9"
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
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className={`sticky top-0 z-10 border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'}`}>
                      <th className="p-4">Bus Details</th>
                      <th className="p-4">Registration</th>
                      <th className="p-4 text-center">Capacity</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6">
                          <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                            <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                              <Bus size={32} className="opacity-80" />
                            </div>
                            <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Fleet Registered</h3>
                            <p className="max-w-xs text-xs leading-relaxed opacity-80">
                              No buses registered. Add a bus using "Add Bus" above to configure your transport fleet resources.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      buses.map(b => (
                        <tr key={b.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                          <td className="p-4">
                            <p className="font-semibold">{b.bus_number}</p>
                            <p className="text-xs opacity-60">{b.model_name || "Standard Model"}</p>
                          </td>
                          <td className="p-4 font-mono font-semibold">{b.registration_number}</td>
                          <td className="p-4 text-center font-semibold">{b.capacity} seats</td>
                          <td className="p-4">
                            <Badge label={b.status} color={b.status} />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button size="icon" variant="ghost" onClick={() => startEditBus(b)} className="h-8 w-8 text-primary">
                                <Edit3 size={15} />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteBus(b.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransportBuses;
