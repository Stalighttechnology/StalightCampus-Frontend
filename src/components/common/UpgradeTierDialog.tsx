import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Check, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { API_ENDPOINT } from '../../utils/config';

if (typeof window !== 'undefined' && !(window as any).Razorpay) {
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.async = true;
  document.head.appendChild(s);
}

interface UpgradeTierDialogProps {
  onClose: () => void;
  currentPlan: string;
  orgName: string;
  currentMaxStudents: number;
  activeStudentsCount: number;
  expiryDate?: string;
  currentBillingCycle?: string;
}

interface PriceEstimate {
  new_plan_cost: number;
  unused_credit: number;
  amount_to_pay: number;
  days_remaining: number;
}

const TIER_OPTIONS = [
  { max: 750,   name: 'Small Tier',      base: 500 },
  { max: 2500,  name: 'Medium Tier',     base: 2000 },
  { max: 6000,  name: 'Large Tier',      base: 5000 },
  { max: 12000, name: 'Very Large Tier', base: 10000 },
  { max: 30000, name: 'Enterprise Tier', base: 25000 },
];

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const styleBlock = `
@keyframes fadeInDialog { 
  from { opacity: 0; transform: scale(0.97); } 
  to { opacity: 1; transform: scale(1); } 
}
`;

if (typeof window !== 'undefined' && !document.getElementById('fadeInDialogStyle')) {
  const style = document.createElement('style');
  style.id = 'fadeInDialogStyle';
  style.innerHTML = styleBlock;
  document.head.appendChild(style);
}

export function UpgradeTierDialog({ onClose, currentPlan, orgName, currentMaxStudents, expiryDate, activeStudentsCount = 0, currentBillingCycle = 'Yearly' }: UpgradeTierDialogProps) {
  const [selectedTierBase, setSelectedTierBase] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const higherTiers = useMemo(
    () => TIER_OPTIONS.filter(t => t.max > currentMaxStudents),
    [currentMaxStudents]
  );

  // Select first valid tier on open
  useEffect(() => {
    if (higherTiers.length > 0 && selectedTierBase === 0) {
      setSelectedTierBase(higherTiers[0].base);
    }
  }, [higherTiers]);

  // Fetch live price estimate whenever selection changes
  useEffect(() => {
    if (!selectedTierBase) return;
    let cancelled = false;
    const fetchEstimate = async () => {
      setEstimating(true);
      setEstimate(null);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: currentPlan,
            students_count: selectedTierBase,
            billing_cycle: currentBillingCycle,
            estimate_only: true,
            is_coterm: true,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setEstimate({
            new_plan_cost: data.new_plan_cost,
            unused_credit: data.unused_credit,
            amount_to_pay: data.amount_to_pay,
            days_remaining: data.days_remaining,
          });
        }
      } catch {
        // silent — just won't show breakdown
      } finally {
        if (!cancelled) setEstimating(false);
      }
    };
    fetchEstimate();
    return () => { cancelled = true; };
  }, [selectedTierBase, currentPlan]);

  const handleTierUpgrade = useCallback(async () => {
    if (!selectedTierBase) return;
    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: currentPlan,
          students_count: selectedTierBase,
          billing_cycle: currentBillingCycle,
          is_coterm: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to initialize tier upgrade');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error processing request');

      if (!data.requires_payment) {
        toast({ title: 'Upgrade Successful', description: data.message });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

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
        description: `Tier Upgrade → ${selectedTierBase} Base Students`,
        order_id: data.order_id,
        handler: async function (response: any) {
          setVerifying(true);
          try {
            const verifyRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/payments/verify/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              toast({ title: 'Tier Upgraded!', description: 'Institution tier upgraded successfully.' });
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
  }, [selectedTierBase, currentPlan, user, toast]);

  const selectedTier = higherTiers.find(t => t.base === selectedTierBase);
  const baseRate = currentPlan === 'advance' ? 250 : currentPlan === 'pro' ? 200 : 150;

  const totalWithGst = estimate ? estimate.amount_to_pay : 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
        style={{ animation: 'fadeInDialog 0.15s ease' }}
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 my-4">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Upgrade Institution Tier</h2>
            <p className="text-slate-500 text-sm mt-1">Select a higher capacity tier for your organization</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium">Close</button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-0">

        {/* Current subscription summary */}
        <div className="px-6 pt-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Plan</p>
              <p className="text-sm font-semibold mt-1 capitalize text-slate-800">{currentPlan}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Current Max</p>
              <p className="text-sm font-semibold mt-1 text-slate-800">{currentMaxStudents} students</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Expires</p>
              <p className="text-sm font-semibold mt-1 text-slate-800">{fmtDate(expiryDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Days Left</p>
              <p className="text-sm font-semibold mt-1 text-slate-800">
                {estimate ? `${estimate.days_remaining} days` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Tier selector */}
        <div className="p-6 bg-slate-50/50 space-y-3">
          {higherTiers.length === 0 ? (
            <div className="text-center p-6 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="font-medium">Maximum Tier Reached</p>
              <p className="text-sm mt-1">You are already on the highest available tier. Contact sales for custom plans.</p>
            </div>
          ) : (
            <>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest block">Select New Tier</label>
              <div className="grid grid-cols-1 gap-2">
                {higherTiers.map(tier => {
                  const tierYearly = tier.base * baseRate;
                  return (
                    <div
                      key={tier.base}
                      onClick={() => setSelectedTierBase(tier.base)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTierBase === tier.base
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedTierBase === tier.base ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                            {selectedTierBase === tier.base && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{tier.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">Base: <strong>{tier.base}</strong> students</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-slate-500">Max cap: <strong>{tier.max}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-primary">{fmtINR(tierYearly)}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">full year</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Price breakdown panel */}
        {higherTiers.length > 0 && selectedTier && (
          <div className="px-6 pb-6 space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Price Breakdown</p>
              </div>

              {estimating ? (
                <div className="flex items-center justify-center gap-2 p-6 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating…
                </div>
              ) : estimate ? (
                <div className="divide-y divide-slate-100">
                  {/* Prorated plan cost */}
                  <div className="flex justify-between items-center px-4 py-3">
                    <div>
                      <p className="text-sm text-slate-700">Prorated Cost ({estimate.days_remaining} days)</p>
                      <p className="text-xs text-slate-400">{selectedTier.name} · {selectedTier.base} base students</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{fmtINR(estimate.new_plan_cost)}</p>
                  </div>

                  {/* Unused credit */}
                  {estimate.unused_credit > 0 && (
                    <div className="flex justify-between items-center px-4 py-3 bg-emerald-50">
                      <div>
                        <p className="text-sm text-emerald-700">Unused Credit</p>
                        <p className="text-xs text-emerald-600">Applied from current subscription</p>
                      </div>
                      <p className="text-sm font-medium text-emerald-700">− {fmtINR(estimate.unused_credit)}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center px-4 py-3 bg-primary/5 border-t border-primary/10">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Total Payable Today</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Inclusive of all taxes</p>
                    </div>
                    <p className="text-xl font-bold text-primary">{fmtINR(totalWithGst)}</p>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-slate-400 text-center">
                  Select a tier to see the price breakdown.
                </div>
              )}
            </div>

            {/* Transition arrow */}
            {selectedTier && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{currentMaxStudents} students</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">{selectedTier.base} base + buffer up to {selectedTier.max}</span>
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              By proceeding, you agree to Stalight's Terms of Service. Any existing buffer packs will be cleared and rolled into the credit calculation. All payments are final and non-refundable.
            </p>

            <button
              onClick={handleTierUpgrade}
              disabled={loading || verifying || selectedTierBase === 0 || estimating}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || verifying ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> {verifying ? 'Verifying Payment…' : 'Processing…'}</>
              ) : (
                `Proceed to Checkout — ${estimate ? fmtINR(totalWithGst) : 'Loading…'}`
              )}
            </button>
          </div>
        )}

        </div>
      </div>
    </div>
    </>
  );
};