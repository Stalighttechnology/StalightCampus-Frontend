import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";
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
  Boxes,
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
    fetchInventoryCategories().then((c) => setCategories(c || [])).catch(console.error);
    fetchInventoryLocations().then((l) => setLocations(l || [])).catch(console.error);
  }, []);

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
  const isPrincipal = role === "principal";
  const isAdmin = ["admin", "org_admin", "dean", "superadmin"].includes(role);

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Institutional Inventory & Asset Hub
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-tenant asset tracking, QR audit verification, procurement sanctions, and maintenance lifecycle.
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-muted/50 p-1 text-muted-foreground border">
            {!isStaff && (
              <TabsTrigger value="analytics" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Overview
              </TabsTrigger>
            )}

            <TabsTrigger value="items" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
              <Package className="w-3.5 h-3.5" /> {isHOD ? "Department Assets" : "Assets Directory"}
            </TabsTrigger>

            <TabsTrigger value="procurement" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" /> Requisitions
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger value="quotations" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Vendor RFQs
              </TabsTrigger>
            )}

            <TabsTrigger value="tickets" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Maintenance & Tickets
            </TabsTrigger>

            {isAdmin && (
              <>
                <TabsTrigger value="categories" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Categories
                </TabsTrigger>
                <TabsTrigger value="locations" className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Locations
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Tab Contents */}
        {!isStaff && (
          <TabsContent value="analytics" className="space-y-6 focus:outline-none">
            <InventoryAnalytics onNavigateTab={(tab) => setActiveTab(tab)} />
          </TabsContent>
        )}

        <TabsContent value="items" className="space-y-6 focus:outline-none">
          <InventoryList
            role={role}
            onRaiseTicket={handleRaiseTicket}
            branches={branchList}
            categories={categories}
            locations={locations}
          />
        </TabsContent>

        <TabsContent value="procurement" className="space-y-6 focus:outline-none">
          <ProcurementRequests
            role={role}
            branches={branchList}
            categories={categories}
            locations={locations}
            onStockInSuccess={() => setActiveTab("items")}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="quotations" className="space-y-6 focus:outline-none">
            <QuotationManager role={role} />
          </TabsContent>
        )}

        <TabsContent value="tickets" className="space-y-6 focus:outline-none">
          <MaintenanceTickets
            role={role}
            branches={branchList}
            users={users}
          />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="categories" className="space-y-6 focus:outline-none">
              <CategoryManagement role={role} />
            </TabsContent>

            <TabsContent value="locations" className="space-y-6 focus:outline-none">
              <LocationManagement role={role} />
            </TabsContent>
          </>
        )}
      </Tabs>

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
