import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, User, Mail, Phone, CheckCircle2,
  ArrowRight, Loader2, Shield, Globe, ChevronLeft,
  Camera, CreditCard, Tool, Info
} from "lucide-react";
import { API_ENDPOINT } from "@/utils/config";
import { toast } from "@/components/ui/use-toast";

const Onboarding = () => {
  const { plan } = useParams<{ plan: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    org_name: "",
    admin_name: "",
    email: "",
    phone: "",
    plan: plan || "basic",
    accreditation_id: "",
    institution_address: "",
    billing_address: "",
    tax_id: "",
    tech_poc_name: "",
    tech_poc_email: "",
    tech_poc_mobile: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData(prev => ({ ...prev, plan: plan.toLowerCase() }));
    }
  }, [plan]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.org_name) {
        toast({ variant: "destructive", title: "Required Field", description: "Organization name is required." });
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.admin_name || !formData.email || !formData.phone) {
        toast({ variant: "destructive", title: "Required Fields", description: "All administrator details are required." });
        return;
      }
      if (!/^\d{10}$/.test(formData.phone.trim())) {
        setPhoneError("Phone number must be 10 digits.");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        dataToSend.append(key, value);
      });
      if (logo) {
        dataToSend.append("logo", logo);
      }

      const response = await fetch(`${API_ENDPOINT}/onboard`, {
        method: "POST",
        body: dataToSend,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.requires_payment && data.checkout_url) {
          toast({ title: "Redirecting to Payment", description: "Please complete the payment to activate your institution." });
          window.location.href = data.checkout_url;
          return;
        }

        setSuccess(true);
        toast({ title: "Success!", description: "Your organization has been created. Check your email for credentials." });
      } else {
        toast({ variant: "destructive", title: "Onboarding Failed", description: data.message || "Something went wrong." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Network Error", description: "Could not connect to the server." });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center border border-gray-100"
        >
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 shadow-inner">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Portal Initialized!</h1>
          <p className="text-gray-600 mb-10 leading-relaxed text-lg">
            <strong>{formData.org_name}</strong> is now live. Credentials have been dispatched to <strong>{formData.email}</strong>.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-primary hover:bg-primary/90 h-14 rounded-2xl text-white font-semibold text-lg shadow-xl shadow-primary/30 transition-all hover:translate-y-[-2px]"
          >
            Enter Campus
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { id: 1, name: "Identity", icon: <Building2 size={16} /> },
    { id: 2, name: "Admin", icon: <User size={16} /> },
    { id: 3, name: "Billing", icon: <CreditCard size={16} /> }
  ];
  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <style>{`
        html, body {
          overflow-y: auto !important;
          height: auto !important;
          min-height: 100vh;
        }
      `}</style>
      <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Section */}
      <div className="flex-1 flex flex-col relative bg-white min-h-full">
        <header className="p-6 md:p-8 flex items-center justify-between z-10 shrink-0">
          <button
            onClick={() => navigate("/stalightcampus")}
            className="text-gray-400 hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ChevronLeft size={16} />
            Back to Plans
          </button>
          
          <div className="flex items-center gap-2">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  currentStep >= step.id ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {currentStep > step.id ? <CheckCircle2 size={12} /> : step.id}
                </div>
                {step.id < 3 && <div className={`w-3 h-[2px] mx-1 ${currentStep > step.id ? "bg-primary" : "bg-gray-100"}`} />}
              </div>
            ))}
          </div>
        </header>

        <main className="p-6 md:p-12">
          <div className="w-full max-w-lg mx-auto py-10">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-gray-900">Institutional Identity</h2>
                    <p className="text-gray-500 text-sm">Organization's core details.</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization Name *</label>
                      <Input
                        required
                        placeholder="e.g. AMC College of Engineering"
                        className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                        value={formData.org_name}
                        onChange={e => setFormData({ ...formData, org_name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Accreditation ID</label>
                        <Input
                          placeholder="AICTE / UGC"
                          className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                          value={formData.accreditation_id}
                          onChange={e => setFormData({ ...formData, accreditation_id: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Brand Logo</label>
                        <label className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 h-12 rounded-xl cursor-pointer">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-50">
                            {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" /> : <Camera size={14} className="text-gray-400" />}
                          </div>
                          <span className="text-[10px] font-medium text-gray-500 truncate">{logo ? logo.name : "Upload"}</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institution Address</label>
                      <Input
                        placeholder="Full physical address"
                        className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                        value={formData.institution_address}
                        onChange={e => setFormData({ ...formData, institution_address: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={nextStep} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all flex items-center justify-center gap-2">
                    Continue to Admin Details
                    <ArrowRight size={16} />
                  </Button>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-gray-900">Primary Administrator</h2>
                    <p className="text-gray-500 text-sm">Master account details.</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name *</label>
                      <Input
                        required
                        placeholder="Principal or Admin Name"
                        className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                        value={formData.admin_name}
                        onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Official Email *</label>
                      <Input
                        required
                        type="email"
                        placeholder="admin@institution.edu"
                        className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Number *</label>
                      <Input
                        required
                        type="tel"
                        placeholder="10-digit mobile number"
                        className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                        value={formData.phone}
                        onChange={e => {
                          setFormData({ ...formData, phone: e.target.value });
                          setPhoneError("");
                        }}
                      />
                      {phoneError && <p className="text-[10px] text-red-500 mt-1 font-bold">{phoneError}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={prevStep} className="flex-1 h-12 rounded-xl font-bold text-gray-400">Back</Button>
                    <Button onClick={nextStep} className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all flex items-center justify-center gap-2">
                      Finalize Setup
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-gray-900">Compliance & Support</h2>
                    <p className="text-gray-500 text-sm">Legal and technical details.</p>
                  </div>

                  {/* Plan Summary Card */}
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Selected Plan</p>
                        <h3 className="text-lg font-bold text-gray-900 capitalize">{formData.plan} Plan</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Annual Billing</p>
                      <p className="text-lg font-black text-primary">
                        {formData.plan === 'basic' ? 'Free' : formData.plan === 'pro' ? '₹99,999' : '₹3,00,000'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tax ID (GSTIN/PAN)</label>
                        <Input
                          placeholder="Legal tax ID"
                          className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                          value={formData.tax_id}
                          onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Technical POC</label>
                        <Input
                          placeholder="IT Manager"
                          className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                          value={formData.tech_poc_name}
                          onChange={e => setFormData({ ...formData, tech_poc_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Physical Billing Address</label>
                      <Input
                        placeholder="Invoice address"
                        className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                        value={formData.billing_address}
                        onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">POC Email</label>
                        <Input
                          type="email"
                          placeholder="it@institution.edu"
                          className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                          value={formData.tech_poc_email}
                          onChange={e => setFormData({ ...formData, tech_poc_email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">POC Mobile</label>
                        <Input
                          type="tel"
                          placeholder="Support mobile"
                          className="bg-gray-50 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                          value={formData.tech_poc_mobile}
                          onChange={e => setFormData({ ...formData, tech_poc_mobile: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={prevStep} className="flex-1 h-12 rounded-xl font-bold text-gray-400">Back</Button>
                    <form onSubmit={handleSubmit} className="flex-[2]">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : formData.plan === 'basic' ? "Launch Portal" : "Secure Payment"}
                        {!loading && <ArrowRight size={16} />}
                      </Button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Right Section - Simplified Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-[#5b21b6] items-center justify-center p-12 relative">
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <Globe size={24} className="text-white" />
          </div>

          <h2 className="text-3xl font-extrabold mb-4 leading-tight">
            Digital Transformation <br />
            <span className="text-blue-100">CAMPUS ECOSYSTEM</span>
          </h2>

          <p className="text-sm text-white/70 mb-12">
            Join 500+ institutions using our AI-driven platform.
          </p>

          <img
            src="/undraw_educator_6dgp.svg"
            alt="Educator"
            className="w-full h-auto max-h-[300px] object-contain"
            loading="eager"
          />

          <div className="mt-12 grid grid-cols-2 gap-3">
            {[
              { label: "Bank Security", icon: <Shield size={14} /> },
              { label: "Real-time Sync", icon: <Globe size={14} /> },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5 text-white/80 text-[10px] font-bold uppercase tracking-wider">
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Onboarding;
