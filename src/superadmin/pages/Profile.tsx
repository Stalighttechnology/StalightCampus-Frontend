import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Mail, Bell, Save, CheckCircle, AlertCircle, Loader2, Shield, UserCircle2 } from "lucide-react";
import Swal from "sweetalert2";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ProfileData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  support_notification_email: string;
  updated_at: string;
}

const SuperAdminProfile: React.FC = () => {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    support_notification_email: "",
    updated_at: "",
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    support_notification_email: "",
  });

  useEffect(() => {
    fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/profile/`)
      .then((r) => r.json())
      .then((data: ProfileData) => {
        if (data.username) {
          setProfile(data);
          setForm({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            support_notification_email: data.support_notification_email ?? "",
          });
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.support_notification_email.trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/profile/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          support_notification_email: email,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const updated: ProfileData = {
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          support_notification_email: data.support_notification_email,
          updated_at: data.updated_at,
        };
        setProfile(updated);
        setForm({
          first_name: updated.first_name ?? "",
          last_name: updated.last_name ?? "",
          support_notification_email: updated.support_notification_email ?? "",
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);

        Swal.fire({
          icon: "success",
          title: "Profile Saved",
          html: email
            ? `Ticket alerts will go to <b>${email}</b>`
            : "Ticket email notifications disabled.",
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        setError(data.message || "Failed to save. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Identity card */}
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Shield className="text-primary" size={20} /> Identity Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserCircle2 size={36} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">
                {profile.first_name || "Super"} {profile.last_name || "Admin"}
              </p>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                <Shield size={10} /> Stalight HQ · Super Admin
              </span>
            </div>
          </div>

          {/* Read-only account email */}
          <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-slate-800/40" : "bg-gray-50"}`}>
            <Mail size={15} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Account Email</p>
              <p className="text-sm font-medium truncate">{profile.email}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${dark ? "bg-slate-700 text-zinc-300" : "bg-gray-200 text-gray-500"}`}>
              Read-only
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <form onSubmit={handleSave}>
        <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Edit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Notification email — the key setting */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Bell size={14} className="text-amber-500" />
                Support Ticket Notification Email
              </Label>
              <Input
                type="email"
                value={form.support_notification_email}
                onChange={(e) => setForm((f) => ({ ...f, support_notification_email: e.target.value }))}
                placeholder="e.g. support@stalight.in"
              />
              <p className="text-xs text-muted-foreground">
                An alert email is sent here whenever an organization raises a support ticket.
                Leave blank to disable.
              </p>

              {/* Current saved value display */}
              {profile.support_notification_email && (
                <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg ${dark ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"}`}>
                  <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Currently saved: <strong>{profile.support_notification_email}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Status banners */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
                <CheckCircle size={15} className="shrink-0" /> Profile saved successfully!
              </div>
            )}

            {profile.updated_at && (
              <p className="text-[11px] text-muted-foreground">
                Last updated: {new Date(profile.updated_at).toLocaleString()}
              </p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default SuperAdminProfile;
