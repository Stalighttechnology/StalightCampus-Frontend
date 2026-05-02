import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { forgotPassword, resetPassword } from "../../utils/authService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Mail, ArrowLeft, Send, Shield, LockKeyhole, CheckCircle, AlertCircle } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";


interface ForgotPasswordFlowProps {
  setPage: (page: string) => void;
}

type Step = 'email' | 'otp' | 'password' | 'success';

const ForgotPasswordFlow = ({ setPage }: ForgotPasswordFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);

  useEffect(() => {
    // Check if there's a stored temp_user_id from a previous session
    const tempUserId = localStorage.getItem("temp_user_id");
    const passwordResetEmail = localStorage.getItem("password_reset_email");
    
    if (tempUserId) {
      setUserId(String(tempUserId));
      // If coming from password reset requirement, skip email step
      if (passwordResetEmail) {
        setEmail(passwordResetEmail);
        setIsPasswordResetFlow(true);
        setCurrentStep('otp');
      }
    }
  }, []);

  const steps = [
    { id: 'email', title: 'Email', description: 'Enter your email', icon: Mail },
    { id: 'otp', title: 'Verification', description: 'Enter OTP code', icon: Shield },
    { id: 'password', title: 'New Password', description: 'Set new password', icon: LockKeyhole },
    { id: 'success', title: 'Complete', description: 'Password reset', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await forgotPassword({ email: trimmedEmail });

      if (response.success) {
        const userIdString = String(response.user_id || "");
        setUserId(userIdString);
        localStorage.setItem("temp_user_id", userIdString);
        setCurrentStep('otp');
      } else {
        setError(response.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Forgot Password Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError("Please enter the OTP");
      return;
    }
    if (trimmedOtp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setError(null);
    setCurrentStep('password');
  };

  const handlePasswordReset = async () => {
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedUserId = String(userId || "").trim();

    if (!trimmedNewPassword || !trimmedConfirmPassword) {
      setError("Please fill in all password fields");
      return;
    }
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (trimmedNewPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!trimmedUserId) {
      setError("Session expired. Please start over.");
      setCurrentStep('email');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await resetPassword({
        user_id: trimmedUserId,
        otp: otp.trim(),
        new_password: trimmedNewPassword,
        confirm_password: trimmedConfirmPassword,
      });

      if (response.success) {
        setCurrentStep('success');
        localStorage.removeItem("temp_user_id");
        localStorage.removeItem("password_reset_email");
        setTimeout(() => {
          setPage("login");
        }, 3000);
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

  const handleSubmit = () => {
    switch (currentStep) {
      case 'email':
        handleEmailSubmit();
        break;
      case 'otp':
        handleOTPSubmit();
        break;
      case 'password':
        handlePasswordReset();
        break;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'email':
        return (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
          </motion.div>
        );

      case 'otp':
        return (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 text-center text-lg tracking-widest transition-all duration-300"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-gray-600">
                We sent a verification code to {email}
              </p>
            </div>
          </motion.div>
        );

      case 'password':
        return (
          <motion.div
            key="password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"} // toggle type
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300"
                />
                <button
                  type="button"
                  className="absolute right-3 top-4 text-gray-400"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-4 h-4 w-4 text-gray-500" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"} // toggle type
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 pr-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-[hsl(var(--primary))]/20 rounded-lg h-12 transition-all duration-300"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-4 text-gray-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-green-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isPasswordResetFlow ? 'Account Setup Complete!' : 'Password Reset Successfully!'}
            </h3>
            <p className="text-gray-600 text-sm">
              {isPasswordResetFlow 
                ? 'Your account is now active. You can login with your new password.'
                : 'Your password has been reset. You\'ll be redirected to login in a moment.'
              }
            </p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const getButtonText = () => {
    switch (currentStep) {
      case 'email':
        return loading ? 'Sending...' : 'Send Reset Code';
      case 'otp':
        return 'Verify Code';
      case 'password':
        return loading ? 'Resetting...' : 'Reset Password';
      default:
        return '';
    }
  };

  const getButtonIcon = () => {
    switch (currentStep) {
      case 'email':
        return <Send className="h-4 w-4" />;
      case 'otp':
        return <Shield className="h-4 w-4" />;
      case 'password':
        return <LockKeyhole className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Form */}
      <motion.div 
        className="flex-1 bg-white flex items-center justify-center p-8"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md">
          {/* Progress Steps */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isActive
                            ? isCurrent
                              ? 'bg-primary border-primary text-white'
                              : 'bg-primary/20 border-primary text-primary'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                        }`}
                        animate={{
                          scale: isCurrent ? 1.1 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.div>
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.title}
                        </p>
                        <p className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-600'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 transition-all duration-500 ${
                          index < currentStepIndex ? 'bg-primary' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStep === 'email' && 'Reset Password'}
              {currentStep === 'otp' && 'Verify Identity'}
              {currentStep === 'password' && 'Create New Password'}
              {currentStep === 'success' && 'All Done!'}
            </h1>
            <p className="text-gray-600 text-sm">
              {currentStep === 'email' && 'Enter your email to receive a reset code'}
              {currentStep === 'otp' && 'Enter the verification code sent to your email'}
              {currentStep === 'password' && 'Choose a strong password for your account'}
              {currentStep === 'success' && 'Your password has been successfully reset'}
            </p>
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
                className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>

            {currentStep !== 'success' && (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium rounded-lg h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {getButtonText()}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {getButtonIcon()}
                    {getButtonText()}
                  </div>
                )}
              </Button>
            )}

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

      {/* Right Section - Illustration */}
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

        <div className="relative z-10 text-center text-white max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {isPasswordResetFlow ? 'Complete Your' : 'Secure Password'}
              <br />
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                {isPasswordResetFlow ? 'Account Setup' : 'Recovery'}
              </span>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              {isPasswordResetFlow 
                ? 'Set your new password to complete account activation'
                : 'Reset your password securely in just a few steps'
              }
            </p>
          </motion.div>

          {/* Forgot Password SVG Illustration */}
          <motion.div
            className="mx-auto w-80 md:w-96 max-w-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <motion.img
              src="/undraw_forgot-password_nttj.svg"
              alt="Forgot Password Illustration"
              className="w-full h-auto drop-shadow-2xl filter brightness-110 contrast-110"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15)) brightness(1.1) contrast(1.1)'
              }}
            />
          </motion.div>

          <motion.div
            className="mt-6 text-white/80 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            NEURO CAMPUS Security
            <br />
            <span className="text-xs text-white/60 mt-2 block">
              Secure password recovery system
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordFlow;
