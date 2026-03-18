import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  DatabaseZap,
  Filter,
  Receipt,
  RefreshCw,
  SearchCode,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProcessApiConsumption } from "../hooks/useProcesses";
import {
  emptyApiConsumptionFilters,
  type ApiConsumptionBillingStatus,
  type ApiConsumptionCostConfidence,
  type ApiConsumptionQueryParams,
} from "../types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const dateLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const today = new Date();
const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .slice(0, 10);
const defaultEndDate = today.toISOString().slice(0, 10);

const searchTypeOptions = [
  { label: "Todos os tipos", value: "all" },
  { label: "CNJ", value: "lawsuit_cnj" },
  { label: "CPF", value: "cpf" },
  { label: "CNPJ", value: "cnpj" },
  { label: "OAB", value: "oab" },
  { label: "Nome", value: "name" },
];

const billingStatusLabel: Record<ApiConsumptionBillingStatus, string> = {
  within_plan: "Dentro da franquia",
  additional_billing: "Cobrança adicional em andamento",
  threshold_reached: "Limite mensal atingido",
};

const confidenceLabel: Record<ApiConsumptionCostConfidence, string> = {
  exact: "Exato",
  estimated: "Estimado",
  pending_enrichment: "Aguardando enriquecimento",
  unknown: "Não classificado",
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(parsed);
};

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateLabelFormatter.format(parsed);
};

const getProgressValue = (consumedAmountBrl: number, maxMonthlyAmountBrl: number) => {
  if (maxMonthlyAmountBrl <= 0) {
    return 0;
  }

  return Math.min(100, (consumedAmountBrl / maxMonthlyAmountBrl) * 100);
};

const getStatusAlertTone = (status: ApiConsumptionBillingStatus) => {
  if (status === "threshold_reached") {
    return "destructive" as const;
  }

  return "default" as const;
};

export default function ProcessApiConsumptionPage() {
  const [draftStartDate, setDraftStartDate] = useState(defaultStartDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultEndDate);
  const [draftOrigin, setDraftOrigin] = useState("all");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftSearchType, setDraftSearchType] = useState("all");
  const [draftProductName, setDraftProductName] = useState("all");
  const [draftWithAttachments, setDraftWithAttachments] = useState("all");
  const [draftOnDemand, setDraftOnDemand] = useState("all");
  const [page, setPage] = useState(1);
  const [appliedParams, setAppliedParams] = useState<ApiConsumptionQueryParams>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    page: 1,
    pageSize: 20,
    filters: emptyApiConsumptionFilters,
  });

  const queryParams = useMemo(
    () => ({
      ...appliedParams,
      page,
    }),
    [appliedParams, page],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useProcessApiConsumption(queryParams);

  const productOptions = useMemo(
    () =>
      (data?.breakdownByProduct ?? []).map((item) => ({
        label: item.label,
        value: item.label,
      })),
    [data?.breakdownByProduct],
  );

  const applyFilters = () => {
    setPage(1);
    setAppliedParams({
      startDate: draftStartDate,
      endDate: draftEndDate,
      page: 1,
      pageSize: 20,
      filters: {
        origin: draftOrigin === "all" ? [] : [draftOrigin],
        status: draftStatus === "all" ? [] : [draftStatus],
        searchType: draftSearchType === "all" ? [] : [draftSearchType],
        productName: draftProductName === "all" ? [] : [draftProductName],
        withAttachments:
          draftWithAttachments === "all"
            ? null
            : draftWithAttachments === "with_attachments",
        onDemand:
          draftOnDemand === "all" ? null : draftOnDemand === "on_demand",
      },
    });
  };

  const clearFilters = () => {
    setDraftStartDate(defaultStartDate);
    setDraftEndDate(defaultEndDate);
    setDraftOrigin("all");
    setDraftStatus("all");
    setDraftSearchType("all");
    setDraftProductName("all");
    setDraftWithAttachments("all");
    setDraftOnDemand("all");
    setPage(1);
    setAppliedParams({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      page: 1,
      pageSize: 20,
      filters: emptyApiConsumptionFilters,
    });
  };

  const statusColorClass =
    data?.summary.billingStatus === "threshold_reached"
      ? "text-destructive"
      : data?.summary.billingStatus === "additional_billing"
        ? "text-amber-500"
        : "text-emerald-500";

  const progressValue = data
    ? getProgressValue(
        data.summary.consumedAmountBrl,
        data.summary.maxMonthlyAmountBrl,
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Consumo API Judit</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Acompanhe o saldo contratado, o excedente faturável e o histórico real de
          requisições da Judit com classificação por produto, origem e custo estimado.
        </p>
      </div>

      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-5">
        <div className="grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="consumption-start">
              Data inicial
            </label>
            <Input
              id="consumption-start"
              type="date"
              value={draftStartDate}
              onChange={(event) => setDraftStartDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="consumption-end">
              Data final
            </label>
            <Input
              id="consumption-end"
              type="date"
              value={draftEndDate}
              onChange={(event) => setDraftEndDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Origem</label>
            <Select value={draftOrigin} onValueChange={setDraftOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="tracking">Monitoramento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={draftStatus} onValueChange={setDraftStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="mt-auto w-full xl:w-auto" onClick={applyFilters}>
            <Filter className="mr-2 h-4 w-4" />
            Aplicar
          </Button>

          <Button
            className="mt-auto w-full xl:w-auto"
            variant="outline"
            onClick={() => refetch()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de busca</label>
            <Select value={draftSearchType} onValueChange={setDraftSearchType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {searchTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Produto</label>
            <Select value={draftProductName} onValueChange={setDraftProductName}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {productOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Anexos</label>
            <Select value={draftWithAttachments} onValueChange={setDraftWithAttachments}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with_attachments">Com anexos</SelectItem>
                <SelectItem value="without_attachments">Sem anexos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">On demand</label>
            <Select value={draftOnDemand} onValueChange={setDraftOnDemand}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="on_demand">Sim</SelectItem>
                <SelectItem value="not_on_demand">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Período aplicado: {queryParams.startDate} até {queryParams.endDate}
          </div>
          <Button variant="ghost" className="px-0 text-sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Falha ao consultar o relatório da Judit</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Não foi possível carregar os dados de consumo agora."}
          </AlertDescription>
        </Alert>
      ) : null}

      {data ? (
        <>
          <Alert variant={getStatusAlertTone(data.summary.billingStatus)}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className={statusColorClass}>
              {billingStatusLabel[data.summary.billingStatus]}
            </AlertTitle>
            <AlertDescription>
              Consumo acumulado de {currencyFormatter.format(data.summary.consumedAmountBrl)} no
              período consultado. Franquia contratada de{" "}
              {currencyFormatter.format(data.summary.includedPlanBrl)} e limite operacional mensal
              de {currencyFormatter.format(data.summary.maxMonthlyAmountBrl)}.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Consumo do período</p>
                  <p className="text-2xl font-semibold">
                    {currencyFormatter.format(data.summary.consumedAmountBrl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.summary.totalRequests} requisições consolidadas
                  </p>
                </div>
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo da franquia</p>
                  <p className="text-2xl font-semibold">
                    {currencyFormatter.format(data.summary.remainingIncludedAmountBrl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Base contratada: {currencyFormatter.format(data.summary.includedPlanBrl)}
                  </p>
                </div>
                <DatabaseZap className="h-5 w-5 text-primary" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Excedente atual</p>
                  <p className="text-2xl font-semibold">
                    {currencyFormatter.format(data.summary.overageAmountBrl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cobrança adicional após esgotar a franquia
                  </p>
                </div>
                <Receipt className="h-5 w-5 text-primary" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Até bloqueio</p>
                  <p className="text-2xl font-semibold">
                    {currencyFormatter.format(data.summary.remainingUntilBlockAmountBrl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Limite total: {currencyFormatter.format(data.summary.maxMonthlyAmountBrl)}
                  </p>
                </div>
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Mix operacional</p>
                  <p className="text-2xl font-semibold">
                    {data.summary.apiRequests}/{data.summary.trackingRequests}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    API direta / monitoramento
                  </p>
                </div>
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Janela financeira do contrato
                </p>
                <h2 className="text-lg font-semibold">
                  {currencyFormatter.format(data.summary.consumedAmountBrl)} de{" "}
                  {currencyFormatter.format(data.summary.maxMonthlyAmountBrl)}
                </h2>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Último sync: {formatDateTime(data.sync?.finished_at ?? data.sync?.started_at ?? null)}</p>
                <p>
                  {data.sync?.requests_imported ?? 0} imports em {data.sync?.pages_fetched ?? 0} página(s)
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <Progress value={progressValue} className="h-3" />
              <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
                <span>Franquia: {currencyFormatter.format(data.summary.includedPlanBrl)}</span>
                <span>Excedente: {currencyFormatter.format(data.summary.overageAmountBrl)}</span>
                <span>Restante até bloqueio: {currencyFormatter.format(data.summary.remainingUntilBlockAmountBrl)}</span>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Evolução diária</h2>
                <p className="text-sm text-muted-foreground">
                  Volume de requisições e custo acumulado por dia no período selecionado.
                </p>
              </div>

              <ChartContainer
                className="h-[280px] w-full"
                config={{
                  totalCostBrl: { label: "Custo", color: "hsl(var(--primary))" },
                }}
              >
                <AreaChart data={data.dailySeries}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDateLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${Number(value).toFixed(0)}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="totalCostBrl"
                    stroke="var(--color-totalCostBrl)"
                    fill="var(--color-totalCostBrl)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Custo por produto</h2>
                <p className="text-sm text-muted-foreground">
                  Consolidação dos serviços efetivamente classificados pela integração.
                </p>
              </div>

              <ChartContainer
                className="h-[280px] w-full"
                config={{
                  totalCostBrl: { label: "Custo", color: "hsl(var(--primary))" },
                }}
              >
                <BarChart data={data.breakdownByProduct.slice(0, 6)}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => String(value).replace("Consulta ", "")}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${Number(value).toFixed(0)}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalCostBrl" radius={[8, 8, 0, 0]} fill="var(--color-totalCostBrl)" />
                </BarChart>
              </ChartContainer>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">Histórico detalhado</h2>
                <p className="text-sm text-muted-foreground">
                  Cada linha mostra a classificação inferida, o tipo de custo e o nível de confiança do cálculo.
                </p>
              </div>
              <Badge variant="outline" className="gap-2">
                <SearchCode className="h-4 w-4" />
                {isLoading ? "Carregando" : `${data.pagination.total} registro(s)`}
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.length > 0 ? (
                  data.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium">{entry.requestId}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.searchType ?? "Sem tipo"} / {entry.responseType ?? "Sem retorno"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Chave: {entry.searchKeyMasked ?? "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p>{formatDateTime(entry.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado: {formatDateTime(entry.updatedAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {entry.origin === "tracking" ? "Monitoramento" : "API"}
                          </Badge>
                          {entry.hasOverage ? (
                            <Badge variant="outline">Excedente</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium">{entry.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Confiança: {confidenceLabel[entry.costConfidence]}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-2">
                          {entry.withAttachments ? <Badge variant="outline">Anexos</Badge> : null}
                          {entry.onDemand ? <Badge variant="outline">On demand</Badge> : null}
                          {entry.publicSearch ? <Badge variant="outline">Busca pública</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Badge variant={entry.status === "error" ? "outline" : "secondary"}>
                            {entry.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            Tipo: {entry.costType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <p className="font-semibold">
                          {currencyFormatter.format(entry.costBrl)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.returnedItemsCount != null
                            ? `${entry.returnedItemsCount} item(ns) retornados`
                            : "Sem contagem enriquecida"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      {isLoading
                        ? "Carregando histórico..."
                        : "Nenhuma requisição encontrada para o período e filtros aplicados."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5 text-sm">
              <p className="text-muted-foreground">
                Página {data.pagination.page} de {data.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={data.pagination.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(data.pagination.totalPages, current + 1),
                    )
                  }
                  disabled={data.pagination.page >= data.pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
