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

import ScheduledLocationTracker from "./components/faculty/ScheduledLocationTracker";
import { useVersionControl } from "./hooks/useVersionControl";
import { MandatoryUpdateScreen } from "./components/common/MandatoryUpdateScreen";

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
const InventoryManagerDashboard = lazy(() => import("./components/dashboards/InventoryManagerDashboard"));
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
const PublicVendorQuote = lazy(() => import("./components/inventory/procurement/PublicVendorQuote").then(module => ({ default: module.PublicVendorQuote })));
const VerifyOffer = lazy(() => import("./components/public/VerifyOffer"));

import { WardenProvider } from "./context/WardenContext";
import { HMSProvider } from "./context/HMSContext";
import { shouldShowFloatingAssistant } from "./utils/config";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useWebSocketNotifications } from "./hooks/useWebSocketNotifications";
import { initErrorLogger } from "./utils/errorLogger";
import type { ReactNode } from "react";

// Protected Route Component
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: string[];
}) => {
  const { isAuthenticated, isInitializing, role } = useAuth();

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

  return <>{children}</>;
};

const AppContent = () => {
  useWebSocketNotifications();
  const { isUpdateRequired, storeUrl } = useVersionControl();
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
      "/admission-manager",
      "/inventory-admin",
      "/inventory-manager"
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

          {/* Public Vendor Quotation Response Portal */}
          <Route path="/public/quotation/:token" element={<PublicVendorQuote />} />

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

          {/* Public Offer Letter Verification & Verification Alias */}
          <Route path="/verify-offer/:offerId" element={
            <>
              <VerifyOffer />
              {shouldShowFloatingAssistant() && <FloatingAssistant />}
            </>
          } />
          <Route path="/verify/:offerId" element={
            <>
              <VerifyOffer />
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
            <ProtectedRoute allowedRoles={["teacher", "hod", "group_d", "security"]}>
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

          {/* Inventory Manager routes */}
          <Route path="/inventory-admin/*" element={
            <ProtectedRoute allowedRoles={["inventory_manager", "org_admin", "admin", "principal"]}>
              <>
                <InventoryManagerDashboard user={userData} setPage={() => { }} />
                {shouldShowFloatingAssistant() && <FloatingAssistant />}
              </>
            </ProtectedRoute>
          } />

          <Route path="/inventory-manager/*" element={
            <ProtectedRoute allowedRoles={["inventory_manager", "org_admin", "admin", "principal"]}>
              <>
                <InventoryManagerDashboard user={userData} setPage={() => { }} />
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
      {isUpdateRequired && <MandatoryUpdateScreen storeUrl={storeUrl} />}
      <FeaturePopup />
      <ScheduledLocationTracker />
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