// FacultyProfile.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { getFacultyProfile, manageProfile } from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { SkeletonCard } from "@/components/ui/skeleton";
import { API_ENDPOINT } from "../../utils/config";

const FacultyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    address: "",
    bio: "",
    profile_picture: "",
    // faculty-specific fields returned in the new `profile` object
    department: "",
    designation: "",
    qualification: "",
    branch: "",
    experience_years: "",
    office_location: "",
    office_hours: "",
    date_of_birth: "",
    gender: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "contact" | "about">("personal");
  const { theme } = useTheme();
  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    getFacultyProfile()
      .then((res) => {
        // Backend now returns { success: true, profile: { ... } }
        const payload = res.profile || res.data || null;
        if (res.success && payload) {
          setFormData({
            firstName: payload.first_name || "",
            lastName: payload.last_name || "",
            email: payload.email || "",
            mobile: payload.mobile_number || payload.mobile || "",
            address: payload.address || "",
            bio: payload.bio || "",
            profile_picture: payload.profile_picture || payload.profile_picture_url || "",
            department: payload.department || "",
            designation: payload.designation || "",
            qualification: payload.qualification || "",
            branch: payload.branch || "",
            experience_years: payload.experience_years ? String(payload.experience_years) : "",
            office_location: payload.office_location || "",
            office_hours: payload.office_hours || "",
            date_of_birth: payload.date_of_birth || "",
            gender: payload.gender || "",
          });
        } else {
          setError(res.message || "Failed to load profile");
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    field: string,
    value: string
  ) => {
    let newValue = value;
    let errorMessage = "";

    switch (field) {
      case "firstName":
      case "lastName":
        if (!/^[A-Za-z\s]{2,50}$/.test(newValue)) {
          errorMessage = "Only letters allowed (2–50 characters)";
        }
        break;

      case "email":
        if (
          !/^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(
            newValue
          )
        ) {
          errorMessage = "Invalid email format";
        }
        break;

      case "mobile":
        newValue = newValue.replace(/\D/g, "");
        if (newValue.length !== 10) {
          errorMessage = "Mobile number must be exactly 10 digits";
        }
        break;

      case "address":
        newValue = newValue.replace(/[^a-zA-Z0-9\s,./-]/g, "");
        if (newValue.trim().length < 5) {
          errorMessage = "Address must be at least 5 characters";
        } else if (newValue.length > 200) {
          newValue = newValue.slice(0, 200);
        }
        break;

      case "bio":
        newValue = newValue.replace(/[^a-zA-Z0-9\s.,!?]/g, "");
        if (newValue.trim().length < 10) {
          errorMessage = "Bio must be at least 10 characters";
        } else if (newValue.length > 300) {
          newValue = newValue.slice(0, 300);
        }
        break;
    }

    setFormData((prev) => ({ ...prev, [field]: newValue }));
    setLocalErrors((prev) => ({ ...prev, [field]: errorMessage }));
  };

  const handleSave = async () => {
    setError(null);

    // Prevent save if validation errors exist
    const hasErrors = Object.values(localErrors).some((msg) => msg);
    if (hasErrors) {
      setError("Please fix the errors before saving.");
      return;
    }

    try {
      const res = await manageProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        bio: formData.bio,
        profile_picture: (formData.profile_picture as any) || undefined,
        // faculty specific
        department: formData.department || undefined,
        designation: formData.designation || undefined,
        qualification: formData.qualification || undefined,
        branch: formData.branch || undefined,
        experience_years: formData.experience_years || undefined,
        office_location: formData.office_location || undefined,
        office_hours: formData.office_hours || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
      });

      // Backend may return updated profile under `profile` or `data`
      const payload = res.profile || res.data || null;
      if (res.success) {
        showSuccessAlert("Success", "Profile updated successfully!");
        // Update local formData from returned payload when available
        if (payload) {
          setFormData((prev) => ({
            ...prev,
            firstName: payload.first_name || prev.firstName,
            lastName: payload.last_name || prev.lastName,
            email: payload.email || prev.email,
            mobile: payload.mobile_number || payload.mobile || prev.mobile,
            address: payload.address || prev.address,
            bio: payload.bio || prev.bio,
            profile_picture: payload.profile_picture || prev.profile_picture,
            department: payload.department || prev.department,
            designation: payload.designation || prev.designation,
            qualification: payload.qualification || prev.qualification,
            branch: payload.branch || prev.branch,
            experience_years: payload.experience_years ? String(payload.experience_years) : prev.experience_years,
            office_location: payload.office_location || prev.office_location,
            office_hours: payload.office_hours || prev.office_hours,
            date_of_birth: payload.date_of_birth || prev.date_of_birth,
            gender: payload.gender || prev.gender,
          }));
        }
        setIsEditing(false);
      } else {
        setError(res.message || "Failed to update profile");
        showErrorAlert("Error", res.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      showErrorAlert("Missing fields", "Please fill in current, new and confirm password fields.");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showErrorAlert("Password mismatch", "New passwords don't match");
      return;
    }
    if (passwordData.current_password === passwordData.new_password) {
      showErrorAlert("Invalid new password", "Current password and new password cannot be the same.");
      return;
    }

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        showSuccessAlert('Password changed', 'Your password has been updated successfully.');
      } else {
        showErrorAlert('Unable to change password', result.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      showErrorAlert('Unable to change password', 'Failed to change password');
    }
  };

  if (loading) {
    return <SkeletonCard className="w-full h-[600px]" />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "personal":
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                <Input value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} disabled={!isEditing} placeholder="First name" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
                {localErrors.firstName && <p className={`text-sm mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.firstName}</p>}
              </div>

              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                <Input value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} disabled={!isEditing} placeholder="Last name" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
                {localErrors.lastName && <p className={`text-sm mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.lastName}</p>}
              </div>
            </div>

            <div className="w-full">
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date of Birth</label>
              <Input value={formData.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} disabled={!isEditing} placeholder="YYYY-MM-DD" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
            </div>

            <div className="w-full">
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Gender</label>
              <Input value={formData.gender} onChange={(e) => handleChange("gender", e.target.value)} disabled={!isEditing} placeholder="Gender" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
            </div>
          </div>
        );

      case "academic":
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</label>
                <Input value={formData.department} onChange={(e) => handleChange("department", e.target.value)} disabled={!isEditing} placeholder="Department" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
              </div>
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</label>
                <Input value={formData.designation} onChange={(e) => handleChange("designation", e.target.value)} disabled={!isEditing} placeholder="Designation" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Qualification</label>
                <Input value={formData.qualification} onChange={(e) => handleChange("qualification", e.target.value)} disabled={!isEditing} placeholder="Qualification" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
              </div>
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch</label>
                <Input value={formData.branch} onChange={(e) => handleChange("branch", e.target.value)} disabled={!isEditing} placeholder="Branch" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Experience (years)</label>
                <Input value={formData.experience_years} onChange={(e) => handleChange("experience_years", e.target.value)} disabled={!isEditing} placeholder="Experience" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
              </div>
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Office Location</label>
                <Input value={formData.office_location} onChange={(e) => handleChange("office_location", e.target.value)} disabled={!isEditing} placeholder="Office" className="text-sm h-8 sm:h-9 md:h-10 w-full" />
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
              <Input value={formData.email} onChange={(e) => handleChange("email", e.target.value)} disabled={!isEditing} placeholder="Email address" className="text-sm h-8 sm:h-10" />
              {localErrors.email && <p className={`text-sm mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.email}</p>}
            </div>

            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
              <Input value={formData.mobile} onChange={(e) => handleChange("mobile", e.target.value)} disabled={!isEditing} maxLength={10} placeholder="10-digit mobile" className="text-sm h-8 sm:h-10" />
              {localErrors.mobile && <p className={`text-sm mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.mobile}</p>}
            </div>

            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</label>
              <Textarea value={formData.address} onChange={(e) => handleChange("address", e.target.value)} disabled={!isEditing} placeholder="Address" rows={3} className="text-sm" />
              {localErrors.address && <p className={`text-sm mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.address}</p>}
            </div>

            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bio</label>
              <Textarea value={formData.bio} onChange={(e) => handleChange("bio", e.target.value)} disabled={!isEditing} placeholder="Tell us about yourself" rows={4} className="text-sm" />
              {localErrors.bio && <p className={`text-sm mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.bio}</p>}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`w-full max-w-none mx-auto ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Faculty Profile</CardTitle>
          <p className={`text-sm mt-1 line-clamp-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage your profile and academic details</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
          <Button className="text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90" onClick={() => { if (isEditing) { handleSave(); } else { setIsEditing(true); } }}>
            {isEditing ? (
              updateProfileMutation?.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/40 animate-pulse" />
                  Saving...
                </div>
              ) : 'Save'
            ) : 'Edit Profile'}
          </Button>
          {isEditing && <button onClick={() => setIsEditing(false)} className={`text-sm px-3 sm:px-4 py-1.5 sm:py-2 border rounded-md transition-colors ${theme === 'dark' ? 'border-muted-foreground text-muted-foreground hover:border-foreground hover:text-foreground' : 'border-gray-600 text-gray-600 hover:border-gray-900 hover:text-gray-900'}`}>Cancel</button>}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button className="text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
            </DialogTrigger>
            <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.current ? 'Hide current password' : 'Show current password'}
                    >
                      {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPasswords.next ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.next ? 'Hide new password' : 'Show new password'}
                    >
                      {showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.confirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                  <Button className="font-medium bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleChangePassword}>Change Password</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-6">
        {error && <div className={`mb-3 sm:mb-4 text-sm ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-stretch">
          {/* Left column: avatar and basic */}
          <div className="col-span-1 flex flex-col items-center h-full">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 mt-4 flex-shrink-0`}>
              {(formData.firstName && formData.firstName[0]) || ""}{(formData.lastName && formData.lastName[0]) || ""}
            </div>
            <div className="text-base sm:text-lg font-semibold text-center mb-1">{formData.firstName} {formData.lastName}</div>
            <div className={`text-sm mb-4 sm:mb-6 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Faculty</div>

            <div className="w-full mt-4 sm:mt-6 flex-1 flex flex-col">
              <h4 className={`text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
              <div className={`border rounded-lg p-2.5 sm:p-4 flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 h-full">
                  <div className="flex flex-col justify-start">
                    <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</span>
                    <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.department || '—'}</span>
                  </div>
                  <div className="flex flex-col justify-start">
                    <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</span>
                    <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.designation || '—'}</span>
                  </div>
                  <div className="flex flex-col justify-start">
                    <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Office</span>
                    <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.office_location || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: tabs and content */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
            <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
              <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
              <button onClick={() => setActiveTab('academic')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'academic' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Academic</button>
              <button onClick={() => setActiveTab('contact')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'contact' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Contact</button>
            </div>

            <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FacultyProfile;