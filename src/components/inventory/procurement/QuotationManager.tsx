import React, { useState, useEffect } from "react";
import {
  InventoryQuotation,
  InventoryCategory,
  fetchInventoryQuotationsPaginated,
  createInventoryQuotation,
  acceptQuotationResponse,
  addQuotationManualResponse,
  fetchInventoryCategories,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import {
  FileText,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Mail,
  IndianRupee,
  Building,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Calendar,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  role?: string;
}

export const QuotationManager: React.FC<Props> = ({ role = "admin" }) => {
  const canCUD = role === "inventory_manager" || role === "superadmin";
  const [quotations, setQuotations] = useState<InventoryQuotation[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<InventoryQuotation | null>(null);
  const [viewDetailsQuote, setViewDetailsQuote] = useState<InventoryQuotation | null>(null);
  const [recordBidModalQuote, setRecordBidModalQuote] = useState<InventoryQuotation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Record Manual Bid State
  const [bidFormData, setBidFormData] = useState({
    vendor_name: "",
    vendor_email: "",
    vendor_phone: "",
    total_amount: "",
    quote_document_url: "",
    description: "",
    auto_accept: false,
  });

  // Create Form State
  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    category_id: "",
    quantity: 1,
    company_email: "",
    last_reply_date: "",
  });

  const handleOpenRecordBid = (quote: InventoryQuotation) => {
    setBidFormData({
      vendor_name: "",
      vendor_email: quote.company_email || "",
      vendor_phone: "",
      total_amount: "",
      quote_document_url: "",
      description: "",
      auto_accept: false,
    });
    setRecordBidModalQuote(quote);
  };

  const handleRecordBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordBidModalQuote || !bidFormData.vendor_name.trim() || !bidFormData.total_amount) {
      toast.error("Please enter vendor name and total quotation amount");
      return;
    }

    try {
      setSubmitting(true);
      await addQuotationManualResponse(recordBidModalQuote.id, {
        vendor_name: bidFormData.vendor_name.trim(),
        vendor_email: bidFormData.vendor_email.trim() || undefined,
        vendor_phone: bidFormData.vendor_phone.trim() || undefined,
        total_amount: Number(bidFormData.total_amount),
        description: bidFormData.description.trim() || undefined,
        quote_document_url: bidFormData.quote_document_url.trim() || undefined,
        auto_accept: bidFormData.auto_accept,
      });

      toast.success(
        bidFormData.auto_accept
          ? `Bid from ${bidFormData.vendor_name} recorded and accepted! Order placed.`
          : `Bid from ${bidFormData.vendor_name} recorded successfully.`
      );
      setRecordBidModalQuote(null);
      loadQuotations(currentPage);
      if (selectedQuotation && selectedQuotation.id === recordBidModalQuote.id) {
        setSelectedQuotation(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record vendor bid");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    loadQuotations(1);
  }, [searchQuery, selectedCategory, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const cats = await fetchInventoryCategories();
      setCategories(cats);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadQuotations = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const res = await fetchInventoryQuotationsPaginated({
        page,
        page_size: pageSize,
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });

      if (res && res.results) {
        setQuotations(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
        setCurrentPage(res.current_page ?? page);
      } else if (Array.isArray(res)) {
        setQuotations(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
        setCurrentPage(page);
      } else {
        setQuotations([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadQuotations(page);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.company_email || !formData.category_id) {
      toast.error("Please fill in product name, vendor email, and category");
      return;
    }

    try {
      setSubmitting(true);
      await createInventoryQuotation({
        ...formData,
        category_id: Number(formData.category_id),
        quantity: Number(formData.quantity) || 1,
      });

      toast.success("Quotation request created successfully with public token");
      setShowCreateModal(false);
      setFormData({
        product_name: "",
        description: "",
        category_id: "",
        quantity: 1,
        company_email: "",
        last_reply_date: "",
      });
      loadQuotations(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (quote: InventoryQuotation) => {
    const fullUrl = `${window.location.origin}/public/quotation/${quote.access_token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(quote.access_token);
    toast.success("Vendor quote portal link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleAcceptResponse = async (quotationId: number, responseId: number) => {
    try {
      await acceptQuotationResponse(quotationId, responseId);
      toast.success("Vendor bid accepted successfully!");
      loadQuotations(currentPage);
      if (selectedQuotation) {
        setSelectedQuotation({
          ...selectedQuotation,
          status: "accepted",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to accept response");
    }
  };

  const startIndex = (currentPage - 1) * pageSize;

  return (
    <div className="w-full text-sm sm:text-base">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col min-h-[620px] md:min-h-[700px] shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Quotation Management</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage vendor quotation requests (RFQs), copy vendor portal links, and evaluate bids
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCUD && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Issue New RFQ</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Search & Filters */}
          <div className="px-3 sm:px-5 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <Input
                  placeholder="Search by product, requirement, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-card text-foreground py-1 pr-12 text-xs sm:text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={(val) => setSelectedCategory(val)}
              >
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

              {/* Status Filter */}
              <Select
                value={selectedStatus}
                onValueChange={(val) => setSelectedStatus(val)}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent (Pending)</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || selectedCategory !== "all" || selectedStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedStatus("all");
                  }}
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
              Loading quotation requests...
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto border rounded-xl mb-2 relative shadow-inner">
                <table className="w-full text-base md:text-sm text-left table-auto border-collapse">
                  <thead className="sticky top-0 z-20 border-b text-sm md:text-xs uppercase font-bold tracking-wider bg-slate-50/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-border shadow-sm backdrop-blur-md">
                    <tr>
                      <th className="py-3.5 px-4 text-left font-bold">Quotation / Product Name</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold text-center">Quantity</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 font-bold text-center">Bids</th>
                      <th className="py-3.5 px-4 text-right font-bold w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {quotations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          No quotation requests found.
                        </td>
                      </tr>
                    ) : (
                      quotations.map((quote) => (
                        <tr
                          key={quote.id}
                          className="transition-colors duration-200 hover:bg-blue-50/40 dark:hover:bg-accent/70 text-foreground"
                        >
                          {/* Product Name */}
                          <td className="py-3.5 px-4 align-middle font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="break-words font-semibold text-foreground">{quote.product_name}</span>
                              {(quote.procurement_request_details || quote.procurement_request) && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 whitespace-nowrap flex items-center gap-1">
                                  <span>{quote.procurement_request_details?.request_no || `Req #${quote.procurement_request}`}</span>
                                  {quote.procurement_request_details?.branch_name && (
                                    <span className="text-[9px] opacity-80">({quote.procurement_request_details.branch_name})</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{quote.company_email}</div>
                          </td>

                          {/* Category Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs font-medium text-foreground">
                              {quote.category_details?.name || "--"}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-4 align-middle text-center">
                            <span className="font-semibold text-sm">{quote.quantity}</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-middle text-center">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${
                                quote.status === "accepted"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  : quote.status === "responded"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                              }`}
                            >
                              {quote.status.toUpperCase()}
                            </span>
                          </td>

                          {/* Bids */}
                          <td className="py-3.5 px-4 align-middle text-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedQuotation(quote)}
                              className="text-xs font-semibold h-8"
                            >
                              Bids ({quote.responses_count || (quote.responses ? quote.responses.length : 0)})
                            </Button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              {canCUD && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenRecordBid(quote)}
                                  className="gap-1 text-xs h-8 text-primary border-primary/30 hover:bg-primary/10"
                                  title="Record Manual Vendor Bid"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Bid
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyLink(quote)}
                                className="gap-1.5 text-xs h-8"
                                title="Copy Vendor Link"
                              >
                                {copiedToken === quote.access_token ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" /> Copy Link
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setViewDetailsQuote(quote)}
                                className="gap-1 text-xs font-semibold h-8"
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
                {quotations.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                    No quotation requests found.
                  </div>
                ) : (
                  quotations.map((quote) => (
                    <div
                      key={quote.id}
                      className="p-4 rounded-xl border bg-white dark:bg-card border-gray-200 dark:border-border text-foreground flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                              quote.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : quote.status === "responded"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {quote.status.toUpperCase()}
                          </span>
                          <h3 className="font-semibold text-sm text-foreground">{quote.product_name}</h3>
                          <p className="text-xs text-muted-foreground">{quote.company_email}</p>
                          {(quote.procurement_request_details || quote.procurement_request) && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 inline-block">
                              {quote.procurement_request_details?.request_no || `Req #${quote.procurement_request}`}
                              {quote.procurement_request_details?.branch_name && ` (${quote.procurement_request_details.branch_name})`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold px-2 py-1 rounded bg-muted">
                          Qty: {quote.quantity}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Category: <strong className="text-foreground">{quote.category_details?.name || "--"}</strong>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/50">
                        {canCUD && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRecordBid(quote)}
                            className="gap-1 text-xs h-8 text-primary border-primary/30"
                          >
                            <Plus className="w-3.5 h-3.5" /> Bid
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(quote)}
                          className="gap-1 text-xs h-8"
                        >
                          <Copy className="w-3.5 h-3.5" /> Link
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedQuotation(quote)}
                          className="text-xs font-semibold h-8"
                        >
                          Bids ({quote.responses_count || (quote.responses ? quote.responses.length : 0)})
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setViewDetailsQuote(quote)}
                          className="gap-1 text-xs font-semibold h-8"
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
                {Math.min(startIndex + pageSize, totalCount || quotations.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{totalCount || quotations.length}</span> Quotation(s)
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

      {/* Create RFQ Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Plus className="w-5 h-5 text-primary" />
              Issue Quotation Request (RFQ)
            </DialogTitle>
            <DialogDescription>
              Create an RFQ with a secure token for vendor suppliers to submit their prices.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Product / Equipment Name *
              </label>
              <Input
                required
                placeholder="e.g. 55-inch Interactive Smart Display"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Category *
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
                  Quantity *
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Supplier Email *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="vendor@company.com"
                  value={formData.company_email}
                  onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Deadline for Quotes
                </label>
                <Input
                  type="date"
                  value={formData.last_reply_date}
                  onChange={(e) => setFormData({ ...formData, last_reply_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Specifications / Requirements
              </label>
              <Textarea
                rows={3}
                placeholder="Detail technical specs, warranty terms, and delivery expectations..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue RFQ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Manual Vendor Bid Dialog */}
      <Dialog open={!!recordBidModalQuote} onOpenChange={(open) => !open && setRecordBidModalQuote(null)}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="w-5 h-5 text-indigo-600" />
              Record Vendor Bid / Quote
            </DialogTitle>
            <DialogDescription>
              Record a quotation received from a supplier for{" "}
              <strong>{recordBidModalQuote?.product_name}</strong> ({recordBidModalQuote?.quantity} unit(s)).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordBidSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Vendor / Supplier Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  value={bidFormData.vendor_name}
                  onChange={(e) => setBidFormData({ ...bidFormData, vendor_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Total Quoted Amount (₹) *
                </label>
                <Input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  placeholder="e.g. 75000"
                  value={bidFormData.total_amount}
                  onChange={(e) => setBidFormData({ ...bidFormData, total_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Vendor Email
                </label>
                <Input
                  type="email"
                  placeholder="sales@acmetech.com"
                  value={bidFormData.vendor_email}
                  onChange={(e) => setBidFormData({ ...bidFormData, vendor_email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Vendor Phone
                </label>
                <Input
                  placeholder="+91 9876543210"
                  value={bidFormData.vendor_phone}
                  onChange={(e) => setBidFormData({ ...bidFormData, vendor_phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Quote Document / URL (Optional)
              </label>
              <Input
                placeholder="https://drive.google.com/... or uploaded URL"
                value={bidFormData.quote_document_url}
                onChange={(e) => setBidFormData({ ...bidFormData, quote_document_url: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Quotation Remarks / Terms
              </label>
              <Textarea
                rows={2}
                placeholder="Terms, delivery timeline, warranty included..."
                value={bidFormData.description}
                onChange={(e) => setBidFormData({ ...bidFormData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <input
                type="checkbox"
                id="auto_accept_bid"
                checked={bidFormData.auto_accept}
                onChange={(e) => setBidFormData({ ...bidFormData, auto_accept: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <label htmlFor="auto_accept_bid" className="text-xs text-foreground cursor-pointer font-medium">
                Immediately accept this bid and advance to Order Placed
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRecordBidModalQuote(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Record Bid"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View RFQ Details Dialog */}
      <Dialog open={!!viewDetailsQuote} onOpenChange={() => setViewDetailsQuote(null)}>
        <DialogContent className="max-w-xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3 pr-8">
            <div className="flex items-center gap-2.5 flex-wrap">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-primary" />
                Quotation Request Details
              </DialogTitle>
              {viewDetailsQuote && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    viewDetailsQuote.status === "accepted"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                      : viewDetailsQuote.status === "responded"
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                  }`}
                >
                  {viewDetailsQuote.status.toUpperCase()}
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Detailed specifications and vendor request information.
            </DialogDescription>
          </DialogHeader>

          {viewDetailsQuote && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-muted/30 border space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {viewDetailsQuote.product_name}
                </h3>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>Requirement: <strong className="text-foreground">{viewDetailsQuote.quantity} Units</strong></span>
                  {(viewDetailsQuote.procurement_request_details || viewDetailsQuote.procurement_request) && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {viewDetailsQuote.procurement_request_details?.request_no || `Procurement Ref #${viewDetailsQuote.procurement_request}`}
                        {viewDetailsQuote.procurement_request_details?.branch_name && ` (${viewDetailsQuote.procurement_request_details.branch_name})`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Specifications / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Specifications & Requirements
                </label>
                <div className="p-3.5 rounded-xl bg-card border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {viewDetailsQuote.description || "No specifications provided."}
                </div>
              </div>

              {/* Key-Value Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Vendor / Recipient
                  </span>
                  <p className="font-semibold text-foreground break-all">{viewDetailsQuote.company_email}</p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Building className="w-3.5 h-3.5 text-primary" /> Category
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewDetailsQuote.category_details?.name || "Uncategorized"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Target Reply Date
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewDetailsQuote.last_reply_date || "No deadline specified"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Recorded Bids
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewDetailsQuote.responses_count || (viewDetailsQuote.responses ? viewDetailsQuote.responses.length : 0)} Submitted
                  </p>
                </div>
              </div>

              {/* Public Portal Link */}
              <div className="p-3 rounded-xl bg-muted/30 border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-xs text-muted-foreground min-w-0 flex-1">
                  <span className="font-medium text-foreground">Portal Link: </span>
                  <code className="text-[11px] bg-background border px-2 py-0.5 rounded font-mono truncate inline-block max-w-[240px] align-middle ml-1">
                    /public/quotation/{viewDetailsQuote.access_token}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(viewDetailsQuote)}
                    className="h-8 text-xs gap-1"
                  >
                    {copiedToken === viewDetailsQuote.access_token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `${window.location.origin}/public/quotation/${viewDetailsQuote.access_token}`,
                        "_blank"
                      )
                    }
                    className="h-8 text-xs gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Link
                  </Button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-between items-center pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const quote = viewDetailsQuote;
                      setViewDetailsQuote(null);
                      setSelectedQuotation(quote);
                    }}
                    className="text-xs font-semibold gap-1.5 h-9"
                  >
                    <Building className="w-3.5 h-3.5 text-primary" /> View Bids ({viewDetailsQuote.responses_count || (viewDetailsQuote.responses ? viewDetailsQuote.responses.length : 0)})
                  </Button>

                  {canCUD && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const quote = viewDetailsQuote;
                        setViewDetailsQuote(null);
                        handleOpenRecordBid(quote);
                      }}
                      className="text-xs font-semibold gap-1.5 h-9 text-primary border-primary/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record Bid
                    </Button>
                  )}
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setViewDetailsQuote(null)}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Responses Drawer / Dialog */}
      <Dialog open={!!selectedQuotation} onOpenChange={() => setSelectedQuotation(null)}>
        <DialogContent className="max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Building className="w-5 h-5 text-primary" />
                Vendor Bids for {selectedQuotation?.product_name}
              </DialogTitle>
              <DialogDescription>
                Compare submitted vendor prices and award the winning quote.
              </DialogDescription>
            </div>

            {canCUD && selectedQuotation && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenRecordBid(selectedQuotation)}
                className="text-xs font-semibold gap-1 shrink-0 text-primary border-primary/30"
              >
                <Plus className="w-3.5 h-3.5" /> Record Manual Bid
              </Button>
            )}
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {selectedQuotation?.responses?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs space-y-3">
                <p>No vendor responses submitted yet. Share the public RFQ link or manually record bids.</p>
                {canCUD && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenRecordBid(selectedQuotation)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Record First Vendor Bid
                  </Button>
                )}
              </div>
            ) : (
              selectedQuotation?.responses?.map((resp, idx) => (
                <div
                  key={resp.id}
                  className={`p-4 border rounded-2xl bg-card space-y-3 shadow-sm transition-colors ${
                    selectedQuotation.status === "accepted" && idx === 0
                      ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                      : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-sm">{resp.vendor_name}</h4>
                        {selectedQuotation.status === "accepted" && idx === 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Awarded Bid
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {resp.vendor_email} {resp.vendor_phone && `• ${resp.vendor_phone}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Number(resp.total_amount).toLocaleString("en-IN")}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(resp.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {resp.description && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl">
                      {resp.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    {resp.quote_document_url ? (
                      <a
                        href={resp.quote_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Quote Document
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No document attached</span>
                    )}

                    {canCUD && selectedQuotation.status !== "accepted" && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptResponse(selectedQuotation.id, resp.id)}
                        className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Award / Accept Bid
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
