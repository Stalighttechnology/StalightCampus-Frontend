import { Switch } from "@/components/ui/switch";
import { handleNotificationToggle, checkNotificationPermission } from "../../utils/notificationHelper";
import HelpLearningCard from "../common/HelpLearningCard";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { manageProfile } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff, Trash } from 'lucide-react';
import { SkeletonCard } from "../ui/skeleton";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Camera, Upload } from 'lucide-react';
import LoginActivity from '../common/LoginActivity';
import { uploadFileViaBackendProxy } from "../../utils/common_api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Progress } from "../ui/progress";
import GoogleIntegrationTab from "../common/GoogleIntegrationTab";

interface User {
  user_id?: string;
  username?: string;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  address?: string;
  bio?: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  address: string;
  bio: string;
  profile_picture?: string;
  department?: string;
  branch_name?: string;
  branch_code?: string;
}

interface HodProfileProps {
  user?: User;
  setError?: (error: string | null) => void;
}

function HodProfile({ user: propUser, setError }: HodProfileProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | 'integrations'>({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    address: "",
    bio: "",
    profile_picture: "",
    department: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setLocalError] = useState<string | null | 'integrations'>(null);
  const { theme } = useTheme();
  const [fetchedUser, setFetchedUser] = useState<User | null | 'integrations'>(null);
  // ref used to skip one fetch immediately after a successful PATCH
  const skipFetch = useRef(false);
  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get("google_connected") !== null ? "integrations" : "personal";
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'about' | 'activity' | 'help' | 'settings' | 'integrations'>(defaultTab as any);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    checkNotificationPermission(setNotificationsEnabled);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      // If we just performed a PATCH and set the skip flag,
      // avoid the immediate refetch to keep UI snappy.
      if (skipFetch.current) {
        skipFetch.current = false;
        setLoading(false);
        return;
      }
      let currentUser = propUser;

      if (!currentUser || !currentUser.user_id) {
        setLoading(true);
        setLocalError(null);
        if (setError) setError(null);
        try {
          const userData = sessionStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.user_id) {
              currentUser = {
                user_id: parsedUser.user_id,
                username: parsedUser.username || parsedUser.first_name || "",
                email: parsedUser.email || "",
                role: parsedUser.role || "hod"
              };
              setFetchedUser(currentUser);
            } else {
              throw new Error("User ID not found in local storage");
            }
          } else {
            throw new Error("No user data found");
          }
        } catch (err) {

          const message = "Authentication failed. Please log in again.";
          if (setError) setError(message);
          setLocalError(message);
          showErrorAlert("Error", message);
          setTimeout(() => window.location.href = "/login", 2000);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setLocalError(null);
      if (setError) setError(null);
      try {
        const response = await manageProfile({}, "GET");
        let payload: any = null;
        if (response) {
          if ((response as any).data) {
            // data may itself be the profile or contain profile
            payload = (response as any).data.profile || (response as any).data;
          }
          if (!payload && (response as any).profile) payload = (response as any).profile;
          if (!payload && (response as any).first_name) payload = response;
        }

        if (payload) {
          const fetchedProfile: Profile & { profile_picture?: string } = {
            first_name: payload.first_name || "",
            last_name: payload.last_name || "",
            email: payload.email || payload.username || "",
            mobile_number: payload.mobile_number || payload.mobile || "",
            address: payload.address || "",
            bio: payload.bio || "",
            profile_picture: payload.profile_picture || payload.profile_picture_url || "",
            department: payload.department || payload.branch || "",
            branch_name: payload.branch_name || "",
            branch_code: payload.branch_code || ""
          };
          setProfile(fetchedProfile as any);
        } else {
          const message = response && (response as any).message || "Failed to fetch profile";
          setLocalError(message);
          showErrorAlert("Error", message);
          if (message === "Profile not found") {
            setEditing(true);
            setProfile({
              first_name: currentUser?.username?.split(" ")[0] || "",
              last_name: currentUser?.username?.split(" ")[1] || "",
              email: currentUser?.email || "",
              mobile_number: "",
              address: "",
              bio: "",
              department: ""
            });
          }
        }
      } catch (err) {

        const message = "Network error";
        if (setError) setError(message);
        setLocalError(message);
        showErrorAlert("Error", message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [propUser, setError]);


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
        const res = await manageProfile({ profile_picture_url: fileUrl }, "PATCH");
        if (res.success) {
          setProfile(prev => ({ ...prev, profile_picture: fileUrl } as any));
          // Update local storage
          const user = JSON.parse(sessionStorage.getItem("user") || '{}');
          user.profile_picture = fileUrl;
          sessionStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("userProfileUpdated"));
          showSuccessAlert("Success", "Profile picture updated!");
        } else {
          showErrorAlert("Error", res.message || "Failed to update profile picture");
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
    if (name === "mobile_number") {
      const numericValue = value.replace(/[^0-9]/g, "");
      setProfile((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setLocalError(null);
    if (setError) setError(null);
    try {
      const currentUser = fetchedUser || propUser;
      if (!currentUser || !currentUser.user_id) {
        setLocalError("User data unavailable for update");
        showErrorAlert("Error", "User data unavailable for update");
        setLoading(false);
        return;
      }

      if (!profile.first_name.trim()) {
        setLocalError("First name is required");
        showErrorAlert("Error", "First name is required");
        setLoading(false);
        return;
      }
      if (!profile.email.trim()) {
        setLocalError("Email is required");
        showErrorAlert("Error", "Email is required");
        setLoading(false);
        return;
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        setLocalError("Invalid email format");
        showErrorAlert("Error", "Invalid email format");
        setLoading(false);
        return;
      }

      if (profile.mobile_number) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(profile.mobile_number.trim())) {
          setLocalError("Please enter a valid 10-digit mobile number");
          showErrorAlert("Error", "Please enter a valid 10-digit mobile number");
          setLoading(false);
          return;
        }
      }

      const updates: {
        first_name?: string;
        last_name?: string;
        email?: string;
        mobile_number?: string;
        address?: string;
        bio?: string;
      } = {};
      if (profile.first_name !== (currentUser.first_name || "")) updates.first_name = profile.first_name;
      if (profile.last_name !== (currentUser.last_name || "")) updates.last_name = profile.last_name;
      if (profile.email !== (currentUser.email || "")) updates.email = profile.email;
      if (profile.mobile_number !== (currentUser.mobile_number || "")) updates.mobile_number = profile.mobile_number;
      if (profile.address !== (currentUser.address || "")) updates.address = profile.address;
      if (profile.bio !== (currentUser.bio || "")) updates.bio = profile.bio;

      if (Object.keys(updates).length === 0) {
        showInfoAlert("Info", "No changes to save");
        setEditing(false);
        setLoading(false);
        return;
      }

      // set skip flag to avoid immediate refetch triggered elsewhere
      skipFetch.current = true;
      const response = await manageProfile(updates, "PATCH");
      if (response.success && response.data) {
        const updatedProfile: Profile = {
          first_name: response.data.first_name || "",
          last_name: response.data.last_name || "",
          email: response.data.email || "",
          mobile_number: response.data.mobile_number || "",
          address: response.data.address || "",
          bio: response.data.bio || "",
          profile_picture: response.data.profile_picture || profile?.profile_picture || ""
        };
        setProfile(updatedProfile);
        showSuccessAlert("Success", "Profile saved successfully");
        sessionStorage.setItem("user", JSON.stringify({
          ...JSON.parse(sessionStorage.getItem("user") || "{}"),
          ...response.data,
          user_id: currentUser.user_id
        }));
        setEditing(false);
      } else {
        const message = response.message || "Failed to save profile";
        if (setError) setError(message);
        setLocalError(message);
        showErrorAlert("Error", message);
      }
    } catch (err) {

      const message = err instanceof Error ? err.message : "Network error";
      if (setError) setError(message);
      setLocalError(message);
      showErrorAlert("Error", message);
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

  if (loading && !profile.first_name) {
    return (
      <div className="min-h-screen flex justify-center items-start p-6">
        <SkeletonCard className="w-full max-w-4xl h-[500px]" />
      </div>);

  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                <Input id="first_name" name="first_name" value={profile.first_name} onChange={handleChange} disabled={true} placeholder="First name" className="text-sm h-9 sm:h-10 w-full" />
              </div>
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                <Input id="last_name" name="last_name" value={profile.last_name} onChange={handleChange} disabled={true} placeholder="Last name" className="text-sm h-9 sm:h-10 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
                <Input id="email" name="email" value={profile.email} onChange={handleChange} disabled={true} placeholder="Email address" className="text-sm h-9 sm:h-10 w-full" />
              </div>
              <div>
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
                <Input id="mobile_number" name="mobile_number" value={profile.mobile_number} onChange={handleChange} disabled={!editing || loading} maxLength={10} placeholder="10-digit mobile" className="text-sm h-9 sm:h-10 w-full" />
              </div>
            </div>
          </div>);




      case 'settings':
        return (
          <div className="animate-in fade-in duration-300">
            <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Settings</h3>
            <div className={`flex items-center justify-between p-4 border rounded-lg ${theme === 'dark' ? 'bg-card border-input' : 'bg-white border-gray-200'}`}>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Push Notifications</Label>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Receive real-time alerts for attendance, leaves, exams, and more.</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={(checked) => handleNotificationToggle(checked, setNotificationsEnabled)} />
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="animate-in fade-in duration-300">
            <HelpLearningCard />
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</label>
              <Textarea id="address" name="address" value={profile.address} onChange={handleChange} disabled={!editing || loading} rows={3} className="text-sm w-full" />
            </div>
            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bio</label>
              <Textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} disabled={!editing || loading} rows={4} className="text-sm w-full" />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{profile.bio.trim().split(/\s+/).filter(Boolean).length}/50 words</p>
            </div>
          </div>);

      case 'activity':
        return (
          <div>
            <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Login Activity</h3>
            <div className="mt-3">
              <LoginActivity />
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="animate-in fade-in duration-300">
            <GoogleIntegrationTab />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div id="hod-profile-container" className="min-h-screen flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto my-2 ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id="hod-profile-header-section" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-lg sm:text-2xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile Information</CardTitle>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex flex-row items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              size="sm"
              onClick={() => { if (editing) handleSaveProfile(); else setEditing(true); }}
              variant="outline"
              className={`flex-1 sm:flex-none w-full sm:w-auto text-sm text-white border transition-colors ${editing
                  ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 hover:text-white'
                  : 'bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white'
                }`}
              disabled={loading}>

              {editing ? loading ? 'Saving Profile...' : 'Save Profile' : 'Edit Profile'}
            </Button>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none w-full sm:w-auto text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-9 bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.current ? 'Hide current password' : 'Show current password'}>

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
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.next ? 'Hide new password' : 'Show new password'}>

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
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.confirm ? 'Hide confirm password' : 'Show confirm password'}>

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

        <CardContent className="px-6 pb-6 pt-2 space-y-8">

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center">
              <div className="relative mb-3 sm:mb-4 mt-4 flex-shrink-0 group cursor-pointer">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={(profile as any).profile_picture} alt={`${profile.first_name} ${profile.last_name}`} />
                    <AvatarFallback className="bg-primary text-white text-lg sm:text-2xl font-semibold">
                      {(profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")}
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
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureSelect}
                  className="hidden"
                />
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

              {isUploading && (
                <div className="w-full max-w-[150px] mb-2">
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-[10px] text-center mt-1 text-muted-foreground">Uploading...</p>
                </div>
              )}

              <div className="text-base sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Head of Department</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-sm font-semibold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</span>
                      <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.department || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</span>
                      <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.email || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</span>
                      <span className={`text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.mobile_number || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
                <button onClick={() => setActiveTab('contact')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'contact' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Contact</button>
                <button onClick={() => setActiveTab('settings')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'settings' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Settings</button>
                <button onClick={() => setActiveTab('integrations')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'integrations' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Integrations</button>
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
    </div>);

};

export default HodProfile;