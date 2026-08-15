import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import NetworkStatus from "./components/common/NetworkStatus";
import { FeaturePopup } from "./components/common/FeaturePopup";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import Index from "./components/common/Index";
import { PwaInstaller } from "./components/pwa/PwaInstaller";
import MobileDraw from './components/common/MobileDraw';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Monitor, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy loaded components
const NotFound = lazy(() => import("./components/common/NotFound"));
const PaymentSuccess = lazy(() => import("./components/common/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./components/common/PaymentCancel"));
const ResultsView = lazy(() => import("./components/common/ResultsView"));
const StudentDashboard = lazy(() => import("./components/dashboards/StudentDashboard"));
const AdminDashboard = lazy(() => import("./components/dashboards/AdminDashboard"));
const OrgAdminDashboard = lazy(() => import("./components/dashboards/OrgAdminDashboard"));
const HODDashboard = lazy(() => import("./components/dashboards/HODDashboard"));
const FacultyDashboard = lazy(() => import("./components/dashboards/FacultyDashboard"));
const COEDashboard = lazy(() => import("./components/dashboards/COEDashboard"));
const FeesManagerDashboard = lazy(() => import("./components/dashboards/FeesManagerDashboard"));
const DeanDashboard = lazy(() => import("./components/dashboards/DeanDashboard"));
const HMSDashboard = lazy(() => import("./components/dashboards/HMSDashboard"));
const WardenDashboard = lazy(() => import("./components/dashboards/WardenDashboard"));
const TransportAdminDashboard = lazy(() => import("./components/dashboards/TransportAdminDashboard"));
const DriverDashboard = lazy(() => import("./components/dashboards/DriverDashboard"));
const LibraryAdminDashboard = lazy(() => import("./components/dashboards/LibraryAdminDashboard"));
const AdmissionManagerDashboard = lazy(() => import("./components/dashboards/AdmissionManagerDashboard"));
const CounsellorDashboard = lazy(() => import("./components/dashboards/CounsellorDashboard"));
const AdmissionLanding = lazy(() => import("./components/public/AdmissionLanding"));
const ApplicationWizard = lazy(() => import("./components/public/ApplicationWizard"));
const Onboarding = lazy(() => import("./components/common/Onboarding"));
const Pricing = lazy(() => import("./components/common/Pricing"));
const FloatingAssistant = lazy(() => import("./components/common/FloatingAssistant"));
const AIInterview = lazy(() => import("./components/common/AIInterview"));
const TrialExpired = lazy(() => import("./components/common/TrialExpired"));
const OnboardingSuccess = lazy(() => import("./components/common/OnboardingSuccess"));
const SuperAdminIndex = lazy(() => import("./superadmin/index"));
const DeveloperIndex = lazy(() => import("./developer/index"));
const PrivacyPolicy = lazy(() => import("./components/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./components/legal/TermsOfService"));
const Home = lazy(() => import("./components/public/Home"));
const SyncAccessRestricted = lazy(() => import("./components/common/SyncAccessRestricted"));
const AccountDeletion = lazy(() => import("./components/legal/AccountDeletion"));
const NDAConsentPortal = lazy(() => import("./nda_consent/components/NDAConsentPortal").then(module => ({ default: module.NDAConsentPortal })));

import { WardenProvider } from "./context/WardenContext";
import { HMSProvider } from "./context/HMSContext";
import { shouldShowFloatingAssistant } from "./utils/config";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useWebSocketNotifications } from "./hooks/useWebSocketNotifications";
import { initErrorLogger } from "./utils/errorLogger";
import type { ReactNode } from "react";

// Mobile Restriction component for desktop-only access roles
const MobileRestrictionScreen = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 relative overflow-hidden selection:bg-purple-500/10">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.05),transparent_40%)] pointer-events-none" />

      <div className="relative w-[90%] sm:w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6 transform hover:scale-[1.01] transition-all duration-300">
        {/* Warning Icon Graphic */}
        <div className="flex justify-center">
          <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-purple-50 to-indigo-50 border border-purple-100 animate-pulse">
            <Monitor className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 border-2 border-white text-[10px] sm:text-xs font-bold text-white shadow-md">
              ✕
            </div>
          </div>
        </div>

        {/* Info text */}
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Desktop Access Required
          </h2>
          <p className="text-purple-600 font-semibold text-[10px] sm:text-xs uppercase tracking-widest">
            Admission Manager Portal
          </p>
        </div>

        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          The Admission Manager console is designed and optimized specifically for desktop screens to ensure precise data management and user safety.
        </p>

        <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed border-t border-slate-100 pt-4">
          Please access this page using a web browser on a laptop or desktop computer.
        </p>

        {/* Action button */}
        <div className="pt-2">
          <Button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2 sm:py-2.5 rounded-xl shadow-md shadow-purple-200 hover:shadow-purple-300 active:scale-[0.98] transition-all duration-200 text-xs sm:text-sm"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Log Out & Exit
          </Button>
        </div>
      </div>
    </div>
  );
};



// Protected Route Component
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: string[];
}) => {
  const { isAuthenticated, isInitializing, role, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // While the silent cookie-refresh is running, show the loading spinner to prevent white screens
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/applogo.png" alt="Stalight Campus Logo" className="w-16 h-16 rounded-full object-cover animate-pulse shadow-lg" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
    if (isAuthenticated && role === "placement_officer") {
      return <Navigate to="/sync-access-restricted" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Restrict admission_manager on mobile/tablet screens (< 1024px)
  if (role === "admission_manager" && isMobile) {
    return (
      <MobileRestrictionScreen
        onLogout={() => {
          clearAuth();
          navigate("/", { replace: true });
        }}
      />
    );
  }

  return <>{children}</>;
};

const AppContent = () => {
  useWebSocketNotifications();
  const { role: userRole, user: userData } = useAuth();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);
  currentPathRef.current = location.pathname;
  
  // Swipe to close bottom sheet state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      // Slide off-screen smoothly before unmounting
      setDragY(500);
      setTimeout(() => {
        setShowExitDialog(false);
        setDragY(0);
      }, 250);
    } else {
      setDragY(0);
    }
  };

  // Helper to determine if a route is a top-level dashboard landing page
  const isDashboardPath = (path: string) => {
    const p = path.endsWith('/') ? path.slice(0, -1) : path;
    if (p === "" || p === "/") return true;
    if (p.endsWith("/dashboard")) return true;
    
    const topDashboards = [
      "/dashboard",
      "/admin",
      "/org-admin",
      "/hod",
      "/faculty",
      "/fees-manager",
      "/dean",
      "/coe",
      "/hms",
      "/warden",
      "/transport-admin",
      "/driver",
      "/library-admin",
      "/admission-manager"
    ];
    return topDashboards.includes(p);
  };

  useEffect(() => {
    initErrorLogger();
    let backListenerPromise: Promise<any> | null = null;

    // Handle browser/webview popstate (history back) navigation
    const handlePopState = (event: PopStateEvent) => {
      const fromPath = currentPathRef.current;
      const isDashboard = isDashboardPath(fromPath);
      
      if (isDashboard) {
        // Prevent going back by pushing the dashboard path back to the history stack
        window.history.pushState(null, "", window.location.href);
        setShowExitDialog(true);
      }
    };

    window.addEventListener("popstate", handlePopState);

    if (Capacitor.isNativePlatform()) {
      // Request all permissions sequentially — must run AFTER splash is hidden
      // so dialogs are not covered by the splash screen overlay.
      const requestAllPermissions = async () => {
        try {
          // 1. Push Notifications
          await PushNotifications.requestPermissions();
        } catch (e) { console.warn('Notification permission error:', e); }

        try {
          // 2. Camera
          await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        } catch (e) { console.warn('Camera permission error:', e); }

        try {
          // 3. Location — explicit permission types required for Android to show dialog
          await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        } catch (e) { console.warn('Location permission error:', e); }
      };

      // Notify Capgo update is ready, hide splash screen, THEN request permissions
      // so the permission dialogs are always visible to the user.
      CapacitorUpdater.notifyAppReady()
        .then(async () => {
          await SplashScreen.hide();
          await requestAllPermissions();
        })
        .catch(async (e) => {
          console.error(e);
          await SplashScreen.hide();
          await requestAllPermissions();
        });

      // Listen for custom scheme deep links
      CapApp.addListener('appUrlOpen', (event) => {
        // If the URL is our custom scheme, we can close the Browser if it's open
        if (event.url.includes('stalightcampus://')) {
          Browser.close().catch(console.error);
          
          // Optionally parse the URL and dispatch an event or handle routing
          if (event.url.includes('google-connected=')) {
             window.dispatchEvent(new Event("googleOAuthCompleted"));
          }
        }
      });

      // Handle hardware back button for app exit confirmation
      backListenerPromise = CapApp.addListener('backButton', () => {
        const currentPath = currentPathRef.current;
        const isDashboard = isDashboardPath(currentPath);
        
        console.log('[BACK_BUTTON] Pressed. Pathname:', currentPath, 'isDashboard:', isDashboard);
        
        if (isDashboard) {
          console.log('[BACK_BUTTON] Showing exit dialog');
          setShowExitDialog(true);
        } else {
          console.log('[BACK_BUTTON] Navigating back');
          window.history.back();
        }
      });
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (backListenerPromise) {
        backListenerPromise.then((listener) => listener.remove());
      }
    };
  }, []);

  return (
    <>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <img src="/applogo.png" alt="Stalight Campus Logo" className="w-16 h-16 rounded-full object-cover animate-pulse shadow-lg" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Stalight Campus...</p>
          </div>
        </div>
      }>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <>
              <Index />
            </>
          } />
          <Route path="/forgot-password" element={
            <>
              <Index />
            </>
          } />
          <Route path="/home" element={
            <>
              <Home />
            </>
          } />

          {/* Unauthenticated / Public Mobile Drawing Route */}
          <Route path="/mobile-draw" element={<MobileDraw />} />

          {/* Payment routes */}
          <Route path="/payment/success" element={
            <>
              <PaymentSuccess />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          <Route path="/payment/cancel" element={
            <>
              <PaymentCancel />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          {/* Onboarding routes */}
          <Route path="/stalightcampus" element={<Pricing />} />
          <Route path="/stalightcampus/admin/*" element={<SuperAdminIndex />} />
          <Route path="/stalightcampus/developer/*" element={<DeveloperIndex />} />
          <Route path="/stalightcampus/:plan" element={<Onboarding />} />
          <Route path="/onboarding/success" element={<OnboardingSuccess />} />
          <Route path="/trial-expired" element={<TrialExpired />} />
          <Route path="/nda-consent" element={
            <>
              <NDAConsentPortal />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          {/* Sync Restricted Route */}
          <Route path="/sync-access-restricted" element={
            <ProtectedRoute allowedRoles={["placement_officer"]}>
              <>
                <SyncAccessRestricted />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Public Admission routes */}
          <Route path="/admissions/:org_slug" element={<AdmissionLanding />} />
          <Route path="/admissions/:org_slug/apply" element={<ApplicationWizard />} />

          {/* Legal routes */}
          <Route path="/privacy-policy" element={
            <>
              <PrivacyPolicy />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />
          <Route path="/terms-of-service" element={
            <>
              <TermsOfService />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />
          <Route path="/account-deletion" element={
            <>
              <AccountDeletion />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          {/* Public results view (students) */}
          <Route path="/results/view/:token" element={
            <>
              <ResultsView />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />

          {/* Revaluation & Makeup routes: accessible to both teachers and students. Render appropriate dashboard based on current role. */}
          <Route path="/revaluation" element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <>
                {(() => {
                  const roleNow = sessionStorage.getItem("role");
                  return roleNow === 'teacher' ? <FacultyDashboard user={userData} setPage={() => { }} /> : <StudentDashboard user={userData} setPage={() => { }} />;
                })()}
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/makeupexam" element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <>
                {(() => {
                  const roleNow = sessionStorage.getItem("role");
                  return roleNow === 'teacher' ? <FacultyDashboard user={userData} setPage={() => { }} /> : <StudentDashboard user={userData} setPage={() => { }} />;
                })()}
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          
          <Route path="/holiday-calendar" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/timetable" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/marks" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/leave-request" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/leave" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/leave-status" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/fees" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={["student", "parent", "outside_student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />
          <Route path="/student-hostel-details" element={
            <ProtectedRoute allowedRoles={["student", "parent", "outside_student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/transportation" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/library" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/announcements" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/face-recognition" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/student-study-material" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/student-syllabus" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/student-assignment" element={
            <ProtectedRoute allowedRoles={["student", "parent"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/study-mode" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/ai-interview" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/class-schedule" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <>
                <StudentDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={["admin", "principal"]}>
              <>
                <AdminDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Org Admin routes */}
          <Route path="/org-admin/*" element={
            <ProtectedRoute allowedRoles={["org_admin"]}>
              <>
                <OrgAdminDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* HOD routes */}
          <Route path="/hod/*" element={
            <ProtectedRoute allowedRoles={["hod"]}>
              <>
                <HODDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Faculty routes */}
          <Route path="/faculty/*" element={
            <ProtectedRoute allowedRoles={["teacher", "hod"]}>
              <>
                <FacultyDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Fees Manager routes */}
          <Route path="/fees-manager/*" element={
            <ProtectedRoute allowedRoles={["fees_manager"]}>
              <>
                <FeesManagerDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* HMS routes */}
          <Route path="/hms/*" element={
            <ProtectedRoute allowedRoles={["hms_admin"]}>
              <>
                <HMSDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/warden/*" element={
            <ProtectedRoute allowedRoles={["warden"]}>
              <>
                <WardenDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/transport-admin/*" element={
            <ProtectedRoute allowedRoles={["transport_admin"]}>
              <>
                <TransportAdminDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/library-admin/*" element={
            <ProtectedRoute allowedRoles={["library_admin"]}>
              <>
                <LibraryAdminDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/driver/*" element={
            <ProtectedRoute allowedRoles={["driver"]}>
              <>
                <DriverDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Admission Manager routes */}
          <Route path="/admission-manager/*" element={
            <ProtectedRoute allowedRoles={["admission_manager"]}>
              <>
                <AdmissionManagerDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Counsellor routes */}
          <Route path="/counsellor/*" element={
            <ProtectedRoute allowedRoles={["counsellor"]}>
              <>
                <CounsellorDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* COE routes */}
          <Route path="/coe/*" element={
            <ProtectedRoute allowedRoles={["coe"]}>
              <>
                <COEDashboard user={userData} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* Dean routes */}
          <Route path="/dean/*" element={
            <ProtectedRoute allowedRoles={["dean"]}>
              <>
                <DeanDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          {/* 404 route */}
          <Route path="*" element={
            <>
              <NotFound />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />
        </Routes>
      </Suspense>
      {/* ✅ Toast components rendered OUTSIDE routes but INSIDE AppContent */}
      <Toaster />
      <Sonner />
      <NetworkStatus />
      <FeaturePopup />
      {/* Exit App Premium Bottom Sheet Modal — native mobile only */}
      {showExitDialog && Capacitor.isNativePlatform() && (
        <div 
          onClick={() => setShowExitDialog(false)}
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              transform: `translateY(${dragY}px)`, 
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' 
            }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] border-t border-slate-100 dark:border-slate-800 p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col text-slate-800 dark:text-slate-100 touch-none"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing" />
            
            {/* Title */}
            <h3 className="text-2xl font-extrabold text-primary mb-2 px-2 select-none">
              Exit?
            </h3>
            
            {/* Message */}
            <p className="text-slate-550 dark:text-slate-450 font-medium mb-8 px-2 select-none">
              Confirm to Exit App
            </p>
            
            {/* Actions */}
            <div className="flex gap-4 px-2">
              <button
                onClick={() => {
                  setShowExitDialog(false);
                  CapApp.exitApp();
                }}
                className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                Yes
              </button>
              <button
                onClick={() => setShowExitDialog(false)}
                className="flex-1 bg-gradient-to-r from-primary to-[#8b5cf6] hover:opacity-95 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const App = () => {
  return (
    // ✅ NO QueryClientProvider here - it's in main.tsx
    // ✅ NO ThemeProvider here - it's in main.tsx
    // ✅ NO TooltipProvider here - it's in main.tsx
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <HMSProvider>
          <WardenProvider>
            <AppContent />
          </WardenProvider>
        </HMSProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;