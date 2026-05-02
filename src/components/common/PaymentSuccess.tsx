import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Download, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentSuccessProps {
  setPage?: (page: string) => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ setPage }) => {
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  // Get URL parameters from window.location
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const invoiceId = urlParams.get('invoice_id');

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'student') {
      // Don't redirect immediately, show error state instead
      setPaymentStatus('error');
      return;
    }
  }, []);

  // If no setPage prop provided (direct URL access), provide a fallback
  const handleNavigateBack = () => {
    if (setPage) {
      setPage('fees');
    } else {
      // Fallback: redirect to main app
      window.location.href = '/';
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setPaymentStatus('error');
      return;
    }

    let stopped = false;
    const intervalMs = 3000; // poll every 3s
    const maxAttempts = 20; // ~60s timeout
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/payments/status/${sessionId}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (!response.ok) {
          if (attempts >= maxAttempts) {
            setPaymentStatus('error');
            stopped = true;
          }
          return;
        }

        const data = await response.json();
        setPaymentDetails(data);

        if (data.payment_status === 'paid') {
          setPaymentStatus('success');
          // show applied toast
          try {
            toast({ title: 'Applied successfully', description: 'Your application has been submitted after payment confirmation.' });
          } catch (e) {
            // ignore toast errors
          }
          // redirect after short delay: if parent provided setPage, use it; otherwise navigate to dashboard
          const redirectTimer = setTimeout(() => {
            if (setPage) {
              try { setPage('fees'); } catch (e) { window.location.href = '/dashboard'; }
            } else {
              window.location.href = '/dashboard';
            }
          }, 2500);
          stopped = true;
          return () => clearTimeout(redirectTimer);
        }

        if (attempts >= maxAttempts) {
          setPaymentStatus('error');
          stopped = true;
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        if (attempts >= maxAttempts) {
          setPaymentStatus('error');
          stopped = true;
        }
      }
    };

    // start initial poll immediately then interval
    poll();
    const timer = setInterval(() => {
      if (stopped) {
        clearInterval(timer);
        return;
      }
      poll();
    }, intervalMs);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/payments/status/${sessionId}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentDetails(data);
        setPaymentStatus(data.payment_status === 'paid' ? 'success' : 'error');
      } else {
        setPaymentStatus('error');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus('error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (paymentStatus === 'loading') {
    return (
      <div className={`flex items-center justify-center ${setPage ? 'min-h-[400px]' : 'min-h-screen'} ${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-gray-50'}`}>
        <Card className={theme === 'dark' ? 'w-full max-w-md bg-[#1c1c1e] text-gray-200 border-gray-700' : 'w-full max-w-md bg-white text-gray-900 border-gray-200'}>
          <CardContent className="p-6 text-center">
            <div className={`h-12 w-12 rounded-full animate-pulse mx-auto mb-4 ${theme === 'dark' ? 'bg-blue-400/40' : 'bg-blue-600/40'}`} />
            <h2 className={`text-xl font-semibold mb-2 animate-pulse ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>Verifying Payment</h2>
            <p className={`animate-pulse ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Please wait while we confirm your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className={`flex items-center justify-center ${setPage ? 'min-h-[400px]' : 'min-h-screen'} ${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-gray-50'}`}>
        <Card className={theme === 'dark' ? 'w-full max-w-md bg-[#1c1c1e] text-gray-200 border-gray-700' : 'w-full max-w-md bg-white text-gray-900 border-gray-200'}>
          <CardHeader className="text-center">
            <XCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            <CardTitle className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className={theme === 'dark' ? 'text-gray-300 mb-6' : 'text-gray-600 mb-6'}>
              {!sessionId
                ? "Payment session not found. Please try your payment again."
                : "We couldn't verify your payment or you may not be properly logged in. Please log in and check your payment status from the fees page."
              }
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = '/'}
                className={theme === 'dark' ? 'w-full bg-blue-600 hover:bg-blue-700 text-white' : 'w-full bg-blue-600 hover:bg-blue-700 text-white'}
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className={theme === 'dark' ? 'w-full border-gray-600 text-gray-200 hover:bg-gray-800' : 'w-full border-gray-300 text-gray-700 hover:bg-gray-100'}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${setPage ? 'min-h-[400px]' : 'min-h-screen'} ${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-gray-50'}`}>
      <Card className={theme === 'dark' ? 'w-full max-w-md bg-[#1c1c1e] text-gray-200 border-gray-700' : 'w-full max-w-md bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="text-center">
          <CheckCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
          <CardTitle className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Payment Confirmed</p>
            <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-green-300' : 'text-green-900'}`}>
              {formatCurrency(paymentDetails?.amount_total / 100 || 0)}
            </p>
          </div>

          <div className={`space-y-2 text-sm mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            <p><strong>Transaction ID:</strong> {paymentDetails?.session_id}</p>
            <p><strong>Invoice ID:</strong> {invoiceId}</p>
            <p><strong>Status:</strong> {paymentDetails?.payment_status}</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleNavigateBack}
              className={theme === 'dark' ? 'w-full bg-blue-600 hover:bg-blue-700 text-white' : 'w-full bg-blue-600 hover:bg-blue-700 text-white'}
            >
              View Fee Details
            </Button>
            {paymentDetails?.payment_id && (
              <Button
                variant="outline"
                onClick={() => {
                  // Download receipt functionality
                  fetch(`http://127.0.0.1:8000/api/payments/receipt/${paymentDetails.payment_id}/`, {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    },
                  })
                  .then(response => response.blob())
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `receipt_${paymentDetails.payment_id}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  })
                  .catch(error => {
                    console.error('Error downloading receipt:', error);
                    alert('Failed to download receipt. Please try from the fees page.');
                  });
                }}
                className={theme === 'dark' ? 'w-full border-gray-600 text-gray-200 hover:bg-gray-800' : 'w-full border-gray-300 text-gray-700 hover:bg-gray-100'}
              >
                Download Receipt
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;