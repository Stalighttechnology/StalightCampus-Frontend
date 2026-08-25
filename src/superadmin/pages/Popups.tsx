import React, { useState, useEffect } from "react";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { showSuccessAlert, showConfirmAlert } from "../../utils/sweetalert";
import { useTheme } from "../../context/ThemeContext";

interface Popup {
  id: number;
  organization: number | null;
  popup_type: string;
  title: string;
  message: string;
  image: string | null;
  button_text: string | null;
  action: string | null;
  enabled: boolean;
  version: number;
  priority: number;
  target_roles: string[];
}

import { AppVersionControlCard } from "./AppVersionControlCard";

const Popups = () => {
  const { theme } = useTheme();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Popup>>({
    title: "",
    message: "",
    popup_type: "feature",
    button_text: "",
    action: "",
    enabled: true,
    version: 1,
    priority: 0,
    organization: null,
    target_roles: [],
  });

  const fetchPopups = async () => {
    try {
      setLoading(true);
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/admin/popups/`);
      if (res.ok) {
        const data = await res.json();
        setPopups(data);
      }
    } catch (error) {
      console.error("Failed to fetch popups", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  const handleSave = async () => {
    try {
      const url = isEditing && formData.id 
        ? `${API_ENDPOINT}/admin/popups/${formData.id}/` 
        : `${API_ENDPOINT}/admin/popups/`;
      const method = isEditing ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        organization: formData.organization || null,
        target_roles: formData.target_roles || []
      };

      const res = await fetchWithSuperadminTokenRefresh(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccessAlert(
          "Success",
          `Popup ${isEditing ? "updated" : "created"} successfully!`
        );
        setShowForm(false);
        setIsEditing(false);
        setFormData({
          title: "", message: "", popup_type: "feature", button_text: "", action: "",
          enabled: true, version: 1, priority: 0, organization: null, target_roles: []
        });
        fetchPopups();
      } else {
        alert("Failed to save popup.");
      }
    } catch (error) {
      console.error("Save error", error);
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await showConfirmAlert(
      "Are you sure?",
      "Do you really want to delete this popup?"
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/admin/popups/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showSuccessAlert("Deleted", "Popup deleted successfully");
        fetchPopups();
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const handleEdit = (popup: Popup) => {
    setFormData({ ...popup });
    setIsEditing(true);
    setShowForm(true);
  };

  const incrementVersion = async (popup: Popup) => {
    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/admin/popups/${popup.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: popup.version + 1 }),
      });
      if (res.ok) {
        showSuccessAlert("Success", "Version incremented. Users will see this popup again.");
        fetchPopups();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleEnabled = async (popup: Popup) => {
    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/admin/popups/${popup.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !popup.enabled }),
      });
      if (res.ok) {
        fetchPopups();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading popups...</div>;
  }

  return (
    <div className="space-y-6">
      {!showForm && <AppVersionControlCard />}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">In-App Popups</h2>
          <p className="text-muted-foreground">Manage global feature spotlights, offers, and notices.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} /> Create Popup
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Popup" : "Create New Popup"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={formData.title || ""} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="E.g., New Feature Alert!" 
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.popup_type} onValueChange={(val) => setFormData({ ...formData, popup_type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature Spotlight</SelectItem>
                    <SelectItem value="offer">Promotional Offer</SelectItem>
                    <SelectItem value="maintenance">Maintenance Notice</SelectItem>
                    <SelectItem value="update">Update Prompt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Target Roles</Label>
                  <span className="text-xs text-muted-foreground italic">Leave empty to target All Roles (Global)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-md bg-slate-50/50 dark:bg-slate-900/50">
                  {[
                    { id: "student", label: "Student" },
                    { id: "outside_student", label: "Outside Student" },
                    { id: "teacher", label: "Teacher" },
                    { id: "hod", label: "HOD" },
                    { id: "dean", label: "Dean" },
                    { id: "coe", label: "COE" },
                    { id: "principal", label: "Principal" },
                    { id: "fees_manager", label: "Fees Manager" },
                    { id: "warden", label: "Warden" },
                    { id: "caretaker", label: "Caretaker" },
                    { id: "placement_officer", label: "Placement Officer" },
                    { id: "transport_admin", label: "Transport Admin" },
                    { id: "driver", label: "Driver" },
                    { id: "library_admin", label: "Library Admin" },
                    { id: "org_admin", label: "Org Admin" },
                    { id: "admission_manager", label: "Admission Manager" },
                    { id: "parent", label: "Parent" }
                  ].map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`role-${role.id}`}
                        checked={(formData.target_roles || []).includes(role.id)}
                        onCheckedChange={(checked) => {
                          const current = formData.target_roles || [];
                          if (checked) {
                            setFormData({ ...formData, target_roles: [...current, role.id] });
                          } else {
                            setFormData({ ...formData, target_roles: current.filter(r => r !== role.id) });
                          }
                        }}
                      />
                      <label 
                        htmlFor={`role-${role.id}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Message</Label>
                <textarea 
                  className="w-full flex min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.message || ""} 
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })} 
                  placeholder="Enter popup message..." 
                />
              </div>
              <div className="space-y-2">
                <Label>Button Text (Optional)</Label>
                <Input 
                  value={formData.button_text || ""} 
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })} 
                  placeholder="E.g., Try it Now" 
                />
              </div>
              <div className="space-y-2">
                <Label>Action URL / Path (Optional)</Label>
                <Input 
                  value={formData.action || ""} 
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })} 
                  placeholder="E.g., /dashboard or https://..." 
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input 
                  type="number"
                  value={formData.priority || 0} 
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Organization ID (Leave blank for global)</Label>
                <Input 
                  type="number"
                  value={formData.organization || ""} 
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value ? parseInt(e.target.value) : null })} 
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); setIsEditing(false); }}>Cancel</Button>
              <Button onClick={handleSave}>{isEditing ? "Save Changes" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <div className="grid grid-cols-1 gap-4">
          {popups.map(popup => (
            <Card key={popup.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{popup.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {popup.popup_type}
                    </span>
                    {popup.organization && (
                      <span className="text-[10px] uppercase tracking-wider bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        Org: {popup.organization}
                      </span>
                    )}
                    {popup.target_roles && popup.target_roles.length > 0 && (
                      <span className="text-[10px] uppercase tracking-wider bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                        Roles: {popup.target_roles.map((r: string) => r.replace('_', ' ')).join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{popup.message}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      Version: {popup.version}
                    </span>
                    <span className="flex items-center gap-1">
                      Priority: {popup.priority}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant={popup.enabled ? "default" : "secondary"}
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => toggleEnabled(popup)}
                  >
                    {popup.enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {popup.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => incrementVersion(popup)}
                    title="Force this popup to show again for all users"
                  >
                    <RotateCcw size={14} /> Reset V.
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => handleEdit(popup)}>
                    <Edit2 size={14} />
                  </Button>
                  
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(popup.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {popups.length === 0 && (
            <div className="p-12 text-center border rounded-xl bg-card border-dashed">
              <p className="text-muted-foreground mb-4">No popups configured yet.</p>
              <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
                <Plus size={16} /> Create First Popup
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Popups;
