import React, { useState, useEffect } from "react";
import {
  InventoryLocation,
  fetchInventoryLocationsPaginated,
  createInventoryLocation,
  updateInventoryLocation,
  deleteInventoryLocation,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import { Skeleton, SkeletonTable, SkeletonList } from "@/components/ui/skeleton";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  Building,
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

export const LocationManagement: React.FC<Props> = ({ role = "admin" }) => {
  const canCUD = role === "inventory_manager" || role === "superadmin";
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [building, setBuilding] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      loadLocations(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadLocations = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await fetchInventoryLocationsPaginated(params);
      if (res && Array.isArray(res.results)) {
        setLocations(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
      } else if (Array.isArray(res)) {
        setLocations(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setLocations([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load locations");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (loc?: InventoryLocation) => {
    if (loc) {
      setEditingLocation(loc);
      setName(loc.name);
      setPrefix(loc.prefix);
      setBuilding(loc.building || "");
    } else {
      setEditingLocation(null);
      setName("");
      setPrefix("");
      setBuilding("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prefix.trim()) {
      toast.error("Please provide location name and prefix");
      return;
    }

    try {
      setSubmitting(true);
      if (editingLocation) {
        await updateInventoryLocation(editingLocation.id, {
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          building: building.trim(),
        });
        toast.success("Location updated successfully");
      } else {
        await createInventoryLocation({
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          building: building.trim(),
        });
        toast.success("Location created successfully");
      }
      setShowModal(false);
      loadLocations(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to save location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (loc: InventoryLocation) => {
    if (window.confirm(`Are you sure you want to delete location '${loc.name}'?`)) {
      try {
        await deleteInventoryLocation(loc.id);
        toast.success("Location deleted");
        loadLocations(currentPage);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete location");
      }
    }
  };

  const startIndex = (currentPage - 1) * pageSize;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadLocations(page);
  };

  return (
    <div className="w-full text-sm sm:text-base">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col min-h-[620px] md:min-h-[700px] shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Campus Locations</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage institutional buildings, blocks, and inventory storage locations
              </CardDescription>
            </div>

            {canCUD && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenModal()}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add Location</span>
                </Button>
              </div>
            )}
          </CardHeader>

          {/* Search & Filters */}
          <div className="px-3 sm:px-5 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <Input
                  placeholder="Search by location name, prefix, building..."
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
                      <th className="py-3.5 px-4 font-semibold">Location / Block Name</th>
                      <th className="py-3.5 px-4 font-semibold">Building / Landmark</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Items Located</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Created Date</th>
                      {canCUD && <th className="py-3.5 px-4 text-right font-semibold w-36">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {locations.length === 0 ? (
                      <tr>
                        <td colSpan={canCUD ? 6 : 5} className="py-12 text-center text-muted-foreground">
                          No campus locations found.
                        </td>
                      </tr>
                    ) : (
                      locations.map((l) => (
                        <tr
                          key={l.id}
                          className="transition-colors duration-200 hover:bg-blue-50/40 dark:hover:bg-accent/70 text-foreground"
                        >
                          {/* Prefix */}
                          <td className="py-3.5 px-4 align-middle font-medium whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 inline-block">
                              {l.prefix}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="break-words font-semibold text-foreground text-sm">
                              {l.name}
                            </div>
                          </td>

                          {/* Building */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {l.building ? (
                                <>
                                  <Building className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                  <span>{l.building}</span>
                                </>
                              ) : (
                                "--"
                              )}
                            </div>
                          </td>

                          {/* Items Count */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                            <span className="font-semibold text-sm text-foreground">
                              {l.items_count ?? 0}
                            </span>
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap text-xs text-muted-foreground">
                            {l.created_at ? new Date(l.created_at).toLocaleDateString() : "--"}
                          </td>

                          {/* Actions */}
                          {canCUD && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenModal(l)}
                                  className="gap-1 text-xs font-semibold h-8"
                                  title="Edit Location"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(l)}
                                  className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Delete Location"
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
                {locations.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                    No campus locations found.
                  </div>
                ) : (
                  locations.map((l) => (
                    <div
                      key={l.id}
                      className="p-4 rounded-xl border bg-white dark:bg-card border-gray-200 dark:border-border text-foreground flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
                            {l.prefix}
                          </span>
                          <h3 className="font-semibold text-sm text-foreground mt-1">{l.name}</h3>
                          {l.building && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3" /> {l.building}
                            </p>
                          )}
                        </div>
                        <div className="text-xs font-semibold px-2 py-1 rounded bg-muted whitespace-nowrap">
                          {l.items_count ?? 0} item(s)
                        </div>
                      </div>

                      {canCUD && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(l)}
                            className="gap-1 text-xs font-semibold h-8"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(l)}
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
                {Math.min(startIndex + pageSize, totalCount || locations.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalCount || locations.length}</span> Location(s)
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

      {/* Add / Edit Location Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[90%] sm:w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-xl sm:rounded-2xl custom-scrollbar">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="w-5 h-5 text-primary" />
              {editingLocation ? "Edit Campus Location" : "Add Campus Location"}
            </DialogTitle>
            <DialogDescription>
              Define building/block name and its single or double letter prefix for item barcodes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                Location / Block Name *
              </label>
              <Input
                required
                placeholder="e.g. Engineering Block, Administrative Block"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                Location Prefix (1-4 letters) *
              </label>
              <Input
                required
                maxLength={4}
                placeholder="e.g. E, A, D, LIB"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="font-mono uppercase font-semibold"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Used in item barcodes: e.g. <code><strong>{prefix || "E"}</strong>-LAP-0001</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                Building Number / Landmark (Optional)
              </label>
              <Input
                placeholder="e.g. Building 4, North Campus"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Location"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
