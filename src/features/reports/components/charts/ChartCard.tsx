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
  action?: React.ReactNode;
  compactEmpty?: boolean;
}

/** Card padrão que embrulha um gráfico, com estados de loading e vazio. */
export function ChartCard({
  title,
  description,
  loading,
  empty,
  children,
  className,
  action,
  compactEmpty,
}: ChartCardProps) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : empty ? (
        <div
          className={
            compactEmpty
              ? "flex min-h-[140px] flex-col items-center justify-center gap-2 py-8 text-muted-foreground"
              : "flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground"
          }
        >
          <BarChart3 className="h-8 w-8 opacity-40" />
          <p className="text-sm">Sem dados no período selecionado</p>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
