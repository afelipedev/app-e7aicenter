import { Activity, DatabaseZap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProcessApiConsumption } from "../hooks/useProcesses";

export default function ProcessApiConsumptionPage() {
  const { data, isLoading } = useProcessApiConsumption();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Consumo API</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Visão de consumo preparada para futura integração com a Judit, incluindo consultas, exportações, monitoramentos e acesso a autos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {data?.metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-3xl font-semibold">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.helper}</p>
              </div>
              <DatabaseZap className="h-5 w-5 text-primary" />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">Histórico de consumo</h2>
            <p className="text-sm text-muted-foreground">
              Registro das chamadas e operações relacionadas ao módulo de processos.
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            {isLoading ? "Carregando" : `${data?.entries.length ?? 0} eventos`}
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creditos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.endpoint}</TableCell>
                <TableCell>{entry.createdAt}</TableCell>
                <TableCell>
                  <Badge variant={entry.status === "Falha" ? "outline" : "secondary"}>{entry.status}</Badge>
                </TableCell>
                <TableCell>{entry.credits}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
