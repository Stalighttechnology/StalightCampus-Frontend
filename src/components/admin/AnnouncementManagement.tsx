import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from
  "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from
  "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from
  "@/components/ui/alert-dialog";
import { Loader2, Plus, Calendar as CalendarIcon, Check, AlertTriangle, MapPin, ExternalLink, CheckCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { PLAN_TIERS } from "@/utils/planGating";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  markAnnouncementRead,
  Announcement,
  CreateAnnouncementRequest
} from
  "@/utils/announcements_api";
import { manageBranches } from "@/utils/admin_api";
import { fetchIncidents, resolveIncident } from "@/utils/transport_api";
import AnnouncementSections from "@/components/common/AnnouncementSections";
import { useHMSContext } from "@/context/HMSContext";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const AdminAnnouncementManagement = () => {
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);

  // Pagination state
  const [myPage, setMyPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [totalMyCount, setTotalMyCount] = useState(0);
  const [totalReceivedCount, setTotalReceivedCount] = useState(0);
  const [unreadReceivedCount, setUnreadReceivedCount] = useState(0);
  const [activeTab, setActiveTab] = useState("my");
  const [showArchive, setShowArchive] = useState(false);
  const pageSize = 10;

  const { theme } = useTheme();
  const { hostels, fetchHostelsOnly } = useHMSContext();

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;
  const isHMSUser = user?.role === 'hms_admin' || user?.role === 'warden';

  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    message: "",
    target_roles: [],
    is_global: true,
    branch: null,
    expires_at: "",
    priority: "normal"
  });
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>("all");

  useEffect(() => {
    if (!showCreateDialog) return;

    if (isHMSUser) {
      // For HMS users, load hostels instead of branches
      if (hostels.length === 0) {
        fetchHostelsOnly();
      }
    } else {
      if (branches.length > 0) return;
      const loadBranches = async () => {
        try {
          const resp = await manageBranches({ compact: true }, undefined, "GET");
          if (resp.success && resp.branches) {
            setBranches(resp.branches);
          }
        } catch (e) {
          console.error("Error loading branches", e);
        }
      };
      loadBranches();
    }
  }, [showCreateDialog, branches.length, isHMSUser, hostels.length]);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    // Fetch for management view with pagination
    const response = await fetchAnnouncements({
      myPage,
      receivedPage,
      pageSize,
      includeInactive: showArchive,
      includeExpired: showArchive
    });

    if (response.success && response.data) {
      setMyAnnouncements(response.data.my_announcements.results || []);
      setTotalMyCount(response.data.my_announcements.count || 0);
      setReceivedAnnouncements(response.data.received_announcements.results || []);
      setTotalReceivedCount(response.data.received_announcements.count || 0);
      setUnreadReceivedCount(response.data.received_announcements.unread_count || 0);
      setError(null);
    } else {
      setError(response.message || "Failed to load announcements");
      setMyAnnouncements([]);
      setReceivedAnnouncements([]);
    }

    if (user?.role === "transport_admin") {
      try {
        const inc = await fetchIncidents(1, 'emergency');
        const rawIncidents = inc.results || inc || [];
        const activeEmergencies = rawIncidents.filter(
          (i: any) => i.status === "pending"
        );
        setEmergencies(activeEmergencies);
      } catch (e) {
        console.error("Failed to load emergencies", e);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, [myPage, receivedPage, showArchive]);

  useEffect(() => {
    const handleRefresh = () => {
      loadAnnouncements();
    };
    window.addEventListener('refresh-announcements', handleRefresh);
    return () => {
      window.removeEventListener('refresh-announcements', handleRefresh);
    };
  }, []);

  const handlePageChange = (page: number, type: 'my' | 'received') => {
    if (type === 'my') {
      setMyPage(page);
    } else {
      setReceivedPage(page);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleCreateOrUpdate = async () => {
    if (submitting) return;
    if (!formData.title.trim() || !formData.message.trim()) {
      MySwal.fire({
        title: "Validation Error",
        text: "Please fill all required fields",
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
      return;
    }

    if (formData.target_roles.length === 0) {
      MySwal.fire({
        title: "Validation Error",
        text: "Please select at least one target role",
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
      return;
    }

    const allowGlobalStudents = ["coe", "dean", "fees_manager", "principal", "admin", "org_admin", "hms", "hms_admin", "transport_admin", "warden"].includes(user?.role);
    if (!allowGlobalStudents && formData.target_roles.includes("student") && formData.is_global) {
      MySwal.fire({
        title: "Validation Error",
        text: "Please select a specific department when targeting students.",
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const response = await updateAnnouncement(editingId, formData);
        if (response.success) {
          setMyAnnouncements((prev) =>
            prev.map((a) => a.id === editingId ? response.data : a)
          );
          MySwal.fire({
            title: "Updated",
            text: "Announcement updated successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
          setShowCreateDialog(false);
          resetForm();
        } else {
          MySwal.fire({
            title: "Error",
            text: response.message || "Failed to update announcement",
            icon: "error",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
        }
      } else {
        const response = await createAnnouncement(formData);
        if (response.success) {
          setMyAnnouncements((prev) => [response.data, ...prev]);
          setTotalMyCount((prev) => prev + 1); // Update count immediately
          MySwal.fire({
            title: "Success",
            text: "Announcement created successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
          setShowCreateDialog(false);
          resetForm();
        } else {
          MySwal.fire({
            title: "Error",
            text: response.message || "Failed to create announcement",
            icon: "error",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
        }
      }
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      target_roles: announcement.target_roles,
      is_global: announcement.is_global,
      branch: announcement.branch,
      expires_at: announcement.expires_at?.split("T")[0] || "",
      priority: announcement.priority
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (announcementId: number) => {
    const result = await MySwal.fire({
      title: "Delete Announcement",
      text: "Are you sure you want to delete this announcement? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      target: document.body
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteAnnouncement(announcementId);
        if (response.success) {
          const isMy = myAnnouncements.some((a) => a.id === announcementId);
          const isReceived = receivedAnnouncements.some((a) => a.id === announcementId);

          setMyAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
          setReceivedAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));

          if (isMy) setTotalMyCount((prev) => Math.max(0, prev - 1));
          if (isReceived) setTotalReceivedCount((prev) => Math.max(0, prev - 1));

          MySwal.fire({
            title: "Deleted",
            text: "Announcement deleted successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
        } else {
          MySwal.fire({
            title: "Error",
            text: response.message || "Failed to delete announcement",
            icon: "error",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
        }
      } catch (error: any) {
        MySwal.fire({
          title: "Error",
          text: error.message || "An error occurred",
          icon: "error",
          confirmButtonColor: "#9147e0",
          target: document.body
        });
      }
    }
  };

  const handleToggleActive = async (announcementId: number) => {
    const announcement = myAnnouncements.find((a) => a.id === announcementId) || receivedAnnouncements.find((a) => a.id === announcementId);
    const isCurrentlyActive = announcement ? announcement.is_active : false;

    if (isCurrentlyActive) {
      const result = await MySwal.fire({
        title: "Deactivate Announcement?",
        text: "Are you sure you want to deactivate this announcement? It will no longer be visible to targeted users.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, deactivate it!",
        target: document.body
      });
      if (!result.isConfirmed) return;
    } else {
      const result = await MySwal.fire({
        title: "Activate Announcement?",
        text: "Are you sure you want to activate this announcement? It will become visible to the targeted users.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, activate it!",
        target: document.body
      });
      if (!result.isConfirmed) return;
    }

    try {
      const response = await toggleAnnouncementActive(announcementId);
      if (response.success) {
        setMyAnnouncements((prev) =>
          prev.map((a) => a.id === announcementId ? response.data : a)
        );
        setReceivedAnnouncements((prev) =>
          prev.map((a) => a.id === announcementId ? response.data : a)
        );
      } else {
        MySwal.fire({
          title: "Error",
          text: response.message || "Failed to toggle announcement",
          icon: "error",
          confirmButtonColor: "#9147e0",
          target: document.body
        });
      }
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
    }
  };

  const handleMarkRead = async (announcementId: number) => {
    try {
      const response = await markAnnouncementRead(announcementId);
      if (response.success) {
        setReceivedAnnouncements((prev) =>
          prev.map((a) => a.id === announcementId ? { ...a, is_read: true } : a)
        );
        // Optimistically update local unread count for real-time feel
        setUnreadReceivedCount((prev) => Math.max(0, prev - 1));
        // Trigger global unread count refresh
        window.dispatchEvent(new CustomEvent('refresh-unread-count', { detail: { decrement: 1 } }));
      }
    } catch (error: any) {

    }
  };

  const handleResolveEmergency = async (id: number) => {
    const result = await MySwal.fire({
      title: "Resolve Emergency",
      input: "textarea",
      inputLabel: "Resolution Details",
      inputPlaceholder: "Describe actions taken to resolve this emergency...",
      showCancelButton: true,
      confirmButtonText: "Resolve Emergency",
      confirmButtonColor: "#22c55e",
      cancelButtonColor: theme === "dark" ? "#3f3f46" : "#d1d5db",
      background: theme === "dark" ? "#1c1c1e" : "#ffffff",
      color: theme === "dark" ? "#E4E4E7" : "#000000",
    });

    if (result.value) {
      try {
        const res = await resolveIncident(id, result.value);
        if (res.success) {
          MySwal.fire({
            icon: "success",
            title: "Resolved",
            text: "Emergency ticket has been resolved and closed.",
            background: theme === "dark" ? "#1c1c1e" : "#ffffff",
            color: theme === "dark" ? "#E4E4E7" : "#000000",
            confirmButtonColor: "#22c55e"
          });
          setEmergencies(prev => prev.filter(e => e.id !== id));
          // Trigger global unread count refresh
          window.dispatchEvent(new CustomEvent('refresh-unread-count', { detail: { decrement: 1 } }));
        } else {
          MySwal.fire("Error", res.message || "Failed to resolve emergency", "error");
        }
      } catch (err) {
        MySwal.fire("Error", "Server error processing resolution", "error");
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      target_roles: [],
      is_global: true,
      branch: null,
      expires_at: "",
      priority: "normal"
    });
    setSelectedHostelId("all");
  };

  const ALL_ROLES = ["student", "hod", "faculty", "principal", "placement_officer", "org_admin", "dean", "coe", "fees_manager", "hms_admin", "transport_admin", "library_admin", "admission_manager", "driver", "warden"];
  const BASIC_ROLES = ["student", "hod", "faculty", "principal", "org_admin", "dean", "driver", "warden"];

  const getTargetRolesForUser = (userRole: string) => {
    switch (userRole) {
      case "principal":
      case "org_admin":
      case "admin":
      case "dean":
        return ALL_ROLES;
      case "coe":
        return ["student", "faculty", "hod", "principal"];
      case "fees_manager":
        return ["student"];
      case "hms":
      case "hms_admin":
      case "warden":
        return ["student", "warden"];
      case "transport_admin":
        return ["student", "driver"];
      default:
        return ["student", "hod", "faculty", "principal", "placement_officer", "warden"];
    }
  };

  const baseRoles = getTargetRolesForUser(user?.role);
  const roles = (userTier >= 2 ? baseRoles : baseRoles.filter(r => BASIC_ROLES.includes(r))).filter(r => r !== user?.role);

  const renderHeader = (
    <CardHeader className="announcements-card-header border-b pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Announcement Management</CardTitle>
        <p className={`text-sm sm:text-md mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Create and manage system announcements</p>
      </div>
      <div className="announce-actions">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              className={`gap-2 ${theme === 'dark' ? 'text-white bg-primary hover:bg-[#9147e0] border-border' : 'text-white bg-primary hover:bg-[#9147e0] border-primary'}`}>

              <Plus className="w-4 h-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            className="mobile-modal max-w-xl max-h-[80vh] overflow-y-auto custom-scrollbar [&>button]:border-none [&>button]:outline-none [&>button]:focus:ring-0">

            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Announcement" : "Create Announcement"}
              </DialogTitle>
              <DialogDescription>
                {editingId ?
                  "Update the announcement details below" :
                  "Create a new announcement visible to selected roles"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                  <span className={`text-[10px] ${formData.title.length >= 150 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {formData.title.length}/150
                  </span>
                </div>
                <Input
                  id="title"
                  placeholder="Announcement title"
                  maxLength={150}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  } />

              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                  <span className={`text-[10px] ${formData.message.length >= 1000 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {formData.message.length}/1000
                  </span>
                </div>
                <Textarea
                  id="message"
                  placeholder="Announcement message"
                  maxLength={1000}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={6}
                  className="resize-none max-h-24 overflow-auto custom-scrollbar" />

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
                    }>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expires At</Label>
                  <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={theme === 'dark' ? 'w-full justify-start text-left font-normal bg-card text-foreground border-border' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300'}>

                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at ?
                          (() => {
                            try {
                              return format(new Date(formData.expires_at), 'PPP');
                            } catch (e) {
                              return formData.expires_at;
                            }
                          })() :

                          <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Select date</span>
                        }
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className={theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-lg' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                      <div className="p-2">
                        <Calendar
                          mode="single"
                          selected={formData.expires_at ? new Date(formData.expires_at) : undefined}
                          onSelect={(date: Date | undefined) => {
                            if (date) {
                              setFormData({ ...formData, expires_at: format(date, 'yyyy-MM-dd') });
                            } else {
                              setFormData({ ...formData, expires_at: '' });
                            }
                            setExpiresOpen(false);
                          }}
                          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                          className={theme === 'dark' ? 'rounded-md bg-background text-foreground' : 'rounded-md bg-white text-gray-900'} />

                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {isHMSUser ? (
                <div className="space-y-2">
                  <Label>Scope / Hostel</Label>
                  <Select
                    value={selectedHostelId}
                    onValueChange={(val) => {
                      setSelectedHostelId(val);
                      // Always keep is_global=true for HMS users — the DB constraint
                      // requires branch when is_global=false, but the model has no hostel FK.
                      // Backend already restricts delivery to hosteler students/wardens only.
                      setFormData({ ...formData, is_global: true, branch: null });
                    }}
                  >
                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                      <SelectValue placeholder="Select Hostel" />
                    </SelectTrigger>
                    <SelectContent className={`max-h-[200px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}`}>
                      <SelectItem value="all">All Hostels</SelectItem>
                      {hostels.map((h: any) => (
                        <SelectItem key={h.id} value={String(h.id)}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Announcements are delivered to hostel students &amp; wardens only.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Scope / Department</Label>
                  <Select
                    value={formData.is_global ? "all" : String(formData.branch || "")}
                    onValueChange={(val) => {
                      if (val === "all") {
                        setFormData({ ...formData, is_global: true, branch: null });
                      } else {
                        setFormData({ ...formData, is_global: false, branch: Number(val) });
                      }
                    }}
                  >
                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                      <SelectValue placeholder="Select Department Scope" />
                    </SelectTrigger>
                    <SelectContent className={`max-h-[200px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}`}>
                      <SelectItem value="all">All Departments (Global)</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Target Roles <span className="text-red-500">*</span></Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-6 text-xs px-2 ${theme === 'dark' ? 'text-primary hover:bg-primary/20' : 'text-primary hover:bg-primary/10'}`}
                    onClick={() => {
                      if (formData.target_roles?.length === roles.length) {
                        setFormData({ ...formData, target_roles: [] });
                      } else {
                        setFormData({ ...formData, target_roles: [...roles] });
                      }
                    }}
                  >
                    {formData.target_roles?.length === roles.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map((role) => {
                    const isSelected = formData.target_roles?.includes(role) || false;
                    return (
                      <div
                        key={role}
                        role="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              target_roles: (formData.target_roles || []).filter((r) => r !== role)
                            });
                          } else {
                            setFormData({
                              ...formData,
                              target_roles: [...(formData.target_roles || []), role]
                            });
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer select-none ${isSelected
                          ? theme === 'dark'
                            ? 'bg-primary/20 border-primary text-primary-foreground shadow-sm'
                            : 'bg-primary/10 border-primary text-primary shadow-sm'
                          : theme === 'dark'
                            ? 'bg-card border-border hover:bg-accent text-muted-foreground'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => { }}
                          className="pointer-events-none"
                        />
                        <span className="capitalize">{role.replace('_', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={submitting}
                  className={`w-full sm:w-auto ${theme === 'dark' ? 'text-white bg-primary hover:bg-[#9147e0] border-border' : 'text-white bg-primary hover:bg-[#9147e0] border-primary'}`}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />
                      {editingId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editingId ? "Update" : "Create"} Announcement</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CardHeader>
  );

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .announcements-card { border-radius: 12px !important; }
          .announcements-card-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .announcements-card-title { text-xl !important; line-height: 1.2 !important; }
          .announcements-card-desc { font-size: 0.8125rem !important; margin-top: 6px !important; }
          .announcements-card-content { padding: 12px !important; }
          .announce-actions { width: 100% !important; }
          .announce-actions button { width: 100% !important; justify-content: center !important; height: 44px !important; }
          .mobile-modal { width: 90% !important; max-width: 90% !important; padding: 16px !important; border-radius: 16px !important; margin: 0 auto !important; }
          .delete-modal { width: 90vw !important; max-width: 320px !important; padding: 16px !important; border-radius: 12px !important; }
        }
      `}</style>

      <div className={`text-sm sm:text-base max-w-[390px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        <Card id="announcement-management-card" className={`announcements-card shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
          {loading ? (
            <>
              {renderHeader}
              <CardContent className="announcements-card-content">
                <div className="space-y-6">
                  <SkeletonTable rows={5} cols={6} />
                </div>
              </CardContent>
            </>
          ) : error ? (
            <>
              {renderHeader}
              <CardContent className="announcements-card-content">
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <AnnouncementSections
              header={renderHeader}
              myAnnouncements={myAnnouncements}
              receivedAnnouncements={[
                ...receivedAnnouncements,
                ...emergencies.map(e => ({
                  id: e.id + 1000000,
                  title: e.title,
                  message: e.description,
                  target_roles: ['transport_admin'],
                  is_global: false,
                  branch: null,
                  priority: 'urgent',
                  is_active: true,
                  expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
                  created_at: e.created_at,
                  created_by_name: e.reported_by_details ? `${e.reported_by_details.first_name || ''} ${e.reported_by_details.last_name || ''}`.trim() : "Driver",
                  created_by_role: 'driver',
                  is_read: false,
                  is_emergency: true,
                  latitude: e.latitude,
                  longitude: e.longitude,
                  incident_id: e.id
                }))
              ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onMarkRead={handleMarkRead}
              onResolveEmergency={handleResolveEmergency}
              loading={loading}
              showActions={true}
              myPagination={{ count: totalMyCount, page: myPage, pageSize }}
              receivedPagination={{
                count: totalReceivedCount + emergencies.length,
                page: receivedPage,
                pageSize,
                unreadCount: unreadReceivedCount + emergencies.length
              }}
              onPageChange={handlePageChange}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              showExpired={showArchive}
              setShowExpired={setShowArchive}
              hideReceivedTab={false}
            />
          )}
        </Card>
      </div>



    </>);

};

export default AdminAnnouncementManagement;