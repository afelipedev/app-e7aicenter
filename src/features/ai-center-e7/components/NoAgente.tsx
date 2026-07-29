import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { categoriaDoTipo, defNo } from "../nodes/catalogo";

// Renderer generico de no: mostra rotulo + categoria com cor e um resumo dos dados.
export function NoAgente({ type, data, selected }: NodeProps) {
  const def = defNo(type);
  const cat = categoriaDoTipo(type);
  const dados = (data ?? {}) as Record<string, unknown>;
  const resumo = resumirDados(type, dados);

  return (
    <div className={cn(
      "rounded-lg border-2 bg-background shadow-sm px-3 py-2 min-w-[150px] max-w-[220px]",
      cat.cor.split(" ")[0],
      selected && "ring-2 ring-primary ring-offset-1",
    )}>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className={cn("text-[10px] font-semibold uppercase tracking-wide", cat.cor.split(" ")[1])}>{cat.rotulo}</div>
      <div className="text-sm font-medium leading-tight">{def?.rotulo ?? type}</div>
      {resumo && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{resumo}</div>}
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}

function resumirDados(tipo: string, d: Record<string, unknown>): string {
  switch (tipo) {
    case "modelo": return `${d.modelo ?? ""} · temp ${d.temperatura ?? ""}`;
    case "rag": return `${(d.baseIds as string[])?.length ?? 0} base(s)`;
    case "memoria": return `${d.tipo ?? "sessao"} · ${d.janela ?? 15}`;
    case "saida": return `formato: ${d.formato ?? "markdown"}`;
    case "ferramenta.http": return String(d.url ?? "");
    case "condicao.if": return `se ${d.condicao ?? ""}`;
    case "contexto": return d.texto ? String(d.texto).slice(0, 60) : "sem contexto fixo";
    case "prompt": return d.objetivo ? String(d.objetivo).slice(0, 60) : "";
    default: return "";
  }
}
