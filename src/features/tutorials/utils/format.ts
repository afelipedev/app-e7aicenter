import { NEW_BADGE_DAYS } from "../constants";

/** 372 -> "6:12"; 3720 -> "1:02:00". */
export const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds < 0) return "--:--";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/** 1240 -> "1,2 mil visualizações". */
export const formatViews = (count: number): string => {
  const label = count === 1 ? "visualização" : "visualizações";
  if (count < 1000) return `${count} ${label}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1).replace(".", ",")} mil ${label}`;
  return `${(count / 1_000_000).toFixed(1).replace(".", ",")} mi ${label}`;
};

export const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1).replace(".", ",")} ${units[i]}`;
};

export const formatSpeed = (bytesPerSecond: number): string =>
  bytesPerSecond > 0 ? `${formatBytes(bytesPerSecond)}/s` : "—";

export const formatRemaining = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s restantes`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min restantes`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min restantes`;
};

export const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const isRecentlyPublished = (publishedAt?: string | null): boolean => {
  if (!publishedAt) return false;
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  return diffMs >= 0 && diffMs < NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
};

/** "Gestão de Holerites" -> "gestao-de-holerites". */
export const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
