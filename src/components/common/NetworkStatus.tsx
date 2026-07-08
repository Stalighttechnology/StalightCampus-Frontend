import React, { useEffect, useState } from "react";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

const OfflineCard = ({ onReload }: { onReload: () => void }) => (
  <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50 w-[92%] max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 border border-slate-200 dark:border-slate-800 animate-slide-up flex flex-col items-center">
    <div className="relative mb-5 mt-2">
      <div className="absolute -inset-2 bg-red-100 dark:bg-red-500/20 rounded-full animate-pulse" />
      <div className="relative flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full text-red-500">
        <WifiOff className="w-8 h-8" />
      </div>
    </div>
    <div className="text-center mb-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Campus Disconnected</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Unable to reach the campus servers. Please check your internet connection.</p>
    </div>
    <button
      onClick={onReload}
      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
    >

      Reconnect to Campus
    </button>
  </div>
);

const RestoredToast = ({ message }: { message: string }) => (
  <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50 w-[92%] max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 border border-emerald-200 dark:border-emerald-900/30 animate-slide-up flex flex-col items-center overflow-hidden">
    <div className="relative mb-5 mt-2">
      <div className="absolute -inset-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full" />
      <div className="relative flex items-center justify-center w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full text-emerald-500">
        <Wifi className="w-8 h-8" />
      </div>
    </div>
    <div className="text-center mb-3">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Campus Connected</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Connection restored. Synchronizing your campus data.</p>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-100 dark:bg-emerald-900/30">
      <div className="h-full bg-emerald-500 rounded-r-full" style={{ width: '100%', animation: 'shrink 2s linear forwards' }} />
    </div>
  </div>
);

const NetworkStatus: React.FC = () => {
  const { isNavigatorOnline, isReachable, isConnected, lastChangedAt } = useNetworkStatus();
  const [showRestored, setShowRestored] = useState(false);
  const prevConnectedRef = React.useRef<boolean | null>(null);
  const [observedOffline, setObservedOffline] = useState(false);
  const [forceConnected, setForceConnected] = useState(false);

  useEffect(() => {
    const prev = prevConnectedRef.current;

    // first mount: initialize prev state but do not show restored toast
    if (prev === null) {
      prevConnectedRef.current = isConnected;
      return;
    }

    // Transition: online -> offline
    if (prev && !isConnected) {
      setForceConnected(false); // reset manual override on real offline
      // vibrate once if supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(200); } catch { }
      }
      setObservedOffline(true);
      prevConnectedRef.current = isConnected;
      return;
    }

    // Transition: offline -> online
    if (prev === false && isConnected) {
      setShowRestored(true);
      const t = setTimeout(() => setShowRestored(false), 2000);
      prevConnectedRef.current = isConnected;
      return () => clearTimeout(t);
    }

    prevConnectedRef.current = isConnected;
  }, [isConnected, lastChangedAt]);

  const showOffline = !isConnected && !forceConnected;
  const onReload = () => window.location.reload();

  // Quick image ping to Google — returns true on load, false on error/timeout
  const googleImageProbe = (timeout = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        img.src = "";
        resolve(false);
      }, timeout);

      img.onload = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(false);
      };

      img.src = `https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png?_=${Date.now()}`;
    });
  };

  // Replace reload: attempt quick probe and show restored toast if successful
  const handleCheckConnection = async () => {
    try {
      const ok = await googleImageProbe(3000);
      console.debug("NetworkStatus: manual probe ->", ok);
      if (ok) {
        setForceConnected(true); // hide red card
        // Hide offline UI and show restored toast
        setShowRestored(true);
        const t = setTimeout(() => setShowRestored(false), 2000);
      } else {
        // fallback to page reload
        window.location.reload();
      }
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <>
      {showOffline && (
        <div className="transition-all duration-300">
          <OfflineCard onReload={handleCheckConnection} />
        </div>
      )}
      {showRestored && (
        <div className="transition-all duration-300">
          <RestoredToast message="Internet connection successfully restored. Synchronizing latest data..." />
        </div>
      )}
    </>
  );
};

export default NetworkStatus;
