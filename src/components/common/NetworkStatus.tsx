import React, { useEffect, useMemo, useState } from "react";
import useNetworkStatus from "@/hooks/useNetworkStatus";

const OfflineCard = ({ onReload }: { onReload: () => void }) => (
  <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50 w-[92%] max-w-md rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl p-8 border border-slate-700/50 animate-slide-up">
    {/* Broken connector illustration */}
    <div className="flex justify-center mb-6">
      <div className="relative w-24 h-24">
        {/* Left plug */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <svg className="w-10 h-10 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="2" width="12" height="6" rx="1" />
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 14h4v6H5z M15 14h4v6h-4z" />
          </svg>
        </div>
        
        {/* Broken line */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <svg className="w-16 h-16 text-red-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path d="M4 12h5M15 12h5" strokeDasharray="2,2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        {/* Right plug */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <svg className="w-10 h-10 text-slate-600 opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="2" width="12" height="6" rx="1" />
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 14h4v6H5z M15 14h4v6h-4z" />
          </svg>
        </div>
      </div>
    </div>

    <div className="text-center mb-6">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent mb-2">Connection Lost</h3>
      <p className="text-sm text-slate-300">We couldn't reach our servers. Check your internet connection.</p>
    </div>

    <div className="flex flex-col gap-3">
      <button 
        onClick={onReload} 
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-red-500/50"
      >
        Reconnect to Campus
      </button>
      <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 text-center">
        Some services may be temporarily unavailable
      </div>
    </div>
  </div>
);

const RestoredToast = ({ message }: { message: string }) => (
  <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50 w-[92%] max-w-md rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl p-8 border border-emerald-500/50 animate-slide-up">
    {/* Connected connector illustration */}
    <div className="flex justify-center mb-6">
      <div className="relative w-24 h-24">
        {/* Left plug */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <svg className="w-10 h-10 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="2" width="12" height="6" rx="1" />
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 14h4v6H5z M15 14h4v6h-4z" />
          </svg>
        </div>
        
        {/* Connected line with animated glow */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <svg className="w-16 h-16 text-emerald-500/30 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 12h5M15 12h5" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg className="w-16 h-16 text-emerald-400 absolute inset-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12h5M15 12h5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </div>

        {/* Right plug */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <svg className="w-10 h-10 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="2" width="12" height="6" rx="1" />
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 14h4v6H5z M15 14h4v6h-4z" />
          </svg>
        </div>
      </div>
    </div>

    <div className="text-center mb-6">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent mb-2">Connection Restored</h3>
      <p className="text-sm text-slate-300">Your network is now active. All services are synchronized.</p>
    </div>

    {/* Progress bar */}
    <div className="h-1 bg-emerald-900/30 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full w-full" style={{ animation: 'shrink 2s ease-in-out forwards' }} />
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
        try { navigator.vibrate?.(200); } catch {}
      }
      setObservedOffline(true);
      prevConnectedRef.current = isConnected;
      return;
    }

    // Transition: offline -> online (show restored only if we previously observed offline)
    if (prev === false && isConnected && observedOffline) {
      setShowRestored(true);
      setObservedOffline(false);
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
        setObservedOffline(false);
        const t = setTimeout(() => setShowRestored(false), 2000);
        // clear after the toast
        setTimeout(() => clearTimeout(t), 2100);
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
