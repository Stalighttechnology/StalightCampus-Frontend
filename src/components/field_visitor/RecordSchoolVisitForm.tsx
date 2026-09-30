import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../lib/utils";
import {
  getAvailableOrganizations,
  createFieldVisit,
  uploadInspectionEvidencePhoto,
  OrganizationOption,
  PhotoAttachment,
} from "../../utils/field_visitor_api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { TimePicker } from "../ui/time-picker";
import Swal from "sweetalert2";
import {
  Building2,
  Calendar,
  Clock,
  User,
  Users,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Star,
  Sparkles,
  Search,
  School,
  Utensils,
  Home,
  ShieldCheck,
  Send,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Eye,
  ExternalLink,
  ImagePlus,
  X,
} from "lucide-react";

interface RecordSchoolVisitFormProps {
  initialOrgId?: number;
  onSuccess?: () => void;
}

export const RecordSchoolVisitForm: React.FC<RecordSchoolVisitFormProps> = ({
  initialOrgId,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgs, setOrgs] = useState<OrganizationOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOption | null>(null);

  // Single Form State
  const [formData, setFormData] = useState({
    // Logistics
    org_id: initialOrgId || 0,
    visit_date: new Date().toISOString().split("T")[0],
    visit_time: new Date().toTimeString().slice(0, 5),
    departure_time: "",
    school_name: "",
    school_code: "",
    school_address: "",
    accompanying_officials: "",

    // Stakeholder Interaction
    principal_name: "",
    principal_contact: "",
    principal_interaction_notes: "",
    student_interaction_notes: "",
    student_count_present: "",
    teachers_count_present: "",

    // Classroom Inspection
    classroom_cleanliness: "Good",
    classroom_seating: "Adequate",
    classroom_ventilation: "Good",
    classroom_boards: "Functional",
    classroom_rating: 4,
    classroom_remarks: "",

    // Hostel Inspection
    has_hostel: false,
    hostel_hygiene: "Satisfactory",
    hostel_safety: "Adequate",
    hostel_condition: "Good",
    hostel_rating: 4,
    hostel_remarks: "",

    // Kitchen / Mess Inspection
    kitchen_cleanliness: "Good",
    kitchen_food_quality: "Good",
    kitchen_drinking_water: true,
    kitchen_storage: "Hygienic",
    kitchen_rating: 4,
    kitchen_remarks: "",

    // Infrastructure & Docs
    library_status: "Active & Stocked",
    lab_equipment: "Functional",
    fire_safety: true,
    registers_verified: true,
    infra_rating: 4,
    infra_remarks: "",

    // Observations, Actions & Score
    observations: "",
    corrective_action: "",
    action_deadline: "",
    follow_up_status: "SUBMITTED" as const,
    overall_score_rating: 4.5,
  });

  // Photos State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [newPhotoCategory, setNewPhotoCategory] = useState<PhotoAttachment["category"]>("general");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<{ url: string; caption?: string; category?: string } | null>(null);

  // Compress image to ensure it stays well within the 1 MB limit
  const compressImageToMax1MB = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }
    // If already under 1MB (1,048,576 bytes), return as is
    if (file.size <= 1024 * 1024) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxDimension = 1920;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Try 0.8 quality first
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                  { type: "image/jpeg", lastModified: Date.now() }
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.8
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const resetForm = (targetOrg?: OrganizationOption) => {
    const org = targetOrg || selectedOrg || orgs[0];
    setFormData({
      org_id: org?.id || 0,
      visit_date: new Date().toISOString().split("T")[0],
      visit_time: new Date().toTimeString().slice(0, 5),
      departure_time: "",
      school_name: org?.name || "",
      school_code: org?.domain || `ORG-${org?.id || 0}`,
      school_address: "",
      accompanying_officials: "",

      principal_name: org?.principal_name || "",
      principal_contact: org?.principal_phone || org?.principal_email || "",
      principal_interaction_notes: "",
      student_interaction_notes: "",
      student_count_present: "",
      teachers_count_present: "",

      classroom_cleanliness: "Good",
      classroom_seating: "Adequate",
      classroom_ventilation: "Good",
      classroom_boards: "Functional",
      classroom_rating: 4,
      classroom_remarks: "",

      has_hostel: false,
      hostel_hygiene: "Satisfactory",
      hostel_safety: "Adequate",
      hostel_condition: "Good",
      hostel_rating: 4,
      hostel_remarks: "",

      kitchen_cleanliness: "Good",
      kitchen_food_quality: "Good",
      kitchen_drinking_water: true,
      kitchen_storage: "Hygienic",
      kitchen_rating: 4,
      kitchen_remarks: "",

      library_status: "Active & Stocked",
      lab_equipment: "Functional",
      fire_safety: true,
      registers_verified: true,
      infra_rating: 4,
      infra_remarks: "",

      observations: "",
      corrective_action: "",
      action_deadline: "",
      follow_up_status: "SUBMITTED",
      overall_score_rating: 4.5,
    });
    setPhotos([]);
    setNewPhotoUrl("");
    setNewPhotoCaption("");
  };

  // Load organizations on mount or when initialOrgId changes
  useEffect(() => {
    loadOrganizations();
  }, [initialOrgId]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    const res = await getAvailableOrganizations();
    if (res.success && res.organizations.length > 0) {
      setOrgs(res.organizations);
      const targetId = initialOrgId || res.organizations[0]?.id;
      const matched = res.organizations.find((o) => o.id === targetId) || res.organizations[0];
      if (matched) {
        handleSelectOrg(matched);
      }
    }
    setLoadingOrgs(false);
  };

  const handleSelectOrg = (org: OrganizationOption) => {
    setSelectedOrg(org);
    setFormData((prev) => ({
      ...prev,
      org_id: org.id,
      school_name: org.name,
      school_code: org.domain || `ORG-${org.id}`,
      principal_name: org.principal_name || prev.principal_name,
      principal_contact: org.principal_phone || org.principal_email || prev.principal_contact,
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Photo Handling
  const handleAddPhotoUrl = () => {
    if (!newPhotoUrl.trim()) return;
    setPhotos((prev) => [
      ...prev,
      {
        url: newPhotoUrl.trim(),
        caption: newPhotoCaption.trim() || "Inspection evidence photo",
        category: newPhotoCategory,
      },
    ]);
    setNewPhotoUrl("");
    setNewPhotoCaption("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.org_id) {
      Swal.fire({
        title: "Select Institution First",
        text: "Please select the target school/institution in Section 1 before uploading inspection evidence.",
        icon: "warning",
      });
      e.target.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      // Automatically compress image if needed
      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        fileToUpload = await compressImageToMax1MB(file);
      }

      // Max 1MB size validation
      const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB
      if (fileToUpload.size > MAX_SIZE_BYTES) {
        Swal.fire({
          title: "File Exceeds 1 MB",
          text: `Selected file is ${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB. Please choose a file or photo under 1 MB.`,
          icon: "warning",
        });
        setUploadingPhoto(false);
        e.target.value = "";
        return;
      }

      const res = await uploadInspectionEvidencePhoto(
        fileToUpload,
        formData.org_id,
        newPhotoCategory || "general",
        newPhotoCaption.trim() || file.name
      );

      if (res.success && res.attachment?.url) {
        setPhotos((prev) => [
          ...prev,
          {
            url: res.attachment!.url,
            caption: res.attachment?.caption || newPhotoCaption.trim() || file.name,
            category: newPhotoCategory || "general",
          },
        ]);
        setNewPhotoCaption("");
        Swal.fire({
          title: "Photo Uploaded!",
          text: "Inspection evidence photo has been uploaded and stored securely on Cloudflare R2.",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#059669",
          timer: 2200,
        });
      } else {
        Swal.fire({
          title: "Upload Failed",
          text: res.message || "Failed to upload photo to Cloudflare R2",
          icon: "error",
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      Swal.fire({
        title: "Upload Error",
        text: "Network error occurred while uploading evidence to Cloudflare R2.",
        icon: "error",
      });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Auto-Generated Report Summary
  const generateReportSummary = () => {
    const dateStr = formData.visit_date;
    const school = formData.school_name || selectedOrg?.name || "Target Institution";
    return `### OFFICIAL FIELD INSPECTION REPORT
**Institution:** ${school}
**Date of Inspection:** ${dateStr} | **Arrival:** ${formData.visit_time} ${formData.departure_time ? `| **Departure:** ${formData.departure_time}` : ''}
**Accompanying Officials:** ${formData.accompanying_officials || 'None'}

---
#### 1. Stakeholder Interaction
* **Principal / Headmaster:** ${formData.principal_name || 'N/A'} (${formData.principal_contact || 'N/A'})
* **Principal Discussion:** ${formData.principal_interaction_notes || 'Satisfactory institutional review.'}
* **Student Dialogue:** ${formData.student_interaction_notes || 'Interacted with students regarding curriculum and basic amenities.'}
* **Headcounts on Record:** Students Present: ${formData.student_count_present || 'Recorded'} | Teachers Present: ${formData.teachers_count_present || 'Recorded'}

---
#### 2. Facility Checklists & Audit Scores
* **Classrooms (⭐ ${formData.classroom_rating}/5):** Cleanliness: ${formData.classroom_cleanliness} | Seating: ${formData.classroom_seating} | Boards: ${formData.classroom_boards}. ${formData.classroom_remarks}
* **Hostel (⭐ ${formData.has_hostel ? `${formData.hostel_rating}/5` : 'N/A'}):** ${formData.has_hostel ? `Hygiene: ${formData.hostel_hygiene} | Safety: ${formData.hostel_safety}. ${formData.hostel_remarks}` : 'No hostel facility present.'}
* **Kitchen & Mess (⭐ ${formData.kitchen_rating}/5):** Food Quality: ${formData.kitchen_food_quality} | Cleanliness: ${formData.kitchen_cleanliness} | Drinking Water: ${formData.kitchen_drinking_water ? 'Potable & Safe' : 'Action Needed'}. ${formData.kitchen_remarks}
* **Infrastructure & Records (⭐ ${formData.infra_rating}/5):** Library: ${formData.library_status} | Labs: ${formData.lab_equipment} | Fire Safety: ${formData.fire_safety ? 'Compliant' : 'Non-compliant'} | Registers: ${formData.registers_verified ? 'Verified' : 'Pending'}. ${formData.infra_remarks}

---
#### 3. Key Observations & Action Plan
* **Observations:** ${formData.observations || 'Routine inspection completed.'}
* **Required Corrective Actions:** ${formData.corrective_action || 'Maintain current quality standards.'}
* **Action Deadline:** ${formData.action_deadline || 'Open / Routine'}
* **Overall Assessment Index:** ⭐ ${formData.overall_score_rating} / 5.0 (${formData.follow_up_status})`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.org_id) {
      Swal.fire({
        title: "School Required",
        text: "Please select an organization/school from the list.",
        icon: "warning",
      });
      return;
    }

    if (!formData.observations.trim()) {
      Swal.fire({
        title: "Observations Required",
        text: "Please enter your key observations and findings.",
        icon: "warning",
      });
      return;
    }

    const schoolDisplayName = formData.school_name || selectedOrg?.name || "the selected school";
    const confirmResult = await Swal.fire({
      title: "Confirm Inspection Submission",
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
          <p style="margin-bottom: 0.75rem;">Are you sure you want to file and submit this inspection report for <strong>${schoolDisplayName}</strong>?</p>
          <div style="background-color: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 6px; padding: 10px; font-size: 0.8rem; margin-bottom: 0.75rem;">
            <div><strong>• Inspection Date:</strong> ${formData.visit_date}</div>
            <div><strong>• Overall Rating:</strong> ⭐ ${formData.overall_score_rating} / 5.0</div>
            <div><strong>• Evidence Photos:</strong> ${photos.length} item(s) attached</div>
            <div><strong>• Follow-up Status:</strong> <span style="text-transform: uppercase; font-weight: 600;">${formData.follow_up_status}</span></div>
          </div>
          <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">Once filed, this official inspection record will be immediately available to the institution's Principal.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, File Report",
      cancelButtonText: "Review Details",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      focusConfirm: true,
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setLoading(true);

    const payload = {
      org_id: formData.org_id,
      visit_date: formData.visit_date,
      visit_time: formData.visit_time || null,
      departure_time: formData.departure_time || null,
      school_name: formData.school_name,
      school_code: formData.school_code,
      school_address: formData.school_address,
      accompanying_officials: formData.accompanying_officials,

      principal_name: formData.principal_name,
      principal_contact: formData.principal_contact,
      principal_interaction_notes: formData.principal_interaction_notes,
      student_interaction_notes: formData.student_interaction_notes,
      student_count_present: Number(formData.student_count_present) || 0,
      teachers_count_present: Number(formData.teachers_count_present) || 0,

      classroom_inspection: {
        cleanliness: formData.classroom_cleanliness,
        seating_capacity: formData.classroom_seating,
        ventilation: formData.classroom_ventilation,
        blackboard_smartboard: formData.classroom_boards,
        rating: formData.classroom_rating,
        remarks: formData.classroom_remarks,
      },
      hostel_inspection: {
        has_hostel: formData.has_hostel,
        hygiene: formData.hostel_hygiene,
        safety_security: formData.hostel_safety,
        room_condition: formData.hostel_condition,
        rating: formData.hostel_rating,
        remarks: formData.hostel_remarks,
      },
      kitchen_mess_inspection: {
        cleanliness: formData.kitchen_cleanliness,
        food_quality: formData.kitchen_food_quality,
        drinking_water_safe: formData.kitchen_drinking_water,
        storage_condition: formData.kitchen_storage,
        rating: formData.kitchen_rating,
        remarks: formData.kitchen_remarks,
      },
      infrastructure_docs: {
        library_status: formData.library_status,
        lab_equipment: formData.lab_equipment,
        fire_safety_compliant: formData.fire_safety,
        registers_verified: formData.registers_verified,
        rating: formData.infra_rating,
        remarks: formData.infra_remarks,
      },

      photos: photos,
      observations: formData.observations,
      corrective_action: formData.corrective_action,
      action_deadline: formData.action_deadline || null,
      follow_up_status: formData.follow_up_status,
      overall_score_rating: formData.overall_score_rating,
      summary_report: generateReportSummary(),
    };

    try {
      const res = await createFieldVisit(payload);
      if (res.success) {
        Swal.fire({
          title: "Inspection Submitted!",
          text: "The field inspection report has been successfully recorded and linked to the institution Principal.",
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Record Another Inspection",
          cancelButtonText: "View History Records",
          confirmButtonColor: "#059669",
        }).then((result) => {
          resetForm();
          if (!result.isConfirmed && onSuccess) {
            onSuccess();
          }
        });
      } else {
        Swal.fire({
          title: "Submission Failed",
          text: res.message || "Failed to record visit",
          icon: "error",
        });
      }
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: "Network error while saving inspection record",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`users-container text-sm sm:text-base max-w-none mx-auto p-0 sm:p-2 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={`users-card border-0 sm:border rounded-none sm:rounded-xl ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="users-card-header border-b pb-3 sm:pb-4 px-3 sm:px-6">
          <div className="flex-1 min-w-0">
            <CardTitle className={`users-card-title text-lg sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Record School Visit
            </CardTitle>
            <p className={`users-card-desc text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Select the institution under your organization and complete the comprehensive inspection record.
            </p>
          </div>
        </CardHeader>

        <CardContent className="users-card-content pt-3 sm:pt-6 pb-8 px-2.5 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            {/* SECTION 1: Organization Selection & Logistics */}
            <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card/70 border-border' : 'bg-white border-gray-200'}`}>
              <CardHeader className={`pb-3 border-b ${theme === 'dark' ? 'border-border/40 bg-muted/20' : 'border-gray-100 bg-gray-50/60'}`}>
                <CardTitle className="text-base text-primary font-semibold">
                  1. Target Institution & Visit Logistics
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose the school from available organizations under your organization and set inspection timing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-4">
                {/* Organization Dropdown Selector */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Select Institution / School *
                  </label>
                  {loadingOrgs ? (
                    <div className="text-xs text-muted-foreground py-2">Loading available organizations...</div>
                  ) : (
                    <Select
                      value={formData.org_id ? String(formData.org_id) : ""}
                      onValueChange={(val) => {
                        const matched = orgs.find((o) => o.id === Number(val));
                        if (matched) handleSelectOrg(matched);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 sm:h-11 text-xs sm:text-sm">
                        <SelectValue placeholder="Choose an organization from the database" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 max-w-[95vw]">
                        {orgs.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            <div className="flex items-center justify-between gap-2 w-full text-left">
                              <span className="font-semibold truncate">{o.name}</span>
                              {o.principal_name && (
                                <span className="text-xs text-muted-foreground truncate shrink-0">
                                  ({o.principal_name})
                                </span>
                              )}
                              {(o as any).is_home_org && (
                                <Badge variant="secondary" className="text-[10px] ml-1 shrink-0">
                                  Home Org
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Visit Date *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs h-10 shadow-sm",
                      !formData.visit_date && "text-muted-foreground",
                      theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-primary shrink-0" />
                    {formData.visit_date ? (
                      format(new Date(formData.visit_date + "T00:00:00"), "PPP")
                    ) : (
                      <span>Pick visit date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover text-popover-foreground border shadow-md" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.visit_date ? new Date(formData.visit_date + "T00:00:00") : undefined}
                    onSelect={(d) => {
                      if (d) handleInputChange("visit_date", format(d, "yyyy-MM-dd"));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Arrival Time (12hr AM/PM)</label>
              <TimePicker
                value={formData.visit_time}
                onChange={(val) => handleInputChange("visit_time", val)}
                className={`h-10 ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Departure Time (12hr AM/PM)</label>
              <TimePicker
                value={formData.departure_time}
                onChange={(val) => handleInputChange("departure_time", val)}
                className={`h-10 ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
          </div>

          {/* Accompanying Officials & Campus Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Accompanying Team / Officials</label>
              <Input
                placeholder="e.g. Dy. Director, BEO, Quality Inspector"
                value={formData.accompanying_officials}
                onChange={(e) => handleInputChange("accompanying_officials", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Campus Location / Address</label>
              <Input
                placeholder="e.g. Main Road Campus, Sector 4"
                value={formData.school_address}
                onChange={(e) => handleInputChange("school_address", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Stakeholder Interactions */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary font-semibold">
            2. Stakeholder Interactions & Spot Headcounts
          </CardTitle>
          <CardDescription className="text-xs">
            Record Principal discussions, student learning dialogue, and spot attendance headcounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Principal / Headmaster Name</label>
              <Input
                placeholder="Principal name"
                value={formData.principal_name}
                onChange={(e) => handleInputChange("principal_name", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Principal Contact (Phone/Email)</label>
              <Input
                placeholder="Contact number or email"
                value={formData.principal_contact}
                onChange={(e) => handleInputChange("principal_contact", e.target.value)}
              />
            </div>
          </div>

          {/* Attendance counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Students Present (Spot Headcount)</label>
              <Input
                type="number"
                placeholder="e.g. 385"
                value={formData.student_count_present}
                onChange={(e) => handleInputChange("student_count_present", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Teaching & Staff Present</label>
              <Input
                type="number"
                placeholder="e.g. 24"
                value={formData.teachers_count_present}
                onChange={(e) => handleInputChange("teachers_count_present", e.target.value)}
              />
            </div>
          </div>

          {/* Principal & Student Notes */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Principal Discussion & Administrative Review
            </label>
            <Textarea
              rows={3}
              placeholder="Discussion notes regarding syllabus completion, staff attendance, student pass rates, infrastructure needs..."
              value={formData.principal_interaction_notes}
              onChange={(e) => handleInputChange("principal_interaction_notes", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Student Interaction & Learning Level Dialogue
            </label>
            <Textarea
              rows={3}
              placeholder="Direct feedback from student interactions: understanding of key subjects, textbook availability, mid-day meals..."
              value={formData.student_interaction_notes}
              onChange={(e) => handleInputChange("student_interaction_notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Multi-Point Facility Inspections */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary font-semibold">
            3. Multi-Point Facility Inspections & Checklists
          </CardTitle>
          <CardDescription className="text-xs">
            Inspect and score classrooms, hostel facilities, kitchen/mess, and infrastructure compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          {/* 3A. Classrooms */}
          <div className="p-3.5 border border-border rounded-lg bg-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <School className="w-4 h-4 text-primary" />
                Classroom & Learning Environment
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    onClick={() => handleInputChange("classroom_rating", s)}
                    className={`w-4 h-4 cursor-pointer ${
                      s <= formData.classroom_rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Cleanliness</label>
                <Select value={formData.classroom_cleanliness} onValueChange={(v) => handleInputChange("classroom_cleanliness", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select cleanliness" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Seating / Desks</label>
                <Select value={formData.classroom_seating} onValueChange={(v) => handleInputChange("classroom_seating", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select seating" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequate">Adequate</SelectItem>
                    <SelectItem value="Shortage">Shortage</SelectItem>
                    <SelectItem value="Damaged">Damaged Benches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Ventilation & Light</label>
                <Select value={formData.classroom_ventilation} onValueChange={(v) => handleInputChange("classroom_ventilation", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select ventilation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Board / Smartboard</label>
                <Select value={formData.classroom_boards} onValueChange={(v) => handleInputChange("classroom_boards", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select board" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              placeholder="Classroom remarks..."
              value={formData.classroom_remarks}
              onChange={(e) => handleInputChange("classroom_remarks", e.target.value)}
              className="text-xs"
            />
          </div>

          {/* 3B. Kitchen & Mess */}
          <div className="p-3.5 border border-border rounded-lg bg-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-emerald-500" />
                Kitchen, Mid-Day Meal & Mess
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    onClick={() => handleInputChange("kitchen_rating", s)}
                    className={`w-4 h-4 cursor-pointer ${
                      s <= formData.kitchen_rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Hygiene & Cleanliness</label>
                <Select value={formData.kitchen_cleanliness} onValueChange={(v) => handleInputChange("kitchen_cleanliness", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select cleanliness" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clean">Clean</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Unclean">Unclean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Food Taste / Quality</label>
                <Select value={formData.kitchen_food_quality} onValueChange={(v) => handleInputChange("kitchen_food_quality", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good Quality">Good Quality</SelectItem>
                    <SelectItem value="Acceptable">Acceptable</SelectItem>
                    <SelectItem value="Substandard">Substandard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Potable Drinking Water</label>
                <Select
                  value={formData.kitchen_drinking_water ? "Yes" : "No"}
                  onValueChange={(v) => handleInputChange("kitchen_drinking_water", v === "Yes")}
                >
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select drinking water" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes (RO / Safe)</SelectItem>
                    <SelectItem value="No">No / Not Safe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Ration Storage</label>
                <Select value={formData.kitchen_storage} onValueChange={(v) => handleInputChange("kitchen_storage", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select storage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hygienic">Hygienic</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Damp / Poor">Damp / Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              placeholder="Kitchen & food remarks..."
              value={formData.kitchen_remarks}
              onChange={(e) => handleInputChange("kitchen_remarks", e.target.value)}
              className="text-xs"
            />
          </div>

          {/* 3C. Hostel Facility */}
          <div className="p-3.5 border border-border rounded-lg bg-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-500" />
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_hostel}
                    onChange={(e) => handleInputChange("has_hostel", e.target.checked)}
                    className="rounded"
                  />
                  <span>Hostel Facility Present</span>
                </label>
              </div>
              {formData.has_hostel && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      onClick={() => handleInputChange("hostel_rating", s)}
                      className={`w-4 h-4 cursor-pointer ${
                        s <= formData.hostel_rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            {formData.has_hostel && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Hygiene & Washrooms</label>
                    <Select value={formData.hostel_hygiene} onValueChange={(v) => handleInputChange("hostel_hygiene", v)}>
                      <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select hygiene" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                        <SelectItem value="Needs Deep Cleaning">Needs Deep Cleaning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Safety & Warden Logs</label>
                    <Select value={formData.hostel_safety} onValueChange={(v) => handleInputChange("hostel_safety", v)}>
                      <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select safety" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adequate">Adequate</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Lax">Lax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Room Condition</label>
                    <Select value={formData.hostel_condition} onValueChange={(v) => handleInputChange("hostel_condition", v)}>
                      <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select condition" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Overcrowded">Overcrowded</SelectItem>
                        <SelectItem value="Poor Maintenance">Poor Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Input
                  placeholder="Hostel remarks..."
                  value={formData.hostel_remarks}
                  onChange={(e) => handleInputChange("hostel_remarks", e.target.value)}
                  className="text-xs"
                />
              </>
            )}
          </div>

          {/* 3D. Infrastructure & Document Checks */}
          <div className="p-3.5 border border-border rounded-lg bg-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                Infrastructure & Official Registers Checked
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    onClick={() => handleInputChange("infra_rating", s)}
                    className={`w-4 h-4 cursor-pointer ${
                      s <= formData.infra_rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Library Condition</label>
                <Select value={formData.library_status} onValueChange={(v) => handleInputChange("library_status", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active & Stocked">Active & Stocked</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Labs / Computers</label>
                <Select value={formData.lab_equipment} onValueChange={(v) => handleInputChange("lab_equipment", v)}>
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select labs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Non-Functional">Non-Functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Fire Safety Valid</label>
                <Select
                  value={formData.fire_safety ? "Yes" : "No"}
                  onValueChange={(v) => handleInputChange("fire_safety", v === "Yes")}
                >
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select fire safety" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes (Compliant)</SelectItem>
                    <SelectItem value="No">Expired / Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Registers Verified</label>
                <Select
                  value={formData.registers_verified ? "Yes" : "No"}
                  onValueChange={(v) => handleInputChange("registers_verified", v === "Yes")}
                >
                  <SelectTrigger className="h-9 w-full text-xs font-medium"><SelectValue placeholder="Select verification" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes (Verified)</SelectItem>
                    <SelectItem value="No">Discrepancies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              placeholder="Infrastructure remarks..."
              value={formData.infra_remarks}
              onChange={(e) => handleInputChange("infra_remarks", e.target.value)}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Photographs & Field Inspection Evidence */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 p-3.5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base text-primary font-semibold">
              4. Photographs & Field Inspection Evidence ({photos.length})
            </CardTitle>
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground w-fit shrink-0">
              Cloudflare R2 Storage
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Attach high-resolution photographic evidence for classrooms, kitchen/mess, hostel, washrooms, or compliance records. Files are organized securely under the selected school.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3.5 sm:p-6 pt-0">
          {/* Target Org Context Banner */}
          {selectedOrg && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
              <Building2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <div className="min-w-0 flex-1 break-words">
                <span className="font-semibold text-foreground">Evidence destination: </span>
                <span className="font-bold text-primary">{selectedOrg.name}</span>
                <div className="text-[10px] text-muted-foreground break-all mt-0.5">
                  organizations/{selectedOrg.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}/inspection_evidence/
                </div>
              </div>
            </div>
          )}

          {/* Upload Controls Box */}
          <div className="p-3 sm:p-4 bg-muted/40 border border-border rounded-lg space-y-3">
            <div className="space-y-3">
              {/* Evidence Category Dropdown */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Inspection Area / Category *
                </label>
                <Select value={newPhotoCategory} onValueChange={(v: any) => setNewPhotoCategory(v)}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm w-full">
                    <SelectValue placeholder="Select Inspection Category" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[95vw]">
                    <SelectItem value="general">📍 General Campus & Surroundings</SelectItem>
                    <SelectItem value="classroom">🏫 Classroom & Teaching Facilities</SelectItem>
                    <SelectItem value="kitchen">🍽️ Kitchen, Mess & Food Storage</SelectItem>
                    <SelectItem value="hostel">🛏️ Hostel & Living Quarters</SelectItem>
                    <SelectItem value="infrastructure">🔬 Infrastructure, Labs & Library</SelectItem>
                    <SelectItem value="document">📑 Documents, Registers & Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Caption Input */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Evidence Description / Caption
                </label>
                <Input
                  placeholder="e.g., RO drinking water plant inspection"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  className="h-10 text-xs sm:text-sm"
                />
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  disabled={uploadingPhoto}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="default"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 text-xs sm:text-sm font-medium gap-2 w-full cursor-pointer shadow-sm"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compressing & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      <span>Upload Photo / Capture</span>
                    </>
                  )}
                </Button>
                <span className="text-[10px] text-muted-foreground mt-1 text-center block">
                  Max size: 1 MB (Auto-compressed)
                </span>
              </div>
            </div>

            {/* Optional Direct URL Fallback */}
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Or link external photo URL (optional)..."
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPhotoUrl}
                disabled={!newPhotoUrl.trim()}
                className="h-9 text-xs shrink-0 w-full sm:w-auto"
              >
                Add URL
              </Button>
            </div>
          </div>

          {/* Photo Preview Grid */}
          {photos.length > 0 ? (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Attached Evidence Artifacts ({photos.length})</span>
                <span className="text-[11px] text-muted-foreground">Click photo to zoom</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative group border border-border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-all shadow-sm flex flex-col"
                  >
                    <div
                      className="relative h-28 bg-muted cursor-pointer overflow-hidden"
                      onClick={() => setPreviewModalUrl({ url: p.url, caption: p.caption, category: p.category })}
                    >
                      <img
                        src={p.url}
                        alt={p.caption || "Inspection Evidence"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          // Fallback icon for broken/external non-image URLs
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                        <Eye className="w-4 h-4" />
                        <span className="text-[11px] font-medium">View Full</span>
                      </div>
                    </div>

                    <div className="p-2 bg-card border-t border-border flex-1 flex flex-col justify-between">
                      <div>
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider mb-1 px-1.5 py-0">
                          {p.category || 'general'}
                        </Badge>
                        <p className="text-xs text-foreground font-medium line-clamp-2" title={p.caption}>
                          {p.caption || "Inspection evidence photo"}
                        </p>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[100px]">Cloudflare R2</span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary flex items-center gap-0.5"
                          title="Open full size in new tab"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(idx);
                      }}
                      className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 border border-dashed border-border rounded-lg text-center space-y-1 text-muted-foreground">
              <Camera className="w-8 h-8 mx-auto stroke-1 text-muted-foreground/60" />
              <p className="text-xs font-medium text-foreground">No inspection evidence photos attached yet</p>
              <p className="text-[11px]">Upload photos of classroom facilities, kitchen hygiene, washrooms, or lab equipment above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Photo Lightbox Modal rendered via Portal to cover entire viewport */}
      {previewModalUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setPreviewModalUrl(null)}
          >
            <div
              className="relative max-w-4xl w-full max-h-[90vh] bg-card text-card-foreground rounded-xl overflow-hidden border border-border shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3.5 border-b border-border bg-card">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-xs uppercase shrink-0">
                    {previewModalUrl.category || "General"}
                  </Badge>
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {previewModalUrl.caption || "Inspection Evidence"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <a
                    href={previewModalUrl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Full Size
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(null)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3 bg-black/10 flex items-center justify-center overflow-auto max-h-[75vh]">
                <img
                  src={previewModalUrl.url}
                  alt={previewModalUrl.caption || "Inspection Full Preview"}
                  className="max-h-[72vh] max-w-full w-auto object-contain rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* SECTION 5: Observations, Corrective Actions & Deadlines */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary font-semibold">
            5. Observations, Corrective Actions & Deadline
          </CardTitle>
          <CardDescription className="text-xs">
            Synthesize key inspection findings, specify mandatory rectifications, and assign deadlines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Critical Observations & Inspection Findings *
            </label>
            <Textarea
              rows={4}
              placeholder="Record major findings, positive highlights, deficiencies, or compliance gaps noted during inspection..."
              value={formData.observations}
              onChange={(e) => handleInputChange("observations", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Required Corrective Action / Rectification
              </label>
              <Textarea
                rows={3}
                placeholder="Specific action items that the Principal / Management must complete..."
                value={formData.corrective_action}
                onChange={(e) => handleInputChange("corrective_action", e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Corrective Action Deadline
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs h-10 shadow-sm",
                        !formData.action_deadline && "text-muted-foreground",
                        theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4 text-primary shrink-0" />
                      {formData.action_deadline ? (
                        format(new Date(formData.action_deadline + "T00:00:00"), "PPP")
                      ) : (
                        <span>Select compliance deadline</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50 bg-popover text-popover-foreground border shadow-md" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.action_deadline ? new Date(formData.action_deadline + "T00:00:00") : undefined}
                      onSelect={(d) => {
                        handleInputChange("action_deadline", d ? format(d, "yyyy-MM-dd") : "");
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Follow-Up Status
                </label>
                <Select value={formData.follow_up_status} onValueChange={(v: any) => handleInputChange("follow_up_status", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">Submitted / Routine</SelectItem>
                    <SelectItem value="ACTION_REQUIRED">Action Required (Needs Principal Response)</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="RESOLVED">Resolved / Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Overall Rating Score Bar */}
          <div className="p-3.5 bg-muted/40 border border-border rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Overall Institution Inspection Score</label>
              <Badge variant="default" className="text-xs font-bold bg-amber-500">
                ⭐ {formData.overall_score_rating} / 5.0
              </Badge>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={formData.overall_score_rating}
              onChange={(e) => handleInputChange("overall_score_rating", parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* Final Submission Action Bar */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 px-8 py-3 shadow-md text-sm cursor-pointer"
        >
          {loading ? (
            "Submitting Inspection Report..."
          ) : (
            <>
              <Send className="w-4 h-4" /> Submit & File School Inspection Report
            </>
          )}
        </Button>
      </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
