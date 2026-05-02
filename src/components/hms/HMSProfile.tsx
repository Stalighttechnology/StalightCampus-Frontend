import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { SkeletonCard } from "../ui/skeleton";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useHMSContext } from "../../context/HMSContext";

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

const HMSProfile = ({ user: propUser, setError }: { user?: User; setError?: (error: string | null) => void }) => {
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
  const { theme } = useTheme();
  const { skeletonMode } = useHMSContext();
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const skipFetch = useRef(false);

  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'contact'>('personal');

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
          });
        } else {
          showErrorAlert("Error", result.message || "Failed to fetch profile");
        }
      } catch (err) {
        console.error("Fetch Profile Error:", err);
        showErrorAlert("Error", "Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [propUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (!profile.first_name.trim()) throw new Error("First name is required");
      if (!profile.email.trim()) throw new Error("Email is required");

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/update/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await response.json();

      if (result.success) {
        showSuccessAlert("Success", "Profile saved successfully");
        setEditing(false);
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...userData, ...result.data }));
      } else {
        showErrorAlert("Error", result.message || "Failed to save profile");
      }
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Network error");
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

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
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

  const isSkeleton = (loading && !profile.first_name) || skeletonMode;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                {isSkeleton ? (
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input name="first_name" value={profile.first_name} onChange={handleChange} disabled={!editing} placeholder="First name" className="text-sm h-9 sm:h-10 w-full" />
                )}
              </div>
              <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                {isSkeleton ? (
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input name="last_name" value={profile.last_name} onChange={handleChange} disabled={!editing} placeholder="Last name" className="text-sm h-9 sm:h-10 w-full" />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
                {isSkeleton ? (
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input name="email" value={profile.email} onChange={handleChange} disabled={!editing} placeholder="Email address" className="text-sm h-9 sm:h-10 w-full" />
                )}
              </div>
              <div>
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
                {isSkeleton ? (
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input name="mobile_number" value={profile.mobile_number} onChange={handleChange} disabled={!editing} maxLength={10} placeholder="10-digit mobile" className="text-sm h-9 sm:h-10 w-full" />
                )}
              </div>
            </div>

            <div className="w-full">
                <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Designation</label>
                {isSkeleton ? (
                  <div className="h-9 sm:h-10 w-full rounded-md bg-muted animate-pulse border" />
                ) : (
                  <Input name="designation" value={profile.designation} onChange={handleChange} disabled={!editing} placeholder="Designation" className="text-sm h-9 sm:h-10 w-full" />
                )}
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</label>
              {isSkeleton ? (
                <div className="h-20 w-full rounded-md bg-muted animate-pulse border" />
              ) : (
                <Textarea name="address" value={profile.address} onChange={handleChange} disabled={!editing} rows={3} className="text-sm w-full" />
              )}
            </div>
            <div>
              <label className={`block text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bio</label>
              {isSkeleton ? (
                <div className="h-24 w-full rounded-md bg-muted animate-pulse border" />
              ) : (
                <Textarea name="bio" value={profile.bio} onChange={handleChange} disabled={!editing} rows={4} className="text-sm w-full" />
              )}
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
            <CardTitle className={`text-lg sm:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>HMS Profile Information</CardTitle>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your administrative profile</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            {editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            )}
            <Button
              size="sm"
              onClick={() => editing ? handleSaveProfile() : setEditing(true)}
              variant="outline"
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              {editing ? "Save" : "Edit Profile"}
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
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        className="pr-10"
                      />
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
                        className="pr-10"
                      />
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
                        className="pr-10"
                      />
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
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 mt-4`}>
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
              <div className="text-base sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>HMS Manager</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className="text-sm font-bold mb-2">Quick Info</h4>
                <div className={`border rounded-lg p-3 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-muted-foreground">Email</span>
                      <span className={`text-sm break-all p-1.5 rounded-lg ${theme === 'dark' ? 'bg-accent' : 'bg-purple-100 text-purple-700'}`}>{profile.email || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-muted-foreground">Mobile</span>
                      <span className={`text-sm p-1.5 rounded-lg ${theme === 'dark' ? 'bg-accent' : 'bg-purple-100 text-purple-700'}`}>{profile.mobile_number || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex gap-2 mb-4 border-b pb-2 overflow-x-auto">
                <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-md transition-colors font-medium ${activeTab === 'personal' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'}`}>Personal</button>
                <button onClick={() => setActiveTab('contact')} className={`px-4 py-2 rounded-md transition-colors font-medium ${activeTab === 'contact' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'}`}>Contact & Bio</button>
              </div>
              <div className={`p-4 sm:p-6 rounded-lg border min-h-[300px] ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {renderTabContent()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HMSProfile;
