import React, { useState } from "react";
import { motion } from "framer-motion";
import { Clock, ShieldAlert, CreditCard, Mail, Check, Zap, Sparkles, Rocket, Crown, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import UpgradePlanDialog from "@/components/common/UpgradePlanDialog";
import { cn } from "@/lib/utils";

const TrialExpired = () => {
  const navigate = useNavigate();
  const orgName = localStorage.getItem("org_name") || "Your Organization";
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin" || role === "principal";
  
  const [isSubscription] = useState(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      return userData.org_plan && userData.org_plan !== "basic";
    } catch (e) {
      return false;
    }
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl shadow-purple-100/50 overflow-hidden border border-slate-100"
      >
        {/* Header - Visual & Info */}
        <div className="bg-primary p-8 md:p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border border-white/30 shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
              {isSubscription ? "Subscription Expired" : "Trial Period Ended"}
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-md">
              Access to <span className="text-white font-semibold">{orgName}</span> is restricted. Upgrade your plan to resume operations.
            </p>
          </div>
        </div>
        
        {/* Body - Plans & Action */}
        <div className="p-8 md:p-10 bg-white">
          <div className="grid grid-cols-1 gap-4 mb-8">
            <div 
              className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer" 
              onClick={() => setIsUpgradeModalOpen(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Pro Plan</h3>
                  <p className="text-xs text-slate-500">Essential institutional tools</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₹99,999</p>
                <p className="text-[10px] text-slate-400">/year</p>
              </div>
            </div>

            <div 
              className="p-5 rounded-2xl border-2 border-primary bg-primary/5 flex items-center justify-between group cursor-pointer relative overflow-hidden" 
              onClick={() => setIsUpgradeModalOpen(true)}
            >
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary text-white text-[9px] font-black uppercase tracking-tighter rounded-bl-lg">Popular</div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-primary/10">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Advance Plan</h3>
                  <p className="text-xs text-slate-500">Full AI governance suite</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₹3,00,000</p>
                <p className="text-[10px] text-slate-400">/year</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            {isAdmin ? (
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white w-full h-14 rounded-2xl text-lg font-bold transition-all shadow-lg shadow-purple-100 group"
              >
                Renew & Upgrade Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                 <p className="text-slate-600 font-medium text-sm">Please contact your Institution Admin to renew the subscription.</p>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4">
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-primary text-xs font-medium transition-colors"
              >
                Logout Account
              </button>
              
              <Button 
                variant="ghost"
                onClick={() => window.location.href = "mailto:support@stalight.in"}
                className="text-slate-500 hover:text-slate-900 h-8 rounded-xl text-xs font-semibold px-2"
              >
                <Mail className="mr-2 w-3.5 h-3.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <UpgradePlanDialog 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        orgName={orgName}
        currentPlan={localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).org_plan : "basic"}
        onSuccess={() => {
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        }}
      />
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default TrialExpired;
