import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const CACHE_KEY = "gh_last_activity";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  timestamp: number;
  value: string | null;
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

export interface GitHubActivityState {
  lastActivityText: string | null;
  isLoading: boolean;
}

export function useGitHubActivity(): GitHubActivityState {
  const [state, setState] = useState<GitHubActivityState>({
    lastActivityText: null,
    isLoading: true,
  });

  useEffect(() => {
    const cached = getCached();
    if (cached !== undefined) {
      setState({ lastActivityText: cached, isLoading: false });
      return;
    }

    const controller = new AbortController();

    async function fetchActivity() {
      try {
        const res = await fetch(
          "https://api.github.com/users/lucasnsnt/events/public?per_page=1",
          { signal: controller.signal }
        );

        if (!res.ok) {
          setCache(null);
          setState({ lastActivityText: null, isLoading: false });
          return;
        }

        const events = await res.json();
        if (!Array.isArray(events) || events.length === 0) {
          setCache(null);
          setState({ lastActivityText: null, isLoading: false });
          return;
        }

        const createdAt: string = events[0].created_at;
        const text = formatDistanceToNow(new Date(createdAt), {
          addSuffix: true,
          locale: ptBR,
        });

        setCache(text);
        setState({ lastActivityText: text, isLoading: false });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setCache(null);
        setState({ lastActivityText: null, isLoading: false });
      }
    }

    fetchActivity();

    return () => controller.abort();
  }, []);

  return state;
}
