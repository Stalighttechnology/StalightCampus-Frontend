import { useState, useEffect, useCallback } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { API_ENDPOINT } from "../utils/config";

const STORAGE_KEY = "stalight_update_required";
const STORE_URL_KEY = "stalight_update_store_url";

interface VersionConfig {
  android: { latest_version: string; minimum_supported_version: string; store_url: string };
  ios: { latest_version: string; minimum_supported_version: string; store_url: string };
  web: { latest_version: string; minimum_supported_version: string };
}

const compareVersions = (v1: string, v2: string) => {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

export const useVersionControl = () => {
  // Initialize from sessionStorage so the flag survives component re-mounts
  const [isUpdateRequired, setIsUpdateRequired] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });
  const [storeUrl, setStoreUrl] = useState(() => {
    try { return sessionStorage.getItem(STORE_URL_KEY) || ""; } catch { return ""; }
  });

  const handleVersionConfig = useCallback(async (config: VersionConfig) => {
    try {
      let installedVersion = "1.0.0";
      let minimumVersion = "1.0.0";
      let url = "";

      if (Capacitor.isNativePlatform()) {
        const info = await App.getInfo();
        installedVersion = info.version;
        if (Capacitor.getPlatform() === 'android') {
          minimumVersion = config.android.minimum_supported_version;
          url = config.android.store_url;
        } else if (Capacitor.getPlatform() === 'ios') {
          minimumVersion = config.ios.minimum_supported_version;
          url = config.ios.store_url;
        }
      } else {
        // For web, we assume package version is managed via Vite env var or a global config.
        installedVersion = import.meta.env.VITE_APP_VERSION || (typeof process !== 'undefined' ? process.env?.REACT_APP_VERSION : undefined) || "1.0.0";
        minimumVersion = config.web.minimum_supported_version;
      }

      setStoreUrl(url);
      try { sessionStorage.setItem(STORE_URL_KEY, url); } catch {}

      if (compareVersions(installedVersion, minimumVersion) < 0) {
        setIsUpdateRequired(true);
        try { sessionStorage.setItem(STORAGE_KEY, "true"); } catch {}
      } else {
        setIsUpdateRequired(false);
        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
      }
    } catch (err) {
      console.error("Failed to parse app version config", err);
    }
  }, []);

  useEffect(() => {
    // Shared fetch function with 10-minute cooldown
    const checkVersion = async (force: boolean = false) => {
      // Cooldown check (10 minutes = 600,000 ms)
      const now = Date.now();
      const COOLDOWN_MS = 10 * 60 * 1000;
      const lastCheckStr = sessionStorage.getItem("stalight_version_last_check");
      const lastCheckTime = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;

      if (!force && (now - lastCheckTime) < COOLDOWN_MS) {
        // Use cached config if available
        const cachedConfig = sessionStorage.getItem("stalight_version_config");
        if (cachedConfig) {
          try {
            handleVersionConfig(JSON.parse(cachedConfig));
            return;
          } catch {}
        }
      }

      try {
        const response = await fetch(`${API_ENDPOINT}/public/app-version/`);
        if (response.ok) {
          const config = await response.json();
          sessionStorage.setItem("stalight_version_last_check", String(now));
          sessionStorage.setItem("stalight_version_config", JSON.stringify(config));
          handleVersionConfig(config);
        }
      } catch (err) {
        console.error("Failed to check app version", err);
      }
    };

    // Initial check on mount
    checkVersion(false);

    // Re-check when app returns to foreground (native) with cooldown
    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) checkVersion(false);
      }).then(listener => { appStateListener = listener; });
    }

    // Re-check when browser tab becomes visible (web) with cooldown
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkVersion(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleAppVersionUpdate = (e: any) => {
      if (e.detail) {
        sessionStorage.setItem("stalight_version_config", JSON.stringify(e.detail));
        sessionStorage.setItem("stalight_version_last_check", String(Date.now()));
        handleVersionConfig(e.detail as VersionConfig);
      } else {
        // Force immediate check when triggered externally
        checkVersion(true);
      }
    };

    window.addEventListener('app_version_update', handleAppVersionUpdate);

    return () => {
      window.removeEventListener('app_version_update', handleAppVersionUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (appStateListener) appStateListener.remove();
    };
  }, [handleVersionConfig]);

  return { isUpdateRequired, storeUrl };
};
