import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  FileText,
  Briefcase,
  TrendingUp,
  Users,
  Building,
  Clock,
  CheckCircle,
} from "lucide-react";

const stats = [
  {
    title: "Conversas IA",
    value: "1.234",
    change: "+12%",
    icon: MessageSquare,
    color: "text-ai-blue",
    bg: "bg-ai-blue/10",
  },
  {
    title: "Documentos",
    value: "856",
    change: "+8%",
    icon: FileText,
    color: "text-ai-green",
    bg: "bg-ai-green/10",
  },
  {
    title: "Processos Ativos",
    value: "43",
    change: "+5%",
    icon: Briefcase,
    color: "text-ai-purple",
    bg: "bg-ai-purple/10",
  },
  {
    title: "Empresas",
    value: "12",
    change: "—",
    icon: Building,
    color: "text-ai-orange",
    bg: "bg-ai-orange/10",
  },
];

const recentActivities = [
  {
    title: "Análise de Holerite Completa",
    description: "Empresa XYZ - Competência 01/2025",
    time: "Há 5 minutos",
    icon: FileText,
    color: "text-ai-green",
  },
  {
    title: "Nova Consulta Jurídica",
    description: "Assistente Tributário - Cálculo de IRRF",
    time: "Há 15 minutos",
    icon: MessageSquare,
    color: "text-ai-purple",
  },
  {
    title: "Processo Atualizado",
    description: "Processo #12345 - Nova movimentação",
    time: "Há 1 hora",
    icon: Briefcase,
    color: "text-ai-blue",
  },
  {
    title: "Relatório Gerado",
    description: "Relatório Financeiro - Q4 2024",
    time: "Há 2 horas",
    icon: TrendingUp,
    color: "text-ai-orange",
  },
];

const quickActions = [
  {
    title: "Novo Chat",
    description: "Iniciar conversa com IA",
    icon: MessageSquare,
    color: "bg-gradient-purple",
    url: "/assistants/chat",
  },
  {
    title: "Upload Holerite",
    description: "Importar novos documentos",
    icon: FileText,
    color: "bg-gradient-green",
    url: "/documents/payroll",
  },
  {
    title: "Ver Processos",
    description: "Acompanhar andamentos",
    icon: Briefcase,
    color: "bg-gradient-blue",
    url: "/documents/cases",
  },
  {
    title: "Relatórios",
    description: "Gerar análises",
    icon: TrendingUp,
    color: "bg-gradient-orange",
    url: "/documents/reports",
  },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao AI Center - E7 & Vieira Aguiar
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className={`text-sm mt-2 ${stat.color}`}>{stat.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.title}
              className="p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Atividades Recentes</h2>
        <Card className="p-6">
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className={`p-2 rounded-lg bg-muted`}>
                  <activity.icon className={`w-5 h-5 ${activity.color}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
