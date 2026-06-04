
import React, { useState } from "react";
import { Mail, MessageSquareDashed, Lock, Check, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import clsx from "clsx";
import { forgotPassword, resetPassword, verifyOTP } from "../../utils/authService";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordMobile({ setPage }: { setPage: (page: string) => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);

  const steps = [Mail, MessageSquareDashed, Lock, Check];

  React.useEffect(() => {
    if (step === "otp" && resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, resendCountdown]);

  // Handlers for each step
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await forgotPassword({ email: email.trim() });
      if (response.success) {
        setUserId(String(response.user_id || ""));
        setStep("otp");
        setSuccess(null);
        setError(null);
      } else {
        setError(response.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }
    if (otp.trim().length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }
    if (!userId) {
      setError("Session expired. Please start over.");
      setStep("email");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await verifyOTP({ user_id: userId, otp: otp.trim() });
      if (response.success) {
        if (response.token) {
          setToken(response.token);
        }
        setStep("password");
        setSuccess(null);
      } else {
        setError(response.message || "Invalid OTP code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await forgotPassword({ email: email.trim() });
      if (response.success) {
        setUserId(String(response.user_id || ""));
        setSuccess("OTP resent successfully!");
        setResendCountdown(30);
      } else {
        setError(response.message || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!userId) {
      setError("Session expired. Please start over.");
      setStep("email");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await resetPassword({
        user_id: userId,
        otp: otp.trim(),
        token: token || undefined,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (response.success) {
        setStep("success");
        setSuccess(null);
        setError(null);
        setTimeout(() => setPage("login"), 2500);
      } else {
        setError(response.message || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stepper UI
  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : step === "password" ? 2 : 3;

  return (
    <div className="min-h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] overflow-x-hidden overflow-y-hidden flex flex-col w-full bg-transparent relative">
      {/* HEADER */}
      <div className="relative z-10 text-center pt-12 pb-4 shrink-0 px-4 text-white flex flex-col gap-8">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Forgot Password</p>
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold leading-tight">Secure Password<br />Recovery</h1>
          <p className="text-sm font-medium opacity-85 px-2">Reset your password securely in just a few steps</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-4 max-w-sm w-full mx-auto py-3">
        <div className="flex flex-col gap-6 w-full items-center pt-2">

          {/* Stepper */}
        <div className="flex items-center justify-center gap-3">
          {steps.map((Icon, idx) => (
            <React.Fragment key={idx}>
              <div className={clsx(
                "flex items-center justify-center w-8 h-8 rounded-full border backdrop-blur-sm",
                idx === stepIndex
                  ? "bg-white text-violet-700 border-none shadow-lg"
                  : "bg-white/15 text-white/70 border-white/10"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              {idx < 3 && <div className="w-6 h-0.5 bg-white/20 rounded" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Forms */}
        {step === "email" && (
          <form className="bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl" onSubmit={handleEmailSubmit}>
            <div className="text-center flex flex-col gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">Reset Password</h2>
              <p className="text-sm font-medium text-slate-500">Enter your email to receive a reset code</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl h-14 px-4">
                <Mail className="w-5 h-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="flex-1 border-none bg-transparent focus:ring-0 text-slate-700 placeholder:text-slate-400"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  aria-label="Email address"
                />
              </div>
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </div>
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-violet-700 text-white h-14 rounded-xl font-bold text-base shadow-lg mt-1"
              disabled={loading}
              aria-busy={loading}
              fullWidth
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </Button>
            <button
              type="button"
              className="text-violet-700 font-semibold text-base mt-[-4px]"
              onClick={() => setPage && setPage("login")}
            >
              Back to Login
            </button>
          </form>
        )}
        {step === "otp" && (
          <form className="bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl" onSubmit={handleOtpSubmit}>
            <div className="text-center flex flex-col gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">Enter OTP</h2>
              <p className="text-sm font-medium text-slate-500">We sent a 6-digit code to <span className="font-semibold">{email}</span></p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl h-14 px-4">
                <Shield className="w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 6-digit code"
                  className="flex-1 border-none bg-transparent focus:ring-0 text-slate-700 placeholder:text-slate-400 text-center tracking-widest text-lg"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  aria-label="OTP code"
                  maxLength={6}
                />
              </div>
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
              {success && <div className="text-green-500 text-xs mt-1">{success}</div>}
            </div>
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                className="bg-gradient-to-r from-violet-500 to-violet-700 text-white h-14 rounded-xl font-bold text-base shadow-lg"
                disabled={loading}
                aria-busy={loading}
                fullWidth
              >
                Verify Code
              </Button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendCountdown > 0}
                className="text-violet-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}
        {step === "password" && (
          <form className="bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl" onSubmit={handlePasswordSubmit}>
            <div className="text-center flex flex-col gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">Set New Password</h2>
              <p className="text-sm font-medium text-slate-500">Enter and confirm your new password</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl h-14 px-4 relative">
                <Lock className="w-5 h-5 text-slate-400" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New password"
                  className="flex-1 border-none bg-transparent focus:ring-0 text-slate-700 placeholder:text-slate-400"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  aria-label="New password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowNewPassword(v => !v)}>
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl h-14 px-4 relative">
                <Lock className="w-5 h-5 text-slate-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  className="flex-1 border-none bg-transparent focus:ring-0 text-slate-700 placeholder:text-slate-400"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  aria-label="Confirm new password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowConfirmPassword(v => !v)}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </div>
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-violet-700 text-white h-14 rounded-xl font-bold text-base shadow-lg mt-1"
              disabled={loading}
              aria-busy={loading}
              fullWidth
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
        {step === "success" && (
          <div className="bg-white/95 backdrop-blur-2xl border border-white/40 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl text-center">
            <div className="flex flex-col items-center gap-4">
              <Check className="w-12 h-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-extrabold text-slate-900">Password Reset!</h2>
              <p className="text-sm font-medium text-slate-500">Your password has been reset successfully.<br />Redirecting to login...</p>
            </div>
          </div>
        )}
        </div>

        {/* FOOTER */}
        <div className="text-center text-white text-[11px] pb-4 mt-2">
          <p className="font-semibold opacity-90">AI-powered campus management system</p>
          <p className="opacity-80">Developed under Stalight Technology</p>
        </div>
      </div>
    </div>
  );
}
