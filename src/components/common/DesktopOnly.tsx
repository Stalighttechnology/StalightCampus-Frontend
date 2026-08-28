import React from "react";
import { Monitor, Smartphone, Tablet, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

interface DesktopOnlyProps {
  title?: string;
  featureName?: string;
  description?: string;
  backPath?: string;
  onBack?: () => void;
}

export const DesktopOnly: React.FC<DesktopOnlyProps> = ({
  title = "Desktop Experience Required",
  featureName = "This Feature",
  description = "is optimized for desktop screens with rich data tables, drag-and-drop workflows, and multi-panel controls. Please open this page on a desktop or laptop browser for the best experience.",
  backPath,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 text-center animate-in fade-in-50 duration-300">
      <div className="relative mb-6">
        {/* Device comparison visual */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5 mx-auto">
          <Monitor className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shadow">
          <Smartphone className="w-4 h-4 text-muted-foreground line-through opacity-60" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-3">
        <Monitor className="w-3.5 h-3.5" />
        Desktop & Laptop Only
      </div>

      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground max-w-md">
        {title}
      </h2>

      <p className="mt-2.5 text-sm text-muted-foreground max-w-md leading-relaxed">
        <span className="font-semibold text-foreground">{featureName}</span> {description}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={handleBack}
          variant="outline"
          className="gap-2 text-xs sm:text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>

      <div className="mt-8 pt-6 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 opacity-60">
          <Smartphone className="w-3.5 h-3.5" /> Mobile: Restricted
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5 opacity-60">
          <Tablet className="w-3.5 h-3.5" /> Tablet: Restricted
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <Monitor className="w-3.5 h-3.5" /> Desktop: Supported
        </span>
      </div>
    </div>
  );
};

export default DesktopOnly;
