import { KanbanModuleProvider } from "@/features/kanban-shared/KanbanModuleContext";
import LegalBoardsHomePage from "@/features/legal-kanban/pages/LegalBoardsHomePage";

export default function OperationalBoardsHomePage() {
  return (
    <KanbanModuleProvider domain="operational">
      <LegalBoardsHomePage />
    </KanbanModuleProvider>
  );
}
