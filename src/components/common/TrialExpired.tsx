import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import UpgradePlanDialog from "@/components/common/UpgradePlanDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const TrialExpired = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const orgName = localStorage.getItem("org_name") || "Your Organization";
  const role = sessionStorage.getItem("role");
  const isAdmin = role === "admin" || role === "principal";
  
  const [isSubscription] = useState(() => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
      return userData.org_plan && userData.org_plan !== "basic";
    } catch (e) {
      return false;
    }
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="max-w-xl w-full bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
      >
        {/* Official Header */}
        <div className="border-b border-slate-100 p-10 text-center">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-6 rounded-sm">
            System Notice
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-900 mb-4 tracking-tight">
            {isSubscription ? "Subscription Expired" : "Trial Period Concluded"}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
            The service period for <span className="text-slate-900 font-medium">{orgName}</span> has reached its term. Access to institutional records and modules is currently suspended.
          </p>
        </div>
        
        {/* Plan Selection Area */}
        <div className="p-10 bg-white">
          <div className="space-y-4 mb-10">
            <div 
              className={cn(
                "p-6 border transition-all duration-300 relative",
                isAdmin 
                  ? "border-primary bg-primary/5 hover:bg-primary/[0.08] cursor-pointer" 
                  : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
              )}
              onClick={() => isAdmin && setIsUpgradeModalOpen(true)}
            >
              <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 tracking-tight">Professional Edition</h3>
                  <p className="text-xs text-slate-500">Core institutional management suite</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₹99,999</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Per Annum</p>
                </div>
              </div>
            </div>

            <div 
              className={cn(
                "p-6 border-2 transition-all duration-300 relative",
                isAdmin 
                  ? "border-primary bg-white hover:bg-primary/5 cursor-pointer" 
                  : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
              )}
              onClick={() => isAdmin && setIsUpgradeModalOpen(true)}
            >
              <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 tracking-tight">Enterprise Edition</h3>
                  <p className="text-xs text-slate-500">Full AI governance & advanced analytics</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₹3,00,000</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Per Annum</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {isAdmin ? (
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-none text-sm font-bold uppercase tracking-widest transition-all shadow-sm"
              >
                Proceed to Renewal
              </Button>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100 text-center">
                 <p className="text-slate-500 text-xs leading-relaxed">
                   Administrative privileges are required for plan renewal. Please contact your Institution Administrator to resume operations.
                 </p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-900 text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                Sign Out
              </button>
              
              <button 
                onClick={() => window.location.href = "mailto:support@stalight.in"}
                className="text-slate-400 hover:text-slate-900 text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                Support Desk
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
           <p className="text-[10px] text-slate-400 font-medium">Stalight Campus Security & Compliance Unit • © 2026</p>
        </div>
      </motion.div>

      <UpgradePlanDialog 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        orgName={orgName}
        currentPlan={sessionStorage.getItem("user") ? JSON.parse(sessionStorage.getItem("user")!).org_plan : "basic"}
        onSuccess={() => {
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        }}
      />
    </div>
  );
};

export default TrialExpired;
