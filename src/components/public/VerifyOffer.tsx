import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  FileText, 
  Mail,
  MapPin,
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

  const isRevoked = offer?.status === "Revoked";
  const isCertificate = offer?.offer_id.startsWith("STL-INT-20") || 
                        offer?.offer_id.startsWith("STL-COURSE-") || 
                        offer?.offer_id.startsWith("STL-WORK-") ||
                        offer?.offer_id.startsWith("STL-PART-") ||
                        offer?.offer_id.startsWith("STL-ACH-");

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between antialiased selection:bg-pink-500 selection:text-white relative overflow-x-hidden">
      {/* Subtle Light Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-50"
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
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex items-center justify-center">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 text-center max-w-md w-full mx-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Verifying Official Credential...</h2>
            <p className="text-xs text-slate-500 mt-1">Cross-referencing cryptographic records with Stalight registry.</p>
          </div>
        ) : error || !offer ? (
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-6 sm:p-8 md:p-10 text-center max-w-lg w-full mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <XCircle className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Verification Unsuccessful</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              {error || "The requested credential could not be verified against official Stalight records."}
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
          <div className="w-full bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-200/90 overflow-hidden">
            {/* Pure Light Header Bar */}
            <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/favicon-logo.png" alt="Stalight Technologies" className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-md" />
                <div className="border-l-2 border-slate-900 pl-3">
                  <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                    STALIGHT TECHNOLOGIES
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Official Credential Verification Portal</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                {isRevoked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    Status: Revoked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Official Record · Verified
                  </span>
                )}
              </div>
            </div>

            {/* Recipient Hero Section */}
            <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-slate-100 bg-slate-50/40">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-pink-600">
                  {isCertificate ? "CERTIFICATE RECIPIENT" : "OFFER OF APPOINTMENT"}
                </span>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Issue Date: <strong className="text-slate-700 font-semibold">{offer.issue_date || "Official Issue"}</strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight break-words">
                {offer.candidate_name}
              </h1>

              {/* Standard Engaging Wordings */}
              <div className="mt-5 p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {isCertificate ? (
                    <>
                      This official record affirms that <strong className="text-slate-900 font-bold">{offer.candidate_name}</strong> has satisfactorily completed the program requirements for <strong className="text-indigo-600 font-bold">{offer.designation}</strong> with <strong className="text-purple-600 font-bold">Stalight Technologies Pvt Ltd</strong>. This credential has been duly verified and authenticated on the official registry.
                    </>
                  ) : (
                    <>
                      This official record affirms that <strong className="text-slate-900 font-bold">{offer.candidate_name}</strong> has been officially offered appointment for the position of <strong className="text-indigo-600 font-bold">{offer.designation}</strong> at <strong className="text-purple-600 font-bold">Stalight Technologies Pvt Ltd</strong>. All terms and appointment details are authentic and recorded in the central platform registry.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Necessary Info Only */}
            <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-6">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Official Credential Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reference ID */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Credential Reference ID
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

                {/* Issued By */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Issued By
                  </span>
                  <div className="flex items-center gap-2">
                    <img src="/favicon-logo.png" alt="Stalight" className="w-4 h-4 object-contain rounded" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      Stalight Technologies Pvt Ltd
                    </span>
                  </div>
                </div>

                {/* Date of Joining */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {isCertificate ? "Effective Period" : "Date of Joining"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    {offer.date_of_joining || offer.issue_date || "As per offer schedule"}
                  </span>
                </div>

                {/* Location */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Location
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    {offer.work_location || "Bangalore, India"}
                  </span>
                </div>
              </div>

              {/* Inquiries & Queries Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      For Inquiries & Verification Queries
                    </span>
                    <a href="mailto:contact@stalight.in" className="text-xs sm:text-sm font-bold text-indigo-600 hover:underline">
                      contact@stalight.in
                    </a>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Stalight Cryptographic Registry</span>
                </div>
              </div>
            </div>

            {/* Bottom Security Notice */}
            <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Digitally validated via Stalight Campus Platform.</span>
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
