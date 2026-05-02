import { useState, useEffect } from "react";
import useIsMobile from "../../hooks/useIsMobile";
import { useNavigate } from "react-router-dom";
import LoginWrapper from "../auth/LoginWrapper";
import OTPPage from "../auth/OTPPage";
import ForgotPasswordFlow from "../auth/ForgotPasswordFlow";
import ForgotPasswordMobile from "../auth/ForgotPasswordMobile";
import ResetPassword from "../auth/ResetPassword";
import { startTokenRefresh, stopTokenRefresh } from "../../utils/authService";
import { ThemeProvider } from "../../context/ThemeContext";

const Index = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(localStorage.getItem("role"));
  const [page, setPage] = useState<string>("login");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkAuthAndRedirect = () => {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");
      
      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setRole(parsedUser.role);
          
          // Only redirect if we're not already on a dashboard route
          const currentPath = window.location.pathname;
          const isOnDashboard = currentPath.startsWith('/admin') || 
                               currentPath.startsWith('/hod') || 
                               currentPath.startsWith('/faculty') || 
                               currentPath.startsWith('/fees-manager') ||
                               currentPath.startsWith('/hms') ||
                               currentPath.startsWith('/warden') ||
                               currentPath.startsWith('/dashboard') ||
                               currentPath.startsWith('/timetable') ||
                               currentPath.startsWith('/attendance') ||
                               currentPath.startsWith('/marks') ||
                               currentPath.startsWith('/leave-request') ||
                               currentPath.startsWith('/leave-status') ||
                               currentPath.startsWith('/fees') ||
                               currentPath.startsWith('/profile') ||
                               currentPath.startsWith('/announcements') ||
                               currentPath.startsWith('/chat') ||
                               currentPath.startsWith('/notifications') ||
                               currentPath.startsWith('/face-recognition') ||
                               currentPath.startsWith('/student-study-material') ||
                               currentPath.startsWith('/student-assignment');
          
          if (!isOnDashboard) {
            // Redirect to appropriate dashboard based on role
            switch (parsedUser.role) {
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
              case "teacher":
                navigate("/faculty", { replace: true });
                break;
              case "student":
                navigate("/dashboard", { replace: true });
                break;
              default:
                setPage("login");
                setIsLoading(false);
            }
          } else {
            // Already on dashboard, just start token refresh
            startTokenRefresh();
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.clear();
          stopTokenRefresh();
          setPage("login");
          setIsLoading(false);
        }
      } else {
        localStorage.clear();
        stopTokenRefresh();
        setPage("login");
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl font-semibold">Loading...</div>
      </div>
    );
  }

  // Authentication pages
  if (page === "login") return <LoginWrapper setRole={setRole} setPage={setPage} setUser={setUser} />;
  if (page === "otp") return <OTPPage setRole={setRole} setPage={setPage} setUser={setUser} />;
  if (page === "forgot-password") {
    return isMobile ? (
      <ForgotPasswordMobile setPage={setPage} />
    ) : (
      <ForgotPasswordFlow setPage={setPage} />
    );
  }
  if (page === "reset-password") return <ResetPassword setPage={setPage} />;

  // If still loading or redirecting, show loading
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-2xl font-semibold">Loading...</div>
    </div>
  );
};

export default Index;