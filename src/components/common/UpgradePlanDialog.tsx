import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh, verifyCoupon } from "@/utils/authService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UpgradePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  onSuccess?: () => void;
  currentPlan?: string;
  isRenewal?: boolean;
  activeStudentsCount?: number;
  currentMaxStudents?: number;
  baseCapacity?: number;
  bufferStudents?: number;
}

const UpgradePlanDialog = ({ isOpen, onClose, orgName = "Your Organization", onSuccess, currentPlan = "basic", isRenewal = false, activeStudentsCount = 0, currentMaxStudents = 500, baseCapacity = 500, bufferStudents = 0 }: UpgradePlanDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | "advance" | null>(null);
  const [studentsCount, setStudentsCount] = useState<number>(currentMaxStudents);
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
      setIsLoadingEstimate(false);
      return;
    }

    setIsLoadingEstimate(true);

    const fetchEstimate = async () => {
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            students_count: studentsCount,
            billing_cycle: billingCycle,
            coupon_code: appliedCoupon?.code,
            estimate_only: true,
            is_coterm: true
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

    fetchEstimate();
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
        ondismiss: function () {
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
          coupon_code: appliedCoupon?.code,
          is_coterm: true
        })
      });

      const result = await response.json();
      if (result.success && result.requires_payment) {
        if (result.order_id && result.razorpay_key_id) {
          // Handle Razorpay checkout modal
          const amount = result.amount_to_pay !== undefined ? result.amount_to_pay : getPrice(selectedPlan || 'pro');
          await handleRazorpayPayment(result.order_id, result.razorpay_key_id, amount);
        } else {
          toast.error("Payment initialization failed. Missing Razorpay order details.");
          setIsUpgrading(false);
        }
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
        } catch (_) { }

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
        toast.error(result.message || "Operation failed");
        setIsUpgrading(false);
      }
    } catch (error) {
      toast.error("An error occurred during process");
      setIsUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-h-[85vh] md:max-w-4xl md:h-[620px] overflow-hidden flex flex-col border border-slate-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
              Institutional Plan Selection
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {isRenewal ? 'Renew or change your plan' : `Upgrade from`}&nbsp;
              <span className="font-semibold text-primary capitalize">{currentPlan}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm shrink-0 ml-4"
          >
            Close
          </button>
        </div>

        {/* Two-column Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">

          {/* Left Column - Plan Selection */}
          <div className="flex-1 p-4 md:p-6 overflow-visible md:overflow-y-auto custom-scrollbar space-y-6">

            {/* Institution Size & Billing Cycle */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institution Size</label>
                {!isRenewal ? (
                  <p className="text-sm font-semibold text-slate-800 bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm mt-1">
                    {currentMaxStudents} Students
                    {bufferStudents > 0 && (
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">({baseCapacity} + {bufferStudents} buffer)</span>
                    )}
                  </p>
                ) : (
                  <Select
                    value={String(studentsCount)}
                    onValueChange={(val) => setStudentsCount(Number(val))}
                  >
                    <SelectTrigger className="mt-1 w-full border border-slate-200 rounded-lg text-sm px-3 py-2 bg-white font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {[
                        { v: 500, l: "Small (500)" },
                        { v: 2000, l: "Medium (2000)" },
                        { v: 5000, l: "Large (5000)" },
                        { v: 10000, l: "Very Large (10000)" },
                        { v: 25000, l: "Enterprise (25000)" }
                      ].map(opt => (
                        <SelectItem key={opt.v} value={String(opt.v)} disabled={opt.v < activeStudentsCount}>
                          {opt.l} {opt.v < activeStudentsCount ? `(Needs ${activeStudentsCount})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Cycle</label>
                <Select
                  value={billingCycle}
                  onValueChange={(val) => setBillingCycle(val)}
                >
                  <SelectTrigger className="mt-1 w-full border border-slate-200 rounded-lg text-sm px-3 py-2 bg-white font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plan Cards */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                Select Plan Tier
              </label>
              <div className="space-y-3">
                {showBasic && (
                  <div
                    onClick={() => setSelectedPlan("basic")}
                    className={`p-4 border rounded-xl flex justify-between items-center transition-all cursor-pointer ${selectedPlan === "basic"
                      ? "border-primary bg-primary/[0.02] ring-1 ring-primary shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedPlan === "basic" ? "border-primary text-primary" : "border-slate-300"
                        }`}>
                        {selectedPlan === "basic" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">Basic</p>
                        <p className="text-xs text-slate-500 mt-0.5">Standard Student Records · Email Support</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">₹{getPrice('basic').toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 tracking-wider">/{billingCycle.toLowerCase()}</p>
                    </div>
                  </div>
                )}

                {showPro && (
                  <div
                    onClick={() => setSelectedPlan("pro")}
                    className={`p-4 border rounded-xl flex justify-between items-center transition-all cursor-pointer ${selectedPlan === "pro"
                      ? "border-primary bg-primary/[0.02] ring-1 ring-primary shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedPlan === "pro" ? "border-primary text-primary" : "border-slate-300"
                        }`}>
                        {selectedPlan === "pro" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-sm">Pro</p>
                          {isRenewal && isPro && (
                            <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Last Used</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Academic Management · Digital Proctoring</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">₹{getPrice('pro').toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 tracking-wider">/{billingCycle.toLowerCase()}</p>
                    </div>
                  </div>
                )}

                {showAdvance && (
                  <div
                    onClick={() => setSelectedPlan("advance")}
                    className={`p-4 border rounded-xl flex justify-between items-center transition-all cursor-pointer ${selectedPlan === "advance"
                      ? "border-primary bg-primary/[0.02] ring-1 ring-primary shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedPlan === "advance" ? "border-primary text-primary" : "border-slate-300"
                        }`}>
                        {selectedPlan === "advance" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-sm">Advance</p>
                          {isRenewal && isAdvance && (
                            <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Last Used</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Full AI Governance · Priority Support</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">₹{getPrice('advance').toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 tracking-wider">/{billingCycle.toLowerCase()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - Summary & Checkout */}
          <div className="w-full md:w-[350px] p-4 md:p-6 bg-slate-50/50 flex flex-col justify-between overflow-visible md:overflow-y-auto custom-scrollbar border-t md:border-t-0 md:border-l border-slate-100">
            <div className="space-y-6">

              {/* Pricing breakdown */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Order Summary</h3>

                {!selectedPlan ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-white min-h-[150px] flex items-center justify-center">
                    <p className="text-xs text-slate-400">Please choose a plan to view pricing details</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 min-h-[150px] flex flex-col justify-between relative overflow-hidden">
                    {isLoadingEstimate && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[0.5px] flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Calculating...
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium capitalize">{selectedPlan} Plan ({billingCycle})</span>
                      <span className="font-semibold text-slate-800">₹{getPrice(selectedPlan).toLocaleString('en-IN')}</span>
                    </div>

                    {estimate && !estimate.error ? (
                      <div className="border-t border-slate-100 pt-3 space-y-2.5">
                        {(() => {
                          const planCost = estimate.new_plan_cost || getPrice(selectedPlan);
                          const unusedCredit = estimate.unused_credit || 0;

                          // Calculate Coupon Discount
                          let couponDiscount = 0;
                          if (appliedCoupon) {
                            if (appliedCoupon.discount_type === 'PERCENTAGE') {
                              couponDiscount = Math.round((planCost * appliedCoupon.discount_value) / 100);
                            } else {
                              couponDiscount = appliedCoupon.discount_value;
                            }
                          }

                          const costAfterCoupon = Math.max(0, planCost - couponDiscount);
                          const appliedCredit = Math.min(costAfterCoupon, unusedCredit);
                          const leftoverCredit = unusedCredit - appliedCredit;
                          const finalPay = estimate.amount_to_pay !== undefined ? estimate.amount_to_pay : Math.max(0, costAfterCoupon - appliedCredit);

                          return (
                            <>
                              {couponDiscount > 0 && (
                                <div className="flex justify-between items-center text-xs text-primary font-medium">
                                  <span>Coupon Discount</span>
                                  <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
                                </div>
                              )}

                              {unusedCredit > 0 && (
                                <div className="flex justify-between items-center text-xs text-emerald-600 font-medium">
                                  <span>Unused Credit ({estimate.days_remaining} days)</span>
                                  <span>-₹{appliedCredit.toLocaleString('en-IN')}</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2.5 border-t border-slate-150 font-bold text-sm text-slate-900">
                                <span>Pay Today</span>
                                <span>₹{finalPay.toLocaleString('en-IN')}</span>
                              </div>

                              {leftoverCredit > 0 && (
                                <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-2 leading-relaxed">
                                  Remaining credit of <span className="font-semibold text-slate-600">₹{leftoverCredit.toLocaleString('en-IN')}</span> will automatically apply to future renewal cycles.
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : estimate && estimate.error ? (
                      <div className="text-xs text-red-500 py-1 text-center border-t border-slate-100">
                        {estimate.error}
                      </div>
                    ) : (
                      <div className="border-t border-slate-100 pt-3 space-y-2 opacity-0">
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Coupon code */}
              <div className="border-t border-slate-200/60 pt-4">
                <div className="flex items-center gap-2 mb-2.5">
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
                  <label htmlFor="hasCoupon" className="text-xs font-semibold text-slate-700">Have a coupon code?</label>
                </div>

                {hasCoupon && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 border border-slate-200 rounded-lg text-xs p-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white uppercase font-mono"
                      disabled={appliedCoupon != null || isVerifyingCoupon}
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                        className="border border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 py-2 rounded-lg font-medium transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!couponCode || isVerifyingCoupon}
                        onClick={handleVerifyCoupon}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isVerifyingCoupon ? "..." : "Verify"}
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Actions & Policy */}
            <div className="mt-8 space-y-4 pt-4 border-t border-slate-200/60">
              <button
                onClick={handleUpgrade}
                disabled={!selectedPlan || isUpgrading || (estimate && estimate.error)}
                className="w-full bg-primary hover:bg-primary/95 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 text-xs uppercase tracking-wider"
              >
                {isUpgrading ? "Processing..." : `Finalize Selection: ${selectedPlan?.toUpperCase()}`}
              </button>

              <div className="text-center space-y-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Lock size={9} className="opacity-70" />
                  Secure SSL Checkout
                </p>
                <p className="text-[9px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                  Disclaimer: All payments are final. Money debited for upgrades cannot be refunded.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>,
    document.body
  );

};

export default UpgradePlanDialog;
