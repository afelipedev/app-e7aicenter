import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ExternalLink, RefreshCw } from "lucide-react";

export default function PowerBI() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Integração PowerBI</h1>
          <p className="text-muted-foreground">
            Dashboards e análises de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Button className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Abrir PowerBI
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-orange flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Status da Conexão</h3>
            <p className="text-sm text-muted-foreground">Conectado e sincronizado</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-ai-green animate-pulse"></div>
        </div>
      </Card>

      {/* Dashboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
          <h3 className="font-semibold text-foreground mb-2">Dashboard Financeiro</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Visão geral das finanças e fluxo de caixa
          </p>
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
          <h3 className="font-semibold text-foreground mb-2">Dashboard Jurídico</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Métricas de processos e movimentações
          </p>
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
          <h3 className="font-semibold text-foreground mb-2">Dashboard RH</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Análise de folha de pagamento e holerites
          </p>
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-all">
          <h3 className="font-semibold text-foreground mb-2">Dashboard Executivo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Visão consolidada para gestão
          </p>
          <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
          </div>
        </Card>
      </div>
    </div>
  );
}
