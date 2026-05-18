import { supabase } from "@/lib/supabase";
import {
  TEAMS_ATTACHMENTS_BUCKET,
  TEAMS_INLINE_IMAGES_BUCKET,
  ALLOWED_INLINE_IMAGE_MIMES,
  MAX_INLINE_IMAGE_BYTES,
  MAX_ATTACHMENT_BYTES,
} from "../constants";
import { sanitizeFileName } from "../utils";

export const attachmentService = {
  async uploadInlineImage(postId: string, file: File): Promise<string> {
    if (!ALLOWED_INLINE_IMAGE_MIMES.includes(file.type)) {
      throw new Error("Tipo de imagem não suportado");
    }
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      throw new Error("Imagem excede 5 MB");
    }
    const path = `${postId}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(TEAMS_INLINE_IMAGES_BUCKET)
      .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(TEAMS_INLINE_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadPostAttachment(postId: string, channelId: string, userId: string, file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("Arquivo excede 25 MB");
    }
    const path = `${channelId}/${postId}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(TEAMS_ATTACHMENTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data, error } = await supabase
      .from("post_attachments").insert({
        post_id: postId,
        uploaded_by_user_id: userId,
        kind: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: path,
      }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getSignedUrl(storagePath: string, expiresInSec = 300): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(TEAMS_ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSec);
    if (error) return null;
    return data?.signedUrl ?? null;
  },
};
