import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code2,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { RichTextDoc } from "../../types";
import { normalizeRichTextDoc } from "../../utils";
import { buildLegalKanbanEditorExtensions, createEmptyRichTextDoc } from "./extensions";
import { useWindowSize } from "./use-window-size";
import "./legal-kanban-rich-text-editor.css";

export type LegalKanbanRichTextEditorHandle = {
  /** Último conteúdo do editor (evita estado React defasado no salvamento). */
  getSnapshot: () => { json: RichTextDoc; plainText: string } | null;
};

interface LegalKanbanRichTextEditorProps {
  value: RichTextDoc;
  onChange?: (nextJson: RichTextDoc, plainText: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const LegalKanbanRichTextEditor = forwardRef<
  LegalKanbanRichTextEditorHandle,
  LegalKanbanRichTextEditorProps
>(function LegalKanbanRichTextEditor(
  {
    value,
    onChange,
    onImageUpload,
    className,
    placeholder = "Descreva o contexto, próximos passos ou observações relevantes...",
    disabled = false,
  },
  ref,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isMobile = useIsMobile();
  const { width } = useWindowSize();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const isCompactToolbar = isMobile || Boolean(width && width < 1280);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: buildLegalKanbanEditorExtensions(placeholder),
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChangeRef.current?.(currentEditor.getJSON() as RichTextDoc, currentEditor.getText());
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      getSnapshot: () => {
        if (!editor) return null;
        return {
          json: editor.getJSON() as RichTextDoc,
          plainText: editor.getText(),
        };
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const nextDoc = normalizeRichTextDoc(value || createEmptyRichTextDoc());
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(nextDoc);

    if (current !== next) {
      editor.commands.setContent(nextDoc, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="text-sm text-muted-foreground">Carregando editor...</div>;
  }

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "paragraph";

  function handleHeadingChange(next: string) {
    if (disabled) return;
    if (next === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }

    const level = Number(next.replace("h", ""));
    if (level >= 1 && level <= 3) {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
    }
  }

  function openLinkEditor() {
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkPopoverOpen(true);
  }

  function applyLink() {
    const normalized = normalizeUrl(linkUrl);
    if (!normalized) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkPopoverOpen(false);
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    setLinkPopoverOpen(false);
  }

  async function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !onImageUpload) return;
    if (!file.type.startsWith("image/")) return;

    try {
      setImageUploading(true);
      const imageUrl = await onImageUpload(file);
      editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "kanban-rich-text-editor w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border/80 bg-background",
          className,
        )}
      >
        <div className="flex min-w-0 flex-col gap-2 border-b border-border/70 bg-muted/20 p-2.5">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={headingValue} onValueChange={handleHeadingChange} disabled={disabled}>
                  <SelectTrigger className={cn("h-9 w-full rounded-lg", isCompactToolbar ? "sm:w-[140px]" : "sm:w-[170px]")}>
                    <SelectValue placeholder="Texto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paragraph">Texto normal</SelectItem>
                    <SelectItem value="h1">Título 1</SelectItem>
                    <SelectItem value="h2">Título 2</SelectItem>
                    <SelectItem value="h3">Título 3</SelectItem>
                  </SelectContent>
                </Select>

                <div className="kanban-rich-text-editor__toolbar-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <ToolbarIconButton
                    title="Negrito"
                    active={editor.isActive("bold")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <Bold className="h-4 w-4" />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title="Itálico"
                    active={editor.isActive("italic")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="h-4 w-4" />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title="Sublinhado"
                    active={editor.isActive("underline")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </ToolbarIconButton>
                  <Separator orientation="vertical" className="mx-1 h-6 shrink-0" />
                  <ToolbarIconButton
                    title="Lista com marcadores"
                    active={editor.isActive("bulletList")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    <List className="h-4 w-4" />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title="Lista numerada"
                    active={editor.isActive("orderedList")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title="Checklist"
                    active={editor.isActive("taskList")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </ToolbarIconButton>
                  <Separator orientation="vertical" className="mx-1 h-6 shrink-0" />
                  <ToolbarIconButton
                    title="Bloco de código"
                    active={editor.isActive("codeBlock")}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  >
                    <Code2 className="h-4 w-4" />
                  </ToolbarIconButton>
                  <ColorHighlightPopover editor={editor} disabled={disabled} compact={isCompactToolbar} />

                  {!isCompactToolbar ? (
                    <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
                      <PopoverTrigger asChild>
                        <span>
                          <ToolbarIconButton
                            title="Inserir ou editar link"
                            active={editor.isActive("link")}
                            disabled={disabled}
                            onClick={openLinkEditor}
                          >
                            <Link2 className="h-4 w-4" />
                          </ToolbarIconButton>
                        </span>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={8}
                        className="w-[min(360px,calc(100vw-2rem))] space-y-3 p-4"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Link</p>
                          <p className="text-xs text-muted-foreground">Adicione ou edite a URL do texto selecionado.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kanban-editor-link">URL</Label>
                          <Input
                            id="kanban-editor-link"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            placeholder="https://exemplo.com"
                          />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              editor.chain().focus().extendMarkRange("link").unsetLink().run();
                              setLinkPopoverOpen(false);
                            }}
                          >
                            Remover
                          </Button>
                          <Button type="button" size="sm" onClick={applyLink}>
                            Aplicar
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}

                  <ToolbarIconButton
                    title={imageUploading ? "Enviando imagem..." : "Enviar imagem"}
                    disabled={disabled || !onImageUpload || imageUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </ToolbarIconButton>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-end gap-1">
                {!isCompactToolbar ? (
                  <>
                    <ToolbarIconButton
                      title="Citação"
                      active={editor.isActive("blockquote")}
                      disabled={disabled}
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    >
                      <Quote className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      title="Alinhar à esquerda"
                      active={editor.isActive({ textAlign: "left" })}
                      disabled={disabled}
                      onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      title="Centralizar"
                      active={editor.isActive({ textAlign: "center" })}
                      disabled={disabled}
                      onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      title="Alinhar à direita"
                      active={editor.isActive({ textAlign: "right" })}
                      disabled={disabled}
                      onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    >
                      <AlignRight className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      title="Justificar"
                      active={editor.isActive({ textAlign: "justify" })}
                      disabled={disabled}
                      onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                    >
                      <AlignJustify className="h-4 w-4" />
                    </ToolbarIconButton>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg" disabled={disabled}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuItem onSelect={openLinkEditor}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Inserir ou editar link
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor.chain().focus().toggleBlockquote().run()}>
                        <Quote className="mr-2 h-4 w-4" />
                        Citação
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign("left").run()}>
                        <AlignLeft className="mr-2 h-4 w-4" />
                        Alinhar à esquerda
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign("center").run()}>
                        <AlignCenter className="mr-2 h-4 w-4" />
                        Centralizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign("right").run()}>
                        <AlignRight className="mr-2 h-4 w-4" />
                        Alinhar à direita
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign("justify").run()}>
                        <AlignJustify className="mr-2 h-4 w-4" />
                        Justificar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!editor.isActive("link")}
                        onSelect={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        Remover link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Separator orientation="vertical" className="mx-1 hidden h-6 shrink-0 md:block" />

                <ToolbarIconButton
                  title="Desfazer"
                  disabled={disabled || !editor.can().chain().focus().undo().run()}
                  onClick={() => editor.chain().focus().undo().run()}
                >
                  <Undo2 className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton
                  title="Refazer"
                  disabled={disabled || !editor.can().chain().focus().redo().run()}
                  onClick={() => editor.chain().focus().redo().run()}
                >
                  <Redo2 className="h-4 w-4" />
                </ToolbarIconButton>
              </div>
            </div>

            {isCompactToolbar && linkPopoverOpen ? (
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="kanban-editor-link-mobile">URL do link</Label>
                    <Input
                      id="kanban-editor-link-mobile"
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      placeholder="https://exemplo.com"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().extendMarkRange("link").unsetLink().run();
                      setLinkPopoverOpen(false);
                    }}
                  >
                    Remover
                  </Button>
                  <Button type="button" size="sm" onClick={applyLink}>
                    Aplicar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-x-hidden">
          <EditorContent editor={editor} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 break-words">
            Editor responsivo com headings, links, imagem inline, listas, checklist, alinhamento, destaque e histórico.
          </span>
          {imageUploading ? <span className="shrink-0">Enviando imagem...</span> : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={handleImageSelection}
      />
    </>
  );
});

LegalKanbanRichTextEditor.displayName = "LegalKanbanRichTextEditor";

function ToolbarIconButton({
  title,
  children,
  active,
  disabled,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className={cn("h-9 w-9 shrink-0 rounded-lg", active && "bg-primary/10 text-primary hover:bg-primary/15")}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function ColorHighlightPopover({
  editor,
  disabled,
  compact,
}: {
  editor: Editor;
  disabled?: boolean;
  compact?: boolean;
}) {
  const highlightColors = [
    { name: "Amarelo", value: "#fef08a" },
    { name: "Verde", value: "#bbf7d0" },
    { name: "Azul", value: "#bfdbfe" },
    { name: "Roxo", value: "#ddd6fe" },
    { name: "Rosa", value: "#fbcfe8" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <ToolbarIconButton
            title="Destacar texto"
            active={editor.isActive("highlight")}
            disabled={disabled}
            onClick={() => undefined}
          >
            <Highlighter className={cn("h-4 w-4", compact && "scale-95")} />
          </ToolbarIconButton>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[min(320px,calc(100vw-2rem))] space-y-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Destaque</p>
          <p className="text-xs text-muted-foreground">Selecione um texto e aplique uma cor de destaque.</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {highlightColors.map((color) => (
            <button
              key={color.value}
              type="button"
              className="h-9 rounded-lg border border-border/70 transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: color.value }}
              title={color.name}
              onClick={() => editor.chain().focus().setHighlight({ color: color.value }).run()}
            />
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().unsetHighlight().run()}>
            <Eraser className="mr-2 h-4 w-4" />
            Remover destaque
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) {
    return raw;
  }
  return `https://${raw}`;
}
