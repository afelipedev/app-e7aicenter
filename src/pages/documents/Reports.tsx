import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Calendar, FileText } from "lucide-react";

const reports = [
  {
    title: "Relatório Financeiro - Q4 2024",
    description: "Análise completa das movimentações financeiras do último trimestre",
    date: "15/01/2025",
    type: "Financeiro",
    icon: BarChart3,
    color: "text-ai-orange",
  },
  {
    title: "Relatório de Processos - Janeiro",
    description: "Resumo dos processos jurídicos e suas movimentações",
    date: "10/01/2025",
    type: "Jurídico",
    icon: FileText,
    color: "text-ai-blue",
  },
  {
    title: "Análise de Holerites - Dezembro",
    description: "Consolidação dos holerites processados no mês",
    date: "05/01/2025",
    type: "Contábil",
    icon: Calendar,
    color: "text-ai-green",
  },
];

export default function Reports() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
          <p className="text-muted-foreground">
            Gerar e visualizar relatórios analíticos
          </p>
        </div>
        <Button className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Novo Relatório
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
          <div className="w-12 h-12 rounded-lg bg-gradient-orange flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Relatório Financeiro</h3>
          <p className="text-sm text-muted-foreground">Gerar análise financeira do período</p>
        </Card>

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
          <div className="w-12 h-12 rounded-lg bg-gradient-blue flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Relatório de Processos</h3>
          <p className="text-sm text-muted-foreground">Consolidar movimentações jurídicas</p>
        </Card>

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
          <div className="w-12 h-12 rounded-lg bg-gradient-green flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Relatório Contábil</h3>
          <p className="text-sm text-muted-foreground">Análise de holerites e folhas</p>
        </Card>
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Relatórios Recentes</h2>
        <div className="space-y-4">
          {reports.map((report, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <report.icon className={`w-6 h-6 ${report.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Tipo: {report.type}</span>
                      <span>•</span>
                      <span>Gerado em: {report.date}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
