import React, { useState, useEffect } from "react";
import {
  InventoryCategory,
  fetchInventoryCategoriesPaginated,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import { Skeleton, SkeletonTable, SkeletonList } from "@/components/ui/skeleton";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  Tag,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  role?: string;
}

export const CategoryManagement: React.FC<Props> = ({ role = "admin" }) => {
  const canCUD = role === "inventory_manager" || role === "superadmin";
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      loadCategories(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadCategories = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await fetchInventoryCategoriesPaginated(params);
      if (res && Array.isArray(res.results)) {
        setCategories(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
      } else if (Array.isArray(res)) {
        setCategories(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setCategories([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cat?: InventoryCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setPrefix(cat.prefix);
      setDescription(cat.description || "");
    } else {
      setEditingCategory(null);
      setName("");
      setPrefix("");
      setDescription("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prefix.trim()) {
      toast.error("Please provide category name and code prefix");
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        await updateInventoryCategory(editingCategory.id, {
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          description: description.trim(),
        });
        toast.success("Category updated successfully");
      } else {
        await createInventoryCategory({
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          description: description.trim(),
        });
        toast.success("Category created successfully");
      }
      setShowModal(false);
      loadCategories(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: InventoryCategory) => {
    if (window.confirm(`Are you sure you want to delete category '${cat.name}'?`)) {
      try {
        await deleteInventoryCategory(cat.id);
        toast.success("Category deleted");
        loadCategories(currentPage);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete category");
      }
    }
  };

  const startIndex = (currentPage - 1) * pageSize;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadCategories(page);
  };

  return (
    <div className="w-full text-sm sm:text-base">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col min-h-[620px] md:min-h-[700px] shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Asset Categories</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage institutional asset categories, code prefixes, and inventory classifications
              </CardDescription>
            </div>

            {canCUD && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleOpenModal()}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add Category</span>
                </Button>
              </div>
            )}
          </CardHeader>

          {/* Search & Filters */}
          <div className="px-3 sm:px-5 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <Input
                  placeholder="Search by category name, prefix..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-card text-foreground py-1 pr-12 text-xs sm:text-sm"
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

              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="flex-1 overflow-hidden flex flex-col px-3 sm:px-5 pt-0 pb-3">
          {loading ? (
            <div className="space-y-4 py-2">
              <div className="hidden md:block">
                <SkeletonTable rows={6} cols={5} />
              </div>
              <div className="block md:hidden">
                <SkeletonList items={4} />
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto border rounded-xl mb-2 relative shadow-inner">
                <table className="w-full text-base md:text-sm text-left table-auto border-collapse">
                  <thead className="sticky top-0 z-20 border-b text-sm md:text-xs uppercase font-semibold tracking-wider bg-slate-50/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-border shadow-sm backdrop-blur-md">
                    <tr>
                      <th className="py-3.5 px-4 text-left font-semibold">Code Prefix</th>
                      <th className="py-3.5 px-4 font-semibold">Category Name</th>
                      <th className="py-3.5 px-4 font-semibold">Description</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Items Tagged</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Created Date</th>
                      {canCUD && <th className="py-3.5 px-4 text-right font-semibold w-36">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={canCUD ? 6 : 5} className="py-12 text-center text-muted-foreground">
                          No asset categories found.
                        </td>
                      </tr>
                    ) : (
                      categories.map((c) => (
                        <tr
                          key={c.id}
                          className="transition-colors duration-200 hover:bg-blue-50/40 dark:hover:bg-accent/70 text-foreground"
                        >
                          {/* Prefix */}
                          <td className="py-3.5 px-4 align-middle font-medium whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 inline-block">
                              {c.prefix}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="break-words font-semibold text-foreground text-sm">
                              {c.name}
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 align-middle max-w-sm">
                            <p className="text-xs text-muted-foreground truncate" title={c.description}>
                              {c.description || "--"}
                            </p>
                          </td>

                          {/* Items Count */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                            <span className="font-semibold text-sm text-foreground">
                              {c.items_count ?? 0}
                            </span>
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap text-xs text-muted-foreground">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : "--"}
                          </td>

                          {/* Actions */}
                          {canCUD && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenModal(c)}
                                  className="gap-1 text-xs font-semibold h-8"
                                  title="Edit Category"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(c)}
                                  className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-3 md:hidden mb-2">
                {categories.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                    No asset categories found.
                  </div>
                ) : (
                  categories.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border bg-white dark:bg-card border-gray-200 dark:border-border text-foreground flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
                            {c.prefix}
                          </span>
                          <h3 className="font-semibold text-sm text-foreground mt-1">{c.name}</h3>
                          {c.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                          )}
                        </div>
                        <div className="text-xs font-semibold px-2 py-1 rounded bg-muted whitespace-nowrap">
                          {c.items_count ?? 0} item(s)
                        </div>
                      </div>

                      {canCUD && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(c)}
                            className="gap-1 text-xs font-semibold h-8"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(c)}
                            className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>

        {/* Pagination Bar - only displayed when data is more than 10 */}
        {!loading && (totalCount > pageSize || totalPages > 1) && (
          <div className="px-4 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
            <div>
              Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(startIndex + pageSize, totalCount || categories.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalCount || categories.length}</span> Category(ies)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1 px-2 font-medium">
                Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Category Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[90%] sm:w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-xl sm:rounded-2xl custom-scrollbar">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Tag className="w-5 h-5 text-primary" />
              {editingCategory ? "Edit Asset Category" : "Add Asset Category"}
            </DialogTitle>
            <DialogDescription>
              Define the category name and its unique short prefix for item barcodes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                Category Name *
              </label>
              <Input
                required
                placeholder="e.g. Laptop, Projector, Server, Microscope"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                Code Prefix (2-6 letters) *
              </label>
              <Input
                required
                maxLength={6}
                placeholder="e.g. LAP, PRO, SRV, MIC"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="font-mono uppercase font-semibold"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Used in item codes: e.g. <code>E-<strong>{prefix || "LAP"}</strong>-0001</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                Description (Optional)
              </label>
              <Textarea
                rows={2}
                placeholder="Brief description of items falling in this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
