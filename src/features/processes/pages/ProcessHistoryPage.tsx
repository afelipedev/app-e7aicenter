import { useMemo, useState } from "react";
import { Bell, Filter, History, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { documentSearchOptions, processRoutes } from "../constants";
import {
  useDeleteProcess,
  useFilterOptions,
  useHistoricalQueries,
  useSearchHistoricalProcesses,
  useToggleDocumentSearchMonitoring,
  useToggleFavorite,
} from "../hooks/useProcesses";
import { emptyProcessFilters, type DocumentSearchType } from "../types";
import { ProcessFiltersSheet } from "../components/ProcessFiltersSheet";
import { ProcessResultsTable } from "../components/ProcessResultsTable";

const PAGE_SIZE = 10;

export default function ProcessHistoryPage() {
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState<DocumentSearchType>("CPF");
  const [appliedDocumentType, setAppliedDocumentType] = useState<DocumentSearchType>("CPF");
  const [documentInput, setDocumentInput] = useState("");
  const [appliedDocumentValue, setAppliedDocumentValue] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyProcessFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyProcessFilters);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: appliedSearch,
      filters: appliedFilters,
      documentType: appliedDocumentType,
      documentValue: appliedDocumentValue,
    }),
    [appliedDocumentType, appliedDocumentValue, appliedFilters, appliedSearch, page],
  );

  const { data, isLoading } = useHistoricalQueries(queryParams);
  const { data: filterOptions } = useFilterOptions();
  const searchHistory = useSearchHistoricalProcesses();
  const toggleDocumentSearchMonitoring = useToggleDocumentSearchMonitoring();
  const toggleFavorite = useToggleFavorite();
  const deleteProcess = useDeleteProcess();

  const handleSearch = () => {
    if (!documentInput.trim()) {
      toast({ title: `Informe um ${documentType} para pesquisar` });
      return;
    }

    setPage(1);
    setAppliedDocumentType(documentType);
    setAppliedDocumentValue(documentInput);
    setAppliedSearch(searchInput);

    searchHistory.mutate(
      {
        documentType,
        documentValue: documentInput.trim(),
      },
      {
        onSuccess: (result) => {
          if (result.status === "completed") {
            toast({ title: "Consulta histórica concluída" });
            return;
          }

          if (result.status === "processing" || result.status === "pending") {
            toast({
              title: "Consulta histórica iniciada",
              description: "A Judit ainda está consolidando os resultados do documento.",
            });
            return;
          }

          toast({ title: "A consulta histórica retornou com erro" });
        },
        onError: (error) => {
          toast({
            title: "Não foi possível consultar o histórico",
            description: error instanceof Error ? error.message : "Erro inesperado",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-8 pb-8">
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 shadow-sm backdrop-blur">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Consolidação histórica por documento
          </span>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))] p-7 shadow-[0_24px_60px_-34px_rgba(16,185,129,0.42)]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/70">
              Consultas históricas
            </p>
            <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground xl:text-[2.2rem]">
              Pesquise por documento e consolide processos relacionados em uma visão mais clara e operacional.
            </h1>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
              Localize processos por CPF, CNPJ ou OAB, refine por parte envolvida e mantenha o acompanhamento
              documental com uma interface mais consistente com o restante do módulo de processos.
            </p>
          </div>
        </Card>
      </section>

      <Card className="rounded-[28px] border-border/70 bg-card/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.52)]">
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
              Entrada de consulta
            </p>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Buscar histórico por documento</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Defina o tipo de documento, informe o valor e aplique refinamentos para encontrar processos relacionados.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">Tipo de documento</label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentSearchType)}>
              <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80 px-4 text-sm shadow-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {documentSearchOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80" htmlFor="documentSearch">
              Documento
            </label>
            <Input
              id="documentSearch"
              value={documentInput}
              onChange={(event) => setDocumentInput(event.target.value)}
              className="h-11 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
              placeholder={`Digite o ${documentType}`}
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80" htmlFor="historySearch">
              Refinar pelo nome da parte
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="historySearch"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-11 rounded-2xl border-border/70 bg-background/80 pl-10 shadow-sm"
                placeholder="Buscar nome da parte"
              />
            </div>
          </div>

          <Button className="mt-auto h-11 w-full rounded-full px-5 xl:w-auto" onClick={handleSearch} disabled={searchHistory.isPending}>
            {searchHistory.isPending ? "Buscando..." : "Buscar histórico"}
          </Button>

          <Button
            className="mt-auto h-11 w-full gap-2 rounded-full border-border/70 bg-background/80 px-5 shadow-sm xl:w-auto"
            variant="outline"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[24px] border-border/70 bg-muted/[0.14] p-5 shadow-none">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 shadow-sm">
                <History className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                  Total consultado
                </p>
                <p className="text-3xl font-semibold leading-none tracking-[-0.03em]">{data?.total ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-[24px] border-border/70 bg-muted/[0.14] p-5 text-sm leading-6 text-muted-foreground shadow-none md:col-span-2">
            As consultas históricas são atualizadas com dados oficiais e permitem localizar processos por documento,
            cruzar resultados e preparar segmentações futuras com uma leitura mais estável da base retornada.
          </Card>
        </div>

        {appliedDocumentValue ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-2">
            <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-sm">
              Consulta ativa: {appliedDocumentType} {appliedDocumentValue}
            </div>
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-full border-border/70 bg-background/80 px-4 shadow-sm"
              disabled={toggleDocumentSearchMonitoring.isPending}
              onClick={() =>
                toggleDocumentSearchMonitoring.mutate(
                  {
                    documentType: appliedDocumentType,
                    documentValue: appliedDocumentValue,
                  },
                  {
                    onSuccess: () =>
                      toast({
                        title: "Monitoramento do documento atualizado",
                        description: `${appliedDocumentType} ${appliedDocumentValue}`,
                      }),
                    onError: (error) =>
                      toast({
                        title: "Não foi possível atualizar o monitoramento",
                        description: error instanceof Error ? error.message : "Erro inesperado",
                      }),
                  },
                )
              }
            >
              <Bell className="h-4 w-4" />
              {toggleDocumentSearchMonitoring.isPending ? "Atualizando monitoramento..." : "Ativar/Pausar monitoramento do documento"}
            </Button>
          </div>
        ) : null}
        </div>
      </Card>

      <ProcessResultsTable
        title="Histórico de consultas realizadas"
        helper="Total consolidado por documento pesquisado, com favoritos, ações e abertura do detalhe."
        items={data?.items ?? []}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onOpenDetails={(processId) => navigate(processRoutes.detail(processId))}
        onToggleFavorite={(processId) =>
          toggleFavorite.mutate(processId, {
            onSuccess: () => toast({ title: "Favoritos atualizados" }),
          })
        }
        onDelete={(processId) =>
          deleteProcess.mutate(processId, {
            onSuccess: () => toast({ title: "Consulta histórica removida" }),
          })
        }
        emptyMessage={
          isLoading
            || searchHistory.isPending
            ? "Carregando histórico..."
            : "Nenhum processo encontrado para o documento e filtros informados."
        }
      />

      <ProcessFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onApply={() => {
          setPage(1);
          setAppliedFilters(draftFilters);
        }}
        onClear={() => {
          setDraftFilters(emptyProcessFilters);
          setAppliedFilters(emptyProcessFilters);
          setPage(1);
        }}
        filterOptions={
          filterOptions ?? {
            tribunals: [],
            partyNames: [],
            classesProcessuais: [],
            assuntos: [],
            partyDocuments: [],
          }
        }
      />
    </div>
  );
}
