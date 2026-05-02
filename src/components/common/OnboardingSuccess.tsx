import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Rocket,
  ShieldCheck,
  Zap,
  CreditCard,
  Building2,
  Calendar,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";

// --- Components ---

const MeshBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-100">
    <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-[100px]" />
    <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-violet-200/30 blur-[100px]" />
  </div>
);

const FloatingCard = ({ children, className, delay = 0, x = 0, y = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: y + 10, x }}
    animate={{
      opacity: 1,
      y: [y, y - 8, y],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
      opacity: { duration: 0.5, delay }
    }}
    className={`absolute p-2.5 rounded-xl border border-white/80 bg-white/90 backdrop-blur-md shadow-lg ${className}`}
  >
    {children}
  </motion.div>
);

const SuccessIllustration = () => (
  <div className="relative w-full h-24 md:h-28 mb-4 flex items-center justify-center">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="z-10 w-14 h-14 md:w-16 md:h-16 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20"
    >
      <CheckCircle2 size={32} strokeWidth={3} />
    </motion.div>

    <FloatingCard delay={0.2} x={-60} y={-20} className="hidden md:block w-20">
      <div className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
        <span className="text-[8px] font-bold uppercase text-slate-500">Live</span>
      </div>
    </FloatingCard>

    <FloatingCard delay={0.5} x={55} y={-15} className="hidden md:block w-24">
      <div className="flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span className="text-[8px] font-bold uppercase text-slate-500">Secured</span>
      </div>
    </FloatingCard>
  </div>
);

const OnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus("error");
        return;
      }

      try {
        const response = await fetch(`${API_ENDPOINT}/payments/status/${sessionId}/`);
        const data = await response.json();
        
        if (data.payment_status === "paid") {
          setStatus("success");
          setDetails(data);
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <MeshBackground />
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <h1 className="text-sm font-bold text-slate-900 font-sans">Verifying...</h1>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <MeshBackground />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Activation Pending</h1>
        <Button onClick={() => navigate("/")} className="h-10 px-6 rounded-xl bg-slate-900 text-white">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-2 md:p-4 font-sans relative overflow-hidden">
      <MeshBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[500px] md:max-w-[500px] w-full bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl p-5 md:p-7 text-center border border-slate-100 relative z-10"
      >
        <SuccessIllustration />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1 tracking-tight">
            Institution Upgraded!
          </h1>
          <p className="text-slate-500 mb-4 md:mb-5 leading-relaxed text-[11px] md:text-xs max-w-[300px] mx-auto">
            Your institution has been successfully upgraded.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-50 rounded-xl p-3.5 md:p-4 mb-4 md:mb-5 text-left border border-slate-100 relative"
        >
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
              <span className="text-emerald-600 font-bold uppercase tracking-wider text-[7px] md:text-[8px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Paid
              </span>
            </div>
            
            <div className="border-t border-dashed border-slate-200" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Amount</div>
                <div className="text-sm md:text-base font-bold text-slate-900">
                  ₹{(details?.amount_total || 300000).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Plan</div>
                <div className="text-xs md:text-sm font-bold text-amber-600 flex items-center gap-0.5">
                  <Crown size={10} className="fill-amber-500" />
                  Advance
                </div>
              </div>
            </div>

            <div className="pt-1">
              <div className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">License ID</div>
              <div className="text-[9px] font-mono text-slate-500 bg-white px-2 py-1.5 rounded-md border border-slate-100 truncate">
                SC-{sessionId?.slice(-8).toUpperCase() || "ADV-74X"}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            onClick={() => navigate("/")}
            className="w-full bg-primary hover:bg-primary/90 h-11 md:h-12 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            Login to Campus Portal
            <ArrowRight className="ml-2" size={16} />
          </Button>
          
          <div className="mt-4 flex items-center justify-center gap-3 text-slate-400">
             <div className="flex items-center gap-1">
                <ShieldCheck size={10} />
                <span className="text-[8px] md:text-[9px] font-bold">Secure</span>
             </div>
             <div className="w-0.5 h-0.5 rounded-full bg-slate-200" />
             <div className="flex items-center gap-1">
                <Calendar size={10} />
                <span className="text-[8px] md:text-[9px] font-bold">24/7 Support</span>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OnboardingSuccess;
