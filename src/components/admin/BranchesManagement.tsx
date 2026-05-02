import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { SkeletonTable } from "../ui/skeleton";
import { PencilIcon, TrashIcon, PlusIcon, UserPlus2Icon, FileDownIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { manageBranches, manageUsers, getBranchesWithHODs } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";

interface Branch {
  id: number;
  name: string;
  branch_code: string | null;
  hod: string | null;
  hod_contact: string | null;
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

const BranchesManagement = ({ setError, toast }: { setError: (error: string | null) => void; toast: (options: any) => void }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", branch_code: "" });
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

  const fetchData = async (page: number = 1, search: string = filter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getBranchesWithHODs({ page, page_size: pageSize, search });
      console.log("Combined Branch and HOD Response:", response);

      const hasResults = response && typeof response === 'object' && 'results' in response;
      const paginationData = response as any;
      const dataSource = hasResults ? paginationData.results : paginationData;

      if (dataSource && dataSource.success) {
        // Handle paginated response format
        const branchData = Array.isArray(dataSource.branches)
          ? dataSource.branches.map((b: any) => {
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
              hod: hodName,
              hod_contact: hodContact || (b.hod ? "--" : null),
            };
          })
          : [];
        setBranches(branchData);

        // Process HODs data
        const hodData = Array.isArray(dataSource.hods)
          ? dataSource.hods.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: "hod",
            first_name: u.first_name,
            last_name: u.last_name,
            mobile_number: u.mobile_number,
          }))
          : [];
        setUsers(hodData);

        // Set pagination info
        if (hasResults) {
          setTotalCount(paginationData.count || 0);
          setTotalPages(Math.ceil((paginationData.count || 0) / pageSize));
          setCurrentPage(page);
        } else {
          setTotalCount(branchData.length);
          setTotalPages(1);
          setCurrentPage(1);
        }

      } else {
        setError(dataSource?.message || "Failed to fetch branches and HODs");
        toast({ variant: "destructive", title: "Error", description: dataSource?.message || "Failed to fetch branches and HODs" });
      }
    } catch (err) {
      console.error("Fetch error:", err);
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

  const handleEdit = (branch: Branch) => {
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

      if (!trimmedName) {
        toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
        return;
      }

      const validNameRegex = /^[A-Za-z\s]+$/;
      if (!validNameRegex.test(trimmedName)) {
        toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
        return;
      }

      if (trimmedCode && (!/^[A-Za-z0-9]{2,10}$/.test(trimmedCode))) {
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

      setLoading(true);
      try {
        const response = await manageBranches(
          {
            name: trimmedName,
            branch_code: trimmedCode || null,
            hod_id: editData.hod ? users.find((u) => `${u.first_name} ${u.last_name}`.trim() === editData.hod)?.id?.toString() : null
          },
          editData.id,
          "PUT"
        );

        const hasResults = response && typeof response === 'object' && 'results' in response;
        const dataSource = hasResults ? (response as any).results : (response as any);

        if (dataSource && dataSource.success) {
          setBranches(branches.map((b) => (b.id === editData.id ? { ...editData, name: trimmedName, branch_code: trimmedCode || null } : b)));
          setEditingId(null);
          setEditData(null);
          toast({ title: "Success", description: "Branch updated successfully" });
        } else {
          setError(response.message || "Failed to update branch");
          toast({ variant: "destructive", title: "Error", description: response.message || "Failed to update branch" });
        }
      } catch (err) {
        setError("Network error");
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);
  const deleteBranch = async () => {
    setLoading(true);
    try {
      const response = await manageBranches(undefined, deleteId!, "DELETE");
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        if (branches.length === 1 && currentPage > 1) {
          fetchData(currentPage - 1);
        } else {
          fetchData(currentPage);
        }
        setDeleteId(null);
        toast({ title: "Success", description: "Branch deleted successfully" });
      } else {
        setError(response.message || "Failed to delete branch");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to delete branch" });
      }
    } catch (err) {
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    const trimmedName = newBranch.name.trim();
    const trimmedCode = newBranch.branch_code.trim();

    if (!trimmedName) {
      toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
      return;
    }

    const validNameRegex = /^[A-Za-z\s]+$/;
    if (!validNameRegex.test(trimmedName)) {
      toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
      return;
    }

    if (trimmedCode && (!/^[A-Za-z0-9]{2,10}$/.test(trimmedCode))) {
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

    setLoading(true);
    try {
      const response = await manageBranches(
        { name: trimmedName, branch_code: trimmedCode || null },
        undefined,
        "POST"
      );

      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        fetchData(1);
        setIsAddDialogOpen(false);
        setNewBranch({ name: "", branch_code: "" });
        toast({ title: "Success", description: "Branch added successfully" });
      } else {
        setError(response.message || "Failed to add branch");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to add branch" });
      }
    } catch (err) {
      console.error("Add Branch Error:", err);
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
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        // Update local state
        const assignedHod = users.find((u) => u.id === Number(newHodId));
        setBranches(branches.map((b) => (b.id === selectedBranchId ? {
          ...b,
          hod: assignedHod ? `${assignedHod.first_name} ${assignedHod.last_name}`.trim() : null,
          hod_contact: assignedHod ? (assignedHod.mobile_number || assignedHod.email || "--") : null
        } : b)));
        setIsAssignDialogOpen(false);
        setNewHodId("");
        setSelectedBranchId(null);
        toast({ title: "Success", description: "HOD assigned successfully" });
      } else {
        setError(response.message || "Failed to assign HOD");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to assign HOD" });
      }
    } catch (err) {
      console.error("Assign HOD Error:", err);
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Branch Management", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["ID", "Branch", "Branch Code", "Assigned HOD", "HOD Contact No"]],
      body: branches.map((branch) => [
        branch.id || "",
        branch.name || "--",
        branch.branch_code || "--",
        branch.hod || "--",
        branch.hod_contact || "--",
      ]),
    });
    doc.save("Branch_list.pdf");
  };

  return (
    <div className={`mx-auto w-full max-w-[400px] sm:max-w-full text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'w-full bg-card border border-border flex flex-col h-[calc(100vh-280px)] min-h-[550px]' : 'w-full bg-white border border-gray-200 flex flex-col h-[calc(100vh-280px)] min-h-[550px]'}>
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Branch Management
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <p className={`block text-xs md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Manage branches and assign department heads
              </p>

            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={loading}
            >
              <PlusIcon className="w-4 h-4" /> Add Branch
            </Button>

            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={() => setIsAssignDialogOpen(true)}
              disabled={loading}
            >
              <UserPlus2Icon className="w-4 h-4" /> Assign HOD
            </Button>

            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={exportToPDF}
              disabled={loading}
            >
              <FileDownIcon className="w-4 h-4" /> Export PDF
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col px-2 sm:px-4 pt-0">
          <div className="pt-3 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Input
              placeholder="Search by branch name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={theme === 'dark' ? 'w-full sm:w-64 bg-card text-foreground py-1' : 'w-full sm:w-64 bg-white text-gray-900 py-1'}
            />
          </div>

          {loading && branches.length === 0 ? (
            <SkeletonTable rows={pageSize} cols={4} />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-md mb-4">
                <table className="w-full text-xs md:text-sm text-left table-auto border-collapse">
                  <thead className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'}`}>
                    <tr>
                      <th className="py-3 px-3 text-left font-bold">Branch Name</th>
                      <th className="py-3 px-3 hidden sm:table-cell font-bold">Branch Code</th>
                      <th className="py-3 px-3 font-bold">Assigned HOD</th>
                      <th className="py-3 px-3 hidden sm:table-cell font-bold">HOD Contact</th>
                      <th className="py-3 px-3 text-right w-24 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-muted-foreground">
                          No branches found.
                        </td>
                      </tr>
                    ) : (
                      filteredBranches.map((branch) => (
                        <tr
                          key={branch.id}
                          className={`border-b transition-colors duration-200 ${theme === 'dark'
                            ? 'border-border hover:bg-accent text-foreground'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                            }`}
                        >
                          <td className="py-3 px-3 align-middle font-medium">
                            {editingId === branch.id ? (
                              <Input
                                name="name"
                                value={editData?.name || ""}
                                onChange={handleEditChange}
                                className="h-8"
                              />
                            ) : (
                              <div className="truncate">{branch.name}</div>
                            )}
                          </td>

                          <td className="py-3 px-3 hidden sm:table-cell align-middle">
                            {editingId === branch.id ? (
                              <Input
                                name="branch_code"
                                value={editData?.branch_code || ""}
                                onChange={handleEditChange}
                                className="h-8"
                              />
                            ) : (
                              <span className="opacity-70">{branch.branch_code || "--"}</span>
                            )}
                          </td>

                          <td className="py-3 px-3 align-middle">
                            {editingId === branch.id ? (
                              <Select
                                value={editData?.hod || "none"}
                                onValueChange={(val) => setEditData(prev => prev ? { ...prev, hod: val === "none" ? null : val } : null)}
                              >
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue placeholder="Select HOD" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Unassign --</SelectItem>
                                  {users.map((u) => (
                                    <SelectItem key={u.id} value={`${u.first_name} ${u.last_name}`.trim()}>
                                      {`${u.first_name} ${u.last_name}`.trim()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="truncate">{branch.hod || "--"}</div>
                            )}
                          </td>

                          <td className="py-3 px-3 hidden sm:table-cell align-middle text-xs opacity-70">
                            {branch.hod_contact || "--"}
                          </td>

                          <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap align-middle">
                            {editingId === branch.id ? (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" onClick={saveEdit} disabled={loading} className="h-8 px-2">Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditData(null); }} className="h-8 px-2">Cancel</Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)} className="h-8 w-8">
                                  <PencilIcon className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => confirmDelete(branch.id)} className="h-8 w-8">
                                  <TrashIcon className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-3 border-t">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      onClick={() => fetchData(currentPage - 1, filter)}
                      disabled={currentPage === 1 || loading}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => fetchData(currentPage + 1, filter)}
                      disabled={currentPage === totalPages || loading}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, totalCount)}
                        </span>{" "}
                        of <span className="font-medium">{totalCount}</span> results
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => fetchData(currentPage - 1, filter)}
                        disabled={currentPage === 1 || loading}
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <Button
                            key={p}
                            onClick={() => fetchData(p, filter)}
                            variant={currentPage === p ? "default" : "outline"}
                            size="sm"
                            className={`h-8 w-8 p-0 ${currentPage === p ? 'bg-primary text-white shadow-sm' : ''}`}
                            disabled={loading}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() => fetchData(currentPage + 1, filter)}
                        disabled={currentPage === totalPages || loading}
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs remain similar but with consistent styling */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-md' : 'bg-white text-gray-900 max-w-md'}>
          <DialogHeader><DialogTitle className="text-destructive">Confirm Deletion</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this branch? This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={deleteBranch} disabled={loading} className="flex-1">
              {loading ? "Deleting..." : "Delete Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-md' : 'bg-white text-gray-900 max-w-md'}>
          <DialogHeader><DialogTitle>Add New Branch</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Branch Name</label>
              <Input
                placeholder="e.g. Computer Science"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Branch Code</label>
              <Input
                placeholder="e.g. CSE"
                value={newBranch.branch_code}
                onChange={(e) => setNewBranch({ ...newBranch, branch_code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddBranch} disabled={loading} className="flex-1 bg-primary text-white">
              {loading ? "Adding..." : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground max-w-md' : 'bg-white text-gray-900 max-w-md'}>
          <DialogHeader><DialogTitle>Assign Department Head</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target Branch</label>
              <Select
                value={selectedBranchId?.toString() || ""}
                onValueChange={(val) => setSelectedBranchId(Number(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Available HODs</label>
              <Select
                value={newHodId}
                onValueChange={setNewHodId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select HOD" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {`${user.first_name} ${user.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={handleAssignHod}
              disabled={loading || !selectedBranchId || !newHodId}
              className="flex-1 bg-primary text-white"
            >
              {loading ? "Assigning..." : "Assign HOD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchesManagement;