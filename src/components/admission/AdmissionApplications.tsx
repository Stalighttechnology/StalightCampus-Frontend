import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { 
  Loader2, 
  UserCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Search, 
  Upload, 
  Plus, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Eye, 
  GraduationCap, 
  User, 
  MapPin, 
  Phone, 
  Award, 
  Building2, 
  FileCheck,
  FolderOpen,
  Calendar as CalendarIcon,
  Printer,
  Download
} from 'lucide-react';
import { printFullAdmissionApplication, printAdmissionConfirmationSlip } from '../../utils/admissionSlip';
import { SkeletonTable } from '../ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Swal from 'sweetalert2';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getR2PresignedUrl, uploadFileToR2 } from '../../utils/common_api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FormState {
  // Step 1: Personal Details
  name: string;
  gender: string;
  dob: string;
  father_name: string;
  father_occupation: string;
  mother_name: string;
  mother_occupation: string;
  nationality: string;
  religion: string;
  caste: string;
  category: string;

  // Step 2: Address & Contact Details
  permanent_address: string;
  local_guardian_address: string;
  parent_mobile: string;
  candidate_mobile: string;
  candidate_email: string;
  city: string;

  // Step 3: SSLC (10th) Details
  sslc_school_name: string;
  sslc_reg_no: string;
  sslc_board: string;
  sslc_max_marks: string;
  sslc_obtained_marks: string;
  sslc_percentage: string;
  sslc_passing_year: string;

  // Step 4: PUC / 12th / Diploma Details
  puc_institute_name: string;
  puc_address: string;
  puc_reg_no: string;
  puc_board: string;
  puc_max_marks: string;
  puc_obtained_marks: string;
  puc_percentage: string;
  puc_passing_year: string;

  // Step 5: KEA / Management Details
  admission_quota: string;
  kea_mngt_no: string;
  kea_rank: string;
  category_claimed: string;
  allotted_category: string;
  fees_collected_kea: string;
  kea_admission_order_date: string;
  admission_order_number: string;

  // Step 6: Documents (URLs) - After KEA
  photo: string;
  signature: string;
  marks_card_10th: string;
  marks_card_12th: string;
  transfer_certificate: string;
  aadhaar_card: string;

  // Step 7: Office Subject Marks & Other Fields
  physics_marks: string;
  maths_marks: string;
  chemistry_marks: string;
  biology_others_marks: string;
  total_subject_marks: string;
  subject_percentage: string;
  extra_curricular: string;
  aadhaar_no: string;
  pan_no: string;
  place: string;
  application_date: string;
  course_interested_id?: string;
}

const initialFormState: FormState = {
  name: '',
  gender: 'Male',
  dob: '',
  father_name: '',
  father_occupation: '',
  mother_name: '',
  mother_occupation: '',
  nationality: 'INDIAN',
  religion: 'HINDU',
  caste: '',
  category: 'GM',

  permanent_address: '',
  local_guardian_address: '',
  parent_mobile: '',
  candidate_mobile: '',
  candidate_email: '',
  city: '',

  sslc_school_name: '',
  sslc_reg_no: '',
  sslc_board: 'KSEEB',
  sslc_max_marks: '625',
  sslc_obtained_marks: '',
  sslc_percentage: '',
  sslc_passing_year: '',

  puc_institute_name: '',
  puc_address: '',
  puc_reg_no: '',
  puc_board: 'KSEAB',
  puc_max_marks: '600',
  puc_obtained_marks: '',
  puc_percentage: '',
  puc_passing_year: '',

  admission_quota: 'Management',
  kea_mngt_no: '',
  kea_rank: '',
  category_claimed: '',
  allotted_category: '',
  fees_collected_kea: '',
  kea_admission_order_date: '',
  admission_order_number: '',

  photo: '',
  signature: '',
  marks_card_10th: '',
  marks_card_12th: '',
  transfer_certificate: '',
  aadhaar_card: '',

  physics_marks: '',
  maths_marks: '',
  chemistry_marks: '',
  biology_others_marks: '',
  total_subject_marks: '',
  subject_percentage: '',
  extra_curricular: '',
  aadhaar_no: '',
  pan_no: '',
  place: '',
  application_date: new Date().toISOString().split('T')[0],
  course_interested_id: ''
};

const appStages = [
  'new', 
  'contacted', 
  'interested', 
  'application_started', 
  'documents_pending', 
  'documents_verified', 
  'admission_confirmed', 
  'enrolled', 
  'rejected'
];

// Reusable Themed Date Picker matching software theme
interface ThemedDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}

const ThemedDatePicker: React.FC<ThemedDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Pick a date",
  fromYear = 1940,
  toYear = new Date().getFullYear() + 2
}) => {
  const [open, setOpen] = useState(false);
  
  const parsedDate = value ? new Date(value) : undefined;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal text-xs h-9 border-input bg-background hover:bg-muted/50 transition-colors",
            !isValidDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
          {isValidDate ? (
            <span className="font-medium text-foreground">
              {parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-xl rounded-xl" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          selected={isValidDate ? parsedDate : undefined}
          onSelect={(date) => {
            if (date) {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              onChange(`${y}-${m}-${d}`);
              setOpen(false);
            }
          }}
          initialFocus
          classNames={{
            caption_label: "hidden",
            caption_dropdowns: "flex items-center gap-1.5 z-10",
            caption: "flex justify-center pt-1 relative items-center gap-1",
          }}
          components={{
            IconLeft: () => <ChevronLeft className="h-4 w-4" />,
            IconRight: () => <ChevronRight className="h-4 w-4" />,
            Dropdown: ({ value, onChange, children }: any) => {
              const options = React.Children.toArray(children) as React.ReactElement[];
              const selected = options.find((child) => child.props.value === value);
              const handleChange = (val: string) => {
                const changeEvent = {
                  target: { value: val },
                } as React.ChangeEvent<HTMLSelectElement>;
                onChange?.(changeEvent);
              };
              return (
                <Select
                  value={value?.toString()}
                  onValueChange={(val) => {
                    handleChange(val);
                  }}
                >
                  <SelectTrigger className="h-7 w-[fit-content] py-0 px-2 text-xs font-medium border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-0 focus:ring-offset-0">
                    <SelectValue>{selected?.props.children}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px] overflow-y-auto custom-scrollbar">
                    {options.map((option) => (
                      <SelectItem
                        key={option.props.value}
                        value={option.props.value?.toString() ?? ""}
                        className="text-xs"
                      >
                        {option.props.children}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default function AdmissionApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [coursesList, setCoursesList] = useState<any[]>([]);

  // Wizard Modal State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Enrollment Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollAppId, setEnrollAppId] = useState<number | null>(null);
  const [optionsData, setOptionsData] = useState<{ branches: any[], batches: any[], semesters: any[], sections: any[] }>({ branches: [], batches: [], semesters: [], sections: [] });
  const [enrollBranchId, setEnrollBranchId] = useState("");
  const [enrollBatchId, setEnrollBatchId] = useState("");
  const [enrollSemesterId, setEnrollSemesterId] = useState("");
  const [enrollSectionId, setEnrollSectionId] = useState("");
  const [enrollCycle, setEnrollCycle] = useState<'P' | 'C'>('P');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);

  const handleDocumentUpload = async (docKey: string, file: File, appId?: number) => {
    const isPhotoOrSign = docKey === 'photo' || docKey === 'signature';
    const maxSizeBytes = isPhotoOrSign ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const maxSizeStr = isPhotoOrSign ? "2MB" : "5MB";

    if (file.size > maxSizeBytes) {
      toast.error(`File "${file.name}" exceeds maximum allowed size of ${maxSizeStr}.`);
      return;
    }

    try {
      setUploadingDocKey(docKey);
      const res = await getR2PresignedUrl(file.name, file.type, 'admission_documents');
      let finalFileUrl = "";
      if (res.success && res.data?.url) {
        const uploaded = await uploadFileToR2(file, res.data.url, file.type);
        if (!uploaded) {
          toast.error(`Failed to upload ${file.name}`);
          setUploadingDocKey(null);
          return;
        }
        finalFileUrl = res.data.file_url;
      } else {
        toast.error(res.message || "Failed to generate upload URL");
        setUploadingDocKey(null);
        return;
      }

      // Update wizard form state
      setFormData(prev => ({ ...prev, [docKey]: finalFileUrl }));

      if (appId) {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${appId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [docKey]: finalFileUrl })
        });

        if (response.ok) {
          toast.success("Document uploaded successfully!");
          setSelectedApp((prev: any) => prev ? ({ ...prev, [docKey]: finalFileUrl }) : null);
          setApplications(apps => apps.map(app => app.id === appId ? { ...app, [docKey]: finalFileUrl } : app));
        } else {
          toast.error("Failed to update application with document.");
        }
      } else {
        toast.success("Document uploaded!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading document.");
    } finally {
      setUploadingDocKey(null);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchApplications();
    fetchCourses();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    if (enrollModalOpen && enrollBranchId) {
      fetchEnrollmentOptions(enrollBranchId, enrollSemesterId);
    }
  }, [enrollBranchId, enrollSemesterId]);

  const fetchCourses = async () => {
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/courses/`);
      if (res.ok) {
        const data = await res.json();
        setCoursesList(data.results || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  const fetchEnrollmentOptions = async (branchId?: string, semesterId?: string) => {
    setOptionsLoading(true);
    try {
      let url = `${API_ENDPOINT}/admission/manager/enrollment-options/?`;
      if (branchId) url += `branch_id=${branchId}&`;
      if (semesterId) url += `semester_id=${semesterId}&`;
      const response = await fetchWithTokenRefresh(url);
      if (response.ok) {
        const data = await response.json();
        setOptionsData(prev => ({
          branches: branchId ? prev.branches : data.branches,
          batches: branchId ? prev.batches : data.batches,
          semesters: data.semesters,
          sections: data.sections
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enrollment options");
    } finally {
      setOptionsLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/?page=${currentPage}&page_size=20${searchParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.results) {
          setApplications(data.results);
          setTotalCount(data.count);
        } else {
          setApplications(data || []);
          setTotalCount(data ? data.length : 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    let confirmText = `Are you sure you want to update status to ${status.replace('_', ' ')}?`;
    let btnColor = '#3b82f6';
    if (status === 'documents_verified') {
      confirmText = 'Mark all required documents as verified for this applicant?';
    } else if (status === 'admission_confirmed') {
      confirmText = 'Confirm this applicant admission?';
      btnColor = '#10b981';
    } else if (status === 'rejected') {
      confirmText = 'Are you sure you want to reject this student application?';
      btnColor = '#ef4444';
    }

    const result = await Swal.fire({
      title: 'Confirm Action',
      text: confirmText,
      icon: status === 'rejected' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      confirmButtonColor: btnColor,
    });
    if (!result.isConfirmed) return;

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${id}/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        toast.success(`Status updated to ${status.replace('_', ' ')}`);
        setApplications(apps => apps.map(app => 
          app.id === id ? { ...app, enquiry_details: { ...app.enquiry_details, status } } : app
        ));
        if (selectedApp?.id === id) {
          setSelectedApp((prev: any) => prev ? ({ ...prev, enquiry_details: { ...prev.enquiry_details, status } }) : null);
        }

        if (status === 'admission_confirmed') {
          Swal.fire({
            title: 'Admission Confirmed!',
            text: 'Applicant admission has been confirmed. You can now proceed to Enroll the student.',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#2563eb'
          });
        }
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleEnroll = (id: number) => {
    setEnrollAppId(id);
    setEnrollBranchId("");
    setEnrollBatchId("");
    setEnrollSemesterId("");
    setEnrollSectionId("");
    setEnrollCycle("P");
    setEnrollModalOpen(true);
    fetchEnrollmentOptions();
  };

  const submitEnrollment = async () => {
    if (!enrollBranchId || !enrollBatchId || !enrollSemesterId || !enrollSectionId) {
      toast.error("Please select Branch, Batch, Semester, and Section.");
      return;
    }

    const selectedSemObj = optionsData.semesters.find(s => s.id.toString() === enrollSemesterId.toString());
    const is1stOr2ndSem = selectedSemObj && (selectedSemObj.number === 1 || selectedSemObj.number === 2);

    if (is1stOr2ndSem && !enrollCycle) {
      toast.error("Please select a cycle (Physics or Chemistry) for 1st/2nd Semester.");
      return;
    }

    try {
      setIsEnrolling(true);
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${enrollAppId}/enroll/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: enrollBranchId,
          batch_id: enrollBatchId,
          semester_id: enrollSemesterId,
          section_id: enrollSectionId,
          cycle: is1stOr2ndSem ? enrollCycle : null
        })
      });
      if (response.ok) {
        toast.success("Student Enrolled Successfully!");
        setApplications(apps => apps.map(app => 
          app.id === enrollAppId ? { ...app, enquiry_details: { ...app.enquiry_details, status: 'enrolled' } } : app
        ));
        if (selectedApp?.id === enrollAppId) {
          setSelectedApp((prev: any) => prev ? ({ ...prev, enquiry_details: { ...prev.enquiry_details, status: 'enrolled' } }) : null);
        }
        setEnrollModalOpen(false);

        const currentApp = (selectedApp?.id === enrollAppId ? selectedApp : null) || applications.find(a => a.id === enrollAppId);
        const branchObj = optionsData.branches.find(b => b.id.toString() === enrollBranchId.toString());
        const semObj = optionsData.semesters.find(s => s.id.toString() === enrollSemesterId.toString());

        Swal.fire({
          title: 'Student Enrolled!',
          text: 'Student enrolled successfully! Would you like to download / print the complete 5-Page Filled Admission Application & Confirmation Dossier?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Download Application Form',
          cancelButtonText: 'Done',
          confirmButtonColor: '#10b981'
        }).then((res) => {
          if (res.isConfirmed && currentApp) {
            printFullAdmissionApplication({
              ...currentApp,
              branch_name: branchObj?.name || currentApp.branch_name,
              semester_name: semObj ? `Sem ${semObj.number}` : currentApp.semester_name,
              enquiry_details: { ...currentApp.enquiry_details, status: 'enrolled' }
            });
          }
        });
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Failed to enroll");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to enroll");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePreview = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    try {
      let targetUrl = url;
      if (url.includes('/api/r2/download/')) {
        try {
          const parsedUrl = new URL(url);
          const paramUrl = parsedUrl.searchParams.get('file_url');
          if (paramUrl) targetUrl = paramUrl;
        } catch (parseErr) {
          console.warn("Failed to parse URL:", parseErr);
        }
      }

      let finalUrl = targetUrl;
      const isExternal = targetUrl.startsWith('http') && !targetUrl.includes(window.location.origin) && !targetUrl.includes('127.0.0.1') && !targetUrl.includes('localhost');
      if (isExternal) {
        finalUrl = `${API_ENDPOINT}/r2/download/?file_url=${encodeURIComponent(targetUrl)}`;
      } else if (targetUrl.startsWith('/')) {
        finalUrl = `${window.location.origin}${targetUrl}`;
      }

      const response = await fetchWithTokenRefresh(finalUrl);
      if (!response.ok) throw new Error("Failed to load file preview");

      const blob = await response.blob();
      let mimeType = blob.type;
      if (targetUrl.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
      else if (targetUrl.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      else if (targetUrl.toLowerCase().endsWith('.jpg') || targetUrl.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';

      const file = new Blob([blob], { type: mimeType });
      const previewUrl = window.URL.createObjectURL(file);
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error("Error previewing file:", error);
      toast.error("Failed to preview file");
    }
  };

  // Open Step-by-Step Wizard for editing an existing application or creating a new one
  const openWizardForApp = (app?: any) => {
    if (app) {
      setEditingAppId(app.id);
      const fd = app.form_data || {};
      setFormData({
        name: fd.name || app.enquiry_details?.name || '',
        gender: fd.gender || app.gender || 'Male',
        dob: fd.dob || app.dob || '',
        father_name: fd.father_name || '',
        father_occupation: fd.father_occupation || '',
        mother_name: fd.mother_name || '',
        mother_occupation: fd.mother_occupation || '',
        nationality: fd.nationality || 'INDIAN',
        religion: fd.religion || 'HINDU',
        caste: fd.caste || '',
        category: fd.category || 'GM',

        permanent_address: fd.permanent_address || app.address || '',
        local_guardian_address: fd.local_guardian_address || '',
        parent_mobile: fd.parent_mobile || '',
        candidate_mobile: fd.candidate_mobile || app.enquiry_details?.phone || '',
        candidate_email: fd.candidate_email || app.enquiry_details?.email || '',
        city: fd.city || app.enquiry_details?.city || '',

        sslc_school_name: fd.sslc_school_name || '',
        sslc_reg_no: fd.sslc_reg_no || '',
        sslc_board: fd.sslc_board || 'KSEEB',
        sslc_max_marks: fd.sslc_max_marks || '625',
        sslc_obtained_marks: fd.sslc_obtained_marks || (app.marks_10th ? String(app.marks_10th) : ''),
        sslc_percentage: fd.sslc_percentage || '',
        sslc_passing_year: fd.sslc_passing_year || '',

        puc_institute_name: fd.puc_institute_name || '',
        puc_address: fd.puc_address || '',
        puc_reg_no: fd.puc_reg_no || '',
        puc_board: fd.puc_board || 'KSEAB',
        puc_max_marks: fd.puc_max_marks || '600',
        puc_obtained_marks: fd.puc_obtained_marks || (app.marks_12th ? String(app.marks_12th) : ''),
        puc_percentage: fd.puc_percentage || '',
        puc_passing_year: fd.puc_passing_year || '',

        admission_quota: fd.admission_quota || 'Management',
        kea_mngt_no: fd.kea_mngt_no || '',
        kea_rank: fd.kea_rank || '',
        category_claimed: fd.category_claimed || '',
        allotted_category: fd.allotted_category || '',
        fees_collected_kea: fd.fees_collected_kea || '',
        kea_admission_order_date: fd.kea_admission_order_date || '',
        admission_order_number: fd.admission_order_number || '',

        photo: fd.photo || app.photo || '',
        signature: fd.signature || app.signature || '',
        marks_card_10th: fd.marks_card_10th || app.marks_card_10th || '',
        marks_card_12th: fd.marks_card_12th || app.marks_card_12th || '',
        transfer_certificate: fd.transfer_certificate || app.transfer_certificate || '',
        aadhaar_card: fd.aadhaar_card || app.aadhaar_card || '',

        physics_marks: fd.physics_marks || '',
        maths_marks: fd.maths_marks || '',
        chemistry_marks: fd.chemistry_marks || '',
        biology_others_marks: fd.biology_others_marks || '',
        total_subject_marks: fd.total_subject_marks || '',
        subject_percentage: fd.subject_percentage || '',

        extra_curricular: fd.extra_curricular || '',
        aadhaar_no: fd.aadhaar_no || '',
        pan_no: fd.pan_no || '',
        place: fd.place || '',
        application_date: fd.application_date || new Date().toISOString().split('T')[0],
        course_interested_id: app.enquiry_details?.course_interested || ''
      });
    } else {
      setEditingAppId(null);
      setFormData(initialFormState);
    }
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleFormChange = (field: keyof FormState, value: string) => {
    let sanitizedValue = value;

    // 1. Alphabetical only for Person Names (letters, spaces, dots)
    if (['name', 'father_name', 'mother_name'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z\s.]/g, '');
    }

    // 2. Alphabetical only for Occupations, Nationality, Religion, Caste, Place
    if (['father_occupation', 'mother_occupation', 'nationality', 'religion', 'caste', 'place'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // 3. Alphabetical for City / Town (letters, spaces, commas, hyphens)
    if (field === 'city') {
      sanitizedValue = value.replace(/[^a-zA-Z\s,-]/g, '');
    }

    // 4. Alphabetical + standard educational punctuation (no numbers/digits) for School & Institute Name/Address
    if (['sslc_school_name', 'puc_institute_name', 'puc_address'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z\s.,&/()\-]/g, '');
    }

    // 5. Alphabetical + dots/hyphens/slash for Board & University
    if (['sslc_board', 'puc_board'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z\s.\-/]/g, '');
    }

    // 6. Alphanumeric only for Year of Passing (e.g. JUL 2021, 2023, 2022-23)
    if (['sslc_passing_year', 'puc_passing_year'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z0-9\s\-/]/g, '');
    }

    // 7. Alphanumeric for Categories, Registration numbers, and KEA/MNGT No
    if (['category', 'category_claimed', 'allotted_category'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z0-9\s/+\-]/g, '').toUpperCase();
    }
    if (field === 'kea_mngt_no') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    if (['sslc_reg_no', 'puc_reg_no'].includes(field)) {
      sanitizedValue = value.replace(/[^a-zA-Z0-9\-/]/g, '');
    }

    // 8. Numbers only for Admission Order Number, KEA Rank, and Fees Collected
    if (['admission_order_number', 'kea_rank'].includes(field)) {
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }
    if (field === 'fees_collected_kea') {
      sanitizedValue = value.replace(/[^0-9.]/g, '');
    }

    // 9. Numbers only for Mobile Numbers
    if (['candidate_mobile', 'parent_mobile'].includes(field)) {
      sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    }

    // 10. Aadhaar (12 digits) & PAN (10 alphanumeric uppercase)
    if (field === 'aadhaar_no') {
      sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 12);
    }
    if (field === 'pan_no') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    }

    setFormData(prev => {
      const updated = { ...prev, [field]: sanitizedValue };

      // Auto calculate SSLC percentage
      if (field === 'sslc_obtained_marks' || field === 'sslc_max_marks') {
        const obt = parseFloat(field === 'sslc_obtained_marks' ? sanitizedValue : updated.sslc_obtained_marks);
        const max = parseFloat(field === 'sslc_max_marks' ? sanitizedValue : updated.sslc_max_marks);
        if (!isNaN(obt) && !isNaN(max) && max > 0) {
          updated.sslc_percentage = ((obt / max) * 100).toFixed(2);
        }
      }

      // Auto calculate PUC percentage
      if (field === 'puc_obtained_marks' || field === 'puc_max_marks') {
        const obt = parseFloat(field === 'puc_obtained_marks' ? sanitizedValue : updated.puc_obtained_marks);
        const max = parseFloat(field === 'puc_max_marks' ? sanitizedValue : updated.puc_max_marks);
        if (!isNaN(obt) && !isNaN(max) && max > 0) {
          updated.puc_percentage = ((obt / max) * 100).toFixed(2);
        }
      }

      // Auto calculate Subject PCM / PCB total & percentage
      if (['physics_marks', 'maths_marks', 'chemistry_marks', 'biology_others_marks'].includes(field)) {
        const p = parseFloat(field === 'physics_marks' ? sanitizedValue : updated.physics_marks) || 0;
        const m = parseFloat(field === 'maths_marks' ? sanitizedValue : updated.maths_marks) || 0;
        const c = parseFloat(field === 'chemistry_marks' ? sanitizedValue : updated.chemistry_marks) || 0;
        const b = parseFloat(field === 'biology_others_marks' ? sanitizedValue : updated.biology_others_marks) || 0;
        const total = p + m + c + b;
        let countSubjects = 0;
        if (updated.physics_marks) countSubjects++;
        if (updated.maths_marks) countSubjects++;
        if (updated.chemistry_marks) countSubjects++;
        if (updated.biology_others_marks) countSubjects++;
        
        if (countSubjects > 0) {
          updated.total_subject_marks = String(total);
          updated.subject_percentage = ((total / (countSubjects * 100)) * 100).toFixed(2);
        }
      }

      return updated;
    });
  };

  const handleSaveWizard = async () => {
    if (!formData.name.trim()) {
      toast.error("Applicant name is required.");
      setWizardStep(1);
      return;
    }
    if (!formData.candidate_mobile.trim()) {
      toast.error("Candidate mobile number is required.");
      setWizardStep(2);
      return;
    }

    setIsSavingForm(true);
    try {
      const clean10th = formData.sslc_percentage ? parseFloat(formData.sslc_percentage.replace(/[^0-9.]/g, '')) : null;
      const clean12th = formData.puc_percentage ? parseFloat(formData.puc_percentage.replace(/[^0-9.]/g, '')) : null;

      const payload: any = {
        gender: formData.gender === 'Female' ? 'F' : formData.gender === 'Other' ? 'O' : 'M',
        dob: formData.dob || null,
        address: formData.permanent_address || formData.local_guardian_address || '',
        marks_10th: !isNaN(Number(clean10th)) ? clean10th : null,
        marks_12th: !isNaN(Number(clean12th)) ? clean12th : null,
        photo: formData.photo || null,
        signature: formData.signature || null,
        marks_card_10th: formData.marks_card_10th || null,
        marks_card_12th: formData.marks_card_12th || null,
        transfer_certificate: formData.transfer_certificate || null,
        aadhaar_card: formData.aadhaar_card || null,
        form_data: formData
      };

      if (editingAppId) {
        // Update application
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${editingAppId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          toast.success("Application details updated successfully!");
          setApplications(prev => prev.map(a => a.id === editingAppId ? { 
            ...a, 
            ...updated, 
            form_data: formData,
            enquiry_details: {
              ...a.enquiry_details,
              name: formData.name,
              phone: formData.candidate_mobile,
              email: formData.candidate_email,
              city: formData.city
            }
          } : a));
          if (selectedApp?.id === editingAppId) {
            setSelectedApp((prev: any) => prev ? ({ 
              ...prev, 
              ...updated, 
              form_data: formData,
              enquiry_details: {
                ...prev.enquiry_details,
                name: formData.name,
                phone: formData.candidate_mobile,
                email: formData.candidate_email,
                city: formData.city
              }
            }) : null);
          }
          setWizardOpen(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          let errMsg = "Failed to save application details.";
          if (errData) {
            if (typeof errData === 'string') errMsg = errData;
            else if (errData.detail) errMsg = errData.detail;
            else if (errData.error) errMsg = errData.error;
            else {
              const fieldErrors = Object.entries(errData)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('; ');
              if (fieldErrors) errMsg = fieldErrors;
            }
          }
          toast.error(errMsg);
        }
      } else {
        // Create new application
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success("New Application created successfully!");
          setWizardOpen(false);
          fetchApplications();
        } else {
          const errData = await res.json().catch(() => ({}));
          let errMsg = "Failed to create application.";
          if (errData) {
            if (typeof errData === 'string') errMsg = errData;
            else if (errData.detail) errMsg = errData.detail;
            else if (errData.error) errMsg = errData.error;
            else {
              const fieldErrors = Object.entries(errData)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('; ');
              if (fieldErrors) errMsg = fieldErrors;
            }
          }
          toast.error(errMsg);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving.");
    } finally {
      setIsSavingForm(false);
    }
  };

  // Step configuration with Documents placed immediately after KEA
  const formSteps = [
    { number: 1, title: 'Personal Details', icon: User },
    { number: 2, title: 'Address & Contact', icon: MapPin },
    { number: 3, title: 'SSLC (10th) Info', icon: GraduationCap },
    { number: 4, title: 'PUC / 12th Info', icon: Building2 },
    { number: 5, title: 'KEA / Quota Details', icon: Award },
    { number: 6, title: 'Uploaded Documents', icon: FolderOpen },
    { number: 7, title: 'Office Marks & Other', icon: FileCheck },
  ];

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / 20);
  const paginatedApplications = applications;

  // Helper to extract review data from application
  const getReviewData = (app: any) => {
    const fd = app?.form_data || {};
    return {
      name: fd.name || app?.enquiry_details?.name || 'N/A',
      gender: fd.gender || app?.gender || 'N/A',
      dob: fd.dob || app?.dob || 'N/A',
      father_name: fd.father_name || 'N/A',
      father_occupation: fd.father_occupation || 'N/A',
      mother_name: fd.mother_name || 'N/A',
      mother_occupation: fd.mother_occupation || 'N/A',
      nationality: fd.nationality || 'INDIAN',
      religion: fd.religion || 'HINDU',
      caste: fd.caste || 'N/A',
      category: fd.category || 'N/A',

      permanent_address: fd.permanent_address || app?.address || 'N/A',
      local_guardian_address: fd.local_guardian_address || 'N/A',
      parent_mobile: fd.parent_mobile || 'N/A',
      candidate_mobile: fd.candidate_mobile || app?.enquiry_details?.phone || 'N/A',
      candidate_email: fd.candidate_email || app?.enquiry_details?.email || 'N/A',
      city: fd.city || app?.enquiry_details?.city || 'N/A',
      course_name: app?.enquiry_details?.course_name || 'N/A',

      sslc_school_name: fd.sslc_school_name || 'N/A',
      sslc_reg_no: fd.sslc_reg_no || 'N/A',
      sslc_board: fd.sslc_board || 'KSEEB',
      sslc_max_marks: fd.sslc_max_marks || '625',
      sslc_obtained_marks: fd.sslc_obtained_marks || (app?.marks_10th ? `${app.marks_10th}` : 'N/A'),
      sslc_percentage: fd.sslc_percentage || (app?.marks_10th ? `${app.marks_10th}%` : 'N/A'),
      sslc_passing_year: fd.sslc_passing_year || 'N/A',

      puc_institute_name: fd.puc_institute_name || 'N/A',
      puc_address: fd.puc_address || 'N/A',
      puc_reg_no: fd.puc_reg_no || 'N/A',
      puc_board: fd.puc_board || 'KSEAB',
      puc_max_marks: fd.puc_max_marks || '600',
      puc_obtained_marks: fd.puc_obtained_marks || (app?.marks_12th ? `${app.marks_12th}` : 'N/A'),
      puc_percentage: fd.puc_percentage || (app?.marks_12th ? `${app.marks_12th}%` : 'N/A'),
      puc_passing_year: fd.puc_passing_year || 'N/A',

      admission_quota: fd.admission_quota || 'Management',
      kea_mngt_no: fd.kea_mngt_no || 'N/A',
      kea_rank: fd.kea_rank || 'N/A',
      category_claimed: fd.category_claimed || 'N/A',
      allotted_category: fd.allotted_category || 'N/A',
      fees_collected_kea: fd.fees_collected_kea ? `Rs. ${fd.fees_collected_kea}` : 'N/A',
      kea_admission_order_date: fd.kea_admission_order_date || 'N/A',
      admission_order_number: fd.admission_order_number || 'N/A',

      photo: fd.photo || app?.photo || null,
      signature: fd.signature || app?.signature || null,
      marks_card_10th: fd.marks_card_10th || app?.marks_card_10th || null,
      marks_card_12th: fd.marks_card_12th || app?.marks_card_12th || null,
      transfer_certificate: fd.transfer_certificate || app?.transfer_certificate || null,
      aadhaar_card: fd.aadhaar_card || app?.aadhaar_card || null,

      physics_marks: fd.physics_marks || 'N/A',
      maths_marks: fd.maths_marks || 'N/A',
      chemistry_marks: fd.chemistry_marks || 'N/A',
      biology_others_marks: fd.biology_others_marks || 'N/A',
      total_subject_marks: fd.total_subject_marks || 'N/A',
      subject_percentage: fd.subject_percentage ? `${fd.subject_percentage}%` : 'N/A',

      extra_curricular: fd.extra_curricular || 'Blank / None',
      aadhaar_no: fd.aadhaar_no || 'N/A',
      pan_no: fd.pan_no || 'Blank',
      place: fd.place || 'N/A',
      application_date: fd.application_date || 'N/A'
    };
  };

  const reviewInfo = selectedApp ? getReviewData(selectedApp) : null;

  const renderStatusBadge = (status?: string) => {
    const s = status || 'pending';
    switch (s) {
      case 'documents_verified':
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            Verified
          </span>
        );
      case 'admission_confirmed':
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 border border-blue-300 dark:border-blue-800 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            Confirmed
          </span>
        );
      case 'enrolled':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-600 border border-purple-300 dark:border-purple-800 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            Enrolled
          </span>
        );
      case 'documents_pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            Docs Pending
          </span>
        );
      case 'fee_pending':
        return (
          <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 border border-orange-300 dark:border-orange-800 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            Fee Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
            {s.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div id="admission-applications-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="flex flex-col w-full border-border shadow-sm">
        <CardHeader id="admission-applications-header" className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="sm:text-2xl text-xl font-semibold flex items-center gap-2">
              <span>Submitted Applications</span>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary font-normal">
                {totalCount} Total
              </Badge>
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Review, collect step-wise applicant details, verify documents, and enroll students.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email..." 
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => openWizardForApp()} 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-white h-9 px-3 text-xs gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Collect Application
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-grow">
          {paginatedApplications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">No applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">#</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Applicant Name</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Course</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">10th %</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">12th / PUC %</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedApplications.map((app, index) => {
                    const itemIndex = (currentPage - 1) * 20 + index + 1;
                    return (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                          #{itemIndex}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                          <div className="font-semibold text-sm">{app.enquiry_details?.name || 'Applicant'}</div>
                          {app.enquiry_details?.email && (
                            <div className="text-xs text-muted-foreground font-normal mt-0.5">{app.enquiry_details?.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{app.enquiry_details?.course_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-muted-foreground font-mono whitespace-nowrap">
                          {app.marks_10th ? `${app.marks_10th}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-mono whitespace-nowrap">
                          {app.marks_12th ? `${app.marks_12th}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStatusBadge(app.enquiry_details?.status)}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                          {app.enquiry_details?.status === 'enrolled' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800" 
                              onClick={() => printFullAdmissionApplication(app)}
                              title="Download Complete 5-Page Filled Admission Application & Confirmation Dossier"
                            >
                              <Download className="w-3.5 h-3.5" /> Download App
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs gap-1" 
                            onClick={() => openWizardForApp(app)}
                            title="Edit / Fill Full Application Form"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Form
                          </Button>
                          <Button 
                            variant="default" 
                            className="bg-primary hover:bg-primary/90 text-white h-8 text-xs gap-1 shadow-sm" 
                            size="sm" 
                            onClick={() => setSelectedApp(app)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 20 + 1, totalCount)} to {Math.min(currentPage * 20, totalCount)} of {totalCount} applications
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem] font-semibold text-foreground">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="h-8 px-3 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* STEP-BY-STEP MULTI-STEP DATA COLLECTION & EDITING WIZARD MODAL             */}
      {/* ========================================================================= */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col p-0 gap-0">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold flex items-center justify-between">
              <span>{editingAppId ? 'Edit Student Application' : 'Step-by-Step Application Collection'}</span>
              <span className="text-xs font-normal text-muted-foreground">Step {wizardStep} of {formSteps.length}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fill candidate details, examination records, KEA quota allocations, upload documents, and complete admission records.
            </p>

            {/* Stepper Navigation Bar (Documents is Step 6 - after KEA) */}
            <div className="grid grid-cols-7 gap-1 mt-4 pt-2 border-t border-border/60">
              {formSteps.map((s) => {
                const isCurrent = wizardStep === s.number;
                const isDone = wizardStep > s.number;
                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => setWizardStep(s.number)}
                    className={cn(
                      "flex flex-col items-center p-1.5 rounded-md text-[10px] font-medium transition-colors text-center truncate",
                      isCurrent ? "bg-primary text-white font-semibold shadow-sm" : isDone ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{s.number}. {s.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* STEP 1: PERSONAL DETAILS */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <User className="w-4 h-4 text-primary" /> 1. Applicant & Personal Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Name of Applicant <span className="text-destructive">*</span></Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => handleFormChange('name', e.target.value)} 
                      placeholder="e.g. SHIVARAJ MANJUNATH ATIL" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Sex / Gender</Label>
                    <Select value={formData.gender} onValueChange={(val) => handleFormChange('gender', val)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male" className="text-xs">Male</SelectItem>
                        <SelectItem value="Female" className="text-xs">Female</SelectItem>
                        <SelectItem value="Other" className="text-xs">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* THEMED DATE OF BIRTH PICKER */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date of Birth</Label>
                    <ThemedDatePicker
                      value={formData.dob}
                      onChange={(val) => handleFormChange('dob', val)}
                      placeholder="Select Date of Birth"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Father's Name</Label>
                    <Input 
                      value={formData.father_name} 
                      onChange={(e) => handleFormChange('father_name', e.target.value)} 
                      placeholder="e.g. MANJUNATH" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Father's Occupation</Label>
                    <Input 
                      value={formData.father_occupation} 
                      onChange={(e) => handleFormChange('father_occupation', e.target.value)} 
                      placeholder="e.g. HANDLOOMS" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Mother's Name</Label>
                    <Input 
                      value={formData.mother_name} 
                      onChange={(e) => handleFormChange('mother_name', e.target.value)} 
                      placeholder="e.g. SUMITRA" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Mother's Occupation</Label>
                    <Input 
                      value={formData.mother_occupation} 
                      onChange={(e) => handleFormChange('mother_occupation', e.target.value)} 
                      placeholder="e.g. HOUSE WIFE" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Nationality</Label>
                    <Input 
                      value={formData.nationality} 
                      onChange={(e) => handleFormChange('nationality', e.target.value)} 
                      placeholder="e.g. INDIAN" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Religion</Label>
                    <Input 
                      value={formData.religion} 
                      onChange={(e) => handleFormChange('religion', e.target.value)} 
                      placeholder="e.g. HINDU" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Caste</Label>
                    <Input 
                      value={formData.caste} 
                      onChange={(e) => handleFormChange('caste', e.target.value)} 
                      placeholder="e.g. KURUBANASHETTI" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Input 
                      value={formData.category} 
                      onChange={(e) => handleFormChange('category', e.target.value)} 
                      placeholder="e.g. 2A / GM / 3B" 
                      className="text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ADDRESS & CONTACT DETAILS */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> 2. Address & Contact Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Permanent Home Address</Label>
                    <Textarea 
                      value={formData.permanent_address} 
                      onChange={(e) => handleFormChange('permanent_address', e.target.value)} 
                      placeholder="Enter full permanent address..." 
                      className="text-xs h-18 resize-none" 
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Local Guardian Address</Label>
                      <button 
                        type="button" 
                        onClick={() => handleFormChange('local_guardian_address', formData.permanent_address)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Copy Permanent Address
                      </button>
                    </div>
                    <Textarea 
                      value={formData.local_guardian_address} 
                      onChange={(e) => handleFormChange('local_guardian_address', e.target.value)} 
                      placeholder="Enter local guardian address..." 
                      className="text-xs h-18 resize-none" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Candidate Mobile Number <span className="text-destructive">*</span></Label>
                    <Input 
                      value={formData.candidate_mobile} 
                      onChange={(e) => handleFormChange('candidate_mobile', e.target.value)} 
                      placeholder="e.g. 6360759200" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Parents Mobile Number</Label>
                    <Input 
                      value={formData.parent_mobile} 
                      onChange={(e) => handleFormChange('parent_mobile', e.target.value)} 
                      placeholder="e.g. 6360759200" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Candidate Email ID</Label>
                    <Input 
                      type="email" 
                      value={formData.candidate_email} 
                      onChange={(e) => handleFormChange('candidate_email', e.target.value)} 
                      placeholder="e.g. shivarajali1@gmail.com" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">City / Town</Label>
                    <Input 
                      value={formData.city} 
                      onChange={(e) => handleFormChange('city', e.target.value)} 
                      placeholder="e.g. Gadag" 
                      className="text-xs" 
                    />
                  </div>

                  {coursesList.length > 0 && !editingAppId && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Course Interested</Label>
                      <Select value={formData.course_interested_id} onValueChange={(val) => handleFormChange('course_interested_id', val)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select Course" /></SelectTrigger>
                        <SelectContent>
                          {coursesList.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()} className="text-xs">{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: SSLC (10th) DETAILS */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" /> 3. SSLC (10th Examination Details)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">School Name & Address</Label>
                    <Input 
                      value={formData.sslc_school_name} 
                      onChange={(e) => handleFormChange('sslc_school_name', e.target.value)} 
                      placeholder="e.g. SENT JOHN ENGLISH MEDIUM SCHOOL, HEALTH CAMP BETGERI" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">SSLC Registration No.</Label>
                    <Input 
                      value={formData.sslc_reg_no} 
                      onChange={(e) => handleFormChange('sslc_reg_no', e.target.value)} 
                      placeholder="e.g. 20210091906" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Board</Label>
                    <Input 
                      value={formData.sslc_board} 
                      onChange={(e) => handleFormChange('sslc_board', e.target.value)} 
                      placeholder="e.g. KSEEB / CBSE / ICSE" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Maximum Marks</Label>
                    <Input 
                      type="number" 
                      value={formData.sslc_max_marks} 
                      onChange={(e) => handleFormChange('sslc_max_marks', e.target.value)} 
                      placeholder="625" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Obtained Marks</Label>
                    <Input 
                      type="number" 
                      value={formData.sslc_obtained_marks} 
                      onChange={(e) => handleFormChange('sslc_obtained_marks', e.target.value)} 
                      placeholder="529" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Percentage (%)</Label>
                    <Input 
                      value={formData.sslc_percentage} 
                      onChange={(e) => handleFormChange('sslc_percentage', e.target.value)} 
                      placeholder="84.64" 
                      className="text-xs font-mono font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Year of Passing</Label>
                    <Input 
                      value={formData.sslc_passing_year} 
                      onChange={(e) => handleFormChange('sslc_passing_year', e.target.value)} 
                      placeholder="e.g. JUL 2021" 
                      className="text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PUC / 12th / DIPLOMA DETAILS */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary" /> 4. PUC / Intermediate / Diploma Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Institute Name</Label>
                    <Input 
                      value={formData.puc_institute_name} 
                      onChange={(e) => handleFormChange('puc_institute_name', e.target.value)} 
                      placeholder="e.g. GOVERNMENT PU COLLEGE GADAG" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Institute Address</Label>
                    <Input 
                      value={formData.puc_address} 
                      onChange={(e) => handleFormChange('puc_address', e.target.value)} 
                      placeholder="e.g. MULAGUND ROAD, GADAG" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">PUC Registration No.</Label>
                    <Input 
                      value={formData.puc_reg_no} 
                      onChange={(e) => handleFormChange('puc_reg_no', e.target.value)} 
                      placeholder="e.g. 661180" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Board / University</Label>
                    <Input 
                      value={formData.puc_board} 
                      onChange={(e) => handleFormChange('puc_board', e.target.value)} 
                      placeholder="e.g. KSEAB / CBSE / BTE" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Maximum Marks</Label>
                    <Input 
                      type="number" 
                      value={formData.puc_max_marks} 
                      onChange={(e) => handleFormChange('puc_max_marks', e.target.value)} 
                      placeholder="600" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Obtained Marks</Label>
                    <Input 
                      type="number" 
                      value={formData.puc_obtained_marks} 
                      onChange={(e) => handleFormChange('puc_obtained_marks', e.target.value)} 
                      placeholder="375" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Percentage (%)</Label>
                    <Input 
                      value={formData.puc_percentage} 
                      onChange={(e) => handleFormChange('puc_percentage', e.target.value)} 
                      placeholder="62.50" 
                      className="text-xs font-mono font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Year of Passing</Label>
                    <Input 
                      value={formData.puc_passing_year} 
                      onChange={(e) => handleFormChange('puc_passing_year', e.target.value)} 
                      placeholder="e.g. MAR 2023" 
                      className="text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: KEA / MANAGEMENT DETAILS */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary" /> 5. KEA / Management Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admission Quota / Type</Label>
                    <Select value={formData.admission_quota} onValueChange={(val) => handleFormChange('admission_quota', val)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select Quota" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KEA" className="text-xs">KEA / CET</SelectItem>
                        <SelectItem value="Management" className="text-xs">Management</SelectItem>
                        <SelectItem value="COMEDK" className="text-xs">COMEDK</SelectItem>
                        <SelectItem value="SNQ" className="text-xs">SNQ Quota</SelectItem>
                        <SelectItem value="Govt" className="text-xs">Govt Quota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">KEA/MNGT No.</Label>
                    <Input 
                      value={formData.kea_mngt_no} 
                      onChange={(e) => handleFormChange('kea_mngt_no', e.target.value)} 
                      placeholder="e.g. 00" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Rank</Label>
                    <Input 
                      value={formData.kea_rank} 
                      onChange={(e) => handleFormChange('kea_rank', e.target.value)} 
                      placeholder="e.g. 001" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Category Claimed</Label>
                    <Input 
                      value={formData.category_claimed} 
                      onChange={(e) => handleFormChange('category_claimed', e.target.value)} 
                      placeholder="e.g. 2A" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Allotted Category</Label>
                    <Input 
                      value={formData.allotted_category} 
                      onChange={(e) => handleFormChange('allotted_category', e.target.value)} 
                      placeholder="e.g. GM" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Fees Collected in KEA/MNGT (Rs.)</Label>
                    <Input 
                      value={formData.fees_collected_kea} 
                      onChange={(e) => handleFormChange('fees_collected_kea', e.target.value)} 
                      placeholder="e.g. 120000" 
                      className="text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Admission Order Date</Label>
                    <ThemedDatePicker
                      value={formData.kea_admission_order_date}
                      onChange={(val) => handleFormChange('kea_admission_order_date', val)}
                      placeholder="Select Order Date"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 2}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Admission Order Number</Label>
                    <Input 
                      value={formData.admission_order_number} 
                      onChange={(e) => handleFormChange('admission_order_number', e.target.value)} 
                      placeholder="e.g. 1526" 
                      className="text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: UPLOADED DOCUMENTS (POSITIONED AFTER KEA STEP) */}
            {wizardStep === 6 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-primary" /> 6. Uploaded Documents
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Upload candidate's files & certificates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Passport Photo', key: 'photo' },
                    { label: 'Signature of Candidate', key: 'signature' },
                    { label: '10th Marks Card', key: 'marks_card_10th' },
                    { label: '12th Marks Card / Diploma', key: 'marks_card_12th' },
                    { label: 'Transfer Certificate (TC)', key: 'transfer_certificate' },
                    { label: 'Aadhaar Card', key: 'aadhaar_card' },
                  ].map((doc) => {
                    const fileUrl = (formData as any)[doc.key];
                    const isUploading = uploadingDocKey === doc.key;

                    return (
                      <div key={doc.key} className="flex flex-col justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/10 transition-colors gap-2 text-xs">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold truncate max-w-[140px]" title={doc.label}>{doc.label}</span>
                          {fileUrl ? (
                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded">Uploaded</span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded">Missing</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between w-full pt-1.5 border-t border-border/50">
                          {fileUrl ? (
                            <a 
                              href={fileUrl} 
                              onClick={(e) => handlePreview(e, fileUrl)}
                              className="text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Preview
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">No file</span>
                          )}

                          <label className={`cursor-pointer inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? (
                              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>
                            ) : (
                              <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> {fileUrl ? 'Replace' : 'Upload'}</span>
                            )}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocumentUpload(doc.key, file, editingAppId || undefined);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 7: OFFICE SUBJECT MARKS & OTHER FIELDS */}
            {wizardStep === 7 && (
              <div className="space-y-5">
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-primary" /> 7. Office Subject Marks & Other Details
                  </h3>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Office Use — Subject Qualifying Marks</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Physics</Label>
                      <Input 
                        type="number"
                        value={formData.physics_marks} 
                        onChange={(e) => handleFormChange('physics_marks', e.target.value)} 
                        placeholder="59" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Maths</Label>
                      <Input 
                        type="number"
                        value={formData.maths_marks} 
                        onChange={(e) => handleFormChange('maths_marks', e.target.value)} 
                        placeholder="37" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Chemistry</Label>
                      <Input 
                        type="number"
                        value={formData.chemistry_marks} 
                        onChange={(e) => handleFormChange('chemistry_marks', e.target.value)} 
                        placeholder="59" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Biology / Others</Label>
                      <Input 
                        type="number"
                        value={formData.biology_others_marks} 
                        onChange={(e) => handleFormChange('biology_others_marks', e.target.value)} 
                        placeholder="78" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Total Marks</Label>
                      <Input 
                        value={formData.total_subject_marks} 
                        onChange={(e) => handleFormChange('total_subject_marks', e.target.value)} 
                        placeholder="196" 
                        className="text-xs font-semibold" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Percentage (%)</Label>
                      <Input 
                        value={formData.subject_percentage} 
                        onChange={(e) => handleFormChange('subject_percentage', e.target.value)} 
                        placeholder="65.33" 
                        className="text-xs font-mono font-semibold" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other Identification & Place</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Extra Curricular and Achievements</Label>
                      <Textarea 
                        value={formData.extra_curricular} 
                        onChange={(e) => handleFormChange('extra_curricular', e.target.value)} 
                        placeholder="Sports, state/national awards, arts..." 
                        className="text-xs h-16 resize-none" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Aadhaar Number (12 Digits)</Label>
                      <Input 
                        value={formData.aadhaar_no} 
                        onChange={(e) => handleFormChange('aadhaar_no', e.target.value)} 
                        placeholder="e.g. 550390906299" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">PAN Card Number</Label>
                      <Input 
                        value={formData.pan_no} 
                        onChange={(e) => handleFormChange('pan_no', e.target.value)} 
                        placeholder="e.g. ABCDE1234F" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Place of Application</Label>
                      <Input 
                        value={formData.place} 
                        onChange={(e) => handleFormChange('place', e.target.value)} 
                        placeholder="e.g. Gadag" 
                        className="text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Date of Application</Label>
                      <ThemedDatePicker
                        value={formData.application_date}
                        onChange={(val) => handleFormChange('application_date', val)}
                        placeholder="Select Application Date"
                        fromYear={2020}
                        toYear={new Date().getFullYear() + 1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between">
            <div>
              {wizardStep > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setWizardStep(s => s - 1)}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setWizardOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>

              {wizardStep < 7 ? (
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => setWizardStep(s => s + 1)}
                  className="h-8 text-xs bg-primary text-white"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  size="sm" 
                  disabled={isSavingForm}
                  onClick={handleSaveWizard}
                  className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSavingForm ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</> : <><Check className="w-3.5 h-3.5 mr-1.5" /> Save Application</>}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* FULL DETAILED APPLICATION REVIEW DIALOG (Documents after KEA Section)      */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="w-[95vw] rounded-xl sm:max-w-4xl max-h-[88vh] overflow-y-auto custom-scrollbar p-0 flex flex-col gap-0">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <span>Application Review: {reviewInfo?.name}</span>
                  {renderStatusBadge(selectedApp?.enquiry_details?.status)}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review applicant credentials, examination marks, quota allotments & documents.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedApp?.enquiry_details?.status === 'enrolled' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => printFullAdmissionApplication(selectedApp)}
                    className="h-8 text-xs gap-1.5 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800 font-medium"
                    title="Download Complete 5-Page Filled Admission Application & Confirmation Dossier"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Application Form
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const target = selectedApp;
                    setSelectedApp(null);
                    openWizardForApp(target);
                  }}
                  className="h-8 text-xs gap-1.5 shrink-0"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit All Details
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedApp && reviewInfo && (
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* SECTION 1: APPLICANT & PERSONAL DETAILS */}
              <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                  <User className="w-4 h-4" /> 1. Applicant & Personal Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground block text-[11px]">Name of Applicant</span><strong className="text-foreground">{reviewInfo.name}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Sex / Gender</span><strong className="text-foreground">{reviewInfo.gender}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Date of Birth</span><strong className="text-foreground">{reviewInfo.dob}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Nationality</span><strong className="text-foreground">{reviewInfo.nationality}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Father's Name</span><strong className="text-foreground">{reviewInfo.father_name}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Father's Occupation</span><strong className="text-foreground">{reviewInfo.father_occupation}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Mother's Name</span><strong className="text-foreground">{reviewInfo.mother_name}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Mother's Occupation</span><strong className="text-foreground">{reviewInfo.mother_occupation}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Religion</span><strong className="text-foreground">{reviewInfo.religion}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Caste</span><strong className="text-foreground">{reviewInfo.caste}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Category</span><strong className="text-foreground">{reviewInfo.category}</strong></div>
                </div>
              </div>

              {/* SECTION 2 & 3: ADDRESS & CONTACT DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                    <MapPin className="w-4 h-4" /> 2. Address Details
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Permanent Home Address</span>
                      <p className="text-foreground font-medium">{reviewInfo.permanent_address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Local Guardian Address</span>
                      <p className="text-foreground font-medium">{reviewInfo.local_guardian_address}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                    <Phone className="w-4 h-4" /> 3. Contact Details
                  </div>
                  <div className="space-y-2 text-xs">
                    <div><span className="text-muted-foreground block text-[11px]">Candidate Mobile Number</span><strong className="text-foreground">{reviewInfo.candidate_mobile}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Parents Mobile Number</span><strong className="text-foreground">{reviewInfo.parent_mobile}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Candidate Email ID</span><strong className="text-foreground">{reviewInfo.candidate_email}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Course Applied</span><strong className="text-primary font-semibold">{reviewInfo.course_name}</strong></div>
                  </div>
                </div>
              </div>

              {/* SECTION 4 & 5: SSLC & PUC EXAMINATION DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SSLC Details */}
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                    <GraduationCap className="w-4 h-4" /> 4. SSLC Examination Details (10th)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2"><span className="text-muted-foreground block text-[11px]">School Name & Address</span><p className="font-medium text-foreground">{reviewInfo.sslc_school_name}</p></div>
                    <div><span className="text-muted-foreground block text-[11px]">SSLC Reg No.</span><strong className="text-foreground">{reviewInfo.sslc_reg_no}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Board</span><strong className="text-foreground">{reviewInfo.sslc_board}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Marks</span><strong className="text-foreground">{reviewInfo.sslc_obtained_marks} / {reviewInfo.sslc_max_marks}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Percentage</span><strong className="text-primary font-mono">{reviewInfo.sslc_percentage}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Year of Passing</span><strong className="text-foreground">{reviewInfo.sslc_passing_year}</strong></div>
                  </div>
                </div>

                {/* PUC Details */}
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                    <Building2 className="w-4 h-4" /> 5. PUC / Intermediate / Diploma Details (12th)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2"><span className="text-muted-foreground block text-[11px]">Institute Name</span><p className="font-medium text-foreground">{reviewInfo.puc_institute_name}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground block text-[11px]">Institute Address</span><p className="font-medium text-foreground">{reviewInfo.puc_address}</p></div>
                    <div><span className="text-muted-foreground block text-[11px]">PUC Reg No.</span><strong className="text-foreground">{reviewInfo.puc_reg_no}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Board</span><strong className="text-foreground">{reviewInfo.puc_board}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Marks</span><strong className="text-foreground">{reviewInfo.puc_obtained_marks} / {reviewInfo.puc_max_marks}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Percentage</span><strong className="text-primary font-mono">{reviewInfo.puc_percentage}</strong></div>
                    <div><span className="text-muted-foreground block text-[11px]">Year of Passing</span><strong className="text-foreground">{reviewInfo.puc_passing_year}</strong></div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: KEA / MNGT QUOTA DETAILS */}
              <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                  <Award className="w-4 h-4" /> 6. KEA / Management Quota & Admission Order Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground block text-[11px]">Admission Quota</span><strong className="text-foreground">{reviewInfo.admission_quota}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">KEA / MNGT No.</span><strong className="text-foreground">{reviewInfo.kea_mngt_no}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">KEA Rank</span><strong className="text-foreground">{reviewInfo.kea_rank}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Category Claimed</span><strong className="text-foreground">{reviewInfo.category_claimed}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Allotted Category</span><strong className="text-foreground">{reviewInfo.allotted_category}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Fees Collected in KEA</span><strong className="text-foreground font-mono">{reviewInfo.fees_collected_kea}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Admission Order Date</span><strong className="text-foreground">{reviewInfo.kea_admission_order_date}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Admission Order No.</span><strong className="text-foreground">{reviewInfo.admission_order_number}</strong></div>
                </div>
              </div>

              {/* SECTION 7: UPLOADED ATTACHMENTS & CERTIFICATES */}
              <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                  <FileText className="w-4 h-4" /> 7. Uploaded Certificates & Identification Documents
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { key: 'photo', label: 'Photo', url: reviewInfo.photo },
                    { key: 'signature', label: 'Signature', url: reviewInfo.signature },
                    { key: 'marks_card_10th', label: '10th Marks', url: reviewInfo.marks_card_10th },
                    { key: 'marks_card_12th', label: '12th Marks', url: reviewInfo.marks_card_12th },
                    { key: 'transfer_certificate', label: 'Transfer Cert', url: reviewInfo.transfer_certificate },
                    { key: 'aadhaar_card', label: 'Aadhaar Card', url: reviewInfo.aadhaar_card },
                  ].map(doc => (
                    <div key={doc.key} className="p-2.5 rounded border border-border bg-muted/20 text-center space-y-1.5 flex flex-col justify-between items-center">
                      <span className="text-[11px] font-medium text-foreground">{doc.label}</span>
                      {doc.url ? (
                        <div className="space-y-1 w-full">
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                            <Check className="w-3 h-3" /> Attached
                          </span>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block text-[10px] text-primary hover:underline truncate w-full"
                          >
                            View File
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Not Uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 8: OFFICE VERIFICATION & PCM MARKS */}
              <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                  <CheckCircle className="w-4 h-4" /> 8. Office Verification & PCM Subject Marks
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs bg-muted/20 p-3 rounded">
                  <div><span className="text-muted-foreground block text-[11px]">Physics</span><strong className="text-foreground">{reviewInfo.physics_marks}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Maths</span><strong className="text-foreground">{reviewInfo.maths_marks}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Chemistry</span><strong className="text-foreground">{reviewInfo.chemistry_marks}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Biology / Others</span><strong className="text-foreground">{reviewInfo.biology_others_marks}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Total PCM</span><strong className="text-foreground font-mono">{reviewInfo.total_subject_marks}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Percentage</span><strong className="text-primary font-mono">{reviewInfo.subject_percentage}</strong></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div><span className="text-muted-foreground block text-[11px]">Aadhaar No.</span><strong className="text-foreground font-mono">{reviewInfo.aadhaar_no}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">PAN No.</span><strong className="text-foreground font-mono">{reviewInfo.pan_no}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Place</span><strong className="text-foreground">{reviewInfo.place}</strong></div>
                  <div><span className="text-muted-foreground block text-[11px]">Application Date</span><strong className="text-foreground">{reviewInfo.application_date}</strong></div>
                </div>
              </div>

              {/* SECTION 9: STAGE PROGRESSION ACTIONS */}
              <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider border-b border-border pb-2">
                  <UserCheck className="w-4 h-4" /> 9. Application Actions & Status Progression
                </div>
                
                {(() => {
                  const currentStatus = selectedApp?.enquiry_details?.status;
                  const isRejected = currentStatus === 'rejected';
                  const currentIndex = appStages.indexOf(currentStatus);
                  const isVerified = currentStatus === 'documents_verified' || selectedApp?.is_verified || currentIndex >= appStages.indexOf('documents_verified');
                  const isConfirmed = currentStatus === 'admission_confirmed' || currentIndex >= appStages.indexOf('admission_confirmed');
                  const isEnrolled = currentStatus === 'enrolled';
                  
                  const verifyDisabled = isRejected || isVerified;
                  const confirmDisabled = isRejected || isConfirmed;
                  const enrollDisabled = isRejected || isEnrolled;

                  return (
                    <div className={cn(
                      "grid gap-2.5 w-full",
                      isEnrolled 
                        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-5" 
                        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
                    )}>
                      {isEnrolled && (
                        <Button 
                          onClick={() => printFullAdmissionApplication(selectedApp)}
                          variant="outline" 
                          size="sm" 
                          className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 justify-center text-xs h-9 font-medium"
                          title="Download Complete 5-Page Filled Admission Application & Confirmation Dossier"
                        >
                          <Download className="w-4 h-4 mr-1.5 shrink-0" /> Download Application
                        </Button>
                      )}

                      <Button 
                        onClick={() => handleUpdateStatus(selectedApp.id, 'documents_verified')}
                        variant={isVerified ? "default" : "outline"}
                        size="sm" 
                        className={cn(
                          "w-full justify-center text-xs h-9 font-medium transition-colors",
                          isVerified 
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white cursor-default opacity-100 shadow-sm" 
                            : "text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-800"
                        )}
                        disabled={verifyDisabled}
                      >
                        {isVerified ? (
                          <><Check className="w-4 h-4 mr-1.5 shrink-0" /> Verified</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-1.5 shrink-0" /> Verify Documents</>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={() => handleUpdateStatus(selectedApp.id, 'admission_confirmed')}
                        variant={isConfirmed ? "default" : "outline"}
                        size="sm" 
                        className={cn(
                          "w-full justify-center text-xs h-9 font-medium transition-colors",
                          isConfirmed 
                            ? "bg-blue-600 hover:bg-blue-600 text-white cursor-default opacity-100 shadow-sm" 
                            : "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-800"
                        )}
                        disabled={confirmDisabled}
                      >
                        {isConfirmed ? (
                          <><CheckCircle className="w-4 h-4 mr-1.5 shrink-0" /> Confirmed</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-1.5 shrink-0" /> Confirm Admission</>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={() => handleEnroll(selectedApp.id)}
                        size="sm" 
                        className={cn(
                          "w-full justify-center text-xs h-9 shadow-sm font-medium transition-colors",
                          isEnrolled 
                            ? "bg-purple-600 hover:bg-purple-600 text-white cursor-default opacity-100" 
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        disabled={enrollDisabled}
                      >
                        {isEnrolled ? (
                          <><UserCheck className="w-4 h-4 mr-1.5 shrink-0" /> Enrolled</>
                        ) : (
                          <><UserCheck className="w-4 h-4 mr-1.5 shrink-0" /> Enroll as Student</>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                        variant="outline" 
                        size="sm" 
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:border-red-800 justify-center text-xs h-9"
                        disabled={isRejected}
                      >
                        <XCircle className="w-4 h-4 mr-1.5 shrink-0" /> Reject
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ENROLLMENT ASSIGNMENT MODAL (Batch, Branch, Sem, Section, Cycle)            */}
      {/* ========================================================================= */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Student Enrollment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">Please assign the student to their respective batch, branch, semester, and section to finalize enrollment.</p>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Batch *</Label>
              <Select value={enrollBatchId} onValueChange={setEnrollBatchId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  {optionsData.batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Branch *</Label>
              <Select value={enrollBranchId} onValueChange={(val) => { setEnrollBranchId(val); setEnrollSemesterId(""); setEnrollSectionId(""); }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {optionsData.branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Semester *</Label>
              <Select value={enrollSemesterId} onValueChange={(val) => { setEnrollSemesterId(val); setEnrollSectionId(""); }} disabled={!enrollBranchId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                <SelectContent>
                  {optionsData.semesters.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()} className="text-xs">Semester {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CYCLE SELECTION (P-CYCLE / C-CYCLE FOR 1ST & 2ND SEMESTERS) */}
            {(() => {
              const selectedSemObj = optionsData.semesters.find(s => String(s.id) === String(enrollSemesterId));
              const semNum = selectedSemObj ? Number(selectedSemObj.number) : 0;
              const isHigherSem = semNum > 2;

              if (isHigherSem) return null;

              return (
                <div className="space-y-1.5 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                  <Label className="text-xs font-semibold text-primary flex items-center justify-between">
                    <span>Academic Cycle *</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(For 1st &amp; 2nd Sem)</span>
                  </Label>
                  <Select value={enrollCycle} onValueChange={(val: 'P' | 'C') => setEnrollCycle(val)}>
                    <SelectTrigger className="text-xs bg-background"><SelectValue placeholder="Select Cycle (P or C)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P" className="text-xs font-medium">Physics Cycle (P-Cycle)</SelectItem>
                      <SelectItem value="C" className="text-xs font-medium">Chemistry Cycle (C-Cycle)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Section *</Label>
              <Select value={enrollSectionId} onValueChange={setEnrollSectionId} disabled={!enrollSemesterId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select Section" /></SelectTrigger>
                <SelectContent>
                  {optionsData.sections.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setEnrollModalOpen(false)} disabled={isEnrolling}>Cancel</Button>
            <Button size="sm" onClick={submitEnrollment} disabled={!enrollBranchId || !enrollBatchId || !enrollSemesterId || !enrollSectionId || isEnrolling} className="bg-primary text-white">
              {isEnrolling ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin shrink-0" /> Enrolling...</> : 'Enroll Student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
