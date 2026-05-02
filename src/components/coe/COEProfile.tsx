import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Calendar, Eye, EyeOff } from "lucide-react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useTheme } from "@/context/ThemeContext";
import Swal from "sweetalert2";

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
  const [activeTab, setActiveTab] = useState<"personal" | "contact">("personal");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
        method: 'GET',
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
          address: profileData.address || "",
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setEditing(false);
        await fetchProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || profile.mobile_number || "",
        address: profile.address || "",
      });
    }
    setEditing(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      Swal.fire({
        icon: "error",
        title: "Password mismatch",
        text: "New passwords don't match",
        target: passwordDialogContentRef.current ?? document.body,
      });
      return;
    }

    if (passwordData.current_password === passwordData.new_password) {
      Swal.fire({
        icon: "error",
        title: "Invalid new password",
        text: "Current password and new password cannot be the same.",
        target: passwordDialogContentRef.current ?? document.body,
      });
      return;
    }

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        Swal.fire({
          icon: "success",
          title: "Password changed",
          text: "Your password has been updated successfully.",
          target: passwordDialogContentRef.current ?? document.body,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Unable to change password",
          text: result.message || "Failed to change password",
          target: passwordDialogContentRef.current ?? document.body,
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Swal.fire({
        icon: "error",
        title: "Unable to change password",
        text: "Failed to change password",
        target: passwordDialogContentRef.current ?? document.body,
      });
    }
  };

  if (loading) {
    return <div className={`p-4 sm:p-6 text-center text-sm sm:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <Card ref={ref} className={`w-full max-w-none mx-auto my-2 sm:my-4 px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6 ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold line-clamp-2">COE Profile</CardTitle>
          <p className={`text-xs sm:text-sm mt-1 line-clamp-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage your profile and account details</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
          <Button
            className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90"
            onClick={() => {
              if (editing) {
                handleUpdateProfile();
              } else {
                setEditing(true);
              }
            }}
          >
            {editing ? 'Save' : 'Edit Profile'}
          </Button>
          {editing && (
            <button
              onClick={handleCancelEdit}
              className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 border rounded-md transition-colors ${theme === 'dark' ? 'border-muted-foreground text-muted-foreground hover:border-foreground hover:text-foreground' : 'border-gray-600 text-gray-600 hover:border-gray-900 hover:text-gray-900'}`}
            >
              Cancel
            </button>
          )}

          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">
                Change Password
              </Button>
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
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPasswords.next ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.next ? "Hide new password" : "Show new password"}
                    >
                      {showPasswords.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button className="font-medium bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleChangePassword}>
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
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 flex-shrink-0">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div className="text-base sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
            <div className={`text-xs sm:text-sm mb-4 sm:mb-6 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Controller of Examinations</div>

            <div className="w-full mt-4 sm:mt-6 flex-1 flex flex-col">
              <h4 className={`text-xs sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
              <div className={`border rounded-lg p-2.5 sm:p-4 flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 h-full">
                  <div className="flex flex-col justify-start">
                    <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Role</span>
                    <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.role || '—'}</span>
                  </div>
                  <div className="flex flex-col justify-start">
                    <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</span>
                    <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.designation || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
            <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
              <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
              <button onClick={() => setActiveTab('contact')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'contact' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Contact</button>
            </div>

            <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
              {activeTab === 'personal' && (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                    <div>
                      <Label htmlFor="first_name" className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        disabled={!editing}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name" className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        disabled={!editing}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="username_view" className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Username</Label>
                    <Input id="username_view" value={profile.username} disabled className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full" />
                  </div>
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <Label htmlFor="email" className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled={!editing}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_number" className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      disabled={!editing}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</Label>
                    <Textarea
                      id="address"
                      rows={3}
                      value={formData.address}
                      disabled={!editing}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t mt-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  {profile.last_login && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Last Login: {new Date(profile.last_login).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

COEProfile.displayName = 'COEProfile';

export default COEProfile;