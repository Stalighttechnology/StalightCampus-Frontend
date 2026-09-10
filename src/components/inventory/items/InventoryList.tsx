import React, { useState, useEffect } from "react";
import {
  InventoryItem,
  InventoryCategory,
  InventoryLocation,
  fetchInventoryItems,
  fetchInventoryItemsPaginated,
  fetchInventoryCategories,
  fetchInventoryLocations,
  fetchBranches,
} from "../../../utils/inventory_api";
import { InventoryStatusBadge } from "../common/InventoryStatusBadge";
import { AddInventoryModal } from "./AddInventoryModal";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { QRScannerModal } from "../common/QRScannerModal";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card } from "../../ui/card";
import {
  Search,
  Plus,
  QrCode,
  Download,
  Filter,
  RefreshCw,
  Package,
  Layers,
  MapPin,
  FileSpreadsheet,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface Props {
  role?: string;
  onRaiseTicket?: (item: InventoryItem) => void;
  branches?: Array<{ id: number; name: string }>;
  categories?: InventoryCategory[];
  locations?: InventoryLocation[];
}

export const InventoryList: React.FC<Props> = ({
  role = "admin",
  onRaiseTicket,
  branches = [],
  categories: propCategories = [],
  locations: propLocations = [],
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>(propCategories);
  const [locations, setLocations] = useState<InventoryLocation[]>(propLocations);
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [loading, setLoading] = useState(true);

  // Pagination & Page Size (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchList(branches);
    }
  }, [branches]);

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setCategories(propCategories);
    }
  }, [propCategories]);

  useEffect(() => {
    if (propLocations && propLocations.length > 0) {
      setLocations(propLocations);
    }
  }, [propLocations]);

  useEffect(() => {
    if (propCategories.length === 0 || propLocations.length === 0 || branches.length === 0) {
      loadMetadata();
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      loadItems(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search, selectedCategory, selectedLocation, selectedDepartment, selectedStatus]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedLocation("all");
    setSelectedDepartment("all");
    setSelectedStatus("all");
    setCurrentPage(1);
    loadItems(1, { search: "", category: "all", location: "all", branch: "all", status: "all" });
  };

  const loadMetadata = async () => {
    try {
      const [cats, locs, brs] = await Promise.all([
        propCategories.length > 0 ? Promise.resolve(propCategories) : fetchInventoryCategories(),
        propLocations.length > 0 ? Promise.resolve(propLocations) : fetchInventoryLocations(),
        branches.length > 0 ? Promise.resolve(branches) : fetchBranches(),
      ]);
      setCategories(cats || []);
      setLocations(locs || []);
      setBranchList(brs || []);
    } catch (err) {
      console.error("Error loading categories/locations/branches:", err);
    }
  };

  const loadItems = async (page: number = currentPage, overrideFilters?: any) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      const curSearch = overrideFilters?.search !== undefined ? overrideFilters.search : search;
      const curCategory = overrideFilters?.category !== undefined ? overrideFilters.category : selectedCategory;
      const curLocation = overrideFilters?.location !== undefined ? overrideFilters.location : selectedLocation;
      const curDepartment = overrideFilters?.branch !== undefined ? overrideFilters.branch : selectedDepartment;
      const curStatus = overrideFilters?.status !== undefined ? overrideFilters.status : selectedStatus;

      if (curSearch.trim()) params.search = curSearch.trim();
      if (curCategory !== "all") params.category = curCategory;
      if (curLocation !== "all") params.location = curLocation;
      if (curDepartment !== "all") params.branch = curDepartment;
      if (curStatus !== "all") params.status = curStatus;

      const res = await fetchInventoryItemsPaginated(params);
      if (res && Array.isArray(res.results)) {
        setItems(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
      } else if (Array.isArray(res)) {
        setItems(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setItems([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadItems(page);
  };

  const startIndex = (currentPage - 1) * pageSize;

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing inventory export...");
      const exportParams: Record<string, string | number> = {
        all: "true",
      };

      if (search.trim()) exportParams.search = search.trim();
      if (selectedCategory !== "all") exportParams.category = selectedCategory;
      if (selectedLocation !== "all") exportParams.location = selectedLocation;
      if (selectedDepartment !== "all") exportParams.branch = selectedDepartment;
      if (selectedStatus !== "all") exportParams.status = selectedStatus;

      const allItems = await fetchInventoryItems(exportParams);
      if (!allItems || !allItems.length) {
        toast.error("No items found matching the selected filters to export");
        return;
      }

      const exportRows = allItems.map((i, idx) => ({
        "Sl No": idx + 1,
        "Item Code": i.item_code,
        "Item Name": i.item_name,
        "Category": i.category_details?.name || "",
        "Location": i.location_details?.name || "",
        "Room No": i.room_no || "",
        "Department": i.branch_name || "General",
        "Quantity": i.quantity_available,
        "Unit Cost (₹)": i.cost_per_unit,
        "Total Cost (₹)": i.total_cost,
        "Status": i.status,
        "Asset Type": i.asset_type,
        "Vendor": i.vendor_name || "",
        "Invoice No": i.invoice_no || "",
        "Created Date": i.created_at ? new Date(i.created_at).toLocaleDateString() : "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Assets");
      XLSX.writeFile(wb, `Stalight_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${allItems.length} asset(s) to Excel`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export inventory");
    }
  };

  const handleQRScanned = async (code: string) => {
    setShowScannerModal(false);
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Check currently loaded page items first
    const localMatch = items.find(
      (i) =>
        i.item_code.toUpperCase() === cleanCode.toUpperCase() ||
        String(i.id) === cleanCode
    );
    if (localMatch) {
      setSelectedItem(localMatch);
      toast.success(`Found asset: ${localMatch.item_code} - ${localMatch.item_name}`);
      return;
    }

    // Server-side lookup
    try {
      setLoading(true);
      const res = await fetchInventoryItemsPaginated({ search: cleanCode, page: 1, page_size: 10 });
      if (res && Array.isArray(res.results) && res.results.length > 0) {
        const exactMatch = res.results.find(
          (i) => i.item_code.toUpperCase() === cleanCode.toUpperCase()
        ) || res.results[0];

        setSelectedItem(exactMatch);
        toast.success(`Found asset: ${exactMatch.item_code} - ${exactMatch.item_name}`);
      } else {
        setSearch(cleanCode);
        toast.error(`No asset found matching code: "${cleanCode}"`);
      }
    } catch (err: any) {
      setSearch(cleanCode);
      toast.error(err.message || `Failed to find asset for code "${cleanCode}"`);
    } finally {
      setLoading(false);
    }
  };

  const isFaculty = role === "faculty" || role === "staff";
  const canCUD = role === "inventory_manager" || role === "superadmin";

  return (
    <div className="space-y-4">
      {/* Filter & Search Bar with Integrated Actions */}
      <Card className="p-4 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, item, vendor, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadItems()}
              className="pl-9 text-xs"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} ({c.prefix})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name} ({l.prefix})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department / Branch Filter */}
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="general">Institutional / General</SelectItem>
              {branchList.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in-use">In Use</SelectItem>
              <SelectItem value="available">Available / In Stock</SelectItem>
              <SelectItem value="in-repair">In Repair</SelectItem>
              <SelectItem value="scrapped">Scrapped</SelectItem>
              <SelectItem value="discarded">Discarded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {(search || selectedCategory !== "all" || selectedLocation !== "all" || selectedDepartment !== "all" || selectedStatus !== "all") && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-7 text-xs px-2.5">
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScannerModal(true)}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5 text-primary" /> Scan QR
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
            </Button>

            {canCUD && (
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Asset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Items Table */}
      <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 w-16 text-center whitespace-nowrap">Sl No</th>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Name & Specs</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location & Room</th>
                <th className="py-3 px-4">Department</th>
                {!isFaculty && <th className="py-3 px-4">Qty & Cost</th>}
                <th className="py-3 px-4">Status</th>
                {!isFaculty && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={isFaculty ? 7 : 9} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading inventory assets...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={isFaculty ? 7 : 9} className="py-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-mono font-semibold text-muted-foreground whitespace-nowrap">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                      {item.item_code}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-foreground truncate">{item.item_name}</p>
                      {item.specifications && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.specifications}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      {item.category_details?.name || "General"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      <div>{item.location_details?.name || "Campus"}</div>
                      {item.room_no && (
                        <div className="text-[11px] text-muted-foreground/80">Rm: {item.room_no}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      {item.branch_name || "Institutional / General"}
                    </td>
                    {!isFaculty && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">
                          ₹{Number(item.total_cost || 0).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.quantity_available} unit(s)
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <InventoryStatusBadge status={item.status} />
                    </td>
                    {!isFaculty && (
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                          className="h-8 text-xs font-semibold"
                        >
                          View Specs
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-bold text-foreground">
              {startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-foreground">
              {Math.min(startIndex + pageSize, totalCount || items.length)}
            </span>{" "}
            of <span className="font-bold text-foreground">{totalCount || items.length}</span> asset(s)
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
              Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
              <span className="font-bold text-foreground">{totalPages}</span>
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

      {/* Add Modal */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={categories}
        locations={locations}
        branches={branchList}
        onSuccess={() => {
          loadItems();
          loadMetadata();
        }}
      />

      {/* Details & Audit Modal */}
      <ItemDetailsModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onRefresh={loadItems}
        onRaiseTicket={onRaiseTicket}
        locations={locations}
        branches={branchList}
        role={role}
      />

      {/* Camera QR Scanner */}
      <QRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleQRScanned}
      />
    </div>
  );
};
