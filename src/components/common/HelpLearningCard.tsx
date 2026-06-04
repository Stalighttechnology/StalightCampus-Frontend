/**
 * HelpLearningCard.tsx
 *
 * Shared "Help & Learning" section rendered inside Profile pages.
 * Dispatches the stalightcampus_restart_tour CustomEvent, which TutorialController
 * intercepts to perform a full route-safe tour restart from ANY page.
 *
 * Usage:
 *   import HelpLearningCard from './HelpLearningCard';
 *   <HelpLearningCard />
 *
 * No props required — self-contained and theme-aware.
 */
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const HelpLearningCard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleRestartTour = () => {
    window.dispatchEvent(
      new CustomEvent('stalightcampus_restart_tour', {
        detail: { source: 'profile' },
      })
    );
  };

  return (
    <div
      id="help-learning-card"
      className={`
        mt-6 rounded-2xl border p-5 sm:p-6
        transition-colors duration-200
        ${isDark
          ? 'bg-card border-border'
          : 'bg-gradient-to-br from-violet-50/60 via-purple-50/40 to-indigo-50/60 border-violet-200/60'}
      `}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 sm:gap-4 mb-4">
        {/* Icon badge */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-sm
            ${isDark
              ? 'bg-violet-900/50 text-violet-300'
              : 'bg-violet-100 text-violet-600'}
          `}
          aria-hidden="true"
        >
          🎓
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`
              text-sm sm:text-base font-semibold leading-snug
              ${isDark ? 'text-foreground' : 'text-gray-900'}
            `}
          >
            Help &amp; Learning
          </h3>
          <p
            className={`
              mt-0.5 text-xs sm:text-sm leading-relaxed
              ${isDark ? 'text-muted-foreground' : 'text-gray-500'}
            `}
          >
            Revisit the StalightCampus product tour to understand platform features again.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        className={`
          h-px mb-4
          ${isDark ? 'bg-border' : 'bg-violet-200/50'}
        `}
      />

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['Interactive walkthrough', 'Step-by-step', 'All features covered'].map((tag) => (
          <span
            key={tag}
            className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${isDark
                ? 'bg-violet-900/40 text-violet-300 border border-violet-800/40'
                : 'bg-violet-100 text-violet-700 border border-violet-200/60'}
            `}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA Button */}
      <button
        id="profile-retake-tour-btn"
        type="button"
        onClick={handleRestartTour}
        aria-label="Take the StalightCampus product tour again"
        className={`
          inline-flex items-center gap-2
          px-4 py-2.5 sm:px-5 sm:py-3
          rounded-xl text-sm sm:text-sm font-semibold
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
          active:scale-95
          ${isDark
            ? 'bg-violet-700 hover:bg-violet-600 text-white shadow-md hover:shadow-violet-700/30'
            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-violet-500/30'}
        `}
      >
        {/* Play icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        Take Product Tour Again
      </button>
    </div>
  );
};

export default HelpLearningCard;
