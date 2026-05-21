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
import { performR2Upload } from "../../utils/common_api";

type StudentForm = Record<string, any>;

const StudentProfile: React.FC = () => {
  const { theme } = useTheme();
  const updateProfileMutation = useStudentProfileUpdateMutation();

  const [form, setForm] = useState<StudentForm>({
    // Basic User Fields
    user_id: "",
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    address: "",
    bio: "",
    about: "",
    profile_picture: "",
    designation: "",
    
    // Student Fields
    name: "",
    usn: "",
    branch: "",
    batch: "",
    course: "",
    semester: "",
    current_semester: "",
    section: "",
    enrollment_year: "",
    expected_graduation: "",
    student_status: "",
    mode_of_admission: "",
    date_of_admission: "",
    year_of_study: "",
    department: "",
    proctor: {},
    
    // Personal Profile Fields
    preferred_name: "",
    nationality: "",
    religion: "",
    caste: "",
    marital_status: "",
    primary_language: "",
    alternate_mobile: "",
    personal_email: "",
    institutional_email: "",
    
    // Official IDs
    aadhaar_number: "",
    passport_number: "",
    pan_number: "",
    
    // Address Fields
    address_permanent: "",
    address_current: "",
    city: "",
    state: "",
    country: "",
    pin_code: "",
    
    // Social Links
    linkedin: "",
    github: "",
    portfolio: "",
    
    // Parent Details
    father_name: "",
    father_contact: "",
    mother_name: "",
    mother_contact: "",
    
    // Guardian Details
    guardian_name: "",
    guardian_relationship: "",
    guardian_phone: "",
    guardian_email: "",
    
    // Socio-economic
    occupation: "",
    income_range: "",
    
    // Medical Information
    blood_group: "",
    emergency_contact: "",
    allergies: "",
    disabilities: "",
    medical_history: "",
    medical_conditions: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile'|'personal'|'academic'|'face'>('profile');
  
  // Toggle states for Guardian Details and Address
  const [showGuardianDetails, setShowGuardianDetails] = useState(false);
  const [sameAsPermament, setSameAsPermament] = useState(false);

  // Face upload / training states
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [faceTrainingStatus, setFaceTrainingStatus] = useState<'idle'|'training'|'success'|'error'>('idle');
  const [faceTrainingProgress, setFaceTrainingProgress] = useState<number>(0);
  const [faceTrainingMessage, setFaceTrainingMessage] = useState<string>('');
  const [hasFaceTrained, setHasFaceTrained] = useState<boolean>(false);

  // Profile picture upload state
  const [isUploadingPicture, setIsUploadingPicture] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const resetUpload = () => { setIsUploadingPicture(false); setUploadProgress(0); };

  // Password dialog state
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  // Extended personal fields not previously exposed in the UI
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

            if (k === 'mobile_number') {
              newForm['phone'] = pd[k] ?? "";
              return;
            }

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
                  if (!isNaN(parsed.getTime())) iso = parsed.toLocaleDateString('sv-SE');
                }
              }
              newForm['date_of_birth'] = iso ?? "";
              return;
            }

            newForm[k] = pd[k] ?? "";
          });

          // Map structured/JSON fields into form-friendly fields
          try {
            if (pd.guardian) {
              const g = typeof pd.guardian === 'string' ? JSON.parse(pd.guardian) : pd.guardian;
              if (g) {
                newForm.guardian_name = g.name || g.full_name || newForm.guardian_name || '';
                newForm.guardian_relationship = g.relationship || newForm.guardian_relationship || '';
                newForm.guardian_phone = g.phone || g.mobile || '';
                newForm.guardian_email = g.email || '';
              }
            }
          } catch (e) {
            // ignore malformed guardian
          }

          // If backend provides combined parent_name / parent_contact, attempt to split into father/mother
          try {
            if (!newForm.father_name && pd.parent_name) {
              const parts = String(pd.parent_name).split(/[,\/|&]| and /i).map(s => s.trim()).filter(Boolean);
              if (parts.length >= 2) {
                newForm.father_name = parts[0];
                newForm.mother_name = parts.slice(1).join(' / ');
              } else {
                newForm.father_name = pd.parent_name;
              }
            }
            if (!newForm.father_contact && pd.parent_contact) {
              const parts = String(pd.parent_contact).split(/[,\/|&]| and /i).map(s => s.trim()).filter(Boolean);
              if (parts.length >= 2) {
                newForm.father_contact = parts[0];
                newForm.mother_contact = parts.slice(1).join(' / ');
              } else {
                newForm.father_contact = pd.parent_contact;
              }
            }
          } catch (e) {}

          setForm(newForm);
          // Initialize guardian details visibility based on existing data
          setShowGuardianDetails(!!(newForm.guardian_name || newForm.guardian_phone || newForm.guardian_email));
        }
      } catch (err) {

      }

      // check face status
      try {
        const resp = await fetch(`${API_ENDPOINT}/student/check-face-status/`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem("access_token")}` } });
        const j = await resp.json();
        if (j.success) setHasFaceTrained(Boolean(j.has_face));
      } catch (err) {

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
      // Step 1 & 2: Upload to R2 via common utility
      const fileUrl = await performR2Upload(file, 'profiles');
      
      if (fileUrl) {
        // Step 3: Finalize update with backend
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/upload-picture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture_url: fileUrl })
        });
        const result = await response.json();

        if (result?.success) {
          setForm((p) => ({ ...p, profile_picture: fileUrl }));
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement & HTMLTextAreaElement;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // Send all editable fields from the form to backend. Backend will ignore unknown keys.
      // assemble guardian object and attempt to parse JSON fields
      const guardianObj = (form.guardian_name || form.guardian_phone || form.guardian_relationship || form.guardian_email) ? {
        name: form.guardian_name || '',
        relationship: form.guardian_relationship || '',
        phone: form.guardian_phone || '',
        email: form.guardian_email || ''
      } : undefined;

      const tryParseJson = (s: any) => {
        if (!s && s !== '') return undefined;
        if (typeof s === 'object') return s;
        try { return JSON.parse(s); } catch (e) { return s; }
      };

      const payload = {
        // Basic User Fields
        first_name: form.first_name || '',
        last_name: form.last_name || '',
        email: form.email || '',
        mobile_number: form.phone || '',
        address: form.address || '',
        bio: form.about || '',
        date_of_birth: form.date_of_birth || '',
        gender: form.gender || '',
        designation: form.designation || '',
        
        // Personal Profile Fields (all optional, can be empty)
        preferred_name: form.preferred_name || '',
        nationality: form.nationality || '',
        religion: form.religion || '',
        caste: form.caste || '',
        marital_status: form.marital_status || '',
        primary_language: form.primary_language || '',
        alternate_mobile: form.alternate_mobile || '',
        personal_email: form.personal_email || '',
        institutional_email: form.institutional_email || '',
        
        // Official IDs (all optional)
        aadhaar_number: form.aadhaar_number || '',
        passport_number: form.passport_number || '',
        pan_number: form.pan_number || '',
        
        // Address Fields (all optional)
        address_permanent: form.address_permanent || '',
        address_current: form.address_current || '',
        city: form.city || '',
        state: form.state || '',
        country: form.country || '',
        pin_code: form.pin_code || '',
        
        // Social Links (all optional)
        linkedin: form.linkedin || '',
        github: form.github || '',
        portfolio: form.portfolio || '',
        
        // Parent Details (all optional - can be empty)
        father_name: form.father_name || '',
        father_contact: form.father_contact || '',
        mother_name: form.mother_name || '',
        mother_contact: form.mother_contact || '',
        
        // Guardian Details (all optional)
        guardian: guardianObj,
        
        // Socio-economic (all optional)
        occupation: form.occupation || '',
        income_range: form.income_range || '',
        
        // Medical Information (all optional - can be empty)
        blood_group: form.blood_group || '',
        emergency_contact: form.emergency_contact || '',
        allergies: form.allergies || '',
        disabilities: form.disabilities || '',
        medical_history: form.medical_history || '',
        medical_conditions: form.medical_conditions || ''
      };

      await updateProfileMutation.mutateAsync(payload);
      
      // Use the mutation response to update UI immediately (no extra GET call)
      setForm(prev => ({
        ...prev,
        ...payload,
        phone: payload.mobile_number,
      }));
      
      // Update guardian details visibility based on saved data
      setShowGuardianDetails(!!(payload.guardian_name || payload.guardian_phone || payload.guardian_email));
      setSameAsPermament(false);

      showSuccessAlert('Profile Updated', 'Your profile has been successfully updated.');
      setEditing(false);
    } catch (err) {

      showErrorAlert('Error', 'Failed to update profile');
    }
  };

  const handleFaceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
    if (faceImages.length + arr.length > 5) {showErrorAlert('Error', 'Maximum 5 images allowed');return;}
    setFaceImages((p) => [...p, ...arr]);
  };

  const removeFaceImage = (index: number) => setFaceImages((p) => p.filter((_, i) => i !== index));

  const trainFace = async () => {
    if (faceImages.length < 3) {showErrorAlert('Error', 'Please upload at least 3 face images');return;}
    setFaceTrainingStatus('training');setFaceTrainingProgress(0);setFaceTrainingMessage('Preparing images...');
    try {
      const fd = new FormData();
      faceImages.forEach((f) => fd.append('images', f));
      setFaceTrainingProgress(25);setFaceTrainingMessage('Uploading images...');
      const resp = await fetch(`${API_ENDPOINT}/student/train-face/`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem("access_token")}` }, body: fd });
      const j = await resp.json();
      setFaceTrainingProgress(75);setFaceTrainingMessage('Training face recognition...');
      if (j.success) {setFaceTrainingProgress(100);setFaceTrainingStatus('success');setHasFaceTrained(true);setFaceImages([]);showSuccessAlert('Success', 'Face updated successfully!');} else
      {setFaceTrainingStatus('error');setFaceTrainingMessage(j.message || 'Face training failed');showErrorAlert('Error', j.message || 'Face training failed');}
    } catch (err) {
      setFaceTrainingStatus('error');setFaceTrainingMessage('Network error occurred');showErrorAlert('Error', 'Network error occurred');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {showErrorAlert('Missing fields', 'Please fill all password fields');return;}
    if (passwordData.new_password !== passwordData.confirm_password) {showErrorAlert('Password mismatch', 'New passwords do not match');return;}
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwordData) });
      const j = await resp.json();
      if (j.success) {setShowPasswordDialog(false);setPasswordData({ current_password: '', new_password: '', confirm_password: '' });showSuccessAlert('Password changed', 'Your password has been updated successfully.');} else
      showErrorAlert('Unable to change password', j.message || 'Failed to change password');
    } catch (err) {showErrorAlert('Unable to change password', 'Network error');}
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50'}`}>
        <SkeletonForm />
      </div>);

  }

  return (
    <div className="min-h-screen flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile</CardTitle>
            <p className={`text-[16px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            <Button size="sm" onClick={() => {if (editing) handleSave();else setEditing(true);}} className="text-md sm:text-xl px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">
              {editing ? updateProfileMutation.isPending ? 'Saving...' : 'Save' : 'Edit Profile'}
            </Button>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-md sm:text-md px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_password" className="text-[16px] sm:text-sm">Current Password</Label>
                    <div className="relative">
                      <Input id="current_password" type={showPasswords.current ? 'text' : 'password'} value={passwordData.current_password} onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })} className="pr-10 text-[16px] sm:text-sm" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle current password visibility">{showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new_password" className="text-[16px] sm:text-sm">New Password</Label>
                    <div className="relative">
                      <Input id="new_password" type={showPasswords.next ? 'text' : 'password'} value={passwordData.new_password} onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} className="pr-10 text-[16px] sm:text-sm" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, next: !p.next }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle new password visibility">{showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password" className="text-[16px] sm:text-sm">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="confirm_password" type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirm_password} onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="pr-10 text-[16px] sm:text-sm" />
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

              {isUploadingPicture &&
              <div className="mb-2 text-center">
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-[12px] sm:text-xs text-gray-500">Uploading... {uploadProgress}%</p>
                  </div>
                </div>
              }

              <div className="text-md sm:text-lg font-semibold text-center mb-1">{form.first_name} {form.last_name}</div>
              <div className={`text-md sm:text-md mb-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{form.username || form.email}</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-[16px] sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-[14px] sm:text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</span>
                      <span className={`text-[16px] sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 bg-purple-100 text-purple-700`}>{form.branch || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-[14px] sm:text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Year</span>
                      <span className={`text-[16px] sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 bg-purple-100 text-purple-700`}>{form.year_of_study || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('profile')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'profile' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Profile</button>
                <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
                <button onClick={() => setActiveTab('academic')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'academic' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Academic</button>
                <button onClick={() => setActiveTab('face')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'face' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Face Recognition</button>
              </div>

              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {activeTab === 'profile' &&
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>First Name</Label>
                        <Input name="first_name" value={form.first_name} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Last Name</Label>
                        <Input name="last_name" value={form.last_name} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>USN</Label>
                        <Input name="usn" value={form.usn} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-gray-100 text-gray-500 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Email</Label>
                        <Input name="email" value={form.email} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Phone</Label>
                        <Input name="phone" value={form.phone} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Address</Label>
                      <Input name="address" value={form.address} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>About</Label>
                      <Textarea name="about" value={form.about} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                }

                {activeTab === 'personal' &&
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Preferred Name</Label>
                      <Input name="preferred_name" value={form.preferred_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Date of Birth</Label>
                      <Input name="date_of_birth" type="date" value={form.date_of_birth || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Blood Group</Label>
                      <Input name="blood_group" value={form.blood_group || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Primary Language</Label>
                      <Input name="primary_language" value={form.primary_language || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Aadhaar Number</Label>
                      <Input name="aadhaar_number" value={form.aadhaar_number || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>PAN / Passport</Label>
                      <Input name="pan_number" value={form.pan_number || ''} onChange={handleChange} placeholder="PAN" readOnly={!editing} className={`text-[16px] sm:text-sm mb-2 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      <Input name="passport_number" value={form.passport_number || ''} onChange={handleChange} placeholder="Passport" readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Nationality</Label>
                      <Input name="nationality" value={form.nationality || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Religion / Caste</Label>
                      <Input name="religion" value={form.religion || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm mb-2 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      <Input name="caste" value={form.caste || ''} onChange={handleChange} placeholder="Caste (optional)" readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Alternate Mobile</Label>
                      <Input name="alternate_mobile" value={form.alternate_mobile || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Personal Email</Label>
                      <Input name="personal_email" value={form.personal_email || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Institutional Email</Label>
                      <Input name="institutional_email" value={form.institutional_email || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>City / State / PIN</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input name="city" value={form.city || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        <Input name="state" value={form.state || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        <Input name="pin_code" value={form.pin_code || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Permanent Address</Label>
                      <Textarea name="address_permanent" value={form.address_permanent || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Current Address</Label>
                        {editing && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sameAsPermament}
                              onChange={(e) => {
                                setSameAsPermament(e.target.checked);
                                if (e.target.checked) {
                                  setForm(prev => ({ ...prev, address_current: prev.address_permanent }));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Same as Permanent</span>
                          </label>
                        )}
                      </div>
                      <Textarea name="address_current" value={form.address_current || ''} onChange={handleChange} readOnly={!editing || sameAsPermament} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>LinkedIn</Label>
                      <div className="flex gap-2">
                        <Input name="linkedin" value={form.linkedin || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm flex-1 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        {form.linkedin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(form.linkedin.startsWith('http') ? form.linkedin : `https://${form.linkedin}`, '_blank')}
                            className="whitespace-nowrap"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>GitHub / Portfolio</Label>
                      <div className="flex gap-2 mb-2">
                        <Input name="github" value={form.github || ''} onChange={handleChange} placeholder="GitHub" readOnly={!editing} className={`text-[16px] sm:text-sm flex-1 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        {form.github && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(form.github.startsWith('http') ? form.github : `https://${form.github}`, '_blank')}
                            className="whitespace-nowrap"
                          >
                            View
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input name="portfolio" value={form.portfolio || ''} onChange={handleChange} placeholder="Portfolio URL" readOnly={!editing} className={`text-[14px] sm:text-sm flex-1 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        {form.portfolio && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(form.portfolio.startsWith('http') ? form.portfolio : `https://${form.portfolio}`, '_blank')}
                            className="whitespace-nowrap"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg p-3 border bg-white dark:bg-card">
                      <h4 className="font-semibold mb-2">Parents Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Father's Name</Label>
                          <Input name="father_name" value={form.father_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Father's Contact</Label>
                          <Input name="father_contact" value={form.father_contact || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        </div>
                        <div>
                          <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Mother's Name</Label>
                          <Input name="mother_name" value={form.mother_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Mother's Contact</Label>
                          <Input name="mother_contact" value={form.mother_contact || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg p-3 border bg-white dark:bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Guardian Details</h4>
                        {editing && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showGuardianDetails}
                              onChange={(e) => {
                                setShowGuardianDetails(e.target.checked);
                                if (!e.target.checked) {
                                  setForm(prev => ({
                                    ...prev,
                                    guardian_name: '',
                                    guardian_relationship: '',
                                    guardian_phone: '',
                                    guardian_email: ''
                                  }));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Add Guardian</span>
                          </label>
                        )}
                      </div>
                      {showGuardianDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Guardian Name</Label>
                            <Input name="guardian_name" value={form.guardian_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                            <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Relationship</Label>
                            <Input name="guardian_relationship" value={form.guardian_relationship || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          </div>
                          <div>
                            <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Guardian Contact</Label>
                            <Input name="guardian_phone" value={form.guardian_phone || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                            <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Guardian Email</Label>
                            <Input name="guardian_email" value={form.guardian_email || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Medical info removed per request */}
                  </div>

                  <div className="rounded-lg p-3 border bg-white dark:bg-card">
                    <h4 className="font-semibold mb-2">Medical Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Blood Group</Label>
                        <Input name="blood_group" value={form.blood_group || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Emergency Contact</Label>
                        <Input name="emergency_contact" value={form.emergency_contact || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Allergies</Label>
                        <Input name="allergies" value={form.allergies || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Disabilities</Label>
                        <Input name="disabilities" value={form.disabilities || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div className="md:col-span-2">
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Medical History / Notes</Label>
                        <Textarea name="medical_history" value={form.medical_history || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>
                  </div>
                </div>
                }

                {activeTab === 'academic' &&
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Current Semester</Label>
                      <Input value={form.current_semester} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Section</Label>
                      <Input value={form.section} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Enrollment Year</Label>
                      <Input value={form.enrollment_year || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Expected Graduation</Label>
                      <Input value={form.expected_graduation || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Proctor</Label>
                      <Input value={form.proctor ? form.proctor.first_name || form.proctor.username ? `${form.proctor.first_name || ''} ${form.proctor.last_name || ''}`.trim() : form.proctor.username || '' : ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Student Status</Label>
                      <Input value={form.student_status || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Mode of Admission</Label>
                      <Input value={form.mode_of_admission || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Batch</Label>
                      <Input value={form.batch || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>



                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Date of Admission</Label>
                      <Input value={form.date_of_admission ? form.date_of_admission.length > 10 ? form.date_of_admission.slice(0, 10) : form.date_of_admission : ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                }

                {activeTab === 'face' &&
                <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Face Recognition Training</h3>
                      <p className="text-[16px] sm:text-sm text-gray-600 dark:text-gray-400">Upload 3-5 clear face photos to train the AI recognition system</p>
                    </div>

                    {hasFaceTrained &&
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-[16px] sm:text-sm text-green-700 dark:text-green-300">Face recognition is active for your account</span>
                      </div>
                  }

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Upload Face Images</Label>
                      <div className="mt-2">
                        <input type="file" multiple accept="image/*" onChange={handleFaceImageSelect} className="hidden" id="face-images" />
                        <label htmlFor="face-images" className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-[16px] sm:text-sm text-gray-600 dark:text-gray-400">Click to upload face images</p>
                            <p className="text-[12px] sm:text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                          </div>
                        </label>
                      </div>

                      {faceImages.length > 0 &&
                    <div className="space-y-2">
                          <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Selected Images ({faceImages.length}/5)</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {faceImages.map((image, idx) =>
                        <div key={idx} className="relative">
                                <img src={URL.createObjectURL(image)} alt={`Face ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                                <button onClick={() => removeFaceImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                              </div>
                        )}
                          </div>
                        </div>
                    }

                      {faceTrainingStatus !== 'idle' &&
                    <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {faceTrainingStatus === 'training' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
                            {faceTrainingStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {faceTrainingStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="text-sm">{faceTrainingMessage}</span>
                          </div>
                          {faceTrainingStatus === 'training' && <Progress value={faceTrainingProgress} className="w-full h-2" />}
                        </div>
                    }

                      <div className="flex justify-center mt-2">
                        <Button onClick={trainFace} disabled={faceImages.length < 3 || faceTrainingStatus === 'training'} className="bg-primary hover:bg-primary/90 text-white">{faceTrainingStatus === 'training' ? 'Training...' : 'Train Face AI'}</Button>
                      </div>
                    </div>
                  </div>
                }

              </div>
            </div>
          </div>



        </CardContent>
      </Card>
    </div>);

};

export default StudentProfile;