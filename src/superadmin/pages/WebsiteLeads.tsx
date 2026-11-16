import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Kanban,
  ListFilter,
  Plus,
  Search,
  Eye,
  Mail,
  Phone,
  Building,
  Calendar,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Briefcase,
  Cpu,
  Building2,
  Activity,
  Trash2,
  SlidersHorizontal,
  Clock,
  Download,
  ExternalLink,
  User as UserIcon,
  Pencil,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  getWebsiteLeads,
  updateWebsiteLeadStatus,
  editWebsiteLead,
  deleteWebsiteLead,
  createWebsiteLead,
  WebsiteLeadItem,
  FORM_CONFIGS,
  FormTableKey,
  LEAD_STATUS_OPTIONS,
} from "@/utils/supabaseWebsiteService";

export interface ServicePipelineStage {
  id: string;
  label: string;
  badgeClass: string;
  dotColor: string;
  borderColor: string;
}

const SERVICE_STAGES: ServicePipelineStage[] = [
  {
    id: "New",
    label: "New Enquiry",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotColor: "bg-blue-500",
    borderColor: "#3b82f6",
  },
  {
    id: "Contacted",
    label: "Contacted",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    dotColor: "bg-purple-500",
    borderColor: "#a855f7",
  },
  {
    id: "Interested",
    label: "Interested",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotColor: "bg-amber-500",
    borderColor: "#f59e0b",
  },
  {
    id: "In Progress",
    label: "In Progress",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    dotColor: "bg-indigo-500",
    borderColor: "#6366f1",
  },
  {
    id: "Not Interested",
    label: "Not Interested",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dotColor: "bg-rose-500",
    borderColor: "#f43f5e",
  },
  {
    id: "Closed",
    label: "Closed / Converted",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    borderColor: "#10b981",
  },
];

const getFormBadgeClasses = (formType: FormTableKey) => {
  switch (formType) {
    case "contact_inquiries":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900";
    case "admission_applications":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900";
    case "project_inquiries":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
    case "it_assessments":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900";
    case "neurocampus_inquiries":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900";
    case "neurosync_inquiries":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
};

const getFormIcon = (formType: FormTableKey) => {
  switch (formType) {
    case "contact_inquiries":
      return <Mail className="w-3.5 h-3.5" />;
    case "admission_applications":
      return <GraduationCap className="w-3.5 h-3.5" />;
    case "project_inquiries":
      return <Briefcase className="w-3.5 h-3.5" />;
    case "it_assessments":
      return <Cpu className="w-3.5 h-3.5" />;
    case "neurocampus_inquiries":
      return <Building2 className="w-3.5 h-3.5" />;
    case "neurosync_inquiries":
      return <Activity className="w-3.5 h-3.5" />;
    default:
      return <Mail className="w-3.5 h-3.5" />;
  }
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const PAGE_SIZE = 10;

const WebsiteLeads: React.FC = () => {
  const { theme } = useTheme();

  // Core Data States
  const [leads, setLeads] = useState<WebsiteLeadItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // View Mode: 'pipeline' (Sliding Kanban) or 'filtered_list' (Rows by Filter)
  const [viewMode, setViewMode] = useState<"pipeline" | "filtered_list">("pipeline");

  // Filtering Controls
  const [selectedForm, setSelectedForm] = useState<FormTableKey | "all">("all");
  const [activeFilterStage, setActiveFilterStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [listPage, setListPage] = useState<number>(1);

  // Detail Modal & Action States
  const [selectedLead, setSelectedLead] = useState<WebsiteLeadItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [leadToDelete, setLeadToDelete] = useState<WebsiteLeadItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [updatingLeadKey, setUpdatingLeadKey] = useState<string | null>(null);

  // Add Manual Lead Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newLeadFormType, setNewLeadFormType] = useState<FormTableKey>("contact_inquiries");
  const [newLeadName, setNewLeadName] = useState<string>("");
  const [newLeadEmail, setNewLeadEmail] = useState<string>("");
  const [newLeadPhone, setNewLeadPhone] = useState<string>("");
  const [newLeadCompany, setNewLeadCompany] = useState<string>("");
  const [newLeadSummary, setNewLeadSummary] = useState<string>("");
  const [newLeadStatus, setNewLeadStatus] = useState<string>("New");
  const [isSubmittingLead, setIsSubmittingLead] = useState<boolean>(false);

  // Edit Lead Modal States
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [leadToEdit, setLeadToEdit] = useState<WebsiteLeadItem | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editCompany, setEditCompany] = useState<string>("");
  const [editSummary, setEditSummary] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("New");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const openEditModal = (lead: WebsiteLeadItem) => {
    setLeadToEdit(lead);
    setEditName(lead.name || "");
    setEditEmail(lead.email || "");
    setEditPhone(lead.phone || "");
    setEditCompany(lead.companyOrOrg || "");
    setEditSummary(lead.summary || "");
    setEditStatus(lead.status || "New");
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadToEdit) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await editWebsiteLead(leadToEdit.formType, leadToEdit.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        companyOrOrg: editCompany.trim(),
        summary: editSummary.trim(),
        status: editStatus,
      });

      if (res.success) {
        toast.success("Lead updated successfully!");
        setLeads((prev) =>
          prev.map((item) =>
            item.id === leadToEdit.id && item.formType === leadToEdit.formType
              ? {
                  ...item,
                  name: editName.trim(),
                  email: editEmail.trim(),
                  phone: editPhone.trim(),
                  companyOrOrg: editCompany.trim(),
                  summary: editSummary.trim(),
                  status: editStatus,
                }
              : item
          )
        );
        if (selectedLead && selectedLead.id === leadToEdit.id && selectedLead.formType === leadToEdit.formType) {
          setSelectedLead({
            ...selectedLead,
            name: editName.trim(),
            email: editEmail.trim(),
            phone: editPhone.trim(),
            companyOrOrg: editCompany.trim(),
            summary: editSummary.trim(),
            status: editStatus,
          });
        }
        setShowEditModal(false);
        setLeadToEdit(null);
      } else {
        toast.error(res.message || "Failed to update lead");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error updating lead");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Horizontal Edge Scroll Ref for Sliding Kanban
  const scrollRef = useRef<{ id: number | null }>({ id: null });
  const startScrolling = (container: HTMLDivElement, direction: "left" | "right") => {
    if (scrollRef.current.id) return;
    const scrollSpeed = 8;
    const step = () => {
      if (direction === "left") {
        container.scrollLeft -= scrollSpeed;
      } else {
        container.scrollLeft += scrollSpeed;
      }
      scrollRef.current.id = requestAnimationFrame(step);
    };
    scrollRef.current.id = requestAnimationFrame(step);
  };
  const stopScrolling = () => {
    if (scrollRef.current.id) {
      cancelAnimationFrame(scrollRef.current.id);
      scrollRef.current.id = null;
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await getWebsiteLeads(selectedForm, "all");
      if (res.success) {
        setLeads(res.data);
        if (res.counts && Object.keys(res.counts).length > 0) {
          setCounts((prev) => ({ ...prev, ...res.counts }));
          if (typeof res.counts.all === "number") {
            localStorage.setItem("stalight_website_leads_last_viewed_count", res.counts.all.toString());
            window.dispatchEvent(new CustomEvent("stalight_website_leads_viewed"));
          }
        }
      } else {
        toast.error("Failed to load website submissions from Supabase");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error loading submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    setListPage(1);
  }, [selectedForm]);

  // Handle stage change with optimistic update
  const handleStatusChange = async (lead: WebsiteLeadItem, newStageId: string) => {
    if (lead.status === newStageId) return;

    const leadKey = `${lead.formType}_${lead.id}`;
    const prevStatus = lead.status;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id && item.formType === lead.formType
          ? { ...item, status: newStageId }
          : item
      )
    );
    if (selectedLead && selectedLead.id === lead.id && selectedLead.formType === lead.formType) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStageId } : null));
    }

    setUpdatingLeadKey(leadKey);
    try {
      const res = await updateWebsiteLeadStatus(lead.formType, lead.id, newStageId);
      if (res.success) {
        toast.success(`Lead moved to "${newStageId}"`);
      } else {
        toast.error(res.message || "Failed to update status in Supabase");
        // Revert on error
        setLeads((prev) =>
          prev.map((item) =>
            item.id === lead.id && item.formType === lead.formType
              ? { ...item, status: prevStatus }
              : item
          )
        );
        if (selectedLead && selectedLead.id === lead.id && selectedLead.formType === lead.formType) {
          setSelectedLead((prev) => (prev ? { ...prev, status: prevStatus } : null));
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Error updating lead status");
      // Revert on error
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id && item.formType === lead.formType
            ? { ...item, status: prevStatus }
            : item
        )
      );
    } finally {
      setUpdatingLeadKey(null);
    }
  };

  // Handle Manual Add Lead
  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadEmail.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    setIsSubmittingLead(true);
    try {
      const res = await createWebsiteLead({
        formType: newLeadFormType,
        name: newLeadName.trim(),
        email: newLeadEmail.trim(),
        phone: newLeadPhone.trim(),
        companyOrOrg: newLeadCompany.trim(),
        summary: newLeadSummary.trim(),
        status: newLeadStatus,
      });

      if (res.success) {
        toast.success("Lead added successfully!");
        setShowAddModal(false);
        setNewLeadName("");
        setNewLeadEmail("");
        setNewLeadPhone("");
        setNewLeadCompany("");
        setNewLeadSummary("");
        setNewLeadStatus("New");

        if (res.data && res.data.id) {
          setLeads((prev) => [res.data, ...prev.filter((l) => l.id !== res.data.id)]);
          setCounts((prev) => ({
            ...prev,
            all: (prev.all || 0) + 1,
            [newLeadFormType]: (prev[newLeadFormType] || 0) + 1,
          }));
        }
        fetchLeads();
      } else {
        toast.error(res.message || "Failed to add lead");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error adding lead");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteWebsiteLead(leadToDelete.formType, leadToDelete.id);
      if (res.success) {
        toast.success("Lead permanently deleted from Supabase");
        setLeads((prev) =>
          prev.filter((l) => !(l.id === leadToDelete.id && l.formType === leadToDelete.formType))
        );
        setCounts((prev) => ({
          ...prev,
          all: Math.max(0, (prev.all || 1) - 1),
          [leadToDelete.formType]: Math.max(0, (prev[leadToDelete.formType] || 1) - 1),
        }));
        if (selectedLead && selectedLead.id === leadToDelete.id && selectedLead.formType === leadToDelete.formType) {
          setIsDetailsOpen(false);
          setSelectedLead(null);
        }
        setLeadToDelete(null);
      } else {
        toast.error(res.message || "Failed to delete lead from Supabase");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error deleting lead");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to count leads for each stage dynamically
  const getStageCount = (stageId: string) => {
    if (stageId === "all") return leads.length;
    return leads.filter((l) => (l.status || "New").toLowerCase() === stageId.toLowerCase()).length;
  };

  // Filtered leads for the views
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Stage filter (used in list view)
      if (activeFilterStage !== "all") {
        if ((lead.status || "New").toLowerCase() !== activeFilterStage.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = lead.name?.toLowerCase().includes(q);
        const matchEmail = lead.email?.toLowerCase().includes(q);
        const matchPhone = lead.phone?.toLowerCase().includes(q);
        const matchCompany = lead.companyOrOrg?.toLowerCase().includes(q);
        const matchSummary = lead.summary?.toLowerCase().includes(q);
        const matchForm = lead.formLabel?.toLowerCase().includes(q);
        const matchStatus = lead.status?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCompany && !matchSummary && !matchForm && !matchStatus) {
          return false;
        }
      }

      return true;
    });
  }, [leads, activeFilterStage, searchQuery]);

  // Pagination for Filtering List
  const totalListCount = filteredLeads.length;
  const totalListPages = Math.ceil(totalListCount / PAGE_SIZE) || 1;

  const paginatedLeads = useMemo(() => {
    const start = (listPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, listPage]);

  useEffect(() => {
    setListPage(1);
  }, [activeFilterStage, searchQuery, selectedForm]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = [
      "ID",
      "Form Category",
      "Name",
      "Email",
      "Phone",
      "Company / Organization",
      "Status",
      "Summary / Message",
      "Submitted At",
    ];

    const rows = filteredLeads.map((item) => [
      `"${item.id}"`,
      `"${item.formLabel}"`,
      `"${(item.name || "").replace(/"/g, '""')}"`,
      `"${(item.email || "").replace(/"/g, '""')}"`,
      `"${(item.phone || "").replace(/"/g, '""')}"`,
      `"${(item.companyOrOrg || "").replace(/"/g, '""')}"`,
      `"${item.status || "New"}"`,
      `"${(item.summary || "").replace(/"/g, '""')}"`,
      `"${item.createdAt}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `stalight_leads_${selectedForm}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLeads.length} leads successfully`);
  };

  const getStageBadge = (statusStr?: string) => {
    const stage = SERVICE_STAGES.find(
      (s) => s.id.toLowerCase() === (statusStr || "New").toLowerCase()
    ) || {
      label: statusStr || "New",
      badgeClass: "bg-muted text-muted-foreground border-border",
    };
    return (
      <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 border capitalize", stage.badgeClass)}>
        {stage.label}
      </Badge>
    );
  };

  if (loading && leads.length === 0) {
    return (
      <Card className="flex flex-col h-[calc(100vh-140px)] overflow-hidden border-border">
        <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-80" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-6 flex gap-0 overflow-x-auto overflow-y-hidden items-stretch">
          {[1, 2, 3, 4].map((id) => (
            <div key={id} className="min-w-[280px] w-[280px] flex flex-col h-full border-r border-border last:border-r-0 px-4">
              <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {[1, 2, 3].map((cardId) => (
                  <Card key={cardId} className="border border-border">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="lead-pipeline-container" className="flex flex-col h-[calc(100vh-140px)] overflow-hidden border border-border shadow-sm">
      {/* Top Header with Switch Controls */}
      <CardHeader id="lead-pipeline-header" className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-card">
        <div>
          <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <span>Lead Management</span>
            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary">
              {leads.length} Enquiries
            </Badge>
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {viewMode === "pipeline"
              ? "Manage applicant pipeline visually with drag-and-drop sliding stages."
              : "Filter and review applicant leads stage by stage in organized rows (10 per page)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Service / Form Category Selector */}
          <Select
            value={selectedForm}
            onValueChange={(val) => setSelectedForm(val as FormTableKey | "all")}
          >
            <SelectTrigger className="w-[170px] h-8 text-xs font-medium bg-background">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services ({counts.all || leads.length})</SelectItem>
              {(Object.keys(FORM_CONFIGS) as FormTableKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {FORM_CONFIGS[key].label} ({counts[key] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Switch Button for Pipeline Sliding vs Filtering List */}
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
            <Button
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("pipeline")}
              className={cn(
                "h-8 px-3 text-xs font-medium gap-1.5 transition-all",
                viewMode === "pipeline" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Sliding</span>
            </Button>
            <Button
              variant={viewMode === "filtered_list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("filtered_list")}
              className={cn(
                "h-8 px-3 text-xs font-medium gap-1.5 transition-all",
                viewMode === "filtered_list" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Filtering List</span>
            </Button>
          </div>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-2.5 text-xs gap-1 border-border"
            title="Export CSV"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Add Lead Button */}
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="shadow-sm bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs gap-1.5"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </Button>
        </div>
      </CardHeader>

      {/* Manual Add Lead Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddManualLead} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Service / Form Category</label>
              <Select
                value={newLeadFormType}
                onValueChange={(val) => setNewLeadFormType(val as FormTableKey)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FORM_CONFIGS) as FormTableKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {FORM_CONFIGS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Applicant / Client Name *</label>
              <Input
                required
                type="text"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                placeholder="Full Name"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Email Address *</label>
                <Input
                  required
                  type="email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Company / Organization</label>
                <Input
                  type="text"
                  value={newLeadCompany}
                  onChange={(e) => setNewLeadCompany(e.target.value)}
                  placeholder="e.g. Acme Corp / College"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Initial Stage</label>
                <Select value={newLeadStatus} onValueChange={setNewLeadStatus}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", s.dotColor)} />
                          <span>{s.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Requirements / Notes / Message</label>
              <textarea
                rows={3}
                value={newLeadSummary}
                onChange={(e) => setNewLeadSummary(e.target.value)}
                placeholder="Client inquiry details or requirements..."
                className="w-full p-2.5 border border-input rounded-md bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingLead}>
                {isSubmittingLead ? "Adding..." : "Add Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Lead Details</DialogTitle>
          </DialogHeader>
          {leadToEdit && (
            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Service / Category</label>
                <div className="p-2 border rounded bg-muted/40 text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", getFormBadgeClasses(leadToEdit.formType))}>
                    {getFormIcon(leadToEdit.formType)}
                    {leadToEdit.formLabel}
                  </span>
                  <span>ID: {leadToEdit.id}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Client / Institution Name *</label>
                <Input
                  required
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full Name"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Address *</label>
                  <Input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Company / Location</label>
                  <Input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="Location / Institution"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Pipeline Stage</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", s.dotColor)} />
                            <span>{s.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Message / Notes / Requirements</label>
                <textarea
                  rows={3}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Lead details, priorities, or discussion notes..."
                  className="w-full p-2.5 border border-input rounded-md bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content View Switcher */}
      {viewMode === "pipeline" ? (
        /* ================= MODE 1: PIPELINE SLIDING WITH DRAG & DROP ================= */
        <CardContent className="flex-1 min-h-0 p-0 flex overflow-hidden">
          <div
            className="flex gap-0 overflow-x-auto overflow-y-hidden p-6 flex-1 items-stretch min-h-0 custom-scrollbar"
            onDragOver={(e) => {
              e.preventDefault();
              const container = e.currentTarget;
              const scrollThreshold = 150;
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;

              if (x < scrollThreshold) {
                startScrolling(container, "left");
              } else if (rect.width - x < scrollThreshold) {
                startScrolling(container, "right");
              } else {
                stopScrolling();
              }
            }}
            onDragLeave={stopScrolling}
            onDrop={stopScrolling}
          >
            {SERVICE_STAGES.map((stage) => {
              const stageLeads = leads.filter(
                (l) => (l.status || "New").toLowerCase() === stage.id.toLowerCase()
              );

              return (
                <div
                  key={stage.id}
                  className="min-w-[280px] w-[280px] flex flex-col h-full border-r border-border last:border-r-0 px-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const leadKey = e.dataTransfer.getData("leadKey");
                    if (leadKey) {
                      const [formType, leadId] = leadKey.split(":::");
                      const lead = leads.find(
                        (l) => l.formType === formType && l.id.toString() === leadId
                      );
                      if (lead) {
                        handleStatusChange(lead, stage.id);
                      }
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                      <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        {stage.label}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5">
                      {stageLeads.length}
                    </Badge>
                  </div>

                  <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-2">
                    {stageLeads.map((lead) => {
                      const borderColor = stage.borderColor || "#3b82f6";
                      return (
                        <Card
                          key={`${lead.formType}_${lead.id}`}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("leadKey", `${lead.formType}:::${lead.id}`)
                          }
                          onDragEnd={stopScrolling}
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsDetailsOpen(true);
                          }}
                          className="cursor-move hover:border-primary/50 transition-colors bg-card shadow-sm border border-l-4"
                          style={{ borderLeftColor: borderColor }}
                        >
                          <CardContent className="p-3 flex flex-col gap-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <p className="font-medium text-sm truncate flex-1">{lead.name}</p>
                              <span
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0",
                                  getFormBadgeClasses(lead.formType)
                                )}
                              >
                                {lead.formLabel}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{lead.email || "No email"}</span>
                            </p>

                            {lead.phone && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span className="truncate">{lead.phone}</span>
                              </p>
                            )}

                            {lead.companyOrOrg && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Building className="w-3 h-3 shrink-0" />
                                <span className="truncate">{lead.companyOrOrg}</span>
                              </p>
                            )}

                            {lead.summary && (
                              <p className="text-[11px] text-muted-foreground/80 line-clamp-2 bg-muted/30 p-1.5 rounded text-xs mt-0.5">
                                {lead.summary}
                              </p>
                            )}

                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border/40">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatDate(lead.createdAt).split(",")[0]}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(lead);
                                  }}
                                  className="p-1 hover:text-primary transition-colors rounded hover:bg-muted"
                                  title="Edit Lead"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeadToDelete(lead);
                                  }}
                                  className="p-1 hover:text-red-600 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                                  title="Delete Lead"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center p-6 border border-dashed border-border rounded bg-muted/5">
                        Drop leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      ) : (
        /* ================= MODE 2: FILTERING LIST VIEW IN ROWS (10 per page + indexing) ================= */
        <CardContent className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden space-y-4">
          {/* Stage Filter Buttons Bar (Pills with Counts) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveFilterStage("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border",
                activeFilterStage === "all"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted"
              )}
            >
              <span>All Enquiries</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  activeFilterStage === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {getStageCount("all")}
              </span>
            </button>

            {SERVICE_STAGES.map((stage) => {
              const count = getStageCount(stage.id);
              const isActive = activeFilterStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveFilterStage(stage.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border",
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm font-semibold"
                      : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                  <span>{stage.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full",
                      isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Toolbar */}
          <div className="flex items-center justify-between gap-3 shrink-0 bg-muted/20 p-3 rounded-lg border border-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, email, phone, company, service or requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background w-full"
              />
            </div>
          </div>

          {/* Leads Listed in Rows with Indexing */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border rounded-lg border-border bg-card">
            {paginatedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="p-3 rounded-full bg-muted">
                  <SlidersHorizontal className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No Leads Found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {searchQuery || activeFilterStage !== "all"
                      ? "No applicant enquiries match the active filter criteria."
                      : "No leads available yet in this view."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paginatedLeads.map((lead, index) => {
                  const itemIndex = (listPage - 1) * PAGE_SIZE + index + 1;
                  return (
                    <div
                      key={`${lead.formType}_${lead.id}`}
                      className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                    >
                      {/* Left: Indexing & Applicant Details */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Index Number Badge */}
                        <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border text-foreground font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          #{itemIndex}
                        </div>

                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 uppercase mt-0.5">
                          {lead.name ? lead.name.charAt(0) : "L"}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setIsDetailsOpen(true);
                              }}
                              className="font-semibold text-sm text-foreground hover:text-primary transition-colors text-left truncate"
                            >
                              {lead.name}
                            </button>
                            {getStageBadge(lead.status)}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                getFormBadgeClasses(lead.formType)
                              )}
                            >
                              {getFormIcon(lead.formType)}
                              {lead.formLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.companyOrOrg && (
                              <span className="flex items-center gap-1 font-medium text-foreground/80">
                                <Building className="w-3 h-3" />
                                {lead.companyOrOrg}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(lead.createdAt)}
                            </span>
                          </div>

                          {lead.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-1 italic">
                              "{lead.summary}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Stage Changer Select & Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <Select
                          value={lead.status || "New"}
                          onValueChange={(val) => handleStatusChange(lead, val)}
                          disabled={updatingLeadKey === `${lead.formType}_${lead.id}`}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("w-2 h-2 rounded-full", s.dotColor)} />
                                  <span>{s.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsDetailsOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditModal(lead)}
                          title="Edit Lead"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setLeadToDelete(lead)}
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalListCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <div>
                Showing {(listPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(listPage * PAGE_SIZE, totalListCount)} of {totalListCount} leads
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  disabled={listPage <= 1}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="px-2 font-medium">
                  Page {listPage} of {totalListPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                  disabled={listPage >= totalListPages}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Details View Modal */}
      {selectedLead && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between gap-2 pr-6">
                <DialogTitle className="text-lg font-bold">
                  {selectedLead.name}
                </DialogTitle>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
                    getFormBadgeClasses(selectedLead.formType)
                  )}
                >
                  {selectedLead.formLabel}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div>
                  <p className="text-muted-foreground">Email Address</p>
                  <p className="font-semibold text-foreground break-all mt-0.5">
                    {selectedLead.email ? (
                      <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">
                        {selectedLead.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone Number</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedLead.phone ? (
                      <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                        {selectedLead.phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company / Organization</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedLead.companyOrOrg || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted At</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {formatDate(selectedLead.createdAt)}
                  </p>
                </div>
              </div>

              {/* Status Changer */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Pipeline Stage</label>
                <Select
                  value={selectedLead.status || "New"}
                  onValueChange={(val) => handleStatusChange(selectedLead, val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", s.dotColor)} />
                          <span>{s.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary / Message */}
              {selectedLead.summary && (
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Message / Requirements</label>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedLead.summary}
                  </div>
                </div>
              )}

              {/* Raw Form Fields */}
              {selectedLead.raw && Object.keys(selectedLead.raw).length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Complete Submission Fields</label>
                  <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/50">
                    {Object.entries(selectedLead.raw).map(([k, v]) => {
                      if (k === "id" || k === "created_at" || k === "status") return null;
                      return (
                        <div key={k} className="p-2 flex justify-between gap-4">
                          <span className="font-medium text-muted-foreground capitalize">
                            {k.replace(/_/g, " ")}:
                          </span>
                          <span className="font-mono text-right break-all">
                            {typeof v === "object" ? JSON.stringify(v) : String(v || "-")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t flex justify-between items-center sm:justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setLeadToDelete(selectedLead)}
                className="gap-1 text-xs"
              >
                <Trash2 size={13} /> Delete Lead
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const target = selectedLead;
                    setIsDetailsOpen(false);
                    openEditModal(target);
                  }}
                  className="gap-1 text-xs"
                >
                  <Pencil size={13} /> Edit Lead
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDetailsOpen(false)} className="text-xs">
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!leadToDelete} onOpenChange={() => setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the inquiry from{" "}
              <strong>{leadToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default WebsiteLeads;
