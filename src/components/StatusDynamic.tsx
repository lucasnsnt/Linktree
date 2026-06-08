import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Music2 } from "lucide-react";
import { createPortal } from "react-dom";
import { ExternalLink } from "@/components/ExternalLink";
import type { SpotifyNowPlayingTrack } from "@/lib/spotifyTypes";
import {
  createDynamicStatusSeed,
  resolveDynamicStatus,
} from "@/lib/statusResolver";

interface StatusDynamicProps {
  spotifyTrack: SpotifyNowPlayingTrack | null;
  spotifyError: string | null;
}

export function StatusDynamic({
  spotifyTrack,
  spotifyError,
}: StatusDynamicProps) {
  const seed = useMemo(() => createDynamicStatusSeed(), []);
  const [canHover, setCanHover] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [tapExpanded, setTapExpanded] = useState(false);
  const [mobileTop, setMobileTop] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const status = resolveDynamicStatus({ spotifyTrack }, seed);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setCanHover(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener("change", onChange);

    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (canHover || !tapExpanded) return;

    function closeOnOutside(event: Event) {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedTrigger = Boolean(triggerRef.current?.contains(target));
      const clickedCard = Boolean(cardRef.current?.contains(target));

      if (!clickedTrigger && !clickedCard) {
        setTapExpanded(false);
      }
    }

    document.addEventListener("touchstart", closeOnOutside, { passive: true });
    document.addEventListener("mousedown", closeOnOutside);
    return () => {
      document.removeEventListener("touchstart", closeOnOutside);
      document.removeEventListener("mousedown", closeOnOutside);
    };
  }, [canHover, tapExpanded]);

  useEffect(() => {
    if (canHover || !tapExpanded) return;

    function updateMobileTop() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMobileTop(rect.bottom + 8);
    }

    updateMobileTop();
    window.addEventListener("resize", updateMobileTop);
    window.addEventListener("scroll", updateMobileTop, true);

    return () => {
      window.removeEventListener("resize", updateMobileTop);
      window.removeEventListener("scroll", updateMobileTop, true);
    };
  }, [canHover, tapExpanded]);

  const isExpanded = canHover ? hoverExpanded : tapExpanded;
  const showDesktopCard = Boolean(canHover && isExpanded && spotifyTrack);
  const showMobileCard = Boolean(!canHover && isExpanded && spotifyTrack);

  const mobileCard = showMobileCard && mobileTop !== null && spotifyTrack
    ? createPortal(
        <AnimatePresence initial={false}>
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 z-[60] -translate-x-1/2 brutalist-link bg-link text-link-foreground px-4 py-3 text-left shadow-[6px_6px_0px_#111111]"
            style={{
              top: `${mobileTop}px`,
              width: "min(340px, calc(100vw - 2rem))",
            }}
          >
            <div className="flex items-start gap-3">
              {spotifyTrack.albumImageUrl ? (
                <img
                  src={spotifyTrack.albumImageUrl}
                  alt={`Capa de ${spotifyTrack.albumName}`}
                  className="w-14 h-14 object-cover border border-border shrink-0"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="w-14 h-14 border border-border flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight truncate">{spotifyTrack.songName}</p>
                <p className="text-xs opacity-70 mt-1">{spotifyTrack.artistNames}</p>
                <p className="text-xs opacity-70 mt-1">Album: {spotifyTrack.albumName}</p>
              </div>
            </div>

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
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div className="w-full max-w-[560px] flex flex-col items-center gap-2 text-center">
      {status.showSpotifyCard && spotifyTrack ? (
        <div
          ref={wrapperRef}
          className="relative w-full max-w-[460px] flex flex-col items-center"
          onMouseEnter={() => {
            if (canHover) setHoverExpanded(true);
          }}
          onMouseLeave={() => {
            if (canHover) setHoverExpanded(false);
          }}
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (!canHover) {
                setTapExpanded((current) => {
                  const next = !current;
                  if (!current) {
                    const rect = triggerRef.current?.getBoundingClientRect();
                    if (rect) setMobileTop(rect.bottom + 8);
                  }
                  return next;
                });
              }
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={isExpanded}
            aria-label={`Abrir detalhes da musica ${spotifyTrack.songName}`}
          >
            <span>{status.statusText}</span>
            <ChevronDown className={`inline w-4 h-4 ml-1 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`} />
          </button>

          <AnimatePresence initial={false}>
            {showDesktopCard && (
              <motion.div
                ref={cardRef}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`${
                  "absolute top-full left-1/2 z-30 mt-2 w-[340px] max-w-[calc(100vw-2rem)] -translate-x-1/2"
                } brutalist-link bg-link text-link-foreground px-4 py-3 text-left shadow-[6px_6px_0px_#111111]`}
              >
                <div className="flex items-start gap-3">
                  {spotifyTrack.albumImageUrl ? (
                    <img
                      src={spotifyTrack.albumImageUrl}
                      alt={`Capa de ${spotifyTrack.albumName}`}
                      className="w-14 h-14 object-cover border border-border shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="w-14 h-14 border border-border flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4" />
                    </span>
                  )}

                  <div>
                    <p className="text-sm font-semibold leading-tight">{spotifyTrack.songName}</p>
                    <p className="text-xs opacity-70 mt-1">{spotifyTrack.artistNames}</p>
                    <p className="text-xs opacity-70 mt-1">Album: {spotifyTrack.albumName}</p>
                  </div>
                </div>

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
      ) : (
        <span className="text-sm text-muted-foreground">{status.statusText}</span>
      )}

      {import.meta.env.DEV && spotifyError && (
        <span className="text-[11px] text-muted-foreground">{spotifyError}</span>
      )}

      {mobileCard}
    </div>
  );
}
