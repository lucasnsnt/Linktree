export type BrowserEnvironment =
  | "instagram"
  | "facebook"
  | "twitter"
  | "tiktok"
  | "generic-webview"
  | "standard";

const IN_APP_PATTERNS: Record<
  Exclude<BrowserEnvironment, "standard" | "generic-webview">,
  RegExp
> = {
  instagram: /\bInstagram\b/i,
  facebook: /\bFBAN\b|\bFBAV\b/i,
  twitter: /\bTwitter\b/i,
  tiktok: /\bBytedanceWebview\b|\bTikTok\b/i,
};

const GENERIC_WEBVIEW_PATTERN = /\bwv\b|\bWebView\b/i;

let cachedEnvironment: BrowserEnvironment | null = null;

export function detectBrowserEnvironment(): BrowserEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  const ua = navigator.userAgent;

  for (const [env, pattern] of Object.entries(IN_APP_PATTERNS)) {
    if (pattern.test(ua)) {
      cachedEnvironment = env as BrowserEnvironment;
      return cachedEnvironment;
    }
  }

  if (GENERIC_WEBVIEW_PATTERN.test(ua)) {
    cachedEnvironment = "generic-webview";
    return cachedEnvironment;
  }

  cachedEnvironment = "standard";
  return cachedEnvironment;
}

export function isInAppBrowser(): boolean {
  return detectBrowserEnvironment() !== "standard";
}
