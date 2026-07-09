import React, { useEffect, useState } from "react";
import { certificateApi, IssuedCertificate } from "../../api/certificate_api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";
import CreateCertificate from "./CreateCertificate";
import { 
  Search, 
  Plus, 
  RotateCcw, 
  ExternalLink, 
  Trash2, 
  FileText, 
  Mail, 
  Calendar, 
  Building,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Award,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";

const CertificateManagement = () => {
  const { toast } = useToast();
  const [certs, setCerts] = useState<IssuedCertificate[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  
  // Search & Filter state
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  
  // Pagination
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Dialogs
  const [selectedCert, setSelectedCert] = useState<IssuedCertificate | null>(null);
  const [revokingCert, setRevokingCert] = useState<IssuedCertificate | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await certificateApi.listCertificates({
        search,
        type,
        status,
        limit,
        offset
      });
      setCerts(res.results);
      setCount(res.count);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load certificates.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "list") {
      fetchCertificates();
    }
  }, [activeTab, search, type, status, offset]);

  const handleResetFilters = () => {
    setSearch("");
    setType("");
    setStatus("");
    setOffset(0);
  };

  const handleRevoke = async () => {
    if (!revokingCert) return;
    try {
      setRevokeLoading(true);
      await certificateApi.revokeCertificate(revokingCert.certificate_id);
      toast({
        title: "Certificate Revoked",
        description: `Certificate ${revokingCert.certificate_id} has been revoked successfully.`,
      });
      setRevokingCert(null);
      fetchCertificates();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to revoke certificate.",
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <Badge className="bg-emerald-500 text-white flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" /> Verified
          </Badge>
        );
      case "Revoked":
        return (
          <Badge variant="destructive" className="bg-rose-500 text-white flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> Revoked
          </Badge>
        );
      case "Expired":
        return (
          <Badge variant="secondary" className="bg-amber-500 text-white flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" /> Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(count / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (activeTab === "create") {
    return (
      <CreateCertificate
        onBack={() => setActiveTab("list")}
        onSuccess={() => setActiveTab("list")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Certificate Credentials</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Issue and verify authenticity of certificates issued by Stalight Technologies.
          </p>
        </div>
        <Button onClick={() => setActiveTab("create")} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Issue Certificate
        </Button>
      </div>

      {/* SEARCH AND FILTERS */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by student name, email, ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOffset(0);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setOffset(0);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All Types</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="COURSE">Course Completion</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="PARTICIPATION">Participation</option>
                <option value="ACHIEVEMENT">Achievement</option>
                <option value="EXPERIENCE">Experience</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <div className="flex gap-2">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setOffset(0);
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Status</option>
                  <option value="Verified">Verified</option>
                  <option value="Revoked">Revoked</option>
                  <option value="Expired">Expired</option>
                </select>
                <Button variant="outline" size="icon" onClick={handleResetFilters} title="Reset Filters" className="flex-shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RESULTS TABLE */}
      <Card className="shadow-md border-slate-200/60 dark:border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Fetching certificates...</p>
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-lg">No Certificates Found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                No issued certificate records matched your query. Click "Issue Certificate" to register one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600">ID / Code</TableHead>
                    <TableHead className="font-semibold text-slate-600">Student</TableHead>
                    <TableHead className="font-semibold text-slate-600">Type</TableHead>
                    <TableHead className="font-semibold text-slate-600">Date Issued</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map((cert) => (
                    <TableRow key={cert.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-900/30">
                      <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {cert.certificate_id}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{cert.student_name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {cert.email}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs font-medium text-slate-600 dark:text-slate-400">
                        {cert.certificate_type.toLowerCase()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(cert.issue_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCert(cert)} title="View Details">
                            <Eye className="w-4 h-4 text-slate-600 hover:text-slate-800" />
                          </Button>
                          {cert.pdf_url && (
                            <Button variant="ghost" size="icon" asChild title="Open PDF">
                              <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 text-slate-600 hover:text-slate-850" />
                              </a>
                            </Button>
                          )}
                          {cert.status !== "Revoked" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setRevokingCert(cert)} 
                              title="Revoke Certificate"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-700" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAGINATION PANEL */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing Page <strong className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</strong> ({count} total records)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setOffset((prev) => prev + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / DIALOG */}
      <Dialog open={selectedCert !== null} onOpenChange={() => setSelectedCert(null)}>
        {selectedCert && (
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Certificate Specifications
              </DialogTitle>
              <DialogDescription>
                Details and verification mappings for this issued credential.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {selectedCert.image_url && selectedCert.status === "Verified" && (
                <div className="w-full bg-white rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <img
                    src={selectedCert.image_url}
                    alt="Certificate Preview"
                    className="w-full h-auto object-contain bg-white"
                  />
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Certificate ID</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{selectedCert.certificate_id}</span>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Recipient</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{selectedCert.student_name}</span>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Email</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{selectedCert.email}</span>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status</span>
                  <span>{getStatusBadge(selectedCert.status)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Building className="w-4 h-4" /> <span>Issued by: {selectedCert.company_name}</span>
                </div>
                {selectedCert.certificate_type === "INTERNSHIP" && selectedCert.internship_role && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Award className="w-4 h-4" /> <span>Role: {selectedCert.internship_role}</span>
                  </div>
                )}
                {selectedCert.certificate_type === "COURSE" && selectedCert.course_name && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Award className="w-4 h-4" /> <span>Course: {selectedCert.course_name}</span>
                  </div>
                )}
                {selectedCert.start_date && selectedCert.end_date && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4" /> <span>Duration: {formatDate(selectedCert.start_date)} - {formatDate(selectedCert.end_date)}</span>
                  </div>
                )}
              </div>

              {selectedCert.description && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Context</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded">
                    {selectedCert.description}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSelectedCert(null)} className="w-full sm:w-auto">
                Close
              </Button>
              {selectedCert.pdf_url && (
                <Button asChild className="w-full sm:w-auto">
                  <a href={selectedCert.pdf_url} target="_blank" rel="noopener noreferrer">
                    Open PDF File
                  </a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* REVOCATION CONFIRM DIALOG */}
      <Dialog open={revokingCert !== null} onOpenChange={() => setRevokingCert(null)}>
        {revokingCert && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-rose-600 font-bold flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Revoke Certificate Credential?
              </DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone easily.
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You are about to revoke the certificate <strong className="font-semibold text-slate-800 dark:text-slate-200">{revokingCert.certificate_id}</strong> issued to <strong className="font-semibold text-slate-800 dark:text-slate-200">{revokingCert.student_name}</strong>.
              </p>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 text-xs text-rose-700 leading-relaxed">
                Once revoked, anyone visiting the verification URL or scanning the QR code on the certificate will receive a warning message stating the certificate is invalid or revoked.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokingCert(null)} disabled={revokeLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRevoke} disabled={revokeLoading}>
                {revokeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Revoking...
                  </>
                ) : (
                  "Confirm Revocation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default CertificateManagement;
