import React, { useState, useEffect } from "react";
import {
  InventoryItem,
  InventoryCategory,
  InventoryLocation,
  GroupedInventoryAsset,
  fetchInventoryItems,
  fetchInventoryItemsPaginated,
  fetchInventoryGroupedAssets,
  fetchInventoryCategories,
  fetchInventoryLocations,
  fetchBranches,
} from "../../../utils/inventory_api";
import { InventoryStatusBadge } from "../common/InventoryStatusBadge";
import { AddInventoryModal } from "./AddInventoryModal";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { GroupedAssetDetailsModal } from "./GroupedAssetDetailsModal";
import { BulkBufferAllocationModal } from "./BulkBufferAllocationModal";
import { QRScannerModal } from "../common/QRScannerModal";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import {
  Search,
  Plus,
  QrCode,
  RefreshCw,
  Package,
  FileSpreadsheet,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
  ArrowRightLeft,
  Boxes,
  Building,
  Layers,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Wrench,
  AlertTriangle,
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
  const [groupedAssets, setGroupedAssets] = useState<GroupedInventoryAsset[]>([]);

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
  const [stockFilterTab, setStockFilterTab] = useState<"all" | "buffer" | "in-use">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState<GroupedInventoryAsset | null>(null);
  const [bulkAllocateGroup, setBulkAllocateGroup] = useState<GroupedInventoryAsset | null>(null);

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
  }, [search, stockFilterTab, selectedCategory, selectedLocation, selectedDepartment, selectedStatus]);

  const handleResetFilters = () => {
    setSearch("");
    setStockFilterTab("all");
    setSelectedCategory("all");
    setSelectedLocation("all");
    setSelectedDepartment("all");
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  const loadMetadata = async () => {
    try {
      const [cats, locs, brs] = await Promise.all([
        propCategories.length > 0 ? Promise.resolve(propCategories) : fetchInventoryCategories().catch(() => []),
        propLocations.length > 0 ? Promise.resolve(propLocations) : fetchInventoryLocations().catch(() => []),
        branches.length > 0 ? Promise.resolve(branches) : fetchBranches().catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setLocations(Array.isArray(locs) ? locs : []);
      setBranchList(Array.isArray(brs) ? brs : []);
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
      const curStockTab = overrideFilters?.stockFilterTab !== undefined ? overrideFilters.stockFilterTab : stockFilterTab;
      const curCategory = overrideFilters?.category !== undefined ? overrideFilters.category : selectedCategory;
      const curLocation = overrideFilters?.location !== undefined ? overrideFilters.location : selectedLocation;
      const curDepartment = overrideFilters?.branch !== undefined ? overrideFilters.branch : selectedDepartment;
      const curStatus = overrideFilters?.status !== undefined ? overrideFilters.status : selectedStatus;

      if (curSearch.trim()) params.search = curSearch.trim();
      if (curStockTab !== "all") params.stock_type = curStockTab;
      if (curCategory !== "all") params.category = curCategory;
      if (curLocation !== "all") params.location = curLocation;
      if (curDepartment !== "all") params.branch = curDepartment;
      if (curStatus !== "all") params.status = curStatus;

      const res = await fetchInventoryGroupedAssets(params);
      if (res && Array.isArray(res.results)) {
        setGroupedAssets(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
        setSelectedGroupForDetails((prev) => {
          if (!prev) return null;
          return res.results.find((g: GroupedInventoryAsset) => g.group_id === prev.group_id) || prev;
        });
      } else {
        setGroupedAssets([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load inventory assets");
      setGroupedAssets([]);
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

      const rows = allItems.map((item, index) => ({
        "Sl No": index + 1,
        "Item Code": item.item_code,
        "Item Name": item.item_name,
        "Specifications": item.specifications || "--",
        "Category": item.category_details?.name || "--",
        "Category Code": item.category_details?.prefix || "--",
        "Location": item.location_details?.name || "--",
        "Location Code": item.location_details?.prefix || "--",
        "Department / Branch": item.branch_name || "Institutional / General",
        "Room No": item.room_no || "--",
        "Asset Type": item.asset_type,
        "Quantity Available": item.quantity_available,
        "Unit Cost (INR)": item.cost_per_unit,
        "Total Cost (INR)": item.total_cost,
        "Status": item.status.toUpperCase(),
        "Vendor Name": item.vendor_name || "--",
        "Vendor Contact": item.vendor_contact || "--",
        "Invoice No": item.invoice_no || "--",
        "Invoice Date": item.invoice_date || "--",
        "Approval Letter Ref": item.approval_letter_ref || "--",
        "Approval Letter Date": item.approval_letter_date || "--",
        "Remarks": item.remarks || "--",
        "Date Added": new Date(item.created_at).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Campus Inventory");
      XLSX.writeFile(
        workbook,
        `Inventory_Export_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast.success(`Exported ${rows.length} asset records to Excel`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export Excel file");
    }
  };

  const handleQRScanned = async (code: string) => {
    try {
      setShowScannerModal(false);
      setLoading(true);
      const cleanCode = code.trim();

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
      setSearch(code.trim());
      toast.error(err.message || `Failed to find asset for code "${code}"`);
    } finally {
      setLoading(false);
    }
  };

  const isFaculty = role === "faculty" || role === "staff";
  const isHOD = role === "hod";
  const canCUD = role === "inventory_manager" || role === "superadmin";

  const isFiltered =
    Boolean(search) ||
    selectedCategory !== "all" ||
    selectedLocation !== "all" ||
    selectedDepartment !== "all" ||
    selectedStatus !== "all" ||
    stockFilterTab !== "all";

  return (
    <div className="w-full text-sm sm:text-base">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col min-h-[620px] md:min-h-[700px] shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Asset Directory</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Comprehensive registry of all physical, IT, and institutional assets across departments
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScannerModal(true)}
                className="gap-1.5 text-xs sm:text-sm font-medium"
              >
                <Camera className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Scan QR</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 text-xs sm:text-sm font-medium"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>

              {canCUD && (
                <Button
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add Asset</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Search & Filters */}
          <div className="px-3 sm:px-5 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <Input
                  placeholder="Search code, item, vendor, room..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-card text-foreground py-1 pr-12 text-xs sm:text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
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
                <SelectTrigger className="h-9 w-[140px] text-xs">
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

              {/* Department / Branch Filter (hidden for HOD / department-scoped staff) */}
              {!["hod", "faculty", "staff", "teacher"].includes(role) && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
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
              )}

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
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

              {/* Stock Allocation Filter */}
              <Select value={stockFilterTab} onValueChange={(val: any) => setStockFilterTab(val)}>
                <SelectTrigger className="h-9 w-[185px] text-xs">
                  <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="buffer">Central Store Buffer Stock</SelectItem>
                  <SelectItem value="in-use">Assigned to Departments</SelectItem>
                </SelectContent>
              </Select>

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="flex-1 overflow-hidden flex flex-col px-3 sm:px-5 pt-0 pb-3">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading inventory assets...
            </div>
          ) : (
            /* GROUPED ASSETS CLEAN TABLE & CARDS VIEW */
            <div className="flex-1 overflow-hidden flex flex-col mb-2">
              {groupedAssets.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed">
                  <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-medium">No asset models found matching your criteria.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto border rounded-xl shadow-2xs bg-white dark:bg-card">
                    <table className="w-full text-base md:text-sm text-left table-auto border-collapse">
                      <thead className="sticky top-0 z-20 border-b text-sm md:text-xs uppercase font-bold tracking-wider bg-slate-50/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-border shadow-2xs backdrop-blur-md">
                        <tr>
                          <th className="py-3.5 px-4 text-left font-bold min-w-[240px]">Asset Model</th>
                          <th className="py-3.5 px-4 font-bold min-w-[210px]">Stock Allocation</th>
                          <th className="py-3.5 px-4 font-bold">Category & Placement</th>
                          <th className="py-3.5 px-4 font-bold text-left min-w-[160px]">Unit & Total Cost</th>
                          <th className="py-3.5 px-4 text-right font-bold w-36">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {groupedAssets.map((group) => {
                          return (
                            <tr
                              key={group.group_id}
                              onClick={() => setSelectedGroupForDetails(group)}
                              className="transition-colors duration-150 text-foreground cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            >
                              {/* Asset Name (Clean - Code range and specs removed from main row) */}
                              <td className="py-3 px-4 align-top">
                                <div className="font-bold text-foreground text-sm leading-snug">
                                  {group.clean_name || group.item_name}
                                </div>
                              </td>

                              {/* Allocated Out of Total (Clean - Only counts) */}
                              <td className="py-3 px-4 align-top">
                                <div className="space-y-1 min-w-[190px]">
                                  <div className="text-xs font-bold text-foreground">
                                    {isHOD
                                      ? `${(group.in_use_deployed || 0) + (group.in_repair || 0)} Allocated`
                                      : `${(group.in_use_deployed || 0) + (group.in_repair || 0)} / ${group.total_units} Allocated`}
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                    {group.in_repair > 0 && (
                                      <span className="font-medium text-amber-600 dark:text-amber-400">
                                        {group.in_repair} in repair
                                      </span>
                                    )}
                                    {group.in_stock_buffer > 0 && (
                                      <span className="font-medium text-purple-700 dark:text-purple-300">
                                        {group.in_stock_buffer} in buffer
                                      </span>
                                    )}
                                    {!isHOD && group.in_use_deployed > 0 && (
                                      <span className="font-medium text-blue-700 dark:text-blue-300">
                                        {group.in_use_deployed} deployed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Category & Location */}
                              <td className="py-3 px-4 align-top">
                                <div className="space-y-1 text-xs">
                                  <span className="font-semibold px-2 py-0.5 rounded bg-muted text-foreground inline-block">
                                    {group.category_name}
                                  </span>
                                  <div className="text-muted-foreground text-[11px] truncate">
                                    {group.location_name}
                                  </div>
                                </div>
                              </td>

                              {/* Unit Price & Total Value (Left Aligned) */}
                              <td className="py-3 px-4 align-top text-left">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-sm text-foreground">
                                    ₹{Number(group.cost_per_unit || 0).toLocaleString("en-IN")}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    ₹{Number(group.total_valuation || 0).toLocaleString("en-IN")} total
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {canCUD && group.in_stock_buffer > 0 && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => setBulkAllocateGroup(group)}
                                      className="h-8 px-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs"
                                      title="Allocate buffer units to department in bulk"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Allocate
                                    </Button>
                                  )}

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedGroupForDetails(group)}
                                    className="h-8 px-2.5 text-xs font-semibold"
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden space-y-3 overflow-y-auto">
                    {groupedAssets.map((group) => {
                      return (
                        <div
                          key={group.group_id}
                          onClick={() => setSelectedGroupForDetails(group)}
                          className="p-4 rounded-xl border bg-white dark:bg-card border-border shadow-2xs space-y-3 cursor-pointer hover:border-purple-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <h4 className="font-bold text-sm text-foreground leading-snug">
                                {group.clean_name || group.item_name}
                              </h4>
                            </div>
                            <span className="text-xs font-bold text-foreground shrink-0">
                              ₹{Number(group.cost_per_unit || 0).toLocaleString("en-IN")}
                            </span>
                          </div>

                          {/* Allocation Metric */}
                          <div className="space-y-1 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                            <div className="font-semibold text-foreground">
                              {isHOD
                                ? `${(group.in_use_deployed || 0) + (group.in_repair || 0)} Allocated`
                                : `${(group.in_use_deployed || 0) + (group.in_repair || 0)} / ${group.total_units} Allocated`}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 flex-wrap gap-1">
                              {group.in_repair > 0 && (
                                <span className="font-medium text-amber-600 dark:text-amber-400">{group.in_repair} In Repair</span>
                              )}
                              {!isHOD && group.in_use_deployed > 0 && (
                                <span className="font-medium text-blue-700 dark:text-blue-300">{group.in_use_deployed} Deployed</span>
                              )}
                              {group.in_stock_buffer > 0 && (
                                <span className="font-medium text-purple-700 dark:text-purple-300">{group.in_stock_buffer} Central Buffer</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                            {canCUD && group.in_stock_buffer > 0 && (
                              <Button
                                size="sm"
                                onClick={() => setBulkAllocateGroup(group)}
                                className="h-8 px-3 text-xs bg-purple-600 text-white font-semibold"
                              >
                                <ArrowRightLeft className="w-3 h-3 mr-1" /> Allocate ({group.in_stock_buffer})
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedGroupForDetails(group)}
                              className="h-8 px-3 text-xs font-semibold"
                            >
                              <Eye className="w-3 h-3 mr-1" /> View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>

        {/* Pagination Bar */}
        {!loading && (totalCount > pageSize || totalPages > 1) && (
          <div className="px-4 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
            <div>
              Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-foreground">
                {Math.min(startIndex + pageSize, totalCount || groupedAssets.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{totalCount || groupedAssets.length}</span> Asset Model(s)
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
      </Card>

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

      {/* Grouped Asset Model & Custody Details Modal */}
      <GroupedAssetDetailsModal
        group={selectedGroupForDetails}
        isOpen={!!selectedGroupForDetails}
        onClose={() => setSelectedGroupForDetails(null)}
        onRefresh={loadItems}
        locations={locations}
        branches={branchList}
        onAllocateBuffer={(sampleItem) => {
          setSelectedGroupForDetails(null);
          setSelectedItem(sampleItem);
        }}
        onViewUnit={(item) => {
          setSelectedGroupForDetails(null);
          setSelectedItem(item);
        }}
        role={role}
      />

      {/* Bulk Buffer Allocation Modal (Direct from Inventory Table) */}
      <BulkBufferAllocationModal
        group={bulkAllocateGroup}
        isOpen={!!bulkAllocateGroup}
        onClose={() => setBulkAllocateGroup(null)}
        onSuccess={() => {
          setBulkAllocateGroup(null);
          loadItems();
        }}
        locations={locations}
        branches={branchList}
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
