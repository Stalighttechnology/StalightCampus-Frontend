import React, { useState, useEffect } from "react";
import {
  InventoryAnalyticsData,
  fetchInventoryAnalytics,
} from "../../../utils/inventory_api";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  Package,
  IndianRupee,
  Wrench,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Clock,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const InventoryAnalytics: React.FC<Props> = ({ onNavigateTab }) => {
  const [data, setData] = useState<InventoryAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchInventoryAnalytics();
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load inventory analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm font-medium">Aggregating campus asset intelligence...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_items: 0,
    total_valuation: 0,
    in_repair_count: 0,
    scrapped_count: 0,
    active_tickets: 0,
    pending_procurements: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Inventory Analytics & Asset Summary
          </h2>
          <p className="text-xs text-muted-foreground">
            Campus-wide overview of equipment valuation, active status, repair tickets, and requisitions.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Asset Valuation */}
        <Card
          onClick={() => onNavigateTab && onNavigateTab("items")}
          className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-card to-card hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm space-y-2.5 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Asset Valuation
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground">
              ₹{Number(kpis.total_valuation).toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across <strong>{kpis.total_items}</strong> tracked item(s)
            </p>
          </div>
        </Card>

        {/* In-Repair Count */}
        <Card
          onClick={() => onNavigateTab && onNavigateTab("tickets")}
          className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500/40 transition-all cursor-pointer shadow-sm space-y-2.5 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assets In Repair
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600">
              {kpis.in_repair_count}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active service & repair tickets
            </p>
          </div>
        </Card>

        {/* Open Maintenance Tickets */}
        <Card
          onClick={() => onNavigateTab && onNavigateTab("tickets")}
          className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-gradient-to-br from-blue-500/10 via-card to-card hover:border-blue-500/40 transition-all cursor-pointer shadow-sm space-y-2.5 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Open Support Tickets
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-blue-600">
              {kpis.active_tickets}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pending technician resolution
            </p>
          </div>
        </Card>

        {/* Pending Procurements */}
        <Card
          onClick={() => onNavigateTab && onNavigateTab("procurement")}
          className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-gradient-to-br from-purple-500/10 via-card to-card hover:border-purple-500/40 transition-all cursor-pointer shadow-sm space-y-2.5 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pending Requisitions
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-purple-600">
              {kpis.pending_procurements}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Awaiting HOD / Principal sanction
            </p>
          </div>
        </Card>
      </div>

      {/* Middle Grid: Category Breakdown & Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Category Breakdown */}
        <Card className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Top Categories by Valuation
            </h3>
            <span className="text-xs text-muted-foreground">Valuation</span>
          </div>

          <div className="space-y-3">
            {data?.by_category?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No categories recorded.</p>
            ) : (
              data?.by_category?.map((cat) => (
                <div key={cat.category__id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold gap-2 items-start">
                    <span className="text-foreground break-words flex-1 min-w-0" title={`${cat.category__name} (${cat.category__prefix})`}>
                      {cat.category__name} ({cat.category__prefix})
                    </span>
                    <span className="text-emerald-600 font-extrabold shrink-0 text-right">
                      ₹{Number(cat.total_value || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((cat.total_value || 0) / (kpis.total_valuation || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Location Breakdown */}
        <Card className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Asset Distribution by Block
            </h3>
            <span className="text-xs text-muted-foreground">Units</span>
          </div>

          <div className="space-y-3">
            {data?.by_location?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No locations recorded.</p>
            ) : (
              data?.by_location?.map((loc) => (
                <div key={loc.location__id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold gap-2 items-start">
                    <span className="text-foreground break-words flex-1 min-w-0" title={`${loc.location__name} (${loc.location__prefix})`}>
                      {loc.location__name} ({loc.location__prefix})
                    </span>
                    <span className="font-extrabold text-foreground shrink-0 text-right">{loc.count} item(s)</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((loc.count || 0) / (kpis.total_items || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity Audit Trail */}
      <Card className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border bg-card shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-3">
          <Clock className="w-4 h-4 text-primary" /> Recent Asset Mutations & Audit Trail
        </h3>

        <div className="space-y-2.5">
          {data?.recent_activity?.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No recent activity.</p>
          ) : (
            data?.recent_activity?.map((log) => {
              let dateStr = "";
              try {
                dateStr = formatDistanceToNow(parseISO(log.created_at), { addSuffix: true });
              } catch (e) {
                dateStr = log.created_at;
              }

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 bg-muted/20 border rounded-xl text-xs hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      {log.action_type.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className="text-foreground font-medium text-xs break-words">
                      {log.change_reason || "Asset updated"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0 self-start sm:self-auto">
                    by <strong>{log.changed_by_name}</strong> • {dateStr}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
