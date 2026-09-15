import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicQuotation, submitPublicQuotation } from "../../../utils/inventory_api";
import { PhotoUploader } from "../common/PhotoUploader";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Building, Send, CheckCircle2, AlertCircle, Loader2, Package, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export const PublicVendorQuote: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchPublicQuotation(token)
      .then((data) => {
        setQuotation(data);
      })
      .catch((err) => {
        console.error("Error loading quotation:", err);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!vendorName.trim() || !vendorEmail.trim() || !totalAmount) {
      toast.error("Please fill in company name, email, and total quotation price");
      return;
    }

    try {
      setSubmitting(true);
      await submitPublicQuotation(token, {
        vendor_name: vendorName.trim(),
        vendor_email: vendorEmail.trim(),
        vendor_phone: vendorPhone.trim(),
        total_amount: parseFloat(totalAmount),
        description: description.trim(),
        quote_document_url: documentUrl,
      });

      setSubmitted(true);
      toast.success("Quotation response submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quotation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading Quotation Request...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-3xl shadow-xl">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">RFQ Link Invalid or Expired</h2>
          <p className="text-xs text-muted-foreground">
            The quotation request link is no longer active or could not be found. Please contact the institution procurement department.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-3xl shadow-xl border-emerald-500/30">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Quotation Submitted!</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Thank you, <strong>{vendorName}</strong>. Your quotation bid for <strong>{quotation.product_name}</strong> has been received by <strong>{quotation.institution_name}</strong>.
          </p>
          <div className="p-4 bg-muted/40 rounded-2xl text-xs font-mono text-muted-foreground">
            Total Quote Amount: ₹{Number(totalAmount).toLocaleString("en-IN")}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12 px-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl shadow-2xl border bg-card space-y-6">
        {/* Header */}
        <div className="border-b pb-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Building className="w-4 h-4" /> {quotation.institution_name} • Procurement RFQ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            {quotation.product_name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Please submit your commercial quotation and technical terms below.
          </p>
        </div>

        {/* Requirements Box */}
        <div className="p-4 rounded-2xl bg-muted/30 border space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>Category: {quotation.category_name}</span>
            <span className="font-extrabold text-primary">Quantity: {quotation.quantity} unit(s)</span>
          </div>
          {quotation.description && (
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {quotation.description}
            </p>
          )}
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Supplier Commercial Proposal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Company / Vendor Name *
              </label>
              <Input
                required
                placeholder="e.g. Apex Tech Solutions Pvt Ltd"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact Email *
              </label>
              <Input
                type="email"
                required
                placeholder="sales@apextech.com"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact Phone Number
              </label>
              <Input
                placeholder="+91 98765 43210"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Total Quotation Price (INR ₹) *
              </label>
              <Input
                type="number"
                required
                min={0}
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Proposal Notes / Delivery Timeline & Warranty
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Delivery within 7 business days, 3-year on-site comprehensive warranty included..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <PhotoUploader
            label="Upload Formal Quotation (PDF or Image)"
            value={documentUrl}
            onChange={setDocumentUrl}
            folder="inventory/quotes"
          />

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-6 text-sm font-bold gap-2 shadow-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting Quotation...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Commercial Quotation
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};
