import { Bell, BellOff, Radar, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { processRoutes } from "../constants";
import {
  useProcessMonitoring,
  useToggleDocumentMonitoring,
  useToggleFavorite,
  useToggleProcessMonitoring,
} from "../hooks/useProcesses";
import { ProcessStatusBadge } from "../components/ProcessStatusBadge";

export default function ProcessMonitoringPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProcessMonitoring();
  const toggleFavorite = useToggleFavorite();
  const toggleProcessMonitoring = useToggleProcessMonitoring();
  const toggleDocumentMonitoring = useToggleDocumentMonitoring();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Monitoramentos</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Monitoramento duplo para acompanhar novas ações por documento e movimentações de processos específicos em uma cobertura completa.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Processos monitorados</p>
              <p className="text-3xl font-semibold">{data?.monitoredProcesses.length ?? 0}</p>
            </div>
            <Bell className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Documentos monitorados</p>
              <p className="text-3xl font-semibold">{data?.monitoredDocuments.filter((item) => item.status === "Ativo").length ?? 0}</p>
            </div>
            <Radar className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alertas recentes</p>
              <p className="text-3xl font-semibold">{data?.feed.length ?? 0}</p>
            </div>
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Monitoramento processual</h2>
            <p className="text-sm text-muted-foreground">
              Ative ou pause processos específicos consultados por CNJ para receber novas notificações.
            </p>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando monitoramentos...</p>
            ) : data?.monitoredProcesses.length ? (
              data.monitoredProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <Button
                      variant="link"
                      className="h-auto whitespace-normal p-0 text-left text-base font-semibold text-foreground"
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

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() =>
                        toggleFavorite.mutate(process.id, {
                          onSuccess: () => toast({ title: "Favorito atualizado" }),
                        })
                      }
                    >
                      Favoritar
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() =>
                        toggleProcessMonitoring.mutate(process.id, {
                          onSuccess: () => toast({ title: "Monitoramento processual atualizado" }),
                        })
                      }
                    >
                      {process.monitored ? "Desativar monitoramento" : "Ativar monitoramento"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum processo em monitoramento. Ative um sino no detalhe do processo para iniciar o acompanhamento.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Monitoramento de novas ações</h2>
              <p className="text-sm text-muted-foreground">
                Documentos monitorados de forma independente para novas distribuições, mandados e restrições.
              </p>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando documentos monitorados...</p>
              ) : (
                data?.monitoredDocuments.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.documentType}</Badge>
                          <Badge variant={item.status === "Ativo" ? "default" : "secondary"}>{item.status}</Badge>
                        </div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.documentValue}</p>
                        <p className="text-sm text-muted-foreground">{item.scope}</p>
                      </div>

                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
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

          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Feed de alertas</h2>
              <p className="text-sm text-muted-foreground">Notificações recentes enviadas para a sessão de processos.</p>
            </div>

            <div className="space-y-4">
              {data?.feed.map((item) => (
                <div key={item.id} className="rounded-xl border-l-2 border-primary bg-muted/40 p-4">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.createdAt}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
