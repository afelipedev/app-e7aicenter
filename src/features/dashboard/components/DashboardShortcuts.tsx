import {
  Building2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Hash,
  LayoutGrid,
  Sparkles,
  Trello,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Shortcut = {
  title: string;
  href: string;
  icon: typeof Sparkles;
  requiredPermission?: string;
};

const SHORTCUTS: Shortcut[] = [
  { title: "AI Center E7", href: "/ai-center-e7", icon: Sparkles },
  { title: "Holerites", href: "/documents/payroll", icon: FileText },
  { title: "SPEDs", href: "/documents/sped", icon: FileSpreadsheet },
  { title: "Quadros jurídicos", href: "/documents/cases/quadros", icon: Trello },
  {
    title: "Gestão operacional",
    href: "/gestao-operacional/quadros",
    icon: LayoutGrid,
    requiredPermission: "operational_kanban",
  },
  { title: "Relatórios", href: "/documents/reports", icon: TrendingUp },
  { title: "Equipes", href: "/teams", icon: Hash },
  { title: "Empresas", href: "/companies", icon: Building2, requiredPermission: "companies" },
  { title: "Tutoriais", href: "/tutoriais", icon: GraduationCap },
];

export function DashboardShortcuts({ hasPermission }: { hasPermission: (permission: string) => boolean }) {
  const navigate = useNavigate();
  const items = SHORTCUTS.filter((item) => !item.requiredPermission || hasPermission(item.requiredPermission));

  return (
    <nav aria-label="Acesso rápido" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Button key={item.href} type="button" variant="outline" onClick={() => navigate(item.href)}>
            <Icon aria-hidden="true" />
            {item.title}
          </Button>
        );
      })}
    </nav>
  );
}
