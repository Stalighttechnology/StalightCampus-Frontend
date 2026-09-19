import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicQuotation, submitPublicQuotation } from "../../../utils/inventory_api";
import { PhotoUploader } from "../common/PhotoUploader";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Building, Send, CheckCircle2, AlertCircle, Loader2, IndianRupee, FileCheck } from "lucide-react";
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

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

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

  // Validation helpers
  const isValidIndianPhone = (phone: string): boolean => {
    const clean = phone.replace(/[\s\-\(\)]/g, "");
    // Indian Mobile (10 digits starting with 6,7,8,9 with optional +91, 91, or 0)
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    // Indian Landline / Telephone (STD code 2-4 digits + 6-8 digits, total 10-11 digits)
    const landlineRegex = /^(?:\+91|91|0)?[1-9]\d{1,4}\d{6,8}$/;
    return mobileRegex.test(clean) || landlineRegex.test(clean);
  };

  const isValidEmail = (email: string): boolean => {
    // Validates email with @ and . supporting .com, .ac.in, .co.in, .edu.in, etc.
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const countWords = (text: string): number => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!vendorName.trim()) {
      newErrors.vendorName = "Company / Vendor Name is required.";
    }

    if (!vendorEmail.trim()) {
      newErrors.vendorEmail = "Contact Email is required.";
    } else if (!isValidEmail(vendorEmail)) {
      newErrors.vendorEmail = "Please enter a valid email address (e.g. abc@gmail.com or abcd@abc.ac.in).";
    }

    if (!vendorPhone.trim()) {
      newErrors.vendorPhone = "Contact Phone Number is required.";
    } else if (!isValidIndianPhone(vendorPhone)) {
      newErrors.vendorPhone = "Please enter a valid 10-digit Indian mobile or landline number with STD code.";
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      newErrors.totalAmount = "Please enter a valid total quotation price greater than 0.";
    }

    const wordCount = countWords(description);
    if (!description.trim()) {
      newErrors.description = "Proposal notes / delivery timeline is required.";
    } else if (wordCount > 100) {
      newErrors.description = `Proposal notes must not exceed 100 words (currently ${wordCount} words).`;
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    const wc = countWords(val);
    if (wc > 100) {
      setErrors((prev) => ({
        ...prev,
        description: `Proposal notes must not exceed 100 words (currently ${wc} words).`,
      }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.description;
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setTouched({
      vendorName: true,
      vendorEmail: true,
      vendorPhone: true,
      totalAmount: true,
      description: true,
    });

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
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

  const wordCount = countWords(description);

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
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Supplier Commercial Proposal
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Fields marked with <span className="text-red-500 font-bold">*</span> are compulsory
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Company / Vendor Name <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Apex Tech Solutions Pvt Ltd"
                value={vendorName}
                onChange={(e) => {
                  setVendorName(e.target.value);
                  if (errors.vendorName) setErrors({ ...errors, vendorName: "" });
                }}
                onBlur={() => setTouched({ ...touched, vendorName: true })}
                className={touched.vendorName && !vendorName.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {touched.vendorName && !vendorName.trim() && (
                <p className="text-[11px] text-red-500 mt-1">Company / Vendor Name is required</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact Email <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="sales@apextech.com or info@abc.ac.in"
                value={vendorEmail}
                onChange={(e) => {
                  setVendorEmail(e.target.value);
                  if (errors.vendorEmail) setErrors({ ...errors, vendorEmail: "" });
                }}
                onBlur={() => setTouched({ ...touched, vendorEmail: true })}
                className={touched.vendorEmail && (!vendorEmail.trim() || !isValidEmail(vendorEmail)) ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {touched.vendorEmail && !vendorEmail.trim() && (
                <p className="text-[11px] text-red-500 mt-1">Contact Email is required</p>
              )}
              {touched.vendorEmail && vendorEmail.trim() && !isValidEmail(vendorEmail) && (
                <p className="text-[11px] text-red-500 mt-1">Enter valid email (e.g. abc@gmail.com, abcd@abc.ac.in)</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact Phone Number <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                required
                placeholder="+91 98765 43210 or 080-23456789"
                value={vendorPhone}
                onChange={(e) => {
                  setVendorPhone(e.target.value);
                  if (errors.vendorPhone) setErrors({ ...errors, vendorPhone: "" });
                }}
                onBlur={() => setTouched({ ...touched, vendorPhone: true })}
                className={touched.vendorPhone && (!vendorPhone.trim() || !isValidIndianPhone(vendorPhone)) ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {touched.vendorPhone && !vendorPhone.trim() && (
                <p className="text-[11px] text-red-500 mt-1">Contact Phone Number is required</p>
              )}
              {touched.vendorPhone && vendorPhone.trim() && !isValidIndianPhone(vendorPhone) && (
                <p className="text-[11px] text-red-500 mt-1">Enter a valid 10-digit Indian mobile or landline with STD</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Total Quotation Price (INR ₹) <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                type="number"
                required
                min={0.01}
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => {
                  setTotalAmount(e.target.value);
                  if (errors.totalAmount) setErrors({ ...errors, totalAmount: "" });
                }}
                onBlur={() => setTouched({ ...touched, totalAmount: true })}
                className={touched.totalAmount && (!totalAmount || parseFloat(totalAmount) <= 0) ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {touched.totalAmount && (!totalAmount || parseFloat(totalAmount) <= 0) && (
                <p className="text-[11px] text-red-500 mt-1">Please enter a valid price greater than 0</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-foreground">
                Proposal Notes / Delivery Timeline & Warranty <span className="text-red-500 font-bold">*</span>
              </label>
              <span className={`text-[11px] font-medium ${wordCount > 100 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                {wordCount} / 100 words
              </span>
            </div>
            <Textarea
              rows={3}
              required
              placeholder="e.g. Delivery within 7 business days, 3-year on-site comprehensive warranty included..."
              value={description}
              onChange={handleDescriptionChange}
              onBlur={() => setTouched({ ...touched, description: true })}
              className={touched.description && (!description.trim() || wordCount > 100) ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {touched.description && !description.trim() && (
              <p className="text-[11px] text-red-500 mt-1">Proposal notes / terms are required</p>
            )}
            {wordCount > 100 && (
              <p className="text-[11px] text-red-500 mt-1">Maximum 100 words allowed (currently {wordCount} words)</p>
            )}
          </div>

          <PhotoUploader
            label="Upload Formal Quotation (PDF or Image)"
            value={documentUrl}
            onChange={setDocumentUrl}
            folder="inventory/quotes"
          />

          <Button
            type="submit"
            disabled={submitting || wordCount > 100}
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

