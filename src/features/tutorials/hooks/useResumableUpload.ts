import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildVideoPath,
  uploadVideoResumable,
  validateVideoFile,
  type UploadHandle,
} from "../services/tutorialUploadService";
import { EMPTY_UPLOAD_STATE, type UploadState } from "../types";

/** Janela da média móvel de velocidade, em ms. */
const SPEED_WINDOW_MS = 3000;

/**
 * Controla um upload resumível de vídeo e calcula progresso, velocidade e tempo
 * restante para a barra de progresso.
 */
export const useResumableUpload = () => {
  const [state, setState] = useState<UploadState>(EMPTY_UPLOAD_STATE);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const handleRef = useRef<UploadHandle | null>(null);
  const samplesRef = useRef<{ time: number; bytes: number }[]>([]);

  useEffect(
    () => () => {
      // Sair da tela no meio do envio não deixa requisição pendurada.
      handleRef.current?.pause();
    },
    []
  );

  const start = useCallback(async (file: File, moduleKey: string | null): Promise<string | null> => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      setState({ ...EMPTY_UPLOAD_STATE, status: "error", error: validationError });
      return null;
    }

    const path = buildVideoPath(moduleKey, file);
    samplesRef.current = [];
    setState({ ...EMPTY_UPLOAD_STATE, status: "uploading", bytesTotal: file.size });

    return new Promise<string | null>((resolve) => {
      uploadVideoResumable(file, path, {
        onProgress: (bytesUploaded, bytesTotal) => {
          const now = Date.now();
          const samples = samplesRef.current;
          samples.push({ time: now, bytes: bytesUploaded });
          while (samples.length > 2 && now - samples[0].time > SPEED_WINDOW_MS) samples.shift();

          const first = samples[0];
          const elapsed = (now - first.time) / 1000;
          const speed = elapsed > 0 ? (bytesUploaded - first.bytes) / elapsed : 0;
          const remaining = speed > 0 ? (bytesTotal - bytesUploaded) / speed : null;

          setState((current) => ({
            ...current,
            status: "uploading",
            bytesUploaded,
            bytesTotal,
            progress: bytesTotal ? (bytesUploaded / bytesTotal) * 100 : 0,
            speed,
            remainingSeconds: remaining,
          }));
        },
        onSuccess: (finalPath) => {
          setState((current) => ({
            ...current,
            status: "success",
            progress: 100,
            bytesUploaded: current.bytesTotal,
            speed: 0,
            remainingSeconds: 0,
          }));
          setUploadedPath(finalPath);
          resolve(finalPath);
        },
        onError: (error) => {
          setState((current) => ({ ...current, status: "error", error: error.message }));
          resolve(null);
        },
      })
        .then((handle) => {
          handleRef.current = handle;
        })
        .catch((error: Error) => {
          setState({ ...EMPTY_UPLOAD_STATE, status: "error", error: error.message });
          resolve(null);
        });
    });
  }, []);

  const pause = useCallback(() => {
    handleRef.current?.pause();
    samplesRef.current = [];
    setState((current) => ({ ...current, status: "paused", speed: 0, remainingSeconds: null }));
  }, []);

  const resume = useCallback(() => {
    handleRef.current?.resume();
    setState((current) => ({ ...current, status: "uploading" }));
  }, []);

  const cancel = useCallback(async () => {
    await handleRef.current?.abort();
    handleRef.current = null;
    samplesRef.current = [];
    setUploadedPath(null);
    setState(EMPTY_UPLOAD_STATE);
  }, []);

  const reset = useCallback(() => {
    handleRef.current = null;
    samplesRef.current = [];
    setUploadedPath(null);
    setState(EMPTY_UPLOAD_STATE);
  }, []);

  return { state, uploadedPath, start, pause, resume, cancel, reset };
};
