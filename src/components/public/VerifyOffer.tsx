import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  User, 
  Briefcase, 
  FileText, 
  AlertTriangle,
  Award,
  Hash,
  Mail,
  MapPin,
  CheckCircle
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
              designation: certData.internship_role || certData.course_name || "Intern",
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

  const getOfferTypeLabel = (type: string) => {
    switch (type) {
      case "FULL_TIME": return "Full-Time Employment";
      case "INTERNSHIP": return "Internship";
      case "PART_TIME": return "Part-Time";
      case "CONTRACT": return "Contract";
      case "COURSE": return "Course Completion";
      case "WORKSHOP": return "Workshop";
      case "PARTICIPATION": return "Participation";
      case "ACHIEVEMENT": return "Achievement";
      case "EXPERIENCE": return "Experience";
      default: return type || "Full-Time Employment";
    }
  };

  const isRevoked = offer?.status === "Revoked";
  const isCertificate = offer?.offer_id.startsWith("STL-INT-20") || 
                        offer?.offer_id.startsWith("STL-COURSE-") || 
                        offer?.offer_id.startsWith("STL-WORK-") ||
                        offer?.offer_id.startsWith("STL-PART-") ||
                        offer?.offer_id.startsWith("STL-ACH-");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img src="/applogo.png" alt="Stalight Technologies" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-md ring-1 ring-slate-700 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[11px] sm:text-xs md:text-sm font-extrabold tracking-wider text-white uppercase truncate">STALIGHT TECHNOLOGIES</h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-tight truncate">Official Digital Credential Registry</p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Verified</span> Registry
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 flex flex-col justify-center">
        {loading ? (
          <div className="bg-slate-950/90 rounded-2xl shadow-2xl border border-slate-800 p-8 sm:p-12 text-center backdrop-blur">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Verifying Credential...</h2>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">Checking cryptographically signed records in Stalight Technologies Registry.</p>
          </div>
        ) : error || !offer ? (
          <div className="bg-slate-950/90 rounded-2xl shadow-2xl border border-rose-900/60 p-6 sm:p-8 md:p-10 text-center backdrop-blur">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-950/80 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-800/80 shadow-lg">
              <XCircle className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Verification Unsuccessful</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              {error || "The requested credential could not be verified against official records."}
            </p>
            <div className="mt-6 flex justify-center">
              <Link to="/">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/90 rounded-2xl shadow-2xl border border-slate-800/90 overflow-hidden backdrop-blur">
            {/* Status Header Banner */}
            <div className={`p-5 sm:p-6 md:p-8 text-center border-b ${
              isRevoked 
                ? "bg-rose-950/40 border-rose-900/60" 
                : "bg-gradient-to-b from-emerald-950/50 to-slate-950/20 border-slate-800/80"
            }`}>
              <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full mb-3 shadow-lg ring-4 ${
                isRevoked 
                  ? "bg-rose-950 text-rose-400 ring-rose-900/50 border border-rose-700/60" 
                  : "bg-emerald-950 text-emerald-400 ring-emerald-900/40 border border-emerald-600/50"
              }`}>
                {isRevoked ? (
                  <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </div>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                  Official Verification Status
                </span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight">
                {isRevoked 
                  ? "Credential Revoked" 
                  : isCertificate 
                    ? "Authentic Verified Certificate" 
                    : "Authentic Issued Offer Letter"
                }
              </h2>
              <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1.5 max-w-lg mx-auto leading-relaxed">
                {isRevoked
                  ? "This document was previously issued by Stalight Technologies but has since been revoked."
                  : "This official digital record has been verified as authentic and legally issued by Stalight Technologies Pvt. Ltd."
                }
              </p>
            </div>

            {/* Credential Details Card Body */}
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              {/* Candidate Summary Box */}
              <div className="bg-slate-900/90 rounded-xl p-4 sm:p-5 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 shadow-inner">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-black text-base sm:text-lg shadow-md ring-1 ring-indigo-400/30 shrink-0">
                    {offer.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Recipient Name</span>
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">{offer.candidate_name}</h3>
                    <p className="text-[11px] sm:text-xs font-mono text-slate-400 truncate">{offer.email}</p>
                  </div>
                </div>
                <div className="sm:text-right border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-800 shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Credential Reference</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-indigo-400 tracking-wide break-all">{offer.offer_id}</span>
                </div>
              </div>

              {/* Data Grid with Official Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Designation / Role</span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 break-words">{offer.designation}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Credential Type</span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 break-words">{getOfferTypeLabel(offer.offer_type)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isCertificate ? "Issue Date" : "Date of Joining"}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 break-words">
                      {offer.date_of_joining || offer.issue_date || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Issuing Organization</span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 break-words">Stalight Technologies Pvt. Ltd.</p>
                  </div>
                </div>
              </div>

              {/* Official Seal & Authentication Note */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-2.5 sm:gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                  <strong>Verification Statement:</strong> This digital verification confirms that this credential was officially generated and issued under the authority of Stalight Technologies Pvt. Ltd. For institutional inquiries, contact <span className="text-indigo-400 font-mono">contact@stalight.in</span>.
                </p>
              </div>

              {/* Bottom Reference & Authentication Hash */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-0 text-[11px] sm:text-xs text-slate-400 border-t border-slate-800/80">
                <span className="break-all">Registry Record: <strong className="text-slate-300 font-mono">{offer.offer_id}</strong></span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Authenticated & Valid
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        <p className="font-medium text-slate-400">© 2026 Stalight Technologies Pvt. Ltd. · All rights reserved.</p>
        <p className="mt-1">Bangalore, Karnataka, India · contact@stalight.in · stalight.in</p>
      </footer>
    </div>
  );
};

export default VerifyOffer;
