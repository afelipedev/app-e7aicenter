import { KanbanModuleProvider } from "@/features/kanban-shared/KanbanModuleContext";
import LegalKanbanPage from "@/features/legal-kanban/pages/LegalKanbanPage";

export default function OperationalKanbanPage() {
  return (
    <KanbanModuleProvider domain="operational">
      <LegalKanbanPage />
    </KanbanModuleProvider>
  );
}
