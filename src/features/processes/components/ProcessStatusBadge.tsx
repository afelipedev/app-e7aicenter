import { Badge } from "@/components/ui/badge";
import type { ProcessStatus } from "../types";

const statusVariantMap: Record<ProcessStatus, "default" | "secondary" | "outline"> = {
  Concluída: "default",
  "Em andamento": "secondary",
  Aguardando: "outline",
  Monitorado: "secondary",
};

export function ProcessStatusBadge({ status }: { status: ProcessStatus }) {
  return (
    <Badge variant={statusVariantMap[status]} className={status === "Monitorado" ? "bg-amber-100 text-amber-800" : ""}>
      {status}
    </Badge>
  );
}
