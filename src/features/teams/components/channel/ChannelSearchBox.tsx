import { useState } from "react";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchService } from "../../services/searchService";

interface ChannelSearchBoxProps {
  channelId?: string;
}

export function ChannelSearchBox({ channelId }: ChannelSearchBoxProps) {
  const [term, setTerm] = useState("");
  const [active, setActive] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["teams", "search", active, channelId ?? null],
    queryFn: () => searchService.search(active, { channelId }),
    enabled: active.length > 1,
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setActive(term.trim())}
            placeholder="Buscar em postagens e mensagens…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => setActive(term.trim())}>Buscar</Button>
        {active && (
          <Button variant="ghost" size="icon" onClick={() => { setTerm(""); setActive(""); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {active && (
        <Card className="p-3 max-h-96 overflow-y-auto">
          {isFetching ? (
            <div className="text-xs text-muted-foreground">Buscando…</div>
          ) : !data || (data.posts.length === 0 && data.messages.length === 0) ? (
            <div className="text-xs text-muted-foreground">Nenhum resultado para "{active}"</div>
          ) : (
            <>
              {data.posts.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Postagens ({data.posts.length})</p>
                  <ul className="space-y-1">
                    {data.posts.map((p) => (
                      <li key={p.id} className="text-sm">
                        <span className="font-medium">{p.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.author?.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.messages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mensagens ({data.messages.length})</p>
                  <ul className="space-y-1">
                    {data.messages.map((m) => (
                      <li key={m.id} className="text-sm text-muted-foreground line-clamp-1">
                        <span className="font-medium text-foreground">{m.author?.name}:</span> {m.content_text}
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
