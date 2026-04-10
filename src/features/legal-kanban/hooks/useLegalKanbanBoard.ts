import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { legalKanbanService } from "../services/legalKanbanService";
import type {
  CreateLegalKanbanCardInput,
  CreateLegalKanbanColumnInput,
  CreateLegalKanbanCustomFieldInput,
  CreateLegalKanbanLabelInput,
  LegalKanbanBoardData,
  LegalKanbanCard,
  LegalKanbanColumn,
  UpdateLegalKanbanCardInput,
} from "../types";
import { reindexByHundreds } from "../utils";

const legalKanbanKeys = {
  all: ["legal-kanban"] as const,
  board: () => [...legalKanbanKeys.all, "board"] as const,
  card: (cardId: string) => [...legalKanbanKeys.all, "card", cardId] as const,
};

function moveCardInCache(
  board: LegalKanbanBoardData,
  cardId: string,
  sourceColumnId: string,
  destinationColumnId: string,
  destinationIndex: number,
) {
  const columns = board.columns.map((column) => ({
    ...column,
    cards: [...column.cards],
  }));

  const sourceColumn = columns.find((column) => column.id === sourceColumnId);
  const destinationColumn = columns.find((column) => column.id === destinationColumnId);

  if (!sourceColumn || !destinationColumn) {
    return board;
  }

  const sourceIndex = sourceColumn.cards.findIndex((card) => card.id === cardId);
  if (sourceIndex === -1) {
    return board;
  }

  const [movedCard] = sourceColumn.cards.splice(sourceIndex, 1);
  destinationColumn.cards.splice(destinationIndex, 0, {
    ...movedCard,
    columnId: destinationColumnId,
  });

  sourceColumn.cards = reindexByHundreds(sourceColumn.cards).map((card) => ({
    ...card,
  }));
  destinationColumn.cards = reindexByHundreds(destinationColumn.cards).map((card) => ({
    ...card,
  }));

  return {
    ...board,
    columns,
  };
}

export function useLegalKanbanBoard() {
  return useQuery({
    queryKey: legalKanbanKeys.board(),
    queryFn: () => legalKanbanService.getBoardData(),
  });
}

export function useLegalKanbanCardDetails(cardId: string | null) {
  return useQuery({
    queryKey: legalKanbanKeys.card(cardId || "empty"),
    queryFn: () => legalKanbanService.getCardDetails(cardId as string),
    enabled: Boolean(cardId),
  });
}

export function useCreateLegalKanbanCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanCardInput) => legalKanbanService.createCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useMoveLegalKanbanCard() {
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: legalKanbanKeys.board() });
      const previous = queryClient.getQueryData<LegalKanbanBoardData>(legalKanbanKeys.board());

      if (previous) {
        queryClient.setQueryData(
          legalKanbanKeys.board(),
          moveCardInCache(
            previous,
            variables.cardId,
            variables.sourceColumnId,
            variables.destinationColumnId,
            variables.destinationIndex,
          ),
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(legalKanbanKeys.board(), context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(variables.cardId) });
    },
  });
}

export function useUpdateLegalKanbanCard(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLegalKanbanCardInput) => legalKanbanService.updateCard(cardId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useCreateLegalKanbanColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanColumnInput) => legalKanbanService.createColumn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useUpdateLegalKanbanColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, input }: { columnId: string; input: Partial<CreateLegalKanbanColumnInput> }) =>
      legalKanbanService.updateColumn(columnId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useReorderLegalKanbanColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columns: LegalKanbanColumn[]) => legalKanbanService.reorderColumns(columns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useDeleteLegalKanbanColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => legalKanbanService.deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useCreateLegalKanbanLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanLabelInput) => legalKanbanService.createLabel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useDeleteLegalKanbanLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelId: string) => legalKanbanService.deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useCreateLegalKanbanCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLegalKanbanCustomFieldInput) => legalKanbanService.createCustomField(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useDeleteLegalKanbanCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => legalKanbanService.deleteCustomField(fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
    },
  });
}

export function useSetLegalKanbanCardMembers(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberIds: string[]) => legalKanbanService.setCardMembers(cardId, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useSetLegalKanbanCardLabels(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelIds: string[]) => legalKanbanService.setCardLabels(cardId, labelIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanComment(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => legalKanbanService.addComment(cardId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanTimelineItem(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { kind: "comment" | "activity"; id: string }) =>
      input.kind === "comment"
        ? legalKanbanService.deleteComment(input.id)
        : legalKanbanService.deleteActivity(input.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanChecklist(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => legalKanbanService.addChecklist(cardId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanChecklist(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checklistId: string) => legalKanbanService.deleteChecklist(checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanChecklistItem(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ checklistId, content }: { checklistId: string; content: string }) =>
      legalKanbanService.addChecklistItem(checklistId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useToggleLegalKanbanChecklistItem(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      legalKanbanService.toggleChecklistItem(itemId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useSaveLegalKanbanCustomFieldValue(cardId: string) {
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
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useDeleteLegalKanbanCustomFieldValue(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customFieldId: string) => legalKanbanService.deleteCustomFieldValue(cardId, customFieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useAddLegalKanbanLinkAttachment(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, url }: { name: string; url: string }) =>
      legalKanbanService.addLinkAttachment(cardId, name, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
    },
  });
}

export function useUploadLegalKanbanAttachment(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => legalKanbanService.uploadAttachment(cardId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.board() });
      queryClient.invalidateQueries({ queryKey: legalKanbanKeys.card(cardId) });
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
