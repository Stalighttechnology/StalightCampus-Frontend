import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  Zap,
  Shield,
  Crown,
  ChevronDown,
  ChevronUp,
  Star,
  Globe,
  Lock,
  Cpu,
  BarChart3,
  Users,
  GraduationCap,
  Sparkles,
  Search,
  MessageSquare,
  HelpCircle,
  Clock,
  Layout,
  Terminal,
  Activity,
  Server,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const navigate = useNavigate();
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  const plans = [
    {
      name: "Basic",
      price: "Trial",
      duration: "2 Hours",
      description: "Essential for daily campus operations with core administrative and academic tools.",
      tagline: "Start your journey",
      features: [
        "Personalized Portals",
        "Attendance Management",
        "Academic Workflows",
        "Digital Classrooms",
        "Core Fee Management",
        "Communication Hub",
        "User Administration"
      ],
      icon: <Zap className="text-blue-500" size={24} />,
      color: "blue",
      link: "/stalightcampus/basic"
    },
    {
      name: "Pro",
      price: "₹99,999",
      duration: "/year",
      description: "For scaling institutions with enhanced workflows and deep analytics.",
      tagline: "Elevate your campus",
      features: [
        "Advanced Examination Suite",
        "Multi-Dimensional Analytics",
        "Dynamic Financials",
        "Smart Automation",
        "Elevated User Experience",
        "Real-Time Operations",
        "Academic Progression",
        "Everything in Basic +"
      ],
      icon: <Shield className="text-primary" size={24} />,
      color: "purple",
      link: "/stalightcampus/pro",
      popular: true
    },
    {
      name: "Advance",
      price: "₹3,00,000",
      duration: "/year",
      description: "Enterprise-grade capabilities with state-of-the-art intelligence and security.",
      tagline: "The future of education",
      features: [
        "AI-Powered Assistance",
        "Career Intelligence",
        "Biometric & Location Security",
        "Automated Grading Engine",
        "Enterprise Access Control",
        "High-Level Security",
        "Cloud Infrastructure",
        "System Integrity",
        "Everything in Pro +"
      ],
      icon: <Crown className="text-amber-500" size={24} />,
      color: "gold",
      link: "/stalightcampus/advance"
    }
  ];

  const comparisonFeatures = [
    { name: "Real-time Attendance Tracking", basic: true, pro: true, advance: true },
    { name: "Digital Classrooms & Timetable", basic: true, pro: true, advance: true },
    { name: "Fees & Finance Management", basic: false, pro: true, advance: true },
    { name: "Advanced Analytics Dashboard", basic: false, pro: true, advance: true },
    { name: "Leave & Workflow Automation", basic: false, pro: true, advance: true },
    { name: "Biometric & Location Security", basic: false, pro: false, advance: true },
    { name: "AI-Powered Assistance (Study Mode)", basic: false, pro: false, advance: true },
    { name: "AI Mock Interviews", basic: false, pro: false, advance: true },
    { name: "Outcome Based Education (COE)", basic: false, pro: false, advance: true },
    { name: "Hostel Management System (HMS)", basic: false, pro: false, advance: true },
    { name: "Bulk Data Import & Automation", basic: false, pro: false, advance: true },
    { name: "Career & Performance Intelligence", basic: false, pro: false, advance: true },
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
    <div className="h-screen bg-[#fafafa] overflow-y-auto selection:bg-primary/10 relative scroll-smooth">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <Star size={16} />
            <span>Stalight Campus Access Plans</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight"
          >
            Scale seamlessly with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              Enterprise Intelligence
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed"
          >
            Choose the perfect plan for your institution's needs. Scale from essential daily operations to state-of-the-art intelligence.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-sm text-gray-400 flex items-center justify-center gap-2"
          >
            <Check size={14} className="text-green-500" />
            All plans include 24/7 support and regular updates
          </motion.p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500 ${plan.popular
                  ? 'border-primary/20 bg-white shadow-2xl shadow-primary/5'
                  : 'border-gray-100 bg-white shadow-xl shadow-gray-200/50'
                }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${plan.color === 'blue' ? 'bg-blue-50' :
                    plan.color === 'purple' ? 'bg-primary/5' :
                      'bg-amber-50'
                  }`}>
                  {plan.icon}
                </div>
                <div className="space-y-1 mb-4">
                  <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{plan.name}</h3>
                  <p className="text-primary font-medium text-sm">{plan.tagline}</p>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-6 h-12">{plan.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 font-medium">{plan.duration}</span>
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-grow">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">What's Included</p>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 group">
                    <div className="mt-1 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-100">
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <span className={`text-sm font-medium ${feature.includes('Everything in') ? 'text-primary' : 'text-gray-600'
                      }`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => navigate(plan.link)}
                className={`w-full h-14 rounded-2xl text-base font-bold transition-all group ${plan.popular
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
              >
                Get Started
                <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Section */}
      <section className="relative z-10 py-24 px-4 bg-white/50 backdrop-blur-sm border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Detailed Feature Comparison</h2>
            <p className="text-gray-500 text-lg">See exactly what each plan includes and find the perfect fit.</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-8 px-8 text-sm font-bold text-gray-400 uppercase tracking-widest w-1/2">Features & Capabilities</th>
                    <th className="py-8 px-4 text-center">
                      <div className="text-blue-500 font-black text-lg">Basic</div>
                    </th>
                    <th className="py-8 px-4 text-center">
                      <div className="text-primary font-black text-lg">Pro</div>
                    </th>
                    <th className="py-8 px-4 text-center">
                      <div className="text-amber-500 font-black text-lg">Advance</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparisonFeatures.map((row, i) => (
                    <tr key={i} className="group hover:bg-gray-50/30 transition-colors">
                      <td className="py-6 px-8 text-gray-700 font-semibold text-base">{row.name}</td>
                      <td className="py-6 px-4 text-center">
                        {row.basic ? (
                          <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                      <td className="py-6 px-4 text-center">
                        {row.pro ? (
                          <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                      <td className="py-6 px-4 text-center">
                        {row.advance ? (
                          <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden"
          >
            {/* CTA Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 blur-[100px] -ml-32 -mb-32" />

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10">
              Ready to Transform Your Campus?
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto relative z-10">
              Start with any plan and upgrade anytime. All plans include a 14-day free trial and full onboarding support from our expert team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Button size="lg" className="h-16 px-10 rounded-2xl bg-primary text-white font-bold text-lg hover:scale-105 transition-transform">
                Schedule a Demo Today
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 px-10 rounded-2xl border border-white/20 text-white hover:bg-white/10 font-bold text-lg bg-transparent"
              >
                Talk to Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-24 px-4 pb-32">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-500 text-lg">Everything you need to know about the product and billing.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className={`rounded-2xl border transition-all ${activeFAQ === index ? 'border-primary bg-white shadow-lg' : 'border-gray-100 bg-white/50 hover:border-gray-200'
                  }`}
              >
                <button
                  onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-gray-900 text-lg pr-8">{faq.question}</span>
                  {activeFAQ === index ? (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <ChevronUp size={20} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                      <ChevronDown size={20} />
                    </div>
                  )}
                </button>
                <AnimatePresence>
                  {activeFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-gray-600 leading-relaxed">
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

      {/* Footer Decoration */}
      <div className="relative z-10 py-12 text-center text-gray-400 text-sm border-t border-gray-100">
        <div className="flex items-center justify-center gap-6">
          <span className="flex items-center gap-2 italic"><Lock size={14} /> ISO 27001 Certified</span>
          <span className="flex items-center gap-2 italic"><Shield size={14} /> GDPR Compliant</span>
          <span className="flex items-center gap-2 italic"><Globe size={14} /> Global Infrastructure</span>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
