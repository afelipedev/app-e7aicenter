import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  FileText,
  Briefcase,
  TrendingUp,
  Building,
  Trello,
  LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CompanyService } from "@/services/companyService";
import { ChatService } from "@/services/chatService";
import { DashboardService } from "@/services/dashboardService";
import { getEvolutionColor } from "@/lib/monthlyEvolution";

interface DashboardStat {
  title: string;
  value: string;
  change: string;
  evolutionPercent: number | null;
  icon: typeof MessageSquare;
  color: string;
  bg: string;
}

const initialStats: DashboardStat[] = [
  {
    title: "Conversas IA",
    value: "—",
    change: "—",
    evolutionPercent: null,
    icon: MessageSquare,
    color: "text-ai-blue",
    bg: "bg-ai-blue/10",
  },
  {
    title: "Documentos",
    value: "—",
    change: "—",
    evolutionPercent: null,
    icon: FileText,
    color: "text-ai-green",
    bg: "bg-ai-green/10",
  },
  {
    title: "Processos Ativos",
    value: "—",
    change: "—",
    evolutionPercent: null,
    icon: Briefcase,
    color: "text-ai-purple",
    bg: "bg-ai-purple/10",
  },
  {
    title: "Empresas",
    value: "—",
    change: "—",
    evolutionPercent: null,
    icon: Building,
    color: "text-ai-orange",
    bg: "bg-ai-orange/10",
  },
];

const quickActions = [
  {
    title: "Biblioteca de IA",
    description: "Explore a biblioteca de assistentes de IA",
    icon: MessageSquare,
    color: "bg-gradient-purple",
    url: "/assistants/library",
  },
  {
    title: "Gestão de Holerites",
    description: "Automatizar conversão dos holerites",
    icon: FileText,
    color: "bg-gradient-green",
    url: "/documents/payroll",
  },
  {
    title: "Gestão de SPEDs",
    description: "Processar e acompanhar arquivos SPED",
    icon: FileText,
    color: "bg-gradient-pink",
    url: "/documents/sped",
  },
  {
    title: "Quadros Jurídicos",
    description: "Acompanhar andamentos dos quadros jurídicos",
    icon: Trello,
    color: "bg-gradient-blue",
    url: "/documents/cases/quadros",
  },
  {
    title: "Quadros Gestão Operacional",
    description: "Acompanhar quadros da gestão operacional",
    icon: LayoutGrid,
    color: "bg-gradient-orange",
    url: "/gestao-operacional/quadros",
    requiredPermission: "operational_kanban",
  },
  {
    title: "Relatórios",
    description: "Acompanhar e Gerar Relatórios",
    icon: TrendingUp,
    color: "bg-gradient-orange",
    url: "/documents/reports",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStat[]>(initialStats);

  const visibleQuickActions = useMemo(
    () =>
      quickActions.filter(
        (action) =>
          !action.requiredPermission || hasPermission(action.requiredPermission),
      ),
    [hasPermission],
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          companies,
          companiesEvolutionData,
          chatsCountData,
          chatsEvolutionData,
          documentsCount,
          documentsEvolutionData,
          activeProcessesCount,
          activeProcessesEvolutionData,
        ] = await Promise.all([
          CompanyService.getAll(),
          CompanyService.getMonthlyEvolution(),
          ChatService.getAllChatsCount(),
          ChatService.getMonthlyEvolution(),
          DashboardService.getDocumentsCount(),
          DashboardService.getDocumentsMonthlyEvolution(),
          DashboardService.getActiveProcessesCount(),
          DashboardService.getActiveProcessesMonthlyEvolution(),
        ]);

        setStats([
          {
            title: "Conversas IA",
            value: chatsCountData.toLocaleString("pt-BR"),
            change: chatsEvolutionData.evolutionText,
            evolutionPercent: chatsEvolutionData.evolutionPercent,
            icon: MessageSquare,
            color: "text-ai-blue",
            bg: "bg-ai-blue/10",
          },
          {
            title: "Documentos",
            value: documentsCount.toLocaleString("pt-BR"),
            change: documentsEvolutionData.evolutionText,
            evolutionPercent: documentsEvolutionData.evolutionPercent,
            icon: FileText,
            color: "text-ai-green",
            bg: "bg-ai-green/10",
          },
          {
            title: "Processos Ativos",
            value: activeProcessesCount.toLocaleString("pt-BR"),
            change: activeProcessesEvolutionData.evolutionText,
            evolutionPercent: activeProcessesEvolutionData.evolutionPercent,
            icon: Briefcase,
            color: "text-ai-purple",
            bg: "bg-ai-purple/10",
          },
          {
            title: "Empresas",
            value: companies.length.toLocaleString("pt-BR"),
            change: companiesEvolutionData.evolutionText,
            evolutionPercent: companiesEvolutionData.evolutionPercent,
            icon: Building,
            color: "text-ai-orange",
            bg: "bg-ai-orange/10",
          },
        ]);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        setStats(initialStats);
      }
    };

    fetchDashboardData();
  }, []);

  const handleQuickActionClick = (url: string) => {
    navigate(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao AI Center - E7 & Vieira Aguiar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className={`text-sm mt-2 ${getEvolutionColor(stat.evolutionPercent, stat.color)}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleQuickActions.map((action) => (
            <Card
              key={action.title}
              className="p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => handleQuickActionClick(action.url)}
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
    </div>
  );
}
