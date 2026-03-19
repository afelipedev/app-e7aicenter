import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Bot,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Gavel,
  Info,
  Landmark,
  Link2,
  Paperclip,
  RefreshCcw,
  Scale,
  ScrollText,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ProcessBreadcrumbs } from "../components/ProcessBreadcrumbs";
import { ProcessStatusBadge } from "../components/ProcessStatusBadge";
import { processRoutes } from "../constants";
import {
  useDeleteProcess,
  useProcessAgentSummary,
  useProcessDetails,
  useToggleProcessMonitoring,
} from "../hooks/useProcesses";
import type { ProcessDetail, ProcessParty } from "../types";

type ProcessDetailsTab = "movements" | "information" | "attachments" | "related" | "agent";

const monthLabels = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">{label}</p>
      <div className="text-sm font-medium leading-6 text-foreground/95">{value}</div>
    </div>
  );
}

function groupParties(parties: ProcessParty[]) {
  return parties.reduce(
    (accumulator, party) => {
      if (party.groupLabel === "Polo ativo" || party.side === "Ativo") {
        accumulator.active.push(party);
        return accumulator;
      }

      if (party.groupLabel === "Polo passivo" || party.side === "Passivo") {
        accumulator.passive.push(party);
        return accumulator;
      }

      accumulator.others.push(party);
      return accumulator;
    },
    {
      active: [] as ProcessParty[],
      passive: [] as ProcessParty[],
      others: [] as ProcessParty[],
    },
  );
}

function buildMovementGroups(movements: ProcessDetail["movements"]) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      sortValue: number;
      movements: ProcessDetail["movements"];
    }
  >();

  movements.forEach((movement) => {
    const [, month, year] = movement.date.split("/");
    const key = `${year}-${month}`;
    const sortValue = Number(`${year}${month}`);
    const label = `${monthLabels[Number(month) - 1] ?? month} de ${year}`;

    if (!groups.has(key)) {
      groups.set(key, { key, label, sortValue, movements: [] });
    }

    groups.get(key)?.movements.push(movement);
  });

  return Array.from(groups.values()).sort((left, right) => right.sortValue - left.sortValue);
}

function getPartyNames(parties: ProcessParty[], role?: string) {
  return parties
    .filter((party) => (role ? party.role === role : true))
    .map((party) => party.name)
    .join(", ");
}

function getCounsels(parties: ProcessParty[]) {
  return parties
    .map((party) => party.counsel)
    .filter(Boolean)
    .join(", ");
}

const actionIconButtonClassName =
  "rounded-full border-border/80 bg-background/80 text-foreground shadow-sm transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white focus-visible:ring-blue-600";

export default function ProcessDetailsPage() {
  const navigate = useNavigate();
  const { caseId = "" } = useParams();
  const [activeTab, setActiveTab] = useState<ProcessDetailsTab>("movements");
  const [pendingScrollTarget, setPendingScrollTarget] = useState<"other-parties" | null>(null);
  const otherPartiesRef = useRef<HTMLDivElement | null>(null);
  const { data: process, isLoading, isFetching, refetch } = useProcessDetails(caseId);
  const {
    data: agentSummary,
    isLoading: isAgentLoading,
    isFetching: isAgentFetching,
    refetch: refetchAgentSummary,
  } = useProcessAgentSummary(caseId, activeTab === "agent");
  const deleteProcess = useDeleteProcess();
  const toggleMonitoring = useToggleProcessMonitoring();
  const partyGroups = useMemo(() => groupParties(process?.parties ?? []), [process?.parties]);
  const movementGroups = useMemo(() => buildMovementGroups(process?.movements ?? []), [process?.movements]);
  const activeCounsels = useMemo(() => getCounsels(partyGroups.active), [partyGroups.active]);
  const passiveNames = useMemo(
    () => getPartyNames(partyGroups.passive, "Impetrado") || getPartyNames(partyGroups.passive),
    [partyGroups.passive],
  );
  const otherInterested = useMemo(
    () => getPartyNames(partyGroups.others, "Interessado") || getPartyNames(partyGroups.others),
    [partyGroups.others],
  );
  const mpfNames = useMemo(() => getPartyNames(partyGroups.others, "MPF"), [partyGroups.others]);
  const otherCounsels = useMemo(() => getPartyNames(partyGroups.others, "Advogado"), [partyGroups.others]);

  useEffect(() => {
    if (activeTab !== "information" || pendingScrollTarget !== "other-parties") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      otherPartiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollTarget(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, pendingScrollTarget]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando detalhes do processo...</div>;
  }

  if (!process) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold">Processo não encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          O processo solicitado não está disponível na listagem atual.
        </p>
        <Button className="mt-4" onClick={() => navigate(processRoutes.queries)}>
          Voltar para consultas
        </Button>
      </Card>
    );
  }

  const handleViewAllParties = () => {
    setActiveTab("information");
    setPendingScrollTarget("other-parties");
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-5">
        <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 shadow-sm backdrop-blur">
          <ProcessBreadcrumbs
            items={[
              { label: "Processos", href: processRoutes.dashboard },
              { label: "Consultas Processuais", href: processRoutes.queries },
              { label: process.cnj },
            ]}
          />
        </div>

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-4">
            <Button variant="ghost" className="gap-2 px-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="min-w-0 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/70">
                Detalhes do processo
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
                  {process.cnj} • {process.grade}
                </p>
                <ProcessStatusBadge status={process.status} />
              </div>

              <h1 className="max-w-6xl break-words text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground xl:text-[2rem]">
                {process.title}
              </h1>

              <p className="max-w-5xl break-words text-sm leading-7 text-muted-foreground">
                ASSUNTO: {process.assuntos.join(", ")}
              </p>
            </div>
          </div>

          <TooltipProvider delayDuration={120}>
            <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={actionIconButtonClassName}
                    aria-label="Atualizar processo"
                    onClick={async () => {
                      await refetch();
                      toast({ title: "Processo atualizado" });
                    }}
                  >
                    <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar processo</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={actionIconButtonClassName}
                    aria-label={process.monitored ? "Desativar monitoramento" : "Ativar monitoramento"}
                    onClick={() =>
                      toggleMonitoring.mutate(process.id, {
                        onSuccess: () => toast({ title: "Monitoramento atualizado" }),
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

              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(actionIconButtonClassName, "text-destructive hover:text-white")}
                        aria-label="Excluir processo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Excluir processo</p>
                  </TooltipContent>
                </Tooltip>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir processo da listagem?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação remove o processo consultado da listagem atual e mantém a experiência consistente com os demais fluxos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() =>
                        deleteProcess.mutate(process.id, {
                          onSuccess: () => {
                            toast({ title: "Processo removido da listagem" });
                            navigate(processRoutes.queries);
                          },
                        })
                      }
                    >
                      Excluir processo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-34px_rgba(16,185,129,0.45)]">
        <div className="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y xl:grid-cols-5 xl:divide-y-0">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/90 text-emerald-700 shadow-sm">
                <Building2 className="h-5 w-5" />
              </span>
              <DetailField label="Tribunal" value={process.tribunal} className="space-y-0" />
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/90 text-emerald-700 shadow-sm">
                <Wallet className="h-5 w-5" />
              </span>
              <DetailField label="Valor da causa" value={process.value} className="space-y-0" />
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/90 text-emerald-700 shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </span>
              <DetailField label="Distribuído em" value={process.distributedAt} className="space-y-0" />
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/90 text-emerald-700 shadow-sm">
                  <Users className="h-5 w-5" />
                </span>
                <DetailField
                  label="Partes"
                  value={`${process.parties.length} ${process.parties.length === 1 ? "parte" : "partes"}`}
                  className="space-y-0"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border/70 bg-white/80 shadow-sm hover:bg-white"
                    aria-label="Exibir resumo das partes"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[360px] rounded-2xl border-border/70 bg-background/95 p-5 shadow-xl backdrop-blur">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Polo ativo</p>
                      <p className="mt-1 text-sm font-medium leading-6">
                        {getPartyNames(partyGroups.active) || "Não informado"}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Polo passivo</p>
                      <p className="mt-1 text-sm font-medium leading-6">
                        {getPartyNames(partyGroups.passive) || "Não informado"}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Outras partes</p>
                      <p className="mt-1 text-sm font-medium leading-6">
                        {getPartyNames(partyGroups.others) || "Não informado"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="mt-4 h-auto w-full justify-start gap-2 rounded-xl px-3 py-3 text-primary hover:bg-primary/5 hover:text-primary/80"
                    onClick={handleViewAllParties}
                  >
                    <Users className="h-4 w-4" />
                    Ver todas as partes envolvidas ({process.parties.length})
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/90 text-emerald-700 shadow-sm">
                <Gavel className="h-5 w-5" />
              </span>
              <DetailField label="Status" value={<ProcessStatusBadge status={process.status} />} className="space-y-0" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[24px] border-border/70 bg-card/90 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-primary">
              <Landmark className="h-5 w-5" />
            </span>
            <DetailField label="Órgão julgador" value={process.orgaoJulgador} />
          </div>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-primary">
              <Scale className="h-5 w-5" />
            </span>
            <DetailField label="Classe processual" value={process.classProcessual} />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProcessDetailsTab)} className="space-y-6">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/35 p-1 shadow-sm">
            <TabsTrigger
              value="movements"
              className="flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary/15 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <ScrollText className="h-4 w-4 shrink-0" />
              Movimentação processual
            </TabsTrigger>
            <TabsTrigger
              value="information"
              className="flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary/15 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Info className="h-4 w-4 shrink-0" />
              Informações
            </TabsTrigger>
            <TabsTrigger
              value="attachments"
              className="flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary/15 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              Anexos
            </TabsTrigger>
            <TabsTrigger
              value="related"
              className="flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary/15 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Link2 className="h-4 w-4 shrink-0" />
              Processos relacionados
            </TabsTrigger>
            <TabsTrigger
              value="agent"
              className="flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary/15 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Bot className="h-4 w-4 shrink-0" />
              E7 Agente Processual
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="movements" className="space-y-4">
          <Accordion type="multiple" defaultValue={movementGroups.slice(0, 1).map((group) => group.key)} className="space-y-4">
            {movementGroups.map((group) => (
              <Card key={group.key} className="overflow-hidden rounded-[24px] border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                <AccordionItem value={group.key} className="border-none">
                  <AccordionTrigger className="px-6 py-5 hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-4 text-left">
                      <div className="space-y-1">
                        <p className="text-base font-semibold tracking-[-0.01em]">{group.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.movements.length} {group.movements.length === 1 ? "movimentação" : "movimentações"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                        {group.movements.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-6">
                      {group.movements.map((movement, index) => (
                        <div key={movement.id} className="relative pl-8">
                          {index < group.movements.length - 1 ? (
                            <span className="absolute left-[11px] top-7 h-[calc(100%+20px)] w-px bg-border" />
                          ) : null}

                          <span className="absolute left-0 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          </span>

                          <div className="rounded-[20px] border border-border/70 bg-muted/[0.18] p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-semibold text-foreground">{movement.title}</p>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                                {movement.date}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{movement.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="information" className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Dados do processo</h2>
              <p className="text-sm text-muted-foreground">
                Estrutura consolidada com os principais metadados processuais.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                <div className="grid gap-4">
                  <DetailField label="Tribunal de origem" value={process.originTribunal ?? process.tribunal} />
                  <DetailField label="Comarca" value={process.comarca ?? "Não informado"} />
                  <DetailField label="Cidade" value={process.city ?? "Não informado"} />
                  <DetailField label="Estado" value={process.state ?? "Não informado"} />
                  <DetailField label="Segmento da justiça" value={process.justiceSegment ?? "Não informado"} />
                  <DetailField label="Fase" value={process.phase ?? "Inicial"} />
                  <DetailField label="Distribuído em" value={process.distributedAt} />
                  <DetailField label="Valor da causa" value={process.value} />
                  <DetailField label="Classe processual" value={process.classProcessual} />
                </div>
              </Card>

              <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                <div className="grid gap-4">
                  <DetailField label="Juiz/Relator" value={process.judgeRelator ?? "Não informado"} />
                  <DetailField label="Grau do processo" value={process.grade} />
                  <DetailField label="Órgão julgador" value={process.orgaoJulgador} />
                  <DetailField label="Assuntos" value={process.assuntos.join(", ")} />
                </div>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Partes do processo</h2>
              <p className="text-sm text-muted-foreground">
                Agrupamento por polo para facilitar leitura e navegação da causa.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold">Polo ativo</p>
                    <p className="text-sm text-muted-foreground">
                      {partyGroups.active.length} {partyGroups.active.length === 1 ? "parte" : "partes"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailField label="Impetrante" value={getPartyNames(partyGroups.active) || "Não informado"} />
                  <DetailField
                    label="Documento"
                    value={
                      partyGroups.active[0]
                        ? `${partyGroups.active[0].documentType}: ${partyGroups.active[0].document}`
                        : "Não informado"
                    }
                  />
                  <DetailField label="Advogado" value={activeCounsels || "Não informado"} />
                </div>
              </Card>

              <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Landmark className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold">Polo passivo</p>
                    <p className="text-sm text-muted-foreground">
                      {partyGroups.passive.length} {partyGroups.passive.length === 1 ? "parte" : "partes"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailField label="Impetrado" value={passiveNames || "Não informado"} />
                  <DetailField
                    label="Documento"
                    value={
                      partyGroups.passive[0]
                        ? `${partyGroups.passive[0].documentType}: ${partyGroups.passive[0].document}`
                        : "Não informado"
                    }
                  />
                </div>
              </Card>

              <Card ref={otherPartiesRef} className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold">Outras partes</p>
                    <p className="text-sm text-muted-foreground">
                      {partyGroups.others.length} {partyGroups.others.length === 1 ? "parte" : "partes"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailField label="Interessado" value={otherInterested || "Não informado"} />
                  <DetailField label="MPF" value={mpfNames || "Não informado"} />
                  <DetailField label="Advogado(s)" value={otherCounsels || "Não informado"} />
                </div>
              </Card>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="attachments">
          <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
            <div className="space-y-3">
              {process.attachments.length > 0 ? process.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-muted/[0.16] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{attachment.name}</p>
                      <Badge variant="secondary">{attachment.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {attachment.size} • {attachment.createdAt}
                    </p>
                  </div>

                  <Button variant="outline" className="w-full sm:w-auto">
                    Baixar
                  </Button>
                </div>
              )) : (
                <div className="rounded-[20px] border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  Nenhum anexo foi disponibilizado pela consulta atual da Judit para este processo.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="related">
          <Card className="overflow-hidden rounded-[24px] border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_56px] gap-4 border-b bg-muted/30 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80 md:grid">
              <span>Nº processo</span>
              <span>Grau</span>
              <span>Classe</span>
              <span />
            </div>

            <div className="divide-y">
              {process.relatedProcesses.length > 0 ? (
                process.relatedProcesses.map((related) => (
                  <div
                    key={`${related.id}-${related.cnj}`}
                    className="grid gap-3 px-6 py-5 md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_56px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{related.cnj}</p>
                      <p className="text-sm text-muted-foreground">{related.title}</p>
                    </div>
                    <p className="text-sm font-medium">{related.grade ?? "-"}</p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{related.classProcessual ?? related.relationship}</p>
                      <p className="text-sm text-muted-foreground">{related.relationship}</p>
                    </div>
                    <div className="flex md:justify-end">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum processo relacionado identificado até o momento.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="agent">
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="rounded-[24px] border-0 bg-[linear-gradient(160deg,#0f172a,#111827_45%,#14532d)] p-6 text-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.85)]">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold">E7 Agente Processual</p>
                    <p className="text-sm text-white/70">Análise automatizada do processo</p>
                  </div>
                </div>

                <p className="text-sm leading-7 text-white/80">
                  {process.aiDisclaimer ??
                    "O E7 Agente Processual consolida as informações processuais mais recentes para apoiar leitura e tomada de decisão."}
                </p>

                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={async () => {
                    await refetchAgentSummary();
                    toast({ title: "Resumo do agente atualizado" });
                  }}
                  disabled={isAgentFetching}
                >
                  <RefreshCcw className={cn("mr-2 h-4 w-4", isAgentFetching && "animate-spin")} />
                  {isAgentFetching ? "Atualizando análise..." : "Atualizar análise"}
                </Button>
              </div>
            </Card>

            <div className="space-y-4">
              {isAgentLoading ? (
                <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 text-sm text-muted-foreground shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                  Gerando análise processual...
                </Card>
              ) : agentSummary ? (
                <>
                  {[
                    ["Sobre o resumo do processo", agentSummary.sections.summary],
                    ["Sobre partes envolvidas", agentSummary.sections.parties],
                    ["Sobre classificação", agentSummary.sections.classification],
                    ["Sobre assuntos", agentSummary.sections.subjects],
                    ["Sobre movimentações", agentSummary.sections.movements],
                  ].map(([title, description], index) => (
                    <Card
                      key={title}
                      className={cn(
                        "rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]",
                        index === 0 && "border-emerald-100 bg-emerald-50/45",
                      )}
                    >
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">{title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                      </div>
                    </Card>
                  ))}

                  <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">Observação do agente</p>
                      <p className="text-sm leading-6 text-muted-foreground">{agentSummary.sections.disclaimer}</p>
                    </div>
                  </Card>
                </>
              ) : (
                <Card className="rounded-[24px] border-border/70 bg-card/95 p-6 text-sm text-muted-foreground shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]">
                  Nenhuma análise automatizada está disponível para este processo.
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
