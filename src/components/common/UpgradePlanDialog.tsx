
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Zap, Rocket, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { toast } from "sonner";

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
        toast.success(`Successfully upgraded to ${selectedPlan.toUpperCase()} plan!`);
        
        // Update local storage user data if possible
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
        toast.error(result.message || "Upgrade failed");
      }
    } catch (error) {
      toast.error("An error occurred during upgrade");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">Upgrade Plan</h2>
                <p className="text-slate-500 text-xs">Unlock premium features for <span className="font-medium text-indigo-600">{orgName}</span></p>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className={`grid gap-4 md:gap-6 ${isBasic ? 'md:grid-cols-2' : 'max-w-sm mx-auto w-full'}`}>
                {/* Pro Plan - Only show if current plan is basic */}
                {isBasic && (
                  <div 
                    onClick={() => setSelectedPlan("pro")}
                    className={`relative p-5 md:p-6 rounded-2xl border-2 transition-all cursor-pointer group ${
                      selectedPlan === "pro" 
                        ? "border-indigo-600 bg-indigo-50/30" 
                        : "border-slate-100 hover:border-indigo-200"
                    }`}
                  >
                    {selectedPlan === "pro" && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="mb-3">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Most Popular</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-slate-900">Pro Plan</h3>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-slate-900">₹99,999</span>
                      <span className="text-slate-400 text-xs">/year</span>
                    </div>
                    <ul className="space-y-2.5 mb-6">
                      {["All Basic features", "Unlimited Students", "AI Exam Proctoring", "Priority 24/7 Support"].map((feat, i) => (
                        <li key={i} className="flex items-center text-slate-600 text-[11px] md:text-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mr-2 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Advance Plan - Show for both Basic and Pro */}
                <div 
                  onClick={() => setSelectedPlan("advance")}
                  className={`relative p-5 md:p-6 rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedPlan === "advance" 
                      ? "border-amber-600 bg-amber-50/30" 
                      : "border-slate-100 hover:border-amber-200"
                  }`}
                >
                  {selectedPlan === "advance" && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Best Value</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-bold text-slate-900">Advance Plan</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-slate-900">₹3,00,000</span>
                    <span className="text-slate-400 text-xs">/year</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {["Everything in Pro", "Custom Branding", "Enterprise Security", "Dedicated Account Manager"].map((feat, i) => (
                      <li key={i} className="flex items-center text-slate-600 text-[11px] md:text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-500 mr-2 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <Button 
                onClick={handleUpgrade}
                disabled={!selectedPlan || isUpgrading}
                className={`w-full h-11 md:h-12 rounded-xl font-bold text-sm transition-all ${
                  selectedPlan === "advance" 
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200 shadow-lg" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg"
                }`}
              >
                {isUpgrading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Upgrade to {selectedPlan?.toUpperCase() || "Plan"}
                    <Rocket className="w-4 h-4" />
                  </span>
                )}
              </Button>
              <p className="text-center text-[10px] text-slate-400 mt-3">
                Secure payment powered by Stripe. You'll be redirected to complete checkout.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradePlanDialog;
