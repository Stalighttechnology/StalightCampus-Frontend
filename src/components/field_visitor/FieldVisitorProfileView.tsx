import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  getFieldVisitorProfile,
  updateFieldVisitorProfile,
  VisitorProfileData,
  VisitorStatsData,
} from "../../utils/field_visitor_api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import Swal from "sweetalert2";
import {
  User,
  Shield,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Award,
  Save,
  MapPin,
  Briefcase
} from "lucide-react";

export const FieldVisitorProfileView: React.FC = () => {
  const { theme } = useTheme();
  const [profile, setProfile] = useState<VisitorProfileData | null>(null);
  const [stats, setStats] = useState<VisitorStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [agency, setAgency] = useState("");
  const [assignedZone, setAssignedZone] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const res = await getFieldVisitorProfile();
    if (res.success && res.profile) {
      setProfile(res.profile);
      setStats(res.stats || null);
      setPhone(res.profile.phone || "");
      setDesignation(res.profile.designation || "");
      setEmployeeId(res.profile.employee_id || "");
      setAgency(res.profile.agency_or_department || "");
      setAssignedZone(res.profile.assigned_zone || "");
      setBio(res.profile.bio || "");
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateFieldVisitorProfile({
      phone,
      designation,
      employee_id: employeeId,
      agency_or_department: agency,
      assigned_zone: assignedZone,
      bio,
    });

    if (res.success) {
      Swal.fire({
        title: "Profile Updated",
        text: "Your officer profile details have been saved.",
        icon: "success",
      });
      fetchProfile();
    } else {
      Swal.fire({
        title: "Save Failed",
        text: res.message || "Failed to update profile",
        icon: "error",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading officer profile...</div>;
  }

  return (
    <div className={`users-container text-sm sm:text-base max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={`users-card ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
        <CardHeader className="users-card-header border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className={`users-card-title text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Officer Profile & Settings
            </CardTitle>
            <p className={`users-card-desc text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage your field auditor credentials, jurisdiction zones, and official contact details
            </p>
          </div>
        </CardHeader>

        <CardContent className="users-card-content pt-6 pb-8 space-y-6">
      {/* Officer Summary Header Card */}
      <Card className="border border-border shadow-sm bg-gradient-to-r from-primary/10 via-background to-background">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary text-2xl font-bold shadow">
              {profile?.first_name?.charAt(0) || "O"}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{profile?.name}</h2>
                <Badge variant="default" className="w-fit mx-auto sm:mx-0 text-xs bg-primary">
                  Field Visitor / Officer
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{profile?.designation}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary" /> {profile?.email}
                </span>
                {profile?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {profile?.phone}
                  </span>
                )}
                {profile?.org_name && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-primary" /> Home Org: {profile?.org_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total_inspections}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Inspections</div>
          </Card>
          <Card className="border border-border p-4 text-center">
            <div className="text-2xl font-bold text-indigo-500">{stats.schools_visited_count}</div>
            <div className="text-xs text-muted-foreground mt-1">Schools Visited</div>
          </Card>
          <Card className="border border-border p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">{stats.action_required_count}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending Actions</div>
          </Card>
          <Card className="border border-border p-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{stats.resolved_count}</div>
            <div className="text-xs text-muted-foreground mt-1">Resolved Cases</div>
          </Card>
        </div>
      )}

      {/* Profile Edit Form */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Official Profile & Contact Information
          </CardTitle>
          <CardDescription className="text-xs">
            Manage your official designation, department, and jurisdiction zone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Official Designation</label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Inspection Officer / Field Auditor"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Employee / Officer ID</label>
                <Input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. FO-2026-98"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Contact Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Assigned District / Zone</label>
                <Input
                  value={assignedZone}
                  onChange={(e) => setAssignedZone(e.target.value)}
                  placeholder="e.g. North Zone / District Educational Circle"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Department / Agency Name</label>
              <Input
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                placeholder="e.g. Directorate of Higher Education / Quality Cell"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Professional Bio / Notes</label>
              <Textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Inspection mandates, jurisdiction notes, or special directives..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Saving Changes..." : "Save Profile Details"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </CardContent>
      </Card>
    </div>
  );
};
