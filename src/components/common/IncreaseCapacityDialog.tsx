import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Check, Loader2, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface IncreaseCapacityDialogProps {
  onClose: () => void;
  currentPlan: string;
  orgName: string;
  currentMaxStudents: number;
}

export const IncreaseCapacityDialog: React.FC<IncreaseCapacityDialogProps> = ({
  onClose,
  currentPlan,
  orgName,
  currentMaxStudents
}) => {
  const [billingCycle, setBillingCycle] = useState('Yearly');
  const [bufferSize, setBufferSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const getTierInfo = (current: number) => {
    if (current <= 750) {
      return {
        name: 'Small Tier',
        base: 500,
        max: 750,
        options: [
          { size: 50, price: 2500 },
          { size: 100, price: 4500 },
          { size: 250, price: 9000 }
        ]
      };
    } else if (current <= 2500) {
      return {
        name: 'Medium Tier',
        base: 2000,
        max: 2500,
        options: [
          { size: 100, price: 5000 },
          { size: 250, price: 10000 },
          { size: 500, price: 18000 }
        ]
      };
    } else if (current <= 6000) {
      return {
        name: 'Large Tier',
        base: 5000,
        max: 6000,
        options: [
          { size: 250, price: 12000 },
          { size: 500, price: 22000 },
          { size: 1000, price: 40000 }
        ]
      };
    } else if (current <= 12000) {
      return {
        name: 'Very Large Tier',
        base: 10000,
        max: 12000,
        options: [
          { size: 500, price: 25000 },
          { size: 1000, price: 45000 },
          { size: 2000, price: 80000 }
        ]
      };
    } else if (current <= 30000) {
      return {
        name: 'Enterprise Tier',
        base: 25000,
        max: 30000,
        options: [
          { size: 1000, price: 50000 },
          { size: 2500, price: 110000 },
          { size: 5000, price: 200000 }
        ]
      };
    }
    return { name: 'Mega University', base: current, max: current, options: [] };
  };

  const tierInfo = getTierInfo(currentMaxStudents);

  useEffect(() => {
    if (tierInfo.options.length > 0) {
      setBufferSize(tierInfo.options[0].size);
    }
  }, [currentMaxStudents]);

  const selectedOption = tierInfo.options.find(opt => opt.size === bufferSize);
  const yearlyPrice = selectedOption ? selectedOption.price : 0;
  const newMax = tierInfo.base + bufferSize;
  const isMaxedOut = newMax > tierInfo.max;

  const finalPrice = billingCycle === 'Monthly' 
    ? Math.round(yearlyPrice / 12) 
    : billingCycle === 'Quarterly' 
    ? Math.round(yearlyPrice / 4) 
    : yearlyPrice;

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCapacityAdd = async () => {
    if (tierInfo.options.length === 0) {
      toast({
        title: "Custom Expansion Required",
        description: "Please contact sales for Mega University expansions.",
        variant: "destructive",
      });
      return;
    }

    if (isMaxedOut) {
      toast({
        title: "Capacity Limit Exceeded",
        description: `This buffer exceeds your tier's maximum capacity of ${tierInfo.max}. Please upgrade your base plan instead.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/add-capacity-pack/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          buffer_size: bufferSize,
          billing_cycle: billingCycle
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to initialize capacity upgrade');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error processing request');
      }

      const res = await loadRazorpay();
      if (!res) {
        throw new Error('Razorpay SDK failed to load');
      }

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount_to_pay * 100,
        currency: 'INR',
        name: 'Stalight Campus',
        description: `Capacity Expansion: +${bufferSize} Students`,
        order_id: data.order_id,
        handler: async function (response: any) {
          setVerifying(true);
          try {
            const verifyRes = await fetch(`${API_ENDPOINT}/payments/verify/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              toast({
                title: 'Capacity Expanded',
                description: `Successfully added ${bufferSize} student capacity.`,
              });
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err: any) {
            toast({
              title: 'Verification Failed',
              description: err.message,
              variant: 'destructive'
            });
          } finally {
            setVerifying(false);
            setLoading(false);
          }
        },
        prefill: {
          name: user?.first_name || 'Admin',
          email: user?.email || '',
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function () {
        setLoading(false);
        toast({
          title: 'Payment Failed',
          description: 'Your transaction could not be completed.',
          variant: 'destructive'
        });
      });
      rzp.open();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Increase Capacity
            </h2>
            <p className="text-slate-500 text-sm mt-1">Add a buffer package to expand your limit</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium">
            Close
          </button>
        </div>

        <div className="p-6 bg-slate-50/50">
          <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Current Tier</p>
              <p className="text-base font-medium mt-1">{tierInfo.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Current Max</p>
              <p className="text-base font-medium mt-1">{currentMaxStudents}</p>
            </div>
          </div>

          {tierInfo.options.length === 0 ? (
            <div className="text-center p-6 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="font-medium">Custom Capacity Required</p>
              <p className="text-sm mt-1">Your organization size requires a custom enterprise package. Please contact sales.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2 block">Select Expansion Buffer</label>
                <div className="grid grid-cols-1 gap-2">
                  {tierInfo.options.map(opt => (
                    <div 
                      key={opt.size}
                      onClick={() => setBufferSize(opt.size)}
                      className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${bufferSize === opt.size ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-white hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${bufferSize === opt.size ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                          {bufferSize === opt.size && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium">+{opt.size} Students</p>
                          <p className="text-xs text-slate-500">New Max: {tierInfo.base + opt.size}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary">₹{opt.price.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500">/year</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2 block">Billing Cycle</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="w-full border-slate-200 rounded-lg text-sm p-3 focus:ring-1 focus:ring-primary border outline-none bg-white"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {tierInfo.options.length > 0 && (
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-sm text-slate-500">Total Price for +{bufferSize}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-semibold text-slate-900">₹{finalPrice.toLocaleString('en-IN')}</span>
                <span className="text-slate-500 text-sm"> / {billingCycle}</span>
              </div>
            </div>

            {isMaxedOut && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs">This buffer increases your limit to {newMax}, which exceeds the {tierInfo.name} maximum of {tierInfo.max}. Please upgrade your base plan.</p>
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center mb-4 leading-relaxed">
              By proceeding, you agree to Stalight's Terms of Service. This expansion pack will instantly increase your limit. All payments are final and non-refundable. Only one active buffer package is allowed at a time.
            </p>

            <button
              disabled={loading || verifying || isMaxedOut}
              onClick={handleCapacityAdd}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(loading || verifying) ? (
                <><Loader2 className="animate-spin w-4 h-4" /> Processing...</>
              ) : (
                `Pay ₹${finalPrice.toLocaleString('en-IN')}`
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};