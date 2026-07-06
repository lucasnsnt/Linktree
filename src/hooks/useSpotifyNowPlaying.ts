import { useEffect, useState } from "react";
import type { SpotifyNowPlayingTrack } from "@/lib/spotifyTypes";
import { hasSpotifyBlockedWord } from "@/lib/spotifyBlockedWords";

const SPOTIFY_POLL_INTERVAL_MS = 30_000;

interface SpotifyNowPlayingApiResponse {
  status: "playing" | "not-playing" | "error";
  track?: SpotifyNowPlayingTrack;
  allowed?: boolean;
  error?: string;
}

export interface SpotifyNowPlayingState {
  track: SpotifyNowPlayingTrack | null;
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_STATE: SpotifyNowPlayingState = {
  track: null,
  isBlocked: false,
  isLoading: false,
  error: null,
};

export function useSpotifyNowPlaying(): SpotifyNowPlayingState {
  const [state, setState] = useState<SpotifyNowPlayingState>(EMPTY_STATE);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchNowPlaying(showLoading: boolean) {
      if (showLoading) {
        setState((current) => ({ ...current, isLoading: true, error: null }));
      }

      try {
        const response = await fetch("/api/spotify", {
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404 && import.meta.env.DEV) {
            setState({
              track: null,
              isBlocked: false,
              isLoading: false,
              error: "Endpoint /api/spotify nao encontrado. Use vercel dev para testar local.",
            });
            return;
          }

          setState({
            track: null,
            isBlocked: false,
            isLoading: false,
            error: "Spotify indisponivel no momento.",
          });
          return;
        }

        const result = (await response.json()) as SpotifyNowPlayingApiResponse;
        if (cancelled) return;

        if (result.status !== "playing" || !result.track) {
          setState({ track: null, isBlocked: false, isLoading: false, error: null });
          return;
        }

        const blockedByTerm = hasSpotifyBlockedWord([
          result.track.songName,
          result.track.artistNames,
        ]);
        // Aqui aplicamos a regra: bloquear se palavra proibida OU se 'allowed' === false
        const shouldBlock = blockedByTerm || result.allowed === false;

        setState({
          track: shouldBlock ? null : result.track,
          isBlocked: shouldBlock,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError" || cancelled) return;

        setState({
          track: null,
          isBlocked: false,
          isLoading: false,
          error: "Nao foi possivel atualizar o Spotify agora.",
        });
      }
    }

    fetchNowPlaying(true);

    const interval = window.setInterval(() => {
      fetchNowPlaying(false);
    }, SPOTIFY_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return state;
}
