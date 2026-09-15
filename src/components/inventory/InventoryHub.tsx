import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { InventoryAnalytics } from "./dashboard/InventoryAnalytics";
import { InventoryList } from "./items/InventoryList";
import { ProcurementRequests } from "./procurement/ProcurementRequests";
import { QuotationManager } from "./procurement/QuotationManager";
import { MaintenanceTickets } from "./tickets/MaintenanceTickets";
import { CategoryManagement } from "./settings/CategoryManagement";
import { LocationManagement } from "./settings/LocationManagement";
import { RaiseTicketModal } from "./tickets/RaiseTicketModal";
import {
  InventoryItem,
  InventoryCategory,
  InventoryLocation,
  fetchInventoryCategories,
  fetchInventoryLocations,
} from "../../utils/inventory_api";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  FileText,
  Wrench,
  Layers,
  MapPin,
} from "lucide-react";

interface Props {
  role?: string;
  defaultTab?: string;
  branches?: Array<{ id: number; name: string }>;
  users?: Array<{ id: number; name: string }>;
}

export const InventoryHub: React.FC<Props> = ({
  role = "admin",
  defaultTab,
  branches = [],
  users = [],
}) => {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || (["faculty", "staff"].includes(role) ? "items" : "analytics")
  );
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [preselectedTicketItem, setPreselectedTicketItem] = useState<InventoryItem | null>(null);
  const [showRaiseTicketModal, setShowRaiseTicketModal] = useState(false);

  useEffect(() => {
    if (activeTab === "items") {
      if (categories.length === 0) fetchInventoryCategories().then((c) => setCategories(c || [])).catch(console.error);
      if (locations.length === 0) fetchInventoryLocations().then((l) => setLocations(l || [])).catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchList(branches);
    }
  }, [branches]);

  const handleRaiseTicket = (item: InventoryItem) => {
    setPreselectedTicketItem(item);
    setShowRaiseTicketModal(true);
  };

  const isStaff = ["faculty", "staff"].includes(role);
  const isHOD = role === "hod";
  const isAdmin = ["admin", "org_admin", "dean", "superadmin", "principal"].includes(role);

  const tabs = [
    ...(!isStaff ? [{ id: "analytics", label: "Overview", icon: <TrendingUp className="w-4 h-4" /> }] : []),
    { id: "items", label: isHOD ? "Department Assets" : "Assets Directory", icon: <Package className="w-4 h-4" /> },
    { id: "procurement", label: "Requisitions", icon: <ShoppingCart className="w-4 h-4" /> },
    ...(isAdmin ? [{ id: "quotations", label: "Vendor RFQs", icon: <FileText className="w-4 h-4" /> }] : []),
    { id: "tickets", label: "Maintenance & Tickets", icon: <Wrench className="w-4 h-4" /> },
    ...(isAdmin
      ? [
          { id: "categories", label: "Categories", icon: <Layers className="w-4 h-4" /> },
          { id: "locations", label: "Locations", icon: <MapPin className="w-4 h-4" /> },
        ]
      : []),
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-border/50 p-3.5 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-2xl font-semibold mb-1">
                Institutional Inventory & Asset Hub
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Multi-tenant asset tracking, QR audit verification, procurement sanctions, and maintenance lifecycle.
              </CardDescription>
            </div>
          </div>

          {/* Underline Tabs Header */}
          <div className="flex border-b gap-4 sm:gap-6 overflow-x-auto dark:border-slate-800 pt-3 sm:pt-4 -mb-3.5 sm:-mb-5 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 shrink-0 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {activeTab === "analytics" && !isStaff && (
            <InventoryAnalytics onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === "items" && (
            <InventoryList
              role={role}
              onRaiseTicket={handleRaiseTicket}
              branches={branchList}
              categories={categories}
              locations={locations}
            />
          )}

          {activeTab === "procurement" && (
            <ProcurementRequests
              role={role}
              branches={branchList}
              categories={categories}
              locations={locations}
              onStockInSuccess={() => setActiveTab("items")}
            />
          )}

          {activeTab === "quotations" && isAdmin && (
            <QuotationManager role={role} />
          )}

          {activeTab === "tickets" && (
            <MaintenanceTickets
              role={role}
              branches={branchList}
              users={users}
            />
          )}

          {activeTab === "categories" && isAdmin && (
            <CategoryManagement role={role} />
          )}

          {activeTab === "locations" && isAdmin && (
            <LocationManagement role={role} />
          )}
        </CardContent>
      </Card>

      {/* Standalone Raise Ticket Modal from Action Buttons */}
      <RaiseTicketModal
        isOpen={showRaiseTicketModal}
        onClose={() => {
          setShowRaiseTicketModal(false);
          setPreselectedTicketItem(null);
        }}
        preselectedItem={preselectedTicketItem}
        onSuccess={() => setActiveTab("tickets")}
        branches={branchList}
      />
    </div>
  );
};
