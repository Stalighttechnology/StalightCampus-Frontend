import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, ChevronLeft, Rocket } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import UpgradePlanDialog from "./UpgradePlanDialog";
import { cn } from "@/lib/utils";

interface UpgradeRequiredProps {
  featureName: string;
  role: string;
  onBack: () => void;
}

const UpgradeRequired = ({ featureName, role, onBack }: UpgradeRequiredProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isAdmin = role === 'admin' || role === 'principal';
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const orgName = localStorage.getItem("org_name") || "Your Institution";

  return (
    <div className="flex items-center justify-center min-h-[600px] w-full p-6 bg-slate-50/30 dark:bg-transparent">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "max-w-xl w-full p-8 md:p-12 text-center rounded-[2.5rem] shadow-2xl relative overflow-hidden border-2",
          theme === 'dark' 
            ? 'bg-zinc-900 border-zinc-800 shadow-none' 
            : 'bg-white border-slate-200 shadow-purple-100/30'
        )}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -ml-16 -mb-16" />

        <div className="relative z-10">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 mx-auto rotate-3 border border-primary/20 shadow-inner">
            <Lock className="text-primary w-10 h-10" />
          </div>
          
          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest mb-4 inline-block">
            Premium Feature
          </span>

          <h2 className={cn(
            "text-3xl font-black mb-4 tracking-tight",
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            {isAdmin ? "Upgrade Required" : "Access Restricted"}
          </h2>

          <p className={cn(
            "text-base mb-10 leading-relaxed max-w-md mx-auto",
            theme === 'dark' ? 'text-zinc-400' : 'text-slate-500'
          )}>
            {isAdmin ? (
              <>The <span className="font-bold text-primary capitalize">{featureName.replace(/-/g, ' ')}</span> module is exclusive to our <span className="text-primary font-semibold underline underline-offset-4 decoration-primary/30">Pro and Advance plans</span>.</>
            ) : (
              <>The <span className="font-bold text-primary capitalize">{featureName.replace(/-/g, ' ')}</span> module is restricted. Please contact your <span className="text-primary font-semibold">Institution Admin</span> for a plan upgrade.</>
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAdmin && (
              <Button 
                onClick={() => setIsUpgradeOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white px-8 h-14 text-base font-bold rounded-2xl w-full sm:w-auto shadow-lg shadow-purple-100 transition-all group"
              >
                View Upgrade Plans
                <Rocket className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            )}
            <Button 
              variant="ghost"
              onClick={onBack}
              className={cn(
                "px-8 h-14 text-base font-semibold rounded-2xl w-full sm:w-auto group",
                theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <ChevronLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {isAdmin ? "Back to Dashboard" : "Return to Home"}
            </Button>
          </div>

          <div className={cn(
            "mt-12 p-5 rounded-2xl border border-dashed text-sm italic",
            theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          )}>
             "Neuro-Campus: Empowering institutions with next-gen AI governance."
          </div>
        </div>
      </motion.div>

      <UpgradePlanDialog 
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        orgName={orgName}
        currentPlan={localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).org_plan : "basic"}
      />
    </div>
  );
};

export default UpgradeRequired;
