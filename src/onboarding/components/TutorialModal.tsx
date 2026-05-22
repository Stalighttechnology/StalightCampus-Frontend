import { useEffect } from 'react';

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
  principal: "Let's show you around your admin dashboard",
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
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-12 text-center">
          <div className="mb-4 text-4xl">🎓</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to NeuroCampus!
          </h2>
          <p className="text-purple-100 text-sm">{roleMessage}</p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
            This guided tour will walk you through all the key features of your
            dashboard, helping you get started quickly and efficiently.
          </p>

          <p className="text-slate-600 dark:text-slate-300 text-xs mb-8">
            You can restart this tour anytime from your sidebar settings.
          </p>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Skip for now
            </button>
            <button
              onClick={onStart}
              className="flex-1 px-4 py-3 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Start Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
