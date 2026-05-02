import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface PaymentCancelProps {
  setPage?: (page: string) => void;
}

const PaymentCancel: React.FC<PaymentCancelProps> = ({ setPage }) => {
  const { theme } = useTheme();
  // Get URL parameters from window.location
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('invoice_id');

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'student') {
      // Don't redirect immediately, just note that user needs to login
      console.warn('User not authenticated for payment cancel page');
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

  const handleNavigateToDashboard = () => {
    if (setPage) {
      setPage('dashboard');
    } else {
      // Fallback: redirect to main app
      window.location.href = '/';
    }
  };

  return (
    <div className={`flex items-center justify-center ${setPage ? 'min-h-[400px]' : 'min-h-screen'} ${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-gray-50'}`}>
      <Card className={theme === 'dark' ? 'w-full max-w-md bg-[#1c1c1e] text-gray-200 border-gray-700' : 'w-full max-w-md bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="text-center">
          <XCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
          <CardTitle className={theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}>Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className={theme === 'dark' ? 'text-gray-300 mb-6' : 'text-gray-600 mb-6'}>
            Your payment was cancelled. No charges were made to your account.
          </p>

          <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-orange-400' : 'text-orange-800'}`}>
              You can try again whenever you're ready to complete your payment.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleNavigateBack}
              className={theme === 'dark' ? 'w-full bg-blue-600 hover:bg-blue-700 text-white' : 'w-full bg-blue-600 hover:bg-blue-700 text-white'}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Return to Payment
            </Button>
            <Button
              variant="outline"
              onClick={handleNavigateToDashboard}
              className={theme === 'dark' ? 'w-full border-gray-600 text-gray-200 hover:bg-gray-800' : 'w-full border-gray-300 text-gray-700 hover:bg-gray-100'}
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;