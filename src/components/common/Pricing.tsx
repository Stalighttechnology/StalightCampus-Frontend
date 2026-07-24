import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Check,
  ArrowRight,
  Zap,
  Shield,
  Crown,
  ChevronDown,
  Star,
  Sparkles,
  Info,
  X,
  MessageCircle
} from "lucide-react";

// --- Premium Animation Variants ---
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const Pricing = () => {
  const navigate = useNavigate();
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [isTrialPopupOpen, setIsTrialPopupOpen] = useState(false);
  const [activeCompareTab, setActiveCompareTab] = useState<'basic' | 'pro' | 'advance'>('basic');

  const basicPrice = "₹150";
  const proPrice = "₹200";
  const advancePrice = "₹250";

  const handleGetStarted = (link: string) => {
    navigate(link);
  };

  // Removed window.scrollTo to prevent jumping

  const plans = [
    {
      name: "Basic",
      price: basicPrice,
      duration: "per student / year",
      description: "Essential for daily campus operations with core administrative and academic tools.",
      tagline: "Start your journey",
      features: [
        "Dashboards & Profiles",
        "Timetables & Syllabus Tracking",
        "Real-time Attendance",
        "Basic Announcements",
        "Organization & Staff Enrollment",
        "Core Billing & Plans"
      ],
      icon: <Zap className="text-blue-500" size={24} />,
      iconBg: "bg-blue-50",
      accent: "blue",
      link: "/stalightcampus/basic",
      popular: false
    },
    {
      name: "Pro",
      price: proPrice,
      duration: "per student / year",
      description: "For scaling institutions with enhanced workflows and deep analytics.",
      tagline: "Elevate your campus",
      features: [
        "Complete Exam Suite & Results",
        "Student Marks & Study Materials",
        "Full Fee & Finance Management",
        "Class Scheduling & Assignments",
        "Leave Management Workflows",
        "Automated Faculty Bulk Uploads",
        "Dedicated COE & Fees Roles",
        "Everything in Basic +"
      ],
      icon: <Shield className="text-purple-600" size={24} />,
      iconBg: "bg-purple-100",
      accent: "purple",
      link: "/stalightcampus/pro",
      popular: true
    },
    {
      name: "Advance",
      price: advancePrice,
      duration: "per student / year",
      description: "Enterprise-grade capabilities with state-of-the-art intelligence and security.",
      tagline: "The future of education",
      features: [
        "Hostel Management System (HMS)",
        "Comprehensive Transport System",
        "Full Library Administration",
        "Admissions Management",
        "Outcome Based Education (CO)",

        "Department Admin Leaves",
        "Everything in Pro +"
      ],
      icon: <Crown className="text-amber-500" size={24} />,
      iconBg: "bg-amber-50",
      accent: "amber",
      link: "/stalightcampus/advance",
      popular: false
    }
  ];

  const comparisonFeatures = [
    { name: "Dashboards, Timetables & Profiles", basic: true, pro: true, advance: true },
    { name: "Attendance (Student, Faculty, HOD)", basic: true, pro: true, advance: true },
    { name: "Organization, Staff & Branch Setup", basic: true, pro: true, advance: true },
    { name: "Internal Marks & Assignments", basic: false, pro: true, advance: true },
    { name: "Class Scheduling & Study Materials", basic: false, pro: true, advance: true },
    { name: "Comprehensive Exam & Results Suite", basic: false, pro: true, advance: true },
    { name: "Fee Management, Invoices & Payments", basic: false, pro: true, advance: true },
    { name: "Leave Management & Bulk Uploads", basic: false, pro: true, advance: true },
    { name: "Hostel Management System (HMS)", basic: false, pro: false, advance: true },
    { name: "Transportation & Fleet Tracking", basic: false, pro: false, advance: true },
    { name: "Library Catalog & Circulation", basic: false, pro: false, advance: true },
    { name: "Admissions & Seat Matrix Management", basic: false, pro: false, advance: true },
    { name: "Outcome Based Education (CO Attainment)", basic: false, pro: false, advance: true },

  ];

  const faqs = [
    {
      question: "Can I upgrade or downgrade my plan anytime?",
      answer: "Yes, you can change your plan at any time. If you upgrade, the new features will be available immediately and the prorated cost will be added to your next billing cycle. Downgrades take effect at the end of your current billing period."
    },
    {
      question: "Do you offer custom plans for enterprise institutions?",
      answer: "Absolutely. For large universities or multi-campus institutions with unique requirements, we offer custom enterprise pricing and tailored implementation packages. Contact our sales team for a personalized quote."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit/debit cards, net banking, UPI, and bank transfers (NEFT/RTGS). For annual Advance plans, we also offer invoice-based billing."
    },
    {
      question: "Is there a minimum contract length?",
      answer: "While we recommend annual plans for the best value (and stability for your institution), we do offer flexible commitment options. Most of our institutional clients prefer the annual advance payment for budgeting predictability."
    },
    {
      question: "Do you provide training and support?",
      answer: "Yes! Every plan includes full onboarding support. Pro and Advance plans also include dedicated account managers and priority 24/7 technical support with defined SLAs."
    },
    {
      question: "What about data security and compliance?",
      answer: "Data security is our top priority. Stalight Campus is ISO 27001 certified and GDPR compliant. We use enterprise-grade encryption (AES-256) and host all data on secure, redundant cloud infrastructure with regular backups."
    }
  ];

  return (
    <div className="h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900 overflow-y-auto overflow-x-hidden relative scroll-smooth thin-scrollbar">

      {/* --- AMBIENT BACKGROUND GLOWS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-16 z-10 w-full text-center px-4">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl mx-auto flex flex-col items-center">


          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-light tracking-tighter mb-6 leading-[1.1]">
            Scale seamlessly with <br />
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">Enterprise Intelligence.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
            Choose the perfect plan for your institution's needs. Scale from essential daily operations to state-of-the-art AI capabilities.
          </motion.p>
        </motion.div>
      </section>

      {/* --- PRICING CARDS --- */}
      <section className="relative z-10 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                className={`relative flex flex-col p-8 md:p-10 rounded-[2.5rem] bg-white border transition-all duration-500 hover:-translate-y-2 h-full ${plan.popular
                  ? 'border-purple-200 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.2)] md:scale-105 z-10'
                  : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'
                  }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 text-white px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                    Recommended
                  </div>
                )}

                {/* Header */}
                <div className="mb-8 border-b border-slate-100 pb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${plan.iconBg}`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{plan.name}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-6">{plan.tagline}</p>

                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{plan.price}</span>
                    <span className="text-slate-400 font-medium text-sm">{plan.duration}</span>
                  </div>
                </div>

                {/* Description & Features */}
                <div className="flex-grow flex flex-col">
                  <p className="text-slate-600 text-sm leading-relaxed mb-8">{plan.description}</p>

                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">What's Included</p>
                  <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className={`text-sm leading-tight ${feature.includes('Everything in') ? 'font-bold text-slate-900' : 'text-slate-600 font-medium'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleGetStarted(plan.link); }}
                  className={`w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group ${plan.popular
                    ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:opacity-95'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                    }`}
                >
                  Get Started
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- COMPARISON TABLE --- */}
      <section className="relative z-10 py-24 px-4 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Feature Comparison</h2>
            <p className="text-slate-500 text-lg font-light">See exactly what each plan includes and find the perfect fit.</p>
          </div>

          {/* Mobile plan selector tabs */}
          <div className="md:hidden flex p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl mb-6 mx-auto max-w-sm border border-slate-200/50">
            <button
              onClick={() => setActiveCompareTab('basic')}
              className={`flex-1 py-3 text-center rounded-xl text-sm font-bold transition-all duration-300 ${
                activeCompareTab === 'basic'
                  ? 'bg-white text-blue-600 shadow-md shadow-blue-500/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveCompareTab('pro')}
              className={`flex-1 py-3 text-center rounded-xl text-sm font-bold transition-all duration-300 ${
                activeCompareTab === 'pro'
                  ? 'bg-white text-purple-600 shadow-md shadow-purple-500/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pro
            </button>
            <button
              onClick={() => setActiveCompareTab('advance')}
              className={`flex-1 py-3 text-center rounded-xl text-sm font-bold transition-all duration-300 ${
                activeCompareTab === 'advance'
                  ? 'bg-white text-amber-600 shadow-md shadow-amber-500/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Advance
            </button>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-0 md:min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-8 px-6 md:px-8 text-xs font-bold text-slate-500 uppercase tracking-widest w-[60%] md:w-[40%]">Core Capabilities</th>
                    <th className={`py-8 px-4 text-center md:w-[20%] w-[40%] ${activeCompareTab === 'basic' ? 'table-cell' : 'hidden'} md:table-cell`}>
                      <div className="text-slate-900 font-black text-xl">Basic</div>
                    </th>
                    <th className={`py-8 px-4 text-center md:w-[20%] w-[40%] relative ${activeCompareTab === 'pro' ? 'table-cell' : 'hidden'} md:table-cell`}>
                      {/* Highlight column indicator */}
                      <div className="absolute inset-0 bg-purple-50/50 border-x border-purple-100/50 -z-10"></div>
                      <div className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 font-black text-xl">Pro</div>
                    </th>
                    <th className={`py-8 px-4 text-center md:w-[20%] w-[40%] ${activeCompareTab === 'advance' ? 'table-cell' : 'hidden'} md:table-cell`}>
                      <div className="text-slate-900 font-black text-xl">Advance</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonFeatures.map((row, i) => (
                    <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-6 md:px-8 text-slate-700 font-medium text-sm flex items-center gap-2">
                        {row.name}
                        {i > 5 && <Info size={14} className="text-slate-400 cursor-help" />}
                      </td>
                      <td className={`py-5 px-4 text-center ${activeCompareTab === 'basic' ? 'table-cell' : 'hidden'} md:table-cell`}>
                        {row.basic ? <Check size={20} className="text-blue-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`py-5 px-4 text-center relative ${activeCompareTab === 'pro' ? 'table-cell' : 'hidden'} md:table-cell`}>
                        <div className="absolute inset-0 bg-purple-50/30 border-x border-purple-100/30 -z-10 group-hover:bg-purple-50/50 transition-colors"></div>
                        {row.pro ? <Check size={20} className="text-purple-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`py-5 px-4 text-center ${activeCompareTab === 'advance' ? 'table-cell' : 'hidden'} md:table-cell`}>
                        {row.advance ? <Check size={20} className="text-amber-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="relative z-10 py-24 px-4 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-slate-500 text-lg font-light">Everything you need to know about the product and billing.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className={`rounded-[1.5rem] border transition-all duration-300 overflow-hidden ${activeFAQ === index ? 'border-purple-200 bg-white shadow-lg shadow-purple-500/5' : 'border-slate-200 bg-white hover:border-purple-200/50'
                  }`}
              >
                <button
                  onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 sm:p-8 text-left"
                >
                  <span className="font-bold text-slate-900 text-base sm:text-lg pr-8">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: activeFAQ === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeFAQ === index ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'
                      }`}
                  >
                    <ChevronDown size={18} strokeWidth={3} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {activeFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 text-slate-600 font-light leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100 rounded-full blur-[80px] opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-[80px] opacity-60 pointer-events-none"></div>

        <div className="container mx-auto">
          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 40 }} viewport={{ once: true }} className="max-w-5xl mx-auto bg-slate-950 rounded-[3rem] p-10 sm:p-16 text-center relative shadow-2xl overflow-hidden z-10">
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-600/20 blur-3xl mix-blend-overlay"></div>

            <h2 className="text-3xl sm:text-5xl font-light text-white mb-6 tracking-tight relative z-10">
              Ready to <span className="font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-400">Transform Your Campus?</span>
            </h2>
            <p className="text-slate-400 font-light text-base sm:text-lg mb-10 max-w-2xl mx-auto relative z-10">
              Start with any plan and upgrade anytime. All plans include a 14-day free trial and full onboarding support from our expert team.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <button type="button" onClick={(e) => { e.preventDefault(); setIsTrialPopupOpen(true); }} className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 text-white rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg hover:shadow-purple-500/25 hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
                Start Free Trial <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => window.location.href = "mailto:sales@stalight.in"} className="inline-flex items-center justify-center px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-bold uppercase text-sm tracking-widest hover:bg-white/20 transition-all duration-300 w-full sm:w-auto backdrop-blur-sm">
                Contact Sales
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 py-12 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Stalight Campus Logo" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
            <span className="font-bold text-xl text-slate-900">Stalight Campus</span>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} Stalight Campus. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Trial Popup */}
      <AnimatePresence>
        {isTrialPopupOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTrialPopupOpen(false)}
              className="absolute inset-0 bg-slate-900/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10 p-8 text-center border border-slate-100"
            >
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setIsTrialPopupOpen(false); }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="mx-auto mb-6 flex justify-center">
                <img src="/logo.jpeg" alt="Stalight Campus Logo" className="w-20 h-20 rounded-2xl shadow-lg shadow-blue-500/10 object-cover border border-slate-100" />
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Claim Your Free Trial</h3>

              <p className="text-slate-600 mb-6 leading-relaxed">
                Get access with the coupon and use our software for 14 days completely free. Contact us on WhatsApp to get your coupon code instantly!
              </p>

              <div className="flex items-center justify-center gap-4 mb-8">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                  alt="Download on the App Store"
                  className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://wa.me/917349551102?text=Hello%20Stalight%20Team%2C%20I%20want%20to%20get%20access%20to%20the%2014%20days%20free%20trial%20coupon', '_blank');
                }}
                className="group flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-green-500/25 hover:-translate-y-1"
              >
                <MessageCircle size={20} />
                <span>Get Coupon on WhatsApp</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Pricing;