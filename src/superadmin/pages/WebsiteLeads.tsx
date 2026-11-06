import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
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
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import {
  getWebsiteLeads,
  updateWebsiteLeadStatus,
  deleteWebsiteLead,
  WebsiteLeadItem,
  FORM_CONFIGS,
  FormTableKey,
  LEAD_STATUS_OPTIONS,
} from "@/utils/supabaseWebsiteService";

const getBadgeClasses = (formType: FormTableKey) => {
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

const getStatusBadgeClass = (statusStr?: string) => {
  const match = LEAD_STATUS_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === (statusStr || "new").toLowerCase()
  );
  return (
    match?.badgeClass ||
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
  );
};

const getStatusDotClass = (statusStr?: string) => {
  const match = LEAD_STATUS_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === (statusStr || "new").toLowerCase()
  );
  return match?.dotClass || "bg-gray-400";
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

const WebsiteLeads: React.FC = () => {
  const { theme } = useTheme();

  const [leads, setLeads] = useState<WebsiteLeadItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedForm, setSelectedForm] = useState<FormTableKey | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Action states
  const [leadToDelete, setLeadToDelete] = useState<WebsiteLeadItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [updatingLeadKey, setUpdatingLeadKey] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Detail Modal
  const [selectedLead, setSelectedLead] = useState<WebsiteLeadItem | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await getWebsiteLeads(selectedForm, selectedStatus);
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
    setCurrentPage(1);
  }, [selectedForm, selectedStatus]);

  // Handle status update directly to Supabase
  const handleStatusChange = async (lead: WebsiteLeadItem, newStatus: string) => {
    const leadKey = `${lead.formType}_${lead.id}`;
    const prevStatus = lead.status;
    // Optimistic update
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id && item.formType === lead.formType
          ? { ...item, status: newStatus }
          : item
      )
    );
    if (selectedLead && selectedLead.id === lead.id && selectedLead.formType === lead.formType) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    setUpdatingLeadKey(leadKey);
    try {
      const res = await updateWebsiteLeadStatus(lead.formType, lead.id, newStatus);
      if (res.success) {
        toast.success(`Status updated to ${newStatus}`);
      } else {
        toast.error(res.message || "Failed to update status in Supabase");
        // Revert on failure
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
      toast.error(err?.message || "Error updating status");
      // Revert on failure
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

  // Handle permanent deletion from Supabase
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteWebsiteLead(leadToDelete.formType, leadToDelete.id);
      if (res.success) {
        toast.success("Lead permanently deleted from Supabase");
        // Remove from list
        setLeads((prev) =>
          prev.filter((l) => !(l.id === leadToDelete.id && l.formType === leadToDelete.formType))
        );
        // Decrement counts
        setCounts((prev) => ({
          ...prev,
          all: Math.max(0, (prev.all || 1) - 1),
          [leadToDelete.formType]: Math.max(0, (prev[leadToDelete.formType] || 1) - 1),
        }));
        if (selectedLead && selectedLead.id === leadToDelete.id && selectedLead.formType === leadToDelete.formType) {
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

  // Filtered leads based on search query and status
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedStatus && selectedStatus !== "all") {
      result = result.filter(
        (item) => item.status?.toLowerCase() === selectedStatus.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const matchName = item.name?.toLowerCase().includes(q);
        const matchEmail = item.email?.toLowerCase().includes(q);
        const matchPhone = item.phone?.toLowerCase().includes(q);
        const matchCompany = item.companyOrOrg?.toLowerCase().includes(q);
        const matchSummary = item.summary?.toLowerCase().includes(q);
        const matchStatus = item.status?.toLowerCase().includes(q);
        return (
          matchName ||
          matchEmail ||
          matchPhone ||
          matchCompany ||
          matchSummary ||
          matchStatus
        );
      });
    }
    return result;
  }, [leads, searchQuery, selectedStatus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = [
      "ID",
      "Form Type",
      "Name",
      "Email",
      "Phone",
      "Company/Organization",
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
      `stalight_website_leads_${selectedForm}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLeads.length} leads successfully`);
  };

  const statCards: {
    key: FormTableKey;
    title: string;
    icon: React.ReactNode;
    desc: string;
    iconColor: string;
  }[] = [
    {
      key: "contact_inquiries",
      title: "Contact Inquiries",
      icon: <Mail className="w-5 h-5" />,
      desc: "General contact & support messages",
      iconColor: "text-blue-500",
    },
    {
      key: "admission_applications",
      title: "Admission Applications",
      icon: <GraduationCap className="w-5 h-5" />,
      desc: "Campus course & student applications",
      iconColor: "text-purple-500",
    },
    {
      key: "project_inquiries",
      title: "Project Inquiries",
      icon: <Briefcase className="w-5 h-5" />,
      desc: "Client & development projects",
      iconColor: "text-emerald-500",
    },
    {
      key: "it_assessments",
      title: "IT Assessments",
      icon: <Cpu className="w-5 h-5" />,
      desc: "Infrastructure & technical assessments",
      iconColor: "text-amber-500",
    },
    {
      key: "neurocampus_inquiries",
      title: "NeuroCampus Inquiries",
      icon: <Building2 className="w-5 h-5" />,
      desc: "Institutional AI campus inquiries",
      iconColor: "text-indigo-500",
    },
    {
      key: "neurosync_inquiries",
      title: "NeuroSync Inquiries",
      icon: <Activity className="w-5 h-5" />,
      desc: "Integration & sync inquiries",
      iconColor: "text-rose-500",
    },
  ];

  return (
    <div className={`space-y-8 w-full ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Website Leads & Forms</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Live database of all inquiries and submissions collected across Stalight website forms
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const isSelected = selectedForm === card.key;
          const count = counts[card.key] ?? 0;
          return (
            <div key={card.key} className="rounded-lg">
              <Card
                onClick={() => setSelectedForm(isSelected ? "all" : card.key)}
                className={`h-full flex flex-col transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md ${
                  isSelected
                    ? theme === "dark"
                      ? "bg-card/70 border-primary ring-2 ring-primary"
                      : "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/40"
                    : theme === "dark"
                    ? "bg-card/40 border-border hover:bg-card/60 hover:border-primary/40"
                    : "bg-white border-gray-100 hover:bg-gray-50/80 hover:border-blue-200"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-foreground" : "text-gray-700"
                    }`}
                  >
                    {card.title}
                  </CardTitle>
                  <div className={theme === "dark" ? "w-5 h-5 text-primary" : `w-5 h-5 ${card.iconColor}`}>
                    {card.icon}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-foreground" : "text-gray-900"
                    }`}
                  >
                    {count}
                  </div>
                  <p
                    className={`text-xs mt-2 ${
                      theme === "dark" ? "text-muted-foreground" : "text-gray-500"
                    }`}
                  >
                    {card.desc}
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Main Table Card */}
      <Card
        className={`border shadow-sm overflow-hidden ${
          theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"
        }`}
      >
        <CardHeader className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Pills / Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <Select
                value={selectedForm}
                onValueChange={(val) => setSelectedForm(val as FormTableKey | "all")}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs font-semibold">
                  <SelectValue placeholder="All Forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Website Forms ({counts.all || 0})</SelectItem>
                  {(Object.keys(FORM_CONFIGS) as FormTableKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {FORM_CONFIGS[key].label} ({counts[key] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-[160px] h-9 text-xs font-semibold">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {LEAD_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, phone, status..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border/50">
                  <TableHead className="w-12 text-center text-xs font-semibold">#</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Form Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Lead / Contact
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Organization / Focus
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                    Summary / Message
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Submitted Date
                  </TableHead>
                  <TableHead className="w-24 text-right pr-6 text-xs font-semibold uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <SkeletonTable rows={5} cols={8} />
                    </TableCell>
                  </TableRow>
                ) : paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-60">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm font-semibold">No submissions found</span>
                        <span className="text-xs text-muted-foreground">
                          {searchQuery || selectedStatus !== "all"
                            ? "Try adjusting your search or filter criteria"
                            : "No responses collected yet for this form"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((item, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <TableRow
                        key={`${item.formType}_${item.id}`}
                        className="hover:bg-muted/30 transition-colors border-b border-border/40"
                      >
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {rowNumber}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClasses(
                              item.formType
                            )}`}
                          >
                            {item.formLabel}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-xs sm:text-sm">{item.name}</div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {item.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 opacity-70" />
                                {item.email}
                              </span>
                            )}
                            {item.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 opacity-70" />
                                {item.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs text-foreground font-medium">
                            {item.companyOrOrg || "—"}
                          </span>
                        </TableCell>

                        {/* Status Dropdown in Table Row */}
                        <TableCell className="whitespace-nowrap">
                          <Select
                            value={item.status || "New"}
                            onValueChange={(val) => handleStatusChange(item, val)}
                            disabled={updatingLeadKey === `${item.formType}_${item.id}`}
                          >
                            <SelectTrigger
                              className={`h-7 w-[130px] text-[11px] font-semibold border rounded-lg px-2 shadow-none focus:ring-1 ${getStatusBadgeClass(
                                item.status || "New"
                              )}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(
                                    item.status || "New"
                                  )}`}
                                />
                                <span className="truncate">{item.status || "New"}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                                    <span>{opt.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell max-w-xs">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.summary || "—"}
                          </p>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>

                        {/* Actions (View + Delete) */}
                        <TableCell className="text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLead(item)}
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                              title="View Full Submission"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLeadToDelete(item)}
                              className="h-8 w-8 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-muted-foreground rounded-lg transition-all"
                              title="Delete Submission"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredLeads.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/50 text-xs text-muted-foreground">
              <div>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, filteredLeads.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filteredLeads.length}</span>{" "}
                entries
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>

                <span className="px-2 font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2 text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent
          className={`w-[95%] sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-0 ${
            theme === "dark" ? "bg-card text-foreground border-border" : "bg-white text-gray-900 border-gray-200"
          }`}
        >
          {selectedLead && (
            <>
              <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBadgeClasses(
                        selectedLead.formType
                      )}`}
                    >
                      {selectedLead.formLabel}
                    </span>

                    {/* Status Dropdown in Detail Modal Header */}
                    <Select
                      value={selectedLead.status || "New"}
                      onValueChange={(val) => handleStatusChange(selectedLead, val)}
                      disabled={updatingLeadKey === `${selectedLead.formType}_${selectedLead.id}`}
                    >
                      <SelectTrigger
                        className={`h-7 w-[130px] text-[11px] font-semibold border rounded-lg px-2 shadow-none focus:ring-1 ${getStatusBadgeClass(
                          selectedLead.status || "New"
                        )}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(
                              selectedLead.status || "New"
                            )}`}
                          />
                          <span className="truncate">{selectedLead.status || "New"}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedLead.createdAt)}
                  </span>
                </div>

                <DialogTitle className="text-lg sm:text-xl font-bold mt-2">
                  {selectedLead.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submission ID: {selectedLead.id}
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 sm:p-6 space-y-4 text-xs">
                {/* Contact Information Card */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    theme === "dark" ? "bg-muted/10 border-border/60" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Contact Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Email</span>
                      {selectedLead.email ? (
                        <a
                          href={`mailto:${selectedLead.email}`}
                          className="font-medium text-primary hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Mail className="w-3 h-3" />
                          {selectedLead.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Phone</span>
                      {selectedLead.phone ? (
                        <a
                          href={`tel:${selectedLead.phone}`}
                          className="font-medium text-foreground hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          {selectedLead.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    {selectedLead.companyOrOrg && (
                      <div className="sm:col-span-2 mt-1">
                        <span className="text-muted-foreground block text-[10px]">
                          Company / Organization
                        </span>
                        <span className="font-medium flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          {selectedLead.companyOrOrg}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form-specific Attributes */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    theme === "dark" ? "bg-muted/10 border-border/60" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2.5">
                    Submission Entities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(selectedLead.raw)
                      .filter(
                        ([key]) =>
                          !["id", "full_name", "first_name", "last_name", "name", "email", "phone", "status"].includes(
                            key
                          )
                      )
                      .map(([key, val]) => (
                        <div key={key} className={typeof val === "string" && val.length > 50 ? "sm:col-span-2" : ""}>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium text-foreground whitespace-pre-wrap break-words block mt-0.5">
                            {val !== null && val !== undefined ? String(val) : "—"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 sm:p-5 border-t border-border/50 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLeadToDelete(selectedLead)}
                  className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!leadToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setLeadToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Delete Inquiry Submission?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground mt-2">
              Are you sure you want to permanently delete this inquiry from{" "}
              <strong className="text-foreground">{leadToDelete?.name}</strong> (
              {leadToDelete?.formLabel})?
              <br />
              <span className="text-rose-500 font-semibold block mt-1.5">
                This will permanently remove the record directly from Supabase and cannot be recovered.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel disabled={isDeleting} className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WebsiteLeads;

