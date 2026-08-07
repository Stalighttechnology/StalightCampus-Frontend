import { useEffect, useState } from "react";
import { getInstitutionType, translateTerminology } from "@/utils/institutionConfig";
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
import { Loader2, Plus, Calendar as CalendarIcon, Check, AlertTriangle } from "lucide-react";
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
import { getAssignedSubjectsGrouped, getProctorStudents } from "@/utils/faculty_api";

const FacultyAnnouncementManagement = () => {
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { theme } = useTheme();
  const [proctorCount, setProctorCount] = useState<number | null>(null);

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
  const [assignedSections, setAssignedSections] = useState<any[]>([]);
  const pageSize = 10;

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await getAssignedSubjectsGrouped();
        if (res.success && res.data) {
          const sectionsList: any[] = [];
          const seen = new Set();
          res.data.forEach((item: any) => {
            const key = `${item.branch_id}-${item.semester_id}-${item.section_id}`;
            if (!seen.has(key)) {
              seen.add(key);
              const semPrefix = getInstitutionType() === 'school' ? 'Class' : 'Sem';
              sectionsList.push({
                section_id: item.section_id,
                section_name: item.section,
                semester: item.semester,
                branch: item.branch,
                label: `${item.branch} - ${semPrefix} ${item.semester} (Sec ${item.section})`
              });
            }
          });
          setAssignedSections(sectionsList);
        }
      } catch (err) {
        console.error("Failed to load assigned subjects/sections", err);
      }

      try {
        const proctorRes = await getProctorStudents({ page: 1, page_size: 1 });
        if (proctorRes.success && proctorRes.data) {
          const total = proctorRes.pagination?.total ?? proctorRes.count ?? proctorRes.data.length;
          setProctorCount(total);
        } else {
          setProctorCount(0);
        }
      } catch (err) {
        console.error("Failed to load proctor students count", err);
        setProctorCount(0);
      }
    };
    fetchAssigned();
  }, []);

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

    if (!formData.section && proctorCount === 0) {
      MySwal.fire({
        title: "No Proctor Students Assigned",
        text: "You do not have any assigned proctor students. You cannot send an announcement to proctor students.",
        icon: "error",
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
      section: announcement.section || null,
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
    } else {
      const result = await MySwal.fire({
        title: "Activate Announcement?",
        text: "Are you sure you want to activate this announcement? It will become visible to students.",
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

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      target_roles: ["student"],
      is_global: false,
      section: null,
      expires_at: "",
      priority: "normal"
    });
  };

  const roles = ["student", "hod", "principal", "placement_officer"];

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .announcements-card { border-radius: 8px; }
          .announcements-card-header { padding: 12px; }
          .announcements-card-title { text-xl; line-height: 1.3; }
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
                <CardHeader className="announcements-card-header px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
                    <div className="flex-1 min-w-0">
                      <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        Announcements for Students
                      </CardTitle>
                      <p className={`text-sm sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Create and manage announcements for your Students
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
                              placeholder="Type your announcement message here..."
                              maxLength={1000}
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
                          <Label htmlFor="target-audience">Target Audience</Label>
                          <Select
                            value={formData.section ? String(formData.section) : "proctor"}
                            onValueChange={(val) => {
                              if (val === "proctor") {
                                setFormData({ ...formData, section: null });
                              } else {
                                setFormData({ ...formData, section: Number(val) });
                              }
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select target audience" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto custom-scrollbar">
                              <SelectItem value="proctor">My Proctor Students</SelectItem>
                              {assignedSections.map((sec) => (
                                <SelectItem key={`${sec.branch}-${sec.semester}-${sec.section_id}`} value={String(sec.section_id)}>
                                  {sec.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {!formData.section && proctorCount === 0 ? (
                          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="text-xs sm:text-sm">
                                <p className="font-semibold">No Proctor Students Assigned</p>
                                <p className="mt-0.5 opacity-90">
                                  You do not have any proctor students assigned to your account. Announcements targeted to "My Proctor Students" cannot be sent until students are assigned to you by your HOD.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">
                              ℹ️ {formData.section 
                                ? `This announcement will be targeted to students in the selected class/section.`
                                : `This announcement will be visible to your proctor students only.${proctorCount !== null && proctorCount > 0 ? ` (${proctorCount} student${proctorCount === 1 ? '' : 's'})` : ''}`}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-3 justify-end pt-4">
                          <Button
                              variant="outline"
                              onClick={() => setShowCreateDialog(false)}>
                              
                            Cancel
                          </Button>
                          <Button
                              onClick={handleCreateOrUpdate}
                              disabled={submitting || (!formData.section && proctorCount === 0)}
                              className="bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
                              
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