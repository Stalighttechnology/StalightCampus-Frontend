import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { fetchLiveTracking } from "../../../utils/transport_api";
import { Badge } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { SkeletonCard } from "../../ui/skeleton";
import { Radio, Bus, RefreshCw, MapPin } from "lucide-react";

const TransportTracking: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [liveTrips, setLiveTrips] = useState<any[]>([]);

  const loadLiveTrips = useCallback(async () => {
    setLoading(true);
    try {
      const live = await fetchLiveTracking();
      if (live.success) setLiveTrips(live.trips || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveTrips();
  }, [loadLiveTrips]);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';

  return (
    <div id="transport-tracking-header" className="space-y-6">

      <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <CardHeader className="pb-3 border-b border-inherit">
          <CardTitle id="transport-tracking-title-row" className="text-lg font-semibold flex items-center gap-2">
            <Bus className="text-primary" /> Running Fleet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <SkeletonCard className="w-full h-80" />
          ) : liveTrips.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <Bus size={32} className="opacity-80" />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Active Trips Running</h3>
              <p className="max-w-md text-xs leading-relaxed opacity-80">
                No buses are currently running active trips on campus routes. Location updates will appear live when transit begins.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {liveTrips.map((t: any) => (
                <div key={t.id} className={`p-5 rounded-2xl border transition-all duration-200 ${theme === 'dark' ? 'border-border bg-background/50' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border">
                    <div>
                      <p className="font-bold text-base text-primary">{t.route_details?.route_name}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Bus No: <b>{t.bus_details?.bus_number}</b> · Driver: <b>{t.driver_details?.first_name} {t.driver_details?.last_name}</b>
                      </p>
                    </div>
                    <Badge label={t.trip_type === 'morning' ? 'Morning 🌅' : 'Evening 🌇'} color="running" />
                  </div>
                  {t.current_latitude && (
                    <div className="mt-4 border rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-primary/5 p-3 border-b border-gray-100 dark:border-border flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5 text-primary">
                          <MapPin size={14} className="animate-bounce" /> Live GPS Coordinates: {t.current_latitude}, {t.current_longitude}
                        </div>
                        <span className="opacity-75">Last ping: {new Date(t.last_updated).toLocaleTimeString()}</span>
                      </div>
                      <iframe
                        title={`Live Map - Bus ${t.bus_details?.bus_number}`}
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${t.current_latitude},${t.current_longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportTracking;
