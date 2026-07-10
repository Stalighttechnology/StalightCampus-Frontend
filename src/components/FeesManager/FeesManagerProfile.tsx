import { Switch } from "@/components/ui/switch";
import { handleNotificationToggle, checkNotificationPermission } from "../../utils/notificationHelper";
import React, { useEffect, useRef, useState } from "react";
import HelpLearningCard from "../common/HelpLearningCard";
import GoogleIntegrationTab from "../common/GoogleIntegrationTab";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff , Trash} from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import {
  getFeesManagerProfile,
  updateFeesManagerProfile,
  changeFeesManagerPassword } from
"../../utils/fees_manager_api";
import {
  Skeleton,
  SkeletonStatsGrid,
  SkeletonTable,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonCard,
  SkeletonForm } from
"@/components/ui/skeleton";
import LoginActivity from '../common/LoginActivity';

import { Camera } from 'lucide-react';
import { uploadFileViaBackendProxy } from "../../utils/common_api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Progress } from "../ui/progress";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";



const FeesManagerProfile: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", phone: "", address: "", bio: "" });
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get("google_connected") !== null ? "integrations" : "details";
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'settings' | 'help' | 'integrations'>(defaultTab as any);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false);

  useEffect(() => {
    checkNotificationPermission(setNotificationsEnabled);
  }, []);

  useEffect(() => {
    if (activeTab === 'integrations' && googleConnected === null) {
      setGoogleConnectLoading(true);
      fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/status/`)
        .then(res => res.json())
        .then(data => {
          if (data.connected !== undefined) setGoogleConnected(data.connected);
        })
        .catch(err => console.error("Failed to fetch google status", err))
        .finally(() => setGoogleConnectLoading(false));
    }
  }, [activeTab]);

  // Change password state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getFeesManagerProfile();
      if (res.success) {
        const p = res.profile || res.data || res;
        setProfile(p);
        setFormData({
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          email: p.email || "",
          phone: p.phone_number || p.mobile_number || "",
          address: p.address || "",
          bio: p.bio || ""
        });
      } else {
        showErrorAlert("Error", res.message || "Failed to load profile");
      }
    } catch (err) {

      showErrorAlert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  };

  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleProfilePictureSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showErrorAlert("Error", "Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("Error", "File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const fileUrl = await uploadFileViaBackendProxy(file, 'profiles');
      setUploadProgress(90);
      if (fileUrl) {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture_url: fileUrl })
        });
        const res = await response.json();
        
        if (res.success) {
          setProfile((prev: any) => ({ ...prev, profile_picture: fileUrl }));
          setFormData((prev: any) => ({ ...prev, profile_picture: fileUrl }));
          const userStr = sessionStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            user.profile_picture = fileUrl;
            sessionStorage.setItem("user", JSON.stringify(user));
            window.dispatchEvent(new Event("userProfileUpdated"));
          }
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
        setFormData((prev: any) => ({ ...prev, profile_picture: "", profile_image: "" }));
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateFeesManagerProfile(formData);
      if (res.success) {
        showSuccessAlert("Success", "Profile updated");
        setEditing(false);
        await fetchProfile();
      } else {
        showErrorAlert("Error", res.message || "Failed to save profile");
      }
    } catch (err) {

      showErrorAlert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      showErrorAlert("Missing fields", "Please fill all password fields");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showErrorAlert("Password mismatch", "New passwords don't match");
      return;
    }
    if (passwordData.current_password === passwordData.new_password) {
      showErrorAlert("Invalid new password", "New password must differ from current");
      return;
    }

    try {
      const res = await changeFeesManagerPassword(passwordData);
      if (res.success) {
        setShowPasswordDialog(false);
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        showSuccessAlert("Password changed", "Your password has been updated successfully.");
      } else {
        showErrorAlert("Error", res.message || "Failed to change password");
      }
    } catch (err) {

      showErrorAlert("Error", "Network error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-start">
        <Card className="w-full">
          <CardHeader className="px-6 py-4 border-b">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-8">
              <div className="col-span-1 flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-6">
                <Skeleton className="h-10 w-24" />
                <SkeletonForm fields={6} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>);

  }


  return (
    <div id="feesmanager-profile-container" className="flex justify-center items-start">
      <Card id="feesmanager-profile-card" className={`w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id="feesmanager-profile-header" className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle>Fees Manager Profile</CardTitle>
            <p className="text-sm sm:text-sm mt-2 text-gray-500">Manage your account and contact details</p>
          </div>

          <div className="flex flex-row items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              size="sm"
              onClick={() => { if (editing) handleSave(); else setEditing(true); }}
              variant="outline"
              className={`flex-1 sm:flex-none w-full sm:w-auto text-sm text-white border transition-colors ${
                editing 
                  ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 hover:text-white' 
                  : 'bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white'
              }`}
              disabled={loading}>
              {editing ? loading ? 'Saving Profile...' : 'Save Profile' : 'Edit Profile'}
            </Button>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none w-full sm:w-auto text-md sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_password">Current Password</Label>
                    <div className="relative">
                      <Input id="current_password" type={showPasswords.current ? 'text' : 'password'} value={passwordData.current_password} onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPasswords((s) => ({ ...s, current: !s.current }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle current password">
                        {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Input id="new_password" type={showPasswords.next ? 'text' : 'password'} value={passwordData.new_password} onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPasswords((s) => ({ ...s, next: !s.next }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle new password">
                        {showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="confirm_password" type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirm_password} onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle confirm password">
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
                    <AvatarImage src={(profile as any)?.profile_picture || (profile as any)?.profile_image || undefined} alt={`${formData.first_name} ${formData.last_name}`} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-lg sm:text-2xl font-semibold">
                      {(formData.first_name?.[0] || '') + (formData.last_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  {(editing || !(profile as any)?.profile_picture) && (
                    <label 
                      htmlFor="feesmanager-profile-picture-upload" 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white cursor-pointer"
                    >
                      <Camera className="h-5 w-5 mb-1 transform scale-75 group-hover:scale-100 group-hover:animate-bounce transition-transform duration-300" />
                      <span className="text-[9px] font-semibold tracking-wider uppercase">Change</span>
                    </label>
                  )}
                </div>
                {(editing || !(profile as any)?.profile_picture) && (
                  <label 
                    htmlFor="feesmanager-profile-picture-upload" 
                    className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-lg md:hidden"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                )}
                {editing && (profile as any)?.profile_picture && (
                  <button onClick={handleDeleteProfilePicture} className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-lg" title="Remove Photo">
                    <Trash className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input id="feesmanager-profile-picture-upload" type="file" accept="image/*" onChange={handleProfilePictureSelect} className="hidden" />
              {isUploading && (
                <div className="w-full max-w-[150px] mb-3">
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-[10px] text-center mt-1 text-muted-foreground">Uploading...</p>
                </div>
              )}
              <div className="text-xl sm:text-xl font-semibold text-center mb-1">{formData.first_name} {formData.last_name}</div>
              <div className={`text-md sm:text-md mb-4 sm:mb-6 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Fees Manager</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-sm sm:text-sm font-semibold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</span>
                      <span className={`text-sm sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.email || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</span>
                      <span className={`text-sm sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.phone || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('details')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-md sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'details' ? 'bg-primary text-white shadow-sm' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Details</button>
                <button onClick={() => setActiveTab('activity')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-md sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'activity' ? 'bg-primary text-white shadow-sm' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Login Activity</button>
                <button onClick={() => setActiveTab('settings')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-md sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'settings' ? 'bg-primary text-white shadow-sm' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Settings</button>
                <button onClick={() => setActiveTab('integrations')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-md sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'integrations' ? 'bg-primary text-white shadow-sm' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Integrations</button>
                <button onClick={() => setActiveTab('help')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-md sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'help' ? 'bg-primary text-white shadow-sm' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Help & Learning</button>
              </div>

              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {activeTab === 'details' && (
                  <div className="space-y-4 sm:space-y-5 md:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                      <div>
                        <Label htmlFor="first_name" className="text-md sm:text-sm">First Name</Label>
                        <Input id="first_name" value={formData.first_name} disabled={true} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="text-md sm:text-sm h-10 sm:h-9 md:h-10 w-full" />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-md sm:text-sm">Last Name</Label>
                        <Input id="last_name" value={formData.last_name} disabled={true} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="text-md sm:text-sm h-10 sm:h-9 md:h-10 w-full" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="email" className="text-md sm:text-sm">Email</Label>
                        <Input id="email" value={formData.email} disabled={true} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="text-md sm:text-sm h-10 w-full" />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-md sm:text-sm">Mobile</Label>
                        <Input id="phone" value={formData.phone} disabled={!editing} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="text-md sm:text-sm h-10 w-full" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-md sm:text-sm">Address</Label>
                      <Textarea id="address" rows={3} value={formData.address} disabled={!editing} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="text-md sm:text-sm w-full" />
                    </div>

                    <div>
                      <Label htmlFor="bio" className="text-md sm:text-sm">Bio</Label>
                      <Textarea id="bio" rows={4} value={formData.bio} disabled={!editing} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="text-md sm:text-sm w-full" />
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div>
                    <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Login Activity</h3>
                    <div className="mt-3">
                      <LoginActivity />
                    </div>
                  </div>
                )}

                {activeTab === 'help' && (
                  <div className="animate-in fade-in duration-300">
                    <HelpLearningCard />
                  </div>
                )}

                {activeTab === 'settings' && (
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
                )}

                {activeTab === 'integrations' && (
                  <div className="animate-in fade-in duration-300">
                    <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Integrations</h3>
                    <GoogleIntegrationTab 
                      googleConnected={googleConnected}
                      setGoogleConnected={setGoogleConnected}
                      googleConnectLoading={googleConnectLoading}
                    />
                  </div>
                )}

              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

};

export default FeesManagerProfile;