import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, User, Mail, Phone, CheckCircle2,
  ArrowRight, Loader2, Shield, Globe, ChevronLeft
} from "lucide-react";
import { API_ENDPOINT } from "@/utils/config";
import { toast } from "@/components/ui/use-toast";

const Onboarding = () => {
  const { plan } = useParams<{ plan: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [formData, setFormData] = useState({
    org_name: "",
    admin_name: "",
    email: "",
    phone: "",
    plan: plan || "basic"
  });

  useEffect(() => {
    if (plan) {
      setFormData(prev => ({ ...prev, plan: plan.toLowerCase() }));
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Phone validation
    const trimmedPhone = formData.phone.trim();
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      setPhoneError("Phone number must be exactly 10 digits.");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid 10-digit contact number.",
      });
      return;
    }

    setPhoneError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINT}/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.requires_payment && data.checkout_url) {
          toast({
            title: "Redirecting to Payment",
            description: "Please complete the payment to activate your institution.",
          });
          window.location.href = data.checkout_url;
          return;
        }

        setSuccess(true);
        toast({
          title: "Success!",
          description: "Your organization has been created. Check your email for credentials.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Onboarding Failed",
          description: data.message || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Congratulations! <strong>{formData.org_name}</strong> is now registered.
            Login credentials have been sent to <strong>{formData.email}</strong>.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-primary hover:bg-primary/90 h-12 rounded-lg text-white font-medium shadow-lg shadow-primary/20"
          >
            Go to Login
            <ArrowRight className="ml-2" size={18} />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">
      {/* Left Section - Form (Matching Login) */}
      <motion.div
        className="flex-1 bg-white flex items-center justify-center p-8 lg:p-16 relative"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <button
          onClick={() => navigate("/stalightcampus")}
          className="absolute top-8 left-8 text-gray-400 hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <ChevronLeft size={16} />
          Back to Plans
        </button>

        <div className="w-full max-w-md">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Organization</h1>
            <p className="text-gray-600 text-sm">Set up your campus portal with the <span className="text-primary font-semibold uppercase">{formData.plan}</span> plan</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-900">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  required
                  placeholder="e.g. AMC College of Engineering"
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all"
                  value={formData.org_name}
                  onChange={e => setFormData({ ...formData, org_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-900">Admin/Principal Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  required
                  placeholder="Enter full name"
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all"
                  value={formData.admin_name}
                  onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-900">Official Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  required
                  type="email"
                  placeholder="principal@institution.edu"
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-900">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  required
                  type="tel"
                  placeholder="Enter 10-digit number"
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all"
                  value={formData.phone}
                  onChange={e => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (phoneError) setPhoneError("");
                  }}
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium rounded-lg h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initializing...
                  </div>
                ) : (
                  formData.plan === 'basic' ? "Complete Registration" : "Proceed to Payment"
                )}
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            Securely hosted under <span className="text-primary font-medium">Stalight Technology</span>
          </p>
        </div>
      </motion.div>

      {/* Right Section - Illustration (Matching Login) */}
      <motion.div
        className="hidden lg:flex flex-1 bg-gradient-to-br from-[hsl(var(--primary))] to-[#7c3aed] items-center justify-center p-12 relative overflow-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full blur-lg" />
        </div>

        <div className="relative z-10 text-center text-white max-w-lg">
          <motion.div
            className="flex justify-center mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Globe size={32} className="text-white" />
            </div>
          </motion.div>

          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Digital Transformation for your <br />
            <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              CAMPUS ECOSYSTEM
            </span>
          </motion.h2>

          <motion.p
            className="text-lg text-white/80 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            One-click setup for the most advanced AI-powered management platform.
          </motion.p>

          <motion.div
            className="mx-auto w-80 md:w-96"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <img
              src="/undraw_educator_6dgp.svg"
              alt="Educator Illustration"
              className="w-full h-auto drop-shadow-2xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15)) brightness(1.1)'
              }}
            />
          </motion.div>

          <motion.div
            className="mt-12 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="flex items-center justify-center gap-6">
              {[
                { label: "Isolated Tenants", icon: <Shield size={16} /> },
                { label: "Plan Specific", icon: <CheckCircle2 size={16} /> }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-white/70 text-sm">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
