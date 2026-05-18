import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { TeamsSecondarySidebar } from "@/features/teams/components/sidebar/TeamsSecondarySidebar";

export function AppLayout() {
  const location = useLocation();
  const isTeamsRoute = location.pathname.startsWith("/teams");

  return (
    <SidebarProvider key={isTeamsRoute ? "teams" : "default"} defaultOpen={!isTeamsRoute}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        {isTeamsRoute && <TeamsSecondarySidebar />}
        <SidebarInset className="min-w-0">
          <Header />
          <main className="flex-1 min-w-0 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
