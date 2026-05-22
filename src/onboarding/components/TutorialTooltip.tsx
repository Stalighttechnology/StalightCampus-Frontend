import { useEffect, useState } from 'react';
import { TooltipRenderProps } from 'react-joyride';

interface TutorialTooltipProps extends TooltipRenderProps {
  tooltipProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const TutorialTooltip = (props: TutorialTooltipProps) => {
  const {
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    size,
    isLastStep,
    tooltipProps,
  } = props;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.log('[ONBOARDING DEBUG] 🛠️ TutorialTooltip rendered with props:', {
    index,
    size,
    isLastStep,
    stepTitle: step?.title,
    isMobile,
  });

  if (isMobile) {
    return (
      <div
        {...tooltipProps}
        className="mobile-bottom-sheet fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-slate-900 border-t border-purple-200 dark:border-purple-900 shadow-[0_-8px_30px_rgb(0,0,0,0.15)] p-6 z-[99999] flex flex-col gap-4"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          top: 'auto',
          transform: 'none',
          width: '100%',
          maxWidth: '100%',
          maxHeight: '240px',
          borderRadius: '24px 24px 0 0',
          boxSizing: 'border-box',
        }}
      >
        {/* Header & Title */}
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-purple-600 dark:text-purple-400 m-0 leading-tight">
            {step.title}
          </h3>
          <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
            {index} of {size - 1}
          </span>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70px] pr-1">
          <p className="text-[15px] text-slate-700 dark:text-slate-300 m-0 leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center gap-3 mt-1">
          <button
            {...skipProps}
            className="flex-1 h-11 text-[15px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center justify-center border border-slate-200 dark:border-slate-800"
          >
            Skip
          </button>
          
          {index > 1 && (
            <button
              {...backProps}
              className="h-11 px-4 text-[15px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center justify-center border border-slate-200 dark:border-slate-800"
            >
              Back
            </button>
          )}

          <button
            {...primaryProps}
            className="flex-1 h-11 text-[15px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition flex items-center justify-center shadow-lg shadow-purple-600/20"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  // Desktop Tooltip UI
  return (
    <div
      {...tooltipProps}
      className="rounded-2xl shadow-2xl bg-white dark:bg-slate-800 backdrop-blur-md border border-purple-200 dark:border-purple-700 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
        <h3 className="text-white font-semibold text-lg m-0">{step.title}</h3>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <p className="text-slate-700 dark:text-slate-300 text-sm m-0">
          {step.content}
        </p>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Step {index} of {size - 1}
        </span>

        <div className="flex gap-2">
          {!isLastStep && index > 1 && (
            <button
              {...backProps}
              className={(backProps.className || '') + ' px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition'}
            >
              Back
            </button>
          )}

          <button
            {...skipProps}
            className={(skipProps.className || '') + ' px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition'}
          >
            Skip Tour
          </button>

          <button
            {...primaryProps}
            className={(primaryProps.className || '') + ' px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition'}
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
