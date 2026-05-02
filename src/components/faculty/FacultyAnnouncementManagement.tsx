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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
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
import { SkeletonList } from "@/components/ui/skeleton";

const FacultyAnnouncementManagement = () => {
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
    target_roles: ["student"],
    is_global: false,
    expires_at: "",
    priority: "normal",
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    const response = await fetchAnnouncements(1, 50);

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

    try {
      // Faculty announcements are always for students only and branch-specific
      const payload: CreateAnnouncementRequest = {
        ...formData,
        target_roles: ["student"],
        is_global: false,
      };

      if (editingId) {
        const response = await updateAnnouncement(editingId, payload);
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
        const response = await createAnnouncement(payload);
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
      target_roles: ["student"],
      is_global: false,
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
      target_roles: ["student"],
      is_global: false,
      expires_at: "",
      priority: "normal",
    });
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .announcements-container { padding: 12px; }
          .announcements-card { border-radius: 8px; }
          .announcements-card-header { padding: 12px; }
          .announcements-card-title { font-size: 18px; line-height: 1.3; }
          .announcements-card-desc { font-size: 12px; margin-top: 4px; }
          .mobile-modal { width: 90vw !important; max-width: 360px !important; padding: 12px !important; border-radius: 12px !important; }
          .delete-modal { width: 90vw !important; max-width: 320px !important; padding: 16px !important; border-radius: 12px !important; }
        }
      `}</style>

      <div className="announcements-container w-full max-w-none mx-auto">
        <Card className={`announcements-card ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="announcements-card-header p-4 border-b">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className={`announcements-card-title text-xl sm:text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Announcements for Proctor Students
                </CardTitle>
                <p className={`announcements-card-desc ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Create and manage announcements for your proctor group
                </p>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => resetForm()} 
                    className="gap-2 bg-primary text-white hover:bg-primary/90 transition-colors w-full sm:w-auto"
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
                  <DialogTitle className={`text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {editingId
                      ? "Edit Announcement"
                      : "Create Announcement for Proctor Students"}
                  </DialogTitle>
                  <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                    {editingId
                      ? "Update the announcement details below"
                      : "Create a new announcement that will be sent to your proctor students"}
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
                      <Input
                        id="expires_at"
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) =>
                          setFormData({ ...formData, expires_at: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      ℹ️ This announcement will be visible to your proctor students only
                    </p>
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
                      className="bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      {editingId ? "Update" : "Create"} Announcement
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* Loading State */}
          {loading && (
            <div className="py-4">
              <SkeletonList items={5} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Announcement Sections */}
          {!loading && !error && (
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
        </CardContent>
      </Card>

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
    </div>
    </>
  );
};

export default FacultyAnnouncementManagement;
