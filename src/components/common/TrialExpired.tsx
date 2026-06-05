import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import UpgradePlanDialog from "@/components/common/UpgradePlanDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { API_ENDPOINT } from "@/utils/config";

const TrialExpired = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const orgName = localStorage.getItem("org_name") || "Your Organization";
  const role = sessionStorage.getItem("role");
  const isAdmin = role === "org_admin" || role === "principal" || role === "dean";
  
  const [isSubscription] = useState(() => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
      return userData.org_plan && userData.org_plan !== "basic";
    } catch (e) {
      return false;
    }
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`);
        if (response.ok) {
          // If profile fetch succeeds, the lock is lifted! Auto-redirect them back.
          let dashboardPath = "/";
          if (role === "org_admin") dashboardPath = "/org-admin";
          else if (role === "principal") dashboardPath = "/admin";
          else if (role === "dean") dashboardPath = "/dean";
          else if (role === "student") dashboardPath = "/dashboard";
          window.location.href = dashboardPath;
        }
      } catch (error) {
        // Still locked, ignore.
      }
    };
    checkStatus();
  }, [role]);

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
        isRenewal={true}
        onSuccess={() => {
          setTimeout(() => {
            const role = sessionStorage.getItem("role");
            let dashboardPath = "/";
            if (role === "org_admin") dashboardPath = "/org-admin";
            else if (role === "principal") dashboardPath = "/admin";
            else if (role === "dean") dashboardPath = "/dean";
            else if (role === "student") dashboardPath = "/dashboard";
            window.location.href = dashboardPath;
          }, 1500);
        }}
      />
    </div>
  );
};

export default TrialExpired;
