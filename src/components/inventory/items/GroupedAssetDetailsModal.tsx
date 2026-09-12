import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  GroupedInventoryAsset,
  GroupedInventoryDeployment,
  InventoryItem,
  InventoryLocation,
  fetchGroupedAssetDetails,
} from "../../../utils/inventory_api";
import { InventoryStatusBadge } from "../common/InventoryStatusBadge";
import { QRCodePreviewModal } from "../common/QRCodePreviewModal";
import { BulkBufferAllocationModal } from "./BulkBufferAllocationModal";
import { ItemHistoryTimeline } from "./ItemHistoryTimeline";
import {
  Package,
  Building,
  ArrowRightLeft,
  Search,
  Tag,
  ShieldCheck,
  QrCode,
  Calendar,
  Layers,
  UserCheck,
  Info,
  CheckCircle2,
  Boxes,
  FileSpreadsheet,
  IndianRupee,
  Eye,
  ExternalLink,
  History,
  Loader2,
} from "lucide-react";

interface Props {
  group: GroupedInventoryAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onAllocateBuffer?: (sampleItem: InventoryItem) => void;
  onViewUnit?: (item: InventoryItem) => void;
  onRefresh?: () => void;
  locations?: InventoryLocation[];
  branches?: Array<{ id: number; name: string }>;
  role?: string;
}

export const GroupedAssetDetailsModal: React.FC<Props> = ({
  group,
  isOpen,
  onClose,
  onAllocateBuffer,
  onViewUnit,
  onRefresh,
  locations = [],
  branches = [],
  role = "admin",
}) => {
  const [activeTab, setActiveTab] = useState<"ledger" | "transfers" | "units" | "specs">("ledger");
  const [unitSearch, setUnitSearch] = useState("");
  const [unitDeptFilter, setUnitDeptFilter] = useState<string>("all");
  const [qrModalItem, setQrModalItem] = useState<InventoryItem | null>(null);
  const [bulkAllocateOpen, setBulkAllocateOpen] = useState(false);
  const [bulkAllocateInitialQty, setBulkAllocateInitialQty] = useState<number | undefined>(undefined);

  const [detailData, setDetailData] = useState<GroupedInventoryAsset | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isOpen || !group) {
      setDetailData(null);
      return;
    }

    let isMounted = true;
    setLoadingDetail(true);

    fetchGroupedAssetDetails({
      item_name: group.item_name,
      category_id: group.category_id,
      sample_item_id: group.sample_item_id || group.sample_item?.id,
    })
      .then((res) => {
        if (isMounted && res) {
          setDetailData(res);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch detailed asset breakdown", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingDetail(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, group?.group_id, group?.item_name, group?.category_id]);

  if (!group) return null;

  const activeGroup = detailData || group;
  const canCUD = role === "inventory_manager" || role === "superadmin";

  const groupItems = activeGroup.items || [];
  const groupDeployments = activeGroup.deployments || [];
  const groupHistoryLogs = activeGroup.history_logs || [];

  const filteredUnits = groupItems.filter((it) => {
    const matchesSearch =
      unitSearch.trim() === "" ||
      it.item_code.toLowerCase().includes(unitSearch.toLowerCase()) ||
      (it.received_by && it.received_by.toLowerCase().includes(unitSearch.toLowerCase())) ||
      (it.branch_name && it.branch_name.toLowerCase().includes(unitSearch.toLowerCase())) ||
      (it.room_no && it.room_no.toLowerCase().includes(unitSearch.toLowerCase()));

    const isBuffer = !it.branch_id && it.status === "available";
    const matchesDept =
      unitDeptFilter === "all" ||
      (unitDeptFilter === "buffer" && isBuffer) ||
      (unitDeptFilter === "deployed" && !isBuffer) ||
      (it.branch_name && it.branch_name === unitDeptFilter);

    return matchesSearch && matchesDept;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground shadow-2xl border border-border">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 border-b bg-slate-50/80 dark:bg-slate-900/60 shrink-0 pr-12 sm:pr-14">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {activeGroup.code_range && activeGroup.code_range !== "--" && (
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {activeGroup.code_range}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                    {activeGroup.category_name} ({activeGroup.category_prefix})
                  </span>
                  {activeGroup.in_stock_buffer > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {activeGroup.in_stock_buffer} in Central Buffer
                    </span>
                  )}
                </div>

                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-snug pt-1">
                  {activeGroup.item_name}
                </DialogTitle>

                {activeGroup.specifications && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1" title={activeGroup.specifications}>
                    {activeGroup.specifications}
                  </p>
                )}
              </div>

              {/* Quick Buffer Allocate button in header */}
              {canCUD && activeGroup.in_stock_buffer > 0 && (
                <Button
                  onClick={() => {
                    setBulkAllocateInitialQty(activeGroup.in_stock_buffer);
                    setBulkAllocateOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 px-4 shrink-0 shadow-sm mr-1 sm:mr-2"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                  Allocate Buffer Stock ({activeGroup.in_stock_buffer})
                </Button>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
              <div className="p-2.5 rounded-lg bg-background border border-border/60">
                <span className="text-[11px] text-muted-foreground block font-medium">Total Registered</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-base font-bold text-foreground">{activeGroup.total_units}</strong>
                  <span className="text-[11px] text-muted-foreground">units</span>
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
                  ₹{Number(activeGroup.total_valuation || 0).toLocaleString("en-IN")} total lot
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-medium flex items-center gap-1">
                  <Building className="w-3 h-3" /> Allocated & In Use
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-base font-bold text-blue-900 dark:text-blue-100">
                    {activeGroup.in_use_deployed}
                  </strong>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300">deployed</span>
                </div>
                <div className="text-[10.5px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                  Active department custody
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50">
                <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-medium flex items-center gap-1">
                  <Package className="w-3 h-3" /> Central Buffer Stock
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-base font-bold text-purple-900 dark:text-purple-100">
                    {activeGroup.in_stock_buffer}
                  </strong>
                  <span className="text-[11px] text-purple-700 dark:text-purple-300">available</span>
                </div>
                <div className="text-[10.5px] text-purple-600 dark:text-purple-400 mt-0.5 font-medium">
                  Ready for handover
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block font-medium">Unit Price</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                    ₹{Number(activeGroup.cost_per_unit || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
                <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                  Vendor: {activeGroup.vendor_name || "--"}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="px-5 pt-3 border-b bg-background shrink-0">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4 max-w-2xl h-9 p-0.5">
                <TabsTrigger value="ledger" className="text-xs font-semibold gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Allocation & Custody</span>
                </TabsTrigger>
                <TabsTrigger value="transfers" className="text-xs font-semibold gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                  <span>Transfer History ({groupHistoryLogs.length})</span>
                </TabsTrigger>
                <TabsTrigger value="units" className="text-xs font-semibold gap-1.5">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>All Units ({groupItems.length || activeGroup.total_units})</span>
                </TabsTrigger>
                <TabsTrigger value="specs" className="text-xs font-semibold gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Specifications</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5">
            {loadingDetail && !detailData ? (
              <div className="py-16 text-center space-y-3 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">
                  Loading detailed allocation ledger and transfer audit logs...
                </p>
              </div>
            ) : (
              <>
                {activeTab === "ledger" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Custody & Allocation Ledger
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Complete record of who received what quantity, recipient roles, and handover details.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        {groupDeployments.length} Allocation Record{groupDeployments.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {groupDeployments.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 border rounded-xl">
                          No allocation records found.
                        </div>
                      ) : (
                        groupDeployments.map((dep, idx) => {
                          const isBufferBay = !dep.branch_id;
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border transition-all ${
                                isBufferBay
                                  ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60"
                                  : "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/50">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`p-2.5 rounded-lg shrink-0 ${
                                      isBufferBay
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                    }`}
                                  >
                                    {isBufferBay ? (
                                      <Package className="w-5 h-5" />
                                    ) : (
                                      <Building className="w-5 h-5" />
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-bold text-foreground">
                                        {dep.department}
                                      </h5>
                                      <span
                                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                          isBufferBay
                                            ? "bg-purple-200/70 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200"
                                            : "bg-blue-200/70 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200"
                                        }`}
                                      >
                                        {dep.count} Unit{dep.count === 1 ? "" : "s"}
                                      </span>
                                    </div>

                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                      <span>
                                        <strong>Placement:</strong> {dep.location_name || activeGroup.location_name}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        <strong>Room(s):</strong> {dep.rooms_display || dep.room || (isBufferBay ? "Buffer Bay" : "Dept Lab")}
                                      </span>
                                      {dep.allocated_date && (
                                        <>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(dep.allocated_date).toLocaleDateString("en-IN", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Action Button */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {isBufferBay && canCUD ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setBulkAllocateInitialQty(activeGroup.in_stock_buffer);
                                        setBulkAllocateOpen(true);
                                      }}
                                      className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Allocate to Dept
                                    </Button>
                                  ) : (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-background border border-border text-foreground">
                                      <InventoryStatusBadge status={dep.status} />
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Recipient & Handover Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                                <div className="p-2 rounded-lg bg-background/80 border border-border/60">
                                  <span className="text-[10.5px] text-muted-foreground block font-medium">
                                    Received By / Custodian:
                                  </span>
                                  <div className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                                    <span>{dep.received_by || (isBufferBay ? "Central Store Staff" : "Department Custodian")}</span>
                                  </div>
                                  {dep.recipient_role && (
                                    <span className="text-[10.5px] text-muted-foreground block mt-0.5">
                                      Role: {dep.recipient_role}
                                    </span>
                                  )}
                                </div>

                                <div className="p-2 rounded-lg bg-background/80 border border-border/60">
                                  <span className="text-[10.5px] text-muted-foreground block font-medium">
                                    Handed Over By:
                                  </span>
                                  <div className="font-bold text-foreground mt-0.5">
                                    {dep.handed_over_by || "Inventory Manager"}
                                  </div>
                                  <span className="text-[10.5px] text-muted-foreground block mt-0.5">
                                    Allocation Verified & Logged
                                  </span>
                                </div>

                                <div className="p-2 rounded-lg bg-background/80 border border-border/60">
                                  <span className="text-[10.5px] text-muted-foreground block font-medium">
                                    Assigned Serial Codes ({dep.unit_codes.length}):
                                  </span>
                                  <div className="font-mono font-bold text-primary mt-0.5 truncate" title={dep.code_range}>
                                    {dep.code_range || dep.unit_codes.slice(0, 3).join(", ") + "..."}
                                  </div>
                                  <span className="text-[10.5px] text-muted-foreground block mt-0.5">
                                    {dep.count} physical asset unit(s)
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "transfers" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Transfer & Movement Audit Logs
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Chronological history of buffer allocations, department transfers, custody handovers, and location changes.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        {groupHistoryLogs.length} Event{groupHistoryLogs.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="bg-background rounded-xl p-4 border border-border/80 shadow-2xs">
                      <ItemHistoryTimeline history={groupHistoryLogs} />
                    </div>
                  </div>
                )}

                {activeTab === "units" && (
                  <div className="space-y-3">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search serial code, custodian, room..."
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          className="pl-8 text-xs h-8"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setUnitDeptFilter("all")}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all shrink-0 ${
                            unitDeptFilter === "all"
                              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          All ({groupItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitDeptFilter("buffer")}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all shrink-0 ${
                            unitDeptFilter === "buffer"
                              ? "bg-purple-600 text-white"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                          }`}
                        >
                          Buffer Bay ({activeGroup.in_stock_buffer})
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitDeptFilter("deployed")}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all shrink-0 ${
                            unitDeptFilter === "deployed"
                              ? "bg-blue-600 text-white"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          }`}
                        >
                          Deployed ({activeGroup.in_use_deployed})
                        </button>
                      </div>
                    </div>

                    {/* Units Table */}
                    <div className="border rounded-lg overflow-x-auto bg-background shadow-2xs">
                      <table className="w-full text-xs text-left">
                        <thead className="border-b bg-muted/50 text-muted-foreground font-bold uppercase text-[10.5px]">
                          <tr>
                            <th className="py-2.5 px-3">Serial Code</th>
                            <th className="py-2.5 px-3">Placement / Bay</th>
                            <th className="py-2.5 px-3">Room</th>
                            <th className="py-2.5 px-3">Custodian / Recipient</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredUnits.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                No units matching criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredUnits.map((it) => {
                              const isBuffer = !it.branch_id && it.status === "available";
                              const fullItem: InventoryItem = {
                                ...activeGroup.sample_item,
                                ...it,
                                category_details: activeGroup.sample_item?.category_details,
                                location_details: activeGroup.sample_item?.location_details,
                              } as InventoryItem;

                              return (
                                <tr
                                  key={it.id}
                                  className="hover:bg-muted/40 transition-colors"
                                >
                                  <td className="py-2 px-3 font-mono font-bold text-primary">
                                    {it.item_code}
                                  </td>
                                  <td className="py-2 px-3 font-medium">
                                    {it.branch_name ? (
                                      <span className="text-foreground font-semibold flex items-center gap-1">
                                        <Building className="w-3 h-3 text-blue-600" />
                                        {it.branch_name}
                                      </span>
                                    ) : (
                                      <span className="text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                                        <Package className="w-3 h-3" /> Central Buffer
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground">
                                    {it.room_no || (isBuffer ? "Buffer Bay" : "--")}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-medium text-foreground">
                                      {it.received_by || (isBuffer ? "Central Store" : "--")}
                                    </span>
                                    {it.recipient_role && (
                                      <span className="text-[10px] text-muted-foreground block">
                                        {it.recipient_role}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <InventoryStatusBadge status={it.status} />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setQrModalItem(fullItem)}
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        title="View QR Code"
                                      >
                                        <QrCode className="w-3.5 h-3.5" />
                                      </Button>
                                      {canCUD && isBuffer ? (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => {
                                            setBulkAllocateInitialQty(1);
                                            setBulkAllocateOpen(true);
                                          }}
                                          className="h-7 px-2 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                          <ArrowRightLeft className="w-3 h-3 mr-1" /> Allocate
                                        </Button>
                                      ) : (
                                        onViewUnit && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onViewUnit(fullItem)}
                                            className="h-7 px-2 text-[11px]"
                                          >
                                            <Eye className="w-3 h-3 mr-1" /> Details
                                          </Button>
                                        )
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "specs" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Hardware & Technical Specifications
                      </h4>
                      <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground bg-background p-3 rounded-lg border border-border/60">
                        {activeGroup.specifications || "No specifications recorded for this asset model."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
                        <span className="font-bold text-foreground block">Procurement & Sourcing</span>
                        <div className="space-y-1 text-muted-foreground">
                          <div>
                            <strong>Vendor:</strong> {activeGroup.vendor_name || "--"}
                          </div>
                          <div>
                            <strong>Unit Acquisition Cost:</strong> ₹
                            {Number(activeGroup.cost_per_unit || 0).toLocaleString("en-IN")}
                          </div>
                          <div>
                            <strong>Total Lot Valuation:</strong> ₹
                            {Number(activeGroup.total_valuation || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
                        <span className="font-bold text-foreground block">Campus Placement & Category</span>
                        <div className="space-y-1 text-muted-foreground">
                          <div>
                            <strong>Category:</strong> {activeGroup.category_name} ({activeGroup.category_prefix})
                          </div>
                          <div>
                            <strong>Primary Location:</strong> {activeGroup.location_name}
                          </div>
                          <div>
                            <strong>Total Quantity:</strong> {activeGroup.total_units} unit(s)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Buffer Allocation Modal */}
      <BulkBufferAllocationModal
        group={activeGroup}
        isOpen={bulkAllocateOpen}
        onClose={() => setBulkAllocateOpen(false)}
        onSuccess={() => {
          setBulkAllocateOpen(false);
          onRefresh?.();
          onClose();
        }}
        locations={locations}
        branches={branches}
        initialQuantity={bulkAllocateInitialQty}
      />

      {/* QR Preview Modal if requested */}
      {qrModalItem && (
        <QRCodePreviewModal
          item={qrModalItem}
          isOpen={!!qrModalItem}
          onClose={() => setQrModalItem(null)}
        />
      )}
    </>
  );
};
