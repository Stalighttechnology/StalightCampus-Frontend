import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { API_ENDPOINT } from '../../utils/config';
import { useTheme } from '../../context/ThemeContext';

// Eagerly inject Razorpay script once when module loads
if (typeof window !== 'undefined' && !(window as any).Razorpay) {
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.async = true;
  document.head.appendChild(s);
}

interface IncreaseCapacityDialogProps {
  onClose: () => void;
  currentPlan: string;
  orgName: string;
  currentMaxStudents: number;
  activeStudentsCount: number;
  expiryDate?: string;
}

export const IncreaseCapacityDialog: React.FC<IncreaseCapacityDialogProps> = ({
  onClose,
  currentMaxStudents,
  activeStudentsCount,
  currentPlan,
  expiryDate,
}) => {
  const [bufferSize, setBufferSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();

  const bufferRate = useMemo(() => {
    const p = currentPlan.toLowerCase();
    if (p.includes('advance')) return 125;
    if (p.includes('pro')) return 100;
    return 75; // basic
  }, [currentPlan]);

  // Memoize tier so it only recalculates when currentMaxStudents or bufferRate changes
  const tierInfo = useMemo(() => {
    const rawTiers = [
      { max: 750, name: 'Small Tier', base: 500, options: [50, 100, 250] },
      { max: 2500, name: 'Medium Tier', base: 2000, options: [100, 250, 500] },
      { max: 6000, name: 'Large Tier', base: 5000, options: [250, 500, 1000] },
      { max: 12000, name: 'Very Large Tier', base: 10000, options: [500, 1000, 2000] },
      { max: 30000, name: 'Enterprise Tier', base: 25000, options: [1000, 2500, 5000] },
    ];
    
    const matchedTier = rawTiers.find(t => currentMaxStudents <= t.max);
    if (!matchedTier) return { name: 'Mega University', base: currentMaxStudents, max: currentMaxStudents, options: [] };

    return {
      ...matchedTier,
      options: matchedTier.options.map(size => ({
        size,
        price: size * bufferRate
      }))
    };
  }, [currentMaxStudents, bufferRate]);

  // Set default buffer once on mount / tier change
  useEffect(() => {
    if (tierInfo.options.length > 0) {
      const currentBufferSize = currentMaxStudents - tierInfo.base;
      const firstValidOption = tierInfo.options.find(o => o.size > currentBufferSize);
      if (firstValidOption) {
        setBufferSize(firstValidOption.size);
      } else {
        setBufferSize(tierInfo.options[tierInfo.options.length - 1].size);
      }
    }
  }, [tierInfo, currentMaxStudents]);

  // Memoize derived values
  const { selectedOption, yearlyPrice, newMax, isMaxedOut, proratedPrice } = useMemo(() => {
    const sel = tierInfo.options.find(o => o.size === bufferSize);
    const yearly = sel?.price ?? 0;
    const nm = tierInfo.base + bufferSize;

    // Calculate the cost of the currently active buffer (if any)
    const currentBufferSize = currentMaxStudents - tierInfo.base;
    const currentBufferPrice = tierInfo.options.find(o => o.size === currentBufferSize)?.price ?? 0;

    // Only charge the difference!
    const upgradeDifference = Math.max(0, yearly - currentBufferPrice);

    // Calculate prorated price based on expiry date
    let prorated = upgradeDifference;
    if (expiryDate) {
      const remainingTime = new Date(expiryDate).getTime() - Date.now();
      if (remainingTime > 0) {
        const remainingDays = remainingTime / (1000 * 60 * 60 * 24);
        prorated = Math.max(Math.round(upgradeDifference * (remainingDays / 365.0)), 0);
      } else {
        prorated = 0;
      }
    }

    return {
      selectedOption: sel,
      yearlyPrice: yearly,
      upgradeDifference,
      newMax: nm,
      isMaxedOut: nm > tierInfo.max,
      proratedPrice: prorated,
    };
  }, [tierInfo, bufferSize, expiryDate, currentMaxStudents]);

  const handleCapacityAdd = useCallback(async () => {
    if (tierInfo.options.length === 0) {
      toast({ title: 'Custom Expansion Required', description: 'Please contact sales for Mega University expansions.', variant: 'destructive' });
      return;
    }
    if (isMaxedOut) {
      toast({ title: 'Capacity Limit Exceeded', description: `Exceeds tier max of ${tierInfo.max}. Please upgrade your base plan.`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/add-capacity-pack/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buffer_size: bufferSize, billing_cycle: 'Yearly' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to initialize capacity upgrade');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error processing request');

      // Wait for Razorpay SDK if still loading
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const check = setInterval(() => {
          if ((window as any).Razorpay) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('Razorpay SDK timeout')); }, 5000);
      });

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount_to_pay * 100,
        currency: 'INR',
        name: 'Stalight Campus',
        description: `Capacity Expansion: +${bufferSize} Students`,
        order_id: data.order_id,
        handler: async (resp: any) => {
          setVerifying(true);
          try {
            const verifyRes = await fetch(`${API_ENDPOINT}/payments/verify/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              toast({ title: 'Capacity Expanded', description: `Successfully added ${bufferSize} student capacity.` });
              setTimeout(() => window.location.reload(), 1500);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err: any) {
            toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
          } finally {
            setVerifying(false);
            setLoading(false);
          }
        },
        prefill: { name: user?.first_name || 'Admin', email: user?.email || '' },
        theme: { color: '#3b82f6' },
        modal: {
          ondismiss: function () {
            toast({ title: 'Payment Cancelled', description: 'The payment process was cancelled.', variant: 'destructive' });
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => {
        setLoading(false);
        toast({ title: 'Payment Failed', description: 'Your transaction could not be completed.', variant: 'destructive' });
      });
      rzp.open();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  }, [bufferSize, tierInfo, isMaxedOut, user, toast]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-900/60'}`}
    >
      <div className={`rounded-xl shadow-2xl w-[90vw] max-h-[80vh] md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center flex-shrink-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div>
            <h2 className={`text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Increase Capacity</h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Add a buffer package to expand your limit</p>
          </div>
          <button onClick={onClose} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
            Close
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">

          {/* Body */}
          <div className={`p-6 ${theme === 'dark' ? 'bg-slate-950/40' : 'bg-slate-50/50'}`}>
            <div className={`p-4 rounded-lg border mb-6 grid grid-cols-2 gap-y-4 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-850 border-slate-800/80' : 'bg-white border-slate-200'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Plan</p>
                <p className="text-base font-medium mt-1 capitalize">{currentPlan}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Valid Until</p>
                <p className={`text-base font-medium mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div className={`col-span-2 h-px ${theme === 'dark' ? 'bg-slate-850 bg-slate-800/50' : 'bg-slate-100'}`}></div>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Current Tier</p>
                <p className={`text-base font-medium mt-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{tierInfo.name}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Current Max</p>
                <p className={`text-base font-medium mt-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{currentMaxStudents}</p>
              </div>
            </div>

            {tierInfo.options.length === 0 ? (
              <div className={`text-center p-6 rounded-lg border ${theme === 'dark' ? 'bg-amber-950/20 text-amber-300 border-amber-900/50' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="font-medium">Custom Capacity Required</p>
                <p className="text-sm mt-1">Your organization size requires a custom enterprise package. Please contact sales.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-widest mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Select Expansion Buffer</label>
                  <div className="grid grid-cols-1 gap-2">
                    {tierInfo.options.map(opt => {
                      const currentBufferSize = currentMaxStudents - tierInfo.base;
                      const isCurrentOrSmaller = opt.size <= currentBufferSize;

                      return (
                        <div
                          key={opt.size}
                          onClick={() => !isCurrentOrSmaller && setBufferSize(opt.size)}
                          className={`p-3 border rounded-lg flex justify-between items-center transition-colors ${isCurrentOrSmaller
                              ? `opacity-50 cursor-not-allowed ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50'}`
                              : bufferSize === opt.size
                                ? 'border-primary bg-primary/5 ring-1 ring-primary cursor-pointer'
                                : `${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white hover:border-slate-300'} cursor-pointer`
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isCurrentOrSmaller ? (theme === 'dark' ? 'border-slate-700' : 'border-slate-300') : bufferSize === opt.size ? 'border-primary bg-primary' : (theme === 'dark' ? 'border-slate-700' : 'border-slate-300')
                              }`}>
                              {bufferSize === opt.size && !isCurrentOrSmaller && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>+{opt.size} Students</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>New Max: {tierInfo.base + opt.size}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isCurrentOrSmaller ? (
                              <p className={`font-medium text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Currently Active</p>
                            ) : (
                              <>
                                <p className="font-medium text-primary">₹{opt.price.toLocaleString('en-IN')}</p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>/year</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Capacity Preview</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {activeStudentsCount} <span className={`font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>/ {newMax}</span>
                    </p>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden flex relative ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full transition-all duration-500 ${(activeStudentsCount / newMax) > 0.9 ? 'bg-red-500' :
                          (activeStudentsCount / newMax) > 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      style={{ width: `${Math.min(100, (activeStudentsCount / newMax) * 100)}%` }}
                    />
                  </div>
                  <p className={`text-[10px] mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Estimated utilization after applying <span className={`font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>+{bufferSize}</span> buffer
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {tierInfo.options.length > 0 && (
            <div className={`p-6 border-t ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Total Price for +{bufferSize} Buffer</p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Prorated for remaining {expiryDate ? Math.max(1, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0} days
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-sm line-through ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>₹{yearlyPrice.toLocaleString('en-IN')}/yr</span>
                    <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>₹{proratedPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <p className={`text-[10px] font-medium px-2 py-0.5 rounded inline-block mt-1 ${theme === 'dark' ? 'text-emerald-400 bg-emerald-950/30' : 'text-emerald-600 bg-emerald-50'}`}>
                    Valid until {expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'renewal'}
                  </p>
                </div>
              </div>

              {isMaxedOut && (
                <div className={`mb-4 p-3 border rounded-lg flex items-start gap-2 ${theme === 'dark' ? 'bg-red-950/20 border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-xs">This buffer increases your limit to {newMax}, which exceeds the {tierInfo.name} maximum of {tierInfo.max}. Please upgrade your base plan.</p>
                </div>
              )}

              <p className={`text-[10px] text-center mb-4 leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                By proceeding, you agree to Stalight's Terms of Service. This expansion pack will instantly increase your limit. All payments are final and non-refundable. Only one active buffer package is allowed at a time.
              </p>

              <button
                disabled={loading || verifying || isMaxedOut}
                onClick={handleCapacityAdd}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(loading || verifying) ? (
                  <><Loader2 className="animate-spin w-4 h-4" /> Processing...</>
                ) : (
                  `Proceed to Checkout`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};