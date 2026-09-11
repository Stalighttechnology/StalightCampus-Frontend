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
  Eye,
  Calendar,
  Building,
  Package,
  X,
  FileText,
  User,
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
      const cats = propCategories.length > 0 ? propCategories : await fetchInventoryCategories().catch(() => []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    if (stockInRequest && locations.length === 0) {
      fetchInventoryLocations().then((l) => setLocations(l || [])).catch(console.error);
    }
  }, [stockInRequest]);

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
            <div className="shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Procurement Management</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage purchase requisitions, endorsements, sanctions, and asset stock-in
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_hod">Pending HOD</SelectItem>
                  <SelectItem value="pending_principal">Pending Principal</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="ordered">Order Placed</SelectItem>
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
              {role !== "faculty" && (
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
                            <div className="break-words font-semibold text-foreground text-sm max-w-[240px]" title={req.title}>
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

                          {/* Est Cost */}
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

                              {/* Stock In */}
                              {isManager && ["approved", "ordered", "delivered"].includes(req.status) && (
                                <Button
                                  size="sm"
                                  onClick={() => setStockInRequest(req)}
                                  className="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" /> Stock In
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
                        <span className="font-bold text-foreground">₹{Number(req.estimated_cost || 0).toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        {isManager && ["approved", "ordered", "delivered"].includes(req.status) && (
                          <Button
                            size="sm"
                            onClick={() => setStockInRequest(req)}
                            className="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground"
                          >
                            <PackagePlus className="w-3.5 h-3.5" /> Stock In
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
        <DialogContent className="max-w-xl p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-primary" />
                Procurement Requisition Details
              </DialogTitle>
              {viewDetailsReq && getStatusBadge(viewDetailsReq.status)}
            </div>
            <DialogDescription>
              Requisition number, specifications, and administrative approvals.
            </DialogDescription>
          </DialogHeader>

          {viewDetailsReq && (
            <div className="space-y-4 pt-2">
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

              {/* Footer */}
              <div className="flex justify-end items-center pt-2 border-t gap-2">
                <Button variant="default" size="sm" onClick={() => setViewDetailsReq(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
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
