import React, { useState, useEffect } from 'react';
import { Bell, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { requestForToken } from '../../lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstaller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { isAuthenticated } = useAuth();

  const [permissions, setPermissions] = useState({
    installed: false,
    notifications: Notification.permission === 'granted',
  });

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setPermissions(p => ({ ...p, installed: true }));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setPermissions(p => ({ ...p, installed: false }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_pwa_installer', handleOpen);
    return () => {
      window.removeEventListener('open_pwa_installer', handleOpen);
    };
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenPwaWizard', 'true');
    window.dispatchEvent(new CustomEvent('pwa_setup_complete'));
    setIsOpen(false);
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      toast.error("Install prompt not available. Try installing from your browser menu.");
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setPermissions(p => ({ ...p, installed: true }));
      setInstallPrompt(null);
      toast.success("App installed successfully!");
      // If notifications are already enabled, we are done
      if (permissions.notifications) {
        handleClose();
      }
    }
  };

  const requestNotification = async () => {
    try {
      const token = await requestForToken();
      if (token || Notification.permission === 'granted') {
        setPermissions(p => ({ ...p, notifications: true }));
        toast.success("Notifications enabled!");
        handleClose();
      } else {
        toast.error("Notification permission denied.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to enable notifications.");
    }
  };

  const canInstall = !permissions.installed && installPrompt !== null;
  const needsNotifications = !permissions.notifications;

  const showInstallStep = canInstall;
  const showNotificationStep = !canInstall && needsNotifications;

  // If neither step is needed but it's open, just render a "All Set" state or close
  const allDone = !canInstall && !needsNotifications;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); setIsOpen(open); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <img src="/applogo.png" alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0 mt-5" />
            <div className="flex-grow text-left">
              <DialogTitle className="text-xl font-bold">
                {showInstallStep ? "Step 1: Install App" : showNotificationStep ? "Step 2: Enable Notifications" : "All Set!"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-left">
                {showInstallStep && "Install Stalight Campus to your home screen for quick access."}
                {showNotificationStep && "Enable notifications to get attendance and exam alerts directly to your device."}
                {allDone && "You are all set to use Stalight Campus!"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">

          {showInstallStep && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 shadow-sm transition-all hover:border-blue-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-base">Install App</p>
                  <p className="text-sm text-muted-foreground">Add to home screen</p>
                </div>
              </div>
              <Button onClick={handleInstall}>Install</Button>
            </div>
          )}

          {showNotificationStep && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 shadow-sm transition-all hover:border-purple-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-base">Notifications</p>
                  <p className="text-sm text-muted-foreground">Get attendance & exam alerts</p>
                </div>
              </div>
              <Button onClick={requestNotification}>Enable</Button>
            </div>
          )}

          {allDone && (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="p-4 rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="font-semibold text-lg">Experience Enhanced!</p>
              <p className="text-sm text-muted-foreground">You are now ready to use all features.</p>
            </div>
          )}

        </div>

        <div className="flex justify-end items-center mt-2 border-t pt-4">
          <Button variant="ghost" onClick={handleClose}>
            {allDone ? 'Close' : 'Skip for now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
