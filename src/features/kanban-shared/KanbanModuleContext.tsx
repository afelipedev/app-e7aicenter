import { createContext, useContext, type ReactNode } from "react";
import { KANBAN_MODULE_CONFIG, type KanbanDomain, type KanbanModuleConfig } from "./kanbanModuleConfig";

const KanbanModuleContext = createContext<KanbanModuleConfig>(KANBAN_MODULE_CONFIG.legal);

export function KanbanModuleProvider({
  domain,
  children,
}: {
  domain: KanbanDomain;
  children: ReactNode;
}) {
  return (
    <KanbanModuleContext.Provider value={KANBAN_MODULE_CONFIG[domain]}>
      {children}
    </KanbanModuleContext.Provider>
  );
}

export function useKanbanModule() {
  return useContext(KanbanModuleContext);
}
