import { useMemo, useState } from "react";
import { Filter, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { emptyProcessFilters } from "../types";
import { datajudTribunals, grauOptions, processRoutes } from "../constants";
import {
  useAdvancedSearch,
  useDeleteProcess,
  useFilterOptions,
  useProcessQueries,
  useSearchProcessByCnj,
  useToggleFavorite,
} from "../hooks/useProcesses";
import { ProcessFiltersSheet } from "../components/ProcessFiltersSheet";
import { ProcessResultsTable } from "../components/ProcessResultsTable";

const PAGE_SIZE = 10;

interface AdvancedFormState {
  tribunalAlias: string;
  classeCodigo: string;
  assuntoCodigo: string;
  orgaoJulgadorCodigo: string;
  grau: string;
  dataAjuizamentoFrom: string;
  dataAjuizamentoTo: string;
}

const emptyAdvancedForm: AdvancedFormState = {
  tribunalAlias: "",
  classeCodigo: "",
  assuntoCodigo: "",
  orgaoJulgadorCodigo: "",
  grau: "",
  dataAjuizamentoFrom: "",
  dataAjuizamentoTo: "",
};

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export default function ProcessQueriesPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyProcessFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyProcessFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedForm, setAdvancedForm] = useState(emptyAdvancedForm);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: appliedSearch,
      filters: appliedFilters,
    }),
    [appliedFilters, appliedSearch, page],
  );

  const { data, isLoading } = useProcessQueries(queryParams);
  const { data: filterOptions } = useFilterOptions();
  const searchProcess = useSearchProcessByCnj();
  const advancedSearch = useAdvancedSearch();
  const toggleFavorite = useToggleFavorite();
  const deleteProcess = useDeleteProcess();

  const handleSearch = () => {
    if (!searchInput.trim()) {
      toast({ title: "Informe um CNJ para consultar" });
      return;
    }

    setPage(1);
    setAppliedSearch(searchInput);

    searchProcess.mutate(searchInput.trim(), {
      onSuccess: (result) => {
        if (result.status === "completed") {
          toast({ title: "Consulta processual concluída" });
          return;
        }

        if (result.status === "not_found") {
          toast({
            title: "Nenhum processo encontrado",
            description: "O número informado não retornou resultados no DataJud.",
          });
          return;
        }

        toast({ title: "A consulta retornou com erro" });
      },
      onError: (error) => {
        toast({
          title: "Não foi possível consultar o processo",
          description: error instanceof Error ? error.message : "Erro inesperado",
        });
      },
    });
  };

  const updateAdvanced = <K extends keyof AdvancedFormState>(key: K, value: AdvancedFormState[K]) => {
    setAdvancedForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdvancedSearch = () => {
    if (!advancedForm.tribunalAlias) {
      toast({ title: "Selecione o tribunal para a busca avançada" });
      return;
    }

    const hasCriteria =
      advancedForm.classeCodigo.trim() ||
      advancedForm.assuntoCodigo.trim() ||
      advancedForm.orgaoJulgadorCodigo.trim() ||
      advancedForm.grau ||
      advancedForm.dataAjuizamentoFrom ||
      advancedForm.dataAjuizamentoTo;

    if (!hasCriteria) {
      toast({
        title: "Informe ao menos um filtro",
        description: "Use classe, assunto, órgão julgador, grau ou período de ajuizamento.",
      });
      return;
    }

    setPage(1);
    advancedSearch.mutate(
      {
        tribunalAlias: advancedForm.tribunalAlias,
        classeCodigo: parseOptionalNumber(advancedForm.classeCodigo),
        assuntoCodigo: parseOptionalNumber(advancedForm.assuntoCodigo),
        orgaoJulgadorCodigo: parseOptionalNumber(advancedForm.orgaoJulgadorCodigo),
        grau: advancedForm.grau || undefined,
        dataAjuizamentoFrom: advancedForm.dataAjuizamentoFrom || undefined,
        dataAjuizamentoTo: advancedForm.dataAjuizamentoTo || undefined,
      },
      {
        onSuccess: (result) => {
          toast({
            title: "Busca avançada concluída",
            description: `${result.count} processo(s) adicionado(s) à listagem.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Não foi possível executar a busca avançada",
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
            Consulta processual — DataJud / CNJ
          </span>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))] p-7 shadow-[0_24px_60px_-34px_rgba(16,185,129,0.42)]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/70">
              Consultas processuais
            </p>
            <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground xl:text-[2.2rem]">
              Consulte processos por CNJ ou por filtros de metadados diretamente na base pública do DataJud/CNJ.
            </h1>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
              Localize um processo pelo número CNJ (o tribunal é identificado automaticamente) ou utilize a busca
              avançada por classe, assunto, órgão julgador, grau e período de ajuizamento.
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
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Buscar processo por CNJ</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Informe o número único do processo. O tribunal é derivado automaticamente da numeração CNJ.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_auto_auto]">
            <div className="space-y-2.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80"
                htmlFor="cnjSearch"
              >
                Número do processo (CNJ)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cnjSearch"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  className="h-11 rounded-2xl border-border/70 bg-background/80 pl-10 shadow-sm"
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
            </div>

            <Button
              className="mt-auto h-11 w-full rounded-full px-5 lg:w-auto"
              onClick={handleSearch}
              disabled={searchProcess.isPending}
            >
              {searchProcess.isPending ? "Consultando..." : "Realizar consulta"}
            </Button>

            <Button
              className="mt-auto h-11 w-full gap-2 rounded-full border-border/70 bg-background/80 px-5 shadow-sm lg:w-auto"
              variant="outline"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-4 w-4" />
              Filtrar listagem
            </Button>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-muted/[0.14] p-5">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setAdvancedOpen((prev) => !prev)}
            >
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                  Busca avançada (por tribunal)
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Consulta direta ao DataJud por códigos TPU — o tribunal é obrigatório.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">{advancedOpen ? "Recolher" : "Expandir"}</span>
            </button>

            {advancedOpen ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Tribunal *</label>
                    <Select
                      value={advancedForm.tribunalAlias}
                      onValueChange={(value) => updateAdvanced("tribunalAlias", value)}
                    >
                      <SelectTrigger className="rounded-2xl border-border/70 bg-background/80">
                        <SelectValue placeholder="Selecione o tribunal" />
                      </SelectTrigger>
                      <SelectContent>
                        {datajudTribunals.map((tribunal) => (
                          <SelectItem key={tribunal.alias} value={tribunal.alias}>
                            {tribunal.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Código da classe</label>
                    <Input
                      inputMode="numeric"
                      placeholder="ex.: 1116"
                      className="rounded-2xl border-border/70 bg-background/80"
                      value={advancedForm.classeCodigo}
                      onChange={(event) => updateAdvanced("classeCodigo", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Código do assunto</label>
                    <Input
                      inputMode="numeric"
                      placeholder="ex.: 6017"
                      className="rounded-2xl border-border/70 bg-background/80"
                      value={advancedForm.assuntoCodigo}
                      onChange={(event) => updateAdvanced("assuntoCodigo", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Código do órgão julgador</label>
                    <Input
                      inputMode="numeric"
                      placeholder="ex.: 13597"
                      className="rounded-2xl border-border/70 bg-background/80"
                      value={advancedForm.orgaoJulgadorCodigo}
                      onChange={(event) => updateAdvanced("orgaoJulgadorCodigo", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Grau</label>
                    <Select value={advancedForm.grau} onValueChange={(value) => updateAdvanced("grau", value)}>
                      <SelectTrigger className="rounded-2xl border-border/70 bg-background/80">
                        <SelectValue placeholder="Qualquer grau" />
                      </SelectTrigger>
                      <SelectContent>
                        {grauOptions.map((grau) => (
                          <SelectItem key={grau.value} value={grau.value}>
                            {grau.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Ajuizamento (início)</label>
                      <Input
                        type="date"
                        className="rounded-2xl border-border/70 bg-background/80"
                        value={advancedForm.dataAjuizamentoFrom}
                        onChange={(event) => updateAdvanced("dataAjuizamentoFrom", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Ajuizamento (fim)</label>
                      <Input
                        type="date"
                        className="rounded-2xl border-border/70 bg-background/80"
                        value={advancedForm.dataAjuizamentoTo}
                        onChange={(event) => updateAdvanced("dataAjuizamentoTo", event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    className="rounded-full border-border/70"
                    onClick={() => setAdvancedForm(emptyAdvancedForm)}
                  >
                    Limpar
                  </Button>
                  <Button
                    className="rounded-full"
                    onClick={handleAdvancedSearch}
                    disabled={advancedSearch.isPending}
                  >
                    {advancedSearch.isPending ? "Buscando..." : "Executar busca avançada"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <ProcessResultsTable
        title="Lista de processos consultados"
        helper="Identificação, grau do processo, data de ajuizamento, status e ações disponíveis."
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
            onSuccess: () => toast({ title: "Consulta removida da listagem" }),
          })
        }
        emptyMessage={
          isLoading || searchProcess.isPending || advancedSearch.isPending
            ? "Carregando consultas..."
            : "Nenhum processo encontrado com os filtros aplicados."
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
            classesProcessuais: [],
            assuntos: [],
            grades: [],
            orgaosJulgadores: [],
          }
        }
      />
    </div>
  );
}
