import { useMemo, useState } from "react";
import { Filter, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { emptyProcessFilters } from "../types";
import { processRoutes } from "../constants";
import {
  useDeleteProcess,
  useFilterOptions,
  useProcessQueries,
  useSearchProcessByCnj,
  useToggleFavorite,
  useToggleProcessMonitoring,
} from "../hooks/useProcesses";
import { ProcessFiltersSheet } from "../components/ProcessFiltersSheet";
import { ProcessResultsTable } from "../components/ProcessResultsTable";

const PAGE_SIZE = 10;

export default function ProcessQueriesPage() {
  const navigate = useNavigate();
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
    }),
    [appliedFilters, appliedSearch, page],
  );

  const { data, isLoading } = useProcessQueries(queryParams);
  const { data: filterOptions } = useFilterOptions();
  const searchProcess = useSearchProcessByCnj();
  const toggleFavorite = useToggleFavorite();
  const deleteProcess = useDeleteProcess();
  const toggleMonitoring = useToggleProcessMonitoring();

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

        if (result.status === "processing" || result.status === "pending") {
          toast({ title: "Consulta iniciada", description: "A Judit ainda está processando a requisição." });
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

  return (
    <div className="space-y-8 pb-8">
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 shadow-sm backdrop-blur">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Consulta processual por CNJ
          </span>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))] p-7 shadow-[0_24px_60px_-34px_rgba(16,185,129,0.42)]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/70">
              Consultas processuais
            </p>
            <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground xl:text-[2.2rem]">
              Consulte processos por CNJ com uma leitura mais clara, rápida e consistente com o restante da operação.
            </h1>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
              Localize processos pelo número CNJ, combine filtros e acesse o detalhe completo com uma interface
              mais refinada para navegação, priorização e acompanhamento.
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
              Informe o número do processo e use filtros complementares para localizar e organizar os resultados.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_auto_auto]">
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80" htmlFor="cnjSearch">
              Número do processo (CNJ)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cnjSearch"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
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
            Filtros
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[24px] border-border/70 bg-muted/[0.14] p-5 shadow-none">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">Passo 1</p>
              <p className="text-sm leading-6 text-foreground">Acesse o módulo de consultas processuais.</p>
            </div>
          </Card>
          <Card className="rounded-[24px] border-border/70 bg-muted/[0.14] p-5 shadow-none">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">Passo 2</p>
              <p className="text-sm leading-6 text-foreground">Digite o número CNJ do processo desejado.</p>
            </div>
          </Card>
          <Card className="rounded-[24px] border-border/70 bg-muted/[0.14] p-5 shadow-none">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">Passo 3</p>
              <p className="text-sm leading-6 text-foreground">Clique em “Realizar consulta” para iniciar a busca.</p>
            </div>
          </Card>
        </div>
        </div>
      </Card>

      <ProcessResultsTable
        title="Lista de processos consultados"
        helper="Identificação, grau do processo, data de criação, status e ações disponíveis."
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
        onToggleMonitoring={(processId) =>
          toggleMonitoring.mutate(processId, {
            onSuccess: () => toast({ title: "Monitoramento atualizado" }),
          })
        }
        emptyMessage={
          isLoading || searchProcess.isPending
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
