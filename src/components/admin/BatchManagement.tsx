import React, { useEffect, useState } from "react";
import { manageBatches } from "../../utils/admin_api";
import Swal from "sweetalert2";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { SkeletonTable } from "../ui/skeleton";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Edit, Trash2, Layers, FileDown, Loader2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
  student_count: number;
  created_at: string;
}

interface BatchManagementProps {
  setError?: (error: string | null) => void;
  toast?: any;
  isReadOnly?: boolean;
}

const BatchManagement: React.FC<BatchManagementProps> = ({ setError, toast, isReadOnly = false }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: "", start_year: "", end_year: "" });
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({ start_year: "", end_year: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const { theme } = useTheme();

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      let queryParams = "";
      if (searchQuery.trim()) {
        queryParams = `?search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/batches/export-pdf/${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Batch_List_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        if (toast) {
          toast({
            title: "Success",
            description: "Batches list PDF exported successfully",
          });
        }
      } else {
        const result = await response.json().catch(() => ({}));
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.message || "Failed to export PDF",
          });
        }
      }
    } catch (err) {
      if (toast) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error while exporting PDF",
        });
      }
    } finally {
      setExporting(false);
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchBatches = async (page: number = 1, search: string = searchQuery) => {
    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches({ page, page_size: pageSize, search });

      // The backend returns a paginated response with a top-level 'results' key
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const paginationData = res as any;
      const dataSource = hasResults ? paginationData.results : paginationData;

      if (dataSource && dataSource.success) {
        const batchesArray = dataSource.batches || [];
        if (Array.isArray(batchesArray)) {
          setBatches(batchesArray);

          const count = paginationData.count || (dataSource && dataSource.count);
          if (count !== undefined) {
            setTotalCount(count);
            setTotalPages(Math.ceil(count / pageSize));
            setCurrentPage(page);
          } else {
            // Not a paginated response, fallback
            setTotalCount(batchesArray.length);
            setTotalPages(1);
            setCurrentPage(1);
          }
        } else {
          if (setError) setError("Invalid response format");
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to fetch batches");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to fetch batches",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBatches(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBatch({ ...newBatch, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleAddBatch = async () => {
    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches(
        {
          start_year: Number(newBatch.start_year),
          end_year: Number(newBatch.end_year),
        },
        undefined,
        "POST"
      );
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);

      if (dataSource && dataSource.success) {
        // Refresh to maintain pagination integrity
        fetchBatches(1);
        setNewBatch({ name: "", start_year: "", end_year: "" });
        if (toast) {
          toast({
            title: "Success",
            description: "Batch added successfully",
          });
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to add batch");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to add batch",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setEditForm({
      start_year: batch.start_year.toString(),
      end_year: batch.end_year.toString(),
    });
  };

  const handleUpdateBatch = async () => {
    if (!editingBatch) return;

    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches(
        {
          start_year: Number(editForm.start_year),
          end_year: Number(editForm.end_year),
        },
        editingBatch.id,
        "PUT"
      );
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);

      if (dataSource && dataSource.success) {
        // Update local state for immediate feedback
        if (dataSource.batch) {
          setBatches(prevBatches =>
            prevBatches.map(batch =>
              batch.id === dataSource.batch.id ? {
                ...batch,
                name: dataSource.batch.name,
                start_year: dataSource.batch.start_year,
                end_year: dataSource.batch.end_year,
                student_count: dataSource.batch.student_count || batch.student_count
              } : batch
            )
          );
        } else {
          fetchBatches(currentPage);
        }
        setEditingBatch(null);
        setEditForm({ start_year: "", end_year: "" });
        if (toast) {
          toast({
            title: "Success",
            description: "Batch updated successfully",
          });
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to update batch");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to update batch",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  const handleDeleteBatch = (batch: Batch) => {
    setBatchToDelete(batch);
    setConfirmName("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!batchToDelete) return;

    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const result = await Swal.fire({
      title: 'Final Confirmation',
      text: `Are you absolutely sure you want to delete the batch "${batchToDelete.name}"?`,
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
    if (setError) setError(null);
    try {
      const res = await manageBatches(undefined, batchToDelete.id, "DELETE");
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);

      if (dataSource && dataSource.success) {
        // If it was the last item on the page, go to previous page
        if (batches.length === 1 && currentPage > 1) {
          fetchBatches(currentPage - 1);
        } else {
          fetchBatches(currentPage);
        }
        setDeleteDialogOpen(false);
        setBatchToDelete(null);
        if (toast) {
          toast({
            title: "Success",
            description: "Batch deleted successfully",
          });
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to delete batch");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to delete batch",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .batch-header-cell { padding: 12px 8px !important; }
          .batch-body-cell { padding: 12px 8px !important; }
          .batch-card-header { padding: 16px !important; }
          .batch-card-content { padding: 12px 16px 16px 16px !important; }
          .batch-title { font-size: 1.125rem !important; }
          .batch-desc { font-size: 0.8125rem !important; }
          .batch-search-mobile { width: 100% !important; }
          .batch-add-controls { gap: 12px !important; }
        }
      `}</style>

      <div id="batch-management-card" className={` max-w-full mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        {/* Add New Batch Card */}
        {!isReadOnly && (
          <Card id="add-new-batch-card" className={theme === 'dark' ? 'bg-card border border-border shadow-sm mb-6' : 'bg-white border border-gray-200 shadow-sm mb-6'}>
            <CardHeader className="batch-card-header pb-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="w-full">
                <CardTitle className="batch-title">
                  Add New Batch
                </CardTitle>
                <p className={`batch-desc block text-sm md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Create a batch with start and end years
                </p>
              </div>
            </CardHeader>
            <CardContent className="batch-card-content pt-4">
              <div className="batch-add-controls flex flex-col sm:flex-row gap-2 mb-2">
                <Input
                  name="start_year"
                  type="number"
                  placeholder="Start Year"
                  value={newBatch.start_year}
                  onChange={handleInputChange}
                  className={theme === 'dark' ? 'w-full sm:w-1/3 bg-card text-foreground border border-border' : 'w-full sm:w-1/3 bg-white text-gray-900 border border-gray-300'}
                />
                <Input
                  name="end_year"
                  type="number"
                  placeholder="End Year"
                  value={newBatch.end_year}
                  onChange={handleInputChange}
                  className={theme === 'dark' ? 'w-full sm:w-1/3 bg-card text-foreground border border-border' : 'w-full sm:w-1/3 bg-white text-gray-900 border border-gray-300'}
                />
                <Button
                  onClick={handleAddBatch}
                  disabled={loading}
                  className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm"
                >
                  Add Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Batches */}
        <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm flex flex-col h-auto md:h-[calc(100vh-320px)] md:min-h-[500px]' : 'bg-white border border-gray-200 shadow-sm flex flex-col h-auto md:h-[calc(100vh-320px)] md:min-h-[500px]'}>
          <CardHeader id="existing-batches-header" className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle>Existing Batches</CardTitle>
                {totalCount > 0 && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-800'}`}>
                    Total: {totalCount}
                  </span>
                )}
              </div>
              <CardDescription className="text-[16px] sm:text-sm text-muted-foreground mt-1">
                Manage, edit, or delete created batches
              </CardDescription>
            </div>
            <div className="flex flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Input
                    placeholder="Search batches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`batch-search-mobile h-9 w-full pr-12 ${theme === 'dark' ? 'bg-card border-border' : 'bg-gray-50 border-gray-200'}`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {/* Desktop/Tablet Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="hidden md:flex items-center justify-center gap-1 w-full md:w-auto h-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium bg-primary hover:bg-primary/90 text-white hover:text-white"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  {exporting ? "Exporting..." : "Export PDF"}
                </Button>
                {/* Mobile Export Icon Button next to search input */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex md:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background"
                  title="Export PDF"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                </Button>
              </div>
          </CardHeader>
          <CardContent className="batch-card-content flex-1 overflow-hidden flex flex-col pt-3">
            {loading ? (
              <SkeletonTable rows={pageSize} cols={4} />
            ) : (
              <>
                {batches.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                      <Layers className="w-10 h-10 text-primary opacity-50" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No batches found</h3>
                    <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      There are currently no batches available. Create a new batch using the form above to get started.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop View: Table */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-md mb-4 overflow-x-auto hidden md:block">
                      <table className="batch-table w-full text-base md:text-sm text-left border-collapse table-auto align-middle whitespace-nowrap">
                        <thead className={`sticky top-0 z-10 border-b text-sm md:text-xs uppercase ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'} text-muted-foreground border-border shadow-sm`}>
                          <tr>
                            <th className="batch-header-cell py-3 px-3 text-left font-semibold">Batch Name</th>
                            <th className="batch-header-cell py-3 px-3 hidden sm:table-cell font-semibold text-center">Start Year</th>
                            <th className="batch-header-cell py-3 px-3 hidden sm:table-cell font-semibold text-center">End Year</th>
                            <th className="batch-header-cell py-3 px-3 hidden sm:table-cell font-semibold text-center">Duration</th>
                            <th className="batch-header-cell py-3 px-3 w-20 font-semibold text-center">Students</th>
                            <th className="batch-header-cell py-3 px-3 w-28 font-semibold text-center">Created At</th>
                            {!isReadOnly && <th className="batch-header-cell py-3 px-3 w-28 text-right font-semibold">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map((batch) => (
                            <tr
                              key={batch.id}
                              className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                            >
                              <td className="batch-body-cell py-3 px-3 align-middle font-medium">
                                <div className="truncate">{batch.name}</div>
                              </td>
                              <td className="batch-body-cell py-3 px-3 hidden sm:table-cell text-center align-middle">{batch.start_year}</td>
                              <td className="batch-body-cell py-3 px-3 hidden sm:table-cell text-center align-middle">{batch.end_year}</td>
                              <td className="batch-body-cell py-3 px-3 hidden sm:table-cell text-center align-middle">
                                {batch.end_year - batch.start_year} {batch.end_year - batch.start_year === 1 ? 'Year' : 'Years'}
                              </td>
                              <td className="batch-body-cell py-3 px-3 w-20 text-center align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'}`}>
                                  {batch.student_count}
                                </span>
                              </td>
                              <td className="batch-body-cell py-3 px-3 w-28 text-center align-middle text-[13px] sm:text-xs opacity-70">
                                {new Date(batch.created_at).toLocaleDateString()}
                              </td>
                              {!isReadOnly && (
                                <td className="batch-body-cell py-3 px-3 w-28 text-right space-x-1 whitespace-nowrap align-middle">
                                  <Button size="icon" variant="ghost" onClick={() => handleEditBatch(batch)} disabled={loading} className="h-8 w-8">
                                    <Edit className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteBatch(batch)} disabled={loading} className="h-8 w-8">
                                    <Trash2 className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Stacked Cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden mb-4">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm ${theme === 'dark'
                              ? 'bg-zinc-950/40 border-border text-foreground'
                              : 'bg-white border-gray-200 text-gray-900'
                            }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-sm sm:text-base break-words">
                                {batch.name}
                              </h4>
                              <div className="flex flex-row items-center gap-1.5 mt-1 whitespace-nowrap">
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  Duration: {batch.end_year - batch.start_year} {batch.end_year - batch.start_year === 1 ? 'Year' : 'Years'}
                                </span>
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-50 text-blue-800'
                                  }`}>
                                  {batch.student_count} Students
                                </span>
                              </div>
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditBatch(batch)}
                                  disabled={loading}
                                  className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                >
                                  <Edit className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteBatch(batch)}
                                  disabled={loading}
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className={`grid grid-cols-3 gap-2 pt-2 border-t text-xs sm:text-sm ${theme === 'dark' ? 'border-border/50' : 'border-gray-100'}`}>
                            <div>
                              <span className="block opacity-60 uppercase font-bold tracking-wider text-[10px] sm:text-xs mb-0.5">Start Year</span>
                              <span className="font-medium">{batch.start_year}</span>
                            </div>
                            <div>
                              <span className="block opacity-60 uppercase font-bold tracking-wider text-[10px] sm:text-xs mb-0.5">End Year</span>
                              <span className="font-medium">{batch.end_year}</span>
                            </div>
                            <div>
                              <span className="block opacity-60 uppercase font-bold tracking-wider text-[10px] sm:text-xs mb-0.5">Created At</span>
                              <span className="font-medium">{new Date(batch.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBatches(currentPage - 1, searchQuery)}
                  disabled={currentPage === 1 || loading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
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
                  onClick={() => fetchBatches(currentPage + 1, searchQuery)}
                  disabled={currentPage === totalPages || loading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Edit Batch Dialog */}
        <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
          <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[400px] w-[90%] rounded-xl shadow-xl`}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Edit Batch Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                  Start Year
                </label>
                <Input
                  name="start_year"
                  type="number"
                  value={editForm.start_year}
                  onChange={handleEditInputChange}
                  placeholder="e.g. 2024"
                  className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                  End Year
                </label>
                <Input
                  name="end_year"
                  type="number"
                  value={editForm.end_year}
                  onChange={handleEditInputChange}
                  placeholder="e.g. 2028"
                  className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setEditingBatch(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBatch}
                disabled={loading}
                className="flex-1 bg-primary text-white"
              >
                {loading ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmName("");
        }}>
          <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[400px] w-full rounded-xl shadow-xl`}>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Batch</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{batchToDelete?.name}"</span>?
                </p>
                <p className="text-sm text-destructive font-medium mt-2">
                  This action cannot be undone and will remove all associations.
                </p>
              </div>
              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                  Please type <span className="font-bold">{batchToDelete?.name}</span> to confirm:
                </label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={batchToDelete?.name}
                  className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setConfirmName("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={loading || confirmName !== batchToDelete?.name}
                className="flex-1"
              >
                {loading ? "Deleting..." : "Delete Batch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default BatchManagement;