
import React, { useState } from "react";
import { Mail, MessageSquareDashed, Lock, Check, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import clsx from "clsx";
import { forgotPassword, resetPassword } from "../../utils/authService";

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

  const steps = [Mail, MessageSquareDashed, Lock, Check];

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
    setError(null);
    setStep("password");
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
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-b from-violet-600 via-violet-800 to-violet-950 overflow-x-hidden overflow-y-hidden relative">
      {/* Glows */}
      <div className="absolute w-[320px] h-[320px] bg-white/15 blur-3xl rounded-full top-[-100px] left-[-100px] z-0 pointer-events-none" />
      <div className="absolute w-[360px] h-[360px] bg-violet-400/30 blur-[72px] rounded-full bottom-[-80px] right-[-80px] z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-8 w-full max-w-[375px] px-4 pt-6 mx-auto flex-grow min-h-0 items-center justify-center">
        {/* Header */}
        <div className="text-center flex flex-col gap-2 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Forgot Password</p>
          <h1 className="text-3xl font-extrabold leading-tight mb-2">Secure Password<br />Recovery</h1>
          <p className="text-sm font-medium opacity-85 px-4 mb-4">Reset your password securely in just a few steps</p>
        </div>
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
            </div>
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-violet-700 text-white h-14 rounded-xl font-bold text-base shadow-lg mt-1"
              disabled={loading}
              aria-busy={loading}
              fullWidth
            >
              Verify Code
            </Button>
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
        {/* Footer */}
        <div className="mt-auto text-center text-white flex flex-col gap-1 pt-4">
          <p className="text-xs font-semibold opacity-90">AI-powered campus management system</p>
          <p className="text-xs font-medium opacity-70">Developed under Starlight Technology</p>
        </div>
      </div>
    </div>
  );
}
