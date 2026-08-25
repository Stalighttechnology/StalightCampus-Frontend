import React from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

interface MandatoryUpdateScreenProps {
  storeUrl: string;
}

export const MandatoryUpdateScreen: React.FC<MandatoryUpdateScreenProps> = ({ storeUrl }) => {
  const handleUpdate = async () => {
    if (Capacitor.isNativePlatform()) {
      if (storeUrl) {
        await Browser.open({ url: storeUrl });
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
      
      <h2 className="text-3xl font-bold mb-4 tracking-tight">Update Required</h2>
      
      <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
        A new version of Stalight Campus is required. Please update the app to continue.
      </p>
      
      <button
        onClick={handleUpdate}
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 rounded-md font-semibold text-lg w-full max-w-sm transition-colors shadow-sm"
      >
        Update Now
      </button>
    </div>
  );
};
