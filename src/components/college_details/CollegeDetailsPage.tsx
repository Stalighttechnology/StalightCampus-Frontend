import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Building2,
  Award,
  BookOpen,
  Users,
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Eye,
  Trash2,
  CheckCircle2,
  Save,
  Plus,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Layers,
  GraduationCap,
  HardDrive,
  Info,
  Server,
  Wifi,
  Scale,
  Flame,
  Landmark,
  FileCheck,
  Trophy,
  Medal,
  AlertCircle,
  Edit3,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Filter,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getCollegeDetails,
  updateCollegeDetails,
  uploadCollegeMedia,
  deleteCollegeMedia,
  CollegeDetailsData,
  CollegeMediaItem,
  CollegeAchievement,
  StudentBranchDetail,
  FeeStructureItem
} from "@/utils/college_details_api";
import { MediaInspectionModal } from "./MediaInspectionModal";
import { CollegeReportCardModal } from "./CollegeReportCardModal";
import { getIndianStates, getDistrictsForState } from "@/utils/indian_states_districts";

interface CollegeDetailsPageProps {
  userRole?: string;
  orgId?: string | number;
}

export const CollegeDetailsPage: React.FC<CollegeDetailsPageProps> = ({
  userRole = "principal",
  orgId
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("profile");

  // Form State
  const [formData, setFormData] = useState<CollegeDetailsData | null>(null);

  // Upload category state
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<string>("campus_photos");
  const [uploadTitle, setUploadTitle] = useState<string>("");

  // Modals state
  const [selectedMediaForView, setSelectedMediaForView] = useState<CollegeMediaItem | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState<boolean>(false);

  // Achievements state & pagination
  const [achievementFilter, setAchievementFilter] = useState<string>("all");
  const [achievementSearch, setAchievementSearch] = useState<string>("");
  const [achievementPage, setAchievementPage] = useState<number>(1);
  const [achievementPageSize, setAchievementPageSize] = useState<number>(6);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState<boolean>(false);
  const [editingAchievement, setEditingAchievement] = useState<CollegeAchievement | null>(null);

  // On-demand tab-wise loading state
  const [loadedTabs, setLoadedTabs] = useState<string[]>(["profile"]);
  const [isTabLoading, setIsTabLoading] = useState<boolean>(false);

  // Fetch initial profile tab data on mount
  const fetchInitialData = async () => {
    setIsLoading(true);
    const res = await getCollegeDetails("profile", orgId);
    if (res.success && res.data) {
      setFormData(res.data);
      setLoadedTabs(["profile"]);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to load college details",
        description: res.error || "Please check your network connection."
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, [orgId]);

  // Scalable on-demand tab loader
  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    if (!loadedTabs.includes(tab)) {
      setIsTabLoading(true);
      const res = await getCollegeDetails(tab, orgId);
      if (res.success && res.data) {
        setFormData((prev) => (prev ? { ...prev, ...res.data } : res.data!));
        setLoadedTabs((prev) => [...prev, tab]);
      } else if (res.error) {
        toast({
          variant: "destructive",
          title: "Failed to load tab data",
          description: res.error
        });
      }
      setIsTabLoading(false);
    }
  };

  // Open Preview Modal with complete sync of all tabs
  const handleOpenReportCardModal = async () => {
    setIsSaving(true);
    const res = await getCollegeDetails("all", orgId);
    if (res.success && res.data) {
      setFormData(res.data);
      setLoadedTabs([
        "profile",
        "recognition",
        "infrastructure",
        "digital",
        "governance",
        "achievements",
        "inspection",
        "faculty-students",
        "fee-structure"
      ]);
      setIsReportCardModalOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to compile report card",
        description: res.error || "Please check your network connection."
      });
    }
    setIsSaving(false);
  };

  const handleInputChange = (field: keyof CollegeDetailsData, value: any) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Word Count Helper
  const countWords = (text?: string): number => {
    if (!text) return 0;
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  // Comprehensive Field Validation Suite
  const validateForm = (): { valid: boolean; tab?: string; errors: string[] } => {
    if (!formData) return { valid: false, errors: ["No form data loaded"] };
    const errors: string[] = [];
    let firstErrorTab: string | undefined = undefined;

    // 1. Profile Validations
    if (!formData.college_name?.trim()) {
      errors.push("College / Institutional Name is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.college_code?.trim()) {
      errors.push("College Code is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.aishe_code?.trim()) {
      errors.push("AISHE Code is required (e.g. C-45892)");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.state?.trim()) {
      errors.push("State selection is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.educational_district?.trim()) {
      errors.push("Educational District is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.school_address?.trim()) {
      errors.push("Full Campus Address is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    } else if (countWords(formData.school_address) > 50) {
      errors.push(`Campus Address must not exceed 50 words (currently ${countWords(formData.school_address)} words)`);
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.pincode?.trim()) {
      errors.push("Pincode is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.push("Pincode must be exactly 6 digits (e.g. 560100)");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.official_email?.trim()) {
      errors.push("Official Email is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.official_email.trim())) {
      errors.push("Official Email format is invalid (e.g. principal@college.edu.in)");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.official_phone?.trim()) {
      errors.push("Official Phone number is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    }
    if (!formData.principal_name?.trim()) {
      errors.push("Principal / Head of Institution Name is required");
      if (!firstErrorTab) firstErrorTab = "profile";
    }

    // 2. Accreditation Validations
    if (!formData.year_of_establishment?.trim()) {
      errors.push("Year of Establishment is required");
      if (!firstErrorTab) firstErrorTab = "recognition";
    }
    if (!formData.affiliated_university?.trim()) {
      errors.push("Affiliated University is required");
      if (!firstErrorTab) firstErrorTab = "recognition";
    }
    if (!formData.aicte_approval_status?.trim()) {
      errors.push("AICTE Approval Status is required");
      if (!firstErrorTab) firstErrorTab = "recognition";
    }

    // 3. Infrastructure Validations
    if (formData.total_classrooms < 0) {
      errors.push("Total Classrooms cannot be negative");
      if (!firstErrorTab) firstErrorTab = "infrastructure";
    }
    if (formData.no_of_teachers < 0) {
      errors.push("Total Teaching Faculty cannot be negative");
      if (!firstErrorTab) firstErrorTab = "infrastructure";
    }

    // 4. Inspection & Regulatory Validations
    if (!formData.fire_safety_certificate?.trim()) {
      errors.push("Fire Safety Certificate status is required");
      if (!firstErrorTab) firstErrorTab = "inspection";
    }
    if (!formData.building_occupancy_certificate?.trim()) {
      errors.push("Building Occupancy Certificate status is required");
      if (!firstErrorTab) firstErrorTab = "inspection";
    }
    if (!formData.structural_stability_certificate?.trim()) {
      errors.push("Structural Stability Certificate status is required");
      if (!firstErrorTab) firstErrorTab = "inspection";
    }

    return {
      valid: errors.length === 0,
      tab: firstErrorTab,
      errors
    };
  };

  const handleSave = async () => {
    if (!formData) return;
    const validation = validateForm();
    if (!validation.valid) {
      if (validation.tab) {
        setActiveTab(validation.tab);
      }
      toast({
        variant: "destructive",
        title: "Please Complete Required Fields",
        description: validation.errors.slice(0, 3).join(" • ") + (validation.errors.length > 3 ? ` (+${validation.errors.length - 3} more)` : "")
      });
      return;
    }

    setIsSaving(true);
    const res = await updateCollegeDetails(formData, orgId);
    if (res.success) {
      toast({
        title: "Changes Saved Successfully",
        description: "Institutional report card profile, compliance parameters, and achievements updated."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error saving changes",
        description: res.error || "An unexpected error occurred."
      });
    }
    setIsSaving(false);
  };

  // Upload handler with strict 1 MB maximum limit
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 1 MB size validation
    const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        variant: "destructive",
        title: "File Size Exceeds 1 MB Limit",
        description: `Selected file is ${sizeMB} MB. Maximum allowed upload size is strictly 1 MB. Please compress or resize the document/image.`
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    toast({
      title: "Uploading Document...",
      description: "Please wait while the document is being uploaded."
    });

    const res = await uploadCollegeMedia(file, selectedUploadCategory, uploadTitle || file.name, orgId);
    if (res.success && res.media_item) {
      toast({
        title: "Upload Successful",
        description: `${file.name} uploaded successfully.`
      });
      // Append to local state
      setFormData((prev) =>
        prev
          ? {
              ...prev,
              uploaded_media: [res.media_item!, ...(prev.uploaded_media || [])]
            }
          : null
      );
      setUploadTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: res.error || "Failed to upload file."
      });
    }
    setIsUploading(false);
  };

  const handleDeleteMedia = async (mediaItem: CollegeMediaItem) => {
    const res = await deleteCollegeMedia(mediaItem.id, mediaItem.url, orgId);
    if (res.success) {
      toast({
        title: "Document Deleted",
        description: "Document removed successfully."
      });
      setFormData((prev) =>
        prev
          ? {
              ...prev,
              uploaded_media: (prev.uploaded_media || []).filter((m) => m.id !== mediaItem.id)
            }
          : null
      );
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: res.error || "Could not delete document."
      });
    }
  };

  const handleOpenMediaInspection = (mediaItem: CollegeMediaItem) => {
    setSelectedMediaForView(mediaItem);
    setIsMediaModalOpen(true);
  };

  const handleInlineUploadTrigger = (category: string, title: string) => {
    setSelectedUploadCategory(category);
    setUploadTitle(title);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const renderInlineUploader = (category: string, title: string) => {
    const media = formData?.uploaded_media?.filter((m) => m.category === category) || [];
    return (
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1 px-2 border-primary/20 hover:bg-primary/5 text-primary"
          onClick={() => handleInlineUploadTrigger(category, title)}
          disabled={isUploading}
        >
          {isUploading && selectedUploadCategory === category ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <UploadCloud className="w-3 h-3" />
          )}
          Attach Document / Photo
        </Button>
        {media.map((m) => (
          <Button
            key={m.id}
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-[10px] gap-1 px-2 text-muted-foreground hover:text-primary bg-muted/60 max-w-[220px]"
            title={m.title || m.filename || "View Attached Document"}
            onClick={() => handleOpenMediaInspection(m)}
          >
            <Eye className="w-3 h-3 flex-shrink-0 text-primary" />
            <span className="truncate">{m.title || m.filename || "View Attachment"}</span>
          </Button>
        ))}
      </div>
    );
  };

  // Add / Update Branch matrix rows
  const handleAddBranchRow = () => {
    if (!formData) return;
    const current = [...(formData.student_details_class_wise || [])];
    current.push({
      branch: "New Department / Program",
      branch_code: "NEW",
      boys: 60,
      girls: 40,
      total: 100
    });
    setFormData({ ...formData, student_details_class_wise: current });
  };

  const handleUpdateBranchRow = (index: number, field: keyof StudentBranchDetail, value: any) => {
    if (!formData) return;
    const current = [...(formData.student_details_class_wise || [])];
    const item = { ...current[index], [field]: value };
    if (field === "boys" || field === "girls") {
      item.total = Number(item.boys || 0) + Number(item.girls || 0);
    }
    current[index] = item;
    setFormData({ ...formData, student_details_class_wise: current });
  };

  const handleDeleteBranchRow = (index: number) => {
    if (!formData) return;
    const current = formData.student_details_class_wise.filter((_, idx) => idx !== index);
    setFormData({ ...formData, student_details_class_wise: current });
  };

  // Add / Update Fee matrix rows
  const handleAddFeeRow = () => {
    if (!formData) return;
    const current = [...(formData.fee_structure_data || [])];
    current.push({
      standard: "New Course / Degree (Quota)",
      notified_fee: "95,000",
      exam_dev_fee: "15,000",
      total: "1,10,000"
    });
    setFormData({ ...formData, fee_structure_data: current });
  };

  const handleUpdateFeeRow = (index: number, field: keyof FeeStructureItem, value: any) => {
    if (!formData) return;
    const current = [...(formData.fee_structure_data || [])];
    current[index] = { ...current[index], [field]: value };
    setFormData({ ...formData, fee_structure_data: current });
  };

  const handleDeleteFeeRow = (index: number) => {
    if (!formData) return;
    const current = formData.fee_structure_data.filter((_, idx) => idx !== index);
    setFormData({ ...formData, fee_structure_data: current });
  };

  // Achievement Management Handlers
  const handleOpenAddAchievement = () => {
    setEditingAchievement({
      id: `ach-${Date.now()}`,
      title: "",
      category: "college_level",
      recipient_name: "",
      department: "Institutional Quality Cell",
      year: `${new Date().getFullYear()}`,
      awarding_body: "",
      description: "",
      certificate_url: "",
      certificate_filename: ""
    });
    setIsAchievementModalOpen(true);
  };

  const handleOpenEditAchievement = (ach: CollegeAchievement) => {
    setEditingAchievement({ ...ach });
    setIsAchievementModalOpen(true);
  };

  const handleSaveAchievement = () => {
    if (!editingAchievement || !formData) return;
    if (!editingAchievement.title?.trim()) {
      toast({
        variant: "destructive",
        title: "Achievement Title Required",
        description: "Please enter the title or award name."
      });
      return;
    }

    if (editingAchievement.description && countWords(editingAchievement.description) > 50) {
      toast({
        variant: "destructive",
        title: "Description Exceeds 50 Words",
        description: `Achievement citation is currently ${countWords(editingAchievement.description)} words. Please condense to 50 words or less.`
      });
      return;
    }

    const currentAchievements = [...(formData.achievements_data || [])];
    const existingIndex = currentAchievements.findIndex((a) => a.id === editingAchievement.id);

    if (existingIndex >= 0) {
      currentAchievements[existingIndex] = editingAchievement;
    } else {
      currentAchievements.unshift(editingAchievement);
    }

    setFormData({
      ...formData,
      achievements_data: currentAchievements
    });
    setIsAchievementModalOpen(false);
    setEditingAchievement(null);
    toast({
      title: "Achievement Recorded",
      description: "Achievement entry saved to institutional profile."
    });
  };

  const handleDeleteAchievement = (id: string) => {
    if (!formData) return;
    const updated = (formData.achievements_data || []).filter((a) => a.id !== id);
    setFormData({ ...formData, achievements_data: updated });
    toast({
      title: "Achievement Removed",
      description: "Record deleted from catalog."
    });
  };

  const handleAchievementCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingAchievement) return;

    if (file.size > 1 * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        variant: "destructive",
        title: "File Size Exceeds 1 MB Limit",
        description: `Selected certificate is ${sizeMB} MB. Maximum allowed upload size is strictly 1 MB.`
      });
      return;
    }

    setIsUploading(true);
    const res = await uploadCollegeMedia(file, "certificates", editingAchievement.title || file.name, orgId);
    if (res.success && res.media_item) {
      setEditingAchievement((prev) =>
        prev
          ? {
              ...prev,
              certificate_url: res.media_item!.url,
              certificate_filename: file.name
            }
          : null
      );
      toast({
        title: "Proof Uploaded",
        description: `${file.name} attached to achievement.`
      });
    } else {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: res.error || "Failed to upload certificate."
      });
    }
    setIsUploading(false);
  };

  if (isLoading || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading Institutional Details & Accreditations...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-3 sm:px-6 lg:px-8">
      {/* Top Header & Action Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card/70 backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/80 shadow-sm">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            <img
              src={formData.org_logo || "/logo.jpeg"}
              alt="College Logo"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-snug break-words">
                {formData.college_name || formData.org_name || "Engineering College Details"}
              </h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[11px] sm:text-xs shrink-0">
                Code: {formData.college_code || "ENG-001"}
              </Badge>
              {formData.autonomous_status?.toLowerCase().includes("auto") && (
                <Badge variant="secondary" className="text-[11px] sm:text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                  Autonomous
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Comprehensive Institutional Profile & Official Compliance Report Card
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
          <Button
            variant="outline"
            className="w-full sm:w-auto justify-center gap-2 border-primary/20 hover:bg-primary/5 text-primary shadow-sm text-xs sm:text-sm h-9 sm:h-10"
            onClick={handleOpenReportCardModal}
            disabled={isSaving}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Preview Standard Report Card</span>
          </Button>

          <Button
            variant="default"
            className="w-full sm:w-auto justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm min-w-[140px] text-xs sm:text-sm h-9 sm:h-10"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 shrink-0" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
            <TabsList className="inline-flex w-max min-w-full sm:w-full sm:grid sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 h-auto p-1.5 gap-1.5 bg-muted/70 backdrop-blur-sm border border-border/70 rounded-xl justify-start sm:justify-stretch">
              <TabsTrigger value="profile" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="recognition" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Award className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Accreditation
              </TabsTrigger>
              <TabsTrigger value="infrastructure" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Infrastructure
              </TabsTrigger>
              <TabsTrigger value="digital" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Wifi className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Digital & IT
              </TabsTrigger>
              <TabsTrigger value="governance" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Governance
              </TabsTrigger>
              <TabsTrigger value="achievements" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Trophy className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-500" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="inspection" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <FileCheck className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Inspection & Safety
              </TabsTrigger>
              <TabsTrigger value="faculty-students" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Enrollment
              </TabsTrigger>
              <TabsTrigger value="fee-structure" className="text-xs py-2 px-3 shrink-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg flex items-center justify-center font-medium">
                <Scale className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Fee Matrix
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {isTabLoading && (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="capitalize">Fetching {activeTab.replace("-", " ")} details...</span>
          </div>
        )}

        {/* 1. Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Institutional Identity & Location Details
              </CardTitle>
              <CardDescription className="text-xs">
                Official registration, administrative boundaries, and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  College Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.college_name || ""}
                  onChange={(e) => handleInputChange("college_name", e.target.value)}
                  placeholder="e.g. Stalight Institute of Technology"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  College Code (AICTE / State) <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.college_code || ""}
                  onChange={(e) => handleInputChange("college_code", e.target.value)}
                  placeholder="e.g. 1ST2025"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  AISHE Code <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.aishe_code || ""}
                  onChange={(e) => handleInputChange("aishe_code", e.target.value)}
                  placeholder="e.g. C-12345"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Affiliated University <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.affiliated_university || ""}
                  onChange={(e) => handleInputChange("affiliated_university", e.target.value)}
                  placeholder="e.g. Visvesvaraya Technological University"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  State <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={formData.state || ""}
                  onValueChange={(val) => {
                    handleInputChange("state", val);
                    handleInputChange("educational_district", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {getIndianStates().map(st => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Educational District <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={formData.educational_district || ""}
                  onValueChange={(val) => handleInputChange("educational_district", val)}
                  disabled={!formData.state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDistrictsForState(formData.state || "").map(dist => (
                      <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Educational Block / Taluk</Label>
                <Input
                  value={formData.educational_block || ""}
                  onChange={(e) => handleInputChange("educational_block", e.target.value)}
                  placeholder="e.g. BENGALURU SOUTH"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Village / City</Label>
                <Input
                  value={formData.village_city || ""}
                  onChange={(e) => handleInputChange("village_city", e.target.value)}
                  placeholder="e.g. Bengaluru"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Pincode <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.pincode || ""}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  placeholder="e.g. 560099"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assembly Constituency</Label>
                <Input
                  value={formData.assembly_constituency || ""}
                  onChange={(e) => handleInputChange("assembly_constituency", e.target.value)}
                  placeholder="e.g. BOMMANAHALLI"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Parliamentary Constituency</Label>
                <Input
                  value={formData.parliamentary_constituency || ""}
                  onChange={(e) => handleInputChange("parliamentary_constituency", e.target.value)}
                  placeholder="e.g. BENGALURU SOUTH"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Principal / Head of Institution Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.principal_name || ""}
                  onChange={(e) => handleInputChange("principal_name", e.target.value)}
                  placeholder="Dr. John Doe, Ph.D."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Official Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.official_email || ""}
                  onChange={(e) => handleInputChange("official_email", e.target.value)}
                  placeholder="principal@college.edu"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Official Contact Phone <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.official_phone || ""}
                  onChange={(e) => handleInputChange("official_phone", e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Official Website URL</Label>
                <Input
                  value={formData.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://www.college.edu"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    Full Campus Address <span className="text-red-500 font-bold ml-0.5">*</span>
                  </Label>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      countWords(formData.school_address) > 50
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold"
                        : countWords(formData.school_address) > 40
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {countWords(formData.school_address)} / 50 words
                  </span>
                </div>
                <Textarea
                  rows={2}
                  value={formData.school_address || ""}
                  onChange={(e) => handleInputChange("school_address", e.target.value)}
                  placeholder="Complete postal address of the engineering campus..."
                  className={
                    countWords(formData.school_address) > 50
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {countWords(formData.school_address) > 50 && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Address exceeds 50 words limit by {countWords(formData.school_address) - 50} words.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Recognition & Accreditation */}
        <TabsContent value="recognition" className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Award className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Accreditation, Affiliation & Statutory Recognition
              </CardTitle>
              <CardDescription className="text-xs">
                AICTE permanent approval, NBA, NAAC Grade, UGC Autonomous status and NIRF rankings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Year of Establishment <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.year_of_establishment || ""}
                  onChange={(e) => handleInputChange("year_of_establishment", e.target.value)}
                  placeholder="e.g. 2001"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  AICTE Approval Status & EOA No. <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.aicte_approval_number || ""}
                  onChange={(e) => handleInputChange("aicte_approval_number", e.target.value)}
                  placeholder="F.No. South-West/1-9321458911/2025/EOA"
                />
                {renderInlineUploader("aicte_approval", "AICTE EOA Letter")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">AICTE Validity Period</Label>
                <Input
                  value={formData.aicte_validity_period || ""}
                  onChange={(e) => handleInputChange("aicte_validity_period", e.target.value)}
                  placeholder="e.g. 2025-26 to 2029-30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  NAAC Grade <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={formData.naac_grade || "A+"}
                  onValueChange={(val) => handleInputChange("naac_grade", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select NAAC Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A++">A++ (CGPA 3.51 - 4.00)</SelectItem>
                    <SelectItem value="A+">A+ (CGPA 3.26 - 3.50)</SelectItem>
                    <SelectItem value="A">A (CGPA 3.01 - 3.25)</SelectItem>
                    <SelectItem value="B++">B++ (CGPA 2.76 - 3.00)</SelectItem>
                    <SelectItem value="B+">B+ (CGPA 2.51 - 2.75)</SelectItem>
                    <SelectItem value="B">B (CGPA 2.01 - 2.50)</SelectItem>
                    <SelectItem value="C">C (CGPA 1.51 - 2.00)</SelectItem>
                    <SelectItem value="Not Accredited">Not Accredited / Applied</SelectItem>
                  </SelectContent>
                </Select>
                {renderInlineUploader("naac_certificate", "NAAC Certificate")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">NAAC CGPA Score (out of 4.0)</Label>
                <Input
                  value={formData.naac_cgpa || ""}
                  onChange={(e) => handleInputChange("naac_cgpa", e.target.value)}
                  placeholder="e.g. 3.38"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">NBA Accredited Programs</Label>
                <Input
                  value={formData.nba_accreditation_details || ""}
                  onChange={(e) => handleInputChange("nba_accreditation_details", e.target.value)}
                  placeholder="e.g. CSE, ECE, ME (Accredited till 2027)"
                />
                {renderInlineUploader("nba_accreditation", "NBA Accreditation")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">UGC Autonomous Status</Label>
                <Select
                  value={formData.autonomous_status || "Autonomous"}
                  onValueChange={(val) => handleInputChange("autonomous_status", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Autonomous Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Autonomous (UGC Conferred)">Autonomous (UGC Conferred)</SelectItem>
                    <SelectItem value="Affiliated Non-Autonomous">Affiliated Non-Autonomous</SelectItem>
                    <SelectItem value="Deemed to be University">Deemed to be University</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">NIRF Ranking / Band</Label>
                <Input
                  value={formData.nirf_rank || ""}
                  onChange={(e) => handleInputChange("nirf_rank", e.target.value)}
                  placeholder="e.g. Rank Band 151-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">ISO Certification</Label>
                <Input
                  value={formData.iso_certified || ""}
                  onChange={(e) => handleInputChange("iso_certified", e.target.value)}
                  placeholder="e.g. ISO 9001:2015 & 21001:2018"
                />
                {renderInlineUploader("iso_certificate", "ISO Certificate")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Management Type</Label>
                <Select
                  value={formData.college_management || "Pvt. Unaided"}
                  onValueChange={(val) => handleInputChange("college_management", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Management" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pvt. Unaided">Pvt. Unaided / Educational Trust</SelectItem>
                    <SelectItem value="Govt. Aided">Govt. Aided</SelectItem>
                    <SelectItem value="Government">Government / State University</SelectItem>
                    <SelectItem value="Religious / Linguistic Minority">Minority Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Infrastructure & Facilities */}
        <TabsContent value="infrastructure" className="space-y-6">
          {/* General Campus & Buildings */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                General Campus Area & Building Blocks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Total Land Area <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.total_land_area_acres || ""}
                  onChange={(e) => handleInputChange("total_land_area_acres", e.target.value)}
                  placeholder="e.g. 15.5 Acres"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Total Built-Up Area <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={formData.total_built_up_area_sqm || ""}
                  onChange={(e) => handleInputChange("total_built_up_area_sqm", e.target.value)}
                  placeholder="e.g. 42,500 Sq.m"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Building Blocks</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.no_of_building_blocks || 0}
                  onChange={(e) => handleInputChange("no_of_building_blocks", Number(e.target.value))}
                  placeholder="e.g. 6 Blocks"
                />
                {renderInlineUploader("building_photos", "Building Blocks")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pucca Building Blocks</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.pucca_building_blocks || 0}
                  onChange={(e) => handleInputChange("pucca_building_blocks", Number(e.target.value))}
                  placeholder="e.g. 6 Pucca Blocks"
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic: Classrooms & Labs */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Classrooms, Seminar Halls & Engineering Labs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Total Classrooms <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_classrooms || 0}
                  onChange={(e) => handleInputChange("total_classrooms", Number(e.target.value))}
                  placeholder="Total Classrooms"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Classrooms in Good Condition</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.classrooms_in_good_condition || 0}
                  onChange={(e) => handleInputChange("classrooms_in_good_condition", Number(e.target.value))}
                  placeholder="In Good Condition"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Smart Classrooms Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.smart_classrooms_count || 0}
                  onChange={(e) => handleInputChange("smart_classrooms_count", Number(e.target.value))}
                  placeholder="Smart / ICT Classrooms"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seminar Halls Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.seminar_halls_count || 0}
                  onChange={(e) => handleInputChange("seminar_halls_count", Number(e.target.value))}
                  placeholder="Seminar / Conference Halls"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Computing / IT Labs</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.computing_labs_count || 0}
                  onChange={(e) => handleInputChange("computing_labs_count", Number(e.target.value))}
                  placeholder="Computer Labs"
                />
                {renderInlineUploader("lab_photos", "Computing Labs")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Engineering & Workshop Labs</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.engineering_labs_count || 0}
                  onChange={(e) => handleInputChange("engineering_labs_count", Number(e.target.value))}
                  placeholder="Engineering Labs"
                />
                {renderInlineUploader("lab_photos", "Engineering Labs")}
              </div>
            </CardContent>
          </Card>

          {/* Library Facilities */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Central Library
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Library Volumes / Books</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.library_total_books || 0}
                  onChange={(e) => handleInputChange("library_total_books", Number(e.target.value))}
                  placeholder="e.g. 45000 Books"
                />
                {renderInlineUploader("library_photos", "Central Library")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Library Book Titles</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.library_total_titles || 0}
                  onChange={(e) => handleInputChange("library_total_titles", Number(e.target.value))}
                  placeholder="e.g. 12000 Titles"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Library Seating Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.library_seating_capacity || 0}
                  onChange={(e) => handleInputChange("library_seating_capacity", Number(e.target.value))}
                  placeholder="e.g. 250 Seats"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sanitation & Green Features */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Sanitation, Health & Green Features
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Boys Functional Toilets</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.toilets_boys_functional || 0}
                  onChange={(e) => handleInputChange("toilets_boys_functional", Number(e.target.value))}
                  placeholder="Boys Toilets Count"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Girls Functional Toilets</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.toilets_girls_functional || 0}
                  onChange={(e) => handleInputChange("toilets_girls_functional", Number(e.target.value))}
                  placeholder="Girls Toilets Count"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Specially Abled (CWSN) Accessibility</Label>
                <Select
                  value={formData.availability_of_ramps || "YES"}
                  onValueChange={(val) => handleInputChange("availability_of_ramps", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES (Full Access - Ramps & Lifts)</SelectItem>
                    <SelectItem value="PARTIAL">PARTIAL (Ground Floor Only)</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Drinking Water Points</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.drinking_water_available || 0}
                  onChange={(e) => handleInputChange("drinking_water_available", Number(e.target.value))}
                  placeholder="Water Taps / Coolers"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Commercial RO Water Plants</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.ro_plants_count || 0}
                  onChange={(e) => handleInputChange("ro_plants_count", Number(e.target.value))}
                  placeholder="e.g. 3 RO Plants"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Solar Power Plant Capacity</Label>
                <Input
                  value={formData.solar_capacity_kw || ""}
                  onChange={(e) => handleInputChange("solar_capacity_kw", e.target.value)}
                  placeholder="e.g. 100 kW Solar"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">DG Generator Power Backup</Label>
                <Input
                  value={formData.dg_generator_backup || ""}
                  onChange={(e) => handleInputChange("dg_generator_backup", e.target.value)}
                  placeholder="e.g. 2x125 kVA Silent DG"
                />
              </div>
            </CardContent>
          </Card>

          {/* Hostel & Sports Facilities */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Hostel & Sports Facilities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Boys Hostel Bed Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.boys_hostel_capacity || 0}
                  onChange={(e) => handleInputChange("boys_hostel_capacity", Number(e.target.value))}
                  placeholder="e.g. 350 Beds"
                />
                {renderInlineUploader("hostel_photos", "Boys Hostel")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Girls Hostel Bed Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.girls_hostel_capacity || 0}
                  onChange={(e) => handleInputChange("girls_hostel_capacity", Number(e.target.value))}
                  placeholder="e.g. 250 Beds"
                />
                {renderInlineUploader("hostel_photos", "Girls Hostel")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Auditorium & Sports Ground Facilities</Label>
                <Input
                  value={formData.sports_facilities_details || ""}
                  onChange={(e) => handleInputChange("sports_facilities_details", e.target.value)}
                  placeholder="e.g. 800-Seater AC Auditorium, Cricket Ground"
                />
                {renderInlineUploader("sports_photos", "Sports Facilities")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Digital & IT */}
        <TabsContent value="digital" className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Wifi className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Digital Infrastructure & Campus Computing
              </CardTitle>
              <CardDescription className="text-xs">
                Dedicated leased line bandwidth, computing workstations, AI servers, CCTV and ERP systems
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Internet Leased Line Bandwidth</Label>
                <Input
                  value={formData.internet_bandwidth || ""}
                  onChange={(e) => handleInputChange("internet_bandwidth", e.target.value)}
                  placeholder="e.g. 1 Gbps 1:1 Leased Line"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Total Desktops for Students</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.desktop_count || 0}
                  onChange={(e) => handleInputChange("desktop_count", Number(e.target.value))}
                  placeholder="e.g. 650"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">GPU AI Servers / Workstations</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.gpu_server_count || 0}
                  onChange={(e) => handleInputChange("gpu_server_count", Number(e.target.value))}
                  placeholder="e.g. 4"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Classroom Projectors Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.projector_count || 0}
                  onChange={(e) => handleInputChange("projector_count", Number(e.target.value))}
                  placeholder="e.g. 45"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Smart DigiBoards Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.digiboard_count || 0}
                  onChange={(e) => handleInputChange("digiboard_count", Number(e.target.value))}
                  placeholder="e.g. 20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">CCTV Surveillance Cameras</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cctv_cameras_count || 0}
                  onChange={(e) => handleInputChange("cctv_cameras_count", Number(e.target.value))}
                  placeholder="e.g. 160"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Campus ERP & LMS Platform</Label>
                <Input
                  value={formData.campus_erp_system || ""}
                  onChange={(e) => handleInputChange("campus_erp_system", e.target.value)}
                  placeholder="Stalight Campus Cloud ERP"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Digital Library Subscriptions</Label>
                <Input
                  value={formData.library_digital_subscriptions || ""}
                  onChange={(e) => handleInputChange("library_digital_subscriptions", e.target.value)}
                  placeholder="IEEE Xplore, DELNET, SpringerLink, ScienceDirect"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Governance & Committees */}
        <TabsContent value="governance" className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Statutory Committees & Quality Assurance
              </CardTitle>
              <CardDescription className="text-xs">
                Governing Body (BoG), Academic Council, IQAC, Anti-Ragging and POSH Grievance Cells
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Board of Governors (BoG / SMC)</Label>
                <Select
                  value={formData.smc_exists || "YES"}
                  onValueChange={(val) => handleInputChange("smc_exists", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Constituted & Active?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Academic Council & BoS</Label>
                <Select
                  value={formData.smdc_constituted || "YES"}
                  onValueChange={(val) => handleInputChange("smdc_constituted", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Constituted & Active?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Internal Quality Assurance Cell (IQAC)</Label>
                <Select
                  value={formData.iqac_constituted || "YES"}
                  onValueChange={(val) => handleInputChange("iqac_constituted", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Constituted & Active?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Anti-Ragging Squad & Committee</Label>
                <Select
                  value={formData.anti_ragging_committee || "YES"}
                  onValueChange={(val) => handleInputChange("anti_ragging_committee", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Active as per AICTE?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Internal Complaints Committee (POSH/ICC)</Label>
                <Select
                  value={formData.icc_posh_committee || "YES"}
                  onValueChange={(val) => handleInputChange("icc_posh_committee", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Constituted & Meeting Regularly?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Instructional Days per Academic Year</Label>
                <Input
                  type="number"
                  value={formData.instructional_days || 180}
                  onChange={(e) => handleInputChange("instructional_days", Number(e.target.value))}
                  placeholder="e.g. 180"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Total Complaints Received (Yearly)</Label>
                <Input
                  type="number"
                  value={formData.total_complaints_received || 0}
                  onChange={(e) => handleInputChange("total_complaints_received", Number(e.target.value))}
                  placeholder="e.g. 15"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Complaints Successfully Resolved</Label>
                <Input
                  type="number"
                  value={formData.complaints_resolved || 0}
                  onChange={(e) => handleInputChange("complaints_resolved", Number(e.target.value))}
                  placeholder="e.g. 14"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Achievements Tab (Institutional, Student, Faculty Research, State/National/International) */}
        <TabsContent value="achievements" className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <Card className="bg-card/70 border-border/80 p-3 sm:p-3.5 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Total Achievements
              </span>
              <div className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                {formData.achievements_data?.length || 0}
              </div>
            </Card>

            <Card className="bg-card/70 border-border/80 p-3 sm:p-3.5 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Institutional Level
              </span>
              <div className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                {formData.achievements_data?.filter(a => a.category === "college_level").length || 0}
              </div>
            </Card>

            <Card className="bg-card/70 border-border/80 p-3 sm:p-3.5 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Student Honors
              </span>
              <div className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                {formData.achievements_data?.filter(a => a.category === "student_level").length || 0}
              </div>
            </Card>

            <Card className="bg-card/70 border-border/80 p-3 sm:p-3.5 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                Research & Grants
              </span>
              <div className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                {formData.achievements_data?.filter(a => a.category === "faculty_research").length || 0}
              </div>
            </Card>

            <Card className="bg-card/70 border-border/80 p-3 sm:p-3.5 flex flex-col justify-between shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                State / National
              </span>
              <div className="text-lg sm:text-xl font-bold mt-1 text-foreground">
                {formData.achievements_data?.filter(a => a.category === "state_national" || a.category === "international").length || 0}
              </div>
            </Card>
          </div>

          {/* Main Achievements Directory Card */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                    Institutional & Student Achievements Catalog
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Accredited recognitions, competitive awards, sponsored research grants, and state/national honors
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm justify-center" onClick={handleOpenAddAchievement}>
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Add Achievement</span>
                  </Button>
                </div>
              </div>

              {/* Search, Category Filter & Page Size Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border/60">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title, recipient, department, awarder..."
                    value={achievementSearch}
                    onChange={(e) => {
                      setAchievementSearch(e.target.value);
                      setAchievementPage(1);
                    }}
                    className="pl-8 pr-8 h-8 text-xs bg-muted/30 focus-visible:bg-background"
                  />
                  {achievementSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAchievementSearch("");
                        setAchievementPage(1);
                      }}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters and Page Size Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <Select
                    value={achievementFilter}
                    onValueChange={(val) => {
                      setAchievementFilter(val);
                      setAchievementPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories ({formData.achievements_data?.length || 0})</SelectItem>
                      <SelectItem value="college_level">Institutional / College</SelectItem>
                      <SelectItem value="student_level">Student / Team Level</SelectItem>
                      <SelectItem value="faculty_research">Faculty & Research</SelectItem>
                      <SelectItem value="state_national">State / National</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Page Size Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">Show:</span>
                    <Select
                      value={achievementPageSize.toString()}
                      onValueChange={(val) => {
                        setAchievementPageSize(Number(val));
                        setAchievementPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[72px] h-8 text-xs">
                        <SelectValue placeholder="6" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {(() => {
                const rawList = formData.achievements_data || [];
                const searchLower = achievementSearch.trim().toLowerCase();

                const filtered = rawList.filter((a) => {
                  if (achievementFilter !== "all" && a.category !== achievementFilter) {
                    return false;
                  }
                  if (searchLower) {
                    const matchText = `${a.title || ""} ${a.recipient_name || ""} ${a.department || ""} ${a.awarding_body || ""} ${a.description || ""} ${a.year || ""}`.toLowerCase();
                    if (!matchText.includes(searchLower)) return false;
                  }
                  return true;
                });

                const totalItems = filtered.length;
                const totalPages = Math.max(1, Math.ceil(totalItems / achievementPageSize));
                const currentPage = Math.min(achievementPage, totalPages);
                const startIdx = (currentPage - 1) * achievementPageSize;
                const endIdx = Math.min(startIdx + achievementPageSize, totalItems);
                const paginatedItems = filtered.slice(startIdx, endIdx);

                if (totalItems === 0) {
                  return (
                    <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                      <Trophy className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium">No achievement records match your query.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievementSearch || achievementFilter !== "all" ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary underline"
                            onClick={() => {
                              setAchievementFilter("all");
                              setAchievementSearch("");
                              setAchievementPage(1);
                            }}
                          >
                            Reset filters
                          </Button>
                        ) : (
                          'Click "Add Achievement" to record honors, grants, and student awards.'
                        )}
                      </p>
                    </div>
                  );
                }

                // Calculate numeric page items to render
                const renderPageNumbers = () => {
                  const pages: (number | string)[] = [];
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 3) {
                      pages.push(1, 2, 3, 4, "...", totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
                    }
                  }
                  return pages;
                };

                return (
                  <div className="space-y-4">
                    {/* Achievement Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paginatedItems.map((ach) => (
                        <div key={ach.id} className="p-4 rounded-xl border border-border/80 bg-card hover:shadow-md transition-all flex flex-col justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] font-semibold uppercase px-2 py-0.5 ${
                                  ach.category === "college_level" ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                                  ach.category === "student_level" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                                  ach.category === "faculty_research" ? "bg-purple-500/10 text-purple-600 border-purple-200" :
                                  ach.category === "international" ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                                  "bg-rose-500/10 text-rose-600 border-rose-200"
                                }`}>
                                  {ach.level_label || ach.category?.replace(/_/g, " ")}
                                </Badge>
                                {ach.year && (
                                  <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {ach.year}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => handleOpenEditAchievement(ach)}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteAchievement(ach.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <h4 className="text-sm font-bold text-foreground leading-snug">
                              {ach.title}
                            </h4>

                            {ach.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {ach.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground">{ach.recipient_name || ach.department}</span>
                              {ach.awarding_body && <span> • {ach.awarding_body}</span>}
                            </div>

                            {ach.certificate_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] gap-1 px-2 border-primary/20 text-primary hover:bg-primary/5"
                                onClick={() => {
                                  setSelectedMediaForView({
                                    id: ach.id,
                                    category: "certificates",
                                    title: ach.title,
                                    filename: ach.certificate_filename || "certificate.pdf",
                                    s3_key: "",
                                    url: ach.certificate_url!,
                                    uploaded_at: ach.year || ""
                                  });
                                  setIsMediaModalOpen(true);
                                }}
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Proof</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Pagination Bar */}
                    {totalPages > 1 && (
                      <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="text-muted-foreground font-medium">
                          Showing <span className="font-bold text-foreground">{startIdx + 1}</span> to{" "}
                          <span className="font-bold text-foreground">{endIdx}</span> of{" "}
                          <span className="font-bold text-foreground">{totalItems}</span> achievements
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* First Page */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-xs"
                            disabled={currentPage === 1}
                            onClick={() => setAchievementPage(1)}
                            title="First Page"
                          >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                          </Button>

                          {/* Previous Page */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-xs"
                            disabled={currentPage === 1}
                            onClick={() => setAchievementPage(Math.max(1, currentPage - 1))}
                            title="Previous Page"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>

                          {/* Page Numbers */}
                          {renderPageNumbers().map((p, idx) => {
                            if (p === "...") {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground">
                                  ...
                                </span>
                              );
                            }
                            const pageNum = Number(p);
                            const isActive = pageNum === currentPage;
                            return (
                              <Button
                                key={`page-${pageNum}`}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                className={`h-8 w-8 text-xs font-semibold p-0 ${
                                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                                }`}
                                onClick={() => setAchievementPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}

                          {/* Next Page */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-xs"
                            disabled={currentPage === totalPages}
                            onClick={() => setAchievementPage(Math.min(totalPages, currentPage + 1))}
                            title="Next Page"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>

                          {/* Last Page */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-xs"
                            disabled={currentPage === totalPages}
                            onClick={() => setAchievementPage(totalPages)}
                            title="Last Page"
                          >
                            <ChevronsRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Faculty & Students Enrollment */}
        <TabsContent value="faculty-students" className="space-y-6">
          {/* Faculty Summary */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Teaching Faculty & Staff Strength
              </CardTitle>
              <CardDescription className="text-xs">
                Cadre distribution, Ph.D. qualifications and Student-to-Faculty Ratio (SFR)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Total Faculty</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm"
                  value={formData.no_of_teachers || 0}
                  onChange={(e) => handleInputChange("no_of_teachers", Number(e.target.value))}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Professors</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm"
                  value={formData.professors_count || 0}
                  onChange={(e) => handleInputChange("professors_count", Number(e.target.value))}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Assoc. Professors</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm"
                  value={formData.assoc_professors_count || 0}
                  onChange={(e) => handleInputChange("assoc_professors_count", Number(e.target.value))}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Asst. Professors</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm"
                  value={formData.asst_professors_count || 0}
                  onChange={(e) => handleInputChange("asst_professors_count", Number(e.target.value))}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">Ph.D. Qualified</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm"
                  value={formData.phd_faculty_count || 0}
                  onChange={(e) => handleInputChange("phd_faculty_count", Number(e.target.value))}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block">SFR Ratio</span>
                <Input
                  className="h-8 mt-1 font-bold text-sm"
                  value={formData.student_faculty_ratio || "1:15"}
                  onChange={(e) => handleInputChange("student_faculty_ratio", e.target.value)}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block text-amber-600 dark:text-amber-400">Vacancies</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm border-amber-200 focus-visible:ring-amber-500"
                  value={formData.faculty_vacancies || 0}
                  onChange={(e) => handleInputChange("faculty_vacancies", Number(e.target.value))}
                />
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                <span className="text-[11px] text-muted-foreground block text-red-600 dark:text-red-400">Shortage</span>
                <Input
                  type="number"
                  className="h-8 mt-1 font-bold text-sm border-red-200 focus-visible:ring-red-500"
                  value={formData.faculty_shortage || 0}
                  onChange={(e) => handleInputChange("faculty_shortage", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Student Branch Matrix */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                  <Users className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                  Department / Program-wise Student Enrollment
                </CardTitle>
                <CardDescription className="text-xs">
                  Breakdown by engineering departments and gender distribution
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" className="w-full sm:w-auto h-8 gap-1 text-xs justify-center" onClick={handleAddBranchRow}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[550px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                      <th className="p-2.5">Department / Program</th>
                      <th className="p-2.5 w-28">Code</th>
                      <th className="p-2.5 w-28">Boys</th>
                      <th className="p-2.5 w-28">Girls</th>
                      <th className="p-2.5 w-28 font-bold">Total</th>
                      <th className="p-2.5 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.student_details_class_wise?.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs font-medium"
                            value={row.branch}
                            onChange={(e) => handleUpdateBranchRow(idx, "branch", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs uppercase"
                            value={row.branch_code || ""}
                            onChange={(e) => handleUpdateBranchRow(idx, "branch_code", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={row.boys}
                            onChange={(e) => handleUpdateBranchRow(idx, "boys", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={row.girls}
                            onChange={(e) => handleUpdateBranchRow(idx, "girls", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2 font-bold text-sm">
                          {row.total || (Number(row.boys || 0) + Number(row.girls || 0))}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteBranchRow(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Fee Structure Tab */}
        <TabsContent value="fee-structure" className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                  <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                  Approved Institutional Fee Structure
                </CardTitle>
                <CardDescription className="text-xs">
                  Government & Management quota annual fees as approved by the Fee Regulatory Authority
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" className="w-full sm:w-auto h-8 gap-1 text-xs justify-center" onClick={handleAddFeeRow}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fee Category</span>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[550px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                      <th className="p-2.5">Academic Standard / Quota</th>
                      <th className="p-2.5 w-40">Tuition Fee (₹)</th>
                      <th className="p-2.5 w-40">Dev & Exam Fee (₹)</th>
                      <th className="p-2.5 w-40 font-bold">Total Annual Fee (₹)</th>
                      <th className="p-2.5 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.fee_structure_data?.map((fee, idx) => (
                      <tr key={idx} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs font-medium"
                            value={fee.standard}
                            onChange={(e) => handleUpdateFeeRow(idx, "standard", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs"
                            value={fee.notified_fee}
                            onChange={(e) => handleUpdateFeeRow(idx, "notified_fee", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs"
                            value={fee.exam_dev_fee}
                            onChange={(e) => handleUpdateFeeRow(idx, "exam_dev_fee", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 text-xs font-bold"
                            value={fee.total}
                            onChange={(e) => handleUpdateFeeRow(idx, "total", e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteFeeRow(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Inspection & Regulatory Compliance Tab */}
        <TabsContent value="inspection" className="space-y-6">
          {/* Card 1: Statutory Clearances & Safety */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Flame className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Statutory Clearances & Safety Certifications (AICTE / LIC Norms)
              </CardTitle>
              <CardDescription className="text-xs">
                Mandatory occupancy, fire safety, structural stability, and environmental clearances
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Fire Safety Certificate / NOC <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={formData.fire_safety_certificate || "Valid"}
                  onValueChange={(val) => handleInputChange("fire_safety_certificate", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Fire NOC Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Valid">Valid & Approved</SelectItem>
                    <SelectItem value="Under Renewal">Under Renewal / Applied</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
                {renderInlineUploader("fire_safety_certificate", "Fire Safety NOC Certificate")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fire NOC Validity Date</Label>
                <Input
                  type="date"
                  value={formData.fire_safety_validity || ""}
                  onChange={(e) => handleInputChange("fire_safety_validity", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Building Occupancy / Sanction Plan <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={formData.building_occupancy_certificate || "Approved & Available"}
                  onValueChange={(val) => handleInputChange("building_occupancy_certificate", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Occupancy Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved & Available">Approved & Available</SelectItem>
                    <SelectItem value="Temporary NOC">Temporary NOC</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
                {renderInlineUploader("building_occupancy_certificate", "Building Occupancy Certificate")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Structural Stability Certificate <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Select
                  value={formData.structural_stability_certificate || "Certified"}
                  onValueChange={(val) => handleInputChange("structural_stability_certificate", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Stability Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certified">Certified by Registered Engineer</SelectItem>
                    <SelectItem value="In-Process">In-Process / Under Inspection</SelectItem>
                    <SelectItem value="Not Certified">Not Certified</SelectItem>
                  </SelectContent>
                </Select>
                {renderInlineUploader("structural_stability_certificate", "Structural Stability Certificate")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Land Ownership / Title Deed</Label>
                <Select
                  value={formData.land_ownership_type || "Owned"}
                  onValueChange={(val) => handleInputChange("land_ownership_type", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Land Ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owned">Owned (Clear Title Deed)</SelectItem>
                    <SelectItem value="Government Allotted">Government Allotted</SelectItem>
                    <SelectItem value="Leased (30+ Years)">Leased (Registered 30+ Years)</SelectItem>
                    <SelectItem value="Leased (<30 Years)">Leased (Less than 30 Years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Environmental Clearance (Pollution Board)</Label>
                <Select
                  value={formData.environmental_clearance || "Valid"}
                  onValueChange={(val) => handleInputChange("environmental_clearance", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Pollution Clearance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Valid">Valid & Approved</SelectItem>
                    <SelectItem value="Exempted">Exempted</SelectItem>
                    <SelectItem value="In-Process">In-Process / Applied</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Statutory Welfare & Redressal Committees */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Statutory Welfare & Redressal Cells (UGC / AICTE / POSH Act)
              </CardTitle>
              <CardDescription className="text-xs">
                Mandatory committees required for AICTE, UGC, and Affiliating University annual LIC inspection
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">SC / ST / OBC & Minority Welfare Cell</Label>
                <Select
                  value={formData.sc_st_cell_constituted || "YES"}
                  onValueChange={(val) => handleInputChange("sc_st_cell_constituted", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SC/ST Cell Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - Constituted & Active</SelectItem>
                    <SelectItem value="NO">NO - Not Formed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Student Grievance Redressal Committee (SGRC)</Label>
                <Select
                  value={formData.student_grievance_committee || "YES"}
                  onValueChange={(val) => handleInputChange("student_grievance_committee", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SGRC Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - With Ombudsperson Appointed</SelectItem>
                    <SelectItem value="Internal Only">YES - Internal Cell Only</SelectItem>
                    <SelectItem value="NO">NO - Not Formed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Anti-Ragging Squad & 24x7 Helpline</Label>
                <Select
                  value={formData.anti_ragging_squad_active || "YES"}
                  onValueChange={(val) => handleInputChange("anti_ragging_squad_active", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Anti-Ragging Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - 24x7 Squad & Boards Displayed</SelectItem>
                    <SelectItem value="Committee Only">YES - Committee Formed Only</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Institution Innovation Council (IIC / EDC)</Label>
                <Select
                  value={formData.iic_incubation_cell || "YES"}
                  onValueChange={(val) => handleInputChange("iic_incubation_cell", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select IIC Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - MoE / AICTE Recognized</SelectItem>
                    <SelectItem value="College Level">YES - College Level Cell</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Active Industry MOUs & Placement Tie-ups</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.placement_mous_count ?? 0}
                  onChange={(e) => handleInputChange("placement_mous_count", parseInt(e.target.value) || 0)}
                  placeholder="e.g. 15"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Academic & Research Standards */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Academic Standards & Research Quality (NAAC / NBA)
              </CardTitle>
              <CardDescription className="text-xs">
                Biometric attendance, computing benchmarks, language lab, and research outputs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Biometric / Face Attendance System</Label>
                <Select
                  value={formData.biometric_attendance_system || "YES"}
                  onValueChange={(val) => handleInputChange("biometric_attendance_system", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Biometric Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - Active for All Staff & Faculty</SelectItem>
                    <SelectItem value="Partial">Partial (Teaching Staff Only)</SelectItem>
                    <SelectItem value="NO">NO - Manual Register</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Student-to-Computer Ratio (AICTE Norm: 1:4)</Label>
                <Select
                  value={formData.student_computer_ratio || "1:4"}
                  onValueChange={(val) => handleInputChange("student_computer_ratio", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:4">1:4 (Fully Compliant)</SelectItem>
                    <SelectItem value="1:6">1:6 (Standard)</SelectItem>
                    <SelectItem value="1:8">1:8</SelectItem>
                    <SelectItem value="1:10+">1:10 or higher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Language & Communication Skills Lab</Label>
                <Select
                  value={formData.language_lab_available || "YES"}
                  onValueChange={(val) => handleInputChange("language_lab_available", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language Lab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - Dedicated Digital Audio-Visual Lab</SelectItem>
                    <SelectItem value="Shared">YES - Shared Computer Lab</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Sponsored Research Grants (₹ in Lakhs)</Label>
                <Input
                  value={formData.research_grants_lakhs || ""}
                  onChange={(e) => handleInputChange("research_grants_lakhs", e.target.value)}
                  placeholder="e.g. ₹ 25.5 Lakhs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Published Patents / Innovations Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.patents_published_count ?? 0}
                  onChange={(e) => handleInputChange("patents_published_count", parseInt(e.target.value) || 0)}
                  placeholder="e.g. 6"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Financial & Endowment Disclosures */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-start sm:items-center gap-2 leading-snug">
                <Landmark className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                Financial Endowments & Mandatory Disclosures
              </CardTitle>
              <CardDescription className="text-xs">
                Joint fixed deposits with university, audited statements, and mandatory web disclosures
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Joint Fixed Deposit (FDR) with University / DTE</Label>
                <Select
                  value={formData.joint_fdr_with_university || "YES"}
                  onValueChange={(val) => handleInputChange("joint_fdr_with_university", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Joint FDR Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - Valid Joint FDR Maintained</SelectItem>
                    <SelectItem value="Fixed Deposit Only">YES - College Fixed Deposit Only</SelectItem>
                    <SelectItem value="Pending">Under Renewal / Pending</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
                {renderInlineUploader("joint_fdr_receipt", "Joint FDR Receipt Copy")}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Joint FDR Corpus Amount</Label>
                <Input
                  value={formData.joint_fdr_amount_lakhs || ""}
                  onChange={(e) => handleInputChange("joint_fdr_amount_lakhs", e.target.value)}
                  placeholder="e.g. ₹ 100 Lakhs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Audited Financial Statements (Last 3 Years)</Label>
                <Select
                  value={formData.audited_balance_sheet_available || "YES"}
                  onValueChange={(val) => handleInputChange("audited_balance_sheet_available", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Audit Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES - Last 3 Years Certified by CA</SelectItem>
                    <SelectItem value="Last 1 Year">YES - Last 1 Year Certified</SelectItem>
                    <SelectItem value="Under Audit">Under Audit</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
                {renderInlineUploader("audited_balance_sheet", "Audited Financial Balance Sheet")}
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="text-xs">AICTE / UGC Mandatory Disclosure Web Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.mandatory_disclosure_url || ""}
                    onChange={(e) => handleInputChange("mandatory_disclosure_url", e.target.value)}
                    placeholder="https://yourcollege.edu.in/mandatory-disclosure"
                  />
                  {formData.mandatory_disclosure_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => window.open(formData.mandatory_disclosure_url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf"
        />
      </Tabs>

      {/* Scalable On-Demand Media Viewer Modal */}
      <MediaInspectionModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        mediaItem={selectedMediaForView}
        onDelete={handleDeleteMedia}
      />

      {/* Standard Printable College Report Card Modal */}
      <CollegeReportCardModal
        isOpen={isReportCardModalOpen}
        onClose={() => setIsReportCardModalOpen(false)}
        data={formData}
      />

      {/* Add / Edit Achievement Modal Dialog */}
      <Dialog
        open={isAchievementModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAchievementModalOpen(false);
            setEditingAchievement(null);
          }
        }}
      >
        <DialogContent className="max-w-xl w-[95vw] p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {editingAchievement?.id && formData?.achievements_data?.some((a) => a.id === editingAchievement.id)
                ? "Edit Achievement / Award"
                : "Record New Institutional Achievement"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in the achievement details, recipient or team, awarding organization, and proof document (Max 1 MB).
            </DialogDescription>
          </DialogHeader>

          {editingAchievement && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Achievement / Award Title <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  value={editingAchievement.title || ""}
                  onChange={(e) =>
                    setEditingAchievement({ ...editingAchievement, title: e.target.value })
                  }
                  placeholder="e.g. 1st Place Winner - Smart India Hackathon"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Category / Level <span className="text-red-500 font-bold ml-0.5">*</span>
                  </Label>
                  <Select
                    value={editingAchievement.category || "college_level"}
                    onValueChange={(val) => {
                      const labels: Record<string, string> = {
                        college_level: "Institutional / College Level",
                        student_level: "Student / Team Level",
                        faculty_research: "Faculty & Research Level",
                        state_national: "State / National Level",
                        international: "International Level"
                      };
                      setEditingAchievement({
                        ...editingAchievement,
                        category: val,
                        level_label: labels[val] || val
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college_level">Institutional / College Level</SelectItem>
                      <SelectItem value="student_level">Student / Team Level</SelectItem>
                      <SelectItem value="faculty_research">Faculty & Research Level</SelectItem>
                      <SelectItem value="state_national">State / National Level</SelectItem>
                      <SelectItem value="international">International Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Academic Year / Year</Label>
                  <Input
                    value={editingAchievement.year || ""}
                    onChange={(e) =>
                      setEditingAchievement({ ...editingAchievement, year: e.target.value })
                    }
                    placeholder="e.g. 2025-26"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Recipient / Student / Faculty Team</Label>
                  <Input
                    value={editingAchievement.recipient_name || ""}
                    onChange={(e) =>
                      setEditingAchievement({ ...editingAchievement, recipient_name: e.target.value })
                    }
                    placeholder="e.g. Rahul Sharma & Team or Dr. C. R. Ramesh"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Department / Unit</Label>
                  <Input
                    value={editingAchievement.department || ""}
                    onChange={(e) =>
                      setEditingAchievement({ ...editingAchievement, department: e.target.value })
                    }
                    placeholder="e.g. Computer Science & Engg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Awarding Body / Organization</Label>
                <Input
                  value={editingAchievement.awarding_body || ""}
                  onChange={(e) =>
                    setEditingAchievement({ ...editingAchievement, awarding_body: e.target.value })
                  }
                  placeholder="e.g. AICTE, NAAC, IEEE, DST-SERB, Govt of Karnataka"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Brief Description / Citation</Label>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      countWords(editingAchievement.description) > 50
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold"
                        : countWords(editingAchievement.description) > 40
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {countWords(editingAchievement.description)} / 50 words
                  </span>
                </div>
                <Textarea
                  rows={2}
                  value={editingAchievement.description || ""}
                  onChange={(e) =>
                    setEditingAchievement({ ...editingAchievement, description: e.target.value })
                  }
                  placeholder="Summary of achievement, cash prize, patent grant details, or conference name..."
                  className={
                    countWords(editingAchievement.description) > 50
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {countWords(editingAchievement.description) > 50 && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Description exceeds 50 words limit by {countWords(editingAchievement.description) - 50} words. Maximum allowed is 50 words.
                  </p>
                )}
              </div>

              {/* Certificate / Proof Upload with strict 1MB limit */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Attach Proof Document / Certificate
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                    Max Size: 1 MB
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    className="h-8 text-xs file:mr-2 file:h-6 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-[11px] hover:file:bg-primary/20 cursor-pointer"
                    accept="image/*,.pdf"
                    onChange={handleAchievementCertificateUpload}
                    disabled={isUploading}
                  />
                </div>

                {editingAchievement.certificate_url && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                    <span className="truncate flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      {editingAchievement.certificate_filename || "Attached Certificate"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] text-destructive hover:bg-destructive/10 px-1"
                      onClick={() =>
                        setEditingAchievement({
                          ...editingAchievement,
                          certificate_url: "",
                          certificate_filename: ""
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAchievementModalOpen(false);
                setEditingAchievement(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5"
              onClick={handleSaveAchievement}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Achievement</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollegeDetailsPage;
