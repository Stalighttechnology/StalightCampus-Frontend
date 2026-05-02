import React, { useEffect, useState } from "react";
import { manageBatches } from "../../utils/admin_api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { SkeletonTable } from "../ui/skeleton";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

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
}

const BatchManagement: React.FC<BatchManagementProps> = ({ setError, toast }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: "", start_year: "", end_year: "" });
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({ start_year: "", end_year: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme } = useTheme();

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
          
          if (hasResults) {
            setTotalCount(paginationData.count || 0);
            setTotalPages(Math.ceil((paginationData.count || 0) / pageSize));
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
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!batchToDelete) return;

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
    <div className={` max-w-full mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      {/* Add New Batch Card */}
      <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm mb-6' : 'bg-white border border-gray-200 shadow-sm mb-6'}>
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full">
            <CardTitle className={`block text-lg md:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Add New Batch
            </CardTitle>
            <p className={`block text-sm md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Create a batch with start and end years
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
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

      {/* Existing Batches */}
      <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm flex flex-col h-[calc(100vh-320px)] min-h-[500px]' : 'bg-white border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-320px)] min-h-[500px]'}>
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full">
            <CardTitle className={`block text-lg md:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Existing Batches
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className={`block text-sm md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Manage, edit, or delete created batches
                </p>
                <Input
                  placeholder="Search batches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`h-8 w-full sm:w-48 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}
                />
              </div>
              {totalCount > 0 && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-800'}`}>
                  Total: {totalCount}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col pt-0">
          {loading ? (
            <SkeletonTable rows={pageSize} cols={4} />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-md mb-4">
                <table className="w-full text-[11px] md:text-sm text-left border-collapse table-auto align-middle">
                  <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card border-b border-border shadow-sm' : 'bg-gray-50 border-b border-gray-200 shadow-sm'}`}>
                    <tr>
                      <th className={`py-3 px-3 text-left font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Batch Name</th>
                      <th className={`py-3 px-3 hidden sm:table-cell font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>Start Year</th>
                      <th className={`py-3 px-3 hidden sm:table-cell font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>End Year</th>
                      <th className={`py-3 px-3 w-20 font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>Students</th>
                      <th className={`py-3 px-3 w-28 font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>Created At</th>
                      <th className={`py-3 px-3 w-28 text-right font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-muted-foreground">
                          No batches found.
                        </td>
                      </tr>
                    ) : (
                      batches.map((batch) => (
                        <tr
                          key={batch.id}
                          className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`} 
                        >
                          <td className="py-3 px-3 align-middle font-medium">
                            <div className="truncate">{batch.name}</div>
                          </td>
                          <td className="py-3 px-3 hidden sm:table-cell text-center align-middle">{batch.start_year}</td>
                          <td className="py-3 px-3 hidden sm:table-cell text-center align-middle">{batch.end_year}</td>
                          <td className="py-3 px-3 w-20 text-center align-middle">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'}`}>
                              {batch.student_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 w-28 text-center align-middle text-xs opacity-70">
                            {new Date(batch.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 w-28 text-right space-x-1 whitespace-nowrap align-middle">
                            <Button size="icon" variant="ghost" onClick={() => handleEditBatch(batch)} disabled={loading} className="h-8 w-8">
                              <Edit className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteBatch(batch)} disabled={loading} className="h-8 w-8">
                              <Trash2 className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                            </Button>
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
                      onClick={() => fetchBatches(currentPage - 1, searchQuery)}
                      disabled={currentPage === 1 || loading}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => fetchBatches(currentPage + 1, searchQuery)}
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
                        onClick={() => fetchBatches(currentPage - 1, searchQuery)}
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
                            onClick={() => fetchBatches(p, searchQuery)}
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
                        onClick={() => fetchBatches(currentPage + 1, searchQuery)}
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

      {/* Edit Batch Dialog */}
      <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[400px] w-full rounded-xl shadow-xl` }>
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[400px] w-full rounded-xl shadow-xl` }>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Batch</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
              Are you sure you want to delete <span className="font-bold text-foreground">"{batchToDelete?.name}"</span>?
            </p>
            <p className="text-sm text-destructive font-medium mt-2">
              This action cannot be undone and will remove all associations.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Deleting..." : "Delete Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchManagement;