import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/ThemeContext";
import { uploadFileViaBackendProxy } from "@/utils/common_api";
import { format, isValid } from "date-fns";
import {
  Building2,
  Calendar,
  Clock,
  Users,
  Tv,
  Volume2,
  ListChecks,
  Shirt,
  Accessibility,
  DoorClosed,
  HeartPulse,
  ShieldCheck,
  Zap,
  Wifi,
  Droplets,
  Radio,
  Wind,
  Plus,
  Search,
  CheckCircle2,
  Check,
  Loader2,
  ExternalLink,
  ImageIcon,
  Trash2,
  UploadCloud,
  XCircle,
  AlertTriangle,
  Wrench,
  Eye,
  SlidersHorizontal,
  Pencil,
} from "lucide-react";
import {
  Auditorium,
  AuditoriumBooking,
  AUDITORIUM_FACILITIES,
  getAuditoriums,
  createAuditorium,
  updateAuditorium,
  deleteAuditorium,
  getAuditoriumBookings,
  actionAuditoriumBooking,
} from "@/utils/auditorium_api";

// Helper: Convert "HH:MM" (or "HH:MM:SS") to 12-hour formatted string "hh:mm AM/PM"
const format12Hour = (time24?: string): string => {
  if (!time24) return "--:--";
  const parts = time24.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${m} ${period}`;
};

// Helper: Format YYYY-MM-DD to DD-MM-YYYY
const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "dd-MM-yyyy");
  } catch {
    return dateStr;
  }
};

export const AuditoriumManagement: React.FC = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"auditoriums" | "bookings">("auditoriums");

  // ================= AUDITORIUM REGISTRY STATE ================= //
  const [auditoriums, setAuditoriums] = useState<Auditorium[]>([]);
  const [loadingAuditoriums, setLoadingAuditoriums] = useState(false);
  const [auditoriumSearch, setAuditoriumSearch] = useState("");
  const [debouncedAuditoriumSearch, setDebouncedAuditoriumSearch] = useState("");
  const [auditoriumStatusFilter, setAuditoriumStatusFilter] = useState("all");
  const [auditoriumPage, setAuditoriumPage] = useState(1);
  const [totalAuditoriumPages, setTotalAuditoriumPages] = useState(1);
  const [totalAuditoriumsCount, setTotalAuditoriumsCount] = useState(0);
  const [expandedFacilities, setExpandedFacilities] = useState<Record<number, boolean>>({});

  const toggleExpandFacilities = (id: number) => {
    setExpandedFacilities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Debounce search state (350ms) to prevent network spam on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAuditoriumSearch(auditoriumSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [auditoriumSearch]);

  // Dialog state: Add/Edit Auditorium
  const [isAuditoriumModalOpen, setIsAuditoriumModalOpen] = useState(false);
  const [editingAuditorium, setEditingAuditorium] = useState<Auditorium | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    max_capacity: 100,
    has_ac: true,
    has_sound_system: true,
    has_projector: true,
    has_stage_lighting: true,
    has_drinking_water: true,
    has_restrooms: true,
    has_live_streaming: false,
    has_security_cctv: true,
    has_first_aid: true,
    has_wifi: true,
    has_power_backup: true,
    has_podium_mic: true,
    has_green_room: true,
    has_wheelchair_access: true,
    has_parking: true,
    images: [] as string[],
    other_facilities: "",
    status: "available" as "available" | "maintenance" | "inactive",
    maintenance_notes: "",
  });
  const [submittingAuditorium, setSubmittingAuditorium] = useState(false);

  // ================= BOOKING REQUESTS STATE ================= //
  const [bookings, setBookings] = useState<AuditoriumBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("PENDING");
  const [bookingSearch, setBookingSearch] = useState("");
  const [debouncedBookingSearch, setDebouncedBookingSearch] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [totalBookingPages, setTotalBookingPages] = useState(1);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);

  // Debounce booking search state (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBookingSearch(bookingSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [bookingSearch]);

  // Dialog state: Action on booking
  const [selectedBooking, setSelectedBooking] = useState<AuditoriumBooking | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Details dialog
  const [viewingBooking, setViewingBooking] = useState<AuditoriumBooking | null>(null);

  // Request sequence tracking to discard stale out-of-order network responses
  const auditoriumReqSeq = useRef(0);
  const bookingReqSeq = useRef(0);

  // ================= DATA FETCHING ================= //

  const fetchAuditoriumsList = useCallback(async () => {
    const seq = ++auditoriumReqSeq.current;
    setLoadingAuditoriums(true);
    try {
      const response = await getAuditoriums({
        search: debouncedAuditoriumSearch,
        status: auditoriumStatusFilter,
        page: auditoriumPage,
        page_size: 10,
      });

      if (seq !== auditoriumReqSeq.current) return;

      if ("results" in response) {
        setAuditoriums(response.results);
        setTotalAuditoriumPages(response.total_pages || 1);
        setTotalAuditoriumsCount(response.count || 0);
      } else if (response.data) {
        setAuditoriums(response.data);
      }
    } catch (err: any) {
      if (seq !== auditoriumReqSeq.current) return;
      toast({
        variant: "destructive",
        title: "Error fetching auditoriums",
        description: err.message || "Failed to load auditoriums list.",
      });
    } finally {
      if (seq === auditoriumReqSeq.current) {
        setLoadingAuditoriums(false);
      }
    }
  }, [debouncedAuditoriumSearch, auditoriumStatusFilter, auditoriumPage, toast]);

  const fetchBookingsList = useCallback(async () => {
    const seq = ++bookingReqSeq.current;
    setLoadingBookings(true);
    try {
      const response = await getAuditoriumBookings({
        status: bookingStatusFilter,
        search: debouncedBookingSearch,
        page: bookingPage,
        page_size: 10,
      });

      if (seq !== bookingReqSeq.current) return;

      setBookings(response.results);
      setTotalBookingPages(response.total_pages || 1);
      setTotalBookingsCount(response.count || 0);
    } catch (err: any) {
      if (seq !== bookingReqSeq.current) return;
      toast({
        variant: "destructive",
        title: "Error fetching bookings",
        description: err.message || "Failed to load booking requests.",
      });
    } finally {
      if (seq === bookingReqSeq.current) {
        setLoadingBookings(false);
      }
    }
  }, [bookingStatusFilter, debouncedBookingSearch, bookingPage, toast]);

  // Decoupled effect for Auditoriums tab
  useEffect(() => {
    if (activeTab === "auditoriums") {
      fetchAuditoriumsList();
    }
  }, [activeTab, fetchAuditoriumsList]);

  // Decoupled effect for Bookings tab
  useEffect(() => {
    if (activeTab === "bookings") {
      fetchBookingsList();
    }
  }, [activeTab, fetchBookingsList]);

  // ================= AUDITORIUM HANDLERS ================= //

  const handleOpenCreateModal = () => {
    setEditingAuditorium(null);
    setFormData({
      name: "",
      location: "",
      max_capacity: 100,
      has_ac: true,
      has_sound_system: true,
      has_projector: true,
      has_stage_lighting: true,
      has_drinking_water: true,
      has_restrooms: true,
      has_live_streaming: false,
      has_security_cctv: true,
      has_first_aid: true,
      has_wifi: true,
      has_power_backup: true,
      has_podium_mic: true,
      has_green_room: true,
      has_wheelchair_access: true,
      has_parking: true,
      images: [],
      other_facilities: "",
      status: "available",
      maintenance_notes: "",
    });
    setIsAuditoriumModalOpen(true);
  };

  const handleOpenEditModal = (auditorium: Auditorium) => {
    setEditingAuditorium(auditorium);
    setFormData({
      name: auditorium.name,
      location: auditorium.location,
      max_capacity: auditorium.max_capacity,
      has_ac: auditorium.has_ac,
      has_sound_system: auditorium.has_sound_system,
      has_projector: auditorium.has_projector,
      has_stage_lighting: auditorium.has_stage_lighting,
      has_drinking_water: auditorium.has_drinking_water,
      has_restrooms: auditorium.has_restrooms,
      has_live_streaming: auditorium.has_live_streaming,
      has_security_cctv: auditorium.has_security_cctv,
      has_first_aid: auditorium.has_first_aid,
      has_wifi: auditorium.has_wifi,
      has_power_backup: auditorium.has_power_backup,
      has_podium_mic: auditorium.has_podium_mic,
      has_green_room: auditorium.has_green_room,
      has_wheelchair_access: auditorium.has_wheelchair_access,
      has_parking: auditorium.has_parking,
      images: auditorium.images || [],
      other_facilities: auditorium.other_facilities || "",
      status: auditorium.status,
      maintenance_notes: auditorium.maintenance_notes || "",
    });
    setIsAuditoriumModalOpen(true);
  };

  const handleSaveAuditorium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide both auditorium name and location.",
      });
      return;
    }

    if (formData.max_capacity <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Maximum seating capacity must be at least 1.",
      });
      return;
    }

    setSubmittingAuditorium(true);
    try {
      if (editingAuditorium) {
        await updateAuditorium(editingAuditorium.id, formData);
        toast({
          title: "Auditorium Updated",
          description: `Successfully updated '${formData.name}'.`,
        });
      } else {
        await createAuditorium(formData);
        toast({
          title: "Auditorium Added",
          description: `Successfully created '${formData.name}'.`,
        });
      }
      setIsAuditoriumModalOpen(false);
      fetchAuditoriumsList();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Failed to save auditorium.",
      });
    } finally {
      setSubmittingAuditorium(false);
    }
  };


  // Image upload handling for Cloudflare R2 (Max 4 images, max 2MB each)
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - formData.images.length;
    if (remainingSlots <= 0) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "Maximum 4 images allowed per auditorium.",
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({
        title: "File Limit Notice",
        description: `Only ${remainingSlots} more image(s) can be added (Maximum 4 images total).`,
      });
    }

    // Validation: 2MB per file and image MIME type
    for (const file of filesToUpload) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `'${file.name}' exceeds the 2MB size limit. Please upload images under 2MB.`,
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid File Format",
          description: `'${file.name}' is not an image. Please choose JPG, PNG, or WebP.`,
        });
        return;
      }
    }

    setUploadingImages(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const url = await uploadFileViaBackendProxy(file, "auditoriums");
        if (url) {
          uploadedUrls.push(url);
        } else {
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Could not upload '${file.name}'. Please check network and retry.`,
          });
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls].slice(0, 4),
        }));
        toast({
          title: "Images Uploaded",
          description: `Uploaded ${uploadedUrls.length} image(s) to Cloudflare R2 storage.`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: err.message || "Failed to upload image.",
      });
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleDeleteAuditorium = async (auditorium: Auditorium) => {
    if (!window.confirm(`Are you sure you want to remove or deactivate '${auditorium.name}'?`)) {
      return;
    }

    try {
      const res = await deleteAuditorium(auditorium.id);
      toast({
        title: "Success",
        description: res.message || "Auditorium processed successfully.",
      });
      fetchAuditoriumsList();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: err.message || "Failed to delete auditorium.",
      });
    }
  };

  // ================= BOOKING ACTION HANDLERS ================= //

  const handleOpenActionModal = (booking: AuditoriumBooking, type: "APPROVE" | "REJECT") => {
    setSelectedBooking(booking);
    setActionType(type);
    setActionRemarks("");
  };

  const handleExecuteAction = async () => {
    if (!selectedBooking || !actionType) return;

    if (actionType === "REJECT" && !actionRemarks.trim()) {
      toast({
        variant: "destructive",
        title: "Remarks Required",
        description: "Please provide a reason or remarks for rejecting this booking.",
      });
      return;
    }

    setSubmittingAction(true);
    try {
      await actionAuditoriumBooking(selectedBooking.id, actionType, actionRemarks.trim());
      toast({
        title: actionType === "APPROVE" ? "Booking Approved" : "Booking Rejected",
        description: `Booking request for '${selectedBooking.event_name}' has been ${actionType === "APPROVE" ? "approved" : "rejected"}.`,
      });
      setSelectedBooking(null);
      setActionType(null);
      fetchBookingsList();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || `Failed to ${actionType.toLowerCase()} booking.`,
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const hasConflictWarning = (booking: AuditoriumBooking): boolean => {
    if (booking.status !== "PENDING") return false;
    return bookings.some(
      (b) =>
        b.id !== booking.id &&
        b.auditorium === booking.auditorium &&
        b.booking_date === booking.booking_date &&
        b.status === "APPROVED" &&
        b.start_time < booking.end_time &&
        b.end_time > booking.start_time
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .auditorium-mobile-row { 
            display: flex !important; 
            flex-direction: column !important; 
            gap: 8px !important; 
            width: 100% !important; 
          }
          .auditorium-mobile-row > button { 
            width: 100% !important; 
            min-height: 38px !important;
            height: auto !important;
            padding: 8px 12px !important;
            white-space: normal !important;
            text-align: center !important;
            justify-content: center !important;
          }
        }
      `}</style>

      <div className={`w-full text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "auditoriums" | "bookings")}
          className="w-full flex flex-col"
        >
          <Card
            id="auditorium-management-card"
            className={
              theme === 'dark'
                ? 'auditorium-card w-full bg-card border border-border flex flex-col min-h-[620px] shadow-sm rounded-xl'
                : 'auditorium-card w-full bg-white border border-gray-200 flex flex-col min-h-[620px] shadow-sm rounded-xl'
            }
          >
            {/* Header Section */}
            <div id="auditorium-management-header-section" className="flex flex-col">
              <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                <div className="w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <CardTitle className="text-xl sm:text-2xl font-semibold">Auditorium Management</CardTitle>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                        theme === 'dark'
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      Total: {activeTab === "auditoriums" ? totalAuditoriumsCount : totalBookingsCount}
                    </span>
                  </div>
                  <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-0.5">
                    Configure campus halls, facilities, and review department booking requests.
                  </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-2 w-full sm:w-auto auditorium-mobile-row">
                  {activeTab === "auditoriums" && (
                    <Button
                      size="sm"
                      className="flex items-center justify-center gap-1.5 w-full sm:w-auto text-xs sm:text-sm font-medium whitespace-nowrap"
                      onClick={handleOpenCreateModal}
                      disabled={loadingAuditoriums}
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add Auditorium</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Subheader Toolbar: Tabs + Search + Status Filter */}
              <div className="px-3 sm:px-5 py-3 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <TabsList className="grid grid-cols-2 w-full md:w-[340px] h-9 p-1 bg-muted/60 rounded-lg">
                  <TabsTrigger
                    value="auditoriums"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Auditoriums ({totalAuditoriumsCount})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="bookings"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Approvals ({totalBookingsCount})</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-1 md:flex-initial flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-72">
                    <Input
                      placeholder={
                        activeTab === "auditoriums"
                          ? "Search auditorium name or location..."
                          : "Search by event, auditorium, or HOD..."
                      }
                      value={activeTab === "auditoriums" ? auditoriumSearch : bookingSearch}
                      onChange={(e) => {
                        if (activeTab === "auditoriums") {
                          setAuditoriumSearch(e.target.value);
                          setAuditoriumPage(1);
                        } else {
                          setBookingSearch(e.target.value);
                          setBookingPage(1);
                        }
                      }}
                      className={
                        theme === 'dark'
                          ? 'w-full bg-card text-foreground py-1 pr-12 text-xs sm:text-sm h-9'
                          : 'w-full bg-white text-gray-900 py-1 pr-12 text-xs sm:text-sm h-9'
                      }
                    />
                    {(activeTab === "auditoriums" ? auditoriumSearch : bookingSearch) && (
                      <button
                        onClick={() => {
                          if (activeTab === "auditoriums") {
                            setAuditoriumSearch("");
                            setAuditoriumPage(1);
                          } else {
                            setBookingSearch("");
                            setBookingPage(1);
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {activeTab === "auditoriums" ? (
                    <Select
                      value={auditoriumStatusFilter}
                      onValueChange={(val) => {
                        setAuditoriumStatusFilter(val);
                        setAuditoriumPage(1);
                      }}
                    >
                      <SelectTrigger className={`w-36 sm:w-44 h-9 text-xs sm:text-sm rounded-md ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
                        <SelectValue placeholder="Status Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="maintenance">Under Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={bookingStatusFilter}
                      onValueChange={(val) => {
                        setBookingStatusFilter(val);
                        setBookingPage(1);
                      }}
                    >
                      <SelectTrigger className={`w-36 sm:w-44 h-9 text-xs sm:text-sm rounded-md ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
                        <SelectValue placeholder="Booking Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending Review</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
              <TabsContent value="auditoriums" className="flex-1 flex flex-col mt-0 space-y-4">
                {loadingAuditoriums ? (
                  <SkeletonTable rows={6} cols={4} />
                ) : auditoriums.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold">No Auditoriums Found</h3>
                    <p className="text-xs text-muted-foreground mt-1">Add your campus halls to allow department bookings.</p>
                    <Button onClick={handleOpenCreateModal} className="gap-2 mt-3 h-9 text-xs rounded-lg">
                      <Plus className="h-4 w-4" /> Add First Auditorium
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-2">
                    {auditoriums.map((item) => {
                      const activeFacilities = AUDITORIUM_FACILITIES.filter((f) => item[f.hasKey]);
                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col justify-between rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${
                            theme === 'dark'
                              ? 'bg-card/90 border-border hover:border-primary/50 text-foreground'
                              : 'bg-white border-gray-200 hover:border-primary/40 text-gray-900'
                          }`}
                        >
                          {/* Photo Cover Banner */}
                          <div className="relative h-40 sm:h-44 w-full bg-muted/40 border-b overflow-hidden">
                            {item.images && item.images.length > 0 ? (
                              <>
                                <img
                                  src={item.images[0]}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                                />
                                <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  {item.images.length} {item.images.length === 1 ? "photo" : "photos"}
                                </span>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 bg-gradient-to-br from-muted/30 to-muted/70">
                                <Building2 className="h-10 w-10 mb-1 opacity-40 text-primary" />
                                <span className="text-[11px] font-medium">No photos uploaded</span>
                              </div>
                            )}
                          </div>

                          <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="text-base font-bold text-foreground">{item.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.location}</p>
                                </div>
                                <Badge
                                  variant={
                                    item.status === "available"
                                      ? "default"
                                      : item.status === "maintenance"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                  className={
                                    item.status === "available"
                                      ? "bg-emerald-600 text-white text-[10px]"
                                      : item.status === "maintenance"
                                      ? "bg-amber-600 text-white text-[10px]"
                                      : "text-[10px]"
                                  }
                                >
                                  {item.status === "available"
                                    ? "Available"
                                    : item.status === "maintenance"
                                    ? "Maintenance"
                                    : "Inactive"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 text-xs">
                                <Users className="h-4 w-4 text-primary shrink-0" />
                                <span className="font-semibold text-foreground">Capacity:</span>
                                <span>{item.max_capacity} Seats</span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span className="font-semibold uppercase tracking-wide">Facilities</span>
                                  <span>{activeFacilities.length} active</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-0.5 items-center">
                                  {(expandedFacilities[item.id] ? activeFacilities : activeFacilities.slice(0, 6)).map((f) => (
                                    <Badge
                                      key={f.id}
                                      variant="outline"
                                      className="text-[10px] font-normal py-0.5 px-2 bg-background border-primary/20 text-foreground flex items-center gap-1 shadow-2xs"
                                    >
                                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                      <span>{f.shortLabel}</span>
                                    </Badge>
                                  ))}

                                  {!expandedFacilities[item.id] && activeFacilities.length > 6 && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="text-[10px] font-semibold py-0.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-md cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                                          title="Click to view all facilities"
                                        >
                                          <span>+{activeFacilities.length - 6} more</span>
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className={
                                          theme === 'dark'
                                            ? 'w-72 sm:w-80 p-3 shadow-xl rounded-xl z-50 bg-card border border-border text-foreground'
                                            : 'w-72 sm:w-80 p-3 shadow-xl rounded-xl z-50 bg-white border border-gray-200 text-gray-900'
                                        }
                                        align="start"
                                        sideOffset={6}
                                      >
                                        <div className="space-y-2.5">
                                          <div className="flex items-center justify-between border-b pb-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <ListChecks className="h-3.5 w-3.5 text-primary" />
                                              <span className="text-xs font-bold text-foreground">Additional Facilities</span>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                              +{activeFacilities.length - 6} more
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1 pt-0.5">
                                            {activeFacilities.slice(6).map((f) => (
                                              <Badge
                                                key={f.id}
                                                variant="outline"
                                                className="text-[10px] font-normal py-0.5 px-2 bg-background border-primary/20 text-foreground flex items-center gap-1 shadow-2xs"
                                              >
                                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                                <span>{f.label}</span>
                                              </Badge>
                                            ))}
                                          </div>
                                          <div className="pt-2 border-t flex justify-end">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 text-[11px] text-primary px-2 font-medium"
                                              onClick={() => toggleExpandFacilities(item.id)}
                                            >
                                              Show all on card
                                            </Button>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}

                                  {expandedFacilities[item.id] && activeFacilities.length > 6 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandFacilities(item.id)}
                                      className="text-[10px] font-semibold py-0.5 px-2 bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded-md cursor-pointer transition-colors shadow-2xs"
                                    >
                                      Show less
                                    </button>
                                  )}

                                  {activeFacilities.length === 0 && (
                                    <span className="text-[11px] text-muted-foreground italic">No facilities added</span>
                                  )}
                                </div>
                              </div>

                              {item.other_facilities && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  <span className="font-semibold text-foreground">Amenities:</span> {item.other_facilities}
                                </p>
                              )}

                              {item.status === "maintenance" && item.maintenance_notes && (
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                                  <Wrench className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span>{item.maintenance_notes}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 mt-2 border-t flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground font-medium">
                                {item.active_bookings_count || 0} active booking(s)
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs font-medium gap-1.5"
                                  onClick={() => handleOpenEditModal(item)}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 h-8 text-xs font-medium gap-1.5"
                                  onClick={() => handleDeleteAuditorium(item)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookings" className="flex-1 flex flex-col mt-0 space-y-4">
                {loadingBookings ? (
                  <SkeletonTable rows={6} cols={6} />
                ) : bookings.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                    <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No booking requests found.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Try changing your search or status filter.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto border rounded-xl mb-2 relative shadow-2xs">
                      <table className="w-full text-base md:text-sm text-left table-auto border-collapse">
                        <thead
                          className={`sticky top-0 z-20 border-b text-sm md:text-xs uppercase font-bold tracking-wider ${
                            theme === 'dark' ? 'bg-slate-900/95 text-slate-300 border-border' : 'bg-slate-50/95 text-slate-700 border-gray-200'
                          } shadow-sm backdrop-blur-md`}
                        >
                          <tr>
                            <th className="py-3.5 px-4 font-bold">Event & Purpose</th>
                            <th className="py-3.5 px-4 font-bold">Auditorium</th>
                            <th className="py-3.5 px-4 font-bold">Department / HOD</th>
                            <th className="py-3.5 px-4 font-bold">Date (DD-MM-YYYY)</th>
                            <th className="py-3.5 px-4 font-bold">12-Hr Slot</th>
                            <th className="py-3.5 px-4 font-bold">Attendees</th>
                            <th className="py-3.5 px-4 font-bold">Status & Conflict</th>
                            <th className="py-3.5 px-4 text-right font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {bookings.map((booking) => {
                            const hasConflict = hasConflictWarning(booking);
                            return (
                              <tr
                                key={booking.id}
                                className={`transition-colors duration-200 ${
                                  theme === 'dark' ? 'hover:bg-accent/70 text-foreground' : 'hover:bg-blue-50/40 text-gray-900'
                                }`}
                              >
                                <td className="py-3.5 px-4 align-middle">
                                  <span className="font-semibold text-foreground text-sm block">{booking.event_name}</span>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{booking.event_purpose}</p>
                                </td>
                                <td className="py-3.5 px-4 align-middle">
                                  <span className="font-medium text-foreground text-sm block">{booking.auditorium_name}</span>
                                  <p className="text-xs text-muted-foreground">{booking.auditorium_location}</p>
                                </td>
                                <td className="py-3.5 px-4 align-middle">
                                  <span className="font-medium text-sm text-foreground block">{booking.requester_name}</span>
                                  <p className="text-xs text-muted-foreground">{booking.branch_name || "General"}</p>
                                </td>
                                <td className="py-3.5 px-4 align-middle">
                                  <span className="font-mono text-xs sm:text-sm font-medium">
                                    {formatDateDisplay(booking.booking_date)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 align-middle">
                                  <span className="font-mono text-xs font-semibold text-primary">
                                    {format12Hour(booking.start_time)} &ndash; {format12Hour(booking.end_time)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 align-middle">
                                  <span className="font-medium text-sm">{booking.expected_attendees}</span>
                                  <span className="text-xs text-muted-foreground"> / {booking.auditorium_max_capacity || "—"}</span>
                                </td>
                                <td className="py-3.5 px-4 align-middle">
                                  <div className="space-y-1">
                                    <Badge
                                      variant={
                                        booking.status === "APPROVED"
                                          ? "default"
                                          : booking.status === "PENDING"
                                          ? "secondary"
                                          : "destructive"
                                      }
                                      className={
                                        booking.status === "APPROVED"
                                          ? "bg-emerald-600 text-white text-xs"
                                          : booking.status === "PENDING"
                                          ? "bg-amber-600 text-white text-xs"
                                          : "text-xs"
                                      }
                                    >
                                      {booking.status}
                                    </Badge>
                                    {hasConflict && (
                                      <div className="flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                                        <AlertTriangle className="h-3 w-3 shrink-0" />
                                        Slot Clash!
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right align-middle">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="View Details"
                                      onClick={() => setViewingBooking(booking)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {booking.status === "PENDING" && (
                                      <>
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs gap-1"
                                          onClick={() => handleOpenActionModal(booking, "APPROVE")}
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-8 text-xs gap-1"
                                          onClick={() => handleOpenActionModal(booking, "REJECT")}
                                        >
                                          <XCircle className="h-3.5 w-3.5" /> Reject
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden flex-1 overflow-y-auto mb-2 pr-1">
                      {bookings.map((booking) => {
                        const hasConflict = hasConflictWarning(booking);
                        return (
                          <div
                            key={booking.id}
                            className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm ${
                              theme === 'dark' ? 'bg-zinc-950/40 border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-sm text-foreground">{booking.event_name}</span>
                                <p className="text-xs text-muted-foreground line-clamp-1">{booking.event_purpose}</p>
                              </div>
                              <Badge
                                variant={
                                  booking.status === "APPROVED"
                                    ? "default"
                                    : booking.status === "PENDING"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={
                                  booking.status === "APPROVED"
                                    ? "bg-emerald-600 text-white text-[10px]"
                                    : booking.status === "PENDING"
                                    ? "bg-amber-600 text-white text-[10px]"
                                    : "text-[10px]"
                                }
                              >
                                {booking.status}
                              </Badge>
                            </div>

                            {hasConflict && (
                              <div className="p-2 rounded bg-destructive/10 text-destructive text-xs flex items-center gap-1.5 font-medium">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>Slot conflict with already approved event!</span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                              <div>
                                <span className="text-muted-foreground">Auditorium:</span>
                                <p className="font-medium truncate">{booking.auditorium_name}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Department / HOD:</span>
                                <p className="font-medium truncate">{booking.branch_name || booking.requester_name}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date:</span>
                                <p className="font-medium font-mono">{formatDateDisplay(booking.booking_date)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">12-Hr Slot:</span>
                                <p className="font-medium font-mono text-[11px] text-primary">
                                  {format12Hour(booking.start_time)} - {format12Hour(booking.end_time)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t text-xs">
                              <span className="text-muted-foreground">
                                {booking.expected_attendees} Attendees
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setViewingBooking(booking)}>
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Details
                                </Button>
                                {booking.status === "PENDING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                                      onClick={() => handleOpenActionModal(booking, "APPROVE")}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 text-xs"
                                      onClick={() => handleOpenActionModal(booking, "REJECT")}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>
            </CardContent>

            {/* Card Footer: Pagination */}
            {((activeTab === "auditoriums" ? totalAuditoriumPages : totalBookingPages) > 1) && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  Showing {activeTab === "auditoriums"
                    ? `${(auditoriumPage - 1) * 9 + 1} to ${Math.min(auditoriumPage * 9, totalAuditoriumsCount)} of ${totalAuditoriumsCount}`
                    : `${(bookingPage - 1) * 10 + 1} to ${Math.min(bookingPage * 10, totalBookingsCount)} of ${totalBookingsCount}`
                  } results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeTab === "auditoriums") setAuditoriumPage((p) => Math.max(1, p - 1));
                      else setBookingPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={(activeTab === "auditoriums" ? auditoriumPage === 1 : bookingPage === 1) || (activeTab === "auditoriums" ? loadingAuditoriums : loadingBookings)}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {activeTab === "auditoriums" ? auditoriumPage : bookingPage}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeTab === "auditoriums") setAuditoriumPage((p) => Math.min(totalAuditoriumPages, p + 1));
                      else setBookingPage((p) => Math.min(totalBookingPages, p + 1));
                    }}
                    disabled={(activeTab === "auditoriums" ? auditoriumPage === totalAuditoriumPages : bookingPage === totalBookingPages) || (activeTab === "auditoriums" ? loadingAuditoriums : loadingBookings)}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </Tabs>
      </div>

      {/* ================= MODAL: ADD / EDIT AUDITORIUM ================= */}
      <Dialog open={isAuditoriumModalOpen} onOpenChange={setIsAuditoriumModalOpen}>
        <DialogContent
          className={
            theme === 'dark'
              ? 'bg-card text-foreground w-[90%] sm:max-w-xl max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6'
              : 'bg-white text-gray-900 w-[90%] sm:max-w-xl max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6'
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              {editingAuditorium ? "Edit Auditorium" : "Add New Auditorium"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Specify auditorium details, seating capacity, and available stage & audiovisual facilities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAuditorium} className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="auditorium_name" className="text-xs font-semibold">Auditorium Name *</Label>
                <Input
                  id="auditorium_name"
                  placeholder="e.g. Main Auditorium / APJ Abdul Kalam Hall"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auditorium_location" className="text-xs font-semibold">Location *</Label>
                <Input
                  id="auditorium_location"
                  placeholder="e.g. Block A, 3rd Floor"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max_capacity" className="text-xs font-semibold">Max Seating Capacity *</Label>
                <Input
                  id="max_capacity"
                  type="number"
                  min={1}
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value, 10) || 0 })}
                  className="h-10 text-xs sm:text-sm rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Categorized Available Facilities Selector */}
            <div className="space-y-3 border rounded-xl p-3.5 bg-muted/10">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Auditorium Facilities & Amenities
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Toggle all facilities present and maintained in this auditorium.
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {AUDITORIUM_FACILITIES.filter((f) => formData[f.hasKey as keyof typeof formData]).length} / {AUDITORIUM_FACILITIES.length} Enabled
                </Badge>
              </div>

              {/* Category 1: Audio-Visual & Staging */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="h-3 w-3" /> Audio-Visual & Stage
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUDITORIUM_FACILITIES.filter((f) => f.category === 'av').map((f) => {
                    const isChecked = !!formData[f.hasKey as keyof typeof formData];
                    return (
                      <label
                        key={f.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/5 border-primary/40 text-foreground"
                            : "bg-background border-border/60 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setFormData({ ...formData, [f.hasKey]: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-medium leading-tight text-foreground">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Utilities & Campus Essentials */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <Droplets className="h-3 w-3" /> Utilities & Essentials
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUDITORIUM_FACILITIES.filter((f) => f.category === 'essential').map((f) => {
                    const isChecked = !!formData[f.hasKey as keyof typeof formData];
                    return (
                      <label
                        key={f.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-foreground"
                            : "bg-background border-border/60 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setFormData({ ...formData, [f.hasKey]: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-medium leading-tight text-foreground">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Category 3: Safety, Comfort & Accessibility */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Safety, Comfort & Accessibility
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUDITORIUM_FACILITIES.filter((f) => f.category === 'safety_comfort').map((f) => {
                    const isChecked = !!formData[f.hasKey as keyof typeof formData];
                    return (
                      <label
                        key={f.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-foreground"
                            : "bg-background border-border/60 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setFormData({ ...formData, [f.hasKey]: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-medium leading-tight text-foreground">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Auditorium Photos Section (Cloudflare R2, Max 4 images, <= 2MB each) */}
            <div className="space-y-2.5 border rounded-xl p-3.5 bg-muted/10">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    <span>Auditorium Photos ({formData.images.length}/4)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Upload up to 4 images (Max 2MB per photo). Saved securely to Cloudflare R2.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono whitespace-nowrap shrink-0 px-2 py-0.5 self-start sm:self-center">
                  Max 2MB each
                </Badge>
              </div>

              {/* Uploaded Thumbnails Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border aspect-video bg-muted/40 shadow-2xs">
                    <img src={imgUrl} alt={`Auditorium ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-700"
                      title="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 4 && (
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2 aspect-video cursor-pointer transition-colors ${
                    uploadingImages
                      ? "opacity-50 pointer-events-none bg-muted"
                      : "border-primary/30 hover:border-primary hover:bg-primary/5 bg-background"
                  }`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploadingImages}
                      className="hidden"
                    />
                    {uploadingImages ? (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground text-[11px]">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground text-center">
                        <UploadCloud className="h-4 w-4 text-primary" />
                        <span className="text-[11px] font-medium text-foreground">Add Photo</span>
                        <span className="text-[9px] text-muted-foreground">&lt; 2MB</span>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="other_facilities" className="text-xs font-semibold">Other Facilities & Amenities</Label>
              <Textarea
                id="other_facilities"
                placeholder="e.g. VIP lounge, Green room, Podium, Wi-Fi access..."
                value={formData.other_facilities}
                onChange={(e) => setFormData({ ...formData, other_facilities: e.target.value })}
                rows={2}
                className="text-xs sm:text-sm rounded-lg resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="auditorium_status" className="text-xs font-semibold">Auditorium Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="auditorium_status" className="h-10 text-xs sm:text-sm rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available for Bookings</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === "maintenance" && (
                <div className="space-y-1.5">
                  <Label htmlFor="maintenance_notes" className="text-xs font-semibold">Maintenance Notes</Label>
                  <Input
                    id="maintenance_notes"
                    placeholder="e.g. Stage lighting repair until 10th"
                    value={formData.maintenance_notes}
                    onChange={(e) => setFormData({ ...formData, maintenance_notes: e.target.value })}
                    className="h-10 text-xs sm:text-sm rounded-lg"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAuditoriumModalOpen(false)} className="rounded-lg h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAuditorium} className="rounded-lg h-9 text-xs">
                {submittingAuditorium ? "Saving..." : editingAuditorium ? "Update Auditorium" : "Create Auditorium"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: APPROVE / REJECT ACTION ================= */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent
          className={
            theme === 'dark'
              ? 'bg-card text-foreground w-[90%] sm:max-w-md max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6'
              : 'bg-white text-gray-900 w-[90%] sm:max-w-md max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6'
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {actionType === "APPROVE" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Approve Booking Request
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Reject Booking Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {actionType === "APPROVE"
                ? `Confirm approval for '${selectedBooking?.event_name}' by ${selectedBooking?.requester_name}.`
                : `Specify reason for rejecting booking request for '${selectedBooking?.event_name}'.`}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-3 py-2 text-xs sm:text-sm">
              <div className="bg-muted/40 p-3 rounded-lg space-y-1 text-xs">
                <p>
                  <span className="font-semibold">Venue:</span> {selectedBooking.auditorium_name}
                </p>
                <p>
                  <span className="font-semibold">Date & 12-Hr Time:</span> {formatDateDisplay(selectedBooking.booking_date)} (
                  {format12Hour(selectedBooking.start_time)} &ndash; {format12Hour(selectedBooking.end_time)})
                </p>
                <p>
                  <span className="font-semibold">Attendees:</span> {selectedBooking.expected_attendees} Expected
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="action_remarks" className="text-xs font-semibold">
                  {actionType === "APPROVE" ? "Admin Remarks (Optional)" : "Reason for Rejection *"}
                </Label>
                <Textarea
                  id="action_remarks"
                  placeholder={
                    actionType === "APPROVE"
                      ? "e.g. Keys can be collected from admin office..."
                      : "e.g. Schedule clash with college annual sports day..."
                  }
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  rows={3}
                  className="rounded-lg resize-none text-xs sm:text-sm"
                  required={actionType === "REJECT"}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelectedBooking(null)} disabled={submittingAction} className="rounded-lg h-9 text-xs">
              Cancel
            </Button>
            <Button
              variant={actionType === "APPROVE" ? "default" : "destructive"}
              className={actionType === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700 rounded-lg h-9 text-xs" : "rounded-lg h-9 text-xs"}
              onClick={handleExecuteAction}
              disabled={submittingAction}
            >
              {submittingAction
                ? "Processing..."
                : actionType === "APPROVE"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: VIEW DETAILS ================= */}
      <Dialog open={!!viewingBooking} onOpenChange={(open) => !open && setViewingBooking(null)}>
        <DialogContent
          className={
            theme === 'dark'
              ? 'bg-card text-foreground w-[90%] sm:max-w-md max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6'
              : 'bg-white text-gray-900 w-[90%] sm:max-w-md max-h-[80vh] sm:max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6'
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="h-5 w-5 text-primary" />
              Booking Request Details
            </DialogTitle>
          </DialogHeader>

          {viewingBooking && (
            <div className="space-y-3 py-1 text-xs sm:text-sm">
              <div className="border-b pb-2">
                <h4 className="font-bold text-foreground text-sm sm:text-base">{viewingBooking.event_name}</h4>
                <p className="text-muted-foreground">{viewingBooking.event_purpose}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg">
                <div>
                  <span className="text-[11px] text-muted-foreground">Auditorium</span>
                  <p className="font-medium">{viewingBooking.auditorium_name}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Department / HOD</span>
                  <p className="font-medium">{viewingBooking.branch_name || viewingBooking.requester_name}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Date (DD-MM-YYYY)</span>
                  <p className="font-medium font-mono">{formatDateDisplay(viewingBooking.booking_date)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">12-Hour Slot</span>
                  <p className="font-medium font-mono text-primary">
                    {format12Hour(viewingBooking.start_time)} &ndash; {format12Hour(viewingBooking.end_time)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Attendees</span>
                  <p className="font-medium">{viewingBooking.expected_attendees} Expected</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Status</span>
                  <p className="font-semibold text-primary">{viewingBooking.status}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Facilities Requested</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {AUDITORIUM_FACILITIES.map((f) => {
                    const isRequested = !!viewingBooking[f.needKey as keyof AuditoriumBooking];
                    if (!isRequested) return null;
                    return (
                      <Badge
                        key={f.id}
                        variant="secondary"
                        className="text-xs flex items-center gap-1 bg-primary/10 text-primary border border-primary/20"
                      >
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>{f.label}</span>
                      </Badge>
                    );
                  })}
                  {!AUDITORIUM_FACILITIES.some((f) => viewingBooking[f.needKey as keyof AuditoriumBooking]) && (
                    <span className="text-xs text-muted-foreground italic">Standard venue facilities only</span>
                  )}
                </div>
              </div>

              {viewingBooking.reason_and_requirements && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Additional Notes</span>
                  <p className="p-2 bg-muted/20 rounded border mt-1 text-xs">
                    {viewingBooking.reason_and_requirements}
                  </p>
                </div>
              )}

              {viewingBooking.admin_remarks && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Admin Remarks</span>
                  <p className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 text-amber-900 dark:text-amber-200 mt-1 text-xs">
                    {viewingBooking.admin_remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingBooking(null)} className="rounded-lg h-9 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuditoriumManagement;
