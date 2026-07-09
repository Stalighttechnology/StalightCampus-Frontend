import React, { useState } from "react";
import { certificateApi } from "../../api/certificate_api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { Award, ArrowLeft, Loader2, Download, Check } from "lucide-react";

interface CreateCertificateProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CreateCertificate = ({ onBack, onSuccess }: CreateCertificateProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ certificate_id: string; pdf_url: string } | null>(null);

  const [formData, setFormData] = useState({
    student_name: "",
    email: "",
    certificate_type: "INTERNSHIP",
    company_name: "Stalight Technologies Pvt Ltd",
    internship_role: "",
    course_name: "",
    description: "",
    start_date: "",
    end_date: "",
    issue_date: new Date().toISOString().split("T")[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name || !formData.email) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Student Name and Email are required.",
      });
      return;
    }

    try {
      setLoading(true);
      const payload: any = { ...formData };
      if (formData.certificate_type !== "INTERNSHIP") {
        delete payload.internship_role;
      }
      if (formData.certificate_type !== "COURSE") {
        delete payload.course_name;
      }
      
      const res = await certificateApi.createCertificate(payload);
      setSuccessData({
        certificate_id: res.certificate_id,
        pdf_url: res.pdf_url,
      });
      toast({
        title: "Success",
        description: "Certificate issued successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to issue certificate.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto w-full py-8">
        <Card className="border-emerald-200 bg-emerald-50/20 shadow-xl text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <CardTitle className="text-emerald-800 text-2xl font-bold">Certificate Issued!</CardTitle>
            <CardDescription>
              Credential generated and registered successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Certificate ID</span>
              <span className="text-lg font-bold text-slate-800">{successData.certificate_id}</span>
            </div>
            <p className="text-sm text-slate-600">
              The PDF copy of the certificate is generated and stored securely in the cloud repository.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full flex items-center justify-center gap-2">
              <a href={successData.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" /> Download Certificate PDF
              </a>
            </Button>
            <Button variant="outline" onClick={onSuccess} className="w-full">
              Go to Certificate List
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full py-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Issue New Certificate</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Certificate Specifications
            </CardTitle>
            <CardDescription>
              Provide student details and choose the credential configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student_name">Student Full Name *</Label>
                <Input
                  id="student_name"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Student Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. rahul@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certificate_type">Certificate Type *</Label>
                <select
                  id="certificate_type"
                  name="certificate_type"
                  value={formData.certificate_type}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="INTERNSHIP">Internship Certificate</option>
                  <option value="COURSE">Course Completion Certificate</option>
                  <option value="WORKSHOP">Workshop Certificate</option>
                  <option value="PARTICIPATION">Participation Certificate</option>
                  <option value="ACHIEVEMENT">Achievement Certificate</option>
                  <option value="EXPERIENCE">Experience Certificate</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Issuing Company</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Company Name"
                />
              </div>
            </div>

            {formData.certificate_type === "INTERNSHIP" && (
              <div className="space-y-2">
                <Label htmlFor="internship_role">Internship Role *</Label>
                <Input
                  id="internship_role"
                  name="internship_role"
                  value={formData.internship_role}
                  onChange={handleChange}
                  placeholder="e.g. Frontend Developer Intern"
                  required={formData.certificate_type === "INTERNSHIP"}
                />
              </div>
            )}

            {formData.certificate_type === "COURSE" && (
              <div className="space-y-2">
                <Label htmlFor="course_name">Course Title *</Label>
                <Input
                  id="course_name"
                  name="course_name"
                  value={formData.course_name}
                  onChange={handleChange}
                  placeholder="e.g. Full Stack Web Development"
                  required={formData.certificate_type === "COURSE"}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  name="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Description / Context</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description of key tasks, achievements, projects completed..."
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[150px]">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                </>
              ) : (
                "Generate Certificate"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default CreateCertificate;
