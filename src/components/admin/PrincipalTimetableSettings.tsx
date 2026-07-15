import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, GripVertical, Clock, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { useToast } from "../../hooks/use-toast";
import { Checkbox } from "../../components/ui/checkbox";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

interface TimetableSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  order: number;
}

const hoursOptions = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const minutesOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

const parseTimeTo12h = (timeStr: string) => {
  if (!timeStr) return { hour: "09", minute: "00", period: "AM" };
  const [hStr, mStr] = timeStr.split(":");
  let hourVal = parseInt(hStr, 10);
  const minute = mStr ? mStr.substring(0, 2) : "00";
  let period = "AM";
  if (hourVal >= 12) {
    period = "PM";
    if (hourVal > 12) hourVal -= 12;
  }
  if (hourVal === 0) hourVal = 12;
  const hour = hourVal.toString().padStart(2, "0");
  return { hour, minute, period };
};

const formatTime24h = (hour: string, minute: string, period: string) => {
  let h = parseInt(hour, 10);
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${minute}`;
};

const formatTimeTo12hString = (timeStr: string) => {
  if (!timeStr) return "";
  const { hour, minute, period } = parseTimeTo12h(timeStr);
  return `${hour}:${minute} ${period}`;
};

export default function PrincipalTimetableSettings() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  
  const [startTimeParts, setStartTimeParts] = useState({ hour: "09", minute: "00", period: "AM" });
  const [endTimeParts, setEndTimeParts] = useState({ hour: "10", minute: "00", period: "AM" });
  
  const [formData, setFormData] = useState({
    name: "",
    start_time: "09:00",
    end_time: "10:00",
    is_break: false,
    order: 0,
  });

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      } else {
        throw new Error("Failed to fetch slots");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch slots", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  useEffect(() => {
    if (slots.length < 2) return;
    const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEnd = sortedSlots[i].end_time.substring(0, 5);
      const nextStart = sortedSlots[i+1].start_time.substring(0, 5);
      if (currentEnd < nextStart) {
        const gapFrom = formatTimeTo12hString(currentEnd);
        const gapTo = formatTimeTo12hString(nextStart);
        MySwal.fire({
          title: "Continuous Timetable Warning",
          text: `There is a missing time slot between ${gapFrom} and ${gapTo}. Consider adding it for a continuous timetable.`,
          icon: "warning",
          confirmButtonText: "Got it",
          confirmButtonColor: "#f59e0b",
        });
        break;
      }
    }
  }, [slots]);

  const handleOpen = (slot?: TimetableSlot) => {
    if (slot) {
      setEditingSlot(slot);
      const start = parseTimeTo12h(slot.start_time);
      const end = parseTimeTo12h(slot.end_time);
      setStartTimeParts(start);
      setEndTimeParts(end);
      setFormData({
        name: slot.name,
        start_time: slot.start_time.substring(0, 5),
        end_time: slot.end_time.substring(0, 5),
        is_break: slot.is_break,
        order: slot.order,
      });
    } else {
      setEditingSlot(null);
      let defaultStartStr = "09:00";
      let defaultEndStr = "10:00";
      let startParts = { hour: "09", minute: "00", period: "AM" };
      let endParts = { hour: "10", minute: "00", period: "AM" };

      if (slots.length > 0) {
        const sortedSlots = [...slots].sort((a, b) => a.end_time.localeCompare(b.end_time));
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        defaultStartStr = lastSlot.end_time.substring(0, 5);
        startParts = parseTimeTo12h(defaultStartStr);
        
        const [hStr, mStr] = defaultStartStr.split(":");
        let hour = parseInt(hStr, 10);
        let minute = parseInt(mStr, 10);
        hour = (hour + 1) % 24;
        defaultEndStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        endParts = parseTimeTo12h(defaultEndStr);
      }

      setStartTimeParts(startParts);
      setEndTimeParts(endParts);
      setFormData({
        name: "",
        start_time: defaultStartStr,
        end_time: defaultEndStr,
        is_break: false,
        order: slots.length > 0 ? Math.max(...slots.map(s => s.order)) + 1 : 1,
      });
    }
    setIsOpen(true);
  };

  const updateStartTime = (key: 'hour' | 'minute' | 'period', value: string) => {
    const newParts = { ...startTimeParts, [key]: value };
    setStartTimeParts(newParts);
    setFormData(prev => ({
      ...prev,
      start_time: formatTime24h(newParts.hour, newParts.minute, newParts.period)
    }));
  };

  const updateEndTime = (key: 'hour' | 'minute' | 'period', value: string) => {
    const newParts = { ...endTimeParts, [key]: value };
    setEndTimeParts(newParts);
    setFormData(prev => ({
      ...prev,
      end_time: formatTime24h(newParts.hour, newParts.minute, newParts.period)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.start_time >= formData.end_time) {
      toast({
        title: "Error",
        description: "Start time must be before end time.",
        variant: "destructive"
      });
      return;
    }

    // Check client-side for duplicate timings first
    const duplicate = slots.find(
      s => s.start_time.substring(0, 5) === formData.start_time &&
           s.end_time.substring(0, 5) === formData.end_time &&
           (!editingSlot || s.id !== editingSlot.id)
    );
    if (duplicate) {
      toast({
        title: "Error",
        description: "You already have a slot for these timings.",
        variant: "destructive"
      });
      return;
    }

    const overlapping = slots.find(s => {
      if (editingSlot && s.id === editingSlot.id) return false;
      const sStart = s.start_time.substring(0, 5);
      const sEnd = s.end_time.substring(0, 5);
      return formData.start_time < sEnd && formData.end_time > sStart;
    });
    if (overlapping) {
      toast({
        title: "Error",
        description: "Time slot overlaps with an existing period.",
        variant: "destructive"
      });
      return;
    }

    const duplicateOrder = slots.find(
      s => s.order === Number(formData.order) &&
           (!editingSlot || s.id !== editingSlot.id)
    );
    if (duplicateOrder) {
      toast({
        title: "Error",
        description: "Order number already exists. Please choose a different order.",
        variant: "destructive"
      });
      return;
    }

    try {
      let res;
      if (editingSlot) {
        res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/${editingSlot.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      } else {
        res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      }
      
      if (res.ok) {
        const responseData = await res.json();
        toast({ title: "Success", description: editingSlot ? "Slot updated" : "Slot created" });
        setIsOpen(false);
        if (editingSlot) {
          setSlots(prev => prev.map(s => s.id === editingSlot.id ? responseData : s));
        } else {
          setSlots(prev => [...prev, responseData]);
        }
      } else {
        let errorMsg = "Failed to save slot";
        let isOrderError = false;
        try {
          const errData = await res.json();
          if (errData && errData.order) {
            errorMsg = Array.isArray(errData.order) ? errData.order[0] : errData.order;
            isOrderError = true;
          } else if (errData && (errData.non_field_errors || errData.detail || errData.error || errData.message)) {
            errorMsg = errData.non_field_errors?.[0] || errData.detail || errData.error || errData.message;
          }
        } catch (_) {}

        if (!isOrderError && (res.status === 500 || errorMsg.toLowerCase().includes("unique") || errorMsg.toLowerCase().includes("already exists"))) {
          errorMsg = "You already have a slot for these timings.";
        }

        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Failed to save slot", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: "Existing timetable entries may be affected by deleting this slot.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast({ title: "Success", description: "Slot deleted" });
        setSlots(prev => prev.filter(s => s.id !== id));
      } else {
        throw new Error("Failed to delete slot");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete slot", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pb-6 border-b border-border/50 gap-4">
          <div className="space-y-1">
            <CardTitle className={`text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Timetable Timing Configuration
            </CardTitle>
            <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
              Configure the daily class periods and breaks for your institution.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpen()} className="w-full sm:w-auto shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Slot
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className={`w-[90%] max-w-[90%] md:max-w-xl rounded-2xl ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}`}>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {editingSlot ? 'Edit Slot' : 'Create New Slot'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="slot-name">Slot Name (e.g., Period 1, Lunch Break)</Label>
                  <Input 
                    id="slot-name"
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className={theme === 'dark' ? 'bg-background border-border' : ''}
                    placeholder="Enter slot name..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <div className="flex gap-1.5 items-center">
                      <Select value={startTimeParts.hour} onValueChange={(v) => updateStartTime('hour', v)}>
                        <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                          {hoursOptions.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground font-semibold">:</span>
                      <Select value={startTimeParts.minute} onValueChange={(v) => updateStartTime('minute', v)}>
                        <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent className={`max-h-[200px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                          {minutesOptions.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={startTimeParts.period} onValueChange={(v) => updateStartTime('period', v)}>
                        <SelectTrigger className={`w-28 ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                          <SelectValue placeholder="AM/PM" />
                        </SelectTrigger>
                        <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <div className="flex gap-1.5 items-center">
                      <Select value={endTimeParts.hour} onValueChange={(v) => updateEndTime('hour', v)}>
                        <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                          {hoursOptions.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground font-semibold">:</span>
                      <Select value={endTimeParts.minute} onValueChange={(v) => updateEndTime('minute', v)}>
                        <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent className={`max-h-[200px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                          {minutesOptions.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endTimeParts.period} onValueChange={(v) => updateEndTime('period', v)}>
                        <SelectTrigger className={`w-28 ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                          <SelectValue placeholder="AM/PM" />
                        </SelectTrigger>
                        <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="is_break" 
                    checked={formData.is_break} 
                    onCheckedChange={(c: boolean) => setFormData({...formData, is_break: c})} 
                  />
                  <Label htmlFor="is_break" className="cursor-pointer select-none">This is a break/lunch period</Label>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Slot</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></span>
              Loading slots...
            </div>
          ) : slots.length === 0 ? (
            <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center ${
              theme === 'dark' ? 'border-border bg-muted/5' : 'border-gray-200 bg-gray-50/30'
            }`}>
              <div className={`rounded-full p-4 mb-4 ${theme === 'dark' ? 'bg-muted/40 text-muted-foreground' : 'bg-gray-100/80 text-gray-500'}`}>
                <Clock className="w-8 h-8" />
              </div>
              <h3 className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                No slots configured yet.
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
                Set up periods and breaks to organize class schedules for your institution.
              </p>
              <Button onClick={() => handleOpen()} size="sm" className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Configure your first slot
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <Card 
                  key={slot.id} 
                  className={`border shadow-sm transition-all duration-150 hover:shadow-md ${
                    theme === 'dark' ? 'bg-background border-border' : 'bg-slate-50/50 border-gray-100'
                  } ${
                    slot.is_break 
                      ? 'border-l-4 border-l-orange-500' 
                      : ''
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {slot.name}
                        </p>
                        {slot.is_break && (
                          <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border ${
                            theme === 'dark' 
                              ? 'bg-orange-950/40 text-orange-400 border-orange-900/60' 
                              : 'bg-orange-100 text-orange-800 border-orange-200'
                          }`}>
                            Break
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeTo12hString(slot.start_time)} - {formatTimeTo12hString(slot.end_time)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpen(slot)} 
                        className={`h-9 w-9 hover:bg-muted ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-9 w-9 text-red-500 hover:text-red-600 ${theme === 'dark' ? 'hover:bg-red-950/20' : 'hover:bg-red-50'}`} 
                        onClick={() => handleDelete(slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
