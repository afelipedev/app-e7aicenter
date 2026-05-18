import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MessageCircle, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchService } from "../../services/searchService";

interface ChannelSearchBoxProps {
  channelId?: string;
  teamSlug: string;
  channelSlug: string;
}

export function ChannelSearchBox({ channelId, teamSlug, channelSlug }: ChannelSearchBoxProps) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useQuery({
    queryKey: ["teams", "search", debounced, channelId ?? null],
    queryFn: () => searchService.search(debounced, { channelId }),
    enabled: debounced.length > 1 && open,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function goToPost(postId: string, messageId?: string) {
    const base = `/teams/${teamSlug}/${channelSlug}/${postId}`;
    navigate(messageId ? `${base}?messageId=${messageId}` : base);
    setOpen(false);
  }

  function clear() {
    setTerm("");
    setDebounced("");
    setOpen(false);
  }

  const hasQuery = debounced.length > 1;
  const empty = data && data.posts.length === 0 && data.messages.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            placeholder="Filtrar postagens por palavra-chave ou autor…"
            className="pl-8"
          />
        </div>
        {term && (
          <Button variant="ghost" size="icon" onClick={clear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && hasQuery && (
        <Card className="absolute z-20 mt-1 w-full max-h-96 overflow-y-auto shadow-lg">
          {isFetching ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>
          ) : empty ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              Nenhum resultado para "{debounced}"
            </div>
          ) : (
            <>
              {data && data.posts.length > 0 && (
                <div className="border-b last:border-b-0">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Postagens ({data.posts.length})
                  </p>
                  <ul>
                    {data.posts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => goToPost(p.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{p.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.author?.name ?? "Usuário"}
                              {p.description_text ? ` · ${p.description_text}` : ""}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data && data.messages.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Mensagens ({data.messages.length})
                  </p>
                  <ul>
                    {data.messages.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => goToPost(m.post_id, m.id)}
                          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        >
                          <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{m.author?.name ?? "Usuário"}</span>
                            </div>
                            <div className="text-sm line-clamp-2">{m.content_text}</div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
