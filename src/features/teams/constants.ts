export const TEAMS_ATTACHMENTS_BUCKET = "teams-attachments";
export const TEAMS_INLINE_IMAGES_BUCKET = "teams-inline-images";
export const TEAMS_ICONS_BUCKET = "teams-team-icons";

export const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_INLINE_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const TEAMS_REALTIME_THROTTLE_MS = 100;

export const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "🎉", "🚀", "👀"] as const;
