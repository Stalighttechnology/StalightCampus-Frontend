import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ErrorIllustration from "./ErrorIllustration";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-background text-foreground overflow-hidden px-4">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center"
      >
        {/* Left Side: Illustration */}
        <motion.div variants={itemVariants} className="hidden lg:block">
          <ErrorIllustration />
        </motion.div>

        {/* Right Side: Text & Actions */}
        <div className="flex flex-col text-center lg:text-left items-center lg:items-start space-y-8">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Error 404
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/50">
              Lost in Space?
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-md mx-auto lg:mx-0">
              The page you're looking for doesn't exist or has been moved to a different dimension.
            </p>
          </motion.div>

          {/* Breadcrumb Hint */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/")}>Home</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">404 Error</span>
          </motion.div>

          {/* Action Button */}
          <motion.div variants={itemVariants} className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)] transition-all hover:scale-[1.02] w-full sm:w-auto"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard className="mr-2 w-4 h-4" />
              Back to Dashboard
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity"
      >
        <img src="/logo.jpeg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-sm font-semibold tracking-wider uppercase">Stalight Campus</span>
      </motion.div>
    </div>
  );
};

export default NotFound;
