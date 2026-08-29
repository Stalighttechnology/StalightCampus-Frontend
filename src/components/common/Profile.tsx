import { useState, useRef, useEffect } from "react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Label } from "../ui/label";
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import { API_ENDPOINT } from "../../utils/config";
import { uploadFileViaBackendProxy } from "../../utils/common_api";
import { useTheme } from "../../context/ThemeContext";
import { Camera, Eye, EyeOff , Trash} from 'lucide-react';
import { Progress } from "../ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { handleNotificationToggle, checkNotificationPermission } from "../../utils/notificationHelper";
import LoginActivity from '../common/LoginActivity';
import { SkeletonCard } from "../ui/skeleton";
import HelpLearningCard from "./HelpLearningCard";
import GoogleIntegrationTab from "./GoogleIntegrationTab";

interface ProfileProps {
  role: string;
  user: any;
}

const Profile = ({ role, user }: ProfileProps) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    mobile_number: user?.mobile_number || "",
    address: user?.address || "",
    bio: user?.bio || "",
    profile_picture: user?.profile_image || user?.profile_picture || "",
    library_id: user?.library_id || "",
    vtu_staff_id: user?.vtu_staff_id || "",
    aicte_id: user?.aicte_id || ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const { theme } = useTheme();
  
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('google_connected') !== null ? 'integrations' : 'personal';
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'activity' | 'help' | 'settings' | 'integrations'>(defaultTab as any);
  
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false);


  useEffect(() => {
    checkNotificationPermission(setNotificationsEnabled);
  }, []);

  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`);
        const result = await response.json();
        if (result.success && (result.profile || result.data)) {
          const p = result.profile || result.data;
          setProfile(prev => ({
            ...prev,
            first_name: p.first_name || prev.first_name || "",
            last_name: p.last_name || prev.last_name || "",
            email: p.email || prev.email || "",
            mobile_number: p.mobile_number || p.phone_number || prev.mobile_number || "",
            address: p.address || prev.address || "",
            bio: p.bio || prev.bio || "",
            profile_picture: p.profile_picture || prev.profile_picture || "",
            library_id: p.library_id || prev.library_id || "",
            vtu_staff_id: p.vtu_staff_id || prev.vtu_staff_id || "",
            aicte_id: p.aicte_id || prev.aicte_id || ""
          }));
        }
      } catch (err) {
        // non-fatal
      }
    };
    fetchFreshProfile();
  }, [user]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [parentData, setParentData] = useState({ parent_name: "", parent_email: "" });
  const [linkingParent, setLinkingParent] = useState(false);

  const handleLinkParent = async () => {
    setLinkingParent(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/link-parent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentData)
      });
      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Success', 'Parent account linked successfully!');
        setParentData({ parent_name: "", parent_email: "" });
      } else {
        showErrorAlert('Error', res.message || 'Failed to link parent account');
      }
    } catch (e) {
      showErrorAlert('Error', 'An error occurred while linking parent.');
    } finally {
      setLinkingParent(false);
    }
  };

  
  const handleDeleteProfilePicture = async () => {
    const confirmed = await showConfirmAlert('Remove Photo', 'Are you sure you want to remove your profile picture?', 'Remove');
    if (!confirmed.isConfirmed) return;

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/delete-picture/`, {
        method: 'DELETE'
      });
      const res = await response.json();
      
      if (res.success) {
        setProfile((prev: any) => ({ ...prev, profile_picture: "", profile_image: "" }));
        const userStr = sessionStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          delete user.profile_picture;
          delete user.profile_image;
          delete user.profile_image;
          sessionStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("userProfileUpdated"));
        }
        showSuccessAlert("Success", "Profile picture removed!");
      } else {
        showErrorAlert("Error", res.message || "Failed to remove profile picture");
      }
    } catch (err) {
      showErrorAlert("Error", "Network error while removing picture");
    }
  };

  const handleProfilePictureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024) {
      showErrorAlert('Error', 'Profile picture must be less than 50KB');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const fileUrl = await uploadFileViaBackendProxy(file, 'profiles');
      setUploadProgress(90);
      if (fileUrl) {
        // Update backend immediately
        const updateData: any = { profile_picture_url: fileUrl };
        const endpoint =
          role === "admin" || role === "principal" ? `${API_ENDPOINT}/admin/users/` :
          role === "student" ? `${API_ENDPOINT}/student/update-profile/` :
          `${API_ENDPOINT}/${role}/profile/`;
        
        let method = "PATCH";
        let body: any = updateData;

        if (role === "admin" || role === "principal") {
          method = "POST";
          body = { user_id: user.user_id, action: "edit", updates: updateData };
        }

        const res = await fetchWithTokenRefresh(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
          setProfile(prev => ({ ...prev, profile_picture: fileUrl }));
          // Update local storage
          const storedUser = JSON.parse(sessionStorage.getItem("user") || '{}');
          storedUser.profile_image = fileUrl;
          storedUser.profile_picture = fileUrl;
          sessionStorage.setItem("user", JSON.stringify(storedUser));
          showSuccessAlert("Success", "Profile picture updated!");
        } else {
          showErrorAlert("Error", data.message || "Failed to update profile picture");
        }
      }
    } catch (err) {
      showErrorAlert("Error", "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      if (!profile.first_name.trim()) {
        showErrorAlert("Error", "First name is required");
        setLoading(false);
        return;
      }
      if (!profile.email.trim()) {
        showErrorAlert("Error", "Email is required");
        setLoading(false);
        return;
      }

      if (profile.mobile_number) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(profile.mobile_number.trim())) {
          showErrorAlert("Error", "Please enter a valid 10-digit mobile number");
          setLoading(false);
          return;
        }
      }
      
      if (!['student', 'parent'].includes(role)) {
        const idRegex = /^[a-zA-Z0-9\-_ ]*$/;
        if (profile.library_id && !idRegex.test(profile.library_id.trim())) {
          showErrorAlert("Error", "Library ID must be alphanumeric");
          setLoading(false);
          return;
        }
        if (profile.vtu_staff_id && !idRegex.test(profile.vtu_staff_id.trim())) {
          showErrorAlert("Error", "VTU Staff ID must be alphanumeric");
          setLoading(false);
          return;
        }
        if (profile.aicte_id && !idRegex.test(profile.aicte_id.trim())) {
          showErrorAlert("Error", "AICTE ID must be alphanumeric");
          setLoading(false);
          return;
        }
      }
      
      const updateData: any = {
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        mobile_number: profile.mobile_number,
        address: profile.address,
        bio: profile.bio
      };

      if (!['student', 'parent'].includes(role)) {
        updateData.library_id = profile.library_id;
        updateData.vtu_staff_id = profile.vtu_staff_id;
        updateData.aicte_id = profile.aicte_id;
      }

      const endpoint =
        role === "admin" || role === "principal" ? `${API_ENDPOINT}/admin/users/` :
        role === "student" ? `${API_ENDPOINT}/student/update-profile/` :
        `${API_ENDPOINT}/${role}/profile/`;
      
      let method = "PATCH";
      let body: any = updateData;

      if (role === "admin" || role === "principal") {
        method = "POST";
        body = { user_id: user.user_id, action: "edit", updates: updateData };
      }

      const response = await fetchWithTokenRefresh(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (data.success) {
        showSuccessAlert("Success", "Profile saved successfully");
        const updatedUser = { ...user, ...profile };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        setEditing(false);
      } else {
        showErrorAlert("Error", data.message || "Failed to save profile");
      }
    } catch (err) {
      showErrorAlert("Error", err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
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
          confirm_password: passwordData.confirm_password
        })
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
      showErrorAlert('Unable to change password', 'Failed to change password');
    }
  };

  const handleOpenAlwaysLocationSettings = async () => {
    // Opens Android Location Settings so the user can set "Allow all the time".
    // This is a user-initiated action from the Profile settings screen.
    // We only call openLocationSettings (navigates to OS settings page — no
    // permission dialog is shown by the app). requestBackgroundPermission is
    // intentionally NOT called here; the ScheduledLocationTracker handles the
    // full disclosure → permission flow when geofencing initialises.
    if (Capacitor.isNativePlatform()) {
      try {
        const CampusGeofence = registerPlugin<any>("CampusGeofence");
        if (CampusGeofence.openLocationSettings) {
          await CampusGeofence.openLocationSettings();
        }
      } catch (err: any) {
        console.error("Failed to open location settings:", err);
        showErrorAlert("Error", "Could not open location settings page: " + (err?.message || String(err)));
      }
    } else {
      showInfoAlert("Browser Sandbox", "Location settings can only be opened on a real iOS or Android device.");
    }
  };


  const getInitials = () => {
    return `${(profile.first_name || user?.first_name || "").charAt(0)}${(profile.last_name || user?.last_name || "").charAt(0)}`.toUpperCase();
  };
  
  const getRoleDisplayName = () => {
    if (role === 'transport_admin') return 'Transport Admin';
    if (role === 'library_admin') return 'Library Admin';
    if (role === 'admission_manager') return 'Admission Manager';
    if (role === 'counsellor') return 'Admission Counsellor';
    if (role === 'group_d') return 'Group D';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label htmlFor="first_name" className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                <Input id="first_name" name="first_name" value={profile.first_name} onChange={handleChange} disabled={role === 'admission_manager' ? (!editing || loading) : true} placeholder="First name" className="text-sm h-9 sm:h-10 w-full" />
              </div>
              <div className="w-full">
                <label htmlFor="last_name" className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                <Input id="last_name" name="last_name" value={profile.last_name} onChange={handleChange} disabled={role === 'admission_manager' ? (!editing || loading) : true} placeholder="Last name" className="text-sm h-9 sm:h-10 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="email" className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
                <Input id="email" name="email" value={profile.email} onChange={handleChange} disabled={true} placeholder="Email address" className="text-sm h-9 sm:h-10 w-full" />
              </div>
              <div>
                <label htmlFor="mobile_number" className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
                <Input id="mobile_number" name="mobile_number" value={profile.mobile_number} onChange={handleChange} disabled={!editing || loading} maxLength={10} placeholder="10-digit mobile" className="text-sm h-9 sm:h-10 w-full" />
              </div>
            </div>

            {!['student', 'parent'].includes(role) && (
              <div className="pt-4 border-t mt-4">
                <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Institutional IDs</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="library_id" className={`block text-xs mb-1.5 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Library ID</label>
                    <Input id="library_id" name="library_id" value={profile.library_id} onChange={handleChange} disabled={!editing || loading} placeholder="e.g. LIB12345" className="text-sm h-9 sm:h-10 w-full" />
                  </div>
                  <div>
                    <label htmlFor="vtu_staff_id" className={`block text-xs mb-1.5 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>VTU Staff ID</label>
                    <Input id="vtu_staff_id" name="vtu_staff_id" value={profile.vtu_staff_id} onChange={handleChange} disabled={!editing || loading} placeholder="e.g. VTU98765" className="text-sm h-9 sm:h-10 w-full" />
                  </div>
                  <div>
                    <label htmlFor="aicte_id" className={`block text-xs mb-1.5 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>AICTE ID</label>
                    <Input id="aicte_id" name="aicte_id" value={profile.aicte_id} onChange={handleChange} disabled={!editing || loading} placeholder="e.g. 1-12345678" className="text-sm h-9 sm:h-10 w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="address" className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</label>
              <Textarea id="address" name="address" value={profile.address} onChange={handleChange} disabled={!editing || loading} rows={3} className="text-sm w-full" />
            </div>
            <div>
              <label htmlFor="bio" className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bio</label>
              <Textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} disabled={!editing || loading} rows={4} className="text-sm w-full" />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{profile.bio.trim().split(/\s+/).filter(Boolean).length}/50 words</p>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div>
            <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Login Activity</h3>
            <div className="mt-3">
              <LoginActivity />
            </div>
          </div>
        );
      case 'help':
        return (
          <div className="animate-in fade-in duration-300">
            <HelpLearningCard />
          </div>
        );
      case 'settings':
        return (
          <div className="animate-in fade-in duration-300">
            <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Settings</h3>
            
            <div className="space-y-6">
              <div className={`flex items-center justify-between p-4 border rounded-lg ${theme === 'dark' ? 'bg-card border-input' : 'bg-white border-gray-200'}`}>
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Receive real-time alerts for attendance, leaves, exams, and more.
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => handleNotificationToggle(checked, setNotificationsEnabled)}
                />
              </div>

              {/* Always-On Geofence Location Settings (Only for HOD, Dean, COE, Faculty, and other staff roles) */}
              {!['student', 'parent'].includes(role) && (
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-white border-gray-200'}`}>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Always-On Location Monitoring</Label>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Enables background geofence transition alerts when entering or leaving the campus. Requires "Always Allow" location permission to operate correctly.
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenAlwaysLocationSettings}
                    variant="outline"
                    className="bg-primary text-white hover:bg-primary/95 border-none w-full sm:w-auto"
                  >
                    Configure Always Allow
                  </Button>
                </div>
              )}

              {role === 'student' && (
                <div>
                  <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Parent Access</h3>
                  <div className={`p-4 border rounded-lg space-y-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-white border-gray-200'}`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Grant your parents read-only access to your dashboard. <br />
                      <strong>Note:</strong> Your parents can login with this email ID and your USN as the password.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="parent_name" className="text-sm mb-1.5 block">Parent's Name</Label>
                        <Input 
                          id="parent_name" 
                          placeholder="e.g. John Doe" 
                          value={parentData.parent_name}
                          onChange={(e) => setParentData({...parentData, parent_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="parent_email" className="text-sm mb-1.5 block">Parent's Email</Label>
                        <Input 
                          id="parent_email" 
                          type="email"
                          placeholder="e.g. parent@example.com" 
                          value={parentData.parent_email}
                          onChange={(e) => setParentData({...parentData, parent_email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        disabled={!parentData.parent_name || !parentData.parent_email || linkingParent}
                        onClick={handleLinkParent}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {linkingParent ? 'Linking...' : 'Enable Parent Access'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'integrations':
        return <GoogleIntegrationTab />;

      default:
        return null;
    }
  };

  return (
    <div id={role === 'transport_admin' ? 'transport-profile-header' : role === 'library_admin' ? 'library-profile-header' : role === 'driver' ? 'driver-profile-header' : role === 'admission_manager' ? 'admission-profile-header' : undefined} className="min-h-screen flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto my-2 ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id={role === 'transport_admin' ? 'transport-profile-action-header' : role === 'library_admin' ? 'library-profile-action-header' : role === 'driver' ? 'driver-profile-action-header' : (role === 'admission_manager' || role === 'counsellor') ? 'admission-profile-action-header' : undefined} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-xl sm:text-2xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile Information</CardTitle>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex flex-row items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              size="sm"
              onClick={() => {if (editing) handleSaveProfile(); else setEditing(true);}}
              variant="outline"
              className={`flex-1 sm:flex-none w-full sm:w-auto text-white border transition-colors ${
                editing 
                  ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 hover:text-white' 
                  : 'bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white'
              }`}
              disabled={loading}>
              {editing ? loading ? 'Saving Profile...' : 'Save Profile' : 'Edit Profile'}
            </Button>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none w-full sm:w-auto text-sm px-3 sm:px-4 py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
                        className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
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
                        className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
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
                        className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
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

        <CardContent className="px-6 pb-3 pt-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center">
              <div className="relative mb-3 sm:mb-4 mt-4 flex-shrink-0 group cursor-pointer">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile.profile_picture || undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                    <AvatarFallback className="bg-primary text-white text-lg sm:text-2xl font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {(editing || !profile?.profile_picture) && (
                    <label 
                      htmlFor="profile-picture-upload" 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white cursor-pointer"
                    >
                      <Camera className="h-5 w-5 mb-1 transform scale-75 group-hover:scale-100 group-hover:animate-bounce transition-transform duration-300" />
                      <span className="text-[9px] font-semibold tracking-wider uppercase">Change</span>
                    </label>
                  )}
                </div>
                {(editing || !profile?.profile_picture) && (
                  <label 
                    htmlFor="profile-picture-upload" 
                    className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-lg md:hidden"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                )}
                {editing && profile?.profile_picture && (
                  <button
                    onClick={handleDeleteProfilePicture}
                    className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-lg"
                    title="Remove Photo"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input 
                id="profile-picture-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleProfilePictureSelect} 
                className="hidden" 
              />

              {isUploading && (
                <div className="w-full max-w-[150px] mb-2">
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-[10px] text-center mt-1 text-muted-foreground">Uploading...</p>
                </div>
              )}

              <div className="text-base sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{getRoleDisplayName()}</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-sm font-semibold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</span>
                      <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.email || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</span>
                      <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.mobile_number || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Role</span>
                      <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{getRoleDisplayName() || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto custom-scrollbar flex-shrink-0">
                <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
                <button onClick={() => setActiveTab('contact')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'contact' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Contact</button>
                <button onClick={() => setActiveTab('settings')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'settings' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Settings</button>
                {['teacher', 'hod', 'dean', 'admin', 'principal', 'coe', 'admission_manager', 'placement_officer', 'library_admin', 'counsellor'].includes(role) && (
                  <button onClick={() => setActiveTab('integrations')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'integrations' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Integrations</button>
                )}
                <button onClick={() => setActiveTab('help')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'help' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Help & Learning</button>
                <button onClick={() => setActiveTab('activity')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'activity' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Login Activity</button>
              </div>
              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {renderTabContent()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;