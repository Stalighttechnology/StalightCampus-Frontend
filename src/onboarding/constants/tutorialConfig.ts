export const TUTORIAL_CONFIG = {
  ROUTE_TIMEOUT_MS: 4000,
  POLL_INTERVAL_MS: 100,
  SELECTOR_RETRY_TIMEOUT_MS: 2000,
  MAX_SELECTOR_RETRIES: 20,
  SCROLL_OFFSET_MOBILE: 60,
  SCROLL_OFFSET_DESKTOP: 120,
  MOBILE_MAX_WIDTH: 768,
  SCREEN_READER_ANNOUNCE_DELAY_MS: 150,
};

/**
 * Bump this number when the tour content changes significantly.
 * Any user whose stored onboarding version is lower than this value
 * will see the welcome modal exactly once more after upgrading.
 */
export const CURRENT_TOUR_VERSION = 1;
