import { Switch } from "@/components/ui/switch";
import { requestForToken } from "@/lib/firebase";
import HelpLearningCard from "../common/HelpLearningCard";
import LoginActivity from "../common/LoginActivity";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff, Camera } from "lucide-react";
import { SkeletonCard } from "../ui/skeleton";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useHMSContext } from "../../context/HMSContext";
import { uploadFileViaBackendProxy } from "../../utils/common_api";

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
  designation?: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  address: string;
  bio: string;
  designation: string;
  profile_picture: string;
}

const HMSProfile = ({ user: propUser, setError }: { user?: User; setError?: (error: string | null) => void; }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    address: "",
    bio: "",
    designation: "",
    profile_picture: ""
  });
  const { theme } = useTheme();
  const { skeletonMode } = useHMSContext();
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const skipFetch = useRef(false);

  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'help' | 'settings' | 'activity'>('personal');
  const [notificationsEnabled, setNotificationsEnabled] = useState((typeof Notification !== 'undefined' && Notification.permission === 'granted') && localStorage.getItem('hasSeenPwaWizard') !== null);

  // Profile picture upload states
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const resetUpload = () => { setIsUploadingPicture(false); };

  useEffect(() => {
    const fetchProfile = async () => {
      if (skipFetch.current) {
        skipFetch.current = false;
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`);
        const result = await response.json();

        if (result.success && result.profile) {
          const payload = result.profile;
          setProfile({
            first_name: payload.first_name || "",
            last_name: payload.last_name || "",
            email: payload.email || "",
            mobile_number: payload.mobile_number || "",
            address: payload.address || "",
            bio: payload.bio || "",
            designation: payload.designation || "HMS Manager",
            profile_picture: payload.profile_picture ? (payload.profile_picture.startsWith('http') ? payload.profile_picture : `${API_ENDPOINT.replace('/api', '')}${payload.profile_picture}`) : ""
          });
        } else {
          showErrorAlert("Error", result.message || "Failed to fetch profile");
        }
      } catch (err) {

        showErrorAlert("Error", "Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [propUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (!profile.first_name.trim()) throw new Error("First name is required");
      if (!profile.email.trim()) throw new Error("Email is required");

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const result = await response.json();

      if (result.success) {
        showSuccessAlert("Success", "Profile saved successfully");
        setEditing(false);
        const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
        sessionStorage.setItem("user", JSON.stringify({ ...userData, ...result.data }));
      } else {
        showErrorAlert("Error", result.message || "Failed to save profile");
      }
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024) {
      showErrorAlert('Error', 'Profile picture must be less than 50KB');
      e.target.value = '';
      return;
    }
    uploadProfilePictureDirectly(file);
  };

  const uploadProfilePictureDirectly = async (file: File) => {
    try {
      setIsUploadingPicture(true);
      // Upload to R2 via backend proxy
      const fileUrl = await uploadFileViaBackendProxy(file, 'profiles');

      if (fileUrl) {
        // Finalize update with backend
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/upload-picture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture_url: fileUrl })
        });
        const result = await response.json();

        if (result?.success) {
          setProfile((p) => ({ ...p, profile_picture: fileUrl }));
          const currentUserData = JSON.parse(sessionStorage.getItem("user") || '{}');
          currentUserData.profile_picture = fileUrl;
          sessionStorage.setItem("user", JSON.stringify(currentUserData));
          showSuccessAlert('Success', 'Profile picture updated successfully!');
        } else {
          showErrorAlert('Error', result.message || 'Failed to update backend with new photo');
        }
      } else {
        showErrorAlert('Error', 'Failed to upload image to R2');
      }
    } catch (err) {
      console.error("Profile picture upload error:", err);
      showErrorAlert('Error', 'Failed to upload profile picture');
    } finally {
      resetUpload();
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

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      });
      const result = await response.json();
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        showSuccessAlert('Password changed', 'Updated successfully.');
      } else {
        showErrorAlert('Error', result.message || 'Failed to change password');
      }
    } catch (err) {
      showErrorAlert('Error', 'Failed to change password');
    }
  };

  const isSkeleton = loading && !profile.first_name || skeletonMode;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                {isSkeleton ?
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                  <Input name="first_name" value={profile.first_name} onChange={handleChange} disabled={true} placeholder="First name" className="text-sm h-9 sm:h-10 w-full" />
                }
              </div>
              <div className="w-full">
                <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                {isSkeleton ?
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                  <Input name="last_name" value={profile.last_name} onChange={handleChange} disabled={true} placeholder="Last name" className="text-sm h-9 sm:h-10 w-full" />
                }
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
                {isSkeleton ?
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                  <Input name="email" value={profile.email} onChange={handleChange} disabled={true} placeholder="Email address" className="text-sm h-9 sm:h-10 w-full" />
                }
              </div>
              <div>
                <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
                {isSkeleton ?
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                  <Input name="mobile_number" value={profile.mobile_number} onChange={handleChange} disabled={!editing} maxLength={10} placeholder="10-digit mobile" className="text-sm h-9 sm:h-10 w-full" />
                }
              </div>
            </div>

            <div className="w-full">
              <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</label>
              {isSkeleton ?
                <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                <Input name="designation" value={profile.designation} onChange={handleChange} disabled={!editing} placeholder="Designation" className="text-sm h-9 sm:h-10 w-full" />
              }
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
                    } else {
                      throw new Error('Permission denied or token missing');
                    }
                  } else {
                    const token = await requestForToken();
                    if (token && userToken) {
                      await fetch(`${API_ENDPOINT}/profile/unregister-device/`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
                        body: JSON.stringify({ fcm_token: token })
                      });
                      showInfoAlert('Disabled', 'Push notifications disabled for this device. You may also need to revoke permission in your browser settings.');
                    } else {
                      throw new Error('Permission denied or token missing');
                    }
                  }
                } catch (error) {
                  setNotificationsEnabled(!checked);
                  showErrorAlert('Error', 'Failed to update notification settings');
                }
              }} />
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="animate-in fade-in duration-300">
            <HelpLearningCard />
          </div>
        );
      case 'activity':
        return (
          <div>
            <h3 className={`font-semibold text-base mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Login Activity</h3>
            <div className="mt-3">
              <LoginActivity />
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</label>
              {isSkeleton ?
                <div className="h-20 w-full rounded-md bg-muted animate-pulse border" /> :

                <Textarea name="address" value={profile.address} onChange={handleChange} disabled={!editing} rows={3} className="text-sm w-full" />
              }
            </div>
            <div>
              <label className={`block text-[18px] sm:text-[16px] mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bio</label>
              {isSkeleton ?
                <div className="h-24 w-full rounded-md bg-muted animate-pulse border" /> :

                <Textarea name="bio" value={profile.bio} onChange={handleChange} disabled={!editing} rows={4} className="text-sm w-full" />
              }
            </div>
          </div>);

      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto my-2 ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id="hms-profile-card" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-2xl sm:text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>HMS Profile Information</CardTitle>
            <p className={`text-base sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your administrative profile</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            {editing &&
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            }
            <Button
              size="sm"
              onClick={() => editing ? handleSaveProfile() : setEditing(true)}
              variant="outline"
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white">

              {editing ? "Save" : "Edit Profile"}
            </Button>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-sm sm:text-md px-3 sm:px-4 py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        className="pr-10" />

                      <button type="button" onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))} className="absolute inset-y-0 right-0 px-3 text-muted-foreground">
                        {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.next ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="pr-10" />

                      <button type="button" onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))} className="absolute inset-y-0 right-0 px-3 text-muted-foreground">
                        {showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="pr-10" />

                      <button type="button" onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))} className="absolute inset-y-0 right-0 px-3 text-muted-foreground">
                        {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                    <Button className="bg-primary text-white" onClick={handleChangePassword}>Update</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center">
              <div className="relative mb-3 mt-3 sm:mb-4 flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  {profile.profile_picture ? (
                    <AvatarImage src={profile.profile_picture} alt={`${profile.first_name} ${profile.last_name}`} />
                  ) : (
                    <AvatarFallback>{(profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')}</AvatarFallback>
                  )}
                </Avatar>
                <label htmlFor="profile-picture-upload" className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg">
                  <Camera className="h-4 w-4" />
                </label>
                <input id="profile-picture-upload" type="file" accept="image/*" onChange={handleProfilePictureSelect} className="hidden" />
              </div>

              {isUploadingPicture && (
                <div className="mb-2 text-center w-full px-4">
                  <p className="text-xs text-gray-500 animate-pulse">Uploading...</p>
                </div>
              )}

              <div className="text-xl sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
              <div className={`text-base sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>HMS Manager</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className="text-sm font-semibold mb-2">Quick Info</h4>
                <div className={`border rounded-lg p-3 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-muted-foreground mb-1">Email</span>
                      <span className={`text-base break-all p-1.5 rounded-lg ${theme === 'dark' ? 'bg-accent' : 'bg-purple-100 text-purple-700'}`}>{profile.email || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-muted-foreground mb-1">Mobile</span>
                      <span className={`text-base p-1.5 rounded-lg ${theme === 'dark' ? 'bg-accent' : 'bg-purple-100 text-purple-700'}`}>{profile.mobile_number || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex gap-2 mb-4 border-b pb-2 overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-md transition-colors font-semibold text-base sm:text-sm whitespace-nowrap ${activeTab === 'personal' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}>Personal Info</button>
                <button onClick={() => setActiveTab('contact')} className={`px-4 py-2 rounded-md transition-colors font-semibold text-base sm:text-sm whitespace-nowrap ${activeTab === 'contact' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}>Contact & Bio</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md transition-colors font-semibold text-base sm:text-sm whitespace-nowrap ${activeTab === 'settings' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}>Settings</button>
                <button onClick={() => setActiveTab('help')} className={`px-4 py-2 rounded-md transition-colors font-semibold text-base sm:text-sm whitespace-nowrap ${activeTab === 'help' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}>Help & Learning</button>
                <button onClick={() => setActiveTab('activity')} className={`px-4 py-2 rounded-md transition-colors font-semibold text-base sm:text-sm whitespace-nowrap ${activeTab === 'activity' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}>Login Activity</button>
              </div>
              <div className={`p-4 sm:p-6 rounded-lg border min-h-[300px] ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {renderTabContent()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

};

export default HMSProfile;