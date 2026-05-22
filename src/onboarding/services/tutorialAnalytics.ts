interface TourEvent {
  role: string;
  event: 'started' | 'completed' | 'skipped' | 'step_viewed' | 'restarted';
  stepIndex?: number;
  timestamp: string;
  duration?: number;
}

const ANALYTICS_KEY = 'tutorial_analytics_log';

export const tutorialAnalytics = {
  track(event: TourEvent) {
    const log = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    log.push(event);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(log));
  },

  trackTourStart(role: string) {
    this.track({
      role,
      event: 'started',
      timestamp: new Date().toISOString(),
    });
  },

  trackTourComplete(role: string) {
    this.track({
      role,
      event: 'completed',
      timestamp: new Date().toISOString(),
    });
  },

  trackTourSkip(role: string) {
    this.track({
      role,
      event: 'skipped',
      timestamp: new Date().toISOString(),
    });
  },

  trackStepView(role: string, stepIndex: number) {
    this.track({
      role,
      event: 'step_viewed',
      stepIndex,
      timestamp: new Date().toISOString(),
    });
  },

  getLog(): TourEvent[] {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
  },
};
