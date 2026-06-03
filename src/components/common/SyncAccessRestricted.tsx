import React from "react";
import { Lock, ArrowRight, LogOut, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../../utils/authService";

const SyncAccessRestricted: React.FC = () => {
  const { clearAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    clearAuth();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-lg w-full bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8 sm:p-12 text-center relative z-10"
      >
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Icon Container with glowing effect */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-60"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
              <ShieldAlert className="w-10 h-10 text-purple-600" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Access Restricted
          </h1>

          <p className="text-slate-500 text-base leading-relaxed mb-10 max-w-sm mx-auto">
            Your institution has not activated the <strong className="text-purple-700 font-semibold">Stalight Sync</strong> plan for this account.
          </p>

          <div className="flex flex-col w-full gap-4">
            <button
              onClick={() => window.location.href = "https://sync.stalight.in"}
              className="group w-full flex items-center justify-center gap-2 py-4 px-6 bg-purple-600 text-white rounded-xl font-bold text-base transition-all duration-300 hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-600/20 active:scale-[0.98]"
            >
              Continue to Stalight Sync
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold text-base transition-all duration-300 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-900 active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 opacity-70" />
              Sign out & Go Back
            </button>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
};

export default SyncAccessRestricted;
