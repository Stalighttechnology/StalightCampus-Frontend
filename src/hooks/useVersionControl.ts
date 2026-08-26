import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { API_ENDPOINT } from "../utils/config";

interface VersionConfig {
  android: { latest_version: string; minimum_supported_version: string; store_url: string };
  ios: { latest_version: string; minimum_supported_version: string; store_url: string };
  web: { latest_version: string; minimum_supported_version: string };
}

export const useVersionControl = () => {
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");

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

  const handleVersionConfig = async (config: VersionConfig) => {
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
        // For web, we assume package version is managed via an env var or a global config.
        installedVersion = process.env.REACT_APP_VERSION || import.meta.env.VITE_APP_VERSION || "1.0.0";
        minimumVersion = config.web.minimum_supported_version;
      }

      setStoreUrl(url);

      if (compareVersions(installedVersion, minimumVersion) < 0) {
        setIsUpdateRequired(true);
      } else {
        setIsUpdateRequired(false);
      }
    } catch (err) {
      console.error("Failed to parse app version config", err);
    }
  };

  useEffect(() => {
    const handleAppVersionUpdate = (e: any) => {
      if (e.detail) {
        handleVersionConfig(e.detail as VersionConfig);
      }
    };

    window.addEventListener('app_version_update', handleAppVersionUpdate);

    return () => {
      window.removeEventListener('app_version_update', handleAppVersionUpdate);
    };
  }, []);

  return { isUpdateRequired, storeUrl };
};
