import { useState, ReactNode } from 'react';
import { contextualStorage } from '../utils/contextualStorage';

interface ContextualTipProps {
  storageKey: string;
  title: string;
  content: string;
  children: ReactNode;
}

export const ContextualTip = ({
  storageKey,
  title,
  content,
  children,
}: ContextualTipProps) => {
  const [showPopover, setShowPopover] = useState(
    !contextualStorage.hasVisited(storageKey)
  );
  const [showBeacon, setShowBeacon] = useState(
    !contextualStorage.hasVisited(storageKey)
  );

  const handleBeaconClick = () => {
    setShowPopover(true);
  };

  const handleDismiss = () => {
    contextualStorage.markVisited(storageKey);
    setShowPopover(false);
    setShowBeacon(false);
  };

  return (
    <div className="relative">
      {showBeacon && (
        <div className="absolute -top-2 -right-2 z-50">
          <button
            onClick={handleBeaconClick}
            className="relative w-4 h-4 bg-purple-500 rounded-full animate-pulse hover:scale-110 transition-transform"
            title={title}
          >
            <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping" />
          </button>
        </div>
      )}

      {showPopover && (
        <div className="absolute top-0 right-0 transform translate-x-full ml-4 z-50 w-64">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-purple-200 dark:border-purple-700 p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-purple-600 dark:text-purple-400">
                {title}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              {content}
            </p>
            <button
              onClick={handleDismiss}
              className="w-full px-3 py-2 text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
