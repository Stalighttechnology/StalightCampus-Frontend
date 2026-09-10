import React, { useState, useEffect } from "react";
import {
  InventoryQuotation,
  InventoryCategory,
  fetchInventoryQuotations,
  createInventoryQuotation,
  acceptQuotationResponse,
  fetchInventoryCategories,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card } from "../../ui/card";
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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<InventoryQuotation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    category_id: "",
    quantity: 1,
    company_email: "",
    last_reply_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quotes, cats] = await Promise.all([
        fetchInventoryQuotations(),
        fetchInventoryCategories(),
      ]);
      setQuotations(quotes);
      setCategories(cats);
    } catch (err: any) {
      toast.error(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
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
      loadData();
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
      loadData();
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

  return (
    <div className="space-y-6">
      {/* Header Action */}
      {canCUD && (
        <div className="flex items-center justify-end gap-4 w-full">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5 text-xs font-semibold shadow-sm ml-auto"
          >
            <Plus className="w-4 h-4" /> Issue New RFQ
          </Button>
        </div>
      )}

      {/* List of RFQs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading quotation requests...
          </div>
        ) : quotations.length === 0 ? (
          <Card className="col-span-full p-12 text-center text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No quotation requests issued yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Issue New RFQ" to request quotes from vendor suppliers.
            </p>
          </Card>
        ) : (
          quotations.map((quote) => (
            <Card
              key={quote.id}
              className="p-5 rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-2 border-b pb-3">
                <div className="space-y-1">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      quote.status === "accepted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : quote.status === "responded"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {quote.status.toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-foreground pt-1">{quote.product_name}</h3>
                </div>

                <div className="text-right text-xs">
                  <span className="font-semibold text-muted-foreground">Qty: </span>
                  <strong className="text-foreground">{quote.quantity}</strong>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{quote.description}</p>

              <div className="text-xs space-y-1 text-muted-foreground">
                <div>
                  Vendor: <strong className="text-foreground">{quote.company_email}</strong>
                </div>
                <div>
                  Category: <strong className="text-foreground">{quote.category_details?.name}</strong>
                </div>
                {quote.last_reply_date && (
                  <div>
                    Target Reply Date: <strong className="text-foreground">{quote.last_reply_date}</strong>
                  </div>
                )}
              </div>

              {/* Vendor Link & Responses Button */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(quote)}
                  className="gap-1.5 text-xs"
                >
                  {copiedToken === quote.access_token ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Link Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Vendor Link
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedQuotation(quote)}
                  className="text-xs font-semibold"
                >
                  Bids ({quote.responses_count || 0})
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

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

      {/* Responses Drawer / Dialog */}
      <Dialog open={!!selectedQuotation} onOpenChange={() => setSelectedQuotation(null)}>
        <DialogContent className="max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Building className="w-5 h-5 text-primary" />
              Vendor Bids for {selectedQuotation?.product_name}
            </DialogTitle>
            <DialogDescription>
              Compare submitted vendor prices and accept the winning quote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {selectedQuotation?.responses?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No vendor responses submitted yet. Share the public RFQ link with your suppliers.
              </div>
            ) : (
              selectedQuotation?.responses?.map((resp) => (
                <div
                  key={resp.id}
                  className="p-4 border rounded-2xl bg-card space-y-3 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{resp.vendor_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {resp.vendor_email} {resp.vendor_phone && `• ${resp.vendor_phone}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-emerald-600">
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
                        <FileText className="w-3.5 h-3.5" /> View Quote PDF
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No PDF attached</span>
                    )}

                    {canCUD && selectedQuotation.status !== "accepted" && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptResponse(selectedQuotation.id, resp.id)}
                        className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept Quote
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
