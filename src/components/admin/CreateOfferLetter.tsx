import React, { useState } from "react";
import { offerLetterApi } from "../../api/offer_letter_api";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { FileCheck, ArrowLeft, Loader2, Download, Check, Briefcase, DollarSign, Calendar } from "lucide-react";

interface CreateOfferLetterProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CreateOfferLetter = ({ onBack, onSuccess }: CreateOfferLetterProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ offer_id: string; candidate_name: string; pdf_url: string } | null>(null);

  const [formData, setFormData] = useState({
    candidate_name: "",
    email: "",
    phone: "",
    company_name: "Stalight Technologies Pvt Ltd",
    designation: "Software Engineer",
    department: "Engineering",
    offer_type: "FULL_TIME" as 'FULL_TIME' | 'INTERNSHIP' | 'PART_TIME' | 'CONTRACT',
    date_of_joining: new Date().toISOString().split("T")[0],
    issue_date: new Date().toISOString().split("T")[0],
    work_location: "No. 129, 1st Block, Dr. Rajkumar Road, Rajajinagar, Bengaluru – 560010",
    probation_period: "3 months from the Date of Joining",
    minimum_commitment: "1 (One) year from the Date of Joining",
    salary_monthly: "₹30,000",
    salary_words: "Rupees Thirty Thousand only",
    salary_annual_ctc: "₹3,60,000",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-adjust default commitment / probation based on offer_type
      if (name === 'offer_type') {
        if (value === 'INTERNSHIP') {
          updated.probation_period = "N/A (Internship Duration)";
          updated.minimum_commitment = "6 (Six) months from the Date of Joining";
        } else if (value === 'FULL_TIME') {
          updated.probation_period = "3 months from the Date of Joining";
          updated.minimum_commitment = "1 (One) year from the Date of Joining";
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.candidate_name || !formData.email || !formData.designation || !formData.salary_monthly) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Candidate Name, Email, Designation, and Monthly CTC are required.",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await offerLetterApi.createOfferLetter(formData);
      setSuccessData({
        offer_id: res.offer_id,
        candidate_name: res.candidate_name,
        pdf_url: res.pdf_url,
      });
      toast({
        title: "Offer Letter Issued!",
        description: `Official offer letter sent to ${formData.email}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to issue offer letter.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="w-full py-4 text-center">
        <div className="bg-emerald-50/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-6 space-y-4 max-w-xl mx-auto">
          <div>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-emerald-800 dark:text-emerald-300 text-2xl font-semibold">Offer Letter Issued!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Employment offer letter generated and emailed to candidate.
            </p>
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Offer ID / Ref</span>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">{successData.offer_id}</span>
              <span className="text-xs text-slate-500 block mt-1">{successData.candidate_name}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The PDF copy is stored securely in the cloud repository and attached to the candidate's notification email.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700">
              <a href={successData.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" /> Download Offer Letter PDF
              </a>
            </Button>
            <Button variant="outline" onClick={onSuccess} className="w-full">
              Go to Offer Letter List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Issue New Offer Letter</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Briefcase className="w-4 h-4 text-indigo-600" /> Candidate &amp; Role Specifications
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide candidate information and job appointment details.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidate_name">Candidate Full Name *</Label>
                <Input
                  id="candidate_name"
                  name="candidate_name"
                  value={formData.candidate_name}
                  onChange={handleChange}
                  placeholder="e.g. Shashank G S"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Personal Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. candidate@gmail.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer_type">Employment Type *</Label>
                <select
                  id="offer_type"
                  name="offer_type"
                  value={formData.offer_type}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="FULL_TIME">Full-Time Employment</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="PART_TIME">Part-Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation / Role *</Label>
                <Input
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Software Engineer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_joining">Date of Joining *</Label>
                <Input
                  id="date_of_joining"
                  name="date_of_joining"
                  type="date"
                  value={formData.date_of_joining}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date *</Label>
                <Input
                  id="issue_date"
                  name="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Compensation Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Compensation &amp; CTC Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Specify the monthly and annual salary package.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_monthly">Monthly CTC *</Label>
              <Input
                id="salary_monthly"
                name="salary_monthly"
                value={formData.salary_monthly}
                onChange={handleChange}
                placeholder="e.g. ₹30,000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_words">Monthly CTC in Words *</Label>
              <Input
                id="salary_words"
                name="salary_words"
                value={formData.salary_words}
                onChange={handleChange}
                placeholder="e.g. Rupees Thirty Thousand only"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_annual_ctc">Annual CTC (Optional)</Label>
              <Input
                id="salary_annual_ctc"
                name="salary_annual_ctc"
                value={formData.salary_annual_ctc}
                onChange={handleChange}
                placeholder="e.g. ₹3,60,000"
              />
            </div>
          </div>
        </div>

        {/* Location & Terms */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Calendar className="w-4 h-4 text-indigo-600" /> Location, Probation &amp; Service Commitment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Terms defined in the official company letterhead.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="work_location">Work Location</Label>
              <Input
                id="work_location"
                name="work_location"
                value={formData.work_location}
                onChange={handleChange}
                placeholder="Office address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="probation_period">Probation Period</Label>
                <Input
                  id="probation_period"
                  name="probation_period"
                  value={formData.probation_period}
                  onChange={handleChange}
                  placeholder="e.g. 3 months from the Date of Joining"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_commitment">Minimum Service Commitment</Label>
                <Input
                  id="minimum_commitment"
                  name="minimum_commitment"
                  value={formData.minimum_commitment}
                  onChange={handleChange}
                  placeholder="e.g. 1 (One) year from the Date of Joining"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onBack} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating &amp; Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Issue Offer Letter
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateOfferLetter;
