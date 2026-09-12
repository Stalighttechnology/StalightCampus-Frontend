import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { API_ENDPOINT } from "@/utils/config";
import { Building2, Mail, KeyRound, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Phone, MapPin } from "lucide-react";

interface AddCollegeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrg: any) => void;
}

export const AddCollegeModal: React.FC<AddCollegeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [principalEmail, setPrincipalEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalPhone, setPrincipalPhone] = useState("");
  const [collegeAddress, setCollegeAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleReset = () => {
    setStep("email");
    setPrincipalEmail("");
    setOtp("");
    setCollegeName("");
    setPrincipalName("");
    setPrincipalPhone("");
    setCollegeAddress("");
    setIsLoading(false);
    setResendTimer(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!principalEmail.trim() || !principalEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid Principal email address.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/org-admin/request-link-otp/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ principal_email: principalEmail.trim() }),
        }
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setCollegeName(data.college_name || "Institution");
        setPrincipalName(data.principal_name || "Principal");
        setPrincipalPhone(data.principal_phone || "");
        setCollegeAddress(data.college_address || "");
        setStep("otp");
        setResendTimer(45);
        toast({
          title: "Authorization OTP Sent",
          description: `A 6-digit code has been sent to ${principalEmail}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Request Failed",
          description: data.message || "Failed to send authorization OTP.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: err.message || "Failed to connect to the server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Incomplete Code",
        description: "Please enter the complete 6-digit OTP code.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/org-admin/verify-link-otp/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            principal_email: principalEmail.trim(),
            otp: otp.trim(),
          }),
        }
      );
      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "College Linked Successfully!",
          description: `You now have administrative access to ${data.organization?.name || "the college"}.`,
        });
        onSuccess(data.organization);
        handleClose();
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.message || "Invalid or expired OTP code.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: err.message || "Failed to verify OTP code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95%] sm:max-w-[500px] p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl">
        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3.5 pr-6">
            <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                {step === "email" ? "Add & Link College" : "Principal Authorization"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {step === "email"
                  ? "Connect another institution under your Organization Admin account"
                  : `Verify OTP sent for ${collegeName || "the institution"}`}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  Principal Registered Email
                </label>
                <Input
                  type="email"
                  placeholder="e.g. principal@institution.edu"
                  value={principalEmail}
                  onChange={(e) => setPrincipalEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="h-11 text-sm bg-muted/20 border-border/70 focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  To ensure institution security, a 6-digit authorization code will be sent to the Principal's registered email address for approval.
                </div>
              </div>

              <DialogFooter className="pt-2 gap-2.5 sm:gap-2 flex-col-reverse sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="h-10 w-full sm:w-auto px-5 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !principalEmail.trim()}
                  className="h-10 w-full sm:w-auto px-6 text-xs font-semibold gap-2 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Authorization OTP
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* Institution Details Card */}
              <div className="rounded-xl bg-muted/40 border border-border/70 p-4 space-y-2.5">
                <div className="text-xs font-bold text-foreground flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{collegeName}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full shrink-0">
                    {principalName}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 text-xs border-t border-border/50 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="truncate">Email: <span className="font-medium text-foreground">{principalEmail}</span></span>
                  </div>

                  {principalPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-500/80 shrink-0" />
                      <span>Contact: <span className="font-medium text-foreground">{principalPhone}</span></span>
                    </div>
                  )}

                  {collegeAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-500/80 shrink-0" />
                      <span className="truncate">Location: <span className="font-medium text-foreground">{collegeAddress}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Input Section */}
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-full flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                    6-Digit Authorization Code
                  </label>
                </div>

                <div className="py-2 w-full flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => setOtp(val)}
                    disabled={isLoading}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-1.5 sm:gap-2">
                      <InputOTPSlot index={0} className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg text-base sm:text-lg font-bold border" />
                      <InputOTPSlot index={1} className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg text-base sm:text-lg font-bold border" />
                      <InputOTPSlot index={2} className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg text-base sm:text-lg font-bold border" />
                      <InputOTPSlot index={3} className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg text-base sm:text-lg font-bold border" />
                      <InputOTPSlot index={4} className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg text-base sm:text-lg font-bold border" />
                      <InputOTPSlot index={5} className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg text-base sm:text-lg font-bold border" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex items-center justify-between w-full text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors text-xs font-medium"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change Email
                  </button>

                  {resendTimer > 0 ? (
                    <span className="text-muted-foreground text-xs font-medium">
                      Resend code in {resendTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={isLoading}
                      className="text-primary hover:underline font-semibold text-xs"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 gap-2.5 sm:gap-2 flex-col-reverse sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="h-10 w-full sm:w-auto px-5 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="h-10 w-full sm:w-auto px-6 text-xs font-semibold gap-2 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Verify & Link College
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
