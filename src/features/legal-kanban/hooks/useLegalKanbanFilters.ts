import { useMemo, useState } from "react";
import { LEGAL_KANBAN_FILTERS_INITIAL_STATE } from "../constants";
import type { LegalKanbanBoardData, LegalKanbanFiltersState } from "../types";
import { filterBoardColumns, getCardsCount } from "../utils";

export function useLegalKanbanFilters(board: LegalKanbanBoardData | undefined, currentUserId: string | null) {
  const [filters, setFilters] = useState<LegalKanbanFiltersState>(LEGAL_KANBAN_FILTERS_INITIAL_STATE);

  const filteredColumns = useMemo(() => {
    if (!board) return [];
    return filterBoardColumns(board.columns, filters, currentUserId);
  }, [board, currentUserId, filters]);

  const filteredCardsCount = useMemo(() => getCardsCount(filteredColumns), [filteredColumns]);
  const totalCardsCount = useMemo(() => getCardsCount(board?.columns || []), [board]);

  return {
    filters,
    setFilters,
    filteredColumns,
    filteredCardsCount,
    totalCardsCount,
    resetFilters: () => setFilters(LEGAL_KANBAN_FILTERS_INITIAL_STATE),
  };
}
