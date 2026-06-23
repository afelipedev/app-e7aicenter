import { Badge } from "@/components/ui/badge";
import type { ProcessStatus } from "../types";

const statusVariantMap: Record<ProcessStatus, "default" | "secondary" | "outline"> = {
  Concluída: "default",
  "Em andamento": "secondary",
  Aguardando: "outline",
};

export function ProcessStatusBadge({ status }: { status: ProcessStatus }) {
  return <Badge variant={statusVariantMap[status] ?? "secondary"}>{status}</Badge>;
}
