import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Settings, ShieldCheck, Key, HelpCircle, CheckCircle, ExternalLink, Globe, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

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
      // Direct user profile call yields org details, or custom profile endpoints
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
        // Redirect browser to Google Consent Screen
        window.location.href = data.authorization_url;
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
      logger.error("Connection failed:", err);
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
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      {/* Overview Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Google Workspace Integration</h1>
          <p className="text-muted-foreground text-sm mt-1">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Wizard Instructions */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              How to Get API Credentials
            </CardTitle>
            <CardDescription>
              Follow these simple steps in Google Cloud Console to set up your keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold flex items-center gap-1.5">
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
                <p className="text-muted-foreground text-xs mt-0.5">
                  Create a new project or select an existing one under your college's Workspace organization.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                2
              </span>
              <div>
                <p className="font-semibold">Enable Required APIs</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Navigate to <strong>APIs & Services &gt; Library</strong>, search for <strong>Google Calendar API</strong>, and click **Enable**.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                3
              </span>
              <div>
                <p className="font-semibold">Configure OAuth Consent Screen</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Go to <strong>OAuth Consent Screen</strong>. Choose **Internal** (if restricted to your college domain) or **External**. Set the scope to `.../auth/calendar.events` (Calendar Events access).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                4
              </span>
              <div>
                <p className="font-semibold">Create Credentials (Web Application)</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Go to <strong>Credentials &gt; Create Credentials &gt; OAuth Client ID</strong>. Set application type to **Web Application**.
                </p>
                <div className="mt-2 p-2.5 rounded bg-muted/50 border text-xs">
                  <p className="font-mono font-semibold text-muted-foreground">Authorized Redirect URI:</p>
                  <code className="text-primary font-mono select-all block mt-0.5 break-all">
                    https://campus.stalight.in/api/integrations/google/callback/
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Submission Form */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Configure Credentials
            </CardTitle>
            <CardDescription>
              Link your college credentials safely.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleConnect}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Google Client ID</label>
                <Input
                  type="text"
                  placeholder="234123-abc.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Google Client Secret</label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder="••••••••••••••••••••"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="font-mono text-xs pr-10"
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
                <div className="p-3.5 rounded-lg border bg-blue-50/50 text-blue-900 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 text-xs leading-relaxed space-y-1.5 mt-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    Integration Active
                  </p>
                  <p className="text-muted-foreground">
                    Connected with Client ID: <code className="block font-mono select-all text-xs truncate mt-0.5">{activeClientId}</code>
                  </p>
                  <p className="text-[10px] text-muted-foreground italic leading-tight mt-1.5">
                    To link a different developer account or revoke access, input the new credentials and re-connect.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-0">
              <Button type="submit" disabled={isLoading} className="w-full text-xs h-10 font-semibold shadow hover:scale-[1.01] transition-transform">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  "Connect Google Account"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default GoogleSetup;
