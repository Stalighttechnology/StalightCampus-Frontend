import React from "react";
import { Lock, ArrowRight, LogOut, ShieldAlert, BarChart3, Users, Briefcase, Calendar, MessageSquare, Activity } from "lucide-react";
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
    <div className="h-screen w-full bg-slate-50 flex relative overflow-hidden">
      
      {/* --- FAKE BLURRED DASHBOARD BACKGROUND --- */}
      <div className="absolute inset-0 flex w-full h-full pointer-events-none select-none overflow-hidden blur-[4px] opacity-60">
        {/* Fake Sidebar */}
        <div className="hidden lg:flex w-64 bg-slate-900 flex-col py-6 px-4 shrink-0">
          <div className="h-8 w-32 bg-slate-800 rounded mb-10 mx-auto"></div>
          <div className="space-y-4">
            <div className="h-10 bg-slate-800/50 rounded-lg flex items-center px-4 gap-3"><BarChart3 className="text-slate-600 w-5 h-5"/><div className="h-3 w-24 bg-slate-700 rounded"></div></div>
            <div className="h-10 bg-transparent rounded-lg flex items-center px-4 gap-3"><Briefcase className="text-slate-600 w-5 h-5"/><div className="h-3 w-20 bg-slate-700 rounded"></div></div>
            <div className="h-10 bg-transparent rounded-lg flex items-center px-4 gap-3"><Users className="text-slate-600 w-5 h-5"/><div className="h-3 w-28 bg-slate-700 rounded"></div></div>
            <div className="h-10 bg-transparent rounded-lg flex items-center px-4 gap-3"><Calendar className="text-slate-600 w-5 h-5"/><div className="h-3 w-16 bg-slate-700 rounded"></div></div>
          </div>
        </div>
        
        {/* Fake Main Content */}
        <div className="flex-1 flex flex-col h-full bg-slate-50">
          {/* Fake Header */}
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
            <div className="h-5 w-48 bg-slate-200 rounded"></div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
              <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
            </div>
          </div>
          {/* Fake Content Area */}
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                  <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                  <div className="h-8 w-3/4 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 h-96 bg-white border border-slate-200 rounded-xl p-6">
                 <div className="h-5 w-40 bg-slate-200 rounded mb-6"></div>
                 <div className="w-full h-64 bg-slate-50 rounded"></div>
              </div>
              <div className="h-96 bg-white border border-slate-200 rounded-xl p-6">
                 <div className="h-5 w-32 bg-slate-200 rounded mb-6"></div>
                 <div className="space-y-4">
                   {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-full bg-slate-50 rounded"></div>)}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* --- END FAKE BLURRED DASHBOARD --- */}

      {/* --- ACTUAL MODAL OVERLAY --- */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 text-center relative"
        >
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Icon Container with glowing effect */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-60"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <ShieldAlert className="w-8 h-8 text-purple-600" strokeWidth={2} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
              Placement Dashboard Locked
            </h1>

            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              To access placement-related features, you must purchase the <strong className="text-purple-700 font-semibold">Stalight Sync</strong> product.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => window.location.href = "https://sync.stalight.in"}
                className="group w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 text-white rounded-lg font-medium text-sm transition-all duration-300 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-600/20 active:scale-[0.98]"
              >
                Purchase / Login to Stalight Sync
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium text-sm transition-all duration-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4 opacity-70" />
                Sign out
              </button>
            </div>
            
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default SyncAccessRestricted;
