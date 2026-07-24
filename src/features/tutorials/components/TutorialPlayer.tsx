import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "../styles/videojs-theme.css";

interface TutorialPlayerProps {
  src: string;
  /** MP4 direto ou playlist HLS — define o type entregue ao Video.js. */
  isHls: boolean;
  poster?: string | null;
  title: string;
  autoplay?: boolean;
  /** Segundo em que a reprodução deve retomar. */
  startAt?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPause?: (currentTime: number, duration: number) => void;
  onEnded?: (duration: number) => void;
  /** Disparado uma única vez, após 10s assistidos. */
  onWatchThreshold?: () => void;
}

const WATCH_THRESHOLD_SECONDS = 10;

/**
 * Wrapper isolado do Video.js: nenhuma página fala com a API do player direto.
 * Cuida de HLS/MP4, retomada, telemetria de progresso e do dispose (sem ele o
 * player vaza a cada remontagem em StrictMode).
 */
export function TutorialPlayer({
  src,
  isHls,
  poster,
  title,
  autoplay = false,
  startAt = 0,
  onTimeUpdate,
  onPause,
  onEnded,
  onWatchThreshold,
}: TutorialPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const thresholdFiredRef = useRef(false);
  // Handlers em ref para não recriar o player a cada render do pai.
  const handlersRef = useRef({ onTimeUpdate, onPause, onEnded, onWatchThreshold });
  handlersRef.current = { onTimeUpdate, onPause, onEnded, onWatchThreshold };

  useEffect(() => {
    if (!containerRef.current || playerRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-e7-theme");
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("controlslist", "nodownload");
    containerRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      fluid: true,
      responsive: true,
      preload: "metadata",
      // autoplay sempre mudo: navegadores bloqueiam com áudio.
      autoplay: autoplay ? "muted" : false,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      language: "pt-BR",
      controlBar: { pictureInPictureToggle: true, remainingTimeDisplay: true },
      userActions: { hotkeys: true },
      html5: {
        vhs: {
          // Qualidade automática limitada ao tamanho real do player: evita
          // baixar rendition 4K num quadro de 800px.
          limitRenditionByPlayerDimensions: true,
          overrideNative: true,
          useBandwidthFromLocalStorage: true,
        },
      },
    });

    player.on("timeupdate", () => {
      const current = player.currentTime() ?? 0;
      const duration = player.duration() ?? 0;
      handlersRef.current.onTimeUpdate?.(current, duration);

      if (!thresholdFiredRef.current && current >= WATCH_THRESHOLD_SECONDS) {
        thresholdFiredRef.current = true;
        handlersRef.current.onWatchThreshold?.();
      }
    });

    player.on("pause", () => {
      handlersRef.current.onPause?.(player.currentTime() ?? 0, player.duration() ?? 0);
    });

    player.on("ended", () => {
      handlersRef.current.onEnded?.(player.duration() ?? 0);
    });

    playerRef.current = player;

    return () => {
      const current = playerRef.current;
      playerRef.current = null;
      if (current && !current.isDisposed()) {
        handlersRef.current.onPause?.(current.currentTime() ?? 0, current.duration() ?? 0);
        current.dispose();
      }
    };
    // Player é criado uma vez; fonte e poster são atualizados nos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !src) return;

    player.src({ src, type: isHls ? "application/x-mpegURL" : "video/mp4" });
    if (poster) player.poster(poster);
    thresholdFiredRef.current = false;

    if (startAt > 0) {
      player.one("loadedmetadata", () => {
        const duration = player.duration() ?? 0;
        // Só retoma no meio: perto do fim, recomeça do zero.
        if (duration === 0 || startAt < duration * 0.95) player.currentTime(startAt);
      });
    }
  }, [src, isHls, poster, startAt]);

  return (
    <div
      ref={containerRef}
      data-vjs-player
      className="overflow-hidden rounded-xl border border-border bg-black"
      aria-label={`Player do tutorial ${title}`}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
