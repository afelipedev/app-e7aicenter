import { NavLink } from "react-router-dom";
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
  Building,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/",
    color: "text-ai-blue",
  },
  {
    title: "Assistentes de IA",
    icon: MessageSquare,
    color: "text-ai-purple",
    items: [
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
      { title: "Processos", url: "/documents/cases", icon: Briefcase },
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
      { title: "Empresas", url: "/admin/companies", icon: Building },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-4 py-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-blue flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
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
                  <Collapsible className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <item.icon className={`${item.color}`} />
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={subItem.url}
                                className={({ isActive }) =>
                                  isActive ? "bg-sidebar-accent" : ""
                                }
                              >
                                <subItem.icon className="w-4 h-4" />
                                <span>{subItem.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
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
