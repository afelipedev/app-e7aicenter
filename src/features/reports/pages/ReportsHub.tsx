import { BarChart3, Gavel, LayoutGrid, Scale } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayrollSpedReport } from "./PayrollSpedReport";
import { KanbanReport } from "./KanbanReport";
import { AiAdoptionReport } from "./AiAdoptionReport";
import { ProcessesReport } from "./ProcessesReport";

const TABS = [
  { value: "payroll-sped", label: "Folha & SPED", icon: BarChart3 },
  { value: "kanban", label: "Kanban Jurídico", icon: LayoutGrid },
  { value: "ai-adoption", label: "Adoção & IA", icon: Scale },
  { value: "processes", label: "Processos", icon: Gavel },
];

/** Hub central de relatórios: cada aba é um relatório funcional com dados reais. */
export function ReportsHub() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
        <p className="text-muted-foreground">
          Análises da plataforma com filtros, gráficos interativos e exportação em Excel
        </p>
      </div>

      <Tabs defaultValue="payroll-sped" className="w-full">
        <TabsList className="inline-flex flex-wrap justify-start h-auto gap-1 w-auto max-w-full">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <Icon className="w-4 h-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="payroll-sped" className="mt-6">
          <PayrollSpedReport />
        </TabsContent>
        <TabsContent value="kanban" className="mt-6">
          <KanbanReport />
        </TabsContent>
        <TabsContent value="ai-adoption" className="mt-6">
          <AiAdoptionReport />
        </TabsContent>
        <TabsContent value="processes" className="mt-6">
          <ProcessesReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
