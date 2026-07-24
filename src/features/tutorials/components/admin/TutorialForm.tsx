import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SYSTEM_MODULES } from "../../constants";
import { useCreateTutorial, useUpdateTutorial } from "../../hooks/useTutorialAdmin";
import { useTutorialCategories } from "../../hooks/useTutorials";
import type { Tutorial, TutorialInput } from "../../types";
import { formatDuration } from "../../utils/format";
import { ThumbnailUploader } from "./ThumbnailUploader";
import { VideoUploader } from "./VideoUploader";

const NONE = "__none__";

const schema = z.object({
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres."),
  short_description: z.string().trim().max(180, "Use até 180 caracteres.").optional().or(z.literal("")),
  full_description: z.string().trim().optional().or(z.literal("")),
  category_id: z.string().nullable(),
  module_key: z.string().nullable(),
  tags: z.array(z.string()),
  duration_seconds: z.coerce.number().int().min(0).nullable(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

interface TutorialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preenchido ao editar; ausente ao criar. */
  tutorial?: Tutorial | null;
}

export function TutorialForm({ open, onOpenChange, tutorial }: TutorialFormProps) {
  const isEditing = Boolean(tutorial);
  const { data: categories = [] } = useTutorialCategories();
  const createTutorial = useCreateTutorial();
  const updateTutorial = useUpdateTutorial();

  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ mimeType: string | null; fileSize: number | null }>({
    mimeType: null,
    fileSize: null,
  });
  const [suggestedFrame, setSuggestedFrame] = useState<Blob | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!open) return;

    if (tutorial) {
      form.reset({
        title: tutorial.title,
        short_description: tutorial.short_description ?? "",
        full_description: tutorial.full_description ?? "",
        category_id: tutorial.category_id,
        module_key: tutorial.module_key,
        tags: tutorial.tags ?? [],
        duration_seconds: tutorial.duration_seconds,
        is_published: tutorial.status === "publicado",
        is_featured: tutorial.is_featured,
        sort_order: tutorial.sort_order,
      });
      setVideoPath(tutorial.video_path);
      setThumbnailPath(tutorial.thumbnail_path);
      setVideoMeta({ mimeType: tutorial.mime_type, fileSize: tutorial.file_size });
    } else {
      form.reset(emptyValues());
      setVideoPath(null);
      setThumbnailPath(null);
      setVideoMeta({ mimeType: null, fileSize: null });
    }
    setSuggestedFrame(null);
    setFormError(null);
    setTagDraft("");
  }, [open, tutorial, form]);

  const moduleKey = form.watch("module_key");
  const tags = form.watch("tags");
  const isSaving = createTutorial.isPending || updateTutorial.isPending;

  const addTag = () => {
    const value = tagDraft.trim().toLowerCase();
    if (!value || tags.includes(value)) {
      setTagDraft("");
      return;
    }
    form.setValue("tags", [...tags, value]);
    setTagDraft("");
  };

  const onSubmit = async (values: FormValues) => {
    // Publicar sem arquivo deixaria um card quebrado no catálogo.
    if (values.is_published && !videoPath) {
      setFormError("Envie o vídeo antes de publicar o tutorial.");
      return;
    }
    setFormError(null);

    const input: TutorialInput = {
      title: values.title.trim(),
      short_description: values.short_description?.trim() || null,
      full_description: values.full_description?.trim() || null,
      category_id: values.category_id,
      module_key: values.module_key,
      tags: values.tags,
      thumbnail_path: thumbnailPath,
      video_path: videoPath,
      mime_type: videoMeta.mimeType,
      file_size: videoMeta.fileSize,
      duration_seconds: values.duration_seconds || null,
      status: values.is_published ? "publicado" : "rascunho",
      is_featured: values.is_featured,
      sort_order: values.sort_order,
    };

    if (isEditing && tutorial) {
      await updateTutorial.mutateAsync({ id: tutorial.id, input });
    } else {
      await createTutorial.mutateAsync(input);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{isEditing ? "Editar tutorial" : "Novo tutorial"}</SheetTitle>
          <SheetDescription>
            O vídeo vai para o Storage; aqui ficam apenas os dados que aparecem no catálogo.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-5 pb-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Como criar um quadro no Kanban" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição curta</FormLabel>
                  <FormControl>
                    <Input placeholder="Aparece no card do catálogo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição completa</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="O que o usuário aprende neste vídeo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      value={field.value ?? NONE}
                      onValueChange={(value) => field.onChange(value === NONE ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem categoria</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="module_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Módulo do sistema</FormLabel>
                    <Select
                      value={field.value ?? NONE}
                      onValueChange={(value) => field.onChange(value === NONE ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Geral</SelectItem>
                        {SYSTEM_MODULES.map((module) => (
                          <SelectItem key={module.key} value={module.key}>
                            {module.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Define a pasta no Storage e a trilha do catálogo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="kanban, prazo, peticao"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 font-normal">
                      #{tag}
                      <button
                        type="button"
                        aria-label={`Remover tag ${tag}`}
                        onClick={() => form.setValue("tags", tags.filter((item) => item !== tag))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </FormItem>

            <FormItem>
              <FormLabel>Vídeo</FormLabel>
              <VideoUploader
                moduleKey={moduleKey}
                value={videoPath}
                onUploaded={({ path, durationSeconds, mimeType, fileSize, posterBlob }) => {
                  setVideoPath(path);
                  setVideoMeta({ mimeType, fileSize });
                  if (durationSeconds) form.setValue("duration_seconds", durationSeconds);
                  if (posterBlob) setSuggestedFrame(posterBlob);
                }}
                onCleared={() => {
                  setVideoPath(null);
                  setVideoMeta({ mimeType: null, fileSize: null });
                }}
              />
            </FormItem>

            <FormItem>
              <FormLabel>Thumbnail</FormLabel>
              <ThumbnailUploader
                moduleKey={moduleKey}
                value={thumbnailPath}
                onChange={setThumbnailPath}
                suggestedFrame={suggestedFrame}
              />
            </FormItem>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="duration_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo (segundos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value === "" ? null : event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value ? `Exibido como ${formatDuration(Number(field.value))}` : "Preenchido pelo upload."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormDescription>Menor número aparece primeiro na trilha.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 space-y-0">
                    <div>
                      <FormLabel>Publicado</FormLabel>
                      <FormDescription>Fica visível para todos os usuários.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 space-y-0">
                    <div>
                      <FormLabel>Destaque</FormLabel>
                      <FormDescription>Sobe para o topo em "Mais recentes".</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <SheetFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                {isEditing ? "Salvar alterações" : "Criar tutorial"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function emptyValues(): FormValues {
  return {
    title: "",
    short_description: "",
    full_description: "",
    category_id: null,
    module_key: null,
    tags: [],
    duration_seconds: null,
    is_published: false,
    is_featured: false,
    sort_order: 0,
  };
}
