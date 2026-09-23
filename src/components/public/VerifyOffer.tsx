import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck, Download, Building2, Calendar, User, Briefcase, FileText, AlertTriangle } from "lucide-react";
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
      setError("No Offer Reference ID provided.");
      setLoading(false);
      return;
    }

    const fetchOffer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_ENDPOINT}/public/verify-offer/${encodeURIComponent(offerId)}/`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("No authentic offer letter was found matching this credential ID.");
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

    fetchOffer();
  }, [offerId]);

  const getOfferTypeLabel = (type: string) => {
    switch (type) {
      case "FULL_TIME": return "Full-Time Employment";
      case "INTERNSHIP": return "Internship";
      case "PART_TIME": return "Part-Time";
      case "CONTRACT": return "Contract";
      default: return type;
    }
  };

  const isRevoked = offer?.status === "Revoked";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-800 dark:text-slate-100 antialiased">
      {/* Top Navbar */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/applogo.png" alt="Stalight" className="w-8 h-8 rounded-lg shadow-sm" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">STALIGHT TECHNOLOGIES</h1>
              <p className="text-[10px] text-slate-500 font-medium">Digital Credential Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Verification
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verifying Offer Credential...</h2>
            <p className="text-sm text-slate-500 mt-1">Cross-checking cryptographic records with Stalight Registry.</p>
          </div>
        ) : error || !offer ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900/50 p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Verification Failed</h2>
            <p className="text-sm text-slate-600 dark:text-slate-450 mt-2 max-w-md mx-auto">
              {error || "The requested offer letter could not be verified."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/">
                <Button variant="outline">Return to Portal</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Status Header Banner */}
            <div className={`p-6 text-center ${isRevoked ? "bg-rose-500/10 border-b border-rose-200 dark:border-rose-900/50" : "bg-emerald-500/10 border-b border-emerald-200 dark:border-emerald-900/50"}`}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 shadow-inner bg-white dark:bg-slate-800">
                {isRevoked ? (
                  <AlertTriangle className="w-8 h-8 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                )}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isRevoked ? "Credential Revoked" : "Authentic Issued Offer Letter"}
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">
                {isRevoked
                  ? "This offer letter was previously issued but has since been revoked."
                  : "This document is verified and officially recorded in the Stalight Technologies registry."}
              </p>
            </div>

            {/* Offer Details Body */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Candidate Info Highlight */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {offer.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{offer.candidate_name}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{offer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Offer ID</span>
                  <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{offer.offer_id}</span>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                  <Briefcase className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Designation</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{offer.designation}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                  <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Employment Type</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{getOfferTypeLabel(offer.offer_type)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                  <Calendar className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Date of Joining</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{offer.date_of_joining || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                  <Building2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Issuing Entity</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Stalight Technologies Pvt Ltd</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Official verification reference: <strong className="text-slate-700 dark:text-slate-300">{offer.offer_id}</strong>
                </span>

                <a
                  href={`/api/offer-letters/${encodeURIComponent(offer.offer_id)}/download/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-md">
                    <Download className="w-4 h-4" />
                    Download Official PDF
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 Stalight Technologies Pvt Ltd · All rights reserved.</p>
        <p className="mt-1">Bangalore, Karnataka, India · contact@stalight.in</p>
      </footer>
    </div>
  );
};

export default VerifyOffer;
