import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowRight, BookOpen, Quote, MapPin, Phone, Mail } from 'lucide-react';

const AdmissionLanding: React.FC = () => {
  const { org_slug } = useParams<{ org_slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, [org_slug]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/admission/public/${org_slug}/`);
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

  const blocks = data.admission_page_content?.blocks || [];
  const isOpen = data.admission_settings?.is_open ?? true;

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{data.name}</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</a>
            <a href="#courses" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Courses</a>
            <a href="#gallery" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Campus</a>
          </nav>
          <div className="flex items-center gap-4">
            {isOpen ? (
              <Button 
                onClick={() => navigate(`/admissions/${org_slug}/apply`)}
                className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold px-6 group"
              >
                Apply Now
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <span className="bg-destructive/10 text-destructive font-semibold px-4 py-2 rounded-full text-sm">
                Admissions Closed
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full">
        {blocks.map((block: any, idx: number) => {
          if (block.type === 'hero') {
            return (
              <section key={idx} className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center transform scale-105"
                  style={{ 
                    backgroundImage: `url(${block.data.bannerUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop'})` 
                  }}
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
                
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="z-20 flex flex-col items-center text-center max-w-5xl mx-auto px-6 space-y-8 pt-20"
                >
                  <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Admissions {isOpen ? 'Open' : 'Closed'} for 2026
                  </motion.div>
                  
                  <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-tight">
                    {block.data.title}
                  </motion.h2>
                  
                  <motion.p variants={fadeUp} className="text-xl md:text-2xl text-white/80 max-w-3xl font-light leading-relaxed">
                    {block.data.subtitle}
                  </motion.p>
                  
                  {isOpen && (
                    <motion.div variants={fadeUp} className="pt-8">
                      <Button 
                        size="lg" 
                        className="text-lg px-10 py-8 rounded-full shadow-2xl shadow-primary/30 hover:scale-105 transition-transform duration-300 gap-3"
                        onClick={() => navigate(`/admissions/${org_slug}/apply`)}
                      >
                        Start Your Application
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </section>
            );
          }
          if (block.type === 'about') {
            return (
              <section id="about" key={idx} className="relative py-32 px-6">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10"></div>
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16"
                >
                  <motion.div variants={fadeUp} className="flex-1 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-primary font-semibold tracking-wider uppercase text-sm">Discover {data.name}</h4>
                      <h3 className="text-4xl md:text-5xl font-bold leading-tight text-foreground">About Our Institution</h3>
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {block.data.text}
                    </p>
                    <div className="pt-4 flex gap-4">
                      <div className="p-4 bg-card border border-border rounded-2xl flex-1 text-center shadow-sm">
                        <h5 className="text-3xl font-bold text-foreground mb-1">50+</h5>
                        <p className="text-sm text-muted-foreground font-medium">Expert Faculty</p>
                      </div>
                      <div className="p-4 bg-card border border-border rounded-2xl flex-1 text-center shadow-sm">
                        <h5 className="text-3xl font-bold text-foreground mb-1">98%</h5>
                        <p className="text-sm text-muted-foreground font-medium">Placement Rate</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  {block.data.image && (
                    <motion.div variants={fadeUp} className="flex-1 w-full relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4 -z-10"></div>
                      <img 
                        src={block.data.image} 
                        alt="About" 
                        className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3] border border-border/50" 
                      />
                    </motion.div>
                  )}
                </motion.div>
              </section>
            );
          }
          if (block.type === 'courses') {
            return (
              <section id="courses" key={idx} className="py-32 px-6 bg-muted/30 border-y border-border/50 relative overflow-hidden">
                <div className="absolute -left-40 top-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10"></div>
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-16"
                >
                  <div className="text-center max-w-3xl mx-auto space-y-4">
                    <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Academic Programs</motion.h4>
                    <motion.h3 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-foreground">Explore Our Courses</motion.h3>
                    <motion.p variants={fadeUp} className="text-muted-foreground text-lg">Discover programs designed to prepare you for the challenges of tomorrow.</motion.p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.courses?.length > 0 ? data.courses.map((c: any, i: number) => (
                      <motion.div 
                        key={c.id} 
                        variants={fadeUp}
                        className="group bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full"
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary transition-all">
                          <BookOpen className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                        </div>
                        <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{c.name}</h4>
                        <div className="flex items-center gap-2 mb-6">
                          <span className="bg-muted px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground tracking-wider">{c.code}</span>
                          <span className="bg-muted px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground tracking-wider">{c.duration_years} Years</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed flex-1">{c.description}</p>
                        
                        <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">Learn more</span>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.div>
                    )) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <p className="text-lg">No courses available at the moment.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </section>
            );
          }
          if (block.type === 'testimonials') {
            return (
              <section key={idx} className="py-32 px-6">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-16"
                >
                  <div className="text-center max-w-3xl mx-auto space-y-4">
                    <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Success Stories</motion.h4>
                    <motion.h3 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-foreground">What Our Students Say</motion.h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-xl">
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">Alumni</p>
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
              <section id="gallery" key={idx} className="py-32 px-6 bg-muted/30 border-y border-border/50">
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={stagger}
                  className="max-w-7xl mx-auto space-y-16"
                >
                  <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border pb-8">
                    <div className="space-y-4">
                      <motion.h4 variants={fadeUp} className="text-primary font-semibold tracking-wider uppercase text-sm">Campus Life</motion.h4>
                      <motion.h3 variants={fadeUp} className="text-4xl font-bold text-foreground">Life at {data.name}</motion.h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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
          return null;
        })}

        {blocks.length === 0 && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
            <GraduationCap className="w-24 h-24 text-muted-foreground/30 mb-6" />
            <h2 className="text-4xl font-bold text-foreground mb-4">Welcome to {data.name}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl">We are currently setting up our digital campus. Please check back soon for updates on admissions and courses.</p>
          </div>
        )}
      </main>

      <footer className="bg-card border-t border-border text-card-foreground py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
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
              <li><a href="#about" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#courses" className="text-muted-foreground hover:text-primary transition-colors">Academic Programs</a></li>
              <li><a href="#gallery" className="text-muted-foreground hover:text-primary transition-colors">Campus Gallery</a></li>
              {isOpen && (
                <li>
                  <button onClick={() => navigate(`/admissions/${org_slug}/apply`)} className="text-primary font-semibold hover:underline">
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
