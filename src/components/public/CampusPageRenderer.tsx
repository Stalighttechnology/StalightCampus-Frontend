import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Quote, GraduationCap, ArrowRight, MapPin, Phone, Mail, ChevronDown, CheckCircle, ExternalLink, Play, BookOpen } from 'lucide-react';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_ENDPOINT } from '../../utils/config';
import Swal from 'sweetalert2';

interface Block {
  id: string;
  type: string;
  data: any;
}

interface CampusPageRendererProps {
  blocks: Block[];
  orgName: string;
  orgSlug: string;
  isOpen: boolean;
  isPreviewMode?: boolean;
  onApplyClick?: () => void;
}

const CampusPageRenderer: React.FC<CampusPageRendererProps> = ({ blocks, orgName, orgSlug, isOpen, isPreviewMode = false, onApplyClick }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Enquiry form state
  const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', email: '', course_interested: '', message: '' });
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get(`${API_ENDPOINT}/admission/public/${orgSlug}/`);
        setCourses(res.data.courses || []);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    };
    if (orgSlug) {
      fetchCourses();
    }
  }, [orgSlug]);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  const handleApplyClick = () => {
    if (onApplyClick) {
      onApplyClick();
    } else {
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const submitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreviewMode) {
      setEnquiryStatus('success');
      setTimeout(() => setEnquiryStatus('idle'), 3000);
      return;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(enquiryForm.email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: 'var(--primary)'
      });
      return;
    }

    // Phone Validation
    const cleanPhone = enquiryForm.phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(?:\+91)?\d{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Phone Number',
        text: 'Please enter a valid 10-digit mobile number (with or without +91 prefix).',
        confirmButtonColor: 'var(--primary)'
      });
      return;
    }
    
    setEnquiryStatus('submitting');
    try {
      const payload = { ...enquiryForm, phone: cleanPhone };
      if (!payload.course_interested) {
        delete payload.course_interested;
      }
      await axios.post(`${API_ENDPOINT}/admission/public/${orgSlug}/enquiry/`, payload);
      setEnquiryStatus('success');
      setEnquiryForm({ name: '', phone: '', email: '', course_interested: '', message: '' });
      setTimeout(() => setEnquiryStatus('idle'), 5000);
    } catch (err) {
      console.error(err);
      setEnquiryStatus('error');
      setTimeout(() => setEnquiryStatus('idle'), 3000);
    }
  };

  return (
    <div className="w-full font-sans">
      <main className="flex flex-col w-full">
        {blocks.map((block: Block, idx: number) => {
          
          if (block.type === 'hero') {
            const hasVideo = block.data.backgroundVideoUrl && block.data.backgroundVideoUrl !== '';
            return (
              <section id={block.type} key={idx} className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
                {hasVideo ? (
                  <video 
                    autoPlay loop muted playsInline
                    className="absolute inset-0 z-0 w-full h-full object-cover transform scale-105"
                    src={block.data.backgroundVideoUrl}
                  />
                ) : (
                  <div 
                    className="absolute inset-0 z-0 bg-cover bg-center transform scale-105"
                    style={{ 
                      backgroundImage: `url(${block.data.bannerUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop'})` 
                    }}
                  />
                )}
                
                <div 
                  className="absolute inset-0 z-10" 
                  style={{ backgroundColor: `rgba(0,0,0, ${block.data.overlayOpacity || 0.6})` }}
                ></div>
                
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="z-20 flex flex-col items-center text-center max-w-5xl mx-auto px-4 md:px-6 space-y-6 md:space-y-8 pt-20"
                >
                  <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs md:text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Admissions {isOpen ? 'Open' : 'Closed'} for 2026
                  </motion.div>
                  
                  <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight px-2">
                    {block.data.title || 'Welcome to Campus'}
                  </motion.h2>
                  
                  <motion.p variants={fadeUp} className="text-lg md:text-xl lg:text-2xl text-white/80 max-w-3xl font-light leading-relaxed px-4">
                    {block.data.subtitle || 'A great place to learn'}
                  </motion.p>
                  
                  {isOpen && (
                    <motion.div variants={fadeUp} className="pt-8">
                      <Button 
                        size="lg" 
                        className="text-lg px-10 py-8 rounded-full shadow-2xl shadow-primary/30 hover:scale-105 transition-transform duration-300 gap-3"
                        onClick={() => {
                          if (block.data.ctaLink === '#apply' && onApplyClick) {
                            onApplyClick();
                          } else if (block.data.ctaLink) {
                            if (isPreviewMode) alert(`Would navigate to ${block.data.ctaLink}`);
                            else window.location.href = block.data.ctaLink;
                          } else {
                            handleApplyClick();
                          }
                        }}
                      >
                        {block.data.ctaText || 'Start Your Application'}
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </section>
            );
          }

          if (block.type === 'about') {
            const stats = block.data.stats || [];
            return (
              <section id={block.type} key={idx} className="relative py-16 md:py-24 px-4 md:px-6">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10"></div>
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-16"
                >
                  <motion.div variants={fadeUp} className="flex-1 space-y-6 md:space-y-8 w-full">
                    <h4 className="text-primary font-semibold tracking-wider uppercase text-sm">Our Heritage</h4>
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">A Legacy of <span className="text-primary">Excellence</span></h3>
                    <div 
                      className="text-lg text-muted-foreground leading-relaxed prose prose-lg dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: block.data.text || '<p>About our organization...</p>' }}
                    />
                    
                    {stats.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 md:gap-6 pt-6 md:pt-8">
                        {stats.map((stat: any, i: number) => (
                          <div key={i} className="border-l-2 border-primary pl-3 md:pl-4">
                            <h4 className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</h4>
                            <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                  
                  <motion.div variants={fadeUp} className="flex-1 relative w-full mt-8 md:mt-0">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10 transform scale-90 translate-x-10 translate-y-10"></div>
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border bg-card">
                      <img 
                        src={block.data.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1000&auto=format&fit=crop'} 
                        alt="Campus" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'facilities') {
            const facilities = block.data.facilities || [
              { title: 'Library', desc: 'State-of-the-art digital library' },
              { title: 'Labs', desc: 'Modern research laboratories' }
            ];
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6 bg-muted/20 border-y border-border/50">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-12 md:space-y-16"
                >
                  <div className="text-center max-w-3xl mx-auto space-y-4">
                    <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Infrastructure</motion.h4>
                    <motion.h3 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">World-Class Facilities</motion.h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {facilities.map((fac: any, i: number) => (
                      <motion.div key={i} variants={fadeUp} className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg transition-all group">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <CheckCircle className="text-primary w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-bold mb-3">{fac.title}</h4>
                        <p className="text-muted-foreground">{fac.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'placement') {
            const { percentage = '95%', highest = '25 LPA', average = '6.5 LPA', recruiters = [] } = block.data;
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6 bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full"></div>
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto relative z-10"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <div className="space-y-6 md:space-y-8">
                      <h4 className="font-semibold tracking-wider uppercase text-sm text-primary-foreground/80">Careers</h4>
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold">Outstanding Placement Record</h3>
                      <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
                        Our dedicated placement cell ensures you get the best start to your career.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                        <div>
                          <p className="text-3xl md:text-4xl font-black">{percentage}</p>
                          <p className="text-xs md:text-sm font-medium uppercase tracking-wider mt-2 opacity-80">Placed</p>
                        </div>
                        <div>
                          <p className="text-3xl md:text-4xl font-black">{highest}</p>
                          <p className="text-xs md:text-sm font-medium uppercase tracking-wider mt-2 opacity-80">Highest</p>
                        </div>
                        <div>
                          <p className="text-3xl md:text-4xl font-black">{average}</p>
                          <p className="text-xs md:text-sm font-medium uppercase tracking-wider mt-2 opacity-80">Average</p>
                        </div>
                      </div>
                    </div>
                    {recruiters.length > 0 && (
                      <div className="bg-background/10 backdrop-blur-md border border-white/20 p-6 md:p-8 rounded-3xl mt-8 lg:mt-0">
                        <p className="text-sm font-semibold uppercase tracking-wider mb-6 text-center">Top Recruiters</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                          {recruiters.map((logoUrl: string, i: number) => (
                            <div key={i} className="aspect-video bg-white rounded-xl flex items-center justify-center p-4">
                              <img src={logoUrl} alt="Recruiter" className="max-w-full max-h-full object-contain filter grayscale hover:grayscale-0 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'courses') {
            const courseList = block.data.autoFetch ? block.data.fetchedCourses || [] : block.data.items || [];
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-12 md:space-y-16"
                >
                  <div className="text-center max-w-3xl mx-auto space-y-4">
                    <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Academic Programs</motion.h4>
                    <motion.h3 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Discover Your Future</motion.h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {courseList.map((course: any, i: number) => (
                      <motion.div key={i} variants={fadeUp} className="group bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300">
                        <div className="h-48 bg-muted relative overflow-hidden">
                          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply group-hover:bg-primary/0 transition-colors z-10"></div>
                          <img src={course.image || `https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop`} alt={course.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute top-4 left-4 z-20">
                            <span className="px-3 py-1 bg-background/90 backdrop-blur-md rounded-full text-xs font-bold text-foreground uppercase tracking-wider shadow-sm">
                              {course.degree_type || course.department || 'Degree'}
                            </span>
                          </div>
                        </div>
                        <div className="p-8 space-y-4">
                          <h4 className="text-2xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{course.name}</h4>
                          <p className="text-muted-foreground line-clamp-2">{course.description || "Join this exciting program."}</p>
                          <div className="pt-4 flex items-center justify-between border-t border-border">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <BookOpen className="w-4 h-4 text-primary" />
                              {course.duration || '4 Years'}
                            </div>
                            <Button variant="ghost" className="group-hover:bg-primary group-hover:text-primary-foreground transition-all" onClick={handleApplyClick}>
                              Apply
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {courseList.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
                        <p>No courses configured yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'testimonials') {
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-12 md:space-y-16"
                >
                  <div className="text-center max-w-3xl mx-auto space-y-4">
                    <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Success Stories</motion.h4>
                    <motion.h3 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">What Our Students Say</motion.h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {block.data.items?.map((item: any, i: number) => (
                      <motion.div 
                        key={i} 
                        variants={fadeUp}
                        className="bg-card p-8 rounded-3xl border border-border shadow-sm relative group hover:shadow-lg transition-shadow"
                      >
                        <Quote className="w-12 h-12 text-primary/10 absolute top-8 left-8 -z-10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                          <p className="text-lg text-foreground leading-relaxed italic mb-8 pt-4">"{item.quote}"</p>
                          <div className="flex items-center gap-4">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-xl">
                                {item.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.courseName || 'Alumni'}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'gallery') {
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6 bg-muted/30 border-y border-border/50">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-8 md:space-y-12"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 border-b border-border pb-6 md:pb-8">
                    <div className="space-y-2 md:space-y-4">
                      <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Campus Life</motion.h4>
                      <motion.h3 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Life at {orgName}</motion.h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {block.data.images?.map((img: string, i: number) => (
                      <motion.div 
                        key={i} 
                        variants={fadeUp}
                        className={`group relative overflow-hidden rounded-2xl shadow-sm ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                        <img 
                          src={img || 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1000&auto=format&fit=crop'} 
                          alt={`Gallery ${i}`} 
                          className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${i === 0 ? 'h-full min-h-[400px]' : 'h-64'}`} 
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'faq') {
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-3xl mx-auto space-y-10 md:space-y-12"
                >
                  <div className="text-center space-y-4">
                    <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Questions?</motion.h4>
                    <motion.h3 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Frequently Asked Questions</motion.h3>
                  </div>
                  
                  <div className="space-y-4">
                    {block.data.items?.map((faq: any, i: number) => (
                      <motion.div key={i} variants={fadeUp} className="border border-border rounded-xl bg-card overflow-hidden transition-all">
                        <button 
                          className="w-full px-6 py-4 text-left flex justify-between items-center font-semibold hover:bg-muted/50 transition-colors"
                          onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                        >
                          {faq.question}
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                        </button>
                        {activeFaq === i && (
                          <div className="px-6 pb-4 text-muted-foreground leading-relaxed border-t border-border mt-2 pt-4">
                            {faq.answer}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'enquiry') {
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6 bg-muted/20 border-t border-border/50">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-4xl mx-auto bg-card rounded-3xl shadow-xl border border-border overflow-hidden flex flex-col md:flex-row"
                >
                  <div className="bg-primary text-primary-foreground p-6 md:p-10 md:w-2/5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-4">Request Information</h3>
                      <p className="text-primary-foreground/80 leading-relaxed mb-8 text-sm md:text-base">
                        Have questions about admissions, courses, or campus life? Drop us a message and our counseling team will get back to you shortly.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3"><Phone className="w-5 h-5" /> {block.data.phone || '+1 234 567 890'}</div>
                      <div className="flex items-center gap-3"><Mail className="w-5 h-5" /> {block.data.email || 'admissions@campus.edu'}</div>
                    </div>
                  </div>
                  
                  <div className="p-6 md:p-10 md:w-3/5">
                    {enquiryStatus === 'success' ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                          <CheckCircle className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-bold text-foreground">Thank You!</h4>
                        <p className="text-muted-foreground">Your enquiry has been received. Our team will contact you soon.</p>
                      </div>
                    ) : (
                      <form onSubmit={submitEnquiry} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <input required type="text" className="w-full p-3 border border-input rounded-xl bg-background" value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Phone Number</label>
                            <input required type="tel" className="w-full p-3 border border-input rounded-xl bg-background" value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value.replace(/[^0-9+]/g, '')})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email Address</label>
                          <input required type="email" className="w-full p-3 border border-input rounded-xl bg-background" value={enquiryForm.email} onChange={e => setEnquiryForm({...enquiryForm, email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Interested Course (Optional)</label>
                          <Select 
                            value={enquiryForm.course_interested} 
                            onValueChange={val => setEnquiryForm({...enquiryForm, course_interested: val})}
                          >
                            <SelectTrigger className="w-full p-3 border border-input rounded-xl bg-background text-left">
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Your Message</label>
                          <textarea required className="w-full p-3 border border-input rounded-xl bg-background min-h-[100px]" value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})}></textarea>
                        </div>
                        {enquiryStatus === 'error' && <p className="text-red-500 text-sm">Error submitting form. Please try again.</p>}
                        <Button type="submit" className="w-full p-6 text-lg rounded-xl" disabled={enquiryStatus === 'submitting'}>
                          {enquiryStatus === 'submitting' ? 'Submitting...' : 'Send Enquiry'}
                        </Button>
                      </form>
                    )}
                  </div>
                </motion.div>
              </section>
            );
          }

          if (block.type === 'contact') {
            return (
              <section id={block.type} key={idx} className="py-16 md:py-24 px-4 md:px-6">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center"
                >
                  <div className="space-y-6 md:space-y-8">
                    <div>
                      <h4 className="text-primary font-semibold tracking-wider uppercase text-sm mb-2">Get in Touch</h4>
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Contact Us</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-bold text-lg">Address</h5>
                          <p className="text-muted-foreground">{block.data.address || '123 University Avenue, Tech District, 10001'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <Phone className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-bold text-lg">Phone</h5>
                          <p className="text-muted-foreground">{block.data.phone || '+1 (555) 123-4567'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-bold text-lg">Email</h5>
                          <p className="text-muted-foreground">{block.data.email || 'admissions@campus.edu'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {block.data.whatsappLink && (
                      <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => window.open(block.data.whatsappLink, '_blank')}>
                        Chat on WhatsApp
                      </Button>
                    )}
                  </div>
                  
                  <div className="h-[300px] md:h-[400px] w-full rounded-3xl overflow-hidden shadow-lg border border-border bg-muted">
                    {block.data.googleMapsUrl ? (
                      <iframe 
                        src={block.data.googleMapsUrl} 
                        width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <MapPin className="w-12 h-12 mb-4 opacity-50" />
                        <p>Google Maps Embed URL not provided</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </section>
            );
          }

          return null;
        })}
      </main>
    </div>
  );
};

export default CampusPageRenderer;
