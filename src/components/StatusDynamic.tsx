import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Music2 } from "lucide-react";
import { ExternalLink } from "@/components/ExternalLink";
import type { SpotifyNowPlayingTrack } from "@/lib/spotifyTypes";
import {
  createDynamicStatusSeed,
  resolveDynamicStatus,
} from "@/lib/statusResolver";

interface StatusDynamicProps {
  hasRecentCommit: boolean;
  spotifyTrack: SpotifyNowPlayingTrack | null;
  spotifyError: string | null;
}

export function StatusDynamic({
  hasRecentCommit,
  spotifyTrack,
  spotifyError,
}: StatusDynamicProps) {
  const seed = useMemo(() => createDynamicStatusSeed(), []);
  const [canHover, setCanHover] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [tapExpanded, setTapExpanded] = useState(false);

  const status = resolveDynamicStatus({ hasRecentCommit, spotifyTrack }, seed);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setCanHover(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener("change", onChange);

    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  const isExpanded = canHover ? hoverExpanded : tapExpanded;

  return (
    <div className="w-full max-w-[560px] flex flex-col items-center gap-2 text-center">
      {status.mainMessage && (
        <span className="text-sm text-muted-foreground">
          {status.mainMessage}
        </span>
      )}

      {status.showSpotify && spotifyTrack && (
        <div className="w-full max-w-[460px]">
          <button
            type="button"
            onClick={() => {
              if (!canHover) {
                setTapExpanded((current) => !current);
              }
            }}
            onMouseEnter={() => {
              if (canHover) setHoverExpanded(true);
            }}
            onMouseLeave={() => {
              if (canHover) setHoverExpanded(false);
            }}
            className="brutalist-link w-full bg-link text-link-foreground px-4 py-3 flex items-center gap-3"
            aria-expanded={isExpanded}
            aria-label={`Status do Spotify: ${spotifyTrack.songName}`}
          >
            {spotifyTrack.albumImageUrl ? (
              <img
                src={spotifyTrack.albumImageUrl}
                alt={`Capa de ${spotifyTrack.albumName}`}
                className="w-12 h-12 object-cover border border-border shrink-0"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="w-12 h-12 border border-border flex items-center justify-center shrink-0">
                <Music2 className="w-4 h-4" />
              </span>
            )}

            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold leading-tight">
                {spotifyTrack.songName}
              </span>
              <span className="block text-xs opacity-70 truncate">
                {spotifyTrack.artistNames}
              </span>
            </span>

            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform ${
                isExpanded ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="border-x-[2.5px] border-b-[2.5px] border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Tocando agora
                </p>
                <p className="text-sm font-semibold mt-1">{spotifyTrack.songName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {spotifyTrack.artistNames}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Album: {spotifyTrack.albumName}
                </p>

                {spotifyTrack.trackUrl && (
                  <ExternalLink
                    url={spotifyTrack.trackUrl}
                    className="inline-flex mt-3 text-xs underline underline-offset-2"
                    aria-label="Abrir faixa no Spotify"
                  >
                    Abrir no Spotify
                  </ExternalLink>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {spotifyError && (
        <span className="text-[11px] text-muted-foreground">{spotifyError}</span>
      )}
    </div>
  );
}
