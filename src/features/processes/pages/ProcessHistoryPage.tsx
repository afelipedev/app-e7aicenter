import { useMemo, useState } from "react";
import { Filter, History, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { documentSearchOptions, processRoutes } from "../constants";
import { useDeleteProcess, useFilterOptions, useHistoricalQueries, useToggleFavorite } from "../hooks/useProcesses";
import { emptyProcessFilters, type DocumentSearchType } from "../types";
import { ProcessFiltersSheet } from "../components/ProcessFiltersSheet";
import { ProcessResultsTable } from "../components/ProcessResultsTable";

const PAGE_SIZE = 10;

export default function ProcessHistoryPage() {
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState<DocumentSearchType>("CPF");
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
      documentType,
      documentValue: appliedDocumentValue,
    }),
    [appliedDocumentValue, appliedFilters, appliedSearch, documentType, page],
  );

  const { data, isLoading } = useHistoricalQueries(queryParams);
  const { data: filterOptions } = useFilterOptions();
  const toggleFavorite = useToggleFavorite();
  const deleteProcess = useDeleteProcess();

  const handleSearch = () => {
    setPage(1);
    setAppliedDocumentValue(documentInput);
    setAppliedSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Consultas históricas</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Pesquise por CPF, CNPJ ou OAB para localizar processos associados aos documentos e consolide a consulta em uma única visão.
        </p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de documento</label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentSearchType)}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="documentSearch">
              Documento
            </label>
            <Input
              id="documentSearch"
              value={documentInput}
              onChange={(event) => setDocumentInput(event.target.value)}
              placeholder={`Digite o ${documentType}`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="historySearch">
              Refinar pelo nome da parte
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="historySearch"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-10"
                placeholder="Buscar nome da parte"
              />
            </div>
          </div>

          <Button className="mt-auto w-full xl:w-auto" onClick={handleSearch}>
            Buscar histórico
          </Button>

          <Button className="mt-auto w-full gap-2 xl:w-auto" variant="outline" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card className="border-dashed p-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de processos consultados</p>
                <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card className="border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
            As consultas históricas são atualizadas com dados oficiais e permitem localizar processos por documento, cruzar resultados e preparar segmentações futuras.
          </Card>
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
