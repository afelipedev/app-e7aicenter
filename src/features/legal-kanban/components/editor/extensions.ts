import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export function createEmptyRichTextDoc() {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export function buildLegalKanbanEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Underline,
    Highlight.configure({
      multicolor: true,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: {
        class: "kanban-rich-text-editor__image",
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
  ];
}
