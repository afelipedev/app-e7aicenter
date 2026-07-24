import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Card padrão que embrulha um gráfico, com estados de loading e vazio. */
export function ChartCard({ title, description, loading, empty, children, className }: ChartCardProps) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : empty ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <BarChart3 className="w-8 h-8 opacity-40" />
          <p className="text-sm">Sem dados no período selecionado</p>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
