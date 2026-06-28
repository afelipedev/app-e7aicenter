import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  FileText,
  FileSpreadsheet,
  Briefcase,
  TrendingUp,
  Building,
  Trello,
  LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardService } from "@/services/dashboardService";

interface DashboardStat {
  title: string;
  value: string;
  icon: typeof MessageSquare;
}

const STAT_DEFS: { title: string; icon: typeof MessageSquare }[] = [
  { title: "Conversas IA", icon: MessageSquare },
  { title: "SPEDs Processados", icon: FileSpreadsheet },
  { title: "Holerites Processados", icon: FileText },
  { title: "Processos Ativos", icon: Briefcase },
  { title: "Empresas", icon: Building },
];

const initialStats: DashboardStat[] = STAT_DEFS.map((def) => ({ ...def, value: "—" }));

const quickActions = [
  {
    title: "Biblioteca de IA",
    description: "Explore a biblioteca de assistentes de IA",
    icon: MessageSquare,
    url: "/assistants/library",
  },
  {
    title: "Gestão de Holerites",
    description: "Automatizar conversão dos holerites",
    icon: FileText,
    url: "/documents/payroll",
  },
  {
    title: "Gestão de SPEDs",
    description: "Processar e acompanhar arquivos SPED",
    icon: FileSpreadsheet,
    url: "/documents/sped",
  },
  {
    title: "Quadros Jurídicos",
    description: "Acompanhar andamentos dos quadros jurídicos",
    icon: Trello,
    url: "/documents/cases/quadros",
  },
  {
    title: "Quadros Gestão Operacional",
    description: "Acompanhar quadros da gestão operacional",
    icon: LayoutGrid,
    url: "/gestao-operacional/quadros",
    requiredPermission: "operational_kanban",
  },
  {
    title: "Relatórios",
    description: "Acompanhar e Gerar Relatórios",
    icon: TrendingUp,
    url: "/documents/reports",
  },
];

const formatCount = (value: number) => value.toLocaleString("pt-BR");

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
          chatsCount,
          spedsCount,
          payrollsCount,
          consultedProcessesCount,
          companiesCount,
        ] = await Promise.all([
          DashboardService.getChatsCount(),
          DashboardService.getProcessedSpedsCount(),
          DashboardService.getProcessedPayrollsCount(),
          DashboardService.getConsultedProcessesCount(),
          DashboardService.getCompaniesCount(),
        ]);

        setStats([
          { title: "Conversas IA", value: formatCount(chatsCount), icon: MessageSquare },
          { title: "SPEDs Processados", value: formatCount(spedsCount), icon: FileSpreadsheet },
          { title: "Holerites Processados", value: formatCount(payrollsCount), icon: FileText },
          { title: "Processos Ativos", value: formatCount(consultedProcessesCount), icon: Briefcase },
          { title: "Empresas", value: formatCount(companiesCount), icon: Building },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                <stat.icon className="w-6 h-6 text-primary" />
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
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
                <action.icon className="w-6 h-6 text-primary-foreground" />
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
