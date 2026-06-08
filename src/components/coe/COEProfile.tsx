import { Switch } from "@/components/ui/switch";
import { requestForToken } from "@/lib/firebase";
import React, { useEffect, useRef, useState } from "react";
import HelpLearningCard from "../common/HelpLearningCard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Calendar, Eye, EyeOff, Camera , Trash} from 'lucide-react';
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonCard } from '../ui/skeleton';
import Swal from "sweetalert2";
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import LoginActivity from '../common/LoginActivity';
import { uploadFileViaBackendProxy } from "../../utils/common_api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Progress } from "../ui/progress";

interface COEProfile {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  mobile_number?: string;
  address?: string;
  date_joined: string;
  last_login?: string;
  is_active: boolean;
  role: string;
  profile_picture?: string;
  department?: string;
  designation?: string;
}

const COEProfile = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const [profile, setProfile] = useState<COEProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "contact" | "activity" | "help" | "settings">("personal");
  const [notificationsEnabled, setNotificationsEnabled] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('hasSeenPwaWizard') !== null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: ""
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
        method: 'GET'
      });
      const result = await response.json();
      if (result.success) {
        const profileData = result.profile || result.data;
        setProfile(profileData);
        setFormData({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          email: profileData.email || "",
          phone_number: profileData.phone_number || profileData.mobile_number || "",
          address: profileData.address || ""
        });
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.success) {
        setEditing(false);
        await fetchProfile();
      }
    } catch (error) {

    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || profile.mobile_number || "",
        address: profile.address || ""
      });
    }
    setEditing(false);
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
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Profile picture must be less than 50KB',
        target: passwordDialogContentRef.current ?? document.body
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const fileUrl = await uploadFileViaBackendProxy(file, 'profiles');
      setUploadProgress(90);
      if (fileUrl) {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture_url: fileUrl })
        });
        const result = await response.json();
        
        if (result.success) {
          setProfile(prev => prev ? { ...prev, profile_picture: fileUrl } : null);
          const user = JSON.parse(sessionStorage.getItem("user") || '{}');
          user.profile_picture = fileUrl;
          sessionStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("userProfileUpdated"));
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Profile picture updated!',
            target: passwordDialogContentRef.current ?? document.body
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message || "Failed to update profile picture",
            target: passwordDialogContentRef.current ?? document.body
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Upload failed",
        target: passwordDialogContentRef.current ?? document.body
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      Swal.fire({
        icon: "error",
        title: "Password mismatch",
        text: "New passwords don't match",
        target: passwordDialogContentRef.current ?? document.body
      });
      return;
    }

    if (passwordData.current_password === passwordData.new_password) {
      Swal.fire({
        icon: "error",
        title: "Invalid new password",
        text: "Current password and new password cannot be the same.",
        target: passwordDialogContentRef.current ?? document.body
      });
      return;
    }

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
        Swal.fire({
          icon: "success",
          title: "Password changed",
          text: "Your password has been updated successfully.",
          target: passwordDialogContentRef.current ?? document.body
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Unable to change password",
          text: result.message || "Failed to change password",
          target: passwordDialogContentRef.current ?? document.body
        });
      }
    } catch (error) {

      Swal.fire({
        icon: "error",
        title: "Unable to change password",
        text: "Failed to change password",
        target: passwordDialogContentRef.current ?? document.body
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <SkeletonCard className="w-full h-[400px]" />
      </div>);

  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>);

  }

  return (
    <Card ref={ref} id="coe-profile-container" className={`w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader id="coe-profile-card" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-xl sm:text-xl md:text-2xl font-semibold">COE Profile</CardTitle>
          <p className={`text-[16px] sm:text-sm mt-1 line-clamp-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage your profile and account details</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
          <Button
            className="text-[16px] sm:text-md px-3 sm:px-4 py-1.5 sm:py-2 h-12 sm:h-auto bg-primary text-white border-primary hover:bg-primary/90"
            onClick={() => {
              if (editing) {
                handleUpdateProfile();
              } else {
                setEditing(true);
              }
            }}>
            
            {editing ? 'Save' : 'Edit Profile'}
          </Button>
          {editing &&
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="text-[16px] sm:text-md px-3 sm:px-4 py-1.5 sm:py-2 h-12 sm:h-auto">
              Cancel
            </Button>
          }

          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button className="text-[16px] sm:text-md px-3 sm:px-4 py-1.5 sm:py-2 h-12 sm:h-auto bg-primary text-white border-primary hover:bg-primary/90">
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current_password" className="text-[16px] sm:text-sm font-semibold">Current Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="current_password"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="pr-10 h-12 text-[18px] sm:text-sm" />
                    
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.current ? "Hide current password" : "Show current password"}>
                      
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_password" className="text-[16px] sm:text-sm font-semibold">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="new_password"
                      type={showPasswords.next ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="pr-10 h-12 text-[18px] sm:text-sm" />
                    
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.next ? "Hide new password" : "Show new password"}>
                      
                      {showPasswords.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password" className="text-[16px] sm:text-sm font-semibold">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirm_password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="pr-10 h-12 text-[18px] sm:text-sm" />
                    
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}>
                      
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" className="h-12 sm:h-auto text-[18px] sm:text-sm" onClick={() => setShowPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button className="h-12 sm:h-auto text-[18px] sm:text-sm font-medium bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleChangePassword}>
                    Change Password
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-stretch">
          <div className="col-span-1 flex flex-col items-center h-full">
            <div className="relative mb-3 sm:mb-4 mt-4 flex-shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 shadow-sm border border-gray-100 dark:border-gray-800">
                <AvatarImage src={profile.profile_picture || undefined} alt={`${profile.first_name} ${profile.last_name}`} className="object-cover" />
<AvatarFallback className="bg-primary text-white text-lg sm:text-2xl font-semibold">
                    {(profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")}
                  </AvatarFallback>
              </Avatar>
              {(editing || !profile?.profile_picture) && (
<label 
                htmlFor="profile-picture-upload" 
                className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-1.5 rounded-full cursor-pointer transition-colors shadow-lg"
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

            <div className="text-md sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
            <div className={`text-md sm:text-md mb-4 sm:mb-6 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Controller of Examinations</div>

            <div className="w-full mt-4 sm:mt-6 flex-1 flex flex-col">
              <h4 className={`text-[16px] sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
              <div className={`border rounded-lg p-2.5 sm:p-4 flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 h-full">
                  <div className="flex flex-col justify-start">
                    <span className={`text-[16px] sm:text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Role</span>
                    <span className={`text-[18px] sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.role || '—'}</span>
                  </div>
                  <div className="flex flex-col justify-start">
                    <span className={`text-[16px] sm:text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</span>
                    <span className={`text-[18px] sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.designation || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full custom-scrollbar">
            <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
              <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[15px] sm:text-md rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
              <button onClick={() => setActiveTab('contact')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[15px] sm:text-md rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'contact' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Contact</button>
                <button onClick={() => setActiveTab('settings')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[15px] sm:text-md rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'settings' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Settings</button>
                <button onClick={() => setActiveTab('help')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[15px] sm:text-md rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'help' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Help & Learning</button>
              <button onClick={() => setActiveTab('activity')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[15px] sm:text-md rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'activity' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Login Activity</button>
            </div>

            <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
              {activeTab === 'personal' &&
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                    <div>
                      <Label htmlFor="first_name" className={`block text-[16px] sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</Label>
                      <Input
                      id="first_name"
                      value={formData.first_name}
                      disabled={true}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="text-[18px] sm:text-sm h-12 sm:h-9 md:h-10 w-full" />
                    
                    </div>
                    <div>
                      <Label htmlFor="last_name" className={`block text-[16px] sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</Label>
                      <Input
                      id="last_name"
                      value={formData.last_name}
                      disabled={true}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="text-[18px] sm:text-sm h-12 sm:h-9 md:h-10 w-full" />
                    
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="username_view" className={`block text-[16px] sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Username</Label>
                    <Input id="username_view" value={profile.username} disabled className="text-[18px] sm:text-sm h-12 sm:h-9 md:h-10 w-full" />
                  </div>
                </div>
              }

              {activeTab === 'contact' &&
              <div className="space-y-4 sm:space-y-5">
                  <div>
                    <Label htmlFor="email" className={`block text-[16px] sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</Label>
                    <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled={true}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="text-[18px] sm:text-sm h-12 sm:h-10" />
                  
                  </div>
                  <div>
                    <Label htmlFor="phone_number" className={`block text-[16px] sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Phone Number</Label>
                    <Input
                    id="phone_number"
                    value={formData.phone_number}
                    disabled={!editing}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="text-[18px] sm:text-sm h-12 sm:h-10" />
                  
                  </div>
                  <div>
                    <Label htmlFor="address" className={`block text-[16px] sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</Label>
                    <Textarea
                    id="address"
                    rows={3}
                    value={formData.address}
                    disabled={!editing}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="text-[18px] sm:text-sm" />
                  
                  </div>
                </div>
              }

              
                {activeTab === 'help' && (
                  <div className="animate-in fade-in duration-300">
                    <HelpLearningCard />
                  </div>
                )}
{activeTab === 'activity' && 
                <div>
                  <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Login Activity</h3>
                  <div>
                    <LoginActivity />
                  </div>
                </div>
              }
              {activeTab === 'settings' && (
                <div className="animate-in fade-in duration-300">
                  <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Settings</h3>
                  <div className={`flex items-center justify-between p-4 border rounded-lg ${theme === 'dark' ? 'bg-card border-input' : 'bg-white border-gray-200'}`}>
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Push Notifications</Label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Receive real-time alerts for attendance, leaves, exams, and more.</p>
                    </div>
                    <Switch checked={notificationsEnabled} onCheckedChange={async (checked) => {
                      try {
                        setNotificationsEnabled(checked);
                        const userToken = sessionStorage.getItem('token') || localStorage.getItem('token');
                        if (checked) {
                          const token = await requestForToken();
                          if (token && userToken) {
                            await fetch(`${API_ENDPOINT}/profile/register-device/`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
                              body: JSON.stringify({ fcm_token: token, device_type: 'web' })
                            });
                            showSuccessAlert('Success', 'Push notifications enabled!');
                          }
                        } else {
                          const token = await requestForToken();
                          if (token && userToken) {
                            await fetch(`${API_ENDPOINT}/profile/unregister-device/`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
                              body: JSON.stringify({ fcm_token: token })
                            });
                            showSuccessAlert('Disabled', 'Push notifications disabled.');
                          }
                        }
                      } catch (error) {
                        setNotificationsEnabled(!checked);
                        showErrorAlert('Error', 'Failed to update notification settings');
                      }
                    }} />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t mt-4">
                <div className="space-y-3 text-[16px] sm:text-sm text-muted-foreground">
                  {profile.last_login &&
                  <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 sm:h-4 sm:w-4" />
                      <span>Last Login: {new Date(profile.last_login).toLocaleString()}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>);

});

COEProfile.displayName = 'COEProfile';

export default COEProfile;