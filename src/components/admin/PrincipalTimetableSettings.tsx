import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, GripVertical } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { useToast } from "../../hooks/use-toast";
import { Checkbox } from "../../components/ui/checkbox";

interface TimetableSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  order: number;
}

export default function PrincipalTimetableSettings() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_time: "",
    end_time: "",
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

  const handleOpen = (slot?: TimetableSlot) => {
    if (slot) {
      setEditingSlot(slot);
      setFormData({
        name: slot.name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_break: slot.is_break,
        order: slot.order,
      });
    } else {
      setEditingSlot(null);
      setFormData({
        name: "",
        start_time: "",
        end_time: "",
        is_break: false,
        order: slots.length > 0 ? Math.max(...slots.map(s => s.order)) + 1 : 1,
      });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast({ title: "Success", description: editingSlot ? "Slot updated" : "Slot created" });
      } else {
        throw new Error("Failed to save slot");
      }
      setIsOpen(false);
      fetchSlots();
    } catch (err) {
      toast({ title: "Error", description: "Failed to save slot", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this slot? Existing timetable entries may be affected.")) return;
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/timetable-slots/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast({ title: "Success", description: "Slot deleted" });
        fetchSlots();
      } else {
        throw new Error("Failed to delete slot");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete slot", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timetable Timing Configuration</h2>
          <p className="text-muted-foreground">Configure the daily class periods and breaks for your institution.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" /> Add Slot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSlot ? 'Edit Slot' : 'Create New Slot'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Slot Name (e.g., Period 1, Lunch Break)</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="is_break" checked={formData.is_break} onCheckedChange={(c: boolean) => setFormData({...formData, is_break: c})} />
                <Label htmlFor="is_break">This is a break/lunch period</Label>
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Input type="number" required value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit">Save Slot</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {slots.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No slots configured yet.</div>
          ) : (
            <div className="divide-y">
              {slots.map((slot) => (
                <div key={slot.id} className={`flex items-center justify-between p-4 ${slot.is_break ? 'bg-muted/30' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                    <div>
                      <p className="font-medium">{slot.name} {slot.is_break && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Break</span>}</p>
                      <p className="text-sm text-muted-foreground">{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(slot)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(slot.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
