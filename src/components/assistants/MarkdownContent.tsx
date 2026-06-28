import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import { cn } from "@/lib/utils";

// Instância única do parser. HTML inline desabilitado (html:false) para evitar
// XSS — markdown-it escapa qualquer tag crua presente no conteúdo.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
});

// Garante que links abram em nova aba com rel seguro.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, idx, options, env, self);
};

interface MarkdownContentProps {
  content: string;
  /** Aplica variação de cores adequada a fundos escuros (mensagem do usuário). */
  inverted?: boolean;
  className?: string;
}

export function MarkdownContent({ content, inverted, className }: MarkdownContentProps) {
  const html = useMemo(() => md.render(content || ""), [content]);

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words dark:prose-invert",
        "prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2",
        "prose-pre:bg-black/40 prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none",
        inverted &&
          "prose-invert prose-headings:text-primary-foreground prose-strong:text-primary-foreground prose-a:text-primary-foreground prose-code:text-primary-foreground",
        className,
      )}
      style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
