import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Settings, ShieldCheck, Key, HelpCircle, CheckCircle, ExternalLink, Globe, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface GoogleSetupProps {
  setError: (error: string | null) => void;
  toast: any;
}

const GoogleSetup: React.FC<GoogleSetupProps> = ({ setError, toast }) => {
  const { theme } = useTheme();
  const location = useLocation();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeClientId, setActiveClientId] = useState("");

  // Parse URL search params to show feedback if redirected back from Google callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get("success");
    const errorParam = params.get("error");

    if (success === "true") {
      toast({
        title: "Integration Successful",
        description: "Your college's Google Workspace has been successfully connected!",
        variant: "default",
      });
    } else if (success === "false" || errorParam) {
      toast({
        title: "Connection Failed",
        description: `Google OAuth connection failed: ${errorParam || "Unknown error"}`,
        variant: "destructive",
      });
      setError(errorParam || "Failed to link Google account.");
    }

    // Fetch existing settings
    fetchGoogleSettings();
  }, [location.search]);

  const fetchGoogleSettings = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/`);
      const data = await response.json();
      if (response.ok && data?.org) {
        if (data.org.google_client_id) {
          setIsConnected(true);
          setActiveClientId(data.org.google_client_id);
          setClientId(data.org.google_client_id);
        }
      }
    } catch (err) {
      console.error("Failed to load Google settings:", err);
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !clientSecret) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter both Google Client ID and Google Client Secret.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/connect/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          google_client_id: clientId,
          google_client_secret: clientSecret,
        }),
      });

      const data = await response.json();

      if (response.ok && data.authorization_url) {
        toast({
          title: "Redirecting...",
          description: "Redirecting you to Google to authorize Calendar access.",
        });
        const isNative = Capacitor.isNativePlatform();
        if (isNative) {
          // Note: Here we don't pass ?source=app if we expect GoogleSetup to be used primarily on Web/Admin, 
          // but just in case it's used on native admin app, we can handle it if we want.
          // Wait, the backend only parses source from /connect/ GET request, not POST.
          // In GoogleSetup, we POST to /connect/. Let's leave source out and just use Browser.open.
          // Or wait, if we use Browser.open without ?source=app, the callback will redirect to FRONTEND_URL.
          // Which won't trigger stalightcampus:// deep link, so the browser won't close automatically unless App Links are set.
          // Actually, we can just use Browser.open.
          Browser.open({ url: data.authorization_url });
        } else {
          window.location.href = data.authorization_url;
        }
      } else {
        const errorMsg = data.error || "Failed to acquire Google authorization URL.";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Connection failed:", err);
      setError("Network error while connecting to Google. Please check your network and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full mx-auto">
      <Card className={`shadow-md ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className={`text-lg sm:text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Google Workspace Integration</CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} mt-1`}>
                Configure calendar events and automated Google Meet generation for online classes.
              </p>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-500 animate-pulse" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 text-xs font-semibold">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                Integration Not Connected
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Setup Wizard Instructions */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  How to Get API Credentials
                </h3>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Follow these simple steps in Google Cloud Console to set up your keys.
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <div className="flex gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    1
                  </span>
                  <div>
                    <p className={`font-semibold flex items-center gap-1.5 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Access Google Cloud Console
                      <a
                        href="https://console.cloud.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5 text-xs inline-flex"
                      >
                        Console Link <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Create a new project or select an existing one under your college's Workspace organization.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    2
                  </span>
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Enable Required APIs</p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Navigate to <strong>APIs & Services &gt; Library</strong>, search for <strong>Google Calendar API</strong>, and click **Enable**.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    3
                  </span>
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Configure OAuth Consent Screen</p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Go to <strong>OAuth Consent Screen</strong>. Choose **Internal** (if restricted to your college domain) or **External**. Set the scope to `.../auth/calendar.events` (Calendar Events access).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${theme === 'dark' ? 'bg-primary/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    4
                  </span>
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Create Credentials (Web Application)</p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Go to <strong>Credentials &gt; Create Credentials &gt; OAuth Client ID</strong>. Set application type to **Web Application**.
                    </p>
                    <div className={`mt-2 p-2.5 rounded border text-xs ${theme === 'dark' ? 'bg-muted/30 border-border' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`font-mono font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Authorized Redirect URI:</p>
                      <code className="text-primary font-mono select-all block mt-0.5 break-all">
                        https://campus.stalight.in/api/integrations/google/callback/
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Submission Form */}
            <div className={`p-4 sm:p-6 rounded-xl border flex flex-col justify-between ${theme === 'dark' ? 'bg-card/50 text-foreground border-border' : 'bg-gray-50/50 text-gray-900 border-gray-200'}`}>
              <form onSubmit={handleConnect} className="space-y-4 flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      <Key className="w-5 h-5 text-amber-500" />
                      Configure Credentials
                    </h3>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Link your college credentials safely.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Google Client ID</label>
                    <Input
                      type="text"
                      placeholder="234123-abc.apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className={`font-mono text-xs ${theme === 'dark' ? 'bg-background text-foreground border-border focus:ring-primary/30' : 'bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Google Client Secret</label>
                    <div className="relative">
                      <Input
                        type={showSecret ? "text" : "password"}
                        placeholder="••••••••••••••••••••"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        className={`font-mono text-xs pr-10 ${theme === 'dark' ? 'bg-background text-foreground border-border focus:ring-primary/30' : 'bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {showSecret ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {isConnected && (
                    <div className={`p-3.5 rounded-lg border text-xs leading-relaxed space-y-1.5 mt-2 ${theme === 'dark' ? 'bg-blue-955/20 text-blue-400 border-blue-900/40' : 'bg-blue-50/50 text-blue-900 border-blue-200'}`}>
                      <p className="font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        Integration Active
                      </p>
                      <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                        Connected with Client ID: <code className="block font-mono select-all text-xs truncate mt-0.5">{activeClientId}</code>
                      </p>
                      <p className="text-[10px] text-muted-foreground italic leading-tight mt-1.5">
                        To link a different developer account or revoke access, input the new credentials and re-connect.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={isLoading} className="w-full text-xs h-10 font-semibold shadow hover:scale-[1.01] transition-transform bg-primary text-white hover:bg-primary/90">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      "Connect Google Account"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleSetup;
