import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Scale,
  Building2,
  Coins,
  Calculator,
  FileText,
  FileSpreadsheet,
  Briefcase,
  BarChart3,
  Trello,
  ChevronDown,
  BookOpen,
  Target,
  Hash,
  ShieldCheck,
  UserCog,
  UsersIcon as UsersGroupIcon,
  LayoutGrid,
  Settings,
  Sparkles,
  Gavel,
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
import { useAuth } from "@/contexts/AuthContext";

type SidebarEntry = {
  title: string;
  icon: any;
  url?: string;
  color?: string;
  items?: SidebarEntry[];
  requiredPermission?: string;
};

function filterMenuItems(items: SidebarEntry[], hasPermission: (permission: string) => boolean): SidebarEntry[] {
  return items
    .filter((item) => !item.requiredPermission || hasPermission(item.requiredPermission))
    .map((item) =>
      item.items
        ? { ...item, items: filterMenuItems(item.items, hasPermission) }
        : item,
    )
    .filter((item) => !item.items || item.items.length > 0);
}

const menuItems: SidebarEntry[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/",
  },
  {
    title: "Leads",
    icon: Target,
    url: "/leads",
  },
  {
    title: "Gestão Operacional",
    icon: LayoutGrid,
    url: "/gestao-operacional/quadros",
    requiredPermission: "operational_kanban",
  },
  {
    title: "Gestão de Empresas",
    icon: Building2,
    url: "/companies",
    requiredPermission: "companies",
  },
  {
    title: "AI Center",
    icon: Sparkles,
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
    title: "Gestão Jurídica",
    icon: Gavel,
    items: [
      {
        title: "Processos",
        url: "/documents/cases",
        icon: Briefcase,
        items: [
          { title: "Dashboard", url: "/documents/cases", icon: LayoutDashboard },
          { title: "Quadros Jurídicos", url: "/documents/cases/quadros", icon: Trello },
          { title: "Consultas Processuais", url: "/documents/cases/queries", icon: Scale },
        ],
      },
    ],
  },
  {
    title: "Gestão Contábil",
    icon: Calculator,
    items: [
      { title: "Gestão de Holerites", url: "/documents/payroll", icon: FileText },
      { title: "Gestão de SPEDs", url: "/documents/sped", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    url: "/documents/reports",
  },
  {
    title: "Equipes",
    icon: Hash,
    url: "/teams",
  },
  {
    title: "Administração",
    icon: ShieldCheck,
    requiredPermission: "admin",
    items: [
      { title: "Usuários", url: "/admin/users", icon: UserCog },
      { title: "Gestão de Equipes", url: "/admin/teams", icon: UsersGroupIcon },
      { title: "Configurações", url: "/admin/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isCollapsed = state === "collapsed";
  const visibleMenuItems = filterMenuItems(menuItems, hasPermission);

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
        <div className={cn("py-6", isCollapsed ? "px-0" : "px-4")}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2")}>
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
            {visibleMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <Collapsible defaultOpen={isEntryActive(item)} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          "w-full",
                          isEntryActive(item) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon
                          className={cn(isEntryActive(item) ? "text-primary" : "text-muted-foreground")}
                        />
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
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
                        cn(isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.title}</span>
                        </>
                      )}
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
