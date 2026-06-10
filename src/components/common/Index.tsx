import { useState, useEffect } from "react";
import useIsMobile from "../../hooks/useIsMobile";
import { useNavigate } from "react-router-dom";
import LoginWrapper from "../auth/LoginWrapper";
import OTPPage from "../auth/OTPPage";
import ForgotPasswordFlow from "../auth/ForgotPasswordFlow";
import ForgotPasswordMobile from "../auth/ForgotPasswordMobile";
import ResetPassword from "../auth/ResetPassword";
import { useAuth } from "../../context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isInitializing, role, user: authUser } = useAuth();
  const [roleState, setRoleState] = useState<string | null>(role);
  const [page, setPage] = useState<string>("login");
  const [userState, setUserState] = useState<any>(authUser);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isInitializing) return;

    if (isAuthenticated && role) {
      setRoleState(role);
      setUserState(authUser);

      // Only redirect if we're not already on a dashboard route
      const currentPath = window.location.pathname;
      const isOnDashboard =
        currentPath.startsWith("/org-admin") ||
        currentPath.startsWith("/admin") ||
        currentPath.startsWith("/hod") ||
        currentPath.startsWith("/faculty") ||
        currentPath.startsWith("/fees-manager") ||
        currentPath.startsWith("/hms") ||
        currentPath.startsWith("/warden") ||
        currentPath.startsWith("/transport-admin") ||
        currentPath.startsWith("/driver") ||
        currentPath.startsWith("/transportation") ||
        currentPath.startsWith("/dashboard") ||
        currentPath.startsWith("/timetable") ||
        currentPath.startsWith("/attendance") ||
        currentPath.startsWith("/marks") ||
        currentPath.startsWith("/leave-request") ||
        currentPath.startsWith("/leave-status") ||
        currentPath.startsWith("/fees") ||
        currentPath.startsWith("/profile") ||
        currentPath.startsWith("/announcements") ||
        currentPath.startsWith("/chat") ||
        currentPath.startsWith("/notifications") ||
        currentPath.startsWith("/face-recognition") ||
        currentPath.startsWith("/student-study-material") ||
        currentPath.startsWith("/student-assignment");

      if (!isOnDashboard) {
        // Redirect to appropriate dashboard based on role
        switch (role) {
          case "org_admin":
            navigate("/org-admin", { replace: true });
            break;
          case "admin":
          case "principal":
            navigate("/admin", { replace: true });
            break;
          case "hod":
            navigate("/hod", { replace: true });
            break;
          case "fees_manager":
            navigate("/fees-manager", { replace: true });
            break;
          case "hms_admin":
            navigate("/hms", { replace: true });
            break;
          case "warden":
            navigate("/warden", { replace: true });
            break;
          case "transport_admin":
            navigate("/transport-admin", { replace: true });
            break;
          case "library_admin":
            navigate("/library-admin", { replace: true });
            break;
          case "driver":
            navigate("/driver", { replace: true });
            break;
          case "teacher":
            navigate("/faculty", { replace: true });
            break;
          case "student":
            navigate("/dashboard", { replace: true });
            break;
          case "placement_officer":
            navigate("/sync-access-restricted", { replace: true });
            break;
          default:
            setPage("login");
        }
      }
    } else {
      setPage("login");
    }
  }, [isInitializing, isAuthenticated, role, authUser, navigate]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-semibold">Checking authorization...</div>
        </div>
      </div>
    );
  }

  // Authentication pages
  if (!isAuthenticated && ["login", "otp", "forgot-password", "reset-password"].includes(page)) {
    const renderAuthPage = () => {
      switch (page) {
        case "login":
          return <LoginWrapper setRole={setRoleState} setPage={setPage} setUser={setUserState} />;
        case "otp":
          return <OTPPage setRole={setRoleState} setPage={setPage} setUser={setUserState} />;
        case "forgot-password":
          return isMobile ? <ForgotPasswordMobile setPage={setPage} /> : <ForgotPasswordFlow setPage={setPage} />;
        case "reset-password":
          return <ResetPassword setPage={setPage} />;
        default:
          return null;
      }
    };

    return (
      <div className={isMobile ? "relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-violet-600 via-violet-800 to-violet-950" : "w-full"}>
        {isMobile && (
          <>
            <div className="absolute w-[360px] h-[360px] bg-violet-500/30 blur-[72px] rounded-full top-[-100px] left-[-80px] z-0 pointer-events-none" />
            <div className="absolute w-[360px] h-[360px] bg-violet-400/30 blur-[72px] rounded-full bottom-[-80px] right-[-80px] z-0 pointer-events-none" />
          </>
        )}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: isMobile ? 100 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isMobile ? -100 : 0 }}
            transition={{ 
              duration: 0.4,
              ease: [0.25, 1, 0.5, 1]
            }}
            style={{ 
              width: "100%", 
              willChange: "transform, opacity",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              perspective: 1000,
              WebkitPerspective: 1000
            }}
          >
            {renderAuthPage()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // If still loading or redirecting, show loading
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-lg font-semibold">Loading...</div>
      </div>
    </div>
  );
};

export default Index;