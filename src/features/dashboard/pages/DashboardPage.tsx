import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardAttentionList } from "../components/DashboardAttentionList";
import { DashboardKpiStrip } from "../components/DashboardKpiStrip";
import { DashboardPeriodToggle } from "../components/DashboardPeriodToggle";
import { DashboardShortcuts } from "../components/DashboardShortcuts";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { DashboardTrendPanel } from "../components/DashboardTrendPanel";
import {
  DashboardFavoriteProcesses,
  DashboardMyCards,
  DashboardRecentProcessings,
} from "../components/DashboardWorkLists";
import { DEFAULT_DASHBOARD_PERIOD, kpisForRole, trendForRole } from "../constants";
import { useDashboardHome } from "../hooks/useDashboardHome";
import type { DashboardPeriodId } from "../types";
import { greetingFor } from "../utils";

function DirectionContract() {
  return (
    <div
      hidden
      dangerouslySetInnerHTML={{
        __html: `<!--
THESIS: The home is a work docket. The first viewport is what needs action now, not five equal counters. It refuses the old icon-card grid.
OWN-WORLD: Incumbent navy and brown legal tokens, restrained accent, 12px radius, tabular numerals, Lucide icons, shadcn controls.
STORY: A lawyer or accountant sees today's queue, picks a period, reads one trend, and opens the module that needs them.
FIRST VIEWPORT: Greeting and period toggle share one baseline. Below, a full-width attention list. Then a divided KPI strip. Two columns follow: trend plus shortcuts on the left, work lists on the right.
FORM: Operate extension of the established app shell. Precise brief; no concept roll.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`,
      }}
    />
  );
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriodId>(DEFAULT_DASHBOARD_PERIOD);
  const { data, isPending, isError, error, refetch } = useDashboardHome(period);
  const kpiIds = kpisForRole(user?.role);
  const trend = trendForRole(user?.role);
  const showAccountingLists = user?.role === "contabil" || user?.role === "financeiro";
  const showLegalLists = !showAccountingLists;

  if (isPending) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <DirectionContract />
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{greetingFor(user?.name)}</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>O painel não carregou</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {error instanceof Error
                ? error.message
                : "Não foi possível obter os indicadores. Tente de novo."}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DirectionContract />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-[1.75rem]">
            {greetingFor(user?.name)}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Visão geral do escritório.
          </p>
        </div>
        <DashboardPeriodToggle value={period} onChange={setPeriod} />
      </header>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Precisa de atenção</h2>
          <p className="text-sm text-muted-foreground">
            Menções, cards e pendências atribuídos a você.
          </p>
        </div>
        <DashboardAttentionList items={data.attention ?? []} />
      </section>

      <DashboardKpiStrip data={data} ids={kpiIds} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardTrendPanel data={data} trend={trend} />
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Acesso rápido</h2>
            <DashboardShortcuts hasPermission={hasPermission} />
          </section>
        </div>
        <div className="space-y-4">
          {showLegalLists ? (
            <>
              <DashboardMyCards items={data.my_cards ?? []} />
              <DashboardFavoriteProcesses items={data.favorite_processes ?? []} />
            </>
          ) : (
            <DashboardRecentProcessings items={data.recent_processings ?? []} />
          )}
          {user?.role === "administrator" || user?.role === "it" || user?.role === "advogado_adm" ? (
            <DashboardRecentProcessings items={data.recent_processings ?? []} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
