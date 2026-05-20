import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PostMessageWithAuthor } from "../../types";

interface ThreadSearchBoxProps {
  messages: PostMessageWithAuthor[];
  className?: string;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function messageMatches(msg: PostMessageWithAuthor, query: string) {
  const q = normalize(query);
  if (msg.content_text && normalize(msg.content_text).includes(q)) return true;
  if (msg.author?.name && normalize(msg.author.name).includes(q)) return true;
  return false;
}

export function ThreadSearchBox({ messages, className }: ThreadSearchBoxProps) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(t);
  }, [term]);

  const matchIds = useMemo(() => {
    if (debounced.length < 1) return [];
    return messages.filter((m) => messageMatches(m, debounced)).map((m) => m.id);
  }, [messages, debounced]);

  const setHighlight = useCallback(
    (messageId: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (messageId) next.set("messageId", messageId);
        else next.delete("messageId");
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setMatchIndex(0);
  }, [debounced]);

  useEffect(() => {
    if (matchIds.length === 0) {
      if (debounced) setHighlight(null);
      return;
    }
    const safeIndex = matchIndex >= matchIds.length ? 0 : matchIndex;
    if (safeIndex !== matchIndex) setMatchIndex(safeIndex);
    setHighlight(matchIds[safeIndex]);
  }, [matchIds, matchIndex, debounced, setHighlight]);

  function clear() {
    setTerm("");
    setDebounced("");
    setMatchIndex(0);
    setHighlight(null);
  }

  function goNext() {
    if (matchIds.length === 0) return;
    setMatchIndex((i) => (i + 1) % matchIds.length);
  }

  function goPrev() {
    if (matchIds.length === 0) return;
    setMatchIndex((i) => (i - 1 + matchIds.length) % matchIds.length);
  }

  const hasQuery = debounced.length >= 1;
  const hasMatches = matchIds.length > 0;
  const counter =
    hasQuery && hasMatches ? `${matchIndex + 1}/${matchIds.length}` : hasQuery ? "0/0" : null;

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) goPrev();
                else goNext();
              }
              if (e.key === "Escape") clear();
            }}
            placeholder="Buscar na conversa…"
            className="h-8 pl-7 pr-2 text-xs"
            aria-label="Buscar mensagens na conversa"
          />
        </div>

        {hasQuery && hasMatches && matchIds.length > 1 && (
          <div className="flex items-center shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goPrev}
              title="Resultado anterior (Shift+Enter)"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goNext}
              title="Próximo resultado (Enter)"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {counter && (
          <span
            className={
              "text-[11px] tabular-nums shrink-0 min-w-[2.25rem] text-center " +
              (hasMatches ? "text-muted-foreground" : "text-destructive")
            }
            aria-live="polite"
          >
            {counter}
          </span>
        )}

        {term && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={clear}
            title="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
