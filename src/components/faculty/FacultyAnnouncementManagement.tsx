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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { Loader2, Plus, Calendar as CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
"@/components/ui/popover";
import { useTheme } from "@/context/ThemeContext";
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
import { SkeletonList } from "@/components/ui/skeleton";

const FacultyAnnouncementManagement = () => {
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    message: "",
    target_roles: ["student"],
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

    try {
      setSubmitting(true);
      // Faculty announcements are branch-specific
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      target_roles: announcement.target_roles || ["student"],
      is_global: false,
      branch: announcement.branch,
      expires_at: announcement.expires_at?.split("T")[0] || "",
      priority: announcement.priority
    });
    setShowCreateDialog(true);
  };

  const handleDeleteClick = async (announcementId: number) => {
    const result = await MySwal.fire({
      title: "Delete Announcement?",
      text: "Are you sure you want to delete this announcement? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      target: document.body
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteAnnouncement(announcementId);
        if (response.success) {
          setMyAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
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
        text: "Are you sure you want to deactivate this announcement? It will no longer be visible to students.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, deactivate it!",
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

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      target_roles: ["student"],
      is_global: false,
      expires_at: "",
      priority: "normal"
    });
  };

  const roles = ["student", "faculty", "hod", "principal", "placement_officer"];

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

      <div className="announcements-container w-full max-w-none mx-auto">
        <Card id="faculty-announcement-card" className={`announcements-card ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          {/* Error State */}
          {error &&
            <CardContent className="p-4 sm:p-6">
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
            }

          {/* Announcement Sections */}
          {!error &&
            <AnnouncementSections
              header={
                <CardHeader className="announcements-card-header px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
                    <div className="flex-1 min-w-0">
                      <CardTitle className={`tracking-tight text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        Announcements for Proctor Students
                      </CardTitle>
                      <p className={`text-[14px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Create and manage announcements for your proctor group
                      </p>
                    </div>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => resetForm()}
                          className="gap-2 bg-primary text-white hover:bg-primary/90 transition-colors w-full sm:w-auto">
                          
                          <Plus className="w-4 h-4" />
                          New Announcement
                        </Button>
                      </DialogTrigger>
                      <DialogContent
                        onPointerDownOutside={(e) => e.preventDefault()}
                        onInteractOutside={(e) => e.preventDefault()}
                        className="mobile-modal max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        
                      <DialogHeader className="pr-8 text-left">
                        <DialogTitle className={`text-lg sm:text-2xl font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {editingId ?
                            "Edit Announcement" :
                            "Send Announcement"}
                        </DialogTitle>
                        <DialogDescription className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {editingId ?
                            "Update the announcement details below" :
                            "Create a new announcement that will be sent to your proctor students"}
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
                              placeholder="Type your announcement message here..."
                              value={formData.message}
                              onChange={(e) =>
                              setFormData({ ...formData, message: e.target.value })
                              }
                              className="resize-none h-20 overflow-y-auto focus-visible:ring-primary/20 custom-scrollbar" />
                            
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value: any) =>
                                setFormData({ ...formData, priority: value })
                                }>
                                
                              <SelectTrigger className="h-10">
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
                            <Label htmlFor="expires_at" className="block text-sm font-medium mt-1">Expires At</Label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal h-10 px-3",
                                      !formData.expires_at && "text-muted-foreground",
                                      theme === 'dark' ?
                                      'bg-background border-border text-foreground hover:bg-muted/50' :
                                      'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                    )}>
                                    
                                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                                  <span className="truncate">
                                    {formData.expires_at ?
                                      format(new Date(formData.expires_at), "PPP") :

                                      "Pick a date"
                                      }
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.expires_at ? new Date(formData.expires_at) : undefined}
                                    onSelect={(date) => {
                                      setFormData({
                                        ...formData,
                                        expires_at: date ? format(date, "yyyy-MM-dd") : ""
                                      });
                                      setIsCalendarOpen(false);
                                    }}
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    initialFocus />
                                  
                              </PopoverContent>
                            </Popover>
                          </div>
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
                                  <span className="capitalize">{role.replace('_', ' ')}</span>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </button>
                              );
                            })}
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
                              onClick={() => setShowCreateDialog(false)}>
                              
                            Cancel
                          </Button>
                          <Button
                              onClick={handleCreateOrUpdate}
                              disabled={submitting}
                              className="bg-primary text-white hover:bg-primary/90 transition-colors">
                              
                            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {editingId ? "Update" : "Create"} Announcement
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                </CardHeader>
              }
              myAnnouncements={myAnnouncements}
              receivedAnnouncements={receivedAnnouncements}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
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
            />}
        </Card>
    </div>
    </>);

};

export default FacultyAnnouncementManagement;