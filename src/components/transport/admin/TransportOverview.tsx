import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../../context/ThemeContext";
import { fetchTransportDashboardStats, fetchLiveTracking } from "../../../utils/transport_api";
import { Badge, Stats } from "./TransportCommon";
import DashboardCard from "../../common/DashboardCard";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Bus, Navigation, UserCheck, Users, Activity, AlertTriangle, Radio, RefreshCw } from "lucide-react";

import { SkeletonStatsGrid, SkeletonCard } from "../../ui/skeleton";

const TransportOverview: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveTrips, setLiveTrips] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchTransportDashboardStats();
      if (s.success) setStats(s.stats);
      const live = await fetchLiveTracking();
      if (live.success) setLiveTrips(live.trips || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';

  return (
    <div className="space-y-6">

      {loading ? (
        <div className="space-y-6">
          <SkeletonStatsGrid items={6} columns={3} />
          <SkeletonCard className="w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dashboard Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DashboardCard icon={<Bus size={20} />} title="Total Buses" value={stats?.total_buses} description="Total active transport fleet" />
            <DashboardCard icon={<Navigation size={20} />} title="Active Routes" value={stats?.total_routes} description="Planned transport routes" />
            <DashboardCard icon={<UserCheck size={20} />} title="Enrolled Drivers" value={stats?.total_drivers} description="Active campus drivers" />
            <DashboardCard icon={<Users size={20} />} title="Students Allocated" value={stats?.allocated_students} description="Students using campus bus" />
            <DashboardCard icon={<Activity size={20} />} title="Active Trips" value={stats?.active_trips} description="Trips running currently" />
            <DashboardCard 
              icon={<AlertTriangle size={20} />} 
              title="Pending Complaints" 
              value={stats?.pending_complaints} 
              description="Unresolved incidents" 
              className={stats?.pending_complaints && stats.pending_complaints > 0 ? "ring-2 ring-red-500/50 bg-red-950/20" : ""}
            />
          </div>

          {/* Active Trips Card */}
          <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
            <CardHeader className="pb-3 border-b border-inherit">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Radio size={16} className="text-green-500 animate-pulse" /> Live Trip Status
                </CardTitle>
                {liveTrips.length > 0 && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {liveTrips.length} Active
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {liveTrips.length === 0 ? (
                <p className="text-sm opacity-60 py-6 text-center">No active trips running right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveTrips.map((t: any) => (
                    <div 
                      key={t.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${theme === 'dark' ? 'border-border bg-background/50 hover:bg-background/80' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}
                    >
                      <div>
                        <p className="font-semibold text-sm">{t.route_details?.route_name}</p>
                        <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Bus {t.bus_details?.bus_number} · Driver: {t.driver_details?.first_name}
                        </p>
                      </div>
                      <Badge label={t.trip_type === 'morning' ? 'Morning 🌅' : 'Evening 🌇'} color="running" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TransportOverview;
