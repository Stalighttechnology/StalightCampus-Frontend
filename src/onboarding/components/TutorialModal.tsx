import { useEffect, useState } from 'react';
import { Compass, ArrowRight, X } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onStart: () => void;
  onSkip: () => void;
  role: string;
}

const roleMessages: Record<string, string> = {
  student: "Let's show you around your student portal",
  faculty: "Let's show you around your faculty dashboard",
  hod: "Let's show you around your HOD dashboard",
  admin: "Let's show you around your admin dashboard",
  principal: "Let's show you around your principal dashboard",
  coe: "Let's show you around your COE dashboard",
  dean: "Let's show you around your Dean dashboard",
  feesmanager: "Let's show you around your Fees Manager dashboard",
  warden: "Let's show you around your Warden dashboard",
  hms: "Let's show you around your HMS dashboard",
};

export const TutorialModal = ({
  isOpen,
  onStart,
  onSkip,
  role,
}: TutorialModalProps) => {
  const [show, setShow] = useState(false);

  // Prevent body scroll when modal is open and handle animation state
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Slight delay for entry animation
      const timer = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const roleMessage =
    roleMessages[role.toLowerCase()] ||
    "Let's show you around your portal";

  return (
    <div className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl rounded-3xl max-w-[400px] w-full mx-4 overflow-hidden transform transition-all duration-300 ${show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}
      >
        <div className="relative z-10">
          <button 
            onClick={onSkip} 
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors z-20 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="px-8 pt-10 pb-4 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30 rounded-2xl flex items-center justify-center mb-6">
              <Compass size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
              Welcome to StalightCampus
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {roleMessage}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <div className="space-y-6">
              <p className="text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed text-center">
                This quick guided tour will walk you through all the key features of your dashboard, helping you get started efficiently.
              </p>

              <div className="bg-slate-50/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 text-center shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  You can always restart this tour later from your Help & Learning tab.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={onStart}
                className="group flex items-center justify-center gap-2 w-full px-4 py-3.5 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                Start the Tour <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
