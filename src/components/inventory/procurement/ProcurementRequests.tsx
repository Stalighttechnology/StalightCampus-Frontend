import React, { useState, useEffect } from "react";
import {
  ProcurementRequest,
  InventoryCategory,
  InventoryLocation,
  fetchProcurementRequests,
  fetchProcurementRequestsPaginated,
  createProcurementRequest,
  endorseProcurementRequest,
  sanctionProcurementRequest,
  stockInProcurementRequest,
  createQuotationFromProcurement,
  markProcurementDelivered,
  fetchInventoryCategories,
  fetchInventoryLocations,
  fetchInventoryPersonnel,
  fetchBranches,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "../../ui/popover";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  PackagePlus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Eye,
  Calendar,
  Building,
  Package,
  X,
  FileText,
  User,
  Truck,
  Send,
  Check,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  role?: string;
  branches?: Array<{ id: number; name: string }>;
  categories?: InventoryCategory[];
  locations?: InventoryLocation[];
  onStockInSuccess?: () => void;
}

export const ProcurementRequests: React.FC<Props> = ({
  role = "admin",
  branches = [],
  categories: propCategories = [],
  locations: propLocations = [],
  onStockInSuccess,
}) => {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>(propCategories);
  const [locations, setLocations] = useState<InventoryLocation[]>(propLocations);
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewDetailsReq, setViewDetailsReq] = useState<ProcurementRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stock-In State
  const [stockInRequest, setStockInRequest] = useState<ProcurementRequest | null>(null);
  const [stockInLocationId, setStockInLocationId] = useState("");
  const [stockInBranchId, setStockInBranchId] = useState("");
  const [stockInRoom, setStockInRoom] = useState("");
  const [stockInQuantity, setStockInQuantity] = useState(1);
  const [stockInRecipientRole, setStockInRecipientRole] = useState("");
  const [stockInRecipientBranch, setStockInRecipientBranch] = useState("");
  const [stockInRecipientId, setStockInRecipientId] = useState("");
  const [stockInRecipientName, setStockInRecipientName] = useState("");
  const [stockInPersonnelSearch, setStockInPersonnelSearch] = useState("");
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  const [stockInConfirmedReceipt, setStockInConfirmedReceipt] = useState(false);
  const [stockRemainingAsBuffer, setStockRemainingAsBuffer] = useState(true);
  const [personnelList, setPersonnelList] = useState<Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    branch_id?: number;
    branch_name?: string;
  }>>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelTotalPages, setPersonnelTotalPages] = useState(1);
  const [personnelTotalCount, setPersonnelTotalCount] = useState(0);

  // Quotation Modal state
  const [quotationModalReq, setQuotationModalReq] = useState<ProcurementRequest | null>(null);
  const [quotationMode, setQuotationMode] = useState<"manual" | "rfq">("manual");
  const [quoteFormData, setQuoteFormData] = useState({
    vendor_name: "",
    vendor_email: "",
    vendor_phone: "",
    total_amount: "",
    quote_document_url: "",
    company_email: "",
    last_reply_date: "",
    description: "",
    auto_order: true,
  });

  // Create Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    branch_id: "",
    requested_quantity: 1,
    estimated_cost: 0,
    priority: "medium",
  });

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchList(branches);
    } else {
      fetchBranches().then((b) => setBranchList(b || [])).catch(console.error);
    }
  }, [branches]);

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setCategories(propCategories);
    }
  }, [propCategories]);

  useEffect(() => {
    if (propLocations && propLocations.length > 0) {
      setLocations(propLocations);
    }
  }, [propLocations]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      loadRequests(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search, selectedStatus, selectedCategory, selectedPriority, selectedBranch]);

  const loadMetadata = async () => {
    try {
      const cats = propCategories.length > 0 ? propCategories : await fetchInventoryCategories().catch(() => []);
      setCategories(Array.isArray(cats) ? cats : []);
      if (branches.length === 0) {
        const bList = await fetchBranches().catch(() => []);
        setBranchList(Array.isArray(bList) ? bList : []);
      }
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    if (stockInRequest && locations.length === 0) {
      fetchInventoryLocations().then((l) => setLocations(l || [])).catch(console.error);
    }
  }, [stockInRequest]);

  const loadPersonnel = async (roleVal: string, branchVal: string, searchVal: string, pageVal: number = 1) => {
    if (!roleVal) {
      setPersonnelList([]);
      return;
    }
    const isBranchSpecific = ["faculty", "teacher", "hod", "staff"].includes(roleVal);
    if (isBranchSpecific && (!branchVal || branchVal === "")) {
      setPersonnelList([]);
      return;
    }

    try {
      setLoadingPersonnel(true);
      const params: Record<string, any> = {
        page: pageVal,
        page_size: 10,
      };
      if (roleVal && roleVal !== "all") params.role = roleVal;
      if (isBranchSpecific && branchVal && branchVal !== "all" && branchVal !== "none") {
        params.branch = branchVal;
      }
      if (searchVal.trim()) params.search = searchVal.trim();
      const res = await fetchInventoryPersonnel(params);
      setPersonnelList(res.results || []);
      setPersonnelTotalPages(res.total_pages || 1);
      setPersonnelTotalCount(res.count || 0);
      setPersonnelPage(res.current_page || pageVal);
    } catch (err: any) {
      console.error("Failed to load personnel:", err);
      setPersonnelList([]);
      setPersonnelTotalPages(1);
      setPersonnelTotalCount(0);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  useEffect(() => {
    if (stockInRequest) {
      const branchVal = stockInRequest.branch ? String(stockInRequest.branch) : "none";
      setStockInBranchId(branchVal);
      setStockInRecipientBranch("");
      setStockInQuantity(stockInRequest.requested_quantity || 1);
      setStockInRecipientRole("");
      setStockInRecipientId("");
      setStockInRecipientName("");
      setStockInPersonnelSearch("");
      setPersonnelPage(1);
      setPersonnelList([]);
      setStockInConfirmedReceipt(false);
      if (locations.length > 0 && !stockInLocationId) {
        setStockInLocationId(String(locations[0].id));
      }
      if (branchList.length === 0) {
        fetchBranches().then((b) => setBranchList(b || [])).catch(console.error);
      }
    }
  }, [stockInRequest]);

  useEffect(() => {
    if (stockInRequest) {
      if (!stockInRecipientRole) {
        setPersonnelList([]);
        return;
      }
      const isBranchSpecific = ["faculty", "teacher", "hod", "staff"].includes(stockInRecipientRole);
      if (isBranchSpecific && !stockInRecipientBranch) {
        setPersonnelList([]);
        return;
      }
      setPersonnelPage(1);
      const handler = setTimeout(() => {
        loadPersonnel(stockInRecipientRole, stockInRecipientBranch, stockInPersonnelSearch, 1);
      }, 250);
      return () => clearTimeout(handler);
    }
  }, [stockInRecipientRole, stockInRecipientBranch, stockInPersonnelSearch]);

  const loadRequests = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== "all") params.status = selectedStatus;
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (selectedPriority !== "all") params.priority = selectedPriority;
      if (selectedBranch !== "all") params.branch = selectedBranch;

      const res = await fetchProcurementRequestsPaginated(params);
      if (res && Array.isArray(res.results)) {
        setRequests(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
      } else if (Array.isArray(res)) {
        setRequests(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setRequests([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load procurement requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadRequests(page);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.category_id) {
      toast.error("Please fill in the title and select a category");
      return;
    }

    try {
      setActionLoading(true);
      await createProcurementRequest({
        ...formData,
        category_id: Number(formData.category_id),
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        requested_quantity: Number(formData.requested_quantity) || 1,
        estimated_cost: Number(formData.estimated_cost) || 0,
      });

      toast.success("Procurement request submitted successfully");
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        category_id: "",
        branch_id: "",
        requested_quantity: 1,
        estimated_cost: 0,
        priority: "medium",
      });
      loadRequests(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to create request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndorse = async (req: ProcurementRequest) => {
    try {
      setActionLoading(true);
      await endorseProcurementRequest(req.id, "Endorsed by HOD");
      toast.success("Request endorsed and forwarded to Principal");
      loadRequests(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to endorse request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSanction = async (req: ProcurementRequest, decision: "approved" | "rejected") => {
    try {
      setActionLoading(true);
      await sanctionProcurementRequest(req.id, decision, decision === "approved" ? "Sanctioned by Principal" : "Rejected");
      toast.success(`Request ${decision}`);
      loadRequests(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to update sanction");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenQuotationModal = (req: ProcurementRequest) => {
    setQuotationModalReq(req);
    setQuotationMode("manual");
    setQuoteFormData({
      vendor_name: "",
      vendor_email: "",
      vendor_phone: "",
      total_amount: req.estimated_cost ? String(req.estimated_cost) : "",
      quote_document_url: "",
      company_email: "",
      last_reply_date: "",
      description: req.description || "",
      auto_order: true,
    });
  };

  const handleQuotationSubmit = async () => {
    if (!quotationModalReq) return;

    if (quotationMode === "manual") {
      if (!quoteFormData.vendor_name.trim()) {
        toast.error("Please enter the vendor / company name");
        return;
      }
      if (!quoteFormData.total_amount) {
        toast.error("Please enter the total quoted amount");
        return;
      }
    } else {
      if (!quoteFormData.company_email.trim()) {
        toast.error("Please enter vendor email to issue RFQ");
        return;
      }
    }

    try {
      setActionLoading(true);
      await createQuotationFromProcurement(quotationModalReq.id, {
        mode: quotationMode,
        vendor_name: quoteFormData.vendor_name.trim(),
        vendor_email: quoteFormData.vendor_email.trim(),
        vendor_phone: quoteFormData.vendor_phone.trim(),
        total_amount: quoteFormData.total_amount ? Number(quoteFormData.total_amount) : undefined,
        quote_document_url: quoteFormData.quote_document_url.trim(),
        company_email: quoteFormData.company_email.trim(),
        last_reply_date: quoteFormData.last_reply_date || undefined,
        description: quoteFormData.description.trim(),
        auto_order: quoteFormData.auto_order,
      });

      toast.success(
        quotationMode === "manual"
          ? "Vendor quotation recorded and linked to procurement request!"
          : "Digital RFQ issued to vendor!"
      );
      setQuotationModalReq(null);
      loadRequests(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to create quotation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (req: ProcurementRequest) => {
    try {
      setActionLoading(true);
      await markProcurementDelivered(req.id);
      toast.success(`Procurement ${req.request_no} marked as Arrived on Campus! Ready for Stock-In.`);
      loadRequests(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as delivered");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStockInSubmit = async () => {
    if (!stockInRequest || !stockInLocationId) {
      toast.error("Please select a target campus location");
      return;
    }
    if (stockInQuantity <= 0) {
      toast.error("Stock-in quantity must be at least 1");
      return;
    }
    if (!stockInConfirmedReceipt) {
      toast.error("Please confirm physical receipt and handover of the assets");
      return;
    }

    try {
      setActionLoading(true);
      await stockInProcurementRequest(stockInRequest.id, {
        location_id: Number(stockInLocationId),
        branch_id: stockInBranchId && stockInBranchId !== "none" ? Number(stockInBranchId) : null,
        room_no: stockInRoom.trim() || undefined,
        quantity: Number(stockInQuantity),
        stock_remaining_as_buffer: stockRemainingAsBuffer,
        received_by_id: stockInRecipientId ? Number(stockInRecipientId) : null,
        received_by_name: stockInRecipientName.trim() || undefined,
        received_by_role: stockInRecipientRole,
      });
      toast.success("Assets successfully generated, stocked in, and assigned to recipient!");
      setStockInRequest(null);
      loadRequests(currentPage);
      if (onStockInSuccess) onStockInSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to stock in inventory");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      pending_hod: { label: "Pending HOD", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
      pending_principal: { label: "Pending Principal", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300" },
      approved: { label: "Approved / Sanctioned", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" },
      rejected: { label: "Rejected", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300" },
      rfq_issued: { label: "RFQ Issued", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300" },
      ordered: { label: "Order Placed", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300" },
      delivered: { label: "Arrived", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700", text: "text-emerald-800 dark:text-emerald-200" },
      added_to_inventory: { label: "Stocked In", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300" },
    };
    const s = map[status] || { label: status, bg: "bg-muted", text: "text-muted-foreground" };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-border/50 ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const isPrincipalOrAdmin = ["principal", "org_admin", "dean", "admin"].includes(role);
  const isHOD = role === "hod";
  const isManager = role === "inventory_manager" || role === "superadmin";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSelectedPriority("all");
    setSelectedBranch("all");
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * pageSize;

  const isFiltered =
    Boolean(search) ||
    selectedStatus !== "all" ||
    selectedCategory !== "all" ||
    selectedPriority !== "all" ||
    selectedBranch !== "all";

  return (
    <div className="w-full text-sm sm:text-base">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col min-h-[620px] md:min-h-[700px] shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Procurement Management</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage purchase requisitions, endorsements, sanctions, and asset stock-in
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {role !== "faculty" && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Raise Requisition</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Search & Filter Bar */}
          <div className="px-3 sm:px-5 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <Input
                  placeholder="Search request #, title, requester..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-card text-foreground py-1 pr-12 text-xs sm:text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-[170px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_hod">Pending HOD</SelectItem>
                  <SelectItem value="pending_principal">Pending Principal</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rfq_issued">RFQ Issued</SelectItem>
                  <SelectItem value="ordered">Order Placed</SelectItem>
                  <SelectItem value="delivered">Arrived</SelectItem>
                  <SelectItem value="added_to_inventory">Stocked In</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent Priority</SelectItem>
                </SelectContent>
              </Select>

              {/* Department Filter (if not faculty) */}
              {!["faculty", "staff", "teacher", "hod"].includes(role) && (
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {branchList.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="flex-1 overflow-hidden flex flex-col px-3 sm:px-5 pt-0 pb-3">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading procurement requisitions...
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto border rounded-xl mb-2 relative shadow-inner">
                <table className="w-full text-base md:text-sm text-left table-auto border-collapse">
                  <thead className="sticky top-0 z-20 border-b text-sm md:text-xs uppercase font-bold tracking-wider bg-slate-50/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-border shadow-sm backdrop-blur-md">
                    <tr>
                      <th className="py-3.5 px-4 text-left font-bold">Request ID</th>
                      <th className="py-3.5 px-4 font-bold">Title</th>
                      <th className="py-3.5 px-4 font-bold">Requested By</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold">Department</th>
                      <th className="py-3.5 px-4 font-bold text-center">Quantity</th>
                      <th className="py-3.5 px-4 font-bold text-right">Est. Cost</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 text-right font-bold w-52">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-muted-foreground">
                          No procurement requests found.
                        </td>
                      </tr>
                    ) : (
                      requests.map((req) => (
                        <tr
                          key={req.id}
                          className="transition-colors duration-200 hover:bg-blue-50/40 dark:hover:bg-accent/70 text-foreground"
                        >
                          {/* Request ID */}
                          <td className="py-3.5 px-4 align-middle font-medium whitespace-nowrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {req.request_no}
                            </span>
                          </td>

                          {/* Title */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="break-words font-semibold text-foreground text-sm max-w-[280px]" title={req.title}>
                              {req.title}
                            </div>
                          </td>

                          {/* Requested By */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs font-medium text-foreground whitespace-nowrap">
                              {req.requested_by_name || "Staff"}
                            </div>
                          </td>

                          {/* Category Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs font-medium text-foreground">
                              {req.category_details?.name || "--"}
                            </div>
                          </td>

                          {/* Department Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs font-medium text-foreground">
                              {req.branch_name || "--"}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-4 align-middle text-center">
                            <span className="font-semibold text-sm">{req.requested_quantity}</span>
                          </td>

                          {/* Est. Cost */}
                          <td className="py-3.5 px-4 align-middle text-right">
                            <span className="font-semibold text-sm">
                              ₹{Number(req.estimated_cost || 0).toLocaleString("en-IN")}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-middle text-center">
                            {getStatusBadge(req.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* HOD Endorse */}
                              {isHOD && req.status === "pending_hod" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleEndorse(req)}
                                  disabled={actionLoading}
                                  className="h-8 gap-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" /> Endorse
                                </Button>
                              )}

                              {/* Principal Sanction */}
                              {isPrincipalOrAdmin && req.status === "pending_principal" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSanction(req, "rejected")}
                                    disabled={actionLoading}
                                    className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSanction(req, "approved")}
                                    disabled={actionLoading}
                                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                  </Button>
                                </>
                              )}

                              {/* Raise Quotation / RFQ (Manager) - Only when approved or rfq issued */}
                              {isManager && (req.status === "approved" || req.status === "rfq_issued") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenQuotationModal(req)}
                                  disabled={actionLoading}
                                  className="h-8 gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                  title="Raise RFQ or record vendor quote manually"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Quote / RFQ
                                </Button>
                              )}

                              {/* Mark Arrived (Manager) - ONLY show when ordered till products arrive */}
                              {isManager && req.status === "ordered" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkDelivered(req)}
                                  disabled={actionLoading}
                                  className="h-8 gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                  title="Mark shipment as arrived on campus"
                                >
                                  <Truck className="w-3.5 h-3.5" /> Arrived
                                </Button>
                              )}

                              {/* Stock In - ONLY show when delivered / arrived on campus */}
                              {isManager && req.status === "delivered" && (
                                <Button
                                  size="sm"
                                  onClick={() => setStockInRequest(req)}
                                  className="h-8 text-xs font-semibold gap-1 bg-purple-600 hover:bg-purple-700 text-white shadow-sm ring-2 ring-purple-400/30"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" /> Stock In Asset
                                </Button>
                              )}

                              {/* View Details */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewDetailsReq(req)}
                                className="h-8 gap-1 text-xs font-semibold"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-3 md:hidden mb-2">
                {requests.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                    No procurement requests found.
                  </div>
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border bg-white dark:bg-card border-gray-200 dark:border-border text-foreground flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {req.request_no}
                            </span>
                            {getStatusBadge(req.status)}
                          </div>
                          <h3 className="font-semibold text-sm text-foreground">{req.title}</h3>
                          <p className="text-xs text-muted-foreground">Requested by: {req.requested_by_name}</p>
                        </div>
                        <div className="text-xs font-semibold px-2 py-1 rounded bg-muted">
                          Qty: {req.requested_quantity}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Category: <strong className="text-foreground">{req.category_details?.name || "--"}</strong></span>
                        <div>
                          <span className="font-bold text-foreground">
                            ₹{Number(req.estimated_cost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-border/50">
                        {/* HOD Endorse */}
                        {isHOD && req.status === "pending_hod" && (
                          <Button
                            size="sm"
                            onClick={() => handleEndorse(req)}
                            disabled={actionLoading}
                            className="h-8 gap-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Endorse
                          </Button>
                        )}

                        {/* Principal Sanction */}
                        {isPrincipalOrAdmin && req.status === "pending_principal" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSanction(req, "rejected")}
                              disabled={actionLoading}
                              className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSanction(req, "approved")}
                              disabled={actionLoading}
                              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                          </>
                        )}

                        {/* Raise Quotation (Manager) */}
                        {isManager && (req.status === "approved" || req.status === "rfq_issued") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenQuotationModal(req)}
                            disabled={actionLoading}
                            className="h-8 gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
                          >
                            <FileText className="w-3.5 h-3.5" /> Quote / RFQ
                          </Button>
                        )}

                        {/* Mark Arrived (Manager) - ONLY when ordered */}
                        {isManager && req.status === "ordered" && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkDelivered(req)}
                            disabled={actionLoading}
                            className="h-8 gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Truck className="w-3.5 h-3.5" /> Arrived
                          </Button>
                        )}

                        {/* Stock In - ONLY when delivered */}
                        {isManager && req.status === "delivered" && (
                          <Button
                            size="sm"
                            onClick={() => setStockInRequest(req)}
                            className="h-8 text-xs font-semibold gap-1 bg-purple-600 hover:bg-purple-700 text-white shadow-sm ring-2 ring-purple-400/30"
                          >
                            <PackagePlus className="w-3.5 h-3.5" /> Stock In Asset
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewDetailsReq(req)}
                          className="h-8 gap-1 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>

        {/* Pagination Bar - only displayed when data is more than 10 */}
        {!loading && (totalCount > pageSize || totalPages > 1) && (
          <div className="px-4 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
            <div>
              Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-foreground">
                {Math.min(startIndex + pageSize, totalCount || requests.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{totalCount || requests.length}</span> Requisition(s)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1 px-2 font-medium">
                Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
                <span className="font-bold text-foreground">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Procurement Details Dialog */}
      <Dialog open={!!viewDetailsReq} onOpenChange={() => setViewDetailsReq(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-5 border-b shrink-0 bg-white dark:bg-card">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-primary" />
                Procurement Requisition Details
              </DialogTitle>
              {viewDetailsReq && getStatusBadge(viewDetailsReq.status)}
            </div>
            <DialogDescription>
              Requisition number, specifications, vendor quotation, and administrative approvals.
            </DialogDescription>
          </DialogHeader>

          {viewDetailsReq && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {viewDetailsReq.request_no}
                  </span>
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    Priority: {viewDetailsReq.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-1">
                  {viewDetailsReq.title}
                </h3>
              </div>

              {/* Justification / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Justification & Specifications
                </label>
                <div className="p-3.5 rounded-xl bg-muted/40 border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {viewDetailsReq.description || "No specifications provided."}
                </div>
              </div>

              {/* Key Values Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Building className="w-3.5 h-3.5 text-primary" /> Category & Dept
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewDetailsReq.category_details?.name || "Uncategorized"}
                    {viewDetailsReq.branch_name && ` • ${viewDetailsReq.branch_name}`}
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Package className="w-3.5 h-3.5 text-primary" /> Quantity Requested
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewDetailsReq.requested_quantity} Unit(s)
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Estimated Total
                  </span>
                  <p className="font-semibold text-foreground">
                    ₹{Number(viewDetailsReq.estimated_cost || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-primary" /> Requested By
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewDetailsReq.requested_by_name || "Staff Member"}
                  </p>
                </div>
              </div>

              {/* Vendor & Quotation Details (if vendor selected / quote submitted) */}
              {viewDetailsReq.selected_vendor && (
                <div className="p-3.5 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" /> Selected Vendor & Awarded Quotation
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      Final: ₹{Number(viewDetailsReq.final_price || viewDetailsReq.selected_vendor.total_amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-foreground">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Vendor Name</span>
                      <span className="font-semibold">{viewDetailsReq.selected_vendor.vendor_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Vendor Contact</span>
                      <span>
                        {viewDetailsReq.selected_vendor.vendor_email || "--"}
                        {viewDetailsReq.selected_vendor.vendor_phone && ` • ${viewDetailsReq.selected_vendor.vendor_phone}`}
                      </span>
                    </div>
                    {viewDetailsReq.selected_vendor.description && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground block text-[11px]">Quotation Notes & Terms</span>
                        <span className="text-muted-foreground">{viewDetailsReq.selected_vendor.description}</span>
                      </div>
                    )}
                    {viewDetailsReq.selected_vendor.quote_document_url && (
                      <div className="sm:col-span-2">
                        <a
                          href={viewDetailsReq.selected_vendor.quote_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline text-xs font-medium"
                        >
                          View Quotation Attachment / Reference ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quotations & RFQ Bids (if RFQ issued or multiple responses exist) */}
              {!viewDetailsReq.selected_vendor && viewDetailsReq.quotations_summary && viewDetailsReq.quotations_summary.length > 0 && (
                <div className="p-3.5 rounded-xl border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" /> Digital RFQ & Vendor Bids
                    </span>
                  </div>
                  {viewDetailsReq.quotations_summary.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Issued To: <strong>{q.company_email || "Vendor Pool"}</strong></span>
                        <span>Deadline: {q.last_reply_date || "N/A"}</span>
                      </div>
                      {q.responses && q.responses.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {q.responses.map((resp: any) => (
                            <div key={resp.id} className="p-2 rounded-lg bg-background border flex justify-between items-center text-xs">
                              <div>
                                <span className="font-semibold text-foreground">{resp.vendor_name}</span>
                                {resp.vendor_email && <span className="text-muted-foreground text-[11px] block">{resp.vendor_email}</span>}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{Number(resp.total_amount || 0).toLocaleString("en-IN")}
                                </span>
                                {resp.quote_document_url && (
                                  <a href={resp.quote_document_url} target="_blank" rel="noreferrer" className="block text-[10px] text-primary underline">
                                    Quote PDF ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-[11px] italic">Awaiting vendor quotation responses...</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Requirement History & Lifecycle Timeline */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Requirement History & Progress
                </label>
                <div className="p-3.5 rounded-xl bg-muted/20 border space-y-3 text-xs">
                  {/* Step 1: Raised */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Requirement Requisition Raised</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(viewDetailsReq.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        By {viewDetailsReq.requested_by_name} for {viewDetailsReq.branch_name || "General Department"}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: HOD Endorsement */}
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                      viewDetailsReq.hod_endorsed_by_name ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-muted text-muted-foreground'
                    }`}>
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">Department HOD Endorsement</span>
                      <p className="text-muted-foreground text-[11px]">
                        {viewDetailsReq.hod_endorsed_by_name
                          ? `${viewDetailsReq.hod_endorsed_by_name} (${viewDetailsReq.hod_endorsement_remarks || "Endorsed"})`
                          : "Pending HOD Review"}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Principal / Admin Sanction */}
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                      viewDetailsReq.principal_sanctioned_by_name ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                    }`}>
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">Higher Authority Sanction</span>
                      <p className="text-muted-foreground text-[11px]">
                        {viewDetailsReq.principal_sanctioned_by_name
                          ? `${viewDetailsReq.principal_sanctioned_by_name} - ${viewDetailsReq.principal_sanction_remarks || viewDetailsReq.status}`
                          : "Pending Principal Sanction"}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Quotation & Vendor Selection */}
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                      viewDetailsReq.selected_vendor ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-muted text-muted-foreground'
                    }`}>
                      4
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">Vendor Quotation & Selection</span>
                      <p className="text-muted-foreground text-[11px]">
                        {viewDetailsReq.selected_vendor
                          ? `Vendor: ${viewDetailsReq.selected_vendor.vendor_name} • Quoted: ₹${Number(viewDetailsReq.final_price || 0).toLocaleString('en-IN')}`
                          : "Quotation / RFQ pending"}
                      </p>
                    </div>
                  </div>

                  {/* Step 5: Order & Delivery */}
                  <div className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                      ['delivered', 'added_to_inventory'].includes(viewDetailsReq.status)
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : viewDetailsReq.status === 'ordered'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      5
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">Delivery & Campus Arrival</span>
                      <p className="text-muted-foreground text-[11px]">
                        {viewDetailsReq.status === 'added_to_inventory'
                          ? "Delivered & Stocked into Active Inventory"
                          : viewDetailsReq.status === 'delivered'
                          ? "Goods Arrived on Campus (Ready for Stock-In)"
                          : viewDetailsReq.status === 'ordered'
                          ? "Order Placed / In Transit from Vendor"
                          : "Awaiting Order Placement"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              {(viewDetailsReq.hod_endorsement_remarks || viewDetailsReq.principal_sanction_remarks) && (
                <div className="p-3 rounded-xl bg-muted/20 border space-y-2 text-xs">
                  {viewDetailsReq.hod_endorsement_remarks && (
                    <div>
                      <span className="font-bold text-purple-700 dark:text-purple-300">HOD Endorsement: </span>
                      <span className="text-muted-foreground">{viewDetailsReq.hod_endorsement_remarks}</span>
                    </div>
                  )}
                  {viewDetailsReq.principal_sanction_remarks && (
                    <div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">Principal Sanction: </span>
                      <span className="text-muted-foreground">{viewDetailsReq.principal_sanction_remarks}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fixed Footer */}
          <div className="p-4 border-t bg-muted/20 flex justify-end shrink-0">
            <Button variant="default" size="sm" onClick={() => setViewDetailsReq(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Raise Requisition Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Plus className="w-5 h-5 text-primary" />
              Submit Procurement Requisition
            </DialogTitle>
            <DialogDescription>
              Request purchase of new equipment or physical assets for academic/institutional use.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Item Title / Requirement *
              </label>
              <Input
                required
                placeholder="e.g. 10x High-End Workstation PCs for AI Lab"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Asset Category *
                </label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.prefix})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Department / Branch
                </label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(v) => setFormData({ ...formData, branch_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">General / All</SelectItem>
                    {branchList.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.requested_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, requested_quantity: parseInt(e.target.value) || 1 })
                  }
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Estimated Total (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })
                  }
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Priority
                </label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Justification & Technical Specifications
              </label>
              <Textarea
                rows={3}
                placeholder="Detail the requirement, intended lab/classroom, and specifications..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Stock-In & Handover Modal */}
      <Dialog open={!!stockInRequest} onOpenChange={() => setStockInRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Stock In & Handover Assets
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Requisition <span className="font-semibold text-foreground">{stockInRequest?.request_no}</span> &bull; {stockInRequest?.title}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Requisition summary bar */}
            {stockInRequest && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs bg-card border border-border/60 p-2.5 rounded-lg">
                <span className="font-semibold text-foreground">Requested:</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {stockInRequest.requested_quantity} unit(s)
                </span>
                {stockInRequest.category_name && (
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {stockInRequest.category_name}
                  </span>
                )}
                {stockInRequest.branch_name && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                    Dept: {stockInRequest.branch_name}
                  </span>
                )}
                {stockInRequest.vendor_quotation && (
                  <span className="text-muted-foreground text-[11px] ml-auto">
                    Vendor: <strong className="text-foreground">{stockInRequest.vendor_quotation.vendor_name}</strong>
                  </span>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Section 1: Location & Placement */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary" />
                1. Campus Location & Department Placement
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Campus Building / Storage *
                  </label>
                  <Select value={stockInLocationId} onValueChange={setStockInLocationId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Destination Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name} ({l.prefix})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Room / Lab Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Lab 204 / Room 102"
                    value={stockInRoom}
                    onChange={(e) => setStockInRoom(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Assigned Department / Branch
                  </label>
                  <Select
                    value={stockInBranchId}
                    onValueChange={(val) => {
                      setStockInBranchId(val);
                      setStockInRecipientBranch(val !== "none" ? val : "all");
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Department Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Central / Common Campus Asset</SelectItem>
                      {branchList.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 2: Recipient / Custodian Handover */}
            <div className="space-y-4 border-t border-border/50 pt-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  2. Recipient / Custodian Handover
                </h4>
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/50">
                  Direct Handover (No Approval Required)
                </span>
              </div>

              {/* Step 1: Recipient Role First */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Step 1: Recipient Role First <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">Select role first</span>
                </div>
                <Select
                  value={stockInRecipientRole}
                  onValueChange={(val) => {
                    setStockInRecipientRole(val);
                    setStockInRecipientId("");
                    setStockInRecipientName("");
                    const isBranchRole = ["faculty", "hod", "staff"].includes(val);
                    setStockInRecipientBranch(isBranchRole ? "" : "all");
                    setPersonnelList([]);
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Choose recipient role..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    <SelectItem value="faculty">Faculty Member / Teacher</SelectItem>
                    <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                    <SelectItem value="staff">Staff / Lab Assistant</SelectItem>
                    <SelectItem value="dean">Dean</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="warden">Hostel Warden</SelectItem>
                    <SelectItem value="library_admin">Library Admin</SelectItem>
                    <SelectItem value="transport_admin">Transport Admin</SelectItem>
                    <SelectItem value="group_d">Support Staff / Group D</SelectItem>
                    <SelectItem value="security">Security Staff</SelectItem>
                    <SelectItem value="other">Other / External Custodian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Department / Branch Selection (ONLY when Faculty / HOD / Staff is selected) */}
              {["faculty", "hod", "staff"].includes(stockInRecipientRole) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Step 2: Department / Branch <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Filter by department</span>
                  </div>
                  <Select
                    value={stockInRecipientBranch}
                    onValueChange={(val) => {
                      setStockInRecipientBranch(val);
                      setStockInRecipientId("");
                      setStockInRecipientName("");
                      setPersonnelList([]);
                    }}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Choose Department / Branch..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[220px]">
                      <SelectItem value="all">All Departments / Branches</SelectItem>
                      {branchList.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 3 (or Step 2): Assign Custodian / Recipient with Search in Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    {["faculty", "hod", "staff"].includes(stockInRecipientRole)
                      ? "Step 3: Assign Custodian / Recipient"
                      : "Step 2: Assign Custodian / Recipient"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">Select colleague from list</span>
                </div>

                <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={recipientPopoverOpen}
                      disabled={
                        !stockInRecipientRole ||
                        (["faculty", "hod", "staff"].includes(stockInRecipientRole) && !stockInRecipientBranch)
                      }
                      className="w-full h-9 justify-between font-normal text-left px-3 hover:bg-background"
                    >
                      {stockInRecipientName ? (
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="font-semibold text-foreground truncate">{stockInRecipientName}</span>
                          {stockInRecipientId && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded font-medium shrink-0">
                              Registered Staff
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {!stockInRecipientRole
                            ? "Select recipient role first..."
                            : ["faculty", "hod", "staff"].includes(stockInRecipientRole) && !stockInRecipientBranch
                            ? "Select department / branch first..."
                            : loadingPersonnel
                            ? "Loading colleagues..."
                            : "Search & select colleague or type name..."}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] min-w-[340px] max-w-[420px] p-0 shadow-xl border overflow-hidden flex flex-col h-[450px]"
                    align="start"
                  >
                    {/* Fixed Search Header */}
                    <div className="p-2 border-b bg-muted/10 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input
                          placeholder="Type name or email to filter..."
                          value={stockInPersonnelSearch}
                          onChange={(e) => {
                            setStockInPersonnelSearch(e.target.value);
                            setPersonnelPage(1);
                          }}
                          className="h-8 pl-8 text-xs bg-muted/30 focus-visible:ring-1"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Fixed Body with Smooth Page Transitions */}
                    <div className="flex-1 overflow-hidden p-1.5 flex flex-col justify-start relative">
                      {loadingPersonnel && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10 animate-in fade-in-50 duration-150">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background border px-3 py-1.5 rounded-full shadow-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                            <span>Loading colleagues...</span>
                          </div>
                        </div>
                      )}

                      {personnelList.length === 0 && !loadingPersonnel ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
                          <Users className="w-8 h-8 text-muted-foreground/40 mb-1.5" />
                          <p className="font-medium">No registered staff found</p>
                          <p className="text-[11px] text-muted-foreground/70">Try adjusting your search or department filter.</p>
                        </div>
                      ) : (
                        <div
                          key={`stockin-page-${personnelPage}`}
                          className="flex-1 flex flex-col space-y-0.5 animate-in fade-in-50 slide-in-from-bottom-1 duration-200"
                        >
                          {personnelList.map((p) => {
                            const isSelected = String(p.id) === stockInRecipientId || p.name === stockInRecipientName;
                            return (
                              <button
                                type="button"
                                key={p.id}
                                onClick={() => {
                                  setStockInRecipientId(String(p.id));
                                  setStockInRecipientName(p.name);
                                  setRecipientPopoverOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between gap-2 transition-all duration-150 h-[34px] ${
                                  isSelected
                                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-100 font-semibold shadow-xs"
                                    : "hover:bg-muted/70 text-foreground"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-xs truncate leading-none">{p.name}</div>
                                  <div className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">{p.email}</div>
                                </div>
                                {p.branch_name && (
                                  <span className="text-[9.5px] px-1.5 py-0.5 bg-muted rounded font-medium shrink-0 max-w-[110px] truncate">
                                    {p.branch_name}
                                  </span>
                                )}
                                {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Option to use custom typed name */}
                      {stockInPersonnelSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setStockInRecipientId("");
                            setStockInRecipientName(stockInPersonnelSearch.trim());
                            setRecipientPopoverOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 mt-auto rounded-md border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center gap-1.5 transition-colors text-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            Assign custom recipient: <strong>"{stockInPersonnelSearch.trim()}"</strong>
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Fixed Footer Pagination */}
                    <div className="p-2 border-t bg-muted/20 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="px-1 font-medium">
                        Page {personnelPage} of {personnelTotalPages} ({personnelTotalCount} total)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={personnelPage <= 1 || loadingPersonnel}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const prev = personnelPage - 1;
                            setPersonnelPage(prev);
                            loadPersonnel(stockInRecipientRole, stockInRecipientBranch, stockInPersonnelSearch, prev);
                          }}
                          className="h-6 px-2.5 text-[11px] transition-all"
                        >
                          Prev
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={personnelPage >= personnelTotalPages || loadingPersonnel}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const next = personnelPage + 1;
                            setPersonnelPage(next);
                            loadPersonnel(stockInRecipientRole, stockInRecipientBranch, stockInPersonnelSearch, next);
                          }}
                          className="h-6 px-2.5 text-[11px] transition-all"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Section 3: Quantity & Physical Receipt Confirmation */}
            <div className="space-y-3 border-t border-border/50 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                3. Quantity Stocked In & Handover Verification
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Quantity Received & Handed Over *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={stockInRequest?.requested_quantity || 9999}
                    value={stockInQuantity}
                    onChange={(e) => setStockInQuantity(Math.max(1, Number(e.target.value) || 1))}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    className="h-9 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="text-xs text-muted-foreground pt-3 sm:pt-4">
                  Original Requisition:{" "}
                  <strong className="text-foreground">
                    {stockInRequest?.requested_quantity} unit(s)
                  </strong>
                </div>
              </div>

              {/* Split Strategy Option when Quantity is Less than Total Requisition */}
              {stockInRequest && stockInQuantity < (stockInRequest.requested_quantity || 1) && (
                <div className="p-3.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Remaining {stockInRequest.requested_quantity - stockInQuantity} Unit(s) Allocation
                    </span>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      Buffer Bay Auto-Stock
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="buffer_strategy"
                        checked={stockRemainingAsBuffer}
                        onChange={() => setStockRemainingAsBuffer(true)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div>
                        <strong className="block text-foreground">
                          Stock remaining {stockInRequest.requested_quantity - stockInQuantity} units into Central Store Buffer Stock (Recommended)
                        </strong>
                        <span className="text-muted-foreground text-[11px] leading-tight block mt-0.5">
                          Assets will be generated in active inventory as available Buffer Stock in Central Warehouse, ready for one-click transfer to any department.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="buffer_strategy"
                        checked={!stockRemainingAsBuffer}
                        onChange={() => setStockRemainingAsBuffer(false)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div>
                        <strong className="block text-foreground">
                          Partial Vendor Delivery (Only {stockInQuantity} units arrived)
                        </strong>
                        <span className="text-muted-foreground text-[11px] leading-tight block mt-0.5">
                          The remaining {stockInRequest.requested_quantity - stockInQuantity} units have not yet arrived on campus and will be stocked in during the next delivery batch.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Physical Confirmation Box */}
              <div
                onClick={() => setStockInConfirmedReceipt(!stockInConfirmedReceipt)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  stockInConfirmedReceipt
                    ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 text-purple-950 dark:text-purple-200"
                    : "bg-muted/20 border-border hover:bg-muted/40 text-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={stockInConfirmedReceipt}
                  onChange={(e) => setStockInConfirmedReceipt(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold block">
                    Confirm Physical Receipt & Asset Custody
                  </span>
                  I confirm that <strong className="font-bold underline">{stockInQuantity} unit(s)</strong> have been physically received, verified for quality, and assigned to{" "}
                  <strong>
                    {stockInRecipientName.trim() || `${stockInRecipientRole.toUpperCase()} Custodian`}
                  </strong>
                  {stockInRecipientBranch !== "all" &&
                    branchList.find((b) => String(b.id) === stockInRecipientBranch) && (
                      <span> ({branchList.find((b) => String(b.id) === stockInRecipientBranch)?.name})</span>
                    )}
                  .
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStockInRequest(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleStockInSubmit}
              disabled={actionLoading || !stockInLocationId || stockInQuantity <= 0 || !stockInConfirmedReceipt}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  Confirm Stock-In & Handover ({stockInQuantity} units)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Raise Quotation / Record Vendor Quote Modal */}
      <Dialog open={!!quotationModalReq} onOpenChange={(open) => !open && setQuotationModalReq(null)}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="w-5 h-5 text-indigo-600" />
              Vendor Quotation / RFQ
            </DialogTitle>
            <DialogDescription>
              Raise an RFQ or directly record a manual vendor quotation for requisition{" "}
              <strong className="text-foreground">{quotationModalReq?.request_no}</strong> (
              {quotationModalReq?.title}).
            </DialogDescription>
          </DialogHeader>

          {quotationModalReq && (
            <div className="space-y-4 pt-1">
              {/* Summary Card */}
              <div className="p-3 rounded-lg bg-muted/40 border text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-muted-foreground block">Category</span>
                  <span className="font-semibold text-foreground">{quotationModalReq.category_details?.name || "--"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Quantity</span>
                  <span className="font-semibold text-foreground">{quotationModalReq.requested_quantity} units</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Est. Budget</span>
                  <span className="font-semibold text-foreground">₹{Number(quotationModalReq.estimated_cost || 0).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Department</span>
                  <span className="font-semibold text-foreground">{quotationModalReq.branch_name || "General"}</span>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex rounded-lg bg-muted p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setQuotationMode("manual")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    quotationMode === "manual"
                      ? "bg-white dark:bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Record Manual Quote
                </button>
                <button
                  type="button"
                  onClick={() => setQuotationMode("rfq")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    quotationMode === "rfq"
                      ? "bg-white dark:bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-blue-500" /> Send Digital RFQ Link
                </button>
              </div>

              {quotationMode === "manual" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        Vendor / Company Name *
                      </label>
                      <Input
                        required
                        placeholder="e.g. Dell Enterprises / Tech Solutions"
                        value={quoteFormData.vendor_name}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, vendor_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        Vendor Email
                      </label>
                      <Input
                        type="email"
                        placeholder="vendor@company.com"
                        value={quoteFormData.vendor_email}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, vendor_email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        Total Quoted Amount (₹) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={quoteFormData.total_amount}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, total_amount: e.target.value })}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        Vendor Phone (Optional)
                      </label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={quoteFormData.vendor_phone}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, vendor_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                      Quotation Document URL / Ref (Optional)
                    </label>
                    <Input
                      placeholder="https://drive.google.com/... or Invoice Reference #"
                      value={quoteFormData.quote_document_url}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, quote_document_url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                      Quotation Notes / Specifications
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Vendor warranty terms, delivery timelines, product model numbers..."
                      value={quoteFormData.description}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="auto_order_chk"
                      checked={quoteFormData.auto_order}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, auto_order: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="auto_order_chk" className="text-xs text-foreground cursor-pointer select-none">
                      <strong>Accept quote & mark order placed</strong> (Status will become <em>Order Placed</em>)
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        Vendor Email *
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="vendor@company.com"
                        value={quoteFormData.company_email}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, company_email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        Bid Submission Deadline
                      </label>
                      <Input
                        type="date"
                        value={quoteFormData.last_reply_date}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, last_reply_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                      RFQ Description & Scope
                    </label>
                    <Textarea
                      rows={3}
                      value={quoteFormData.description}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, description: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A secure, tokenized RFQ portal link will be generated for the vendor to submit their formal quote.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setQuotationModalReq(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleQuotationSubmit}
                  disabled={actionLoading}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      {quotationMode === "manual" ? "Save Vendor Quotation" : "Issue Digital RFQ"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
