import React, { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { API_BASE_URL, API_ENDPOINT } from "../../utils/config";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Upload, 
  Image as ImageIcon, 
  Eye, 
  X, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Check,
  Crop,
  ZoomIn,
  ZoomOut,
  Laptop
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import { AppVersionControlCard } from "./AppVersionControlCard";

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

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const resolveMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return `${API_BASE_URL}/${url}`;
};

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas blob is null"));
          return;
        }
        const file = new File([blob], "popup-banner.jpg", { type: "image/jpeg" });
        resolve(file);
      },
      "image/jpeg",
      0.92
    );
  });
};

const AVAILABLE_ROLES = [
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
  { id: "parent", label: "Parent" },
];

const Popups = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletePopupId, setDeletePopupId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileSizeText, setImageFileSizeText] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Cropper State using react-easy-crop
  const [showCropper, setShowCropper] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Live Preview Modal State (Full-screen overlay)
  const [previewPopup, setPreviewPopup] = useState<Partial<Popup> | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

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
      toast({
        title: "Error",
        description: "Failed to load popups list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Validate and prime file for upload / crop
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, WebP, GIF).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "File Exceeds 2MB Limit",
        description: `Selected image is ${sizeMB} MB. Please choose an image smaller than 2 MB.`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setOriginalFile(file);
    setImageFile(file);
    setRemoveImage(false);

    const sizeKB = Math.round(file.size / 1024);
    setImageFileSizeText(sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Prepare cropper
    setCropSourceUrl(previewUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspect(undefined); // default to free/full

    toast({
      title: "Image Uploaded",
      description: `${file.name} ready. You can use full image or adjust crop.`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setOriginalFile(null);
    setImagePreview(null);
    setCropSourceUrl(null);
    setImageFileSizeText(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormData((prev) => ({ ...prev, image: null }));
  };

  const openCropperModal = () => {
    const src = imagePreview || resolveMediaUrl(formData.image);
    if (src) {
      setCropSourceUrl(src);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspect(undefined);
      setShowCropper(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleApplyCrop = async () => {
    if (!cropSourceUrl || !croppedAreaPixels) {
      setShowCropper(false);
      return;
    }

    try {
      const croppedFile = await getCroppedImg(cropSourceUrl, croppedAreaPixels);

      if (croppedFile.size > MAX_IMAGE_SIZE_BYTES) {
        toast({
          title: "Image Too Large",
          description: "Cropped image exceeds 2MB limit. Please adjust crop or select another image.",
          variant: "destructive",
        });
        return;
      }

      setImageFile(croppedFile);
      const newPreview = URL.createObjectURL(croppedFile);
      setImagePreview(newPreview);

      const sizeKB = Math.round(croppedFile.size / 1024);
      setImageFileSizeText(sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`);

      setShowCropper(false);
      toast({
        title: "Crop Applied",
        description: `Image adjusted successfully (${(croppedFile.size / (1024 * 1024)).toFixed(2)} MB).`,
      });
    } catch (err) {
      console.error("Cropping failed:", err);
      toast({
        title: "Crop Error",
        description: "Failed to apply crop. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUseFullImage = () => {
    if (originalFile) {
      setImageFile(originalFile);
      setImagePreview(URL.createObjectURL(originalFile));
    }
    setShowCropper(false);
    toast({
      title: "Full Image Preserved",
      description: "Full uncropped image will be displayed.",
    });
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
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
    setImageFile(null);
    setOriginalFile(null);
    setImagePreview(null);
    setCropSourceUrl(null);
    setImageFileSizeText(null);
    setRemoveImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
  };

  const handleEdit = (popup: Popup) => {
    setFormData({ ...popup });
    setIsEditing(true);
    setImageFile(null);
    setOriginalFile(null);
    setRemoveImage(false);
    setImageFileSizeText(null);
    const resolved = resolveMediaUrl(popup.image);
    setImagePreview(resolved);
    setCropSourceUrl(resolved);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Popup title is required.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.message?.trim()) {
      toast({
        title: "Validation Error",
        description: "Popup message is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const url = isEditing && formData.id
        ? `${API_ENDPOINT}/admin/popups/${formData.id}/`
        : `${API_ENDPOINT}/admin/popups/`;
      const method = isEditing ? "PATCH" : "POST";

      const bodyData = new FormData();
      bodyData.append("title", formData.title.trim());
      bodyData.append("message", formData.message.trim());
      bodyData.append("popup_type", formData.popup_type || "feature");
      bodyData.append("button_text", formData.button_text?.trim() || "");
      bodyData.append("action", formData.action?.trim() || "");
      bodyData.append("enabled", String(formData.enabled ?? true));
      bodyData.append("version", String(formData.version ?? 1));
      bodyData.append("priority", String(formData.priority ?? 0));

      if (formData.organization !== null && formData.organization !== undefined && formData.organization !== ("" as any)) {
        bodyData.append("organization", String(formData.organization));
      } else {
        bodyData.append("organization", "");
      }

      bodyData.append("target_roles", JSON.stringify(formData.target_roles || []));

      if (imageFile) {
        bodyData.append("image", imageFile);
      } else if (removeImage) {
        bodyData.append("remove_image", "true");
      }

      const res = await fetchWithSuperadminTokenRefresh(url, {
        method,
        body: bodyData,
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Popup ${isEditing ? "updated" : "created"} successfully!`,
        });
        setShowForm(false);
        setIsEditing(false);
        setImageFile(null);
        setOriginalFile(null);
        setImagePreview(null);
        setImageFileSizeText(null);
        setRemoveImage(false);
        notifyPopupChange();
        fetchPopups();
      } else {
        const errorData = await res.json().catch(() => null);
        const errMsg = errorData?.image?.[0] || errorData?.detail || "Failed to save popup.";
        toast({
          title: "Error",
          description: errMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save error", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the popup.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const notifyPopupChange = () => {
    window.dispatchEvent(new CustomEvent('popup_refresh'));
    try {
      localStorage.setItem('stalight_popup_updated_at', String(Date.now()));
    } catch (e) {}
  };

  const confirmDeletePopup = async () => {
    if (!deletePopupId) return;

    try {
      setDeleting(true);
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/admin/popups/${deletePopupId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ title: "Deleted", description: "Popup deleted successfully." });
        setDeletePopupId(null);
        notifyPopupChange();
        fetchPopups();
      } else {
        toast({ title: "Error", description: "Failed to delete popup.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Delete error", error);
      toast({ title: "Error", description: "Network error during deletion.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const incrementVersion = async (popup: Popup) => {
    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/admin/popups/${popup.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: popup.version + 1 }),
      });
      if (res.ok) {
        toast({
          title: "Success",
          description: `Version bumped to v${popup.version + 1}. Users will see this popup again.`,
        });
        notifyPopupChange();
        fetchPopups();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to increment version.", variant: "destructive" });
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
        toast({
          title: popup.enabled ? "Popup Disabled" : "Popup Enabled",
          description: `"${popup.title}" is now ${!popup.enabled ? "active" : "inactive"}.`,
        });
        notifyPopupChange();
        fetchPopups();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const getPopupTypeBadge = (type?: string) => {
    switch (type) {
      case "feature":
        return {
          label: "Feature Spotlight",
          gradient: "from-indigo-600 to-purple-600",
          text: "text-indigo-600 dark:text-indigo-400",
          bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/50",
          glow: "shadow-indigo-500/25",
        };
      case "offer":
        return {
          label: "Promotional Offer",
          gradient: "from-amber-500 to-orange-600",
          text: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/50",
          glow: "shadow-amber-500/25",
        };
      case "maintenance":
        return {
          label: "Maintenance Notice",
          gradient: "from-red-600 to-rose-600",
          text: "text-rose-600 dark:text-rose-400",
          bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/50",
          glow: "shadow-rose-500/25",
        };
      case "update":
        return {
          label: "Update Prompt",
          gradient: "from-blue-600 to-cyan-600",
          text: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/50",
          glow: "shadow-blue-500/25",
        };
      default:
        return {
          label: "Notice",
          gradient: "from-primary to-primary",
          text: "text-primary",
          bg: "bg-primary/10 border-primary/20",
          glow: "shadow-primary/25",
        };
    }
  };

  const handleSelectAllRoles = () => {
    setFormData((prev) => ({
      ...prev,
      target_roles: AVAILABLE_ROLES.map((r) => r.id),
    }));
  };

  const handleClearAllRoles = () => {
    setFormData((prev) => ({
      ...prev,
      target_roles: [],
    }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading popups & announcements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!showForm && <AppVersionControlCard />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            In-App Popups
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage global feature spotlights, offers, and notices.
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            {popups.length > 0 && (
              <Button
                variant="outline"
                className="gap-2 font-medium"
                onClick={() => {
                  const active = popups.find((p) => p.enabled) || popups[0];
                  setPreviewPopup(active);
                }}
              >
                <Eye size={16} className="text-primary" /> Preview Active
              </Button>
            )}
            <Button onClick={handleOpenCreate} className="gap-2 shadow-sm font-semibold">
              <Plus size={16} /> Create New Popup
            </Button>
          </div>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-border/80 shadow-md transition-all">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-bold">
                  {isEditing ? "Edit Popup" : "Create New Popup"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure visual banner image, audience targeting, actions, and priority.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                  onClick={() => {
                    setPreviewPopup({
                      ...formData,
                      image: imagePreview || formData.image || null,
                    });
                  }}
                >
                  <Eye size={14} className="text-primary" />
                  Live Preview
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Top Grid: Title, Type, Priority, Org */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="font-semibold text-sm">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="E.g., Stalight APP Announcement"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Popup Type</Label>
                <Select
                  value={formData.popup_type || "feature"}
                  onValueChange={(val) => setFormData({ ...formData, popup_type: val })}
                >
                  <SelectTrigger className="h-10">
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

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Priority</Label>
                <Input
                  type="number"
                  value={formData.priority ?? 0}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0 (Higher shows first)"
                  className="h-10"
                />
              </div>
            </div>

            {/* Image Upload, Display, and Cropper Action Card */}
            <div className="space-y-3 border rounded-xl p-4 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <Label className="font-semibold text-sm">
                    Banner / Flyer Image (Optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload an eye-catching poster or banner. Files must be <span className="font-bold text-foreground">under 2 MB</span>. You can crop or use full image.
                  </p>
                </div>
                {imagePreview && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                      onClick={openCropperModal}
                    >
                      <Crop size={13} /> Crop / Adjust Image
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                      onClick={handleClearImage}
                    >
                      <Trash2 size={13} /> Remove
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                id="popup-image-upload"
              />

              {!imagePreview ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                    dragActive
                      ? "border-primary bg-primary/10 scale-[0.99]"
                      : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"
                  }`}
                >
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors text-primary">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Click to upload or drag & drop poster/banner image here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP, or GIF (strictly &lt; 2 MB limit)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Clean unclipped preview card with ambient backdrop */}
                  <div className="relative rounded-xl overflow-hidden border bg-background/50 group max-h-72 flex items-center justify-center p-2">
                    {/* Ambient blurred backdrop so letterboxing looks natural */}
                    <img
                      src={imagePreview}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-125 select-none pointer-events-none"
                    />
                    {/* Sharp foreground image */}
                    <img
                      src={imagePreview}
                      alt="Banner Preview"
                      className="relative z-10 max-h-64 w-auto max-w-full object-contain rounded-lg shadow-sm transition-transform group-hover:scale-[1.01]"
                    />

                    {/* Quick hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-20">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 shadow font-semibold"
                        onClick={openCropperModal}
                      >
                        <Crop size={14} /> Crop / Resize
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shadow bg-white/90 text-black hover:bg-white"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} /> Replace Image
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1.5 shadow"
                        onClick={handleClearImage}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1 gap-2">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      {imageFile ? imageFile.name : "Active banner image"}
                    </span>
                    <div className="flex items-center gap-2">
                      {imageFileSizeText && (
                        <span className="bg-muted px-2 py-0.5 rounded font-mono font-medium">
                          {imageFileSizeText}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-primary px-2 hover:underline"
                        onClick={openCropperModal}
                      >
                        Adjust Crop
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">
                Message Body <span className="text-destructive">*</span>
              </Label>
              <textarea
                className="w-full flex min-h-[90px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.message || ""}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter compelling popup message to inform or guide users..."
              />
            </div>

            {/* Action Buttons & URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Button Text (Optional)</Label>
                <Input
                  value={formData.button_text || ""}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  placeholder="E.g., Try it Now or View Details"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Action URL / Path (Optional)</Label>
                <Input
                  value={formData.action || ""}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  placeholder="E.g., /dashboard, /attendance, or https://..."
                  className="h-10"
                />
              </div>
            </div>

            {/* Target Roles */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="font-semibold text-sm">Target Roles</Label>
                  <p className="text-xs text-muted-foreground">
                    Select specific roles to target. If empty, the popup displays globally to all roles.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={handleSelectAllRoles}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-muted-foreground"
                    onClick={handleClearAllRoles}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 p-3.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                {AVAILABLE_ROLES.map((role) => {
                  const isChecked = (formData.target_roles || []).includes(role.id);
                  return (
                    <div
                      key={role.id}
                      onClick={() => {
                        const current = formData.target_roles || [];
                        if (isChecked) {
                          setFormData({ ...formData, target_roles: current.filter((r) => r !== role.id) });
                        } else {
                          setFormData({ ...formData, target_roles: [...current, role.id] });
                        }
                      }}
                      className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 font-semibold text-primary"
                          : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isChecked}
                        onCheckedChange={() => {}}
                      />
                      <label htmlFor={`role-${role.id}`} className="cursor-pointer truncate">
                        {role.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Organization ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Organization ID (Optional)</Label>
                <Input
                  type="number"
                  value={formData.organization ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      organization: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Leave blank for global multi-tenant reach"
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to broadcast to all colleges and institutions globally.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={saving}
                onClick={() => {
                  setShowForm(false);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto font-semibold gap-1.5"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Create Popup"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popups List View */}
      {!showForm && (
        <div className="grid grid-cols-1 gap-4">
          {popups.map((popup) => {
            const badge = getPopupTypeBadge(popup.popup_type);
            const resolvedImg = resolveMediaUrl(popup.image);

            return (
              <Card
                key={popup.id}
                className="hover:border-primary/50 transition-all shadow-sm overflow-hidden border-border/80"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch">
                    {/* Thumbnail banner section in card - displays full image with ambient backdrop */}
                    {resolvedImg ? (
                      <div
                        className="relative w-full md:w-56 lg:w-64 h-44 md:h-auto min-h-[160px] shrink-0 bg-slate-900/10 dark:bg-slate-900/60 cursor-pointer overflow-hidden group flex items-center justify-center p-2"
                        onClick={() => setPreviewPopup(popup)}
                        title="Click to view full preview"
                      >
                        {/* Ambient backdrop */}
                        <img
                          src={resolvedImg}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-125 select-none pointer-events-none"
                        />
                        {/* Full poster image */}
                        <img
                          src={resolvedImg}
                          alt={popup.title}
                          className="relative z-10 max-h-36 md:max-h-40 w-auto max-w-full object-contain rounded shadow-sm transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold z-20">
                          <Eye size={15} /> Preview
                        </div>
                      </div>
                    ) : (
                      <div className="w-full md:w-3 bg-muted/40 shrink-0" />
                    )}

                    {/* Content Section */}
                    <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground tracking-tight">
                            {popup.title}
                          </h3>
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          {popup.organization ? (
                            <span className="text-[10px] uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 px-2 py-0.5 rounded-full font-bold">
                              Org #{popup.organization}
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full font-bold">
                              Global
                            </span>
                          )}
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                              popup.enabled
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-zinc-500/15 text-zinc-500"
                            }`}
                          >
                            {popup.enabled ? "Active" : "Disabled"}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {popup.message}
                        </p>

                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground font-medium">
                          <span className="bg-muted px-2 py-0.5 rounded text-[11px]">
                            Priority: <strong className="text-foreground">{popup.priority}</strong>
                          </span>
                          <span className="bg-muted px-2 py-0.5 rounded text-[11px]">
                            Version: <strong className="text-foreground">v{popup.version}</strong>
                          </span>
                          {popup.button_text && (
                            <span className="bg-muted px-2 py-0.5 rounded text-[11px] truncate max-w-[200px]">
                              Button: <strong className="text-foreground">{popup.button_text}</strong>
                            </span>
                          )}
                          {popup.action && (
                            <span className="bg-muted px-2 py-0.5 rounded text-[11px] truncate max-w-[200px]">
                              Target: <strong className="text-foreground">{popup.action}</strong>
                            </span>
                          )}
                        </div>

                        {popup.target_roles && popup.target_roles.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-muted-foreground font-semibold">Roles:</span>
                            {popup.target_roles.map((r: string) => (
                              <span
                                key={r}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium capitalize"
                              >
                                {r.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-8 font-medium hover:border-primary"
                          onClick={() => setPreviewPopup(popup)}
                        >
                          <Eye size={13} className="text-primary" /> Live Preview
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant={popup.enabled ? "default" : "secondary"}
                            size="sm"
                            className="gap-1 text-xs h-8"
                            onClick={() => toggleEnabled(popup)}
                          >
                            {popup.enabled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {popup.enabled ? "Enabled" : "Disabled"}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-8"
                            onClick={() => incrementVersion(popup)}
                            title="Force show again to all users who dismissed previous version"
                          >
                            <RotateCcw size={13} /> Reset V.
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(popup)}
                            title="Edit Popup"
                          >
                            <Edit2 size={13} />
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setDeletePopupId(popup.id)}
                            title="Delete Popup"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {popups.length === 0 && (
            <div className="p-12 text-center border rounded-xl bg-card border-dashed space-y-3">
              <h3 className="font-semibold text-base text-foreground">No Popups Configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No active or configured in-app announcements found. Create one to display global or targeted banners.
              </p>
              <Button onClick={handleOpenCreate} className="gap-2 mt-2">
                <Plus size={16} /> Create First Popup
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deletePopupId} onOpenChange={(open) => !open && setDeletePopupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Popup Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this popup? Users will no longer see this notification banner across their portals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeletePopup();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-Featured Professional Image Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={(open) => !open && setShowCropper(false)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-border/80 bg-background shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b bg-muted/20">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Crop className="w-5 h-5 text-primary" />
              Crop / Adjust Image
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Aspect Ratio Options */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aspect Ratio
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "Full / Original", value: undefined, desc: "No Crop" },
                  { label: "16:9 Banner", value: 16 / 9, desc: "Landscape" },
                  { label: "4:3 Standard", value: 4 / 3, desc: "Classic" },
                  { label: "1:1 Square", value: 1, desc: "Square" },
                  { label: "3:4 Flyer", value: 3 / 4, desc: "Vertical" },
                ].map((item) => {
                  const isSelected = aspect === item.value;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setAspect(item.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Cropper Viewport */}
            <div className="relative w-full h-[320px] sm:h-[360px] bg-zinc-950 rounded-xl overflow-hidden border">
              {cropSourceUrl && (
                <Cropper
                  image={cropSourceUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={true}
                />
              )}
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                disabled={zoom <= 1}
              >
                <ZoomOut size={15} />
              </Button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                disabled={zoom >= 3}
              >
                <ZoomIn size={15} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-2 px-6 py-4 border-t bg-muted/20">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto font-medium"
              onClick={handleUseFullImage}
            >
              Use Full Image (No Crop)
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={() => setShowCropper(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none font-semibold gap-1.5"
                onClick={handleApplyCrop}
              >
                <Check size={15} /> Apply Crop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FULL-FIDELITY LIVE PREVIEW OVERLAY (Mobile & Laptop Simulation) */}
      {previewPopup && (() => {
        const previewBadge = getPopupTypeBadge(previewPopup.popup_type);
        const previewImgUrl = resolveMediaUrl(previewPopup.image);

        return (
          <div 
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewPopup(null);
            }}
          >
            {/* Top Floating Control Bar */}
            <div 
              className="w-full max-w-xl mx-auto flex items-center justify-between bg-zinc-900/90 text-white px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Preview Mode:
                </span>
                <div className="bg-zinc-800 p-0.5 rounded-lg flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      previewDevice === "desktop"
                        ? "bg-primary text-white shadow-sm"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    <Laptop size={14} /> Laptop / Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      previewDevice === "mobile"
                        ? "bg-primary text-white shadow-sm"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    <Smartphone size={14} /> Mobile Phone
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPopup(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Close Preview"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview Stage Container */}
            <div 
              className="flex-1 w-full flex items-center justify-center my-3 overflow-y-auto px-2"
              onClick={(e) => {
                if (e.target === e.currentTarget) setPreviewPopup(null);
              }}
            >
              {previewDevice === "desktop" ? (
                /* ================= REALISTIC LAPTOP SCREEN MOCKUP ================= */
                <div 
                  className="relative flex flex-col items-center select-none w-full max-w-[820px] my-auto animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Laptop Display Lid (Top shell) */}
                  <div className="relative w-full bg-[#18181b] rounded-t-[20px] p-[10px] pb-0 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-[#3f3f46]">
                    {/* Top camera bezel */}
                    <div className="relative w-full pb-2 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#09090b] border border-[#27272a] flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-[#1e293b]" />
                      </div>
                    </div>

                    {/* Inner Screen Display (16:10 ratio) */}
                    <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-t-lg overflow-hidden border border-black flex flex-col shadow-inner">
                      {/* Simulated Browser Chrome Tab Bar */}
                      <div className="h-7 bg-[#0f172a] border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
                        {/* Traffic light window controls */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                        </div>
                        {/* Mock Address Bar */}
                        <div className="bg-slate-900 border border-slate-700/60 rounded-md px-3 py-0.5 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>https://campus.stalight.com/admin/dashboard</span>
                        </div>
                        <div className="w-10 text-right text-[10px] text-slate-500 font-mono">100%</div>
                      </div>

                      {/* Screen Content: Simulated Campus Desktop Portal with Centered Popup Dialog */}
                      <div className="relative flex-1 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-4 flex items-center justify-center overflow-hidden">
                        {/* Background Dashboard Mock Elements */}
                        <div className="absolute inset-0 p-5 opacity-20 pointer-events-none select-none flex flex-col gap-3">
                          <div className="h-8 bg-slate-700/50 rounded-lg w-1/4" />
                          <div className="grid grid-cols-4 gap-3">
                            <div className="h-16 bg-slate-800 rounded-lg" />
                            <div className="h-16 bg-slate-800 rounded-lg" />
                            <div className="h-16 bg-slate-800 rounded-lg" />
                            <div className="h-16 bg-slate-800 rounded-lg" />
                          </div>
                          <div className="flex-1 bg-slate-800/60 rounded-xl" />
                        </div>

                        {/* Dark backdrop overlay over simulated dashboard */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

                        {/* DESKTOP POPUP MODAL (Clean, accurate preview) */}
                        <div className="relative z-10 w-full max-w-[420px] max-h-[92%] bg-background text-foreground rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                          {/* Close button */}
                          <button
                            type="button"
                            onClick={() => setPreviewPopup(null)}
                            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full z-20 transition-all ${
                              previewImgUrl ? "bg-black/60 hover:bg-black/80 text-white" : "bg-muted hover:bg-muted/80 text-foreground"
                            }`}
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Full Image Banner (ambient backdrop + uncropped scaling) */}
                          {previewImgUrl && (
                            <div className="relative w-full h-[180px] bg-muted/60 overflow-hidden flex items-center justify-center shrink-0">
                              <img
                                src={previewImgUrl}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 select-none pointer-events-none"
                              />
                              <img
                                src={previewImgUrl}
                                alt={previewPopup.title || "Banner"}
                                className="relative z-10 max-h-[180px] w-auto max-w-full object-contain"
                              />
                            </div>
                          )}

                          {/* Modal Body */}
                          <div className={`p-4 sm:p-5 overflow-y-auto ${!previewImgUrl ? "pt-6" : ""}`}>
                            <div className="flex items-center gap-2.5 mb-2">
                              <img src="/applogo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
                              <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug line-clamp-2">
                                {previewPopup.title || "Headline Here"}
                              </h3>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap line-clamp-4">
                              {previewPopup.message || "Your popup announcement message will display here."}
                            </p>

                            <div className="flex items-center gap-2 pt-1">
                              {previewPopup.button_text && (
                                <button
                                  type="button"
                                  className={`flex-1 py-2 px-3 bg-gradient-to-r ${previewBadge.gradient} text-white font-semibold text-xs rounded-xl text-center shadow-md`}
                                >
                                  {previewPopup.button_text}
                                </button>
                              )}
                              <button
                                type="button"
                                className="flex-1 py-2 px-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-xs rounded-xl text-center transition-colors"
                                onClick={() => setPreviewPopup(null)}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Laptop Base (Keyboard Chassis + Notch) */}
                  <div className="relative w-[106%] h-3.5 bg-gradient-to-b from-[#27272a] via-[#3f3f46] to-[#18181b] rounded-b-xl shadow-[0_15px_30px_rgba(0,0,0,0.9)] flex justify-center items-start border-t border-[#52525b]">
                    {/* Display opening thumb notch */}
                    <div className="w-20 h-1.5 bg-[#09090b] rounded-b-md border-b border-[#27272a]" />
                  </div>
                  {/* Laptop Base Feet reflection */}
                  <div className="w-[85%] h-1 bg-black/60 blur-[3px] rounded-full mx-auto" />
                </div>
              ) : (
                /* ================= REALISTIC MOBILE PHONE MOCKUP ================= */
                <div 
                  className="relative select-none my-auto animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Outer Phone Shell (Titanium edge styling) */}
                  <div className="relative w-[340px] sm:w-[370px] h-[680px] sm:h-[720px] bg-[#1c1917] rounded-[52px] p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.15)] border-4 border-[#292524] flex flex-col">
                    {/* Side Hardware Buttons */}
                    {/* Volume up & down */}
                    <div className="absolute -left-[7px] top-[120px] w-[3px] h-11 bg-[#44403c] rounded-l-md" />
                    <div className="absolute -left-[7px] top-[180px] w-[3px] h-11 bg-[#44403c] rounded-l-md" />
                    {/* Power button */}
                    <div className="absolute -right-[7px] top-[140px] w-[3px] h-16 bg-[#44403c] rounded-r-md" />

                    {/* Inner Smartphone Screen */}
                    <div className="relative w-full h-full bg-slate-950 rounded-[44px] overflow-hidden flex flex-col border border-black shadow-inner">
                      {/* Status Bar with Dynamic Island */}
                      <div className="relative h-11 w-full px-7 flex items-center justify-between text-white text-[11px] font-semibold shrink-0 z-30 select-none">
                        <span>9:41</span>

                        {/* Dynamic Island Pill */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-24 h-6 bg-black rounded-full flex items-center justify-between px-2.5 shadow-sm">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] border border-[#262626]" />
                          <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                        </div>

                        {/* Status Icons */}
                        <div className="flex items-center gap-1.5 text-xs text-white">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.23 19.67 10.58 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
                          </svg>
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/>
                          </svg>
                          <div className="w-5 h-2.5 border border-white rounded-[3px] p-[1px] flex items-center">
                            <div className="w-full h-full bg-white rounded-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* Screen Canvas: Simulated Mobile Stalight Campus App */}
                      <div className="relative flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-end overflow-hidden">
                        {/* Simulated App Background (Cards, Header) */}
                        <div className="absolute inset-0 p-4 pt-1 opacity-25 pointer-events-none flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-full bg-slate-700" />
                            <div className="h-4 w-24 bg-slate-700 rounded-md" />
                            <div className="w-8 h-8 rounded-full bg-slate-700" />
                          </div>
                          <div className="h-28 bg-slate-800 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="h-3 w-32 bg-slate-700 rounded" />
                            <div className="h-6 w-20 bg-primary/40 rounded-lg" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="h-24 bg-slate-800/80 rounded-xl" />
                            <div className="h-24 bg-slate-800/80 rounded-xl" />
                          </div>
                        </div>

                        {/* Dimmer backdrop over simulated mobile screen */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

                        {/* MOBILE BOTTOM SHEET POPUP (Accurate mobile app appearance) */}
                        <div className="relative z-10 w-full bg-background text-foreground rounded-t-[28px] overflow-hidden shadow-2xl border-t border-white/20 flex flex-col max-h-[85%] animate-in slide-in-from-bottom-8 duration-200">
                          {/* Sheet Grab Handle */}
                          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2 shrink-0" />

                          {/* Close button */}
                          <button
                            type="button"
                            onClick={() => setPreviewPopup(null)}
                            className={`absolute top-2.5 right-2.5 p-1 rounded-full z-20 transition-all ${
                              previewImgUrl ? "bg-black/60 hover:bg-black/80 text-white" : "bg-muted text-foreground"
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Mobile Full Banner Image */}
                          {previewImgUrl && (
                            <div className="relative w-full max-h-[190px] bg-muted/60 overflow-hidden flex items-center justify-center shrink-0">
                              <img
                                src={previewImgUrl}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 select-none pointer-events-none"
                              />
                              <img
                                src={previewImgUrl}
                                alt={previewPopup.title || "Banner"}
                                className="relative z-10 max-h-[190px] w-auto max-w-full object-contain"
                              />
                            </div>
                          )}

                          {/* Mobile Sheet Content */}
                          <div className="p-4 overflow-y-auto flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <img src="/applogo.png" alt="Logo" className="w-7 h-7 object-contain shrink-0" />
                              <h3 className="text-base font-bold text-foreground tracking-tight leading-snug line-clamp-2">
                                {previewPopup.title || "Headline Here"}
                              </h3>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-4">
                              {previewPopup.message || "Your popup message will display here."}
                            </p>

                            <div className="flex flex-col gap-2 pt-1 pb-1">
                              {previewPopup.button_text && (
                                <button
                                  type="button"
                                  className={`w-full py-2.5 px-4 bg-gradient-to-r ${previewBadge.gradient} text-white font-bold text-xs rounded-xl text-center shadow-md active:scale-95`}
                                >
                                  {previewPopup.button_text}
                                </button>
                              )}
                              <button
                                type="button"
                                className="w-full py-2 px-4 bg-muted text-foreground font-semibold text-xs rounded-xl text-center active:scale-95"
                                onClick={() => setPreviewPopup(null)}
                              >
                                Close
                              </button>
                            </div>
                          </div>

                          {/* iOS Home Indicator Bar */}
                          <div className="h-5 w-full flex items-center justify-center shrink-0 pb-1">
                            <div className="w-28 h-1 bg-foreground/30 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Dismiss Hint */}
            <div className="text-[11px] text-zinc-400 text-center select-none shrink-0 py-1">
              Click anywhere outside or press Close to exit preview
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Popups;
