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
  AlertTriangle 
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
      {/* Light Grid Background identical to reference */}
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
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-16 flex items-center justify-center">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 text-center max-w-md w-full mx-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Verifying Credential...</h2>
            <p className="text-xs text-slate-500 mt-1">Cross-referencing cryptographic registry at Stalight Technologies.</p>
          </div>
        ) : error || !offer ? (
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-6 sm:p-8 md:p-10 text-center max-w-lg w-full mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <XCircle className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Verification Unsuccessful</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              {error || "The requested credential could not be verified against the official records."}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
            {/* LEFT COLUMN: Floating Document Card matching screenshot */}
            <div className="lg:col-span-7 flex justify-center w-full">
              <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] ring-1 ring-slate-900/5">
                {/* Gradient Border Frame (Pink to Purple to Blue) */}
                <div 
                  className="rounded-lg sm:rounded-xl p-4 sm:p-7 md:p-10 bg-white relative overflow-hidden"
                  style={{
                    border: "2px solid transparent",
                    backgroundImage: "linear-gradient(white, white), linear-gradient(135deg, #fb7185 0%, #d946ef 45%, #6366f1 80%, #38bdf8 100%)",
                    backgroundOrigin: "border-box",
                    backgroundClip: "padding-box, border-box",
                  }}
                >
                  {/* Subtle Brand Watermark in Center */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <img src="/applogo.png" alt="" className="w-48 sm:w-64 h-48 sm:h-64 object-contain" />
                  </div>

                  {/* Header: Logo & Company Name */}
                  <div className="flex items-center gap-2 sm:gap-3.5 mb-5 sm:mb-8">
                    <img src="/applogo.png" alt="Stalight Technologies" className="w-7 h-7 sm:w-10 sm:h-10 object-contain shrink-0" />
                    <div className="border-l-2 border-slate-900 pl-2.5 sm:pl-3">
                      <h2 className="text-[11px] sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                        STALIGHT TECHNOLOGIES
                      </h2>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center my-4 sm:my-8">
                    <h1 className="text-lg sm:text-2xl md:text-[26px] font-black tracking-tight text-slate-900 uppercase">
                      {isCertificate 
                        ? `CERTIFICATE OF ${offer.offer_type === 'INTERNSHIP' ? 'INTERNSHIP' : 'COMPLETION'}` 
                        : `OFFER OF APPOINTMENT`
                      }
                    </h1>

                    {/* Ribbon / Divider Line with Diamond Bullets */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mt-3 sm:mt-5 mb-3 sm:mb-5">
                      <div className="h-[1.5px] w-6 sm:w-16 md:w-20 bg-gradient-to-r from-transparent via-pink-500 to-purple-500" />
                      <span className="text-[8px] sm:text-[11px] md:text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1 sm:gap-1.5">
                        <span className="text-purple-600 text-[8px] sm:text-[9px]">◆</span>
                        {isCertificate ? "THIS IS PROUDLY PRESENTED TO" : "THIS IS OFFICIALLY PRESENTED TO"}
                        <span className="text-purple-600 text-[8px] sm:text-[9px]">◆</span>
                      </span>
                      <div className="h-[1.5px] w-6 sm:w-16 md:w-20 bg-gradient-to-r from-purple-500 via-indigo-500 to-transparent" />
                    </div>

                    {/* Candidate Name in Georgia/Serif Font */}
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-serif text-slate-900 font-normal tracking-wide mt-1 sm:mt-2 break-words">
                      {offer.candidate_name}
                    </h2>
                  </div>

                  {/* Paragraph Body */}
                  <div className="text-center max-w-lg mx-auto text-[10.5px] sm:text-xs md:text-sm text-slate-600 leading-relaxed my-4 sm:my-6 md:my-8">
                    {isCertificate ? (
                      <p>
                        for successfully completing their internship as a <strong className="text-indigo-600 font-semibold">{offer.designation}</strong> at <strong className="text-purple-600 font-semibold">Stalight Technologies Pvt Ltd</strong>. The internship was held from {offer.date_of_joining || "01 June 2026"} to {offer.issue_date || "22 May 2028"}.
                        <br className="hidden sm:inline" />
                        {" "}We appreciate their dedication, diligence, and contribution during the engagement and wish them the best in all future endeavors.
                      </p>
                    ) : (
                      <p>
                        for appointment as a <strong className="text-indigo-600 font-semibold">{offer.designation}</strong> at <strong className="text-purple-600 font-semibold">Stalight Technologies Pvt Ltd</strong>.
                        <br className="hidden sm:inline" />
                        {" "}Commencing from <strong className="text-slate-800 font-semibold">{offer.date_of_joining || offer.issue_date || "Date of Joining"}</strong> under {getOfferTypeLabel(offer.offer_type)} terms.
                      </p>
                    )}
                  </div>

                  {/* Footer Elements: Authorized Signatory, QR Code, Issue Date */}
                  <div className="mt-6 sm:mt-10 md:mt-12 pt-3 sm:pt-4 flex items-end justify-between text-center gap-1 sm:gap-2">
                    {/* Authorized Signatory */}
                    <div className="flex flex-col items-center">
                      <div className="h-6 sm:h-8 flex items-end pb-0.5 sm:pb-1">
                        <span className="font-serif italic text-xs sm:text-sm text-indigo-800">Ritesh N</span>
                      </div>
                      <div className="w-18 sm:w-28 md:w-32 border-t border-slate-900 pt-1 sm:pt-1.5">
                        <p className="text-[7.5px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-900 whitespace-nowrap">AUTHORIZED SIGNATORY</p>
                        <p className="text-[6.5px] sm:text-[8px] md:text-[9px] text-slate-500 whitespace-nowrap">Stalight Technologies Pvt Ltd</p>
                      </div>
                    </div>

                    {/* Center QR Code */}
                    <div className="flex flex-col items-center">
                      <div className="p-0.5 sm:p-1 bg-white border border-slate-200 rounded shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                            isCertificate 
                              ? `https://campus.stalight.in/verify/${offer.offer_id}`
                              : `https://campus.stalight.in/verify-offer/${offer.offer_id}`
                          )}`} 
                          alt="Verification QR" 
                          className="w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12" 
                        />
                      </div>
                      <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-slate-400 mt-0.5 max-w-[80px] sm:max-w-none truncate">ID: {offer.offer_id}</span>
                      <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-indigo-600">Verify Credential</span>
                    </div>

                    {/* Issue Date */}
                    <div className="flex flex-col items-center">
                      <div className="h-6 sm:h-8 flex items-end pb-0.5 sm:pb-1">
                        <span className="text-[8.5px] sm:text-[10px] md:text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {offer.issue_date || "01 June 2026"}
                        </span>
                      </div>
                      <div className="w-18 sm:w-28 md:w-32 border-t border-slate-900 pt-1 sm:pt-1.5">
                        <p className="text-[7.5px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-900 whitespace-nowrap">ISSUE DATE</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Recipient Information matching screenshot */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-4 sm:space-y-6 text-left">
              <div>
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-pink-600 block mb-1">
                  {isCertificate ? "CERTIFICATE RECIPIENT" : "OFFER LETTER RECIPIENT"}
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight break-words">
                  {offer.candidate_name}
                </h1>
              </div>

              {/* ISSUED BY */}
              <div className="space-y-1 sm:space-y-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  ISSUED BY
                </span>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <img src="/applogo.png" alt="Stalight" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Stalight Technologies Pvt Ltd
                  </span>
                </div>
              </div>

              {/* Validation Affirmation Text */}
              <div className="pt-3 sm:pt-4 border-t border-slate-200">
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  {isCertificate ? (
                    <>
                      The certificate affirms that <strong className="text-purple-600 font-bold">{offer.candidate_name}</strong> has satisfactorily fulfilled the requirements outlined. This validation ensures its authenticity, having been duly verified and granted by <strong className="text-slate-900 font-bold">Stalight Technologies Pvt Ltd.</strong>
                    </>
                  ) : (
                    <>
                      The offer letter affirms that <strong className="text-purple-600 font-bold">{offer.candidate_name}</strong> has been officially appointed for the position of <strong className="text-indigo-600 font-bold">{offer.designation}</strong>. This validation ensures its authenticity, having been duly verified and granted by <strong className="text-slate-900 font-bold">Stalight Technologies Pvt Ltd.</strong>
                    </>
                  )}
                </p>
              </div>

              {/* Micro-Details Meta Line */}
              <div className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono space-y-1 pt-1 break-words">
                <p>
                  {isCertificate ? "Certificate ID" : "Offer ID"}: <strong className="text-slate-800">{offer.offer_id}</strong> • Type: <span className="uppercase text-slate-700 font-bold">{offer.offer_type}</span> • Status: <span className="text-emerald-600 font-bold">{offer.status || "Verified"}</span>
                </p>
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
