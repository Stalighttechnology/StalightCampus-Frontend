import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UpgradePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  onSuccess?: () => void;
  currentPlan?: string;
}

const UpgradePlanDialog = ({ isOpen, onClose, orgName = "Your Organization", onSuccess, currentPlan = "basic" }: UpgradePlanDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "advance" | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const isBasic = currentPlan.toLowerCase().includes('basic');
  const isPro = currentPlan.toLowerCase().includes('pro');

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setIsUpgrading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const result = await response.json();
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else if (result.success) {
        toast.success(`Plan upgrade initiated successfully.`);
        
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.org_plan = selectedPlan;
            localStorage.setItem("user", JSON.stringify(user));
          } catch (e) {
            console.error("Failed to update local user plan", e);
          }
        }

        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
        onClose();
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      toast.error("An error occurred during process");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-white rounded-none shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-200"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-light text-slate-900 tracking-tight">Institutional Plan Selection</h2>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-bold mt-1">Entity: {orgName}</p>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Close
              </button>
            </div>

            {/* Selection Area */}
            <div className="p-8 bg-white overflow-y-auto max-h-[70vh]">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Pro Plan */}
                <div 
                  onClick={() => setSelectedPlan("pro")}
                  className={cn(
                    "p-6 border transition-all cursor-pointer relative",
                    selectedPlan === "pro" 
                      ? "border-primary bg-primary/5" 
                      : "border-slate-100 hover:border-slate-300"
                  )}
                >
                  {selectedPlan === "pro" && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
                  )}
                  <div className="mb-4">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Professional Suite</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Edition I</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-light text-slate-900">₹99,999</span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">/ Year</span>
                  </div>
                  <ul className="space-y-3 mb-4">
                    {["Unlimited Student Records", "Academic Management", "Digital Proctoring", "Standard Support"].map((feat, i) => (
                      <li key={i} className="text-slate-500 text-[11px] leading-tight flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Advance Plan */}
                <div 
                  onClick={() => setSelectedPlan("advance")}
                  className={cn(
                    "p-6 border transition-all cursor-pointer relative",
                    selectedPlan === "advance" 
                      ? "border-primary bg-primary/5" 
                      : "border-slate-100 hover:border-slate-300"
                  )}
                >
                  {selectedPlan === "advance" && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
                  )}
                  <div className="mb-4">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Enterprise Suite</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Edition II</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-light text-slate-900">₹3,00,000</span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">/ Year</span>
                  </div>
                  <ul className="space-y-3 mb-4">
                    {["Full AI Governance", "Custom Institution Branding", "Enterprise-Grade Security", "Priority Technical Support"].map((feat, i) => (
                      <li key={i} className="text-slate-500 text-[11px] leading-tight flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <Button 
                onClick={handleUpgrade}
                disabled={!selectedPlan || isUpgrading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all"
              >
                {isUpgrading ? "Processing Request..." : `Finalize Selection: ${selectedPlan?.toUpperCase() || "None"}`}
              </Button>
              <div className="mt-4 text-center">
                <p className="text-[10px] text-slate-400 font-medium">
                  Financial transactions are processed via secure encrypted gateway. 
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradePlanDialog;
