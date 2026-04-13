import { isInAppBrowser } from "./browser";

export interface ExternalLinkOptions {
  url: string;
  delay?: number;
}

const DEFAULT_DELAY_MS = 80;
const DEBOUNCE_MS = 500;

let lastNavigationTime = 0;

function isLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("linkedin.com");
  } catch {
    return false;
  }
}

export function normalizeLinkedInUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Force HTTPS
    parsed.protocol = "https:";

    // Add cache-bust param to prevent WebView redirect caching
    parsed.searchParams.set("_t", String(Date.now()));

    return parsed.toString();
  } catch {
    return url;
  }
}

export function openExternalLink({
  url,
  delay = DEFAULT_DELAY_MS,
}: ExternalLinkOptions): void {
  const now = Date.now();
  if (now - lastNavigationTime < DEBOUNCE_MS) return;
  lastNavigationTime = now;

  const finalUrl = isLinkedInUrl(url) ? normalizeLinkedInUrl(url) : url;

  if (isInAppBrowser()) {
    // In-app browsers: avoid target="_blank" and window.open entirely.
    // Use location.assign with a small delay to prevent WebView race conditions.
    setTimeout(() => {
      window.location.assign(finalUrl);
    }, delay);
  } else {
    // Standard browsers: open in new tab, fallback to assign
    const newWindow = window.open(finalUrl, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      window.location.assign(finalUrl);
    }
  }
}
