import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { verifyOTP, resendOTP } from "../../utils/authService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Shield, ArrowLeft, RotateCcw, CheckCircle } from "lucide-react";

interface OTPPageProps {
  setRole: (role: string) => void;
  setPage: (page: string) => void;
  setUser: (user: any) => void;
}

const OTPPage = ({ setRole, setPage, setUser }: OTPPageProps) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const user_id = localStorage.getItem("temp_user_id") || "";

  useEffect(() => {
    if (!user_id && !isVerified) {
      setError("Session expired. Please log in again.");
      setTimeout(() => setPage("login"), 2000);
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled, user_id, setPage, isVerified]);

  const handleVerifyOTP = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError("Please enter the OTP");
      return;
    }
    if (!user_id) {
      setError("User ID missing. Please log in again.");
      setTimeout(() => setPage("login"), 2000);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await verifyOTP({ user_id, otp: trimmedOtp });

      if (response.success) {
        setSuccess("OTP verified successfully");
        setIsVerified(true);
        // Navigate directly to appropriate dashboard
        const userRole = response.role;
        setTimeout(() => {
          switch (userRole) {
            case "admin":
            case "principal":
              navigate("/admin", { replace: true });
              break;
            case "hod":
              navigate("/hod", { replace: true });
              break;
            case "fees_manager":
              navigate("/fees-manager", { replace: true });
              break;
            case "hms_admin":
              navigate("/hms", { replace: true });
              break;
            case "teacher":
              navigate("/faculty", { replace: true });
              break;
            case "student":
              navigate("/dashboard", { replace: true });
              break;
            default:
              navigate("/", { replace: true });
          }
        }, 100);
      } else {
        setError(response.message || "Verification failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("OTP Verification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!user_id) {
      setError("User ID missing. Please log in again.");
      setTimeout(() => setPage("login"), 2000);
      return;
    }

    setError(null);
    setSuccess(null);
    setResendDisabled(true);
    setCountdown(60);

    try {
      const response = await resendOTP({ user_id });

      if (response.success) {
        setSuccess("OTP resent successfully");
      } else {
        setError(response.message || "Failed to resend OTP");
        setResendDisabled(false);
        setCountdown(0);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setResendDisabled(false);
      setCountdown(0);
      console.error("Resend OTP Error:", err);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - OTP Verification Form */}
      <motion.div 
        className="flex-1 bg-[#1c1c1e] flex items-center justify-center p-8"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md">
          {/* Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h1>
            <p className="text-gray-400 text-sm">Enter the verification code sent to your email</p>
          </motion.div>

          {/* Form */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {error && (
              <motion.div 
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {success}
              </motion.div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-gray-300">
                  Verification Code
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 text-center text-lg tracking-widest transition-all duration-300"
                    onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium rounded-lg h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Verify Code
                </div>
              )}
            </Button>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage("login")}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors duration-300 flex items-center justify-center gap-1 rounded-lg hover:bg-gray-800/30"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendDisabled}
                className="flex-1 px-4 py-2 text-primary hover:text-primary/80 text-sm transition-colors duration-300 flex items-center justify-center gap-1 rounded-lg hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <RotateCcw className="h-3 w-3" />
                {resendDisabled
                  ? `Resend (${countdown}s)`
                  : "Resend Code"
                }
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Section - Welcome & Illustration */}
      <motion.div 
        className="flex-1 bg-gradient-to-br from-[hsl(var(--primary))] to-[#7c3aed] flex items-center justify-center p-8 relative overflow-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full blur-lg" />
        </div>

        <div className="relative z-10 text-center text-white max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Secure
              <br />
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Verification
              </span>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Protect your account with two-factor authentication
            </p>
          </motion.div>

          {/* Animated security illustration */}
          <motion.div 
            className="flex justify-center mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.div 
              className="p-6 bg-white/10 rounded-full backdrop-blur-sm"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 360]
              }}
              transition={{ 
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
            >
              <Shield className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            className="text-white/80 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            NEURO CAMPUS Security
            <br />
            <span className="text-xs text-white/60 mt-2 block">
              Enhanced security for your academic portal
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPPage;
