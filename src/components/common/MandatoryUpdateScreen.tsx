import { Capacitor, registerPlugin } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { motion } from "framer-motion";
import { DownloadCloud, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MandatoryUpdateScreenProps {
  storeUrl: string;
}

interface StoreRedirectPluginType {
  openPlayStore(options: { appId: string }): Promise<void>;
}
const StoreRedirect = registerPlugin<StoreRedirectPluginType>("StoreRedirect");

export const MandatoryUpdateScreen: React.FC<MandatoryUpdateScreenProps> = ({ storeUrl }) => {
  const handleUpdate = async () => {
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await StoreRedirect.openPlayStore({ appId: 'com.stalight.campus' });
        } catch (e) {
          if (storeUrl) {
            await Browser.open({ url: storeUrl });
          }
        }
      } else {
        if (storeUrl) {
          await Browser.open({ url: storeUrl });
        }
      }
    } else {
      window.location.reload();
    }
  };

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
    <div className="fixed inset-0 w-full h-[100dvh] z-[99999] flex flex-col items-center justify-center bg-background text-foreground overflow-hidden px-6">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Top Branding */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-8 left-0 right-0 flex justify-center items-center gap-3 z-10"
      >
        <img src="/logo.jpeg" alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-sm border border-border/50" />
        <span className="text-lg font-bold tracking-tight text-foreground">Stalight Campus</span>
      </motion.div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-lg flex flex-col items-center text-center space-y-6 mt-12">
        
        <motion.div variants={itemVariants} className="space-y-4 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Mandatory Update
          </div>
          
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-2 border border-primary/10 shadow-sm">
            <ArrowUpCircle className="w-12 h-12 text-primary" />
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Time to Upgrade
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            A critical update is required. Please update the app now to continue accessing your campus portal.
          </p>
        </motion.div>

        {/* Action Button */}
        <motion.div variants={itemVariants} className="w-full pt-4">
          <Button
            size="lg"
            className="h-14 w-full text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-[1.02]"
            onClick={handleUpdate}>
            <DownloadCloud className="mr-2 w-5 h-5" />
            Update Now
          </Button>
        </motion.div>

      </motion.div>
    </div>
  );
};
