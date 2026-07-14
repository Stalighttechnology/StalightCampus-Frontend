import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "../../utils/sweetalert";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useTheme } from "../../context/ThemeContext";

const GoogleLogo = ({ className = "w-4 h-4 mr-2 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

export default function GoogleIntegrationTab() {
  const { theme } = useTheme();
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<{name: string, email: string, picture: string} | null>(null);

  useEffect(() => {
    setGoogleConnectLoading(true);
    fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/status/`)
      .then(res => res.json())
      .then(data => {
        if (data.connected !== undefined) setGoogleConnected(data.connected);
        if (data.google_email) {
          setGoogleUserInfo({
            email: data.google_email,
            name: data.name || data.google_email,
            picture: data.picture || ""
          });
        }
      })
      .catch(err => console.error("Failed to fetch google status", err))
      .finally(() => setGoogleConnectLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className={`flex flex-col p-4 sm:p-5 border rounded-lg ${theme === 'dark' ? 'bg-card border-input' : 'bg-white border-gray-200 shadow-sm'}`}>
        
        {/* Top Section: App Info */}
        <div className="flex flex-col sm:flex-row items-start gap-4 w-full min-w-0">
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-accent/50' : 'bg-gray-50 border border-gray-100'}`}>
            <GoogleLogo className="w-7 h-7" />
          </div>
          <div className="flex-1 w-full min-w-0 space-y-1">
            <h4 className="text-base font-semibold text-foreground">Google Account</h4>
            <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Connect your Google account to automatically generate Meet links for your online classes and meetings.
            </p>
            
            {/* Connect Button (Only if not connected) */}
            {!googleConnected && (
              <div className="pt-3 w-full">
                {googleConnectLoading ? (
                  <Button disabled variant="outline">Loading...</Button>
                ) : (
                  <Button
                    className={`w-full sm:w-auto font-medium shadow-sm transition-colors border whitespace-normal sm:whitespace-nowrap h-auto sm:h-9 py-2.5 sm:py-0 ${theme === 'dark' ? 'bg-[#131314] hover:bg-[#1e1e20] text-[#e3e3e3] border-[#8e918f]' : 'bg-white hover:bg-[#f8f9fa] text-[#3c4043] border-[#747775]'}`}
                    onClick={async () => {
                      try {
                        const isNative = Capacitor.isNativePlatform();
                        const sourceQuery = isNative ? `?source=app&t=${Date.now()}` : `?t=${Date.now()}`;
                        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/connect/${sourceQuery}`);
                        const data = await res.json();
                        if (data.authorization_url) {
                           if (isNative) {
                            await Browser.open({ url: data.authorization_url });
                          } else {
                            window.location.href = data.authorization_url;
                          }
                        } else {
                          showErrorAlert('Error', 'Failed to initiate Google connection.');
                        }
                      } catch (e) {
                        showErrorAlert('Error', 'An error occurred.');
                      }
                    }}
                  >
                    <GoogleLogo className="w-4 h-4 mr-2" />
                    Connect Google Account
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Connected Account Info */}
        {googleConnected && (
          <>
            <div className={`my-5 border-t ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`} />
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-accent/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {googleUserInfo ? (
                  <>
                    <Avatar className="h-10 w-10 border shadow-sm">
                      {googleUserInfo.picture ? (
                        <AvatarImage src={googleUserInfo.picture} alt={googleUserInfo.name} referrerPolicy="no-referrer" />
                      ) : (
                        <AvatarFallback className="text-sm font-medium">{googleUserInfo.name?.[0] || googleUserInfo.email?.[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col leading-tight gap-0.5">
                      <span className="text-sm font-semibold text-foreground">{googleUserInfo.name}</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{googleUserInfo.email}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col leading-tight gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Account Connected</span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Unable to fetch account details. The token may have expired.</span>
                  </div>
                )}
              </div>
              <div className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto text-red-500 border-red-500 hover:bg-red-50"
                  onClick={async () => {
                    const confirmResult = await showConfirmAlert(
                      "Disconnect Google Account?",
                      "Are you sure you want to disconnect? You will no longer be able to automatically generate Meet links.",
                      "Yes, disconnect"
                    );
                    if (!confirmResult.isConfirmed) return;

                    try {
                      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/integrations/google/disconnect/`, { method: 'POST' });
                      if (res.ok) {
                        setGoogleConnected(false);
                        showSuccessAlert('Disconnected', 'Your Google account has been disconnected.');
                      } else {
                        showErrorAlert('Error', 'Failed to disconnect Google account.');
                      }
                    } catch (e) {
                      showErrorAlert('Error', 'An error occurred.');
                    }
                  }}
                >
                  <GoogleLogo className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
