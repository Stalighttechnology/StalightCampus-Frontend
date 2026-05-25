import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Mail, Bell, Save, CheckCircle, AlertCircle, Loader2, Shield, UserCircle2 } from "lucide-react";
import Swal from "sweetalert2";

const API_BASE = "/api/superadmin";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("superadmin_token")}`,
  "Content-Type": "application/json",
});

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

  // Single source of truth — synced from GET on mount and PUT on save
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    support_notification_email: "",
    updated_at: "",
  });

  // Local editable fields (mirrors profile, but user can type without affecting display)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    support_notification_email: "",
  });

  // Fetch once on mount
  useEffect(() => {
    fetch(`${API_BASE}/profile/`, { headers: authHeaders() })
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
      const res = await fetch(`${API_BASE}/profile/`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          support_notification_email: email,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // ✅ Update ALL state from the PUT response — zero extra GET needed
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

  // ── Styles ──────────────────────────────────────────────────────────────
  const card = dark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200 text-gray-900";
  const input = dark
    ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-violet-500"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500";
  const label = dark ? "text-zinc-400" : "text-gray-600";

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${dark ? "text-white" : "text-gray-900"}`}>
          <Shield className="text-violet-500" size={24} /> Super Admin Profile
        </h1>
        <p className={`text-sm mt-1 ${dark ? "text-zinc-400" : "text-gray-500"}`}>
          Manage display name and notification settings.
        </p>
      </div>

      {/* Identity card */}
      <div className={`rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
            <UserCircle2 size={36} className="text-violet-500" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">
              {profile.first_name || "Super"} {profile.last_name || "Admin"}
            </p>
            <p className={`text-sm ${dark ? "text-zinc-400" : "text-gray-500"}`}>@{profile.username}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-500 border border-violet-500/20">
              <Shield size={10} /> Stalight HQ · Super Admin
            </span>
          </div>
        </div>

        {/* Read-only account email */}
        <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "bg-zinc-800/60" : "bg-gray-50"}`}>
          <Mail size={15} className="text-violet-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-semibold ${label}`}>Account Email</p>
            <p className="text-sm font-medium truncate">{profile.email}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${dark ? "bg-zinc-700 text-zinc-300" : "bg-gray-200 text-gray-500"}`}>
            Read-only
          </span>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className={`rounded-2xl border p-6 space-y-5 ${card}`}>
        <h2 className="font-bold text-sm uppercase tracking-wider opacity-60">Edit Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${label}`}>First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-colors ${input}`}
              placeholder="First name"
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${label}`}>Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-colors ${input}`}
              placeholder="Last name"
            />
          </div>
        </div>

        {/* Notification email — the key setting */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${label}`}>
            <Bell size={11} className="inline mr-1 text-amber-500" />
            Support Ticket Notification Email
          </label>
          <input
            type="email"
            value={form.support_notification_email}
            onChange={(e) => setForm((f) => ({ ...f, support_notification_email: e.target.value }))}
            className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-colors ${input}`}
            placeholder="e.g. support@stalight.in"
          />
          <p className={`text-xs mt-1.5 ${dark ? "text-zinc-500" : "text-gray-400"}`}>
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
          <p className={`text-[11px] ${dark ? "text-zinc-600" : "text-gray-400"}`}>
            Last updated: {new Date(profile.updated_at).toLocaleString()}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
        </button>
      </form>
    </div>
  );
};

export default SuperAdminProfile;
