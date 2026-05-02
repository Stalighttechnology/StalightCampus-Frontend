import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Eye, EyeOff, BookOpen } from "lucide-react";
import Swal from "sweetalert2";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { SkeletonCard, SkeletonPageHeader } from "../ui/skeleton";

interface DeanProfileShape {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
  date_joined: string;
  last_login?: string;
  is_active: boolean;
  role: string;
  profile_image?: string;
  department?: string;
  designation: string;
}

const DeanProfile = () => {
  const [profile, setProfile] = useState<DeanProfileShape | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'personal' | 'contact'>('personal');

  const getInitials = (p: DeanProfileShape) => {
    const fn = p.first_name || "";
    const ln = p.last_name || "";
    return `${(fn[0] || "").toUpperCase()}${(ln[0] || "").toUpperCase()}`;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`, {
        method: 'GET',
      });
      const result = await response.json();
      console.debug('DeanProfile /profile/ response:', result);
      if (result.success) {
        const profileData = result.profile || result.data;
        setProfile(profileData);
        setFormData({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          email: profileData.email || "",
          phone_number: profileData.phone_number || "",
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
        showSuccessAlert("Success", "Profile updated successfully!");
        setEditing(false);
        await fetchProfile();
      } else {
        showErrorAlert("Error", result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showErrorAlert("Error", "Network error");
    }
  };

  const handleChangePassword = async () => {
    // Require all fields before running other validations
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
        showSuccessAlert("Password changed", "Your password has been updated successfully.");
      } else {
        showErrorAlert("Unable to change password", result.message || "Failed to change password");
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showErrorAlert("Unable to change password", "Failed to change password");
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    Swal.fire({
      title: 'Discard changes?',
      text: 'Any unsaved changes will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Discard',
      cancelButtonText: 'Keep editing',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        setEditing(false);
        setFormData({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          phone_number: profile.phone_number || "",
          address: profile.address || "",
        });
      }
    });
  };

  if (loading) {
    return (
      <div className={`${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        <SkeletonPageHeader />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="md:col-span-3 h-96" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
        <div className="flex-1 min-w-0">
          <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            Profile
          </CardTitle>
          <p className="text-xs sm:text-sm mt-1 text-gray-500">Manage your dean profile and account settings</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
          {editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setEditing(false);
                setFormData({
                  first_name: profile.first_name || "",
                  last_name: profile.last_name || "",
                  email: profile.email || "",
                  phone_number: profile.phone_number || "",
                  address: profile.address || "",
                });
              }}>
                Cancel
              </Button>
              <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90" onClick={handleUpdateProfile}>Save Changes</Button>
            </div>
          ) : (
            <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90" onClick={() => setEditing(true)}>Edit Profile</Button>
          )}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                    >
                      {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      aria-label={showPasswords.next ? "Hide new password" : "Show new password"}
                    >
                      {showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
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
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 flex-shrink-0`}>
              {(profile.first_name && profile.first_name[0]) || ""}{(profile.last_name && profile.last_name[0]) || ""}
            </div>
            <div className="text-base sm:text-lg font-semibold text-center sm:text-left mb-1">{profile.first_name} {profile.last_name}</div>
            <div className={`text-xs sm:text-sm mb-4 sm:mb-6 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{profile.designation}</div>

            <div className="w-full mt-4 sm:mt-6 flex-1 flex flex-col">
              <h4 className={`text-xs sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
              <div className={`border rounded-lg p-2.5 sm:p-4 flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 h-full">
                  <div className="flex flex-col justify-start overflow-hidden">
                    <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email ID</span>
                    <Badge variant="secondary" className="w-fit max-w-full text-xs px-2.5 py-1 rounded-2xl bg-primary/10 text-primary border-none shadow-none truncate">{profile.email || '—'}</Badge>
                  </div>
                  <div className="flex flex-col justify-start">
                    <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</span>
                    <Badge variant="secondary" className="w-fit text-xs px-2.5 py-1 rounded-2xl bg-primary/10 text-primary border-none shadow-none">{profile.designation || '—'}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
            <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md transition-all font-medium whitespace-nowrap ${activeTab === 'personal'
                  ? 'bg-primary text-white shadow-sm'
                  : theme === 'dark' ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md transition-all font-medium whitespace-nowrap ${activeTab === 'contact'
                  ? 'bg-primary text-white shadow-sm'
                  : theme === 'dark' ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Contact
              </button>
            </div>

            <div className={`p-4 sm:p-6 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-200'}`}>
              {activeTab === 'personal' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="first_name" className="text-sm font-semibold">First Name</Label>
                        {editing ? (
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="bg-background"
                          />
                        ) : (
                          <p className={`text-sm p-2.5 rounded-lg border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>{profile.first_name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="last_name" className="text-sm font-semibold">Last Name</Label>
                        {editing ? (
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            className="bg-background"
                          />
                        ) : (
                          <p className={`text-sm p-2.5 rounded-lg border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>{profile.last_name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Academic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2 overflow-hidden">
                        <Label className="text-sm font-semibold">Email ID</Label>
                        <p className={`text-sm p-2.5 rounded-lg border truncate ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>{profile.email || '—'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Designation</Label>
                        <p className={`text-sm p-2.5 rounded-lg border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>{profile.designation || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Communication
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                        {editing ? (
                          <Input
                            id="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="bg-background"
                          />
                        ) : (
                          <p className={`text-sm p-2.5 rounded-lg border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>{profile.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone_number" className="text-sm font-semibold">Phone Number</Label>
                        {editing ? (
                          <Input
                            id="phone_number"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            className="bg-background"
                          />
                        ) : (
                          <p className={`text-sm p-2.5 rounded-lg border ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>{profile.phone_number || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Address Details
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-semibold">Residential Address</Label>
                      {editing ? (
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="bg-background min-h-[100px]"
                        />
                      ) : (
                        <p className={`text-sm p-2.5 rounded-lg border min-h-[100px] ${theme === 'dark' ? 'bg-background/50 border-border' : 'bg-white border-gray-200'}`}>
                          {profile.address || 'No address provided'}
                        </p>
                      )}
                    </div>
                  </div>


                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeanProfile;
