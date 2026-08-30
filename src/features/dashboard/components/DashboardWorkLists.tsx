import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, PRIORITY_LABELS, translate } from "@/features/reports/labels";
import type { DashboardCardItem, DashboardFavoriteProcess, DashboardProcessingItem } from "../types";
import { formatDue, isDuePast } from "../utils";

function Panel({
  title,
  actionLabel,
  onAction,
  children,
  empty,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="min-w-0 rounded-[12px] border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
          <Eye />
        </Button>
      </div>
      {empty ? (
        <p className="px-4 py-8 text-sm leading-6 text-muted-foreground">Nenhum item para mostrar neste recorte.</p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}

function Row({
  title,
  meta,
  href,
  badge,
}: {
  title: string;
  meta: string;
  href: string;
  badge?: string;
}) {
  const navigate = useNavigate();
  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(href)}
        className="flex w-full min-h-12 items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{title}</span>
          <span className="block truncate text-sm text-muted-foreground">{meta}</span>
        </span>
        {badge ? (
          <span className="shrink-0 text-xs text-muted-foreground">{badge}</span>
        ) : null}
      </button>
    </li>
  );
}

export function DashboardMyCards({ items }: { items: DashboardCardItem[] }) {
  const navigate = useNavigate();
  return (
    <Panel title="Meus cards" actionLabel="Abrir quadros" onAction={() => navigate("/documents/cases/quadros")} empty={!items.length}>
      {items.map((card) => (
        <Row
          key={card.id}
          href={card.href}
          title={card.title}
          meta={`${card.board} · ${translate(PRIORITY_LABELS, card.priority)}`}
          badge={isDuePast(card.due_date) ? `Atrasado ${formatDue(card.due_date)}` : formatDue(card.due_date)}
        />
      ))}
    </Panel>
  );
}

export function DashboardFavoriteProcesses({ items }: { items: DashboardFavoriteProcess[] }) {
  const navigate = useNavigate();
  return (
    <Panel
      title="Processos favoritos"
      actionLabel="Consultas"
      onAction={() => navigate("/documents/cases/queries")}
      empty={!items.length}
    >
      {items.map((process) => (
        <Row
          key={process.id}
          href={process.href}
          title={process.cnj}
          meta={process.title || process.tribunal}
          badge={process.tribunal}
        />
      ))}
    </Panel>
  );
}

export function DashboardRecentProcessings({ items }: { items: DashboardProcessingItem[] }) {
  const navigate = useNavigate();
  return (
    <Panel
      title="Últimos processamentos"
      actionLabel="Folha"
      onAction={() => navigate("/documents/payroll")}
      empty={!items.length}
    >
      {items.map((item) => (
        <Row
          key={`${item.kind}-${item.id}`}
          href={item.href}
          title={item.title}
          meta={item.company}
          badge={translate(STATUS_LABELS, item.status)}
        />
      ))}
    </Panel>
  );
}
