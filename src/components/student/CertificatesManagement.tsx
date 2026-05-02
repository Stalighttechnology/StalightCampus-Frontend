import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import {
  Download,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useStudentCertificatesQuery, useStudentCertificateUploadMutation } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { useFileUpload, useFormValidation, validationRules } from "@/hooks/useOptimizations";
import { Progress } from "../ui/progress";
import { SkeletonTable } from "../ui/skeleton";

// Mock data - replace with actual API data
const mockCertificates = [
  {
    id: 1,
    name: "Course Completion Certificate",
    issueDate: "2024-03-15",
    status: "issued",
    downloadUrl: "#",
  },
  {
    id: 2,
    name: "Academic Achievement Certificate",
    issueDate: "2024-02-20",
    status: "issued",
    downloadUrl: "#",
  },
];

const mockRequests = [
  {
    id: 1,
    type: "Bonafide Certificate",
    requestDate: "2024-04-01",
    status: "pending",
  },
  {
    id: 2,
    type: "Transfer Certificate",
    requestDate: "2024-03-28",
    status: "rejected",
    reason: "Invalid supporting documents",
  },
];

interface Certificate {
  id: string;
  file_url: string;
  description: string;
  uploaded_at: string;
}

const CertificatesManagement = () => {
  const [activeTab, setActiveTab] = useState("view");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const { theme } = useTheme();

  // Use the new file upload hook with compression and validation
  const {
    uploadFile: uploadWithCompression,
    uploadProgress,
    isUploading,
    error: uploadError,
    reset: resetUpload
  } = useFileUpload({
    maxSizeMB: 1, // Compress images to 1MB max
    maxWidthOrHeight: 1920,
    compressImages: true,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB max
  });

  // Form validation
  const formValidationRules = {
    uploadDescription: {
      required: true,
      minLength: 10,
      message: "Description must be at least 10 characters"
    },
  };

  const {
    errors,
    validateForm,
    validateSingleField,
    setFieldTouched,
    clearErrors,
    hasFieldError,
  } = useFormValidation(formValidationRules);

  // Use React Query hooks
  const { data: certificatesResponse, isLoading } = useStudentCertificatesQuery();
  const uploadMutation = useStudentCertificateUploadMutation();

  const certificates = certificatesResponse?.certificates || [];

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadDescription.trim()) return;

    // Validate form before upload
    const formData = { uploadDescription };
    const validation = validateForm(formData);

    if (!validation.isValid) {
      return;
    }

    try {
      // Upload with compression and progress tracking
      const result = await uploadWithCompression(
        uploadFile,
        '/api/certificates/upload',
        {
          description: uploadDescription.trim(),
        }
      );

      // Handle successful upload
      uploadMutation.mutate({
        file: uploadFile,
        description: uploadDescription.trim(),
      });

      // Reset form
      setUploadFile(null);
      setUploadDescription("");
      clearErrors();
      resetUpload();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Certificates Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className={theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}>
            <TabsTrigger 
              value="view" 
              className={theme === 'dark' ? 
                'data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground' : 
                'data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-500'
              }
            >
              View Certificate
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className={theme === 'dark' ? 
                'data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground' : 
                'data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-500'
              }
            >
              Upload Certificate
            </TabsTrigger>
            <TabsTrigger 
              value="request" 
              className={theme === 'dark' ? 
                'data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground' : 
                'data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-500'
              }
            >
              Request Certificate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-6">
            {/* Uploaded Certificates */}
            <div className="space-y-4">
              <h3 className={`font-medium mt-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Uploaded Certificates</h3>
              {isLoading ? (
                <SkeletonTable rows={3} cols={3} />
              ) : certificates.length > 0 ? (
                <div className="grid gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className={`flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors ${theme === 'dark' ? 'border-border hover:bg-muted' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className={`h-5 w-5 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{cert.description}</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            Uploaded on: {new Date(cert.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  No certificates uploaded yet.
                </div>
              )}

              {/* Issued Certificates */}
              <h3 className={`font-medium mt-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Issued Certificates</h3>
              <div className="grid gap-4">
                {mockCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className={`flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors ${theme === 'dark' ? 'border-border hover:bg-muted' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={`h-5 w-5 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{cert.name}</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Issued on: {cert.issueDate}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pending Requests */}
              <h3 className={`font-medium mt-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Certificate Requests</h3>
              <div className="grid gap-4">
                {mockRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 rounded-lg border hover:bg-accent transition-colors ${theme === 'dark' ? 'border-border hover:bg-muted' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {request.status === "pending" ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : request.status === "rejected" ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{request.type}</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            Requested on: {request.requestDate}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          request.status === "pending"
                            ? "bg-yellow-500"
                            : request.status === "rejected"
                            ? "bg-destructive"
                            : "bg-green-500"
                        }
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </Badge>
                    </div>
                    {request.reason && (
                      <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>
                        Reason: {request.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certificate-file" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Certificate File</Label>
                <Input
                  id="certificate-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}
                  required
                />
                <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Upload PDF, JPG, JPEG, PNG, or WebP files only. Images will be compressed automatically.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificate-description" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Description</Label>
                <Input
                  id="certificate-description"
                  type="text"
                  placeholder="Brief description of the certificate"
                  value={uploadDescription}
                  onChange={(e) => {
                    setUploadDescription(e.target.value);
                    validateSingleField('uploadDescription', e.target.value);
                  }}
                  onBlur={() => setFieldTouched('uploadDescription')}
                  className={`${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} ${
                    hasFieldError('uploadDescription') ? 'border-red-500' : ''
                  }`}
                  required
                />
                {hasFieldError('uploadDescription') && (
                  <p className="text-sm text-red-500">{errors.uploadDescription}</p>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isUploading || uploadMutation.isPending || !uploadFile || !uploadDescription.trim() || Object.keys(errors).length > 0}
                className={theme === 'dark' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-blue-600 hover:bg-blue-700 text-white'}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : uploadMutation.isPending ? 'Processing...' : 'Upload Certificate'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="request" className="space-y-6">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certificate-type" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Certificate Type</Label>
                <Select value={certificateType} onValueChange={setCertificateType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonafide">Bonafide Certificate</SelectItem>
                    <SelectItem value="transfer">Transfer Certificate</SelectItem>
                    <SelectItem value="completion">Course Completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Purpose</Label>
                <Input
                  type="text"
                  id="purpose"
                  placeholder="State the purpose for requesting the certificate"
                  className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supporting-docs" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Supporting Documents</Label>
                <Input
                  id="supporting-docs"
                  type="file"
                  multiple
                  className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}
                />
                <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Upload any supporting documents (ID proof, fee receipt, etc.)
                </p>
              </div>

              <Button type="submit" className={theme === 'dark' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-blue-600 hover:bg-blue-700 text-white'}>
                <Upload className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CertificatesManagement;
