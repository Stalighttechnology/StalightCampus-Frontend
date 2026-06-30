import React, { useState, useEffect } from 'react';
import { X, Zap, Wrench, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInAppPopups } from '../../hooks/useInAppPopups';

export const FeaturePopup: React.FC = () => {
  const { activePopup, dismissPopup } = useInAppPopups();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use CSS transitions instead of Framer Motion to prevent lag on low-end devices
  useEffect(() => {
    if (activePopup) {
      setShouldRender(true);
      // Small delay to allow DOM to render before adding the visible class
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [activePopup]);

  if (!shouldRender || !activePopup) return null;

  const handleAction = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissPopup();
      if (activePopup.action) {
        navigate(activePopup.action);
      }
    }, 300);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => dismissPopup(), 300);
  };

  const getThemeVars = () => {
    switch (activePopup.popup_type) {
      case 'feature': return { isLogo: true, icon: null, gradient: "from-indigo-600 to-purple-600", bg: "bg-indigo-500", glow: "shadow-indigo-500/30" };
      case 'offer': return { isLogo: true, icon: null, gradient: "from-amber-500 to-orange-600", bg: "bg-amber-500", glow: "shadow-amber-500/30" };
      case 'maintenance': return { isLogo: true, icon: null, gradient: "from-red-600 to-rose-600", bg: "bg-red-500", glow: "shadow-red-500/30" };
      case 'update': return { isLogo: true, icon: null, gradient: "from-blue-600 to-cyan-600", bg: "bg-blue-500", glow: "shadow-blue-500/30" };
      default: return { isLogo: true, icon: null, gradient: "from-primary to-primary", bg: "bg-primary", glow: "shadow-primary/30" };
    }
  };

  const themeVars = getThemeVars();

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
         if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        className={`relative w-full max-w-lg bg-background shadow-2xl overflow-hidden transition-transform duration-300 ease-out
          ${isMobile 
            ? `rounded-t-[32px] rounded-b-none pb-safe ${isVisible ? 'translate-y-0' : 'translate-y-full'}` 
            : `rounded-3xl border border-white/10 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`
          }`}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className={`absolute top-4 right-4 p-2 rounded-full z-20 transition-all
            ${activePopup.image 
              ? 'bg-black/40 hover:bg-black/60 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground'
            }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Header with dynamic gradient overlay */}
        {activePopup.image && (
          <div className="relative w-full h-48 sm:h-56 bg-muted">
            <img
              src={activePopup.image}
              alt={activePopup.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className={`p-6 sm:p-8 ${!activePopup.image ? 'pt-10' : ''}`}>
          
          {/* Dynamic Icon / Logo */}
          <div className="flex items-center gap-4 mb-4">
            {themeVars.isLogo ? (
              <img src="/applogo.png" alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${themeVars.gradient} shadow-lg ${themeVars.glow}`}>
                {themeVars.icon}
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {activePopup.title}
            </h2>
          </div>
          
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8">
            {activePopup.message}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            {activePopup.button_text && (
              <button
                onClick={handleAction}
                className={`w-full sm:flex-1 py-3.5 px-6 bg-gradient-to-r ${themeVars.gradient} hover:opacity-90 text-white font-bold text-base rounded-2xl transition-all shadow-lg ${themeVars.glow} flex items-center justify-center gap-2 transform active:scale-[0.98]`}
              >
                {activePopup.button_text}
              </button>
            )}
            {(!activePopup.button_text || activePopup.popup_type === 'maintenance') && (
              <button
                onClick={handleDismiss}
                className="w-full sm:flex-1 py-3.5 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground font-semibold text-base rounded-2xl transition-all flex items-center justify-center transform active:scale-[0.98]"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
