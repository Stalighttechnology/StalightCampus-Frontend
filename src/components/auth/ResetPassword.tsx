import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { resetPassword } from "../../utils/authService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Shield, LockKeyhole, ArrowLeft, KeyRound } from "lucide-react";

interface ResetPasswordProps {
  setPage: (page: string) => void;
}

const ResetPassword = ({ setPage }: ResetPasswordProps) => {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const user_id = localStorage.getItem("temp_user_id") || "";

  useEffect(() => {
    if (!user_id && !isReset) {
      setError("Session expired. Please request a new OTP.");
      setTimeout(() => setPage("forgot-password"), 2000);
    }
  }, [user_id, setPage, isReset]);

  const handleResetPassword = async () => {
    const trimmedOtp = otp.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedOtp || !trimmedNewPassword || !trimmedConfirmPassword) {
      setError("All fields are required");
      return;
    }
    if (!user_id) {
      setError("User ID missing. Please request a new OTP.");
      setTimeout(() => setPage("forgot-password"), 2000);
      return;
    }
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await resetPassword({
        user_id,
        otp: trimmedOtp,
        new_password: trimmedNewPassword,
        confirm_password: trimmedConfirmPassword,
      });

      if (response.success) {
        setSuccess("Password reset successfully");
        setIsReset(true);
        localStorage.removeItem("temp_user_id");
        setTimeout(() => {
          setPage("login");
        }, 2000);
      } else {
        setError(response.message || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Reset Password Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Reset Form */}
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
            <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
            <p className="text-gray-400 text-sm">Enter the OTP and your new password</p>
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
                    placeholder="Enter 6-digit OTP"
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 text-center transition-all duration-300"
                    maxLength={6}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
                  New Password
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium rounded-lg h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </div>
              ) : (
                "Reset Password"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setPage("login")}
                className="text-primary hover:text-primary/80 text-sm transition-colors duration-300 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
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
              Secure Your
              <br />
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Account
              </span>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Create a strong new password for your account
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
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
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
              Your data is protected with enterprise-grade security
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
