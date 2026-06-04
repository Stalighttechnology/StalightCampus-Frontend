import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, animate, useInView, Variants } from "framer-motion";
import {
  Brain, BarChart3, ShieldCheck, Users, User,
  CheckCircle2, Star, Calendar, FileText,
  ClipboardCheck, BookOpen, GraduationCap, MapPin, Quote,
  Bell, ScanFace, LayoutDashboard, Home, Printer, ArrowRight, Zap, Activity, X, Loader2, Send,
  Globe, Megaphone, BarChart, Bus, Library, Target, Wallet, Layout
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// --- Image Imports Placeholders (Originals not found) ---
const campusImg = "https://placehold.co/600x400";
const loginpageImg = "https://placehold.co/600x400";
const leavereqImg = "https://placehold.co/600x400";
const timetableImg = "https://placehold.co/600x400";
const stalightcampus11Img = "https://placehold.co/600x400";
const nebulaaiImg = "https://placehold.co/600x400";
const facerecognImg = "https://placehold.co/600x400";
const resultsImg = "https://placehold.co/600x400";

// --- Custom Animated Number Component ---
const AnimatedNumber = ({ value, duration = 2.5 }: { value: number; duration?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration: duration, ease: "easeOut" });
    }
  }, [isInView, value, duration, motionValue]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
};

// --- Content ---
const tourFeatures = [
  {
    title: "Assignments Dashboard",
    icon: Brain,
    desc: "Manage academic assignments with real-time submission tracking, overdue alerts, grading status, and seamless student-teacher interactio",
    img: nebulaaiImg,
    caption: "Smart Assignment Tracking & Submission System"
  },
  {
    title: "Fee Management",
    icon: Calendar,
    desc: "Automated fee tracking with semester-wise structure, payment records, due alerts, and complete student financial management.",
    img: timetableImg,
    caption: "Smart Student Fee Management & Semester-Based Billing"
  },
  {
    title: "Facial Attendance",
    icon: ScanFace,
    desc: "Biometric face scans for seamless and proxy-free verification.",
    img: facerecognImg,
    caption: "High-Precision Biometric Face Scan Attendance Verification"
  },
  {
    title: "Leave Workflows",
    icon: ClipboardCheck,
    desc: "Hierarchical request paths with immediate notifications.",
    img: leavereqImg,
    caption: "Multi-Level Institutional Leave Request & Approvals Dashboard"
  },
  {
    title: "Academic Results",
    icon: BarChart3,
    desc: "Full gradebook analytics and outcome tracking visualisations.",
    img: resultsImg,
    caption: "Detailed Gradebook Performance Analysis & CO/PO Analytics"
  },
  {
    title: "Student Profiling",
    icon: User,
    desc: "Instantly surface complete information on quick biometric scans.",
    img: campusImg,
    caption: "Instantly Surface Complete Student Profiles on Quick Biometric Scans"
  },
  {
    title: "Institutional Analytics",
    icon: LayoutDashboard,
    desc: "High-level administrative reporting for executive decision making.",
    img: stalightcampus11Img,
    caption: "Stalight Campus Master Command Center Admin Dashboard"
  },
  {
    title: "Secure Portal Gateway",
    icon: ShieldCheck,
    desc: "Enterprise-grade authentication with role filtering.",
    img: loginpageImg,
    caption: "Role-Based Secure Portal Login Gateway"
  }
];

const institutionalPillars = [
  {
    title: "Intelligent Core & Automation",
    subtitle: "Advanced biometric and off-campus verification systems.",
    gradient: "from-pink-500/10 via-purple-500/5 to-transparent",
    borderHover: "group-hover:border-pink-300",
    iconColor: "text-pink-600",
    iconBg: "bg-pink-50",
    icon: Zap,
    features: [
      { key: "stalight-ai", icon: Brain, title: "Stalight Smart Systems", desc: "Smart insights and personalised recommendations for students and faculty." },
      { key: "facial-recognition-attendance", icon: ScanFace, title: "Facial Recognition Attendance", desc: "High-precision facial recognition to automate attendance and prevent proxy marking." },
      { key: "student-info-face-scan", icon: User, title: "Student Info on Face Scan", desc: "Instantly surface student profile and academic info on face-based scan." },
      { key: "location-based-attendance", icon: MapPin, title: "Location Based Attendance", desc: "Geo-fenced attendance options for off-campus activities and fieldwork." }
    ]
  },
  {
    title: "Academic Lifecycle",
    subtitle: "End-to-end administration of academic schedules and content.",
    gradient: "from-purple-500/10 via-blue-500/5 to-transparent",
    borderHover: "group-hover:border-purple-300",
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    icon: GraduationCap,
    features: [
      { key: "timetable-scheduling", icon: Calendar, title: "Timetable & Scheduling", desc: "Automated timetable management with conflict detection and real-time updates." },
      { key: "exam-scheduling", icon: Bell, title: "Exam Scheduling", desc: "Schedule exams, publish timetables and send notifications to stakeholders." },
      { key: "assignment-workflow", icon: FileText, title: "Assignment Workflow", desc: "Creation, submission tracking, grading and deadline enforcement for assignments." },
      { key: "study-material-hub", icon: BookOpen, title: "Study Material Hub", desc: "Centralised digital library for faculty-uploaded resources and student access." },
      { key: "student-management", icon: Users, title: "Student Management", desc: "Admissions, profiles, lifecycle" },
      { key: "course-management", icon: BookOpen, title: "Course Management", desc: "Curriculum, subjects, electives" }
    ]
  },
  {
    title: "Workflows & Operations",
    subtitle: "Smooth routing of internal requests and security permissions.",
    gradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
    borderHover: "group-hover:border-blue-300",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    icon: ShieldCheck,
    features: [
      { key: "leave-approvals", icon: ClipboardCheck, title: "Leave & Approvals", desc: "Structured leave requests with multi-level approvals, tracking, and notifications." },
      { key: "role-based-dashboards", icon: LayoutDashboard, title: "Role-Based Dashboards", desc: "Personalised interfaces for students, faculty, and administrators with relevant data at-a-glance." },
      { key: "question-paper-workflow", icon: Printer, title: "Question Paper Workflow System", desc: "Secure question paper creation, review and distribution workflow." },
      { key: "announcements", icon: Megaphone, title: "Announcements", desc: "Push notifications, broadcasts" },
      { key: "admission-lifecycle", icon: User, title: "Admission Lifecycle", desc: "End-to-end pipeline from lead generation to student onboarding." }
    ]
  },
  {
    title: "Institutional Management",
    subtitle: "Strategic analytics, assets, and financial flows.",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    borderHover: "group-hover:border-amber-300",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    icon: Activity,
    features: [
      { key: "copo-attainment", icon: BarChart3, title: "CO/PO Attainment", desc: "Monitor and report course and program outcomes with analytics and visualisations." },
      { key: "hostel-management", icon: Home, title: "Hostel Management", desc: "Manage hostel allocations, requests, and student housing workflows." },
      { key: "fees-collections", icon: Activity, title: "Fees Collections", desc: "Track fee payments, receipts, and automated reminders for outstanding dues." },
      { key: "performance-analytics", icon: BarChart, title: "Performance Analytics", desc: "Data-driven academic insights" },
      { key: "transport-management", icon: Bus, title: "Transport Management", desc: "Live tracking, fleet routes" },
      { key: "library-management", icon: Library, title: "Library Management", desc: "Digital catalog, issue tracking" },
      { key: "college-website", icon: Layout, title: "Inbuilt College Website", desc: "Ready-to-use customisable templates for institutional branding." }
    ]
  }
];

const featurePills = [
  { title: "Exam Announcements", icon: Bell },
  { title: "Live Attendance", icon: ScanFace },
  { title: "Timetable Sync", icon: Calendar },
  { title: "Leave Approvals", icon: ClipboardCheck },
  { title: "Role Filters", icon: ShieldCheck },
  { title: "IA Marks", icon: BarChart3 },
];

// --- Animations ---
const customEase = [0.16, 1.0, 0.3, 1.0];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: customEase } },
};

const textRevealVariants: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 1.0, ease: customEase } },
};

const MaskedText = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className="overflow-hidden md:overflow-visible inline-block w-full leading-tight py-1 md:py-2">
    <motion.div variants={textRevealVariants} className={className}>{children}</motion.div>
  </div>
);

const StalightCampus = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", official_email: "", phone: "", organization: "", designation: "", interested_solution: "", preferred_date: "", preferred_time: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      full_name: formData.full_name || null,
      official_email: formData.official_email || null,
      phone: formData.phone || null,
      organization: formData.organization || null,
      designation: formData.designation || null,
      interested_solution: formData.interested_solution || null,
      preferred_date: formData.preferred_date || null,
      preferred_time: formData.preferred_time || null,
      message: formData.message || null,
      created_at: new Date().toISOString()
    };

    // Mock form submission as supabase client is not available in the codebase
    console.log("Mock form payload submitted:", payload);
    
    setTimeout(() => {
        setIsSubmitting(false);
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setIsFormOpen(false);
        }, 3000);

        // reset form
        setFormData({ full_name: "", official_email: "", phone: "", organization: "", designation: "", interested_solution: "", preferred_date: "", preferred_time: "", message: "" });
    }, 1000);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto overflow-x-hidden bg-[#FAFAFA] text-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900 relative">
      <title>Stalight Campus | Stalight Technologies</title>

      {/* --- AMBIENT BACKGROUND GLOWS & PREMIUM ARCHITECTURAL GRID --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle Architectural Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(15,23,42,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.4)_1px,transparent_1px)] [background-size:64px_64px]" />

        {/* Center Spotlight Glow */}
        <div className="absolute left-1/2 top-0 h-[500px] w-[120%] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500/10 via-pink-500/5 to-transparent blur-[100px] md:w-[70%] transform-gpu animate-pulse" />

        {/* Floating Accent Orb 1 */}
        <div className="absolute top-[15%] left-[5%] md:left-[10%] h-48 w-48 rounded-full bg-pink-500/10 blur-[60px] md:h-72 md:w-72 transform-gpu" />

        {/* Floating Accent Orb 2 */}
        <div className="absolute top-[30%] right-[5%] md:right-[10%] h-56 w-56 rounded-full bg-blue-500/10 blur-[70px] md:h-80 md:w-80 transform-gpu" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 sm:pt-36 md:pt-44 lg:pt-52 xl:pt-56 pb-6 sm:pb-10 md:pb-16 z-10 w-full flex flex-col items-center min-h-[48vh] md:min-h-[85vh]">
        <div className="container mx-auto px-4 sm:px-6 relative z-10 w-full text-center mb-8 sm:mb-12">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-6xl mx-auto flex flex-col items-center">
            <h1 className="text-[3.25rem] sm:text-6xl md:text-[7rem] lg:text-[8.5rem] font-light text-slate-900 tracking-tighter leading-[0.95] mb-3 sm:mb-6 px-2 max-w-full text-center">
                <MaskedText>
                  <span className="block sm:inline font-light normal-case">Stalight</span>{' '}
                  <motion.span
                    className="block sm:inline font-logo font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-gradient-animate mt-1 sm:mt-0 tracking-[0.02em] float-subtle"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Campus
                  </motion.span>
                </MaskedText>
            </h1>

            <motion.p variants={fadeUpVariants} className="text-slate-600 font-light text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed mb-6 px-2">
              A next-generation academic management platform unifying advanced analytics, blockchain security, and automated operations.
            </motion.p>

            <motion.div variants={fadeUpVariants} className="relative z-20 mb-6 sm:mb-12">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-2xl mx-auto">
                <a
                  href="https://campus.stalight.in/stalightcampus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center h-12 sm:h-14 px-6 w-full sm:w-[220px] bg-slate-950 text-white rounded-xl overflow-hidden shadow-[0_20px_40px_-10px_rgba(168,85,247,0.3)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"></div>
                  <span className="relative z-10 flex items-center gap-3 text-[11px] sm:text-[12px] font-bold tracking-[0.2em] uppercase whitespace-nowrap">
                    Get Access <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>

                <a
                  href="https://campus.stalight.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center h-12 sm:h-14 px-6 w-full sm:w-[220px] rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white shadow-[0_20px_40px_-10px_rgba(168,85,247,0.3)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-3 font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.2em] whitespace-nowrap">
                    Campus Login <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* FULL WIDTH Infinite Feature Marquee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="w-full relative overflow-hidden py-4"
        >
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[#FAFAFA] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[#FAFAFA] to-transparent z-10 pointer-events-none"></div>

          <motion.div
            className="flex gap-6 sm:gap-10 items-center justify-center w-max opacity-60 hover:opacity-100 transition-opacity duration-300 will-change-transform"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 35, repeat: Infinity }}
          >
            {[...featurePills, ...featurePills, ...featurePills, ...featurePills].map((pill, idx) => (
              <div key={idx} className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-sm rounded-full shrink-0 hover:border-purple-200 hover:shadow-md transition-all duration-300">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center">
                  <pill.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide whitespace-nowrap">{pill.title}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

      </section>

      {/* --- DASHBOARD SHOWCASE --- */}
      <style>{`
        @keyframes marquee-reverse {
          from { transform: translateX(-50%); }
          to { transform: translateX(0%); }
        }
        .animate-marquee-reverse {
          animation: marquee-reverse 40s linear infinite;
          will-change: transform;
        }
      `}</style>
      <section id="features" className="py-20 sm:py-28 bg-[#FAFAFC] overflow-hidden relative z-10">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px)', backgroundSize: '60px 100%' }}></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-light text-slate-950 tracking-tight leading-[1.15] mb-5">
              One Dashboard. <br className="sm:hidden" />
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
                Infinite Insights.
              </span>
            </h2>
            <div className="w-12 h-[3px] bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full mb-6"></div>
            <p className="text-slate-600 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
              Take a tour of our insights section to see how our unified view turns raw academic metrics into actionable intelligence in real-time.
            </p>
          </div>
        </div>

        <div className="w-full relative overflow-hidden py-10">
          <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-r from-[#FAFAFC] to-transparent z-20 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-l from-[#FAFAFC] to-transparent z-20 pointer-events-none"></div>

          <div className="flex gap-8 w-max px-8 animate-marquee-reverse hover:[animation-play-state:paused]">
            {[...tourFeatures, ...tourFeatures].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="w-[280px] sm:w-[400px] md:w-[480px] shrink-0 group relative bg-white/90 border border-slate-200/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-md hover:shadow-2xl hover:border-purple-200 hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="bg-slate-50/80 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between relative z-10">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]"></span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-0.5 bg-slate-100/80 border border-slate-200/40 rounded-full text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-tight select-none">
                      <Icon className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span>{feat.title.toLowerCase().replace(/\s+/g, '-')}.stalight.in</span>
                    </div>
                    <div className="w-8"></div>
                  </div>

                  <div className="relative h-[180px] sm:h-[260px] md:h-[300px] bg-slate-950/5 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <img
                      src={feat.img}
                      alt={feat.caption}
                      className="w-full h-full object-contain rounded-lg drop-shadow-md group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>

                  <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 relative z-10 flex flex-col items-start gap-1">
                    <span className="inline-block text-[9px] text-pink-600 font-bold uppercase tracking-widest px-2 py-0.5 bg-pink-50 border border-pink-100 rounded-md mb-1">
                      {feat.title}
                    </span>
                    <h4 className="text-slate-900 text-xs sm:text-sm font-bold tracking-tight leading-snug truncate w-full">
                      {feat.caption}
                    </h4>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-normal leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- FEATURE BLOCKS --- */}
      <section className="py-20 sm:py-28 bg-[#FAFAFA] relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-slate-900 tracking-tight">
              <span className="font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600">Built for</span> Modern Institutions
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              Core campus capabilities presented as organised, professional blocks — concise, readable, and structured for modern education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {institutionalPillars.map((pillar, pillarIdx) => (
              <motion.div
                key={pillarIdx}
                variants={fadeUpVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6, delay: pillarIdx * 0.08 }}
                className="group relative bg-white border border-slate-200/70 hover:border-slate-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${pillar.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>

                <div className="relative z-10 mb-6 flex flex-col items-start">
                  <div className={`w-12 h-12 rounded-2xl ${pillar.iconBg} ${pillar.iconColor} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    {React.createElement(pillar.icon, { className: "w-6 h-6" })}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-purple-900 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1.5 font-light leading-relaxed">
                    {pillar.subtitle}
                  </p>
                </div>

                <div className="w-full h-px bg-slate-100 mb-6 relative z-10 group-hover:bg-slate-200/80 transition-colors"></div>

                <div className="relative z-10 flex flex-col gap-5 flex-1">
                  {pillar.features.map((feat) => {
                    const FeatIcon = feat.icon;
                    return (
                      <div key={feat.key} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 leading-tight">
                            {feat.title}
                          </h4>
                          <p className="text-slate-500 text-xs mt-1 font-light leading-relaxed">
                            {feat.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-50 text-[10px] font-bold text-purple-500 uppercase tracking-widest relative z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  Active Module
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-pink-100 rounded-full blur-[60px] sm:blur-[80px] opacity-50 sm:opacity-60 pointer-events-none transform-gpu"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-blue-100 rounded-full blur-[60px] sm:blur-[80px] opacity-50 sm:opacity-60 pointer-events-none transform-gpu"></div>

        <div className="container mx-auto px-4 sm:px-6">
          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 40 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3rem] p-6 sm:p-8 md:p-12 lg:p-16 xl:p-20 text-center relative shadow-lg sm:shadow-xl z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-slate-900 mb-4 sm:mb-6 tracking-tight">
              Ready to <span className="font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">Modernise Your Campus?</span>
            </h2>
            <p className="text-slate-600 font-light text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto">
              Get in touch with our team to schedule a personalised architectural walkthrough of Stalight Campus.
            </p>

              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button onClick={() => setIsFormOpen(true)} className="group flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-slate-900 text-white rounded-full font-bold uppercase text-xs sm:text-sm tracking-widest shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 transition-all duration-300 w-full sm:w-auto">
                Schedule Demo <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link to="/" className="flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white border border-slate-300 text-slate-700 rounded-full font-bold uppercase text-xs sm:text-sm tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 w-full sm:w-auto">
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} Stalight Technologies. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-purple-600 transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-purple-600 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* --- RESPONSIVE MODAL REDESIGN --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          {/* Subtle blurred backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          
          <div className="relative z-[110] w-full max-w-2xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-100 max-h-[95dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Top Decorative Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 z-20"></div>
            
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-6 shrink-0 border-b border-slate-100 bg-white relative z-10">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Schedule a Live Demo</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto custom-scrollbar p-5 sm:p-8 relative">
              <form id="demo-form" onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {submitted && (
                  <div className="sm:col-span-2 bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
                    Demo request submitted — we will reach out to confirm the schedule.
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input name="full_name" placeholder="Your full name" value={formData.full_name} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input name="official_email" type="email" placeholder="name@institution.edu" value={formData.official_email} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input name="phone" placeholder="+91 9380937502" value={formData.phone} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Organization / Institution Name *</label>
                  <input name="organization" placeholder="Company / Institution" value={formData.organization} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Designation / Role *</label>
                  <input name="designation" placeholder="e.g., Principal, HOD, Placement Officer" value={formData.designation} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Interested Solution *</label>
                  <Select value={formData.interested_solution} onValueChange={(val) => setFormData(s => ({ ...s, interested_solution: val }))}>
                    <SelectTrigger className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm">
                      <SelectValue placeholder="Select a solution" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stalight_campus">Stalight   Campus</SelectItem>
                      <SelectItem value="StalightSync">StalightSync</SelectItem>
                      <SelectItem value="both">Both / Integration</SelectItem>
                      <SelectItem value="custom">Custom / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Preferred Demo Date *</label>
                  <input name="preferred_date" type="date" value={formData.preferred_date} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Preferred Demo Time *</label>
                  <input name="preferred_time" type="time" value={formData.preferred_time} onChange={handleChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
                  <textarea name="message" placeholder="Any specific agenda or requirements" value={formData.message} onChange={handleChange} rows={3} className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm resize-none" />
                </div>
              </form>
            </div>

            {/* Sticky Footer Buttons */}
            <div className="px-5 sm:px-8 py-4 shrink-0 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 relative z-10">
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSubmitting} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              <button type="submit" form="demo-form" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all hover:-translate-y-0.5">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? 'Submitting...' : 'Request Demo'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default StalightCampus;
