import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface ApplicationWizardProps {
  isModal?: boolean;
  onSuccess?: () => void;
}

const ApplicationWizard: React.FC<ApplicationWizardProps> = ({ isModal = false, onSuccess }) => {
  const { org_slug } = useParams<{ org_slug: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enquiryId, setEnquiryId] = useState<number | null>(null);
  const [submittingApp, setSubmittingApp] = useState(false);

  // Form State
  const [enquiryData, setEnquiryData] = useState({ name: '', email: '', phone: '', course_interested: '', city: '' });
  const [personalData, setPersonalData] = useState({ dob: '', gender: '', address: '' });
  const [academicData, setAcademicData] = useState({ marks_10th: '', marks_12th: '', previous_degree_marks: '' });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    marks_card_10th: null,
    marks_card_12th: null,
    transfer_certificate: null,
    aadhaar_card: null,
    photo: null,
    signature: null
  });

  useEffect(() => {
    fetchCourses();
  }, [org_slug]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`/api/admission/public/${org_slug}/`);
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...enquiryData };
      if (!payload.course_interested) {
        delete payload.course_interested;
      }
      const res = await axios.post(`/api/admission/public/${org_slug}/enquiry/`, payload);
      setEnquiryId(res.data.id);
      setStep(2);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit enquiry.',
        confirmButtonColor: 'var(--primary)'
      });
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    
    // Final Submit
    if (!enquiryId) return;

    Swal.fire({
      title: 'Submit Application?',
      text: 'Are you sure you want to submit your application? Please make sure all details and documents are correct.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--muted)'
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setSubmittingApp(true);
      try {
        const formData = new FormData();
        formData.append('dob', personalData.dob);
        formData.append('gender', personalData.gender);
        formData.append('address', personalData.address);
        formData.append('marks_10th', academicData.marks_10th);
        formData.append('marks_12th', academicData.marks_12th);
        formData.append('previous_degree_marks', academicData.previous_degree_marks);

        Object.entries(files).forEach(([key, file]) => {
          if (file) formData.append(key, file);
        });

        await axios.post(`/api/admission/public/${org_slug}/application/${enquiryId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        await Swal.fire({
          icon: 'success',
          title: 'Submitted!',
          text: 'Application Submitted Successfully!',
          confirmButtonColor: 'var(--primary)'
        });
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(`/admissions/${org_slug}`);
        }
      } catch (err: any) {
        console.error(err);
        let errorMsg = 'Failed to submit application.';
        if (err.response?.status === 500) {
          errorMsg = 'Failed to submit application. One or more of your uploaded file names may be too long (maximum 100 characters). Please rename your files to be shorter and try again.';
        } else if (err.response?.data) {
          const data = err.response.data;
          if (typeof data === 'object') {
            const firstKey = Object.keys(data)[0];
            const firstVal = data[firstKey];
            if (Array.isArray(firstVal)) {
              errorMsg = `${firstKey.replace('_', ' ')}: ${firstVal[0]}`;
            } else if (typeof firstVal === 'string') {
              errorMsg = firstVal;
            }
          }
        }
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: errorMsg,
          confirmButtonColor: 'var(--primary)'
        });
      } finally {
        setSubmittingApp(false);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [key]: e.target.files[0] });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className={isModal ? "w-full" : "w-full max-w-3xl mx-auto"}>
      <div className={isModal ? "space-y-4" : "bg-card text-card-foreground p-6 md:p-10 rounded-3xl shadow-2xl border border-border"}>
        {!isModal && <h2 className="text-3xl font-bold mb-8 text-center">Admission Application</h2>}
        
        <div className={`flex justify-between relative px-4 ${isModal ? 'mb-10' : 'mb-12'}`}>
          <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2"></div>
          {['Enquiry', 'Personal', 'Academic', 'Documents'].map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex flex-col items-center gap-2 relative">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shadow-sm transition-colors ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {s}
                </div>
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground absolute top-9 md:top-11 whitespace-nowrap">{label}</span>
              </div>
            );
          })}
        </div>

        {step === 1 ? (
          <form onSubmit={handleEnquirySubmit} className={`space-y-4 ${isModal ? 'mt-6' : 'mt-8'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" required value={enquiryData.name} onChange={e => setEnquiryData({...enquiryData, name: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" required value={enquiryData.email} onChange={e => setEnquiryData({...enquiryData, email: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" required value={enquiryData.phone} onChange={e => setEnquiryData({...enquiryData, phone: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input type="text" value={enquiryData.city} onChange={e => setEnquiryData({...enquiryData, city: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Course of Interest</label>
              <Select 
                value={enquiryData.course_interested} 
                onValueChange={val => setEnquiryData({...enquiryData, course_interested: val})}
              >
                <SelectTrigger className="w-full bg-background border-input">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px] overflow-y-auto thin-scrollbar">
                  {courses.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Start Application</Button>
          </form>
        ) : (
          <form onSubmit={handleApplicationSubmit} className={`space-y-4 ${isModal ? 'mt-6' : 'mt-8'}`}>
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal border-input bg-background ${!personalData.dob && "text-muted-foreground"}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {personalData.dob ? (
                            new Date(personalData.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={1930}
                          toYear={new Date().getFullYear()}
                          selected={personalData.dob ? new Date(personalData.dob) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              setPersonalData({...personalData, dob: `${y}-${m}-${d}`});
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
                              const handleChange = (value: string) => {
                                const changeEvent = {
                                  target: { value },
                                } as React.ChangeEvent<HTMLSelectElement>;
                                onChange?.(changeEvent);
                              };
                              return (
                                <Select
                                  value={value?.toString()}
                                  onValueChange={(value) => {
                                    handleChange(value);
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-[fit-content] py-0 px-2 text-xs font-medium border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-0 focus:ring-offset-0">
                                    <SelectValue>{selected?.props.children}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[240px] overflow-y-auto thin-scrollbar">
                                    {options.map((option) => (
                                      <SelectItem
                                        key={option.props.value}
                                        value={option.props.value?.toString() ?? ""}
                                      >
                                        {option.props.children}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <Select 
                      value={personalData.gender} 
                      onValueChange={val => setPersonalData({...personalData, gender: val})}
                    >
                      <SelectTrigger className="w-full bg-background border-input">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Permanent Address</label>
                  <textarea required value={personalData.address} onChange={e => setPersonalData({...personalData, address: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" rows={3}></textarea>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">10th Marks (%)</label>
                    <input type="number" step="0.01" required value={academicData.marks_10th} onChange={e => setAcademicData({...academicData, marks_10th: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">12th Marks (%)</label>
                    <input type="number" step="0.01" required value={academicData.marks_12th} onChange={e => setAcademicData({...academicData, marks_12th: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Previous Degree Marks (%) <span className="text-muted-foreground text-xs">(If applicable)</span></label>
                    <input type="number" step="0.01" value={academicData.previous_degree_marks} onChange={e => setAcademicData({...academicData, previous_degree_marks: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'photo', label: 'Passport Photo' },
                  { key: 'signature', label: 'Signature' },
                  { key: 'marks_card_10th', label: '10th Marks Card' },
                  { key: 'marks_card_12th', label: '12th Marks Card' },
                  { key: 'transfer_certificate', label: 'Transfer Certificate' },
                  { key: 'aadhaar_card', label: 'Aadhaar Card' }
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="block text-sm font-medium">{label}</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        id={`file-input-${key}`}
                        accept="image/*,.pdf" 
                        onChange={e => handleFileChange(e, key)} 
                        className="sr-only" 
                      />
                      <label 
                        htmlFor={`file-input-${key}`}
                        className="flex items-center justify-between px-4 py-2 border border-input rounded bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm font-medium transition-colors"
                      >
                        <span className="truncate max-w-[70%] text-muted-foreground">
                          {files[key] ? files[key]?.name : "Choose file..."}
                        </span>
                        <span className="text-xs bg-primary/10 text-primary py-1 px-2.5 rounded shrink-0">
                          Browse
                        </span>
                      </label>
                    </div>
                    {files[key] && (
                      <div className="flex justify-end pr-1">
                        <a
                          href={URL.createObjectURL(files[key]!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={submittingApp}>Back</Button>
              <Button type="submit" disabled={submittingApp}>
                {step === 4 ? (
                  submittingApp ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" /> Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default ApplicationWizard;
