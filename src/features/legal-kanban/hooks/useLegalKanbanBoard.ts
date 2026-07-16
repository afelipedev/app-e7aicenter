import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useKanbanModule } from "@/features/kanban-shared/KanbanModuleContext";
import { legalKanbanService } from "../services/legalKanbanService";
import type {
  CreateLegalKanbanCardInput,
  CreateLegalKanbanColumnInput,
  CreateLegalKanbanCustomFieldInput,
  CreateLegalKanbanLabelInput,
  LegalKanbanCard,
  LegalKanbanCardBase,
  LegalKanbanCardDetails,
  LegalKanbanColumn,
  UpsertLegalKanbanBoardInput,
  UpdateLegalKanbanCardInput,
} from "../types";

function useKanbanQueryKeys() {
  const { queryKeyPrefix } = useKanbanModule();

  return {
    all: [queryKeyPrefix] as const,
    boards: () => [queryKeyPrefix, "boards"] as const,
    boardPrefix: () => [queryKeyPrefix, "board"] as const,
    board: (boardSlug: string) => [queryKeyPrefix, "board", boardSlug] as const,
    card: (cardId: string) => [queryKeyPrefix, "card", cardId] as const,
  };
}

function useKanbanScope() {
  const module = useKanbanModule();
  const kanbanKeys = useKanbanQueryKeys();
  return { module, kanbanKeys };
}

function patchCardDetailsCache(previous: LegalKanbanCardDetails | undefined, updatedCard: LegalKanbanCardBase) {
  if (!previous || previous.id !== updatedCard.id) {
    return previous;
  }

  return {
    ...previous,
    ...updatedCard,
  };
}

export function useLegalKanbanBoards() {
  const { module, kanbanKeys } = useKanbanScope();
  return useQuery({
    queryKey: kanbanKeys.boards(),
    queryFn: () => legalKanbanService.listBoards(module.domain),
  });
}

export function useLegalKanbanBoard(boardSlug: string) {
  const { module, kanbanKeys } = useKanbanScope();
  return useQuery({
    queryKey: kanbanKeys.board(boardSlug),
    queryFn: () => legalKanbanService.getBoardData(boardSlug, module.domain),
  });
}

export function useUpsertLegalKanbanBoard() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, boardId }: { input: UpsertLegalKanbanBoardInput; boardId?: string }) =>
      legalKanbanService.upsertBoard(input, boardId, module.domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.all });
    },
  });
}

export function useToggleLegalKanbanBoardFavorite() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, isFavorite }: { boardId: string; isFavorite: boolean }) =>
      legalKanbanService.toggleBoardFavorite(boardId, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.all });
    },
  });
}

export function useDeleteLegalKanbanBoard() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) => legalKanbanService.deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.all });
    },
  });
}

export function useAssignableLegalKanbanUsers() {
  const { module, kanbanKeys } = useKanbanScope();
  return useQuery({
    queryKey: [...kanbanKeys.all, "assignable-users"],
    queryFn: () => legalKanbanService.listAssignableUsers(),
  });
}

export function useLegalKanbanCardDetails(cardId: string | null) {
  const { module, kanbanKeys } = useKanbanScope();
  return useQuery({
    queryKey: kanbanKeys.card(cardId || "empty"),
    queryFn: () => legalKanbanService.getCardDetails(cardId as string),
    enabled: Boolean(cardId),
  });
}

export function useCreateLegalKanbanCard() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanCardInput) => legalKanbanService.createCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useMoveLegalKanbanCard() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      sourceColumnId,
      destinationColumnId,
      destinationIndex,
    }: {
      cardId: string;
      sourceColumnId: string;
      destinationColumnId: string;
      destinationIndex: number;
    }) =>
      legalKanbanService.moveCard(cardId, sourceColumnId, destinationColumnId, destinationIndex),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(variables.cardId) });
    },
  });
}

export function useUpdateLegalKanbanCard(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLegalKanbanCardInput) => legalKanbanService.updateCard(cardId, input),
    onSuccess: (updatedCard) => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.setQueryData<LegalKanbanCardDetails>(kanbanKeys.card(cardId), (previous) =>
        patchCardDetailsCache(previous, updatedCard),
      );
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanCard() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deletedCardId: string) => legalKanbanService.deleteCard(deletedCardId),
    onSuccess: (_data, deletedCardId) => {
      queryClient.removeQueries({ queryKey: kanbanKeys.card(deletedCardId) });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useCreateLegalKanbanColumn() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanColumnInput) => legalKanbanService.createColumn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useUpdateLegalKanbanColumn() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, input }: { columnId: string; input: Partial<CreateLegalKanbanColumnInput> }) =>
      legalKanbanService.updateColumn(columnId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useReorderLegalKanbanColumns() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columns: LegalKanbanColumn[]) => legalKanbanService.reorderColumns(columns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useArchiveLegalKanbanColumn() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => legalKanbanService.archiveColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useUnarchiveLegalKanbanColumn() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => legalKanbanService.unarchiveColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useUnarchiveLegalKanbanCard() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => legalKanbanService.unarchiveCard(cardId),
    onSuccess: (_data, cardId) => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useDeleteLegalKanbanColumn() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => legalKanbanService.deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useCreateLegalKanbanLabel() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanLabelInput) => legalKanbanService.createLabel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useDeleteLegalKanbanLabel() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelId: string) => legalKanbanService.deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useCreateLegalKanbanCustomField() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanCustomFieldInput) => legalKanbanService.createCustomField(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useDeleteLegalKanbanCustomField() {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => legalKanbanService.deleteCustomField(fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
    },
  });
}

export function useSetLegalKanbanCardMembers(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberIds: string[]) => legalKanbanService.setCardMembers(cardId, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useSetLegalKanbanCardLabels(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelIds: string[]) => legalKanbanService.setCardLabels(cardId, labelIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanComment(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, mentionUserIds }: { content: string; mentionUserIds?: string[] }) =>
      legalKanbanService.addComment(cardId, content, mentionUserIds || []),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanTimelineItem(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { kind: "comment" | "activity"; id: string }) =>
      input.kind === "comment"
        ? legalKanbanService.deleteComment(input.id)
        : legalKanbanService.deleteActivity(input.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanChecklist(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => legalKanbanService.addChecklist(cardId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanChecklist(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checklistId: string) => legalKanbanService.deleteChecklist(checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanChecklistItem(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ checklistId, content }: { checklistId: string; content: string }) =>
      legalKanbanService.addChecklistItem(checklistId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useToggleLegalKanbanChecklistItem(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      legalKanbanService.toggleChecklistItem(itemId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useSaveLegalKanbanCustomFieldValue(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customFieldId,
      valueText,
      valueJson,
    }: {
      customFieldId: string;
      valueText: string | null;
      valueJson: Record<string, unknown>;
    }) => legalKanbanService.saveCustomFieldValue(cardId, customFieldId, valueText, valueJson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanCustomFieldValue(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customFieldId: string) => legalKanbanService.deleteCustomFieldValue(cardId, customFieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanLinkAttachment(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, url }: { name: string; url: string }) =>
      legalKanbanService.addLinkAttachment(cardId, name, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useUploadLegalKanbanAttachment(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => legalKanbanService.uploadAttachment(cardId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanAttachment(cardId: string) {
  const { module, kanbanKeys } = useKanbanScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) => legalKanbanService.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.boardPrefix() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.card(cardId) });
    },
  });
}

export async function openLegalKanbanAttachment(card: LegalKanbanCard, attachmentId: string) {
  const details = await legalKanbanService.getCardDetails(card.id);
  const attachment = details.attachments.find((item) => item.id === attachmentId);

  if (!attachment) {
    throw new Error("Anexo não encontrado.");
  }

  return legalKanbanService.getAttachmentUrl(attachment);
}
