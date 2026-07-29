import { useState } from "react";
import {
  Plus, Star, MessageSquare, FolderPlus, Folder, ChevronRight, MoreHorizontal,
  Pencil, Trash2, FolderInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ConversaAgente, ProjetoAgente } from "../types";

interface AcoesConversa {
  currentId: string | null;
  projetos: ProjetoAgente[];
  onSelecionar: (id: string) => void;
  onFavoritar: (c: ConversaAgente) => void;
  onRenomear: (c: ConversaAgente) => void;
  onExcluir: (c: ConversaAgente) => void;
  onMover: (c: ConversaAgente, projetoId: string | null) => void;
}

interface Props extends AcoesConversa {
  conversas: ConversaAgente[];
  onNova: () => void;
  onCriarProjeto: () => void;
  onRenomearProjeto: (p: ProjetoAgente) => void;
  onExcluirProjeto: (p: ProjetoAgente) => void;
}

export function ChatSidebarAgente({
  conversas, projetos, currentId, onNova, onSelecionar, onFavoritar, onRenomear,
  onExcluir, onMover, onCriarProjeto, onRenomearProjeto, onExcluirProjeto,
}: Props) {
  const acoes: AcoesConversa = { currentId, projetos, onSelecionar, onFavoritar, onRenomear, onExcluir, onMover };
  const favoritas = conversas.filter((c) => c.favorito);
  const semProjeto = conversas.filter((c) => !c.projeto_id);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button className="w-full justify-start gap-2" onClick={onNova}>
          <Plus className="w-4 h-4" /> Nova conversa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
        {favoritas.length > 0 && (
          <Secao titulo="Favoritos" icone={<Star className="w-3.5 h-3.5" />}>
            {favoritas.map((c) => <ItemConversa key={c.id} conversa={c} acoes={acoes} />)}
          </Secao>
        )}

        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Projetos</span>
            <button onClick={onCriarProjeto} title="Novo projeto" className="text-muted-foreground hover:text-foreground">
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
          {projetos.length === 0 && <p className="px-2 text-xs text-muted-foreground">Crie um projeto para agrupar conversas.</p>}
          {projetos.map((p) => (
            <ProjetoDobra key={p.id} projeto={p} conversas={conversas.filter((c) => c.projeto_id === p.id)}
              acoes={acoes} onRenomearProjeto={onRenomearProjeto} onExcluirProjeto={onExcluirProjeto} />
          ))}
        </div>

        <Secao titulo="Recentes" icone={<MessageSquare className="w-3.5 h-3.5" />}>
          {semProjeto.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
          ) : semProjeto.map((c) => <ItemConversa key={c.id} conversa={c} acoes={acoes} />)}
        </Secao>
      </div>
    </div>
  );
}

function Secao({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icone} {titulo}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ProjetoDobra({ projeto, conversas, acoes, onRenomearProjeto, onExcluirProjeto }: {
  projeto: ProjetoAgente; conversas: ConversaAgente[]; acoes: AcoesConversa;
  onRenomearProjeto: (p: ProjetoAgente) => void; onExcluirProjeto: (p: ProjetoAgente) => void;
}) {
  const [aberto, setAberto] = useState(true);
  return (
    <div>
      <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-muted/60">
        <button onClick={() => setAberto((a) => !a)} className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-sm min-w-0">
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform shrink-0", aberto && "rotate-90")} />
          <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate flex-1 text-left">{projeto.nome}</span>
          <span className="text-xs text-muted-foreground">{conversas.length}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRenomearProjeto(projeto)}><Pencil className="w-4 h-4 mr-2" /> Renomear</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onExcluirProjeto(projeto)}><Trash2 className="w-4 h-4 mr-2" /> Excluir projeto</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {aberto && (
        <div className="pl-4 space-y-0.5">
          {conversas.length === 0 ? <p className="px-2 py-1 text-xs text-muted-foreground">Vazio</p> :
            conversas.map((c) => <ItemConversa key={c.id} conversa={c} acoes={acoes} />)}
        </div>
      )}
    </div>
  );
}

// Data/hora curta da ultima atualizacao (ultima resposta) da conversa.
function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `Hoje ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}

function ItemConversa({ conversa, acoes }: { conversa: ConversaAgente; acoes: AcoesConversa }) {
  const { currentId, projetos, onSelecionar, onFavoritar, onRenomear, onExcluir, onMover } = acoes;
  const ativo = conversa.id === currentId;
  return (
    <div className={cn("group flex items-center gap-1 rounded-md pr-1", ativo ? "bg-muted" : "hover:bg-muted/60")}>
      <button onClick={() => onSelecionar(conversa.id)} className="flex-1 flex items-start gap-2 px-2 py-1.5 min-w-0 text-sm text-left">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
        <span className="min-w-0">
          <span className="block truncate">{conversa.titulo}</span>
          <span className="block text-[10px] text-muted-foreground">{formatarDataHora(conversa.atualizado_em)}</span>
        </span>
      </button>
      <button onClick={() => onFavoritar(conversa)} title={conversa.favorito ? "Remover dos favoritos" : "Favoritar"}
        className={cn("shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", conversa.favorito && "opacity-100")}>
        <Star className={cn("w-3.5 h-3.5", conversa.favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRenomear(conversa)}><Pencil className="w-4 h-4 mr-2" /> Renomear</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><FolderInput className="w-4 h-4 mr-2" /> Mover para</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onMover(conversa, null)}>Sem projeto</DropdownMenuItem>
              {projetos.length > 0 && <DropdownMenuSeparator />}
              {projetos.map((p) => <DropdownMenuItem key={p.id} onClick={() => onMover(conversa, p.id)}>{p.nome}</DropdownMenuItem>)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => onExcluir(conversa)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
