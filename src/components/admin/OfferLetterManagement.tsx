import React, { useEffect, useState } from "react";
import { offerLetterApi, IssuedOfferLetter } from "../../api/offer_letter_api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";
import CreateOfferLetter from "./CreateOfferLetter";
import {
  Search,
  Plus,
  RotateCcw,
  Trash2,
  FileText,
  Mail,
  Calendar,
  Building,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Briefcase,
  Loader2,
  Download,
  Pencil,
  Save,
  Send,
  ExternalLink,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { SkeletonTable } from "../ui/skeleton";

const OfferLetterManagement = () => {
  const { toast } = useToast();
  const [offers, setOffers] = useState<IssuedOfferLetter[]>([]);
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
  const [selectedOffer, setSelectedOffer] = useState<IssuedOfferLetter | null>(null);
  const [revokingOffer, setRevokingOffer] = useState<IssuedOfferLetter | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Edit dialog state
  const [editingOffer, setEditingOffer] = useState<IssuedOfferLetter | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await offerLetterApi.listOfferLetters({
        search,
        type,
        status,
        limit,
        offset,
      });
      setOffers(res.results);
      setCount(res.count);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load offer letters.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "list") {
      fetchOffers();
    }
  }, [activeTab, search, type, status, offset]);

  const handleResetFilters = () => {
    setSearch("");
    setType("");
    setStatus("");
    setOffset(0);
  };

  const handleRevoke = async () => {
    if (!revokingOffer) return;
    try {
      setRevokeLoading(true);
      await offerLetterApi.revokeOfferLetter(revokingOffer.offer_id);
      toast({
        title: "Offer Letter Revoked",
        description: `Offer letter ${revokingOffer.offer_id} has been marked as revoked.`,
      });
      setRevokingOffer(null);
      fetchOffers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to revoke offer letter.",
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleResendEmail = async (offer: IssuedOfferLetter) => {
    setResendingId(offer.offer_id);
    try {
      await offerLetterApi.resendOfferEmail(offer.offer_id);
      toast({
        title: "Email Resent",
        description: `Offer letter email dispatched to ${offer.email}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to resend email.",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleEditOpen = (offer: IssuedOfferLetter) => {
    setEditingOffer(offer);
    setEditFormData({
      candidate_name: offer.candidate_name,
      email: offer.email,
      phone: offer.phone || '',
      designation: offer.designation,
      department: offer.department || '',
      offer_type: offer.offer_type,
      date_of_joining: offer.date_of_joining,
      work_location: offer.work_location,
      probation_period: offer.probation_period,
      minimum_commitment: offer.minimum_commitment,
      salary_monthly: offer.salary_monthly,
      salary_words: offer.salary_words,
      salary_annual_ctc: offer.salary_annual_ctc || '',
    });
  };

  const handleEditSave = async () => {
    if (!editingOffer) return;
    setEditLoading(true);
    try {
      await offerLetterApi.updateOfferLetter(editingOffer.offer_id, editFormData);
      toast({
        title: "Updated Successfully",
        description: "Offer letter details updated and PDF regenerated.",
      });
      setEditingOffer(null);
      fetchOffers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update offer letter.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Issued":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" /> Issued
          </Badge>
        );
      case "Accepted":
        return (
          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" /> Accepted
          </Badge>
        );
      case "Revoked":
        return (
          <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> Revoked
          </Badge>
        );
      case "Expired":
        return (
          <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" /> Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const getOfferTypeLabel = (t: string) => {
    switch (t) {
      case "FULL_TIME": return "Full-Time";
      case "INTERNSHIP": return "Internship";
      case "PART_TIME": return "Part-Time";
      case "CONTRACT": return "Contract";
      default: return t;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
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
      <CreateOfferLetter
        onBack={() => setActiveTab("list")}
        onSuccess={() => {
          setActiveTab("list");
          fetchOffers();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Offer Letters</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Issue, track, and manage official employment offer letters for employees and interns.
          </p>
        </div>
        <Button onClick={() => setActiveTab("create")} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
          <Plus className="w-4 h-4" /> Issue Offer Letter
        </Button>
      </div>

      {/* SEARCH AND FILTERS */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by candidate name, email, ID, role..."
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Types</option>
                <option value="FULL_TIME">Full-Time Employment</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Status</option>
                  <option value="Issued">Issued</option>
                  <option value="Accepted">Accepted</option>
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
            <div className="p-4">
              <SkeletonTable rows={5} cols={6} />
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No Offer Letters Found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                No issued offer letters matched your query. Click "Issue Offer Letter" to create one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">ID / Reference</TableHead>
                    <TableHead className="font-semibold">Candidate</TableHead>
                    <TableHead className="font-semibold">Role &amp; Type</TableHead>
                    <TableHead className="font-semibold">Joining Date</TableHead>
                    <TableHead className="font-semibold">Monthly CTC</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {offer.offer_id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{offer.candidate_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {offer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{offer.designation}</div>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {getOfferTypeLabel(offer.offer_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(offer.date_of_joining)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {offer.salary_monthly}
                      </TableCell>
                      <TableCell>{getStatusBadge(offer.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-900"
                            title="View Details"
                            onClick={() => setSelectedOffer(offer)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700"
                            title="Edit Offer Details"
                            onClick={() => handleEditOpen(offer)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                            title="Resend Email"
                            disabled={resendingId === offer.offer_id}
                            onClick={() => handleResendEmail(offer)}
                          >
                            {resendingId === offer.offer_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>

                          {offer.pdf_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              title="Download PDF"
                              asChild
                            >
                              <a href={offer.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}

                          {offer.status !== "Revoked" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              title="Revoke Offer"
                              onClick={() => setRevokingOffer(offer)}
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* PAGINATION */}
          {count > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500">
                Showing <strong>{offset + 1}</strong> to <strong>{Math.min(offset + limit, count)}</strong> of <strong>{count}</strong> offer letters
              </span>
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= count}
                  onClick={() => setOffset((prev) => prev + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW OFFER DETAILS DIALOG */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedOffer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Briefcase className="w-5 h-5 text-indigo-600" /> Offer Letter Details
                </DialogTitle>
                <DialogDescription>
                  Reference ID: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedOffer.offer_id}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Candidate Name:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{selectedOffer.candidate_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Email Address:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOffer.email}</span>
                  </div>
                  {selectedOffer.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Phone:</span>
                      <span className="text-slate-800 dark:text-slate-200">{selectedOffer.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Designation:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedOffer.designation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Employment Type:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{getOfferTypeLabel(selectedOffer.offer_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Monthly CTC:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedOffer.salary_monthly} ({selectedOffer.salary_words})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Date of Joining:</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedOffer.date_of_joining)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Issue Date:</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedOffer.issue_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span>{getStatusBadge(selectedOffer.status)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Location</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{selectedOffer.work_location}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Probation Period</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{selectedOffer.probation_period}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Commitment</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{selectedOffer.minimum_commitment}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setSelectedOffer(null)}>
                  Close
                </Button>
                {selectedOffer.pdf_url && (
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <a href={selectedOffer.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT OFFER DIALOG */}
      <Dialog open={!!editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Pencil className="w-5 h-5 text-indigo-600" /> Edit Offer Letter Details
            </DialogTitle>
            <DialogDescription>
              Update candidate or contract terms. Saving will automatically update the record and regenerate the PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Candidate Name *
                </label>
                <Input
                  value={editFormData.candidate_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, candidate_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Designation *
                </label>
                <Input
                  value={editFormData.designation || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Employment Type *
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editFormData.offer_type || 'FULL_TIME'}
                  onChange={(e) => setEditFormData({ ...editFormData, offer_type: e.target.value })}
                >
                  <option value="FULL_TIME">Full-Time Employment</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="PART_TIME">Part-Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Monthly CTC *
                </label>
                <Input
                  value={editFormData.salary_monthly || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, salary_monthly: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Monthly CTC in Words *
                </label>
                <Input
                  value={editFormData.salary_words || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, salary_words: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Date of Joining *
                </label>
                <Input
                  type="date"
                  value={editFormData.date_of_joining || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date_of_joining: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <Input
                  value={editFormData.phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Work Location
                </label>
                <Input
                  value={editFormData.work_location || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, work_location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Probation Period
                  </label>
                  <Input
                    value={editFormData.probation_period || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, probation_period: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Minimum Commitment
                  </label>
                  <Input
                    value={editFormData.minimum_commitment || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, minimum_commitment: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setEditingOffer(null)} disabled={editLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSave} disabled={editLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              {editLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVOKE CONFIRMATION DIALOG */}
      <AlertDialog open={!!revokingOffer} onOpenChange={(open) => !open && setRevokingOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-bold">Revoke Offer Letter?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke offer letter <strong>{revokingOffer?.offer_id}</strong> issued to <strong>{revokingOffer?.candidate_name}</strong>? This will permanently mark the credential as revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevoke();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={revokeLoading}
            >
              {revokeLoading ? "Revoking..." : "Revoke Offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OfferLetterManagement;
