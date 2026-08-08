declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires the X (Twitter) Ads "signup" conversion event. Call this only at the
 * point a new account has actually been created — this function fires
 * unconditionally whenever called, it does not itself judge success.
 */
export function trackXSignupConversion(): void {
  if (typeof window === "undefined" || typeof window.twq !== "function") return;
  window.twq("event", "tw-rd8dx-rea1z", {});
}
