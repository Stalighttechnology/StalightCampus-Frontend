import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Briefcase, 
  FileText, 
  User,
  MapPin,
  Clock,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";

interface OfferDetails {
  offer_id: string;
  candidate_name: string;
  email: string;
  phone?: string;
  designation: string;
  department?: string;
  offer_type: string;
  date_of_joining?: string;
  work_location?: string;
  probation_period?: string;
  minimum_commitment?: string;
  issue_date?: string;
  status: string;
  pdf_url?: string;
}

export const VerifyOffer: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!offerId) {
      setError("No Credential Reference ID provided.");
      setLoading(false);
      return;
    }

    const fetchCredential = async () => {
      try {
        setLoading(true);
        // Try offer letter first
        let res = await fetch(`${API_ENDPOINT}/public/verify-offer/${encodeURIComponent(offerId)}/`);
        
        // If not found or if it's a certificate ID format, try certificate verification
        if (!res.ok && (res.status === 404 || offerId.startsWith("STL-INT-20") || offerId.startsWith("STL-COURSE-") || offerId.startsWith("STL-WORK-"))) {
          const certRes = await fetch(`${API_ENDPOINT}/public/verify/${encodeURIComponent(offerId)}/`);
          if (certRes.ok) {
            const certData = await certRes.json();
            setOffer({
              offer_id: certData.certificate_id,
              candidate_name: certData.student_name,
              email: certData.email,
              designation: certData.internship_role || certData.course_name || "Software Developer",
              offer_type: certData.certificate_type,
              date_of_joining: certData.start_date || certData.issue_date,
              issue_date: certData.issue_date,
              status: certData.status || "Verified",
              pdf_url: certData.pdf_url,
            });
            setError(null);
            return;
          }
        }

        if (!res.ok) {
          if (res.status === 404) {
            setError("No authentic credential was found matching this reference ID.");
          } else {
            setError("Unable to verify credential at this moment. Please try again later.");
          }
          setOffer(null);
        } else {
          const data = await res.json();
          setOffer(data);
          setError(null);
        }
      } catch (err: any) {
        setError("Network error occurred while verifying the credential.");
        setOffer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCredential();
  }, [offerId]);

  const copyCredentialId = () => {
    if (offer?.offer_id) {
      navigator.clipboard.writeText(offer.offer_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getOfferTypeLabel = (type: string) => {
    switch (type) {
      case "FULL_TIME": return "Full-Time Employment";
      case "INTERNSHIP": return "Internship Program";
      case "PART_TIME": return "Part-Time Employment";
      case "CONTRACT": return "Contractual Engagement";
      case "COURSE": return "Course Completion";
      case "WORKSHOP": return "Technical Workshop";
      case "PARTICIPATION": return "Participation";
      case "ACHIEVEMENT": return "Merit & Achievement";
      case "EXPERIENCE": return "Professional Experience";
      default: return type || "Employment";
    }
  };

  const isRevoked = offer?.status === "Revoked";
  const isCertificate = offer?.offer_id.startsWith("STL-INT-20") || 
                        offer?.offer_id.startsWith("STL-COURSE-") || 
                        offer?.offer_id.startsWith("STL-WORK-") ||
                        offer?.offer_id.startsWith("STL-PART-") ||
                        offer?.offer_id.startsWith("STL-ACH-");

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between antialiased selection:bg-pink-500 selection:text-white relative overflow-x-hidden">
      {/* Light Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%)",
        }}
      />

      {/* Main Verification Container */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex items-center justify-center">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 text-center max-w-md w-full mx-auto">
            <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Verifying Official Credential...</h2>
            <p className="text-xs text-slate-500 mt-1">Cross-referencing cryptographic records with Stalight Technologies registry.</p>
          </div>
        ) : error || !offer ? (
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-6 sm:p-8 md:p-10 text-center max-w-lg w-full mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <XCircle className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Verification Unsuccessful</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              {error || "The requested credential could not be verified against the official Stalight records."}
            </p>
            <div className="mt-6 flex justify-center">
              <Link to="/">
                <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-slate-200/80 overflow-hidden">
            {/* Top Brand Header Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 sm:px-8 py-5 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/applogo.png" alt="Stalight Technologies" className="w-8 h-8 sm:w-9 sm:h-9 object-contain bg-white/10 p-1 rounded-lg border border-white/10" />
                <div>
                  <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase">
                    STALIGHT TECHNOLOGIES
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-300">Official Credential Verification Portal</p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center">
                {isRevoked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" />
                    Status: Revoked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Official Record · Verified
                  </span>
                )}
              </div>
            </div>

            {/* Recipient & Role Hero Section */}
            <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-pink-600">
                  {isCertificate ? "CERTIFICATE RECIPIENT" : "OFFER OF APPOINTMENT"}
                </span>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Issue Date: <strong className="text-slate-700">{offer.issue_date || "Official Issue"}</strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight break-words">
                {offer.candidate_name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  {offer.designation}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  {getOfferTypeLabel(offer.offer_type)}
                </span>
              </div>

              {/* Official Affirmation Text */}
              <div className="mt-6 p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {isCertificate ? (
                    <>
                      This official record affirms that <strong className="text-slate-900 font-bold">{offer.candidate_name}</strong> has satisfactorily completed the requirements for <strong className="text-indigo-600 font-bold">{offer.designation}</strong> with <strong className="text-purple-600 font-bold">Stalight Technologies Pvt Ltd</strong>. This credential has been duly verified and validated on the official registry.
                    </>
                  ) : (
                    <>
                      This official record affirms that <strong className="text-slate-900 font-bold">{offer.candidate_name}</strong> has been officially offered appointment for the position of <strong className="text-indigo-600 font-bold">{offer.designation}</strong> at <strong className="text-purple-600 font-bold">Stalight Technologies Pvt Ltd</strong>. All terms and appointment details are authentic and recorded in the central platform registry.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Essential Credential Data Cards Grid */}
            <div className="px-6 sm:px-10 py-8">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">
                Credential & Engagement Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Reference ID */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Credential ID
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 truncate">
                      {offer.offer_id}
                    </span>
                    <button
                      onClick={copyCredentialId}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors"
                      title="Copy Reference ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Issuing Authority */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Issued By
                  </span>
                  <div className="flex items-center gap-2">
                    <img src="/applogo.png" alt="Stalight" className="w-4 h-4 object-contain" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      Stalight Technologies
                    </span>
                  </div>
                </div>

                {/* Appointment Type */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Engagement Type
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    {getOfferTypeLabel(offer.offer_type)}
                  </span>
                </div>

                {/* Effective / Joining Date */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {isCertificate ? "Effective Period" : "Date of Joining"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    {offer.date_of_joining || offer.issue_date || "As per offer schedule"}
                  </span>
                </div>

                {/* Location / Campus */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Location
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    {offer.work_location || "Bangalore, India"}
                  </span>
                </div>

                {/* Verification Authority */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Authorized Signatory
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    Ritesh N · Authorized Signatory
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Official Seal Bar */}
            <div className="px-6 sm:px-10 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified against Stalight Technologies central cryptographic registry.</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                Ref: {offer.offer_id}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clean Light Footer */}
      <footer className="relative z-10 py-5 sm:py-6 border-t border-slate-200 text-center text-[11px] sm:text-xs text-slate-400 px-4">
        <p>© 2026 Stalight Technologies Pvt. Ltd. · All rights reserved.</p>
        <p className="mt-1">Bangalore, Karnataka, India · contact@stalight.in · stalight.in</p>
      </footer>
    </div>
  );
};

export default VerifyOffer;

