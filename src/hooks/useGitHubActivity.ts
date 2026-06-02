import { useEffect, useState } from "react";

const CACHE_KEY = "gh_last_activity_iso";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  timestamp: number;
  value: string | null; // ISO 8601 do evento mais recente, ou null
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

function toActivityStatus(isoString: string): string | null {
  const diffHours =
    (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
  if (diffHours < 48) return "Desenvolvendo ativamente";
  if (diffHours < 7 * 24) return "Trabalhando em novos projetos";
  if (diffHours < 30 * 24) return "Desenvolvimento ativo";
  return null;
}

export interface GitHubActivityState {
  activityStatus: string | null;
  isLoading: boolean;
}

export function useGitHubActivity(): GitHubActivityState {
  const [state, setState] = useState<GitHubActivityState>({
    activityStatus: null,
    isLoading: true,
  });

  useEffect(() => {
    const cached = getCached();
    if (cached !== undefined) {
      const status = cached !== null ? toActivityStatus(cached) : null;
      setState({ activityStatus: status, isLoading: false });
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
          setState({ activityStatus: null, isLoading: false });
          return;
        }

        const events = await res.json();
        if (!Array.isArray(events) || events.length === 0) {
          setCache(null);
          setState({ activityStatus: null, isLoading: false });
          return;
        }

        const createdAt: string = events[0].created_at;
        setCache(createdAt);
        setState({
          activityStatus: toActivityStatus(createdAt),
          isLoading: false,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setCache(null);
        setState({ activityStatus: null, isLoading: false });
      }
    }

    fetchActivity();

    return () => controller.abort();
  }, []);

  return state;
}
