import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowRight, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CampusPageRenderer from './CampusPageRenderer';
import ApplicationWizard from './ApplicationWizard';

const EmbeddedQuickEnquiry: React.FC<{ orgSlug: string; courses: any[]; onApplyClick: () => void }> = ({ orgSlug, courses, onApplyClick }) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', course_interested: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await axios.post(`${API_ENDPOINT}/admission/public/${orgSlug}/enquiry/`, form);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Enquiry Submitted!</h3>
        <p className="text-sm text-muted-foreground">Thank you! Our admissions counseling team will get back to you shortly.</p>
        <Button variant="outline" size="sm" onClick={onApplyClick} className="mt-2 text-xs">
          Want to complete full application now? Click here
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Full Name</label>
          <input required type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 text-sm border border-input rounded-xl bg-background text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Phone Number</label>
          <input required type="tel" placeholder="+91 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/[^0-9+]/g, '') })} className="w-full p-2.5 text-sm border border-input rounded-xl bg-background text-foreground" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Email Address</label>
        <input required type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-2.5 text-sm border border-input rounded-xl bg-background text-foreground" />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Interested Course (Optional)</label>
        <Select value={form.course_interested} onValueChange={val => setForm({ ...form, course_interested: val })}>
          <SelectTrigger className="w-full p-2.5 text-sm border border-input rounded-xl bg-background">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {courses.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Message / Question</label>
        <textarea required placeholder="Any specific questions regarding admissions..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full p-2.5 text-sm border border-input rounded-xl bg-background text-foreground min-h-[70px]" />
      </div>
      {status === 'error' && <p className="text-xs text-red-500 font-medium">Failed to submit enquiry. Please try again.</p>}
      <Button type="submit" className="w-full py-2.5 text-sm font-semibold rounded-xl" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting...' : 'Submit Enquiry'}
      </Button>
    </form>
  );
};

const AdmissionLanding: React.FC = () => {
  const { org_slug } = useParams<{ org_slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [org_slug]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_ENDPOINT}/admission/public/${org_slug}/`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Loading Campus Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Organization Not Found</h2>
          <p className="text-muted-foreground">The campus page you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const blocks = (data.admission_page_content?.blocks || []).map((block: any) => {
    if (block.type === 'courses' && block.data?.autoFetch) {
      return {
        ...block,
        data: {
          ...block.data,
          fetchedCourses: data.courses || []
        }
      };
    }
    return block;
  });
  const isOpen = data.admission_settings?.is_open ?? true;
  const themePreset = data.admission_settings?.theme?.preset || 'default';

  const getThemeStyle = () => {
    switch (themePreset) {
      case 'ocean': return { '--primary': '221 83% 53%' } as React.CSSProperties;
      case 'emerald': return { '--primary': '142 71% 45%' } as React.CSSProperties;
      case 'rose': return { '--primary': '346 87% 43%' } as React.CSSProperties;
      case 'amber': return { '--primary': '38 92% 50%' } as React.CSSProperties;
      case 'slate': return { '--primary': '215 16% 47%' } as React.CSSProperties;
      default: return {} as React.CSSProperties;
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const isEmbed = searchParams.get('embed') === 'true';
  const embedMode = searchParams.get('mode') || 'contact';

  if (isEmbed) {
    return (
      <div className="w-full min-h-screen bg-background p-2 sm:p-4 border-none shadow-none flex flex-col justify-start" style={getThemeStyle()}>
        <div className="w-full bg-card p-3 sm:p-5 rounded-xl border border-border/60 shadow-sm">
          {embedMode === 'apply' || isApplyModalOpen ? (
            <ApplicationWizard isModal orgSlug={org_slug} preloadedCourses={data.courses} />
          ) : (
            <div className="space-y-3">
              <div className="border-b border-border pb-2.5">
                <h2 className="text-lg font-bold text-foreground">Admission Enquiry</h2>
                <p className="text-xs text-muted-foreground">Fill in your details below to get instant course info & fee details from {data.name}.</p>
              </div>
              <EmbeddedQuickEnquiry orgSlug={org_slug || ''} courses={data.courses || []} onApplyClick={() => setIsApplyModalOpen(true)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/30" style={getThemeStyle()}>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary/10 p-1.5 md:p-2 rounded-lg md:rounded-xl">
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <h1 className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 truncate max-w-[150px] sm:max-w-xs md:max-w-md">{data.name}</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 overflow-x-auto">
            {blocks.filter((b: any) => !['hero', 'enquiry'].includes(b.type)).map((block: any) => {
              const names: Record<string, string> = {
                about: 'About',
                courses: 'Courses',
                facilities: 'Facilities',
                placement: 'Placement',
                testimonials: 'Testimonials',
                gallery: 'Gallery',
                faq: 'FAQ',
                contact: 'Contact'
              };
              const name = names[block.type];
              if (!name) return null;
              return (
                <button 
                  key={block.id} 
                  onClick={() => document.getElementById(block.type)?.scrollIntoView({ behavior: 'smooth' })} 
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {name}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 md:gap-4">
            {isOpen ? (
              <Button 
                onClick={() => setIsApplyModalOpen(true)}
                size="sm"
                className="md:hidden rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold px-4"
              >
                Apply
              </Button>
            ) : null}
            {isOpen ? (
              <Button 
                onClick={() => setIsApplyModalOpen(true)}
                className="hidden md:flex rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold px-6 group"
              >
                Apply Now
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <span className="bg-destructive/10 text-destructive font-semibold px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm">
                Closed
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full">
        {blocks.length === 0 ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
            <GraduationCap className="w-24 h-24 text-muted-foreground/30 mb-6" />
            <h2 className="text-4xl font-bold text-foreground mb-4">Welcome to {data.name}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl">We are currently setting up our digital campus. Please check back soon for updates on admissions and courses.</p>
          </div>
        ) : (
          <CampusPageRenderer 
            blocks={blocks} 
            orgName={data.name} 
            orgSlug={org_slug || ''} 
            isOpen={isOpen} 
            isPreviewMode={false} 
            onApplyClick={() => setIsApplyModalOpen(true)}
            preloadedCourses={data.courses || []}
          />
        )}
      </main>

      {isOpen && (
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent 
            className="w-[90vw] sm:max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:text-white [&>button]:bg-foreground/20 [&>button]:rounded-full [&>button]:p-2 [&>button]:m-2 [&>button]:hover:bg-foreground/40 [&>button]:transition-all"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="bg-background rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] w-full hide-scrollbar">
              <div className="p-5 md:p-6 space-y-4">
                <div className="text-center space-y-1.5">
                  <h4 className="text-primary font-semibold tracking-wider uppercase text-xs md:text-sm">Admissions</h4>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Start Your Journey</h3>
                </div>
                <ApplicationWizard isModal={true} preloadedCourses={data.courses || []} orgSlug={org_slug} onSuccess={() => setIsApplyModalOpen(false)} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <footer className="bg-card border-t border-border text-card-foreground py-12 md:py-16 px-4 md:px-6 mt-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-xs">
              Empowering students with knowledge, skills, and values to excel in the modern world.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground">Quick Links</h4>
            <ul className="space-y-3">
              {blocks.filter((b: any) => !['hero', 'enquiry'].includes(b.type)).slice(0, 4).map((block: any) => {
                const names: Record<string, string> = {
                  about: 'About Us',
                  courses: 'Academic Programs',
                  facilities: 'Facilities',
                  placement: 'Placement',
                  testimonials: 'Testimonials',
                  gallery: 'Campus Gallery',
                  faq: 'FAQ',
                  contact: 'Contact'
                };
                const name = names[block.type];
                if (!name) return null;
                return (
                  <li key={block.id}>
                    <button onClick={() => document.getElementById(block.type)?.scrollIntoView({ behavior: 'smooth' })} className="text-muted-foreground hover:text-primary transition-colors text-left">
                      {name}
                    </button>
                  </li>
                );
              })}
              {isOpen && (
                <li>
                  <button onClick={() => setIsApplyModalOpen(true)} className="text-primary font-semibold hover:underline">
                    Apply Online
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">123 University Avenue, Tech District, 10001</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span className="text-muted-foreground">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span className="text-muted-foreground">admissions@stalightcampus.edu</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-border mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {data.name}. All rights reserved.</p>
          <p>Powered by Stalight Campus</p>
        </div>
      </footer>
    </div>
  );
};

export default AdmissionLanding;
