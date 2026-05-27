import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

const ApplicationWizard: React.FC = () => {
  const { org_slug } = useParams<{ org_slug: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enquiryId, setEnquiryId] = useState<number | null>(null);

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
      alert('Failed to submit enquiry.');
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
      alert('Application Submitted Successfully!');
      navigate(`/admissions/${org_slug}`);
    } catch (err) {
      console.error(err);
      alert('Failed to submit application.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [key]: e.target.files[0] });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-card text-card-foreground p-6 md:p-10 rounded-3xl shadow-2xl border border-border">
        <h2 className="text-3xl font-bold mb-8 text-center">Admission Application</h2>
        
        <div className="flex justify-between mb-12 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2"></div>
          {['Enquiry', 'Personal', 'Academic', 'Documents'].map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {s}
                </div>
                <span className="text-xs font-medium text-muted-foreground absolute -bottom-6">{label}</span>
              </div>
            );
          })}
        </div>

        {step === 1 ? (
          <form onSubmit={handleEnquirySubmit} className="space-y-6 mt-8">
            <div className="grid grid-cols-2 gap-4">
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
              <select required={courses.length > 0} value={enquiryData.course_interested} onChange={e => setEnquiryData({...enquiryData, course_interested: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background">
                <option value="">Select a course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full">Start Application</Button>
          </form>
        ) : (
          <form onSubmit={handleApplicationSubmit} className="space-y-6 mt-8">
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                    <input type="date" required value={personalData.dob} onChange={e => setPersonalData({...personalData, dob: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <select required value={personalData.gender} onChange={e => setPersonalData({...personalData, gender: e.target.value})} className="w-full px-4 py-2 border border-input rounded bg-background">
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
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
                <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 grid grid-cols-2 gap-4">
                {[
                  { key: 'photo', label: 'Passport Photo' },
                  { key: 'signature', label: 'Signature' },
                  { key: 'marks_card_10th', label: '10th Marks Card' },
                  { key: 'marks_card_12th', label: '12th Marks Card' },
                  { key: 'transfer_certificate', label: 'Transfer Certificate' },
                  { key: 'aadhaar_card', label: 'Aadhaar Card' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, key)} className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              <Button type="submit">{step === 4 ? 'Submit Application' : 'Continue'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default ApplicationWizard;
