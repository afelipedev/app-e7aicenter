import { Bell, History, SearchCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { processRoutes } from "../constants";
import { useProcessesDashboard } from "../hooks/useProcesses";
import { FavoriteProcessCard } from "../components/FavoriteProcessCard";
import { ProcessMetricCard } from "../components/ProcessMetricCard";

export default function ProcessesDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProcessesDashboard();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Processos</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Dashboard central da operação processual com acesso rápido às consultas, históricos, monitoramentos e consumo de API.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {isLoading || !data ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40 w-full rounded-xl" />)
        ) : (
          <>
            <ProcessMetricCard
              title="Processos consultados"
              value={data.stats.queriedProcesses}
              helper="Base pronta para filtros e abertura do detalhe"
              icon={SearchCheck}
              onViewAll={() => navigate(processRoutes.queries)}
            />
            <ProcessMetricCard
              title="Consultas historicas"
              value={data.stats.historicalQueries}
              helper="Consultas por CPF, CNPJ e OAB"
              icon={History}
              onViewAll={() => navigate(processRoutes.history)}
            />
            <ProcessMetricCard
              title="Monitoramentos"
              value={data.stats.monitorings}
              helper="Monitoramento processual e novas ações"
              icon={Bell}
              onViewAll={() => navigate(processRoutes.monitoring)}
            />
          </>
        )}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Processos favoritos</h2>
            <p className="text-sm text-muted-foreground">
              Exibição das capas dos processos marcados como favoritos para acesso imediato.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 w-full rounded-xl" />)
          ) : data.favorites.length > 0 ? (
            data.favorites.map((process) => (
              <FavoriteProcessCard
                key={process.id}
                process={process}
                onOpen={(processId) => navigate(processRoutes.detail(processId))}
              />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum processo favoritado ainda. Use a estrela nas listagens para manter os principais sempre no topo.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
