import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem } from
"@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { Loader2, Plus, CalendarIcon, Check, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  markAnnouncementRead,
  Announcement,
  CreateAnnouncementRequest } from
"@/utils/announcements_api";
import AnnouncementSections from "@/components/common/AnnouncementSections";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const HODAnnouncementManagement = () => {
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
    target_roles: ["student", "faculty"],
    is_global: false,
    expires_at: "",
    priority: "normal"
  });

  const [myPage, setMyPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [totalMyCount, setTotalMyCount] = useState(0);
  const [totalReceivedCount, setTotalReceivedCount] = useState(0);
  const [unreadReceivedCount, setUnreadReceivedCount] = useState(0);
  const [activeTab, setActiveTab] = useState("my");
  const [showArchive, setShowArchive] = useState(false);
  const pageSize = 10;

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
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
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, [myPage, receivedPage, showArchive]);

  const handlePageChange = (page: number, type: 'my' | 'received') => {
    if (type === 'my') {
      setMyPage(page);
    } else {
      setReceivedPage(page);
    }
  };

  const handleCreateOrUpdate = async () => {
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

    try {
      // HOD announcements are always branch-specific and not global
      const payload: CreateAnnouncementRequest = {
        ...formData,
        is_global: false
      };

      if (editingId) {
        const response = await updateAnnouncement(editingId, payload);
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
        const response = await createAnnouncement(payload);
        if (response.success) {
          setMyAnnouncements((prev) => [response.data, ...prev]);
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
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      target_roles: announcement.target_roles,
      is_global: false,
      branch: announcement.branch,
      expires_at: announcement.expires_at?.split("T")[0] || "",
      priority: announcement.priority
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
          confirmButtonColor: "#9147e0"
        });
      } else {
        MySwal.fire({
          title: "Error",
          text: response.message || "Failed to delete announcement",
          icon: "error",
          confirmButtonColor: "#9147e0"
        });
      }
      setDeletingId(null);
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0"
      });
    }
  };

  const handleToggleActive = async (announcementId: number) => {
    try {
      const response = await toggleAnnouncementActive(announcementId);
      if (response.success) {
        setMyAnnouncements((prev) =>
        prev.map((a) => a.id === announcementId ? response.data : a)
        );
      } else {
        MySwal.fire({
          title: "Error",
          text: response.message || "Failed to toggle announcement",
          icon: "error",
          confirmButtonColor: "#9147e0"
        });
      }
    } catch (error: any) {
      MySwal.fire({
        title: "Error",
        text: error.message || "An error occurred",
        icon: "error",
        confirmButtonColor: "#9147e0"
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

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      target_roles: ["student", "faculty"],
      is_global: false,
      expires_at: "",
      priority: "normal"
    });
  };

  const roles = ["student", "faculty"];

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .announcements-card { border-radius: 8px; }
          .announcements-card-header { padding: 12px; }
          .announcements-card-title { font-size: 1.125rem; line-height: 1.3; }
          .announcements-card-desc { font-size: 0.75rem; margin-top: 4px; }
          .mobile-modal { width: 90vw !important; max-width: 360px !important; padding: 12px !important; border-radius: 12px !important; }
          .delete-modal { width: 90vw !important; max-width: 320px !important; padding: 16px !important; border-radius: 12px !important; }
        }
      `}</style>

      <div id="hod-announcements-container" className="w-full max-w-none mx-auto space-y-6">
        <Card className={`announcements-card ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          {/* Error State */}
          {error &&
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive m-6">
              <p className="font-medium">{error}</p>
            </div>
          }

          {/* Announcement Sections */}
          {!error &&
            <AnnouncementSections
              header={
                <CardHeader className="announcements-card-header flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b ">
                  <div className="space-y-1">
                    <CardTitle className="announcements-card-title text-xl font-semibold">Branch Announcements</CardTitle>
                    <CardDescription className={`announcements-card-desc ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Create and manage announcements for your branch
                    </CardDescription>
                  </div>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => resetForm()}
                        className="w-full sm:w-auto gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 transition-all duration-200 shadow-md">
                        
                        <Plus className="w-4 h-4" />
                        New Announcement
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="mobile-modal w-[90%] sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl custom-scrollbar">
                      
                      <DialogHeader>
                        <DialogTitle>
                          {editingId ? "Edit Announcement" : "Create Announcement"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingId ?
                            "Update the announcement details below" :
                            "Create a new announcement for your branch"}
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
                              } />
                            
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
                              className={`h-20 resize-none overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`} />
                            
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !formData.expires_at && "text-muted-foreground",
                                      theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'
                                    )}>
                                    
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.expires_at ? format(new Date(formData.expires_at), "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.expires_at ? new Date(formData.expires_at) : undefined}
                                    onSelect={(date) =>
                                    setFormData({ ...formData, expires_at: date ? format(date, "yyyy-MM-dd") : "" })
                                    }
                                    initialFocus />
                                  
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted flex items-start gap-2">
                          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            This announcement will be visible to your branch only
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Target Roles *</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {roles.map((role) => {
                              const isSelected = formData.target_roles?.includes(role) || false;
                              return (
                                <button
                                  key={role}
                                  type="button"
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
                                  className={`flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                                    isSelected
                                      ? theme === 'dark'
                                        ? 'bg-primary/20 border-primary text-primary-foreground shadow-sm'
                                        : 'bg-primary/10 border-primary text-primary shadow-sm'
                                      : theme === 'dark'
                                        ? 'bg-card border-border hover:bg-accent text-muted-foreground'
                                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  <span className="capitalize">{role}</span>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                          <Button
                              variant="outline"
                              onClick={() => setShowCreateDialog(false)}>
                              
                            Cancel
                          </Button>
                          <Button
                              onClick={handleCreateOrUpdate}
                              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 transition-all duration-200">
                              
                            {editingId ? "Update" : "Create"} Announcement
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
              }
              myAnnouncements={myAnnouncements}
              receivedAnnouncements={receivedAnnouncements}
              onEdit={handleEdit}
              onDelete={(id) => setDeletingId(id)}
              onToggleActive={handleToggleActive}
              onMarkRead={handleMarkRead}
              loading={loading}
              showActions={true}
              myPagination={{ count: totalMyCount, page: myPage, pageSize }}
              receivedPagination={{
                count: totalReceivedCount,
                page: receivedPage,
                pageSize,
                unreadCount: unreadReceivedCount
              }}
              onPageChange={handlePageChange}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              showExpired={showArchive}
              setShowExpired={setShowArchive}
            />
          }
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
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>);

};

export default HODAnnouncementManagement;