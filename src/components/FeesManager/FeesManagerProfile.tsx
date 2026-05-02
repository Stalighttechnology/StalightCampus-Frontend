import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { 
  getFeesManagerProfile, 
  updateFeesManagerProfile, 
  changeFeesManagerPassword 
} from "../../utils/fees_manager_api";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard,
  SkeletonForm
} from "@/components/ui/skeleton";


const FeesManagerProfile: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", phone: "", address: "", bio: "" });

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
          bio: p.bio || "",
        });
      } else {
        showErrorAlert("Error", res.message || "Failed to load profile");
      }
    } catch (err) {
      console.error("FeesManager fetch error", err);
      showErrorAlert("Error", "Network error");
    } finally {
      setLoading(false);
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
      console.error("Save error", err);
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
      console.error("Change password error", err);
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
      </div>
    );
  }


  return (
    <div className="flex justify-center items-start">
      <Card className={`w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-lg ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Fees Manager Profile</CardTitle>
            <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage your account and contact details</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            {editing && (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setFormData({ first_name: profile.first_name || "", last_name: profile.last_name || "", email: profile.email || "", phone: profile.phone_number || profile.mobile_number || "", address: profile.address || "", bio: profile.bio || "" }); }}>
                Cancel
              </Button>
            )}

            <Button size="sm" onClick={() => { if (editing) handleSave(); else setEditing(true); }} variant="outline" className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white" disabled={loading}>
              {editing ? 'Save' : 'Edit Profile'}
            </Button>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
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
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 mt-4 flex-shrink-0`}>{(formData.first_name?.[0] || '') + (formData.last_name?.[0] || '')}</div>
              <div className="text-base sm:text-lg font-semibold text-center mb-1">{formData.first_name} {formData.last_name}</div>
              <div className={`text-xs sm:text-sm mb-4 sm:mb-6 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Fees Manager</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-xs sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</span>
                      <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.email || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</span>
                      <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{formData.phone || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => {/* single tab only for simplicity */}} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${'bg-primary text-white'}`}>Details</button>
              </div>

              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input id="first_name" value={formData.first_name} disabled={!editing} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full" />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input id="last_name" value={formData.last_name} disabled={!editing} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={formData.email} disabled={!editing} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="text-xs sm:text-sm h-8 sm:h-10 w-full" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Mobile</Label>
                      <Input id="phone" value={formData.phone} disabled={!editing} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="text-xs sm:text-sm h-8 sm:h-10 w-full" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" rows={3} value={formData.address} disabled={!editing} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="text-xs sm:text-sm w-full" />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" rows={4} value={formData.bio} disabled={!editing} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="text-xs sm:text-sm w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeesManagerProfile;
