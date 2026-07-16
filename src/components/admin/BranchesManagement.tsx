import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from
  "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from
  "../ui/select";
import { SkeletonTable } from "../ui/skeleton";
import { PencilIcon, TrashIcon, PlusIcon, UserPlus2Icon, FileDownIcon, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { manageBranches, manageUsers, getBranchesWithHODs } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Branch {
  id: number;
  name: string;
  hod: string | null;
  hod_contact: string | null;
  total_semesters?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  mobile_number: string | null;
}

const BranchesManagement = ({ setError, toast, isReadOnly = false }: { setError: (error: string | null) => void; toast: (options: any) => void; isReadOnly?: boolean; }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Branch | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", branch_code: "", total_semesters: 8 });
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [newHodId, setNewHodId] = useState("");
  const [loading, setLoading] = useState(true);
  const normalize = (str: string) => str.toLowerCase().trim();
  const { theme } = useTheme();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  
  const fetchHODs = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/?role=hod`);
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || data.results || data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

const fetchData = async (page: number = 1, search: string = filter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getBranchesWithHODs({ page, page_size: pageSize, search });


      const hasResults = response && typeof response === 'object' && 'results' in response;
      const paginationData = response as any;
      const dataSource = hasResults ? paginationData.results : paginationData;

      if (dataSource && dataSource.success) {
        // Handle paginated response format
        const branchData = Array.isArray(dataSource.branches) ?
          dataSource.branches.map((b: any) => {
            let hodName: string | null = null;
            let hodContact: string | null = null;

            if (b.hod) {
              if (typeof b.hod === 'string') {
                hodName = b.hod;
                hodContact = b.hod_contact || null;
              } else if (typeof b.hod === 'object') {
                hodName = `${b.hod.first_name || ''} ${b.hod.last_name || ''}`.trim() || null;
                hodContact = b.hod.mobile_number || b.hod.email || null;
              }
            }

            return {
              id: b.id,
              name: b.name || "",
              branch_code: b.branch_code || null,
              total_semesters: b.total_semesters || 8,
              hod: hodName,
              hod_contact: hodContact || (b.hod ? "--" : null)
            };
          }) :
          [];
        setBranches(branchData);

        // Process HODs data
        const hodData = Array.isArray(dataSource.hods) ?
          dataSource.hods.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: "hod",
            first_name: u.first_name,
            last_name: u.last_name,
            mobile_number: u.mobile_number
          })) :
          [];
        setUsers(hodData);

        // Set pagination info
        const count = paginationData.count || dataSource && dataSource.count;
        if (count !== undefined) {
          setTotalPages(Math.ceil(count / 10));
          setTotalCount(count);
        } else {
          setTotalPages(1);
          setTotalCount(branchData.length);
        }
        setCurrentPage(page);

      } else {
        setError(dataSource?.message || "Failed to fetch branches and HODs");
        toast({ variant: "destructive", title: "Error", description: dataSource?.message || "Failed to fetch branches and HODs" });
      }
    } catch (err) {

      setError("Network error or invalid response");
      toast({ variant: "destructive", title: "Error", description: "Network error or invalid response" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, filter);
    }, 500);
    return () => clearTimeout(timer);
  }, [filter, setError, toast]);

  const filteredBranches = branches;

  const handleEdit = async (branch: Branch) => {
    if (users.length === 0) {
      await fetchHODs();
    }
    setEditingId(branch.id);
    setEditData(branch);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editData) setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    if (editData) {
      const trimmedName = editData.name.trim();
      const trimmedCode = editData.branch_code?.trim() || "";
      const totalSemesters = Number(editData.total_semesters) || 8;

      if (!trimmedName) {
        toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
        return;
      }

      const validNameRegex = /^[A-Za-z\s]+$/;
      if (!validNameRegex.test(trimmedName)) {
        toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
        return;
      }

      if (trimmedCode && !/^[A-Za-z0-9]{2,10}$/.test(trimmedCode)) {
        toast({ variant: "destructive", title: "Error", description: "Branch code must be 2-10 characters (letters and numbers only)" });
        return;
      }

      const isDuplicate = branches.some(
        (b) => b.id !== editData.id && b.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
        toast({ variant: "destructive", title: "Error", description: "Branch already exists" });
        return;
      }

      if (trimmedCode) {
        const isCodeDuplicate = branches.some(
          (b) => b.id !== editData.id && b.branch_code && b.branch_code.toLowerCase() === trimmedCode.toLowerCase()
        );
        if (isCodeDuplicate) {
          toast({ variant: "destructive", title: "Error", description: "Branch code already exists" });
          return;
        }
      }

      if (totalSemesters < 1 || totalSemesters > 20) {
        toast({ variant: "destructive", title: "Invalid Semesters", description: "Total semesters must be between 1 and 20." });
        return;
      }

      setLoading(true);
      try {
        const response = await manageBranches(
          {
            name: trimmedName,
            branch_code: trimmedCode || null,
            total_semesters: totalSemesters,
            hod_id: editData.hod ? users.find((u) => `${u.first_name} ${u.last_name}`.trim() === editData.hod)?.id?.toString() : null
          },
          editData.id,
          "PUT"
        );

        const hasResults = response && typeof response === 'object' && 'results' in response;
        const dataSource = hasResults ? (response as any).results : response as any;

        if (dataSource && dataSource.success) {
          setBranches(branches.map((b) => b.id === editData.id ? { ...editData, name: trimmedName, branch_code: trimmedCode || null, total_semesters: totalSemesters } : b));
          setEditingId(null);
          setEditData(null);
          toast({ title: "Success", description: "Branch updated successfully" });
        } else {
          setError(response.message || "Failed to update branch");
          MySwal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: response.message || "Failed to update branch",
            confirmButtonColor: '#3085d6'
          });
        }
      } catch (err) {
        setError("Network error");
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmDelete = (id: number) => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return;
    setBranchToDelete(branch);
    setConfirmName("");
    setIsDeleteDialogOpen(true);
  };

  const deleteBranch = async (id: number) => {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const result = await Swal.fire({
      title: 'Final Confirmation',
      text: `Are you absolutely sure you want to delete the branch "${branchToDelete?.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Yes, delete it!',
      background: currentTheme === 'dark' ? '#1f2937' : '#fff',
      color: currentTheme === 'dark' ? '#fff' : '#000'
    });

    if (!result.isConfirmed) {
      return;
    }
    setLoading(true);
    try {
      const response = await manageBranches(undefined, id, "DELETE");
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : response as any;

      if (dataSource && dataSource.success) {
        if (branches.length === 1 && currentPage > 1) {
          fetchData(currentPage - 1);
        } else {
          fetchData(currentPage);
        }
        setIsDeleteDialogOpen(false);
        setBranchToDelete(null);
        toast({ title: "Success", description: "Branch deleted successfully" });
      } else {
        toast({ variant: "destructive", title: "Error", description: dataSource?.message || "Failed to delete branch" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    const trimmedName = newBranch.name.trim();
    const trimmedCode = newBranch.branch_code.trim();
    const totalSemesters = Number(newBranch.total_semesters) || 8;

    if (!trimmedName) {
      toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
      return;
    }

    const validNameRegex = /^[A-Za-z\s]+$/;
    if (!validNameRegex.test(trimmedName)) {
      toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
      return;
    }

    if (trimmedCode && !/^[A-Za-z0-9]{2,10}$/.test(trimmedCode)) {
      toast({ variant: "destructive", title: "Error", description: "Branch code must be 2-10 characters (letters and numbers only)" });
      return;
    }

    const isDuplicate = branches.some((b) => b.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      toast({ variant: "destructive", title: "Error", description: "Branch already exists" });
      return;
    }

    if (trimmedCode) {
      const isCodeDuplicate = branches.some((b) => b.branch_code && b.branch_code.toLowerCase() === trimmedCode.toLowerCase());
      if (isCodeDuplicate) {
        toast({ variant: "destructive", title: "Error", description: "Branch code already exists" });
        return;
      }
    }

    const confirmMessage = `
      <div class="text-left text-sm mt-2">
        <p class="mb-1"><strong>Branch Name:</strong> ${trimmedName}</p>
        <p class="mb-1"><strong>Branch Code:</strong> ${trimmedCode || "N/A"}</p>
        <p class="mb-1"><strong>Total Semesters:</strong> ${totalSemesters}</p>
      </div>
      <p class="mt-4 text-sm text-gray-500">Are these details correct?</p>
    `;

    const result = await MySwal.fire({
      title: 'Confirm Branch Details',
      html: confirmMessage,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, create branch',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const response = await manageBranches(
        { name: trimmedName, branch_code: trimmedCode || null, total_semesters: totalSemesters },
        undefined,
        "POST"
      );

      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : response as any;

      if (dataSource && dataSource.success) {
        fetchData(1);
        setIsAddDialogOpen(false);
        setNewBranch({ name: "", branch_code: "", total_semesters: 8 });
        toast({ title: "Success", description: "Branch added successfully" });
      } else {
        setError(response.message || "Failed to add branch");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to add branch" });
      }
    } catch (err) {

      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHod = async () => {
    if (!selectedBranchId) {
      toast({ variant: "destructive", title: "Error", description: "Branch selection is required" });
      return;
    }
    if (!newHodId) {
      toast({ variant: "destructive", title: "Error", description: "HOD selection is required" });
      return;
    }
    setLoading(true);
    try {
      const response = await manageBranches(
        { hod_id: newHodId },
        selectedBranchId,
        "PUT"
      );
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : response as any;

      if (dataSource && dataSource.success) {
        // Update local state
        const assignedHod = users.find((u) => u.id === Number(newHodId));
        setBranches(branches.map((b) => b.id === selectedBranchId ? {
          ...b,
          hod: assignedHod ? `${assignedHod.first_name} ${assignedHod.last_name}`.trim() : null,
          hod_contact: assignedHod ? assignedHod.mobile_number || assignedHod.email || "--" : null
        } : b));
        setIsAssignDialogOpen(false);
        setNewHodId("");
        setSelectedBranchId(null);
        toast({ title: "Success", description: "HOD assigned successfully" });
      } else {
        setError(response.message || "Failed to assign HOD");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to assign HOD" });
      }
    } catch (err) {

      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/branch-list-pdf/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Branch_list.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Success",
          description: "Branch list PDF exported successfully",
        });
      } else {
        const result = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to export PDF",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while exporting PDF",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .branches-card { height: auto !important; min-height: 550px !important; }
          .branches-table-container { 
            overflow-x: auto !important; 
            -webkit-overflow-scrolling: touch;
            margin: 0 -8px;
            padding: 0 8px;
          }
          .branches-table { 
            min-width: 500px !important; 
            table-layout: fixed !important;
          }
          .branch-name-col { width: 45% !important; }
          .hod-col { width: 35% !important; }
          .actions-col { width: 20% !important; }
          

          
          .edit-input-mobile { 
            height: 32px !important; 
            font-size: 0.9375rem !important;
            padding: 4px 8px !important;
          }
          
          .edit-actions-wrapper {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            align-items: flex-end !important;
          }
          
          .edit-btn-mobile {
            width: 100% !important;
            height: 28px !important;
            font-size: 0.875rem !important;
            padding: 0 8px !important;
          }
          .branches-mobile-row { display: flex !important; flex-direction: row !important; gap: 8px !important; width: 100% !important; }
          .branches-mobile-row > button { flex: 1 !important; width: 50% !important; }
        }
      `}</style>

      <div className={`mx-auto w-full max-w-[400px] sm:max-w-full text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Card id="branches-management-card" className={theme === 'dark' ? 'branches-card w-full bg-card border border-border flex flex-col h-[calc(100vh-240px)] min-h-[350px] md:h-[calc(100vh-280px)] md:min-h-[550px]' : 'branches-card w-full bg-white border border-gray-200 flex flex-col h-[calc(100vh-240px)] min-h-[350px] md:h-[calc(100vh-280px)] md:min-h-[550px]'}>
          <div id="branches-management-header-section" className="flex flex-col">
            <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-semibold">Branch Management</CardTitle>
                <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-1">
                  Manage branches and assign department heads
                </CardDescription>
              </div>

              <div className={`flex-row gap-2 w-full sm:w-auto items-center ${isReadOnly ? 'hidden md:flex' : 'flex'}`}>
                {!isReadOnly && (
                  <div className="flex flex-row gap-2 w-full sm:w-auto branches-mobile-row">
                    <Button
                      size="sm"
                      className="flex items-center justify-center gap-1 w-auto"
                      onClick={() => setIsAddDialogOpen(true)}
                      disabled={loading}>
                      <PlusIcon className="w-4 h-4" /> Add Branch
                    </Button>

                    <Button
                      size="sm"
                      className="flex items-center justify-center gap-1 w-auto"
                      onClick={() => { setIsAssignDialogOpen(true); fetchHODs(); }}
                      disabled={loading}>
                      <UserPlus2Icon className="w-4 h-4" /> Assign HOD
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  className="hidden md:flex items-center justify-center gap-1 w-auto"
                  onClick={exportToPDF}
                  disabled={loading || downloadingPDF}>
                  {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDownIcon className="w-4 h-4" />}
                  {downloadingPDF ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
            </CardHeader>

            <div className="px-2 sm:px-4 pt-3 pb-3 flex flex-row items-center justify-between gap-3">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Input
                  placeholder={translateTerminology("Search by branch name...")}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={theme === 'dark' ? 'w-full bg-card text-foreground py-1 pr-12' : 'w-full bg-white text-gray-900 py-1 pr-12'} />
                {filter && (
                  <button
                    onClick={() => setFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Mobile-only download icon button next to search bar */}
              <Button
                size="icon"
                variant="outline"
                className="flex md:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                onClick={exportToPDF}
                disabled={loading || downloadingPDF}
                title="Export PDF"
              >
                {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDownIcon className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <CardContent className="flex-1 overflow-hidden flex flex-col px-2 sm:px-4 pt-0">

            {loading && branches.length === 0 ?
              <SkeletonTable rows={pageSize} cols={4} /> :

              <>
                  {/* Desktop View: Table */}
                  <div className="branches-table-container hidden md:block flex-1 overflow-y-auto custom-scrollbar border rounded-md mb-4">
                    <table className="branches-table w-full text-base md:text-sm text-left table-auto border-collapse">
                      <thead className={`sticky top-0 z-10 border-b text-sm md:text-xs uppercase ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'} text-muted-foreground border-border shadow-sm`}>
                        <tr>
                          <th className="branch-name-col py-3 px-3 text-left font-bold">{translateTerminology("Branch Name")}</th>
                          <th className="py-3 px-3 hidden sm:table-cell font-bold">{translateTerminology("Branch Code")}</th>
                          <th className="py-3 px-3 font-bold text-center">Semesters</th>
                          <th className="hod-col py-3 px-3 font-bold">Assigned HOD</th>
                          <th className="py-3 px-3 hidden sm:table-cell font-bold">HOD Contact</th>
                          {!isReadOnly && <th className="actions-col py-3 px-3 text-right w-24 font-bold">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBranches.length === 0 ?
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-muted-foreground">
                              No branches found.
                            </td>
                          </tr> :

                          filteredBranches.map((branch) =>
                            <tr
                              key={branch.id}
                              className={`border-b transition-colors duration-200 ${theme === 'dark' ?
                                'border-border hover:bg-accent text-foreground' :
                                'border-gray-200 hover:bg-gray-50 text-gray-900'}`
                              }>

                              <td className="py-3 px-3 align-middle font-medium branch-name-cell">
                                <div className="break-words">{branch.name}</div>
                              </td>

                              <td className="py-3 px-3 hidden sm:table-cell align-middle">
                                <span className="opacity-70">{branch.branch_code || "--"}</span>
                              </td>

                              <td className="py-3 px-3 align-middle text-center">
                                <span className="font-semibold">{branch.total_semesters || "--"}</span>
                              </td>

                              <td className="py-3 px-3 align-middle hod-cell">
                                <div className="break-words">{branch.hod || "--"}</div>
                              </td>

                              <td className="py-3 px-3 hidden sm:table-cell align-middle text-sm md:text-xs opacity-70">
                                {branch.hod_contact || "--"}
                              </td>

                              {!isReadOnly && (
                                <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap align-middle actions-cell">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)} className="h-8 w-8">
                                        <PencilIcon className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => confirmDelete(branch.id)} className="h-8 w-8">
                                        <TrashIcon className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                                      </Button>
                                    </div>
                                </td>
                              )}
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Stacked Cards */}
                  <div className="grid grid-cols-1 gap-3 md:hidden mb-4">
                    {filteredBranches.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                        No branches found.
                      </div>
                    ) : (
                      filteredBranches.map((branch) => (
                        <div
                          key={branch.id}
                          className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm ${
                            theme === 'dark'
                              ? 'bg-zinc-950/40 border-border text-foreground'
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-sm sm:text-base break-words">
                                {branch.name}
                              </h4>
                              {branch.branch_code && (
                                <span className={`inline-block text-[11px] px-2 py-0.5 rounded font-mono ${
                                  theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  Code: {branch.branch_code}
                                </span>
                              )}
                            </div>
                            
                            {!isReadOnly && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(branch)}
                                  className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                >
                                  <PencilIcon className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDelete(branch.id)}
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <TrashIcon className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t text-xs sm:text-sm ${theme === 'dark' ? 'border-border/50' : 'border-gray-100'}`}>
                            <div>
                              <span className="block opacity-60 uppercase font-bold tracking-wider text-[10px] sm:text-xs mb-0.5">Semesters</span>
                              <span className="font-medium">{branch.total_semesters || "--"}</span>
                            </div>
                            <div>
                              <span className="block opacity-60 uppercase font-bold tracking-wider text-[10px] sm:text-xs mb-0.5">Assigned HOD</span>
                              <span className="font-medium break-words">{branch.hod || "--"}</span>
                            </div>
                            <div>
                              <span className="block opacity-60 uppercase font-bold tracking-wider text-[10px] sm:text-xs mb-0.5">HOD Contact</span>
                              <span className="font-medium break-words text-wrap">{branch.hod_contact || "--"}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
              </>
            }
        </CardContent>
        {totalPages > 1 &&
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(currentPage - 1, filter)}
                disabled={currentPage === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(currentPage + 1, filter)}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        }
      </Card>


        <Dialog open={editingId !== null} onOpenChange={(open) => !open && (setEditingId(null) || setEditData(null))}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-[90vw] sm:max-w-md rounded-xl' : 'bg-white text-gray-900 max-w-[90vw] sm:max-w-md rounded-xl'}>
            <DialogHeader><DialogTitle>{translateTerminology("Edit Branch Details")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{translateTerminology("Branch Name")}</label>
                <Input
                  name="name"
                  value={editData?.name || ""}
                  onChange={handleEditChange}
                  className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{translateTerminology("Branch Code")}</label>
                <Input
                  name="branch_code"
                  value={editData?.branch_code || ""}
                  onChange={handleEditChange}
                  className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Total Semesters</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  name="total_semesters"
                  value={editData?.total_semesters === undefined ? 8 : editData.total_semesters}
                  onChange={handleEditChange}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} ${Number(editData?.total_semesters) > 20 ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {Number(editData?.total_semesters) > 20 && (
                  <p className="text-xs text-red-500 font-medium">Maximum allowed semesters is 20.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Assigned HOD</label>
                <Select
                  value={editData?.hod || "none"}
                  onValueChange={(val) => setEditData((prev) => prev ? { ...prev, hod: val === "none" ? null : val } : null)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translateTerminology("Select HOD")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Unassign --</SelectItem>
                    {users.filter((u) => {
                      const name = `${u.first_name} ${u.last_name}`.trim();
                      return !branches.some(b => b.hod === name && b.id !== editData?.id);
                    }).map((u) =>
                      <SelectItem key={u.id} value={`${u.first_name} ${u.last_name}`.trim()}>
                        {`${u.first_name} ${u.last_name}`.trim()}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => { setEditingId(null); setEditData(null); }} className="flex-1">Cancel</Button>
              <Button onClick={saveEdit} disabled={loading} className="flex-1 bg-primary text-white">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-[90vw] sm:max-w-md rounded-xl' : 'bg-white text-gray-900 max-w-[90vw] sm:max-w-md rounded-xl'}>
            <DialogHeader><DialogTitle>{translateTerminology("Add New Branch")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{translateTerminology("Branch Name")}</label>
                <Input
                  placeholder="e.g. Computer Science"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} />

              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{translateTerminology("Branch Code")}</label>
                <Input
                  placeholder="e.g. CSE"
                  value={newBranch.branch_code}
                  onChange={(e) => setNewBranch({ ...newBranch, branch_code: e.target.value })} />

              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Total Semesters</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="e.g. 8"
                  value={newBranch.total_semesters}
                  onChange={(e) => setNewBranch({ ...newBranch, total_semesters: e.target.value === '' ? '' as any : parseInt(e.target.value) })}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddBranch} disabled={loading} className="flex-1 bg-primary text-white">
                {loading ? "Adding..." : translateTerminology("Create Branch")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-[90vw] sm:max-w-md rounded-xl' : 'bg-white text-gray-900 max-w-[90vw] sm:max-w-md rounded-xl'}>
            <DialogHeader><DialogTitle>Assign Department Head</DialogTitle></DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Target Branch</label>
                <Select
                  value={selectedBranchId?.toString() || ""}
                  onValueChange={(val) => setSelectedBranchId(Number(val))}>

                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                    {branches.length === 0 ? (
                      <SelectItem value="none" disabled>No branches found</SelectItem>
                    ) : (
                      branches.map((branch) =>
                        <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Available HODs</label>
                <Select
                  value={newHodId}
                  onValueChange={setNewHodId}>

                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translateTerminology("Select HOD")} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                    {users.filter(u => {
                        const name = `${u.first_name} ${u.last_name}`.trim();
                        return !branches.some(b => b.hod === name);
                      }).length === 0 ? (
                      <SelectItem value="none" disabled>No available HODs found</SelectItem>
                    ) : (
                      users.filter(u => {
                        const name = `${u.first_name} ${u.last_name}`.trim();
                        return !branches.some(b => b.hod === name);
                      }).map((user) =>
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {`${user.first_name} ${user.last_name}`.trim()}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handleAssignHod}
                disabled={loading || !selectedBranchId || !newHodId}
                className="flex-1 bg-primary text-white">

                {loading ? "Assigning..." : "Assign HOD"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setConfirmName("");
        }}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-[90vw] sm:max-w-md rounded-xl' : 'bg-white text-gray-900 max-w-[90vw] sm:max-w-md rounded-xl'}>
            <DialogHeader>
              <DialogTitle className="text-destructive">{translateTerminology("Delete Branch")}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{branchToDelete?.name}"</span>?
                </p>
                <p className="text-sm text-destructive font-medium mt-2">
                  This action cannot be undone and will permanently delete the branch and all associated data.
                </p>
              </div>
              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                  Please type <span className="font-bold">{branchToDelete?.name}</span> to confirm:
                </label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={branchToDelete?.name}
                  className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setConfirmName("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => branchToDelete && deleteBranch(branchToDelete.id)}
                disabled={loading || confirmName !== branchToDelete?.name}
                className="flex-1"
              >
                {loading ? "Deleting..." : translateTerminology("Delete Branch")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>);

};

export default BranchesManagement;