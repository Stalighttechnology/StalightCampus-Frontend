import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh, verifyCoupon } from "@/utils/authService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface UpgradePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  onSuccess?: () => void;
  currentPlan?: string;
  isRenewal?: boolean;
}

const UpgradePlanDialog = ({ isOpen, onClose, orgName = "Your Organization", onSuccess, currentPlan = "basic", isRenewal = false }: UpgradePlanDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | "advance" | null>(null);
  const [studentsCount, setStudentsCount] = useState<number>(500);
  const [billingCycle, setBillingCycle] = useState<string>("Monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  
  const [hasCoupon, setHasCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

  React.useEffect(() => {
    if (!selectedPlan) {
      setEstimate(null);
      return;
    }
    const fetchEstimate = async () => {
      setIsLoadingEstimate(true);
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            plan: selectedPlan,
            students_count: studentsCount,
            billing_cycle: billingCycle,
            coupon_code: appliedCoupon?.code,
            estimate_only: true
          })
        });
        const result = await response.json();
        if (result.success) {
          setEstimate(result);
        } else {
          setEstimate({ error: result.message });
        }
      } catch (e) {
        setEstimate({ error: "Failed to calculate pricing" });
      } finally {
        setIsLoadingEstimate(false);
      }
    };
    // debounce slightly to prevent rapid API calls
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPlan, studentsCount, billingCycle, appliedCoupon]);

  const isBasic = currentPlan.toLowerCase().includes('basic');
  const isPro = currentPlan.toLowerCase().includes('pro');
  const isAdvance = currentPlan.toLowerCase().includes('advance');

  // Determine what plans should be visible based on whether this is a forced renewal or voluntary upgrade
  const showBasic = isRenewal;
  const showPro = isRenewal || isBasic;
  const showAdvance = true; // Always show advance when upgrading or renewing

  const handleRazorpayPayment = async (orderId: string, keyId: string, amount: number) => {
    // Load Razorpay checkout script dynamically
    await new Promise<void>((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });

    const options = {
      key: keyId,
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      order_id: orderId,
      name: orgName,
      description: `${selectedPlan?.toUpperCase()} Plan Upgrade`,
      handler: async function (response: any) {
        try {
          const verifyResponse = await fetch(`${API_ENDPOINT}/payments/verify/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyResponse.ok && verifyData.success) {
            toast.success(`Plan upgrade verified and activated successfully!`);

            const userStr = sessionStorage.getItem("user");
            if (userStr) {
              try {
                const user = JSON.parse(userStr);
                user.org_plan = selectedPlan;
                sessionStorage.setItem("user", JSON.stringify(user));
              } catch (e) { }
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
            toast.error("Payment Verification Failed. Please contact support.");
            setIsUpgrading(false);
          }
        } catch (error) {
          toast.error("Verification Error. Please contact support.");
          setIsUpgrading(false);
        }
      },
      theme: { color: '#7c3aed' },
      modal: {
        ondismiss: function() {
          toast.error("Payment Cancelled");
          setIsUpgrading(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleVerifyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsVerifyingCoupon(true);
    try {
      const res = await verifyCoupon(couponCode);
      if (res.success) {
        setAppliedCoupon(res.coupon);
        toast.success(res.message || "Coupon applied successfully!");
      } else {
        setAppliedCoupon(null);
        toast.error(res.message || "Invalid coupon code");
      }
    } catch (e: any) {
      setAppliedCoupon(null);
      toast.error(e.message || "Failed to verify coupon");
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const getPrice = (planType: string) => {
    const baseRate = planType === 'advance' ? 250 : planType === 'pro' ? 200 : 150;
    const yearlyTotal = baseRate * studentsCount;
    if (billingCycle === 'Monthly') return Math.round(yearlyTotal / 12);
    if (billingCycle === 'Quarterly') return Math.round(yearlyTotal / 4);
    return yearlyTotal;
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    setIsUpgrading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          plan: selectedPlan,
          students_count: studentsCount,
          billing_cycle: billingCycle,
          coupon_code: appliedCoupon?.code
        })
      });

      const result = await response.json();
      if (result.success && result.requires_payment && result.order_id && result.razorpay_key_id) {
        // Handle Razorpay checkout modal
        const amount = result.amount_to_pay !== undefined ? result.amount_to_pay : getPrice(selectedPlan || 'pro');
        await handleRazorpayPayment(result.order_id, result.razorpay_key_id, amount);
      } else if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else if (result.success) {
        toast.success(`Plan activated successfully!`);

        // Refresh JWT so the next API calls get the updated org state (is_active, subscription dates)
        try {
          const refreshToken = localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh_token");
          if (refreshToken) {
            const { API_ENDPOINT } = await import("@/utils/config");
            const refreshRes = await fetch(`${API_ENDPOINT}/token/refresh/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: refreshToken }),
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.access) {
                localStorage.setItem("access_token", refreshData.access);
                sessionStorage.setItem("access_token", refreshData.access);
              }
            }
          }
        } catch (_) {}

        const userStr = sessionStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.org_plan = selectedPlan;
            sessionStorage.setItem("user", JSON.stringify(user));
          } catch (e) {}
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
        setIsUpgrading(false);
      }
    } catch (error) {
      toast.error("An error occurred during process");
      setIsUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen &&
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40">
          <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="bg-white rounded-none shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-200">
          
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-light text-slate-900 tracking-tight">Institutional Plan Selection</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                    Current: {currentPlan}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-bold mt-1">Entity: {orgName}</p>
              </div>
              <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest">
              
                Close
              </button>
            </div>

            {/* Selection Area */}
            <div className="p-8 bg-white overflow-y-auto max-h-[70vh]">
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2 block">Institution Size</label>
                  <select
                    value={studentsCount}
                    onChange={(e) => setStudentsCount(Number(e.target.value))}
                    className="w-full border-slate-200 rounded-none text-sm p-3 focus:ring-0 focus:border-primary border outline-none bg-slate-50"
                  >
                    <option value={500}>Small (1 - 500)</option>
                    <option value={2000}>Medium (501 - 2000)</option>
                    <option value={5000}>Large (2001 - 5000)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2 block">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full border-slate-200 rounded-none text-sm p-3 focus:ring-0 focus:border-primary border outline-none bg-slate-50"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className={cn("grid gap-6 max-w-5xl mx-auto", showBasic ? "md:grid-cols-3" : showPro ? "md:grid-cols-2" : "md:grid-cols-1 max-w-sm")}>
                {/* Basic Plan */}
                {showBasic && (
                <div
                onClick={() => setSelectedPlan("basic")}
                className={cn(
                  "p-6 border transition-all cursor-pointer relative",
                  selectedPlan === "basic" ?
                  "border-primary bg-primary/5" :
                  "border-slate-100 hover:border-slate-300"
                )}>
                  {selectedPlan === "basic" &&
                <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
                }
                  {isRenewal && isBasic && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap border border-blue-200">
                      Last Used
                    </div>
                  )}
                  <div className="mb-4 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Basic Plan</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Basic</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-light text-slate-900">₹{getPrice('basic').toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">/ {billingCycle}</span>
                  </div>
                  <ul className="space-y-3 mb-4">
                    {["Standard Student Records", "Basic Academic Management", "Email Support", "Community Access"].map((feat, i) =>
                  <li key={i} className="text-slate-500 text-[11px] leading-tight flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                        {feat}
                      </li>
                  )}
                  </ul>
                </div>
                )}

                {/* Pro Plan */}
                {showPro && (
                <div
                onClick={() => setSelectedPlan("pro")}
                className={cn(
                  "p-6 border transition-all cursor-pointer relative",
                  selectedPlan === "pro" ?
                  "border-primary bg-primary/5" :
                  "border-slate-100 hover:border-slate-300"
                )}>
                
                  {selectedPlan === "pro" &&
                <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
                }
                  {isRenewal && isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap border border-blue-200">
                      Last Used
                    </div>
                  )}
                  <div className="mb-4 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Pro Plan</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Pro</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-light text-slate-900">₹{getPrice('pro').toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">/ {billingCycle}</span>
                  </div>
                  <ul className="space-y-3 mb-4">
                    {["Tiered Student Records", "Academic Management", "Digital Proctoring", "Standard Support"].map((feat, i) =>
                  <li key={i} className="text-slate-500 text-[11px] leading-tight flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                        {feat}
                      </li>
                  )}
                  </ul>
                </div>
                )}

                {/* Advance Plan */}
                {showAdvance && (
                <div
                onClick={() => setSelectedPlan("advance")}
                className={cn(
                  "p-6 border transition-all cursor-pointer relative",
                  selectedPlan === "advance" ?
                  "border-primary bg-primary/5" :
                  "border-slate-100 hover:border-slate-300"
                )}>
                
                  {selectedPlan === "advance" &&
                <div className="absolute top-0 right-0 w-2 h-2 bg-primary" />
                }
                  {isRenewal && isAdvance && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap border border-blue-200">
                      Last Used
                    </div>
                  )}
                  <div className="mb-4 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Advance Plan</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Advance</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-light text-slate-900">₹{getPrice('advance').toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">/ {billingCycle}</span>
                  </div>
                  <ul className="space-y-3 mb-4">
                    {["Full AI Governance", "Custom Institution Branding", "Enterprise-Grade Security", "Priority Technical Support"].map((feat, i) =>
                  <li key={i} className="text-slate-500 text-[11px] leading-tight flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                        {feat}
                      </li>
                  )}
                  </ul>
                </div>
                )}
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              {/* Coupon Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="hasCoupon"
                    checked={hasCoupon}
                    onChange={(e) => {
                      setHasCoupon(e.target.checked);
                      if (!e.target.checked) setAppliedCoupon(null);
                    }}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="hasCoupon" className="text-sm font-medium text-slate-700">Have a coupon code?</label>
                </div>
                {hasCoupon && (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 border-slate-200 rounded-none text-sm p-2 focus:ring-0 focus:border-primary border outline-none bg-white uppercase font-mono"
                      disabled={appliedCoupon != null || isVerifyingCoupon}
                    />
                    {appliedCoupon ? (
                      <Button type="button" variant="outline" className="rounded-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
                        Remove
                      </Button>
                    ) : (
                      <Button type="button" className="rounded-none bg-slate-800 hover:bg-slate-900" disabled={!couponCode || isVerifyingCoupon} onClick={handleVerifyCoupon}>
                        {isVerifyingCoupon ? "Verifying..." : "Verify"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isLoadingEstimate ? (
                <div className="mb-6 text-sm text-slate-500 animate-pulse text-center">Calculating estimate...</div>
              ) : estimate && !estimate.error && selectedPlan ? (
                <div className="mb-6 bg-white border border-slate-200 p-4 rounded text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">{selectedPlan.toUpperCase()} Plan ({billingCycle})</span>
                    <span className="font-medium text-slate-900">₹{estimate.new_plan_cost?.toLocaleString('en-IN')}</span>
                  </div>
                  {estimate.unused_credit > 0 && (
                    <div className="flex justify-between items-center mb-2 text-green-600">
                      <span>Unused Credit ({estimate.days_remaining} days remaining)</span>
                      <span>-₹{estimate.unused_credit?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {appliedCoupon && estimate.amount_to_pay !== undefined && (
                    <div className="flex justify-between items-center mb-2 text-primary font-medium">
                      <span>Coupon Applied ({appliedCoupon.code})</span>
                      <span>{appliedCoupon.discount_type === 'PERCENTAGE' ? `${appliedCoupon.discount_value}% OFF` : `₹${appliedCoupon.discount_value} OFF`}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100 font-bold text-lg">
                    <span>Pay Today</span>
                    <span>₹{estimate.amount_to_pay?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : estimate && estimate.error ? (
                <div className="mb-6 text-sm text-red-500 text-center">{estimate.error}</div>
              ) : null}
              <Button
              onClick={handleUpgrade}
              disabled={!selectedPlan || isUpgrading || (estimate && estimate.error)}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all">
              
                {isUpgrading ? "Processing Request..." : `Finalize Selection: ${selectedPlan?.toUpperCase() || "None"}`}
              </Button>
              <div className="mt-4 text-center">
                <p className="text-slate-400 text-[10px] mt-2 flex items-center justify-center gap-1.5 uppercase font-bold tracking-widest">
                  <Lock size={10} className="opacity-70" />
                  Financial transactions are processed via secure encrypted gateway. 
                </p>
                <p className="text-slate-500 text-[9px] mt-1 text-center font-medium max-w-sm mx-auto">
                  Disclaimer: All payments are final. Money debited for subscription renewals or plan upgrades cannot be refunded under any circumstances.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

};

export default UpgradePlanDialog;