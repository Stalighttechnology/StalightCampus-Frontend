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
  fetchInventoryCategories,
  fetchInventoryLocations,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card } from "../../ui/card";
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
  const [stockInRequest, setStockInRequest] = useState<ProcurementRequest | null>(null);
  const [stockInLocationId, setStockInLocationId] = useState("");
  const [stockInRoom, setStockInRoom] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
    if (propCategories.length === 0 || propLocations.length === 0) {
      loadMetadata();
    }
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
      const [cats, locs] = await Promise.all([
        propCategories.length > 0 ? Promise.resolve(propCategories) : fetchInventoryCategories().catch(() => []),
        propLocations.length > 0 ? Promise.resolve(propLocations) : fetchInventoryLocations().catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

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

  const handleStockInSubmit = async () => {
    if (!stockInRequest || !stockInLocationId) {
      toast.error("Please select a target campus location");
      return;
    }

    try {
      setActionLoading(true);
      await stockInProcurementRequest(stockInRequest.id, {
        location_id: Number(stockInLocationId),
        room_no: stockInRoom,
      });
      toast.success("Assets automatically generated and stocked into active inventory!");
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
      ordered: { label: "Order Placed", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300" },
      added_to_inventory: { label: "Stocked In", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300" },
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedCategory, selectedPriority, selectedBranch]);

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
    <div className="space-y-4">
      {/* Filter & Search Bar with Integrated Actions */}
      <Card className="p-4 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === "faculty" ? "md:grid-cols-4" : "md:grid-cols-5"} gap-3`}>
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search request #, title, requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_hod">Pending HOD</SelectItem>
              <SelectItem value="pending_principal">Pending Principal</SelectItem>
              <SelectItem value="approved">Approved / Sanctioned</SelectItem>
              <SelectItem value="ordered">Order Placed</SelectItem>
              <SelectItem value="added_to_inventory">Stocked In</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-xs">
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
            <SelectTrigger className="text-xs">
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

          {/* Department Filter - Only for cross-department roles */}
          {role !== "faculty" && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="text-xs">
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
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-7 text-xs px-2.5">
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {role !== "faculty" && (
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Raise Requisition
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Requisitions List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading procurement requisitions...
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No procurement requests found.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isFiltered
                ? "Try adjusting or clearing your filters to see more requisitions."
                : role !== "faculty"
                ? 'Click "Raise Requisition" to request new lab equipment or physical assets.'
                : "No procurement requisitions have been created for your department."}
            </p>
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 text-xs">
                Clear Filters
              </Button>
            )}
          </Card>
        ) : (
          requests.map((req) => (
            <Card
              key={req.id}
              className="p-5 rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {req.request_no}
                    </span>
                    {getStatusBadge(req.status)}
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Priority: {req.priority}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground pt-0.5">{req.title}</h3>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-foreground">
                    ₹{Number(req.estimated_cost || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty: <strong>{req.requested_quantity}</strong> unit(s)
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {req.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground border-t border-border/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Category: <strong className="text-foreground">{req.category_details?.name}</strong></span>
                  {req.branch_name && <span>Department: <strong className="text-foreground">{req.branch_name}</strong></span>}
                  <span>Requested by: <strong className="text-foreground">{req.requested_by_name}</strong></span>
                </div>

                {/* Role-based action buttons */}
                <div className="flex items-center gap-2">
                  {/* HOD Endorse */}
                  {isHOD && req.status === "pending_hod" && (
                    <Button
                      size="sm"
                      onClick={() => handleEndorse(req)}
                      disabled={actionLoading}
                      className="gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Endorse & Forward
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
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSanction(req, "approved")}
                        disabled={actionLoading}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sanction / Approve
                      </Button>
                    </>
                  )}

                  {/* 1-Click Stock-in to active inventory */}
                  {isManager && ["approved", "ordered", "delivered"].includes(req.status) && (
                    <Button
                      size="sm"
                      onClick={() => setStockInRequest(req)}
                      className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-sm"
                    >
                      <PackagePlus className="w-3.5 h-3.5" /> Stock In to Inventory
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {!loading && requests.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-bold text-foreground">
              {startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-foreground">
              {Math.min(startIndex + pageSize, totalCount || requests.length)}
            </span>{" "}
            of <span className="font-bold text-foreground">{totalCount || requests.length}</span> requisition(s)
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

      {/* 1-Click Stock-In Modal */}
      <Dialog open={!!stockInRequest} onOpenChange={() => setStockInRequest(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <PackagePlus className="w-5 h-5 text-primary" />
              Stock In to Active Inventory
            </DialogTitle>
            <DialogDescription>
              Automatically generate sequential item codes for{" "}
              <strong>{stockInRequest?.requested_quantity}</strong> unit(s) of{" "}
              <strong>{stockInRequest?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Target Campus Building / Location *
              </label>
              <Select value={stockInLocationId} onValueChange={setStockInLocationId}>
                <SelectTrigger>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Room / Lab Number (Optional)
              </label>
              <Input
                placeholder="e.g. Lab 204"
                value={stockInRoom}
                onChange={(e) => setStockInRoom(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStockInRequest(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleStockInSubmit}
                disabled={actionLoading || !stockInLocationId}
                className="gap-1.5"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <PackagePlus className="w-4 h-4" /> Generate & Stock In
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
