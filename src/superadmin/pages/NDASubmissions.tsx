import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Download, Search, FileText, ChevronLeft, ChevronRight, Trash2, CheckCircle, Pencil, Save, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { useToast } from "../../hooks/use-toast";

const NDASubmissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Action states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Edit modal state
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const { theme } = useTheme();
  const { toast } = useToast();

  // Debounce search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
          search: debouncedSearchTerm,
          is_approved: activeTab === 'approved' ? 'true' : 'false'
        });
        
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/nda-submissions/?${queryParams.toString()}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
          }
        });
        const data = await response.json();
        
        if (data.submissions) {
          setSubmissions(data.submissions);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error("Error fetching NDA submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [page, pageSize, debouncedSearchTerm, activeTab]);

  const handleTabChange = (tab: 'approved' | 'pending') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleEditOpen = (sub: any) => {
    setEditingSubmission(sub);
    setEditFormData({
      full_name: sub.full_name || '',
      role: sub.role || 'EMPLOYEE',
      department: sub.department || '',
      designation: sub.designation || '',
      employee_intern_id: sub.employee_intern_id || '',
      date_of_joining: sub.date_of_joining || '',
      personal_email: sub.personal_email || '',
      phone: sub.phone || '',
      address: sub.address || '',
      emergency_contact: sub.emergency_contact || '',
      pre_existing_ip: sub.pre_existing_ip || '',
    });
  };

  const handleEditChange = (field: string, value: string) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editingSubmission) return;
    setEditLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(
        `${API_BASE_URL}/api/superadmin/nda-submissions/${editingSubmission.id}/update/`,
        {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
          },
          body: JSON.stringify(editFormData)
        }
      );
      const data = await response.json();
      if (response.ok) {
        // Update item in current list
        setSubmissions(submissions.map(s => s.id === editingSubmission.id ? { ...s, ...data.submission } : s));
        toast({
          title: "Success",
          description: "NDA submission details updated successfully!",
        });
        setEditingSubmission(null);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update submission details",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the record",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/nda-submissions/${id}/approve/`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSubmissions(submissions.filter(s => s.id !== id));
        setTotal(total - 1);
        toast({
          title: "Success",
          description: "NDA approved successfully and email sent!",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to approve submission",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error approving submission",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/nda-submissions/${deleteId}/`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      if (response.ok) {
        setSubmissions(submissions.filter(s => s.id !== deleteId));
        setTotal(total - 1);
        setDeleteId(null);
        toast({
          title: "Success",
          description: "Submission deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete submission",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error deleting submission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-muted/60 p-1 rounded-lg w-fit">
        <button
          onClick={() => handleTabChange('approved')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'approved'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          NDA & Consents
        </button>
        <button
          onClick={() => handleTabChange('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'pending'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Approvals
        </button>
      </div>

      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50">
          <div className="w-full">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {activeTab === 'approved' ? 'NDA & Consents' : 'NDA Approvals'}
            </CardTitle>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              {activeTab === 'approved' 
                ? 'View and download all signed NDA documents.' 
                : 'Review and approve pending NDA submissions.'}
            </p>
          </div>
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Search name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Name & Email</th>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        Fetching records...
                      </div>
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No submissions found.</p>
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{sub.full_name}</div>
                        <div className="text-xs text-muted-foreground">{sub.personal_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                          {sub.employee_intern_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub.role === 'EMPLOYEE' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Employee</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">Intern</span>
                        )}
                        <div className="text-xs text-muted-foreground">{sub.designation}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {sub.department}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-8 w-8" 
                            title="Edit Submission"
                            onClick={() => handleEditOpen(sub)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {activeTab === 'pending' ? (
                            <Button
                              onClick={() => handleApprove(sub.id)}
                              disabled={approvingId === sub.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors shadow-sm"
                            >
                              {approvingId === sub.id ? (
                                <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </Button>
                          ) : (
                            sub.pdf_url ? (
                              <a
                                href={sub.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground italic px-3 py-1.5 border border-dashed rounded-md">Pending PDF</span>
                            )
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8" 
                            onClick={() => setDeleteId(sub.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {total > 0 && (
          <CardFooter className="flex items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startItem}</span> to <span className="font-medium text-foreground">{endItem}</span> of <span className="font-medium text-foreground">{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 gap-1 pl-2.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:inline-block">Previous</span>
              </Button>
              <div className="flex items-center justify-center text-sm font-medium w-10">
                {page} / {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-8 gap-1 pr-2.5"
              >
                <span className="sr-only sm:not-sr-only sm:inline-block">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Edit Submission Dialog */}
      <Dialog open={!!editingSubmission} onOpenChange={(open) => !open && setEditingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-indigo-600" />
              Edit NDA Submission Details
            </DialogTitle>
            <DialogDescription>
              Update candidate information and details before approving or re-generating documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 2-column grid for Personal & Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.full_name || ''}
                  onChange={(e) => handleEditChange('full_name', e.target.value)}
                  placeholder="e.g., Gc Likith"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.role || 'EMPLOYEE'}
                  onChange={(e) => handleEditChange('role', e.target.value)}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Employee / Intern ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.employee_intern_id || ''}
                  onChange={(e) => handleEditChange('employee_intern_id', e.target.value)}
                  placeholder="e.g., EMP-1004"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.department || ''}
                  onChange={(e) => handleEditChange('department', e.target.value)}
                  placeholder="e.g., Computer Science Engineering"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.designation || ''}
                  onChange={(e) => handleEditChange('designation', e.target.value)}
                  placeholder="e.g., Software Developer (Intern)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.date_of_joining || ''}
                  onChange={(e) => handleEditChange('date_of_joining', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Personal Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.personal_email || ''}
                  onChange={(e) => handleEditChange('personal_email', e.target.value)}
                  placeholder="e.g., candidate@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.phone || ''}
                  onChange={(e) => handleEditChange('phone', e.target.value)}
                  placeholder="e.g., +91 9876543210"
                />
              </div>
            </div>

            {/* Emergency Contact & Address */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Emergency Contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={editFormData.emergency_contact || ''}
                  onChange={(e) => handleEditChange('emergency_contact', e.target.value)}
                  placeholder="e.g., Parent/Guardian Name - +91 9988776655"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Residential Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
                  rows={2}
                  value={editFormData.address || ''}
                  onChange={(e) => handleEditChange('address', e.target.value)}
                  placeholder="Complete residential address"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Pre-Existing Intellectual Property (Annexure A)
                </label>
                <textarea
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
                  rows={2}
                  value={editFormData.pre_existing_ip || ''}
                  onChange={(e) => handleEditChange('pre_existing_ip', e.target.value)}
                  placeholder="None declared, or list prior inventions/projects"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSubmission(null)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditSave}
              disabled={editLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {editLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the NDA submission and remove the associated PDF document from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NDASubmissions;
