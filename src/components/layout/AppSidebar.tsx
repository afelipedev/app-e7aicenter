import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Scale,
  Building2,
  Coins,
  Calculator,
  FileText,
  Briefcase,
  BarChart3,
  Calendar,
  Trello,
  Users,
  ChevronDown,
  BookOpen,
  DatabaseZap,
  History,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type SidebarEntry = {
  title: string;
  icon: any;
  url?: string;
  color?: string;
  items?: SidebarEntry[];
};

const menuItems: SidebarEntry[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/",
    color: "text-ai-blue",
  },
  {
    title: "Leads",
    icon: Users,
    url: "/leads",
    color: "text-ai-cyan",
  },
  {
    title: "Gestão de Empresas",
    icon: Building2,
    url: "/companies",
    color: "text-ai-cyan",
  },
  {
    title: "Assistentes de IA",
    icon: MessageSquare,
    color: "text-ai-purple",
    items: [
      { title: "Biblioteca IA", url: "/assistants/library", icon: BookOpen },
      { title: "Chat Geral", url: "/assistants/chat", icon: MessageSquare },
      { title: "Jurídico Tributário", url: "/assistants/tax", icon: Scale },
      { title: "Jurídico Cível", url: "/assistants/civil", icon: Building2 },
      { title: "Financeiro", url: "/assistants/financial", icon: Coins },
      { title: "Contábil", url: "/assistants/accounting", icon: Calculator },
    ],
  },
  {
    title: "Documentos & Processos",
    icon: FileText,
    color: "text-ai-green",
    items: [
      { title: "Gestão de Holerites", url: "/documents/payroll", icon: FileText },
      { title: "Gestão de SPEDs", url: "/documents/sped", icon: FileText },
      {
        title: "Processos",
        url: "/documents/cases",
        icon: Briefcase,
        items: [
          { title: "Dashboard", url: "/documents/cases", icon: Briefcase },
          { title: "Kanban", url: "/documents/cases/kanban", icon: Trello },
          { title: "Consultas Processuais", url: "/documents/cases/queries", icon: Scale },
          { title: "Consultas Históricas", url: "/documents/cases/history", icon: History },
          { title: "Monitoramentos", url: "/documents/cases/monitoring", icon: Bell },
          { title: "Consumo API", url: "/documents/cases/api-consumption", icon: DatabaseZap },
        ],
      },
      { title: "Relatórios", url: "/documents/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Integrações",
    icon: BarChart3,
    color: "text-ai-orange",
    items: [
      { title: "PowerBI", url: "/integrations/powerbi", icon: BarChart3 },
      { title: "Trello", url: "/integrations/trello", icon: Trello },
      { title: "Agenda", url: "/integrations/calendar", icon: Calendar },
    ],
  },
  {
    title: "Administração",
    icon: Users,
    color: "text-ai-pink",
    items: [
      { title: "Usuários", url: "/admin/users", icon: Users },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const isEntryActive = (entry: SidebarEntry) => {
    if (entry.url) {
      if (entry.url === "/documents/cases") {
        return location.pathname === entry.url || location.pathname.startsWith("/documents/cases/");
      }

      if (entry.url !== "/" && location.pathname.startsWith(`${entry.url}/`)) {
        return true;
      }

      if (location.pathname === entry.url) {
        return true;
      }
    }

    return entry.items?.some((item) => isEntryActive(item)) ?? false;
  };

  const renderSubEntry = (entry: SidebarEntry) => {
    if (entry.items) {
      return (
        <Collapsible key={entry.title} defaultOpen={isEntryActive(entry)} className="group/subcollapsible">
          <SidebarMenuSubItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton className={cn(isEntryActive(entry) && "bg-sidebar-accent")}>
                <entry.icon className="h-4 w-4" />
                <span>{entry.title}</span>
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/subcollapsible:rotate-180" />
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
          </SidebarMenuSubItem>
          <CollapsibleContent>
            <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border/70 pl-3">
              {entry.items.map((child) => (
                <NavLink
                  key={child.title}
                  to={child.url || "#"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                      isActive && "bg-sidebar-accent text-foreground",
                    )
                  }
                >
                  <child.icon className="h-4 w-4" />
                  <span>{child.title}</span>
                </NavLink>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuSubItem key={entry.title}>
        <SidebarMenuSubButton asChild>
          <NavLink
            to={entry.url || "#"}
            className={({ isActive }) => (isActive ? "bg-sidebar-accent" : "")}
          >
            <entry.icon className="w-4 h-4" />
            <span>{entry.title}</span>
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-4 py-6">
          <div className="flex items-center gap-2">
            <div className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0`}>
              <img 
                src="/logo-e7-login-modal.png" 
                alt="Logo E7" 
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-sm font-semibold text-foreground">E7 & Vieira Aguiar</h2>
                <p className="text-xs text-muted-foreground">AI Center</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <Collapsible defaultOpen={isEntryActive(item)} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={cn("w-full", isEntryActive(item) && "bg-sidebar-accent")}>
                        <item.icon className={`${item.color}`} />
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => renderSubEntry(subItem))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent" : ""
                      }
                    >
                      <item.icon className={item.color} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
