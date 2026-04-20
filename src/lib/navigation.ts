import { isInAppBrowser } from "./browser";

export interface ExternalLinkOptions {
  url: string;
  delay?: number;
  target?: string;
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

  
    parsed.protocol = "https:";

    
    parsed.searchParams.set("_t", String(Date.now()));

    return parsed.toString();
  } catch {
    return url;
  }
}

export function openExternalLink({
  url,
  delay = DEFAULT_DELAY_MS,
  target,
}: ExternalLinkOptions): void {
  const now = Date.now();
  if (now - lastNavigationTime < DEBOUNCE_MS) return;
  lastNavigationTime = now;

  const finalUrl = isLinkedInUrl(url) ? normalizeLinkedInUrl(url) : url;

  if (isInAppBrowser()) {
    
    setTimeout(() => {
      window.location.assign(finalUrl);
    }, delay);
  } else if (target === "_self") {
    setTimeout(() => {
      window.location.assign(finalUrl);
    }, delay);
  } else {
    
    window.open(finalUrl, "_blank");
  }
}
