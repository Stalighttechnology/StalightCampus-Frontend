import { useEffect, useRef, useState } from "react";

// Configuration
const PREFER_GOOGLE = true; // if true, ping Google first (fetch + image fallback)
const GOOGLE_FETCH_URL = "https://www.gstatic.com/generate_204";
const GOOGLE_IMAGE = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png";

const PING_URLS = [
  "/api/health/", // backend health endpoint (fallback)
  "/favicon.ico",
];

const POLL_INTERVAL = 20000; // 20s
const TIMEOUT = 5000;
const FAILURE_THRESHOLD = 1; // mark offline on single failure for Google-first checks

async function imageProbe(url: string, timeout = TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      img.src = "";
      resolve(false);
    }, timeout);

    img.onload = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(false);
    };

    // add cache buster
    img.src = `${url}?_=${Date.now()}`;
  });
}

async function probeInternet(timeout = TIMEOUT): Promise<boolean> {
  // If user asked specifically for Google-only checks, try that first.
  if (PREFER_GOOGLE) {
    // Try fetch first (may be blocked by CSP), treat a successful fetch (no exception) as success.
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      // Use no-cors to avoid CORS preflight; response will be opaque but fetch success indicates reachability.
      await fetch(GOOGLE_FETCH_URL, { method: "GET", cache: "no-store", mode: "no-cors", signal: controller.signal });
      clearTimeout(id);
      if (import.meta.env?.DEV) console.debug("useNetworkStatus google fetch success");
      return true;
    } catch (err) {
      if (import.meta.env?.DEV) console.debug("useNetworkStatus google fetch failed ->", err?.message || err);
      // If CSP blocked fetch or fetch failed, try image ping which is less likely to be blocked by connect-src
      try {
        const ok = await imageProbe(GOOGLE_IMAGE, timeout);
        if (import.meta.env?.DEV) console.debug("useNetworkStatus google image probe ->", ok);
        return ok;
      } catch (e) {
        if (import.meta.env?.DEV) console.debug("useNetworkStatus google image probe error ->", e?.message || e);
        // fallthrough to other probes
      }
    }
  }

  // Try same-origin endpoints as fallback
  for (const url of PING_URLS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { method: "GET", cache: "no-store", credentials: "same-origin", signal: controller.signal });
      clearTimeout(id);
      if (res && (res.ok || res.status === 0)) {
        if (import.meta.env?.DEV) console.debug("useNetworkStatus probe success ->", url, res.status);
        return true;
      }
      if (import.meta.env?.DEV) console.debug("useNetworkStatus probe not ok ->", url, res.status);
    } catch (err) {
      clearTimeout(id);
      if (import.meta.env?.DEV) console.debug("useNetworkStatus probe error ->", url, err?.message || err);
    }
  }

  return false;
}

export function useNetworkStatus() {
  const [isNavigatorOnline, setIsNavigatorOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isReachable, setIsReachable] = useState<boolean>(true);
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const failureCountRef = useRef(0);
  const successCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function runProbe() {
      let ok = await probeInternet();
      
      // If it fails, do a quick retry (useful when app just wakes up/reopens)
      if (!ok && mounted) {
        await new Promise(r => setTimeout(r, 1500));
        if (!mounted) return;
        ok = await probeInternet();
      }

      if (!mounted) return;
      if (import.meta.env?.DEV) console.debug("useNetworkStatus probe ->", ok);

      if (ok) {
        // reset failure counter and mark reachable
        failureCountRef.current = 0;
        successCountRef.current += 1;
        if (!isReachable) {
          // only update if previously unreachable
          setIsReachable(true);
          setLastChangedAt(Date.now());
        }
      } else {
        failureCountRef.current += 1;
        // only mark unreachable after threshold
        if (failureCountRef.current >= FAILURE_THRESHOLD) {
          if (isReachable) {
            setIsReachable(false);
            setLastChangedAt(Date.now());
          }
        }
      }
    }

    // Initial check
    runProbe();

    function handleOnline() {
      setIsNavigatorOnline(true);
      // when browser says online, do an actual probe
      runProbe();
    }

    function handleOffline() {
      setIsNavigatorOnline(false);
      setIsReachable(false);
      setLastChangedAt(Date.now());
    }

    function handleFocusOrVisibility() {
      // Trigger a probe when user focuses or returns to the app
      runProbe();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    // Start polling
    pollRef.current = window.setInterval(runProbe, POLL_INTERVAL);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const isConnected = isNavigatorOnline && isReachable;

  return { isNavigatorOnline, isReachable, isConnected, lastChangedAt } as const;
}

export default useNetworkStatus;
