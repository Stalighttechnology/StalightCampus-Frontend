import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useLoginLogic } from "../../hooks/useLoginLogic";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { NavigationBar } from "@capgo/capacitor-navigation-bar";

interface LoginMobileProps {
  setRole: (role: string) => void;
  setPage: (page: string) => void;
  setUser: (user: any) => void;
}

const LoginMobile = ({ setRole, setPage, setUser }: LoginMobileProps) => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { });
      StatusBar.setStyle({ style: Style.Dark }).catch(() => { });
      NavigationBar.setNavigationBarColor({
        color: '#1e1b4b',
        darkButtons: false
      }).catch(() => { });
    }
  }, []);

  const {
    username,
    setUsername,
    password,
    setPassword,
    error,
    loading,
    showPassword,
    setShowPassword,
    handleLogin,
    handleForgotPassword,
  } = useLoginLogic({ setRole, setPage, setUser });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] overflow-x-hidden overflow-y-auto flex flex-col w-full bg-transparent relative">
      {/* HEADER */}
      <div className="text-center space-y-0.5 pt-4 pb-2 min-h-[700px]:pt-7 min-h-[700px]:pb-4 shrink-0 px-4">
        <p className="text-white text-xs min-h-[700px]:text-sm font-medium opacity-90">Welcome to</p>
        <h1 className="text-white text-lg min-h-[700px]:text-xl font-extrabold">STALIGHT CAMPUS</h1>
        <p className="text-white text-[10px] min-h-[700px]:text-xs opacity-80">Login to access your Campus portal</p>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col justify-between px-4 max-w-sm w-full mx-auto py-1.5 min-h-[700px]:py-3">
        <div className="flex flex-col gap-2 min-h-[700px]:gap-4">
          {/* ILLUSTRATION CARD */}
          <div className="w-full bg-[#EDE9FE] border border-white/40 rounded-2xl flex items-center justify-center h-[16vh] min-h-[90px] max-h-[130px] min-h-[700px]:h-[20vh] min-h-[700px]:min-h-[120px] min-h-[700px]:max-h-[180px] mb-1 overflow-hidden">
            <img
              src="/image.png"
              alt="classroom"
              className="w-full h-full object-cover"
            />
          </div>

          {/* LOGIN CARD */}
          <div className="w-full bg-[#F9FAFB] rounded-2xl shadow-md p-4 min-h-[700px]:p-5 transition-all duration-300 hover:shadow-lg">
            {/* Card Header */}
            <div className="mb-2 min-h-[700px]:mb-3">
              <h2 className="text-center text-gray-700 text-base min-h-[700px]:text-lg font-semibold">Login</h2>
              <p className="text-center text-gray-400 text-xs min-h-[700px]:text-sm mt-0.5 min-h-[700px]:mt-1">Sign in to access your account</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-xs text-center py-1.5 px-3 rounded-lg mb-2 min-h-[700px]:mb-3 border border-red-100">
                {error}
              </div>
            )}

            {/* Form Section */}
            <div className="space-y-2.5 min-h-[700px]:space-y-3">
              {/* Username Field */}
              <div>
                <label className="text-xs min-h-[700px]:text-sm text-gray-500 mb-0.5 min-h-[700px]:mb-1 block">Username</label>
                <div className={`flex items-center gap-3 bg-slate-50 border ${error ? 'border-red-300' : 'border-slate-200'} rounded-xl h-11 min-h-[700px]:h-14 px-4`}>
                  <User className={`w-4 h-4 min-h-[700px]:w-5 min-h-[700px]:h-5 ${error ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter username"
                    disabled={loading}
                    className="flex-1 border-none bg-transparent focus:outline-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-sm min-h-[700px]:text-base"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="text-xs min-h-[700px]:text-sm text-gray-500 mb-0.5 min-h-[700px]:mb-1 block">Password</label>
                <div className={`flex items-center gap-3 bg-slate-50 border ${error ? 'border-red-300' : 'border-slate-200'} rounded-xl h-11 min-h-[700px]:h-14 px-4 relative`}>
                  <Lock className={`w-4 h-4 min-h-[700px]:w-5 min-h-[700px]:h-5 ${error ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter password"
                    disabled={loading}
                    className="flex-1 border-none bg-transparent focus:outline-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-sm min-h-[700px]:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-slate-400'} disabled:opacity-50 cursor-pointer ml-2`}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 min-h-[700px]:w-5 min-h-[700px]:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 min-h-[700px]:w-5 min-h-[700px]:h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right mt-0.5 min-h-[700px]:mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-[11px] min-h-[700px]:text-xs text-purple-600 hover:text-purple-700 hover:underline disabled:opacity-50 cursor-pointer transition-colors duration-200"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white font-semibold text-sm shadow-lg shadow-purple-500/20 mt-1.5 min-h-[700px]:mt-2 hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-70 cursor-pointer flex items-center justify-center"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-white text-[10px] min-h-[700px]:text-[11px] pb-2 min-h-[700px]:pb-4 mt-1 min-h-[700px]:mt-2">
          <p className="font-semibold opacity-90">Smart campus better learning</p>
          <p className="opacity-80">Developed by Stalight Technologies Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginMobile;