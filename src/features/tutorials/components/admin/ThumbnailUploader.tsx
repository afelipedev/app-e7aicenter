import { useRef, useState } from "react";
import { ImagePlus, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TUTORIALS_THUMBNAIL_BUCKET } from "../../constants";
import { supabase } from "@/lib/supabase";
import { buildThumbnailPath, uploadThumbnail, validateImageFile } from "../../services/tutorialUploadService";
import { compressImage } from "../../utils/media";

interface ThumbnailUploaderProps {
  moduleKey: string | null;
  value: string | null;
  onChange: (path: string | null) => void;
  /** Frame capturado do vídeo, quando disponível. */
  suggestedFrame?: Blob | null;
}

/** Envia a capa comprimida ou aproveita um frame do próprio vídeo. */
export function ThumbnailUploader({ moduleKey, value, onChange, suggestedFrame }: ThumbnailUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const previewUrl = value
    ? supabase.storage.from(TUTORIALS_THUMBNAIL_BUCKET).getPublicUrl(value).data.publicUrl
    : null;

  const upload = async (blob: Blob, extension: string) => {
    setIsUploading(true);
    try {
      const path = buildThumbnailPath(moduleKey, new File([blob], `capa.${extension}`, { type: blob.type }));
      await uploadThumbnail(blob, path, blob.type || "image/webp");
      onChange(path);
      toast.success("Capa enviada.");
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível enviar a capa.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const compressed = await compressImage(file);
      await upload(compressed, "webp");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {previewUrl ? (
            <img src={previewUrl} alt="Prévia da capa" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
            {isUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {value ? "Trocar capa" : "Enviar capa"}
          </Button>

          {suggestedFrame && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => upload(suggestedFrame, "webp")}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Capturar do vídeo
            </Button>
          )}

          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remover
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        PNG, JPG ou WEBP até 5 MB. A imagem é reduzida para 1280px antes do envio.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
