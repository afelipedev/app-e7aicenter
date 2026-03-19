import { Bell, BellOff, Radar, ShieldAlert, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { processRoutes } from "../constants";
import {
  useProcessMonitoring,
  useToggleDocumentMonitoring,
  useToggleFavorite,
  useToggleProcessMonitoring,
} from "../hooks/useProcesses";
import { ProcessStatusBadge } from "../components/ProcessStatusBadge";

const actionIconButtonClassName =
  "rounded-full border-border/80 bg-background/80 text-foreground shadow-sm transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white focus-visible:ring-blue-600";

export default function ProcessMonitoringPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProcessMonitoring();
  const toggleFavorite = useToggleFavorite();
  const toggleProcessMonitoring = useToggleProcessMonitoring();
  const toggleDocumentMonitoring = useToggleDocumentMonitoring();

  return (
    <div className="space-y-8 pb-8">
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 shadow-sm backdrop-blur">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Cobertura contínua da operação
          </span>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))] p-7 shadow-[0_24px_60px_-34px_rgba(16,185,129,0.42)]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/70">
              Monitoramentos
            </p>
            <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground xl:text-[2.2rem]">
              Acompanhe processos e documentos com uma leitura mais clara, leve e orientada por prioridade.
            </h1>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
              Centralize o monitoramento processual e o acompanhamento de novas ações com melhor hierarquia visual,
              ações mais objetivas e feedback mais limpo para a operação.
            </p>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Panorama atual
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Indicadores de cobertura</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                  Processos monitorados
                </p>
                <p className="text-4xl font-semibold leading-none tracking-[-0.04em]">
                  {data?.monitoredProcesses.length ?? 0}
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 shadow-sm">
                <Bell className="h-5 w-5" />
              </span>
            </div>
          </Card>
          <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                  Documentos monitorados
                </p>
                <p className="text-4xl font-semibold leading-none tracking-[-0.04em]">
                  {data?.monitoredDocuments.filter((item) => item.status === "Ativo").length ?? 0}
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200/80 bg-sky-50/80 text-sky-700 shadow-sm">
                <Radar className="h-5 w-5" />
              </span>
            </div>
          </Card>
          <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                  Alertas recentes
                </p>
                <p className="text-4xl font-semibold leading-none tracking-[-0.04em]">
                  {data?.feed.length ?? 0}
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50/80 text-amber-700 shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </span>
            </div>
          </Card>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-[28px] border-border/70 bg-card/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.52)]">
          <div className="mb-6 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
              Monitoramento processual
            </p>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Processos acompanhados</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Ative ou pause processos específicos consultados por CNJ para receber novas notificações.
            </p>
          </div>

          <TooltipProvider delayDuration={120}>
            <div className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando monitoramentos...</p>
            ) : data?.monitoredProcesses.length ? (
              data.monitoredProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-muted/[0.14] p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-3">
                    <Button
                      variant="link"
                      className="h-auto whitespace-normal p-0 text-left text-lg font-semibold leading-7 tracking-[-0.02em] text-foreground"
                      onClick={() => navigate(processRoutes.detail(process.id))}
                    >
                      {process.activeParty} x {process.passiveParty}
                    </Button>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="break-all font-mono">{process.cnj}</span>
                      <span>{process.lastMovement}</span>
                    </div>
                    <ProcessStatusBadge status={process.status} />
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            actionIconButtonClassName,
                            process.favorite && "border-amber-300 bg-amber-50 text-amber-600 hover:border-amber-500 hover:bg-amber-500",
                          )}
                          aria-label={process.favorite ? "Remover dos favoritos" : "Favoritar processo"}
                          onClick={() =>
                            toggleFavorite.mutate(process.id, {
                              onSuccess: () => toast({ title: "Favorito atualizado" }),
                            })
                          }
                        >
                          <Star className={cn("h-4 w-4", process.favorite && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{process.favorite ? "Remover dos favoritos" : "Favoritar processo"}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            actionIconButtonClassName,
                            process.monitored && "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-500 hover:bg-rose-500",
                          )}
                          aria-label={process.monitored ? "Desativar monitoramento" : "Ativar monitoramento"}
                          onClick={() =>
                            toggleProcessMonitoring.mutate(process.id, {
                              onSuccess: () => toast({ title: "Monitoramento processual atualizado" }),
                            })
                          }
                        >
                          {process.monitored ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{process.monitored ? "Desativar monitoramento" : "Ativar monitoramento"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/[0.16] p-10 text-center text-sm leading-6 text-muted-foreground">
                Nenhum processo em monitoramento. Ative um sino no detalhe do processo para iniciar o acompanhamento.
              </div>
            )}
            </div>
          </TooltipProvider>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-border/70 bg-card/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.52)]">
            <div className="mb-6 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                Monitoramento documental
              </p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Monitoramento de novas ações</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Documentos monitorados de forma independente para novas distribuições, mandados e restrições.
              </p>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando documentos monitorados...</p>
              ) : (
                data?.monitoredDocuments.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-border/70 bg-muted/[0.14] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.documentType}</Badge>
                          <Badge variant={item.status === "Ativo" ? "default" : "secondary"}>{item.status}</Badge>
                        </div>
                        <p className="text-base font-semibold tracking-[-0.01em] text-foreground">{item.label}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{item.documentValue}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{item.scope}</p>
                      </div>

                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleDocumentMonitoring.mutate(item.id, {
                            onSuccess: () => toast({ title: "Monitoramento de documento atualizado" }),
                          })
                        }
                      >
                        {item.status === "Ativo" ? (
                          <>
                            <BellOff className="mr-2 h-4 w-4" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Bell className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-[28px] border-border/70 bg-card/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.52)]">
            <div className="mb-6 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                Feed operacional
              </p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Feed de alertas</h2>
              <p className="text-sm leading-6 text-muted-foreground">Notificações recentes enviadas para a sessão de processos.</p>
            </div>

            <div className="space-y-4">
              {data?.feed.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-border/70 bg-muted/[0.14] p-5">
                  <div className="space-y-2">
                    <p className="font-semibold tracking-[-0.01em] text-foreground">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                      {item.createdAt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
