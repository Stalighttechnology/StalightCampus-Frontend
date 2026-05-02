import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Camera, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getFullStudentProfile } from "@/utils/student_api";
import { useStudentProfileUpdateMutation } from "@/hooks/useApiQueries";
import { useFileUpload } from "../../hooks/useOptimizations";
import { Progress } from "../ui/progress";
import { SkeletonForm } from "../ui/skeleton";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";

type StudentForm = Record<string, any>;

const StudentProfile: React.FC = () => {
  const { theme } = useTheme();
  const updateProfileMutation = useStudentProfileUpdateMutation();

  const [form, setForm] = useState<StudentForm>({
    user_id: "",
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    address: "",
    about: "",
    profile_picture: "",
    branch: "",
    department: "",
    semester: "",
    current_semester: "",
    year_of_study: "",
    section: "",
    usn: "",
    enrollment_year: "",
    expected_graduation: "",
    student_status: "",
    mode_of_admission: "",
    name: "",
    batch: "",
    course: "",
    date_of_admission: "",
    parent_name: "",
    parent_contact: "",
    emergency_contact: "",
    blood_group: "",
    proctor: {},
  });

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'face' | 'personal'>('profile');
  const [loading, setLoading] = useState(true);

  // password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  // face training
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [faceTrainingStatus, setFaceTrainingStatus] = useState<'idle' | 'training' | 'success' | 'error'>('idle');
  const [faceTrainingProgress, setFaceTrainingProgress] = useState(0);
  const [faceTrainingMessage, setFaceTrainingMessage] = useState('');
  const [hasFaceTrained, setHasFaceTrained] = useState(false);

  const {
    uploadFile: uploadProfilePicture,
    uploadProgress,
    isUploading: isUploadingPicture,
    reset: resetUpload,
  } = useFileUpload({
    maxSizeMB: 0.5,
    maxWidthOrHeight: 400,
    compressImages: true,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxFileSize: 2 * 1024 * 1024,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getFullStudentProfile();
        if (data?.success && data.profile) {
          const pd = data.profile;
          const newForm = { ...form } as StudentForm;
          Object.keys(pd).forEach((k) => {
            if (k === 'profile_picture' && pd[k]) {
              newForm[k] = pd[k].startsWith('http') ? pd[k] : `${API_ENDPOINT.replace('/api', '')}${pd[k]}`;
              return;
            }

            // backend may return mobile_number in other endpoints; normalize to `phone`
            if (k === 'mobile_number') {
              newForm['phone'] = pd[k] ?? "";
              return;
            }

            // normalize date_of_birth to ISO (YYYY-MM-DD) for <input type="date">
            if (k === 'date_of_birth' && pd[k]) {
              const raw = pd[k];
              let iso = raw;
              if (typeof raw === 'string') {
                const parts = raw.split('/');
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                } else {
                  const parsed = new Date(raw);
                  if (!isNaN(parsed.getTime())) iso = parsed.toISOString().slice(0, 10);
                }
              }
              newForm['date_of_birth'] = iso ?? "";
              return;
            }

            newForm[k] = pd[k] ?? "";
          });
          setForm(newForm);
        }
      } catch (err) {
        console.error('Failed to fetch student profile', err);
      }

      // check face status
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/student/check-face-status/`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
        const j = await resp.json();
        if (j.success) setHasFaceTrained(Boolean(j.has_face));
      } catch (err) {
        console.error('Failed to check face status', err);
      }
    };

    fetchProfile().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadProfilePictureDirectly(file);
  };

  const uploadProfilePictureDirectly = async (file: File) => {
    try {
      const result = await uploadProfilePicture(file, `${API_ENDPOINT}/profile/upload-picture`, {});
      if (result?.success && (result.profile_picture_url || result.url)) {
        const url = (result.profile_picture_url || result.url) as string;
        const fullUrl = url.startsWith('http') ? url : `${API_ENDPOINT.replace('/api', '')}${url}`;
        setForm((p) => ({ ...p, profile_picture: fullUrl }));
        const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
        currentUserData.profile_picture = fullUrl;
        localStorage.setItem('user', JSON.stringify(currentUserData));
        showSuccessAlert('Success', 'Profile picture uploaded successfully!');
      }
    } catch (err) {
      console.error('Upload failed', err);
      showErrorAlert('Error', 'Failed to upload profile picture');
    } finally {
      resetUpload();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement & HTMLTextAreaElement;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        mobile_number: form.phone,
        address: form.address,
        bio: form.about,
      });
      showSuccessAlert('Profile Updated', 'Your profile has been successfully updated.');
      setEditing(false);
    } catch (err) {
      console.error(err);
      showErrorAlert('Error', 'Failed to update profile');
    }
  };

  const handleFaceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
    if (faceImages.length + arr.length > 5) { showErrorAlert('Error', 'Maximum 5 images allowed'); return; }
    setFaceImages((p) => [...p, ...arr]);
  };

  const removeFaceImage = (index: number) => setFaceImages((p) => p.filter((_, i) => i !== index));

  const trainFace = async () => {
    if (faceImages.length < 3) { showErrorAlert('Error', 'Please upload at least 3 face images'); return; }
    setFaceTrainingStatus('training'); setFaceTrainingProgress(0); setFaceTrainingMessage('Preparing images...');
    try {
      const fd = new FormData();
      faceImages.forEach((f) => fd.append('images', f));
      setFaceTrainingProgress(25); setFaceTrainingMessage('Uploading images...');
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/student/train-face/`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }, body: fd });
      const j = await resp.json();
      setFaceTrainingProgress(75); setFaceTrainingMessage('Training face recognition...');
      if (j.success) { setFaceTrainingProgress(100); setFaceTrainingStatus('success'); setHasFaceTrained(true); setFaceImages([]); showSuccessAlert('Success', 'Face updated successfully!'); }
      else { setFaceTrainingStatus('error'); setFaceTrainingMessage(j.message || 'Face training failed'); showErrorAlert('Error', j.message || 'Face training failed'); }
    } catch (err) {
      console.error(err); setFaceTrainingStatus('error'); setFaceTrainingMessage('Network error occurred'); showErrorAlert('Error', 'Network error occurred');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) { showErrorAlert('Missing fields', 'Please fill all password fields'); return; }
    if (passwordData.new_password !== passwordData.confirm_password) { showErrorAlert('Password mismatch', 'New passwords do not match'); return; }
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwordData) });
      const j = await resp.json();
      if (j.success) { setShowPasswordDialog(false); setPasswordData({ current_password: '', new_password: '', confirm_password: '' }); showSuccessAlert('Password changed', 'Your password has been updated successfully.'); }
      else showErrorAlert('Unable to change password', j.message || 'Failed to change password');
    } catch (err) { console.error(err); showErrorAlert('Unable to change password', 'Network error'); }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50'}`}>
        <SkeletonForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`tracking-tight text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile</CardTitle>
            <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            <Button size="sm" onClick={() => { if (editing) handleSave(); else setEditing(true); }} className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">
              {editing ? (updateProfileMutation.isPending ? 'Saving...' : 'Save') : 'Edit Profile'}
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
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle current password visibility">{showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Input id="new_password" type={showPasswords.next ? 'text' : 'password'} value={passwordData.new_password} onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, next: !p.next }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle new password visibility">{showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="confirm_password" type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirm_password} onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle confirm password visibility">{showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
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
              <div className="relative mb-3 mt-3 sm:mb-4 flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  {form.profile_picture ? <AvatarImage src={form.profile_picture} alt={`${form.first_name} ${form.last_name}`} /> : <AvatarFallback>{(form.first_name?.[0] || '') + (form.last_name?.[0] || '')}</AvatarFallback>}
                </Avatar>
                <label htmlFor="profile-picture-upload" className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg"><Camera className="h-4 w-4" /></label>
                <input id="profile-picture-upload" type="file" accept="image/*" onChange={handleProfilePictureSelect} className="hidden" />
              </div>

              {isUploadingPicture && (
                <div className="mb-2 text-center">
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-xs text-gray-500">Uploading... {uploadProgress}%</p>
                  </div>
                </div>
              )}

              <div className="text-base sm:text-lg font-semibold text-center mb-1">{form.first_name} {form.last_name}</div>
              <div className={`text-xs sm:text-sm mb-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{form.username || form.email}</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-xs sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</span>
                      <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 bg-purple-100 text-purple-700`}>{form.branch || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Year</span>
                      <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 bg-purple-100 text-purple-700`}>{form.year_of_study || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('profile')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'profile' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Profile</button>
                <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
                <button onClick={() => setActiveTab('academic')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'academic' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Academic</button>
                <button onClick={() => setActiveTab('face')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'face' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Face Recognition</button>
              </div>

              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>First Name</Label>
                        <Input name="first_name" value={form.first_name} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Last Name</Label>
                        <Input name="last_name" value={form.last_name} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>USN</Label>
                        <Input name="usn" value={form.usn} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-gray-100 text-gray-500 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Email</Label>
                        <Input name="email" value={form.email} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Phone</Label>
                        <Input name="phone" value={form.phone} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Address</Label>
                      <Input name="address" value={form.address} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>About</Label>
                      <Textarea name="about" value={form.about} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                )}

                {activeTab === 'personal' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Date of Birth</Label>
                      <Input name="date_of_birth" type="date" value={form.date_of_birth || ''} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Blood Group</Label>
                      <Input name="blood_group" value={form.blood_group} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Parent Name</Label>
                      <Input name="parent_name" value={form.parent_name} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Parent Contact</Label>
                      <Input name="parent_contact" value={form.parent_contact} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Emergency Contact</Label>
                      <Input name="emergency_contact" value={form.emergency_contact} onChange={handleChange} readOnly={!editing} className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                )}

                {activeTab === 'academic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Current Semester</Label>
                      <Input value={form.current_semester} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Section</Label>
                      <Input value={form.section} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Enrollment Year</Label>
                      <Input value={form.enrollment_year || ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Expected Graduation</Label>
                      <Input value={form.expected_graduation || ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Proctor</Label>
                      <Input value={form.proctor ? (form.proctor.first_name || form.proctor.username ? `${form.proctor.first_name || ''} ${form.proctor.last_name || ''}`.trim() : form.proctor.username || '') : ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Student Status</Label>
                      <Input value={form.student_status || ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Mode of Admission</Label>
                      <Input value={form.mode_of_admission || ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Batch</Label>
                      <Input value={form.batch || ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>



                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Date of Admission</Label>
                      <Input value={form.date_of_admission ? (form.date_of_admission.length > 10 ? form.date_of_admission.slice(0, 10) : form.date_of_admission) : ''} readOnly className={`${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                )}

                {activeTab === 'face' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Face Recognition Training</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Upload 3-5 clear face photos to train the AI recognition system</p>
                    </div>

                    {hasFaceTrained && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700 dark:text-green-300">Face recognition is active for your account</span>
                      </div>
                    )}

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Upload Face Images</Label>
                      <div className="mt-2">
                        <input type="file" multiple accept="image/*" onChange={handleFaceImageSelect} className="hidden" id="face-images" />
                        <label htmlFor="face-images" className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload face images</p>
                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                          </div>
                        </label>
                      </div>

                      {faceImages.length > 0 && (
                        <div className="space-y-2">
                          <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Selected Images ({faceImages.length}/5)</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {faceImages.map((image, idx) => (
                              <div key={idx} className="relative">
                                <img src={URL.createObjectURL(image)} alt={`Face ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                                <button onClick={() => removeFaceImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {faceTrainingStatus !== 'idle' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {faceTrainingStatus === 'training' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
                            {faceTrainingStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {faceTrainingStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="text-sm">{faceTrainingMessage}</span>
                          </div>
                          {faceTrainingStatus === 'training' && <Progress value={faceTrainingProgress} className="w-full h-2" />}
                        </div>
                      )}

                      <div className="flex justify-center">
                        <Button onClick={trainFace} disabled={faceImages.length < 3 || faceTrainingStatus === 'training'} className="bg-primary hover:bg-primary/90 text-white">{faceTrainingStatus === 'training' ? 'Training...' : 'Train Face AI'}</Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="mt-4 bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={updateProfileMutation.isPending}>{updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfile;
