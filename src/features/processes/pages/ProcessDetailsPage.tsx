import { ArrowLeft, Bell, BellOff, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { processRoutes } from "../constants";
import { useProcessDetails, useToggleFavorite, useToggleProcessMonitoring } from "../hooks/useProcesses";
import { ProcessBreadcrumbs } from "../components/ProcessBreadcrumbs";
import { ProcessInfoHighlights } from "../components/ProcessInfoHighlights";

export default function ProcessDetailsPage() {
  const navigate = useNavigate();
  const { caseId = "" } = useParams();
  const { data: process, isLoading } = useProcessDetails(caseId);
  const toggleFavorite = useToggleFavorite();
  const toggleMonitoring = useToggleProcessMonitoring();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando detalhes do processo...</div>;
  }

  if (!process) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold">Processo nao encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          O processo solicitado nao esta disponivel na listagem atual.
        </p>
        <Button className="mt-4" onClick={() => navigate(processRoutes.queries)}>
          Voltar para consultas
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <ProcessBreadcrumbs
          items={[
            { label: "Processos", href: processRoutes.dashboard },
            { label: "Consultas Processuais", href: processRoutes.queries },
            { label: process.cnj },
          ]}
        />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <Button variant="ghost" className="gap-2 px-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight">
                {process.activeParty} x {process.passiveParty}
              </h1>
              <p className="break-all text-sm text-muted-foreground">{process.cnj}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-auto xl:justify-end">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() =>
                toggleFavorite.mutate(process.id, {
                  onSuccess: () => toast({ title: "Favorito atualizado" }),
                })
              }
            >
              <Star className={`mr-2 h-4 w-4 ${process.favorite ? "fill-amber-400 text-amber-400" : ""}`} />
              {process.favorite ? "Remover favorito" : "Favoritar processo"}
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                toggleMonitoring.mutate(process.id, {
                  onSuccess: () => toast({ title: "Monitoramento atualizado" }),
                })
              }
            >
              {process.monitored ? (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Desativar monitoramento
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Ativar monitoramento
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ProcessInfoHighlights process={process} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Resumo do processo</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{process.summary}</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Partes envolvidas</h2>
          <div className="mt-3 space-y-3">
            {process.parties.map((party) => (
              <div key={`${party.name}-${party.document}`} className="rounded-xl border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-words font-medium">{party.name}</p>
                  <Badge variant="outline">{party.side}</Badge>
                </div>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {party.documentType}: {party.document}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="movements" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex h-auto w-max min-w-full justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="movements">Movimentação Processual</TabsTrigger>
          <TabsTrigger value="information">Informações</TabsTrigger>
          <TabsTrigger value="attachments">Anexos</TabsTrigger>
          <TabsTrigger value="related">Processos Relacionados</TabsTrigger>
          <TabsTrigger value="agent">E7 Agente Processual</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="movements">
          <Card className="p-5">
            <div className="space-y-4">
              {process.movements.map((movement) => (
                <div key={movement.id} className="rounded-xl border-l-2 border-primary bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{movement.title}</p>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{movement.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{movement.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="information">
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Classe processual</p>
                <p className="font-medium">{process.classProcessual}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assuntos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {process.assuntos.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data da consulta</p>
                <p className="font-medium">{process.createdAt}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última movimentação</p>
                <p className="font-medium">{process.lastMovement}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="attachments">
          <Card className="p-5">
            <div className="space-y-3">
              {process.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{attachment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {attachment.type} • {attachment.size} • {attachment.createdAt}
                    </p>
                  </div>
                  <Button className="w-full sm:w-auto" variant="outline">Baixar</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="related">
          <Card className="p-5">
            <div className="space-y-3">
              {process.relatedProcesses.length > 0 ? (
                process.relatedProcesses.map((related) => (
                  <div key={related.id} className="rounded-xl border p-4">
                    <p className="font-medium">{related.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{related.cnj}</p>
                    <Badge variant="outline" className="mt-3">
                      {related.relationship}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhum processo relacionado identificado ate o momento.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="agent">
          <Card className="p-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">E7 Agente Processual</h2>
                <p className="text-sm text-muted-foreground">
                  Estrutura preparada para resumo automático, análise de movimentações, classificação inteligente e insights preditivos.
                </p>
              </div>

              {process.agentInsights.map((insight) => (
                <div key={insight.title} className="rounded-xl border bg-muted/40 p-4">
                  <p className="font-medium">{insight.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
