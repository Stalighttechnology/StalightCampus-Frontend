import React, { useState, useEffect } from "react";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { Save } from "lucide-react";

export const AppVersionControlCard = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    android_latest_version: "",
    android_minimum_version: "",
    android_store_url: "",
    ios_latest_version: "",
    ios_minimum_version: "",
    ios_store_url: "",
    web_latest_version: "",
    web_minimum_version: "",
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/app-version/`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Failed to fetch app version config", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

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

  const handleSave = async () => {
    // Validate semantic versions
    if (compareVersions(config.android_minimum_version, config.android_latest_version) > 0) {
      return showErrorAlert("Validation Error", "Android Minimum version cannot be greater than Latest version");
    }
    if (compareVersions(config.ios_minimum_version, config.ios_latest_version) > 0) {
      return showErrorAlert("Validation Error", "iOS Minimum version cannot be greater than Latest version");
    }
    if (compareVersions(config.web_minimum_version, config.web_latest_version) > 0) {
      return showErrorAlert("Validation Error", "Web Minimum version cannot be greater than Latest version");
    }

    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/app-version/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        showSuccessAlert("Success", "App version settings saved successfully!");
      } else {
        showErrorAlert("Error", "Failed to save version settings.");
      }
    } catch (error) {
      console.error("Save error", error);
      showErrorAlert("Error", "An unexpected error occurred.");
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading Version Config...</div>;
  }

  return (
    <Card className="mb-8 border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 pb-4 border-b">
        <CardTitle className="text-xl flex items-center justify-between">
          <span>App Version Control</span>
          <Button onClick={handleSave} size="sm" className="gap-2">
            <Save size={16} /> Save Version Settings
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        
        {/* Android */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 text-green-600 dark:text-green-500">ANDROID</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Latest Version</Label>
              <Input name="android_latest_version" value={config.android_latest_version} onChange={handleChange} placeholder="e.g. 1.3.5" />
            </div>
            <div className="space-y-2">
              <Label>Minimum Supported Version</Label>
              <Input name="android_minimum_version" value={config.android_minimum_version} onChange={handleChange} placeholder="e.g. 1.3.5" />
            </div>
            <div className="space-y-2">
              <Label>Google Play URL</Label>
              <Input name="android_store_url" value={config.android_store_url} onChange={handleChange} placeholder="https://play.google.com/..." />
            </div>
          </div>
        </div>

        {/* iOS */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 text-blue-600 dark:text-blue-500">IOS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Latest Version</Label>
              <Input name="ios_latest_version" value={config.ios_latest_version} onChange={handleChange} placeholder="e.g. 1.3.5" />
            </div>
            <div className="space-y-2">
              <Label>Minimum Supported Version</Label>
              <Input name="ios_minimum_version" value={config.ios_minimum_version} onChange={handleChange} placeholder="e.g. 1.3.5" />
            </div>
            <div className="space-y-2">
              <Label>App Store URL</Label>
              <Input name="ios_store_url" value={config.ios_store_url} onChange={handleChange} placeholder="https://apps.apple.com/..." />
            </div>
          </div>
        </div>

        {/* Web */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 text-purple-600 dark:text-purple-500">WEB</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Latest Version</Label>
              <Input name="web_latest_version" value={config.web_latest_version} onChange={handleChange} placeholder="e.g. 1.3.5" />
            </div>
            <div className="space-y-2">
              <Label>Minimum Supported Version</Label>
              <Input name="web_minimum_version" value={config.web_minimum_version} onChange={handleChange} placeholder="e.g. 1.3.5" />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
