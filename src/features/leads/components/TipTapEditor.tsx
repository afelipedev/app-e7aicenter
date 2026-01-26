import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipTapJSON = Record<string, unknown>;

export function defaultTipTapDoc(): TipTapJSON {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export default function TipTapEditor({
  value,
  onChange,
  onEditorReady,
  className,
}: {
  value: TipTapJSON;
  onChange?: (nextJson: TipTapJSON, plainText: string) => void;
  onEditorReady?: (editor: Editor) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[180px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as TipTapJSON, editor.getText());
    },
  });

  // expor editor para o pai (para inserir placeholders etc.)
  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // se o pai trocar completamente o value (aplicar template), sincronizar
  useEffect(() => {
    if (!editor) return;
    // evita reset se o JSON for o mesmo (comparação simples por string)
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="text-sm text-muted-foreground">Carregando editor...</div>;
  }

  const ToolbarButton = ({
    active,
    onClick,
    disabled,
    children,
    title,
  }: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("h-8 w-8")}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-1 p-2">
        <ToolbarButton
          title="Negrito"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Itálico"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          title="Lista"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Citação"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          title="Desfazer"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Refazer"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <Separator />

      <EditorContent editor={editor} />
    </div>
  );
}

