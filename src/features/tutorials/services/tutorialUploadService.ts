import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  ACCEPTED_VIDEO_MIME_TYPES,
  MAX_THUMBNAIL_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  TUTORIALS_THUMBNAIL_BUCKET,
  TUTORIALS_VIDEO_BUCKET,
} from "../constants";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const RESUMABLE_ENDPOINT = `${SUPABASE_URL}/storage/v1/upload/resumable`;
/** Tamanho exigido pelo endpoint resumível do Supabase Storage. */
const CHUNK_SIZE = 6 * 1024 * 1024;

export interface UploadHandle {
  /** Pausa mantendo o que já subiu; `resume()` continua do mesmo ponto. */
  pause: () => void;
  resume: () => void;
  /** Cancela e descarta o upload parcial no servidor. */
  abort: () => Promise<void>;
}

export interface UploadCallbacks {
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
  onSuccess: (path: string) => void;
  onError: (error: Error) => void;
}

export const validateVideoFile = (file: File): string | null => {
  if (!(ACCEPTED_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não suportado. Envie um arquivo MP4, MOV ou WEBM.";
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return "O vídeo passa de 2 GB. Comprima o arquivo antes de enviar.";
  }
  return null;
};

export const validateImageFile = (file: File): string | null => {
  if (!(ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não suportado. Envie uma imagem PNG, JPG ou WEBP.";
  }
  if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
    return "A imagem passa de 5 MB.";
  }
  return null;
};

/** tutorials/<modulo>/<uuid>.<ext> — nome único, sem colisão entre uploads. */
export const buildVideoPath = (moduleKey: string | null, file: File): string => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  return `${moduleKey || "geral"}/${crypto.randomUUID()}.${ext}`;
};

export const buildThumbnailPath = (moduleKey: string | null, file: File): string => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${moduleKey || "geral"}/${crypto.randomUUID()}.${ext}`;
};

/**
 * Upload resumível do vídeo. Usa o endpoint TUS do Supabase Storage porque o
 * `storage.upload()` não expõe progresso nem permite pausar/retomar.
 */
export async function uploadVideoResumable(
  file: File,
  path: string,
  callbacks: UploadCallbacks
): Promise<UploadHandle> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente para enviar o vídeo.");

  let upload: tus.Upload;

  await new Promise<void>((resolve, reject) => {
    upload = new tus.Upload(file, {
      endpoint: RESUMABLE_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: CHUNK_SIZE,
      // Permite retomar o mesmo arquivo depois de recarregar a página.
      storeFingerprintForResuming: true,
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: TUTORIALS_VIDEO_BUCKET,
        objectName: path,
        contentType: file.type,
        cacheControl: "3600",
      },
      onProgress: callbacks.onProgress,
      onSuccess: () => callbacks.onSuccess(path),
      onError: (error) => callbacks.onError(normalizeUploadError(error)),
    });

    // Retoma automaticamente se houver um upload anterior do mesmo arquivo.
    upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
        resolve();
      })
      .catch(reject);
  });

  return {
    pause: () => upload.abort(),
    resume: () => upload.start(),
    abort: async () => {
      await upload.abort(true);
    },
  };
}

/** Thumbnail é pequena: upload simples já basta. */
export async function uploadThumbnail(file: Blob, path: string, contentType: string): Promise<string> {
  const { error } = await supabase.storage
    .from(TUTORIALS_THUMBNAIL_BUCKET)
    .upload(path, file, { upsert: true, contentType });
  if (error) throw new Error(error.message);
  return path;
}

function normalizeUploadError(error: Error): Error {
  const message = error.message || "";
  if (message.includes("413") || message.toLowerCase().includes("payload too large")) {
    return new Error("Arquivo maior que o limite do bucket (2 GB).");
  }
  if (message.includes("401") || message.includes("403")) {
    return new Error("Sem permissão para enviar. Apenas administradores publicam tutoriais.");
  }
  return new Error("Falha no envio do vídeo. Verifique a conexão e retome o upload.");
}
