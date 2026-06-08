import { useEffect, useState } from "react";

const CACHE_KEY = "gh_last_activity_iso";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const RECENT_COMMIT_WINDOW_MS = 2 * 60 * 60 * 1000;

interface CacheEntry {
  timestamp: number;
  value: string | null; // ISO 8601 do evento mais recente, ou null
}

interface GitHubEvent {
  type?: string;
  created_at?: string;
}

function getCached(): string | null | undefined {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return undefined;
    }
    return entry.value;
  } catch {
    return undefined;
  }
}

function setCache(value: string | null): void {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), value };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage pode estar indisponível (modo privado restrito)
  }
}

function hasRecentCommitFromIso(isoString: string): boolean {
  const diffMs = Date.now() - new Date(isoString).getTime();
  return diffMs >= 0 && diffMs <= RECENT_COMMIT_WINDOW_MS;
}

export interface GitHubActivityState {
  hasRecentCommit: boolean;
  lastCommitAt: string | null;
  isLoading: boolean;
}

export function useGitHubActivity(): GitHubActivityState {
  const [state, setState] = useState<GitHubActivityState>({
    hasRecentCommit: false,
    lastCommitAt: null,
    isLoading: true,
  });

  useEffect(() => {
    const cached = getCached();
    if (cached !== undefined) {
      setState({
        hasRecentCommit: cached ? hasRecentCommitFromIso(cached) : false,
        lastCommitAt: cached,
        isLoading: false,
      });
      return;
    }

    const controller = new AbortController();

    async function fetchActivity() {
      try {
        const res = await fetch(
          "https://api.github.com/users/lucasnsnt/events/public?per_page=30",
          { signal: controller.signal }
        );

        if (!res.ok) {
          setCache(null);
          setState({ hasRecentCommit: false, lastCommitAt: null, isLoading: false });
          return;
        }

        const events = (await res.json()) as GitHubEvent[];
        if (!Array.isArray(events) || events.length === 0) {
          setCache(null);
          setState({ hasRecentCommit: false, lastCommitAt: null, isLoading: false });
          return;
        }

        const latestPushIso =
          events.find(
            (event) => event.type === "PushEvent" && typeof event.created_at === "string"
          )?.created_at ?? null;

        setCache(latestPushIso);
        setState({
          hasRecentCommit: latestPushIso ? hasRecentCommitFromIso(latestPushIso) : false,
          lastCommitAt: latestPushIso,
          isLoading: false,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setCache(null);
        setState({ hasRecentCommit: false, lastCommitAt: null, isLoading: false });
      }
    }

    fetchActivity();

    return () => controller.abort();
  }, []);

  return state;
}
