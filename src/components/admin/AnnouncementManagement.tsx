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
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  markAnnouncementRead,
  Announcement,
  CreateAnnouncementRequest,
} from "@/utils/announcements_api";
import AnnouncementSections from "@/components/common/AnnouncementSections";
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    message: "",
    target_roles: [],
    is_global: true,
    expires_at: "",
    priority: "normal",
  });
  const [expiresOpen, setExpiresOpen] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    // Fetch all for management view (include inactive and expired)
    const response = await fetchAnnouncements(1, 100, true, true);

    if (response.success && response.data) {
      setMyAnnouncements(response.data.my_announcements.results || []);
      setReceivedAnnouncements(response.data.received_announcements.results || []);
      setError(null);
    } else {
      setError(response.message || "Failed to load announcements");
      setMyAnnouncements([]);
      setReceivedAnnouncements([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateOrUpdate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      MySwal.fire({
        title: "Validation Error",
        text: "Please fill all required fields",
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body,
      });
      return;
    }

    if (formData.target_roles.length === 0) {
      MySwal.fire({
        title: "Validation Error",
        text: "Please select at least one target role",
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body,
      });
      return;
    }

    try {
      if (editingId) {
        const response = await updateAnnouncement(editingId, formData);
        if (response.success) {
          setMyAnnouncements((prev) =>
            prev.map((a) => (a.id === editingId ? response.data : a))
          );
          MySwal.fire({
            title: "Updated",
            text: "Announcement updated successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body,
          });
          setShowCreateDialog(false);
          resetForm();
        } else {
          MySwal.fire({
            title: "Error",
            text: response.message || "Failed to update announcement",
            icon: "error",
            confirmButtonColor: "#9147e0",
            target: document.body,
          });
        }
      } else {
        const response = await createAnnouncement(formData);
        if (response.success) {
          setMyAnnouncements((prev) => [response.data, ...prev]);
          MySwal.fire({
            title: "Success",
            text: "Announcement created successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body,
          });
          setShowCreateDialog(false);
          resetForm();
        } else {
          MySwal.fire({
            title: "Error",
            text: response.message || "Failed to create announcement",
            icon: "error",
            confirmButtonColor: "#9147e0",
            target: document.body,
          });
        }
      }
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0",
        target: document.body,
      });
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
      priority: announcement.priority,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await deleteAnnouncement(deletingId);
      if (response.success) {
        setMyAnnouncements((prev) => prev.filter((a) => a.id !== deletingId));
        setReceivedAnnouncements((prev) => prev.filter((a) => a.id !== deletingId));
        MySwal.fire({
          title: "Deleted",
          text: "Announcement deleted successfully",
          icon: "success",
          confirmButtonColor: "#9147e0",
        });
      } else {
        MySwal.fire({
          title: "Error",
          text: response.message || "Failed to delete announcement",
          icon: "error",
          confirmButtonColor: "#9147e0",
        });
      }
      setDeletingId(null);
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0",
      });
    }
  };

  const handleToggleActive = async (announcementId: number) => {
    try {
      const response = await toggleAnnouncementActive(announcementId);
      if (response.success) {
        setMyAnnouncements((prev) =>
          prev.map((a) => (a.id === announcementId ? response.data : a))
        );
        setReceivedAnnouncements((prev) =>
          prev.map((a) => (a.id === announcementId ? response.data : a))
        );
      } else {
        MySwal.fire({
          title: "Error",
          text: response.message || "Failed to toggle announcement",
          icon: "error",
          confirmButtonColor: "#9147e0",
        });
      }
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0",
      });
    }
  };

  const handleMarkRead = async (announcementId: number) => {
    try {
      const response = await markAnnouncementRead(announcementId);
      if (response.success) {
        setReceivedAnnouncements((prev) =>
          prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a))
        );
        // Trigger global unread count refresh
        window.dispatchEvent(new CustomEvent('refresh-unread-count'));
      }
    } catch (error: any) {
      console.error("Failed to mark as read:", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      target_roles: [],
      is_global: true,
      expires_at: "",
      priority: "normal",
    });
  };

  const roles = ["student", "hod", "faculty"];

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .announcements-container { padding: 12px; }
          .announcements-card { border-radius: 8px; }
          .announcements-card-header { padding: 12px; }
          .announcements-card-title { font-size: 18px; line-height: 1.3; }
          .announcements-card-desc { font-size: 12px; margin-top: 4px; }
          .announcements-card-content { padding: 12px; }
          .announce-actions { gap: 8px; }
          .announce-list { gap: 10px; }
          .mobile-modal { width: 90vw !important; max-width: 360px !important; padding: 12px !important; border-radius: 12px !important; }
          .delete-modal { width: 90vw !important; max-width: 320px !important; padding: 16px !important; border-radius: 12px !important; }
        }
      `}</style>

      <div className={`announcements-container text-sm sm:text-base max-w-[390px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        <Card className={`announcements-card ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
          <CardHeader className="announcements-card-header grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="min-w-0">
              <CardTitle className={`announcements-card-title ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Announcement Management</CardTitle>
              <p className={`announcements-card-desc ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Create and manage system announcements</p>
            </div>
            <div className="announce-actions">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className={`gap-2 ${theme === 'dark' ? 'text-white bg-primary hover:bg-[#9147e0] border-border' : 'text-white bg-primary hover:bg-[#9147e0] border-primary'}`}
                  >
                    <Plus className="w-4 h-4" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent 
                className="mobile-modal max-w-2xl max-h-[90vh] overflow-y-auto"
                onInteractOutside={(e) => e.preventDefault()}
              >
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? "Edit Announcement" : "Create Announcement"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingId
                        ? "Update the announcement details below"
                        : "Create a new announcement visible to selected roles"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Announcement title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Announcement message"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        rows={6}
                        className="resize-none max-h-24 overflow-auto custom-scrollbar"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, priority: value })
                          }
                        >
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
                              className={theme === 'dark' ? 'w-full justify-start text-left font-normal bg-card text-foreground border-border' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300'}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.expires_at ? (
                                (() => {
                                  try {
                                    return format(new Date(formData.expires_at), 'PPP');
                                  } catch (e) {
                                    return formData.expires_at;
                                  }
                                })()
                              ) : (
                                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Select date</span>
                              )}
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
                                className={theme === 'dark' ? 'rounded-md bg-background text-foreground' : 'rounded-md bg-white text-gray-900'}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Scope</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="is_global"
                            checked={formData.is_global}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                is_global: checked as boolean,
                              })
                            }
                          />
                          <Label htmlFor="is_global" className="font-normal">
                            Global (All branches)
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Roles *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {roles.map((role) => (
                          <div key={role} className="flex items-center gap-2">
                            <Checkbox
                              id={role}
                              checked={formData.target_roles.includes(role)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    target_roles: [
                                      ...formData.target_roles,
                                      role,
                                    ],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    target_roles: formData.target_roles.filter(
                                      (r) => r !== role
                                    ),
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={role} className="font-normal capitalize">
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateOrUpdate}
                        className={`${theme === 'dark' ? 'text-white bg-primary hover:bg-[#9147e0] border-border' : 'text-white bg-primary hover:bg-[#9147e0] border-primary'}`}
                      >
                        {editingId ? "Update" : "Create"} Announcement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="announcements-card-content">
            <div className="space-y-6">
              {loading ? (
                <SkeletonTable rows={5} cols={6} />
              ) : error ? (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                  <p className="font-medium">{error}</p>
                </div>
              ) : (
                <AnnouncementSections
                  myAnnouncements={myAnnouncements}
                  receivedAnnouncements={receivedAnnouncements}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeletingId(id)}
                  onToggleActive={handleToggleActive}
                  onMarkRead={handleMarkRead}
                  loading={loading}
                  showActions={true}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="delete-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminAnnouncementManagement;
