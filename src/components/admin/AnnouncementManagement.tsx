import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Plus, Calendar as CalendarIcon, Check, AlertTriangle, MapPin, ExternalLink, CheckCircle, FileText, UploadCloud, Paperclip, File, Trash, Download, Megaphone } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { PLAN_TIERS } from "@/utils/planGating";
import { translateTerminology, getInstitutionType } from "@/utils/institutionConfig";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  fetchAnnouncements,
  fetchCirculars,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  markAnnouncementRead,
  Announcement,
  CreateAnnouncementRequest
} from "@/utils/announcements_api";
import { uploadFileViaBackendProxy } from "@/utils/common_api";
import { manageBranches } from "@/utils/admin_api";
import { fetchIncidents, resolveIncident } from "@/utils/transport_api";
import AnnouncementSections from "@/components/common/AnnouncementSections";
import { useHMSContext } from "@/context/HMSContext";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const AdminAnnouncementManagement = () => {
  // Announcements State & Pagination
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<Announcement[]>([]);
  const [myPage, setMyPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [totalMyCount, setTotalMyCount] = useState(0);
  const [totalReceivedCount, setTotalReceivedCount] = useState(0);
  const [unreadReceivedCount, setUnreadReceivedCount] = useState(0);

  // Circulars State & Pagination & Category Filter
  const [myCirculars, setMyCirculars] = useState<Announcement[]>([]);
  const [receivedCirculars, setReceivedCirculars] = useState<Announcement[]>([]);
  const [circularMyPage, setCircularMyPage] = useState(1);
  const [circularReceivedPage, setCircularReceivedPage] = useState(1);
  const [circularCategory, setCircularCategory] = useState<string>('all');
  const [totalMyCircularCount, setTotalMyCircularCount] = useState(0);
  const [totalReceivedCircularCount, setTotalReceivedCircularCount] = useState(0);
  const [unreadReceivedCircularCount, setUnreadReceivedCircularCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const parsedUser = userStr ? JSON.parse(userStr) : null;
  const superadminRole = localStorage.getItem("superadmin_role");
  
  const user = parsedUser || (superadminRole ? { role: superadminRole } : null);

  const [mainSection, setMainSection] = useState<'announcements' | 'circulars'>('announcements');

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam === 'received' || tabParam === 'my') return tabParam;
    }
    return user?.role === 'counsellor' ? "received" : "my";
  });

  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('stalightcampus_set_announcement_tab', handleSetTab);
    return () => window.removeEventListener('stalightcampus_set_announcement_tab', handleSetTab);
  }, []);
  const [showArchive, setShowArchive] = useState(false);
  const pageSize = 10;

  const { theme } = useTheme();
  const { hostels, fetchHostelsOnly } = useHMSContext();

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
    priority: "normal",
    is_circular: false,
    circular_number: "",
    circular_category: "vtu",
    file_url: null,
    file_name: null,
    file_size: null
  });
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>("all");
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      MySwal.fire("File Too Large", "Please select a file smaller than 25MB.", "warning");
      return;
    }

    setUploadingFile(true);
    try {
      const url = await uploadFileViaBackendProxy(file);
      if (url) {
        setFormData(prev => ({
          ...prev,
          file_url: url,
          file_name: file.name,
          file_size: file.size
        }));
      } else {
        MySwal.fire("Upload Failed", "Failed to upload document. Please try again.", "error");
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      MySwal.fire("Upload Failed", err.message || "Failed to upload file", "error");
    } finally {
      setUploadingFile(false);
      // Reset input value so same file can be re-uploaded if needed
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (!showCreateDialog) return;
    const loadBranches = async () => {
      try {
        const response = await manageBranches({ page: 1, pageSize: 100 });
        if (response.success && response.data?.results) {
          setBranches(response.data.results.map((b: any) => ({ id: b.id, name: b.name })));
        }
      } catch (error) {
        console.error("Failed to load branches:", error);
      }
    };
    loadBranches();
  }, [showCreateDialog]);

  useEffect(() => {
    if (isHMSUser && hostels.length === 0) {
      fetchHostelsOnly();
    }
  }, [isHMSUser, hostels.length, fetchHostelsOnly]);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAnnouncements({
        is_circular: false,
        myPage,
        pageSize,
        receivedPage,
        includeInactive: showArchive,
        includeExpired: showArchive
      });

      if (response.success && response.data) {
        const myData = response.data.my_announcements;
        const receivedData = response.data.received_announcements;

        setMyAnnouncements(myData.results || []);
        setTotalMyCount(myData.count || 0);

        setReceivedAnnouncements(receivedData.results || []);
        setTotalReceivedCount(receivedData.count || 0);
        setUnreadReceivedCount(receivedData.unread_count || 0);
      } else {
        setError(response.message || "Failed to load announcements");
      }
    } catch (err: any) {
      console.error("Error loading announcements:", err);
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const loadCirculars = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCirculars({
        myPage: circularMyPage,
        pageSize,
        receivedPage: circularReceivedPage,
        circular_category: circularCategory,
        includeInactive: showArchive,
        includeExpired: showArchive
      });

      if (response.success && response.data) {
        const myData = response.data.my_announcements;
        const receivedData = response.data.received_announcements;

        setMyCirculars(myData.results || []);
        setTotalMyCircularCount(myData.count || 0);

        setReceivedCirculars(receivedData.results || []);
        setTotalReceivedCircularCount(receivedData.count || 0);
        setUnreadReceivedCircularCount(receivedData.unread_count || 0);
      } else {
        setError(response.message || "Failed to load circulars");
      }
    } catch (err: any) {
      console.error("Error loading circulars:", err);
      setError(err.message || "Failed to load circulars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mainSection === 'announcements') {
      loadAnnouncements();
    } else {
      loadCirculars();
    }
  }, [mainSection, myPage, receivedPage, circularMyPage, circularReceivedPage, circularCategory, showArchive]);

  useEffect(() => {
    const handleRefresh = () => {
      if (mainSection === 'announcements') {
        loadAnnouncements();
      } else {
        loadCirculars();
      }
    };
    window.addEventListener('refresh-announcements', handleRefresh);
    return () => window.removeEventListener('refresh-announcements', handleRefresh);
  }, [mainSection, myPage, receivedPage, circularMyPage, circularReceivedPage, circularCategory, showArchive]);

  // Load emergencies for transport_admin
  useEffect(() => {
    if (user?.role === 'transport_admin') {
      fetchIncidents({ is_emergency: true, status: 'open' }).then(res => {
        if (res.success && res.data?.results) {
          setEmergencies(res.data.results);
        }
      }).catch(err => {
        console.error("Failed to fetch emergencies:", err);
      });
    }
  }, [user?.role]);

  const handlePageChange = (page: number, type: 'my' | 'received') => {
    if (mainSection === 'announcements') {
      if (type === 'my') {
        setMyPage(page);
      } else {
        setReceivedPage(page);
      }
    } else {
      if (type === 'my') {
        setCircularMyPage(page);
      } else {
        setCircularReceivedPage(page);
      }
    }
  };

  const handleCategoryChange = (category: string) => {
    setCircularCategory(category);
    setCircularMyPage(1);
    setCircularReceivedPage(1);
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return "Title is required";
    }
    if (!formData.message.trim()) {
      return "Message is required";
    }
    if (formData.target_roles.length === 0) {
      return "Please select at least one target role";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      MySwal.fire({
        title: "Validation Error",
        text: validationError,
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
      return;
    }

    // Role-based validation
    if (user?.role === "dean" && !formData.branch) {
      MySwal.fire({
        title: "Validation Error",
        text: "Please select a branch",
        icon: "warning",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
      return;
    }

    if (user?.role === "counsellor") {
      MySwal.fire({
        title: "Permission Denied",
        text: "Counsellors cannot create announcements",
        icon: "error",
        confirmButtonColor: "#9147e0",
        target: document.body
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const response = await updateAnnouncement(editingId, formData);
        if (response.success) {
          MySwal.fire({
            title: "Success",
            text: "Announcement updated successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
          setShowCreateDialog(false);
          resetForm();
          loadAnnouncements();
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
          MySwal.fire({
            title: "Success",
            text: "Announcement created successfully",
            icon: "success",
            confirmButtonColor: "#9147e0",
            target: document.body
          });
          setShowCreateDialog(false);
          resetForm();
          loadAnnouncements();
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
      priority: announcement.priority,
      is_circular: announcement.is_circular || false,
      circular_number: announcement.circular_number || "",
      circular_category: announcement.circular_category || "vtu",
      file_url: announcement.file_url || null,
      file_name: announcement.file_name || null,
      file_size: announcement.file_size || null
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

  const resetForm = (forCircular?: boolean) => {
    const isCirc = forCircular !== undefined ? forCircular : mainSection === 'circulars';
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      target_roles: [],
      is_global: true,
      branch: null,
      expires_at: "",
      priority: "normal",
      is_circular: isCirc,
      circular_number: "",
      circular_category: "vtu",
      file_url: null,
      file_name: null,
      file_size: null
    });
    setSelectedHostelId("all");
  };

  const [submitting, setSubmitting] = useState(false);

  const ALL_ROLES = ["student", "hod", "faculty", "principal", "placement_officer", "org_admin", "dean", "coe", "fees_manager", "hms_admin", "transport_admin", "library_admin", "admission_manager", "counsellor", "driver", "warden"];
  const BASIC_ROLES = ["student", "hod", "faculty", "principal", "org_admin", "dean", "driver", "warden"];

  const getTargetRolesForUser = (userRole: string) => {
    switch (userRole) {
      case "superadmin":
      case "developer":
        return ["developer"];
      case "principal":
      case "org_admin":
      case "admin":
      case "dean":
        return ALL_ROLES;
      case "coe":
        return ["student", "faculty", "hod", "principal"];
      case "fees_manager":
        return ["student", "hod"];
      case "hms":
      case "hms_admin":
      case "warden":
        return ["student", "warden"];
      case "transport_admin":
        return ["student", "driver"];
      case "admission_manager":
        return ["counsellor"];
      default:
        return ["student", "hod", "faculty", "principal", "placement_officer", "warden"];
    }
  };

  const baseRoles = getTargetRolesForUser(user?.role);
  const rawRoles = (userTier >= 2 ? baseRoles : baseRoles.filter(r => BASIC_ROLES.includes(r))).filter(r => r !== user?.role);
  const roles = getInstitutionType() === 'school' ? rawRoles.filter(r => r !== "placement_officer") : rawRoles;

  const isCircularPage = mainSection === 'circulars';
  const isDisallowedCircularCreator = ['hms_admin', 'warden', 'transport_admin'].includes(user?.role);
  const canCreate = isCircularPage 
    ? (!isDisallowedCircularCreator && user?.role !== 'counsellor')
    : user?.role !== 'counsellor';
  const nonCircularCount = totalMyCount;
  const circularCount = totalMyCircularCount;

  const currentMyList = isCircularPage ? myCirculars : myAnnouncements;
  const currentReceivedList = isCircularPage ? receivedCirculars : receivedAnnouncements;
  const currentMyPagination = isCircularPage
    ? { count: totalMyCircularCount, page: circularMyPage, pageSize }
    : { count: totalMyCount, page: myPage, pageSize };
  const currentReceivedPagination = isCircularPage
    ? { count: totalReceivedCircularCount, page: circularReceivedPage, pageSize, unreadCount: unreadReceivedCircularCount }
    : { count: totalReceivedCount + emergencies.length, page: receivedPage, pageSize, unreadCount: unreadReceivedCount + emergencies.length };

  const renderHeader = (
    <CardHeader id="announcement-header-section" className="announcements-card-header border-b pb-4 flex flex-col gap-4">
      {/* Top Row: Title & Subtitle + Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="min-w-0">
          <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Announcement Management</CardTitle>
          <p className={`text-sm sm:text-md mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Create and manage system announcements</p>
        </div>

        {/* Action Button: New Announcement OR Issue Circular */}
        <div className="announce-actions w-full sm:w-auto">
          {canCreate && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => resetForm(isCircularPage)}
                  className={`gap-2 w-full sm:w-auto ${theme === 'dark' ? 'text-white bg-primary hover:bg-[#9147e0] border-border' : 'text-white bg-primary hover:bg-[#9147e0] border-primary'}`}>
                  <Plus className="w-4 h-4" />
                  {isCircularPage ? "Issue / Upload Circular" : "New Announcement"}
                </Button>
              </DialogTrigger>
              <DialogContent
                onPointerDownOutside={(e) => e.preventDefault()}
                className="mobile-modal max-w-xl max-h-[80vh] overflow-y-auto custom-scrollbar [&>button]:border-none [&>button]:outline-none [&>button]:focus:ring-0">

                <DialogHeader>
                  <DialogTitle>
                    {editingId
                      ? isCircularPage ? "Edit Official Circular" : "Edit Announcement"
                      : isCircularPage ? "Issue / Upload Official Circular" : "Create Announcement"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? "Update the details below"
                      : isCircularPage
                        ? "Dispatch an official university or institutional circular, notification, or order"
                        : "Create a new announcement visible to selected roles"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="title">{isCircularPage ? "Circular Subject / Title" : "Title"} <span className="text-red-500">*</span></Label>
                      <span className={`text-[10px] ${formData.title.length >= 150 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        {formData.title.length}/150
                      </span>
                    </div>
                    <Input
                      id="title"
                      placeholder={isCircularPage ? "e.g. Circular regarding revised examination dates / academic calendar" : "Announcement title"}
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
                      placeholder={isCircularPage ? "Circular description / summary details" : "Announcement message / overview"}
                    maxLength={1000}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={6}
                    className="resize-none max-h-24 overflow-auto custom-scrollbar" />

                </div>

                {/* OFFICIAL CIRCULAR / VTU NOTIFICATION FIELDS (Only shown in Circulars section / mode) */}
                {(isCircularPage || formData.is_circular) && (
                  <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Official Circular Details &amp; Document Attachment
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">Official Dispatch</span>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-primary/15 animate-in fade-in-50 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="circular_number" className="text-xs font-medium">
                            Circular Reference Number
                          </Label>
                          <Input
                            id="circular_number"
                            placeholder="e.g. VTU/BGM/Aca/2026/042"
                            value={formData.circular_number || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, circular_number: e.target.value })
                            }
                            className="text-xs h-9 bg-background font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="circular_category" className="text-xs font-medium">
                            Category / Issuer
                          </Label>
                          <Select
                            value={formData.circular_category || "vtu"}
                            onValueChange={(val) =>
                              setFormData({ ...formData, circular_category: val })
                            }
                          >
                            <SelectTrigger className="text-xs h-9 bg-background">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                              <SelectItem value="vtu" className="text-xs">VTU Circular</SelectItem>
                              <SelectItem value="university" className="text-xs">University Notification</SelectItem>
                              <SelectItem value="exam" className="text-xs">Examination / COE</SelectItem>
                              <SelectItem value="academic" className="text-xs">Academic Calendar</SelectItem>
                              <SelectItem value="govt" className="text-xs">Government / AICTE</SelectItem>
                              <SelectItem value="internal" className="text-xs">Internal / Office Order</SelectItem>
                              <SelectItem value="general" className="text-xs">General Circular</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* PDF / Document Attachment */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center justify-between">
                          <span>Attached Circular Document (PDF / Word)</span>
                          {formData.file_url && <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Attached</span>}
                        </Label>

                        {formData.file_url ? (
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{formData.file_name || 'Circular_Document.pdf'}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formData.file_size ? `${(formData.file_size / (1024 * 1024)).toFixed(2)} MB` : 'PDF Document'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={formData.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 px-2 text-xs inline-flex items-center gap-1 rounded border border-border text-primary hover:bg-muted font-medium"
                              >
                                <ExternalLink className="w-3 h-3" /> View
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData({ ...formData, file_url: null, file_name: null, file_size: null })}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Remove File"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center justify-center border-2 border-dashed border-primary/30 hover:border-primary/60 bg-background/50 hover:bg-background/80 transition-colors rounded-lg p-4 cursor-pointer text-center ${uploadingFile ? 'opacity-60 pointer-events-none' : ''}`}>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              className="hidden"
                              disabled={uploadingFile}
                              onChange={handleFileUpload}
                            />
                            {uploadingFile ? (
                              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                <Loader2 className="w-4 h-4 animate-spin" /> Uploading circular document to cloud...
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <UploadCloud className="w-6 h-6 mx-auto text-primary" />
                                <p className="text-xs font-semibold text-foreground">Click to upload or drag &amp; drop PDF</p>
                                <p className="text-[10px] text-muted-foreground">PDF, DOC, DOCX up to 25MB</p>
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                          <span className="capitalize">{translateTerminology(role.replace('_', ' '))}</span>
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
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`w-full sm:w-auto ${theme === 'dark' ? 'text-white bg-primary hover:bg-[#9147e0] border-border' : 'text-white bg-primary hover:bg-[#9147e0] border-primary'}`}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />
                        {editingId ? "Updating..." : isCircularPage ? "Publishing Circular..." : "Creating..."}
                      </>
                    ) : (
                      <>{editingId ? "Update" : isCircularPage ? "Issue / Publish" : "Create"} {isCircularPage ? "Circular" : "Announcement"}</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>

    {/* Top Segmented Navigation Switcher (like Staff Task Tracker) */}
    <div className="flex space-x-1 p-1 rounded-xl bg-muted border border-border overflow-x-auto w-full sm:w-auto self-start mt-2">
      <button
        onClick={() => {
          setMainSection('announcements');
          setActiveTab('my');
        }}
        className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          mainSection === 'announcements'
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
      >
        <Megaphone className="w-4 h-4" />
        <span>Announcements</span>
        {nonCircularCount > 0 && (
          <Badge className={`text-[10px] h-4 px-1.5 border-none ${mainSection === 'announcements' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
            {nonCircularCount}
          </Badge>
        )}
      </button>
      <button
        onClick={() => {
          setMainSection('circulars');
          setActiveTab(isDisallowedCircularCreator ? 'received' : 'my');
        }}
        className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          mainSection === 'circulars'
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Circulars</span>
        {circularCount > 0 && !isDisallowedCircularCreator && (
          <Badge className={`text-[10px] h-4 px-1.5 border-none ${mainSection === 'circulars' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'}`}>
            {circularCount}
          </Badge>
        )}
      </button>
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

      <div className={`text-sm sm:text-base w-full max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
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
              myAnnouncements={currentMyList}
              receivedAnnouncements={isCircularPage ? currentReceivedList : [
                ...currentReceivedList,
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
              myPagination={currentMyPagination}
              receivedPagination={currentReceivedPagination}
              onPageChange={handlePageChange}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              showExpired={showArchive}
              setShowExpired={setShowArchive}
              hideReceivedTab={false}
              hideMyTab={user?.role === 'counsellor' || (isCircularPage && isDisallowedCircularCreator)}
              showActions={user?.role !== 'counsellor' && !(isCircularPage && isDisallowedCircularCreator)}
              sectionMode={mainSection}
              circularCategory={circularCategory}
              onCircularCategoryChange={handleCategoryChange}
            />
          )}
        </Card>
      </div>



    </>
  );
};

export default AdminAnnouncementManagement;