import { ArrowRight, Bell, History, SearchCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { processRoutes } from "../constants";
import { useProcessesDashboard } from "../hooks/useProcesses";
import { FavoriteProcessCard } from "../components/FavoriteProcessCard";
import { ProcessMetricCard } from "../components/ProcessMetricCard";

export default function ProcessesDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProcessesDashboard();
  const quickLinks = [
    {
      label: "Consultas processuais",
      helper: "Busca direta por CNJ e acesso rápido ao detalhe.",
      href: processRoutes.queries,
    },
    {
      label: "Consultas históricas",
      helper: "Localização por CPF, CNPJ ou OAB com consolidação.",
      href: processRoutes.history,
    },
    {
      label: "Monitoramentos",
      helper: "Acompanhamento ativo de processos e documentos.",
      href: processRoutes.monitoring,
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 shadow-sm backdrop-blur">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Visão central da operação processual
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <Card className="overflow-hidden rounded-[28px] border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))] p-7 shadow-[0_24px_60px_-34px_rgba(16,185,129,0.42)]">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/70">
                  Dashboard de processos
                </p>
                <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground xl:text-[2.2rem]">
                  Organização, consulta e leitura processual em um fluxo mais claro e consistente.
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  Acompanhe o volume operacional, retome processos priorizados e navegue entre consultas,
                  histórico e monitoramentos com a mesma linguagem visual aplicada na página de detalhes.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-full px-5" onClick={() => navigate(processRoutes.queries)}>
                  Ir para consultas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" className="rounded-full px-5" onClick={() => navigate(processRoutes.monitoring)}>
                  Ver monitoramentos
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-border/70 bg-card/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.52)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                  Navegação guiada
                </p>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Acessos prioritários</h2>
              </div>

              <div className="space-y-3">
                {quickLinks.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => navigate(link.href)}
                    className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-border/70 bg-muted/[0.18] px-4 py-4 text-left transition-colors hover:border-primary/20 hover:bg-primary/[0.04]"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{link.label}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{link.helper}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/85 text-muted-foreground shadow-sm">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Indicadores operacionais
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Panorama da base consultada</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {isLoading || !data ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56 w-full rounded-[24px]" />)
          ) : (
            <>
              <ProcessMetricCard
                title="Processos consultados"
                value={data.stats.queriedProcesses}
                helper="Base pronta para filtros, detalhamento e retomada das análises mais recentes."
                icon={SearchCheck}
                onViewAll={() => navigate(processRoutes.queries)}
              />
              <ProcessMetricCard
                title="Consultas históricas"
                value={data.stats.historicalQueries}
                helper="Resultados consolidados por CPF, CNPJ e OAB com leitura unificada."
                icon={History}
                onViewAll={() => navigate(processRoutes.history)}
              />
              <ProcessMetricCard
                title="Monitoramentos"
                value={data.stats.monitorings}
                helper="Processos e documentos acompanhados continuamente pela operação."
                icon={Bell}
                onViewAll={() => navigate(processRoutes.monitoring)}
              />
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Favoritos
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Processos priorizados pela operação</h2>
        </div>

        <Card className="rounded-[28px] border-border/70 bg-card/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.52)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Painel de acesso imediato</h3>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Capas resumidas dos processos marcados como favoritos, com leitura rápida e abertura direta do detalhe.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {isLoading || !data ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-80 w-full rounded-[24px]" />)
            ) : data.favorites.length > 0 ? (
              data.favorites.map((process) => (
                <FavoriteProcessCard
                  key={process.id}
                  process={process}
                  onOpen={(processId) => navigate(processRoutes.detail(processId))}
                />
              ))
            ) : (
              <div className="col-span-full rounded-[24px] border border-dashed border-border/70 bg-muted/[0.16] p-10 text-center text-sm leading-6 text-muted-foreground">
                Nenhum processo favoritado ainda. Use a estrela nas listagens para manter os casos mais estratégicos sempre em destaque.
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
