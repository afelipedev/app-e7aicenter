import { useRef, useState } from "react";
import { CheckCircle2, FileVideo, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useResumableUpload } from "../../hooks/useResumableUpload";
import { validateVideoFile } from "../../services/tutorialUploadService";
import { captureVideoFrame, readVideoDuration } from "../../utils/media";
import { formatBytes, formatDuration } from "../../utils/format";
import { UploadProgress } from "./UploadProgress";

interface VideoUploaderProps {
  moduleKey: string | null;
  /** Caminho já salvo, quando se está editando um tutorial. */
  value: string | null;
  onUploaded: (data: {
    path: string;
    durationSeconds: number | null;
    mimeType: string;
    fileSize: number;
    /** Frame capturado, oferecido como capa quando não há imagem própria. */
    posterBlob: Blob | null;
  }) => void;
  onCleared: () => void;
}

/**
 * Envio resumível do vídeo. Lê a duração do arquivo e captura um frame para
 * servir de capa, evitando trabalho manual no cadastro.
 */
export function VideoUploader({ moduleKey, value, onUploaded, onCleared }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { state, start, pause, resume, cancel, reset } = useResumableUpload();

  const handleFile = async (selected: File) => {
    const validationError = validateVideoFile(selected);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    setFile(selected);

    const [seconds, poster] = await Promise.all([
      readVideoDuration(selected),
      captureVideoFrame(selected),
    ]);
    setDuration(seconds);

    const path = await start(selected, moduleKey);
    if (path) {
      onUploaded({
        path,
        durationSeconds: seconds,
        mimeType: selected.type,
        fileSize: selected.size,
        posterBlob: poster,
      });
    }
  };

  const clear = async () => {
    await cancel();
    setFile(null);
    setDuration(null);
    reset();
    onCleared();
  };

  if (value && state.status !== "uploading" && state.status !== "paused") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file?.name ?? "Vídeo enviado"}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {file ? `${formatBytes(file.size)} · ` : ""}
              {duration ? formatDuration(duration) : "pronto para publicar"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Trocar vídeo
        </Button>
      </div>
    );
  }

  if (file && (state.status === "uploading" || state.status === "paused")) {
    return (
      <UploadProgress
        state={state}
        fileName={file.name}
        onPause={pause}
        onResume={resume}
        onCancel={clear}
      />
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) handleFile(dropped);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        )}
      >
        <UploadCloud className="mb-2 h-7 w-7 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Arraste o vídeo ou clique para escolher</p>
        <p className="mt-1 text-xs text-muted-foreground">MP4, MOV ou WEBM · até 2 GB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) handleFile(selected);
          event.target.value = "";
        }}
      />

      {(localError || state.error) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <FileVideo className="h-3.5 w-3.5" aria-hidden />
          {localError || state.error}
        </p>
      )}
    </div>
  );
}
