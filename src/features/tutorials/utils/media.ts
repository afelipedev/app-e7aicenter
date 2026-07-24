/** Utilidades de mídia no cliente: duração, captura de frame e compressão. */

/** Lê a duração do arquivo antes do upload para preencher o campo Tempo. */
export const readVideoDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });

/** Captura um frame do vídeo para servir de capa quando não há imagem própria. */
export const captureVideoFrame = (file: File, atSecond = 1): Promise<Blob | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(atSecond, Math.max(video.duration / 2, 0));
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(video.videoWidth, 1280);
      canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve(blob);
        },
        "image/webp",
        0.85
      );
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });

/** Reduz a thumbnail para no máximo 1280px de largura em WEBP. */
export const compressImage = (file: File, maxWidth = 1280): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem."))),
        "image/webp",
        0.85
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido."));
    };
    image.src = url;
  });
