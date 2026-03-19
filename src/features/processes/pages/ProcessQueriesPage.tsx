import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Consultas processuais</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Consulte rapidamente pelo número CNJ, aplique filtros combinados e clique no nome da parte em negrito para abrir o detalhe completo do processo.
        </p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_auto_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cnjSearch">
              Número do processo (CNJ)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cnjSearch"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-10"
                placeholder="0000000-00.0000.0.00.0000"
              />
            </div>
          </div>

          <Button
            className="mt-auto w-full lg:w-auto"
            onClick={handleSearch}
            disabled={searchProcess.isPending}
          >
            {searchProcess.isPending ? "Consultando..." : "Realizar consulta"}
          </Button>

          <Button className="mt-auto w-full gap-2 lg:w-auto" variant="outline" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground md:grid-cols-3">
          <div>1. Acesse o módulo de Consultas Processuais</div>
          <div>2. Digite o número CNJ do processo desejado</div>
          <div>3. Clique em “Realizar consulta”</div>
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
