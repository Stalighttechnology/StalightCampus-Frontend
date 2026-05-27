import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import Index from "./components/common/Index";

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
const AdmissionLanding = lazy(() => import("./components/public/AdmissionLanding"));
const ApplicationWizard = lazy(() => import("./components/public/ApplicationWizard"));
const Onboarding = lazy(() => import("./components/common/Onboarding"));
const Pricing = lazy(() => import("./components/common/Pricing"));
const FloatingAssistant = lazy(() => import("./components/common/FloatingAssistant"));
const AIInterview = lazy(() => import("./components/common/AIInterview"));
const TrialExpired = lazy(() => import("./components/common/TrialExpired"));
const OnboardingSuccess = lazy(() => import("./components/common/OnboardingSuccess"));
const SuperAdminIndex = lazy(() => import("./superadmin/index"));

import { WardenProvider } from "./context/WardenContext";
import { shouldShowFloatingAssistant } from "./utils/config";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

  // While the silent cookie-refresh is running, show a loading spinner
  // to avoid briefly rendering the login page for authenticated users.
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logo.jpeg"
            alt="Stalight Campus Logo"
            className="w-16 h-16 rounded-full object-cover animate-pulse shadow-lg"
          />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading Stalight Campus...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
    return <Index />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { role: userRole, user: userData } = useAuth();

  useEffect(() => {
    initErrorLogger();
  }, []);

  return (
    <>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo.jpeg" alt="Stalight Campus Logo" className="w-16 h-16 rounded-full object-cover animate-pulse shadow-lg" />
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
            <Route path="/stalightcampus/:plan" element={<Onboarding />} />
            <Route path="/onboarding/success" element={<OnboardingSuccess />} />
            <Route path="/trial-expired" element={<TrialExpired />} />

            {/* Public Admission routes */}
            <Route path="/admissions/:org_slug" element={<AdmissionLanding />} />
            <Route path="/admissions/:org_slug/apply" element={<ApplicationWizard />} />

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
                  return roleNow === 'teacher' ? <FacultyDashboard user={userData} setPage={() => {}} /> : <StudentDashboard user={userData} setPage={() => {}} />;
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
                  return roleNow === 'teacher' ? <FacultyDashboard user={userData} setPage={() => {}} /> : <StudentDashboard user={userData} setPage={() => {}} />;
                })()}
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/timetable" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/marks" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/leave-request" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/leave" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/leave-status" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/fees" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />
            <Route path="/student-hostel-details" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/transportation" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/library" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/announcements" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/chat" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/face-recognition" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/student-study-material" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/student-assignment" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/study-mode" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/ai-interview" element={
            <ProtectedRoute allowedRoles={["student"]}>
                <>
                  <StudentDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={["admin", "principal"]}>
                <>
                  <AdminDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* Org Admin routes */}
            <Route path="/org-admin/*" element={
            <ProtectedRoute allowedRoles={["org_admin"]}>
                <>
                  <OrgAdminDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* HOD routes */}
            <Route path="/hod/*" element={
            <ProtectedRoute allowedRoles={["hod"]}>
                <>
                  <HODDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* Faculty routes */}
            <Route path="/faculty/*" element={
            <ProtectedRoute allowedRoles={["teacher"]}>
                <>
                  <FacultyDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* Fees Manager routes */}
            <Route path="/fees-manager/*" element={
            <ProtectedRoute allowedRoles={["fees_manager"]}>
                <>
                  <FeesManagerDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* HMS routes */}
            <Route path="/hms/*" element={
            <ProtectedRoute allowedRoles={["hms_admin"]}>
                <>
                  <HMSDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/warden/*" element={
            <ProtectedRoute allowedRoles={["warden"]}>
                <>
                  <WardenDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/transport-admin/*" element={
            <ProtectedRoute allowedRoles={["transport_admin"]}>
                <>
                  <TransportAdminDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/library-admin/*" element={
            <ProtectedRoute allowedRoles={["library_admin"]}>
                <>
                  <LibraryAdminDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            <Route path="/driver/*" element={
            <ProtectedRoute allowedRoles={["driver"]}>
                <>
                  <DriverDashboard user={userData} setPage={() => {}} />
                  {shouldShowFloatingAssistant() && <FloatingAssistant />}
                </>
              </ProtectedRoute>
            } />

            {/* Admission Manager routes */}
            <Route path="/admission-manager/*" element={
            <ProtectedRoute allowedRoles={["admission_manager"]}>
                <>
                  <AdmissionManagerDashboard user={userData} setPage={() => {}} />
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
                  <DeanDashboard user={userData} setPage={() => {}} />
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
      </>
  );
};

const App = () => {
  return (
    // ✅ NO QueryClientProvider here - it's in main.tsx
    // ✅ NO ThemeProvider here - it's in main.tsx
    // ✅ NO TooltipProvider here - it's in main.tsx
    <BrowserRouter>
      <AuthProvider>
        <WardenProvider>
          <AppContent />
        </WardenProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;