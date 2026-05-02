import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { SkeletonCard } from "../ui/skeleton";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

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
}

const WardenProfile = ({ user: propUser, setError }: { user?: User; setError?: (error: string | null) => void }) => {
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
  });
  const [error, setLocalError] = useState<string | null>(null);
  const { theme } = useTheme();
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  // ref used to skip one fetch immediately after a successful PATCH
  const skipFetch = useRef(false);
  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'about'>('personal');

  useEffect(() => {
    const fetchProfile = async () => {
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
          const userData = localStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.user_id) {
              currentUser = {
                user_id: parsedUser.user_id,
                username: parsedUser.username || parsedUser.first_name || "",
                email: parsedUser.email || "",
                role: parsedUser.role || "warden",
              };
              setFetchedUser(currentUser);
            } else {
              throw new Error("User ID not found in local storage");
            }
          } else {
            throw new Error("No user data found");
          }
        } catch (err) {
          console.error("User Fetch Error:", err);
          const message = "Authentication failed. Please log in again.";
          if (setError) setError(message);
          setLocalError(message);
          showErrorAlert("Error", message);
          setTimeout(() => (window.location.href = "/login"), 2000);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setLocalError(null);
      if (setError) setError(null);
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`);
        const result = await response.json();

        if (result.success && result.profile) {
          const payload = result.profile;
          const fetchedProfile: Profile = {
            first_name: payload.first_name || "",
            last_name: payload.last_name || "",
            email: payload.email || payload.username || "",
            mobile_number: payload.mobile_number || payload.mobile || "",
            address: payload.address || "",
            bio: payload.bio || "",
            designation: payload.designation || "Hostel Warden",
          };
          setProfile(fetchedProfile);
        } else {
          const message = result.message || "Failed to fetch profile";
          setLocalError(message);
          showErrorAlert("Error", message);
        }
      } catch (err) {
        console.error("Fetch Profile Error:", err);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        setLocalError("Invalid email format");
        showErrorAlert("Error", "Invalid email format");
        setLoading(false);
        return;
      }

      // set skip flag to avoid immediate refetch triggered elsewhere
      skipFetch.current = true;
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await response.json();

      if (result.success && result.data) {
        const updatedProfile: Profile = {
          first_name: result.data.first_name || "",
          last_name: result.data.last_name || "",
          email: result.data.email || "",
          mobile_number: result.data.mobile_number || "",
          address: result.data.address || "",
          bio: result.data.bio || "",
          designation: result.data.designation || profile.designation,
        };
        setProfile(updatedProfile);
        showSuccessAlert("Success", "Profile saved successfully");
        localStorage.setItem("user", JSON.stringify({
          ...JSON.parse(localStorage.getItem("user") || "{}"),
          ...result.data,
          user_id: currentUser.user_id,
        }));
        setEditing(false);
      } else {
        const message = result.message || "Failed to save profile";
        if (setError) setError(message);
        setLocalError(message);
        showErrorAlert("Error", message);
      }
    } catch (err) {
      console.error("Save Profile Error:", err);
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

  if (loading && !profile.first_name) {
    return (
      <div className="flex justify-center items-start p-6">
        <SkeletonCard className="w-full max-w-4xl h-[500px]" />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                <Input id="first_name" name="first_name" value={profile.first_name} onChange={handleChange} disabled={!editing || loading} placeholder="First name" className="text-sm h-9 sm:h-10 w-full" />
              </div>
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                <Input id="last_name" name="last_name" value={profile.last_name} onChange={handleChange} disabled={!editing || loading} placeholder="Last name" className="text-sm h-9 sm:h-10 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
                <Input id="email" name="email" value={profile.email} onChange={handleChange} disabled={!editing || loading} placeholder="Email address" className="text-sm h-9 sm:h-10 w-full" />
              </div>
              <div>
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
                <Input id="mobile_number" name="mobile_number" value={profile.mobile_number} onChange={handleChange} disabled={!editing || loading} maxLength={10} placeholder="10-digit mobile" className="text-sm h-9 sm:h-10 w-full" />
              </div>
            </div>
            
            <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</label>
                <Input id="designation" name="designation" value={profile.designation} onChange={handleChange} disabled={!editing || loading} placeholder="Designation" className="text-sm h-9 sm:h-10 w-full" />
            </div>
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
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto my-2 ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-lg sm:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile Information</CardTitle>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            {editing && (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); }}>
                Cancel
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => { if (editing) handleSaveProfile(); else setEditing(true); }}
              variant="outline"
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
              disabled={loading}
            >
              {editing ? (loading ? 'Saving...' : 'Save') : 'Edit Profile'}
            </Button>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-sm px-3 sm:px-4 py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
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

        <CardContent className="px-6 pb-6 pt-2 space-y-8">
          {error && <div className={`text-red-500 text-center`}>{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 mt-4 flex-shrink-0`}>
                {(profile.first_name && profile.first_name[0]) || ''}{(profile.last_name && profile.last_name[0]) || ''}
              </div>

              <div className="text-base sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Warden</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
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
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
                <button onClick={() => setActiveTab('contact')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'contact' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Contact & Bio</button>
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

export default WardenProfile;
