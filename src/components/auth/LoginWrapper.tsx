import Login from "./Login";
import LoginMobile from "./LoginMobile";
import { useEffect, useState } from "react";

interface LoginWrapperProps {
  setRole: (role: string) => void;
  setPage: (page: string) => void;
  setUser: (user: any) => void;
}

const LoginWrapper = ({ setRole, setPage, setUser }: LoginWrapperProps) => {
  // Detect mobile on first render (prevents flicker)
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150); // Debounce 150ms
    };

    // Only add listener if window exists
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
      clearTimeout(resizeTimeout);
    };
  }, []);

  // No null check needed - isMobile has initial value
  return isMobile ? (
    <LoginMobile setRole={setRole} setPage={setPage} setUser={setUser} />
  ) : (
    <Login setRole={setRole} setPage={setPage} setUser={setUser} />
  );
};

export default LoginWrapper;