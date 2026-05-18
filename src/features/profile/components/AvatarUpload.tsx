import { ChangeEvent, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  name: string;
  avatarUrl: string | null;
  loading?: boolean;
  onFileSelected: (file: File) => void;
}

const getInitials = (name: string) => {
  const chunks = name.trim().split(" ").filter(Boolean);
  if (!chunks.length) return "U";
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0]}${chunks[chunks.length - 1][0]}`.toUpperCase();
};

export function AvatarUpload({ name, avatarUrl, loading = false, onFileSelected }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl || undefined} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">Foto de perfil</p>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP de até 5MB.</p>
        </div>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleSelectFile}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Alterar foto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
