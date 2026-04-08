import { supabase, type User } from "@/lib/supabase";
import {
  LEGAL_KANBAN_BOARD_SLUG,
  LEGAL_KANBAN_DEFAULT_COLUMNS,
  LEGAL_KANBAN_STORAGE_BUCKET,
} from "../constants";
import type {
  CreateLegalKanbanCardInput,
  CreateLegalKanbanColumnInput,
  CreateLegalKanbanCustomFieldInput,
  CreateLegalKanbanLabelInput,
  LegalKanbanActivity,
  LegalKanbanAttachment,
  LegalKanbanBoard,
  LegalKanbanBoardData,
  LegalKanbanCard,
  LegalKanbanCardBase,
  LegalKanbanCardDetails,
  LegalKanbanCardMember,
  LegalKanbanChecklist,
  LegalKanbanChecklistItem,
  LegalKanbanColumn,
  LegalKanbanComment,
  LegalKanbanCustomField,
  LegalKanbanCustomFieldValue,
  LegalKanbanLabel,
  LegalKanbanUser,
  RichTextDoc,
  UpdateLegalKanbanCardInput,
} from "../types";
import { buildColorFromName, reindexByHundreds, sortByPosition } from "../utils";

type QueryResponse<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

const db = supabase as any;

function ensureData<T>(response: QueryResponse<T>, fallbackMessage: string) {
  if (response.error) {
    throw new Error(response.error.message || fallbackMessage);
  }

  if (response.data == null) {
    throw new Error(fallbackMessage);
  }

  return response.data;
}

function maybeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function mapUser(row: any): LegalKanbanUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

function mapBoard(row: any): LegalKanbanBoard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: row.icon,
    isLocked: row.is_locked,
  };
}

function mapColumn(row: any): LegalKanbanColumn {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    color: row.color,
    position: row.position,
    kind: row.kind,
    isDefault: row.is_default,
    isArchived: row.is_archived,
  };
}

function mapLabel(row: any): LegalKanbanLabel {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    color: row.color,
    position: row.position,
  };
}

function mapCustomField(row: any): LegalKanbanCustomField {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    fieldType: row.field_type,
    position: row.position,
    isRequired: row.is_required,
    options: maybeArray(row.options),
  };
}

function mapCustomFieldValue(row: any): LegalKanbanCustomFieldValue {
  return {
    id: row.id,
    cardId: row.card_id,
    customFieldId: row.custom_field_id,
    valueText: row.value_text,
    valueJson: row.value_json || {},
  };
}

function mapCardBase(row: any): LegalKanbanCardBase {
  return {
    id: row.id,
    boardId: row.board_id,
    columnId: row.column_id,
    title: row.title,
    cardNumber: row.card_number,
    descriptionJson: row.description_json || {},
    descriptionText: row.description_text || "",
    status: row.status,
    priority: row.priority,
    coverColor: row.cover_color,
    position: row.position,
    startDate: row.start_date,
    dueDate: row.due_date,
    reminderAt: row.reminder_at,
    recurrenceRule: row.recurrence_rule,
    completedAt: row.completed_at,
    processSnapshotId: row.process_snapshot_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCardMember(row: any): LegalKanbanCardMember {
  return {
    id: row.id,
    user: mapUser(row.user),
  };
}

function mapComment(row: any): LegalKanbanComment {
  return {
    id: row.id,
    cardId: row.card_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.author ? mapUser(row.author) : null,
  };
}

function mapActivity(row: any): LegalKanbanActivity {
  return {
    id: row.id,
    cardId: row.card_id,
    activityType: row.activity_type,
    message: row.message,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    actor: row.actor ? mapUser(row.actor) : null,
  };
}

function mapAttachment(row: any): LegalKanbanAttachment {
  return {
    id: row.id,
    cardId: row.card_id,
    attachmentType: row.attachment_type,
    name: row.name,
    url: row.url,
    filePath: row.file_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

function mapChecklistItem(row: any): LegalKanbanChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    content: row.content,
    position: row.position,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
  };
}

async function getCurrentPublicUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    throw new Error("Usuário autenticado não encontrado.");
  }

  const response = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .single();

  return mapUser(ensureData(response as QueryResponse<User>, "Perfil do usuário não encontrado."));
}

async function logActivity(
  cardId: string,
  actorUserId: string,
  activityType: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  await db.from("legal_kanban_activities").insert({
    card_id: cardId,
    actor_user_id: actorUserId,
    activity_type: activityType,
    message,
    metadata,
  });
}

async function updateRowsSequentially<T extends { id: string }>(
  table: string,
  rows: T[],
  buildPayload: (row: T) => Record<string, unknown>,
) {
  for (const row of rows) {
    const response = await db.from(table).update(buildPayload(row)).eq("id", row.id);

    if (response.error) {
      throw new Error(response.error.message || `Não foi possível atualizar registros em ${table}.`);
    }
  }
}

async function ensureBoardExists() {
  const boardResponse = await db
    .from("legal_kanban_boards")
    .select("*")
    .eq("slug", LEGAL_KANBAN_BOARD_SLUG)
    .maybeSingle();

  if (boardResponse.data) {
    return mapBoard(boardResponse.data);
  }

  const insertedBoard = await db
    .from("legal_kanban_boards")
    .insert({
      slug: LEGAL_KANBAN_BOARD_SLUG,
      title: "Kanban Jurídico",
      description: "Board compartilhado do setor jurídico.",
      icon: "briefcase",
    })
    .select("*")
    .single();

  const board = mapBoard(ensureData(insertedBoard, "Não foi possível criar o board jurídico."));

  await db.from("legal_kanban_columns").insert(
    LEGAL_KANBAN_DEFAULT_COLUMNS.map((column) => ({
      board_id: board.id,
      title: column.title,
      color: column.color,
      position: column.position,
      kind: column.kind,
      is_default: true,
    })),
  );

  return board;
}

async function getBoardContext() {
  const board = await ensureBoardExists();

  const [columnsResponse, labelsResponse, customFieldsResponse, cardsResponse, membersResponse] = await Promise.all([
    db.from("legal_kanban_columns").select("*").eq("board_id", board.id).order("position"),
    db.from("legal_kanban_labels").select("*").eq("board_id", board.id).order("position"),
    db.from("legal_kanban_custom_fields").select("*").eq("board_id", board.id).order("position"),
    db.from("legal_kanban_cards").select("*").eq("board_id", board.id).order("position"),
    supabase
      .from("users")
      .select("*")
      .eq("status", "ativo")
      .in("role", ["advogado", "advogado_adm"])
      .order("name"),
  ]);

  return {
    board,
    columns: maybeArray(columnsResponse.data).map(mapColumn),
    labels: maybeArray(labelsResponse.data).map(mapLabel),
    customFields: maybeArray(customFieldsResponse.data).map(mapCustomField),
    cards: maybeArray(cardsResponse.data).map(mapCardBase),
    members: maybeArray(membersResponse.data).map(mapUser),
  };
}

async function hydrateCards(cards: LegalKanbanCardBase[]): Promise<LegalKanbanCard[]> {
  if (cards.length === 0) {
    return [];
  }

  const cardIds = cards.map((card) => card.id);
  const [membersResponse, labelsResponse, commentsResponse, attachmentsResponse, checklistsResponse, customValuesResponse] =
    await Promise.all([
      db
        .from("legal_kanban_card_members")
        .select("id, card_id, user:users ( id, name, email, role, status )")
        .in("card_id", cardIds),
      db
        .from("legal_kanban_card_labels")
        .select("id, card_id, label:legal_kanban_labels ( id, board_id, name, color, position )")
        .in("card_id", cardIds),
      db.from("legal_kanban_comments").select("id, card_id").in("card_id", cardIds),
      db.from("legal_kanban_attachments").select("id, card_id").in("card_id", cardIds),
      db.from("legal_kanban_checklists").select("id, card_id").in("card_id", cardIds),
      db
        .from("legal_kanban_card_custom_field_values")
        .select("*")
        .in("card_id", cardIds),
    ]);

  const checklistItemsResponse =
    maybeArray(checklistsResponse.data).length > 0
      ? await db
          .from("legal_kanban_checklist_items")
          .select("id, checklist_id, is_completed")
          .in(
            "checklist_id",
            maybeArray(checklistsResponse.data).map((checklist: any) => checklist.id),
          )
      : { data: [], error: null };

  const membersMap = new Map<string, LegalKanbanCardMember[]>();
  maybeArray(membersResponse.data).forEach((row: any) => {
    const current = membersMap.get(row.card_id) || [];
    current.push(mapCardMember(row));
    membersMap.set(row.card_id, current);
  });

  const labelsMap = new Map<string, LegalKanbanLabel[]>();
  maybeArray(labelsResponse.data).forEach((row: any) => {
    const current = labelsMap.get(row.card_id) || [];
    current.push(mapLabel(row.label));
    labelsMap.set(row.card_id, sortByPosition(current));
  });

  const commentsCountMap = new Map<string, number>();
  maybeArray(commentsResponse.data).forEach((row: any) => {
    commentsCountMap.set(row.card_id, (commentsCountMap.get(row.card_id) || 0) + 1);
  });

  const attachmentsCountMap = new Map<string, number>();
  maybeArray(attachmentsResponse.data).forEach((row: any) => {
    attachmentsCountMap.set(row.card_id, (attachmentsCountMap.get(row.card_id) || 0) + 1);
  });

  const checklistToCardMap = new Map<string, string>();
  maybeArray(checklistsResponse.data).forEach((row: any) => {
    checklistToCardMap.set(row.id, row.card_id);
  });

  const checklistStatsMap = new Map<string, { total: number; completed: number }>();
  maybeArray(checklistItemsResponse.data).forEach((row: any) => {
    const cardId = checklistToCardMap.get(row.checklist_id);
    if (!cardId) return;
    const current = checklistStatsMap.get(cardId) || { total: 0, completed: 0 };
    current.total += 1;
    if (row.is_completed) current.completed += 1;
    checklistStatsMap.set(cardId, current);
  });

  const customValuesMap = new Map<string, LegalKanbanCustomFieldValue[]>();
  maybeArray(customValuesResponse.data).forEach((row: any) => {
    const current = customValuesMap.get(row.card_id) || [];
    current.push(mapCustomFieldValue(row));
    customValuesMap.set(row.card_id, current);
  });

  return cards.map((card) => ({
    ...card,
    members: membersMap.get(card.id) || [],
    labels: labelsMap.get(card.id) || [],
    checklistStats: checklistStatsMap.get(card.id) || { total: 0, completed: 0 },
    commentsCount: commentsCountMap.get(card.id) || 0,
    attachmentsCount: attachmentsCountMap.get(card.id) || 0,
    customFieldValues: customValuesMap.get(card.id) || [],
  }));
}

export const legalKanbanService = {
  async getBoardData(): Promise<LegalKanbanBoardData> {
    const context = await getBoardContext();
    const cards = await hydrateCards(context.cards);

    const columns = sortByPosition(context.columns).map((column) => ({
      ...column,
      cards: sortByPosition(cards.filter((card) => card.columnId === column.id)),
    }));

    return {
      board: context.board,
      columns,
      labels: context.labels,
      customFields: context.customFields,
      members: context.members,
    };
  },

  async getCardDetails(cardId: string): Promise<LegalKanbanCardDetails> {
    const [cardResponse, membersResponse, labelsResponse, commentsResponse, activitiesResponse, attachmentsResponse, checklistsResponse, customValuesResponse] =
      await Promise.all([
        db.from("legal_kanban_cards").select("*").eq("id", cardId).single(),
        db
          .from("legal_kanban_card_members")
          .select("id, card_id, user:users ( id, name, email, role, status )")
          .eq("card_id", cardId),
        db
          .from("legal_kanban_card_labels")
          .select("id, card_id, label:legal_kanban_labels ( id, board_id, name, color, position )")
          .eq("card_id", cardId),
        db
          .from("legal_kanban_comments")
          .select("*, author:users ( id, name, email, role, status )")
          .eq("card_id", cardId)
          .order("created_at", { ascending: true }),
        db
          .from("legal_kanban_activities")
          .select("*, actor:users ( id, name, email, role, status )")
          .eq("card_id", cardId)
          .order("created_at", { ascending: false }),
        db
          .from("legal_kanban_attachments")
          .select("*")
          .eq("card_id", cardId)
          .order("created_at", { ascending: false }),
        db
          .from("legal_kanban_checklists")
          .select("*, items:legal_kanban_checklist_items ( * )")
          .eq("card_id", cardId)
          .order("position"),
        db
          .from("legal_kanban_card_custom_field_values")
          .select("*")
          .eq("card_id", cardId),
      ]);

    const card = mapCardBase(ensureData(cardResponse, "Card não encontrado."));
    const members = maybeArray(membersResponse.data).map(mapCardMember);
    const labels = maybeArray(labelsResponse.data).map((row: any) => mapLabel(row.label));
    const comments = maybeArray(commentsResponse.data).map(mapComment);
    const activities = maybeArray(activitiesResponse.data).map(mapActivity);
    const attachments = maybeArray(attachmentsResponse.data).map(mapAttachment);
    const checklists: LegalKanbanChecklist[] = maybeArray(checklistsResponse.data).map((row: any) => ({
      id: row.id,
      cardId: row.card_id,
      title: row.title,
      position: row.position,
      items: sortByPosition(maybeArray(row.items).map(mapChecklistItem)),
    }));
    const customFieldValues = maybeArray(customValuesResponse.data).map(mapCustomFieldValue);

    const checklistStats = checklists.reduce(
      (acc, checklist) => {
        acc.total += checklist.items.length;
        acc.completed += checklist.items.filter((item) => item.isCompleted).length;
        return acc;
      },
      { total: 0, completed: 0 },
    );

    return {
      ...card,
      members,
      labels: sortByPosition(labels),
      checklistStats,
      commentsCount: comments.length,
      attachmentsCount: attachments.length,
      customFieldValues,
      comments,
      activities,
      attachments,
      checklists: sortByPosition(checklists),
    };
  },

  async createCard(input: CreateLegalKanbanCardInput) {
    const actor = await getCurrentPublicUser();
    const currentCards = await db
      .from("legal_kanban_cards")
      .select("position")
      .eq("column_id", input.columnId)
      .order("position");

    const nextPosition =
      maybeArray(currentCards.data).reduce((max: number, item: any) => Math.max(max, item.position || 0), 0) + 100;

    const response = await db
      .from("legal_kanban_cards")
      .insert({
        board_id: input.boardId,
        column_id: input.columnId,
        title: input.title,
        position: nextPosition,
        created_by_user_id: actor.id,
        updated_by_user_id: actor.id,
      })
      .select("*")
      .single();

    const card = mapCardBase(ensureData(response, "Não foi possível criar o card."));
    await logActivity(card.id, actor.id, "card_created", `Criou o card "${card.title}".`);
    return card;
  },

  async updateCard(cardId: string, input: UpdateLegalKanbanCardInput) {
    const actor = await getCurrentPublicUser();
    const payload: Record<string, unknown> = {
      updated_by_user_id: actor.id,
    };

    if (input.title !== undefined) payload.title = input.title;
    if (input.descriptionJson !== undefined) payload.description_json = input.descriptionJson;
    if (input.descriptionText !== undefined) payload.description_text = input.descriptionText;
    if (input.status !== undefined) payload.status = input.status;
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.coverColor !== undefined) payload.cover_color = input.coverColor;
    if (input.startDate !== undefined) payload.start_date = input.startDate;
    if (input.dueDate !== undefined) payload.due_date = input.dueDate;
    if (input.reminderAt !== undefined) payload.reminder_at = input.reminderAt;
    if (input.recurrenceRule !== undefined) payload.recurrence_rule = input.recurrenceRule || null;
    if (input.completedAt !== undefined) payload.completed_at = input.completedAt;

    const response = await db.from("legal_kanban_cards").update(payload).eq("id", cardId).select("*").single();
    const card = mapCardBase(ensureData(response, "Não foi possível atualizar o card."));
    await logActivity(cardId, actor.id, "card_updated", `Atualizou o card "${card.title}".`);
    return card;
  },

  async moveCard(cardId: string, sourceColumnId: string, destinationColumnId: string, destinationIndex: number) {
    const actor = await getCurrentPublicUser();

    const response = await db
      .from("legal_kanban_cards")
      .select("id, column_id, position")
      .in("column_id", sourceColumnId === destinationColumnId ? [sourceColumnId] : [sourceColumnId, destinationColumnId])
      .order("position");

    const rows = maybeArray(response.data);
    const sourceCards = sortByPosition(rows.filter((row: any) => row.column_id === sourceColumnId));
    const destinationCards =
      sourceColumnId === destinationColumnId
        ? [...sourceCards]
        : sortByPosition(rows.filter((row: any) => row.column_id === destinationColumnId));

    const sourceIndex = sourceCards.findIndex((row: any) => row.id === cardId);
    if (sourceIndex === -1) {
      throw new Error("Card não encontrado para movimentação.");
    }

    const [moved] = sourceCards.splice(sourceIndex, 1);
    const normalizedDestinationIndex =
      sourceColumnId === destinationColumnId && sourceIndex < destinationIndex
        ? Math.max(destinationIndex - 1, 0)
        : destinationIndex;

    if (sourceColumnId === destinationColumnId) {
      sourceCards.splice(normalizedDestinationIndex, 0, moved);
      const nextSource = reindexByHundreds(sourceCards);

      await updateRowsSequentially("legal_kanban_cards", nextSource, (item) => ({
        column_id: sourceColumnId,
        position: item.position,
        updated_by_user_id: actor.id,
      }));
    } else {
      destinationCards.splice(destinationIndex, 0, { ...moved, column_id: destinationColumnId });

      const nextSource = reindexByHundreds(sourceCards);
      const nextDestination = reindexByHundreds(destinationCards);

      await updateRowsSequentially("legal_kanban_cards", nextSource, (item) => ({
        column_id: sourceColumnId,
        position: item.position,
        updated_by_user_id: actor.id,
      }));

      await updateRowsSequentially("legal_kanban_cards", nextDestination, (item: any) => ({
        column_id: item.column_id,
        position: item.position,
        updated_by_user_id: actor.id,
      }));
    }

    await logActivity(cardId, actor.id, "card_moved", "Movimentou o card entre raias.", {
      sourceColumnId,
      destinationColumnId,
    });
  },

  async createColumn(input: CreateLegalKanbanColumnInput) {
    const current = await db
      .from("legal_kanban_columns")
      .select("position")
      .eq("board_id", input.boardId)
      .order("position");

    const nextPosition =
      maybeArray(current.data).reduce((max: number, item: any) => Math.max(max, item.position || 0), 0) + 100;

    const response = await db
      .from("legal_kanban_columns")
      .insert({
        board_id: input.boardId,
        title: input.title,
        color: input.color,
        position: nextPosition,
      })
      .select("*")
      .single();

    return mapColumn(ensureData(response, "Não foi possível criar a raia."));
  },

  async updateColumn(columnId: string, input: Partial<CreateLegalKanbanColumnInput>) {
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = input.title;
    if (input.color !== undefined) payload.color = input.color;

    const response = await db
      .from("legal_kanban_columns")
      .update(payload)
      .eq("id", columnId)
      .select("*")
      .single();

    return mapColumn(ensureData(response, "Não foi possível atualizar a raia."));
  },

  async reorderColumns(columns: LegalKanbanColumn[]) {
    const nextColumns = reindexByHundreds(columns);

    await updateRowsSequentially("legal_kanban_columns", nextColumns, (column) => ({
      position: column.position,
    }));
  },

  async deleteColumn(columnId: string) {
    const cards = await db.from("legal_kanban_cards").select("id").eq("column_id", columnId).limit(1);
    if (maybeArray(cards.data).length > 0) {
      throw new Error("Mova os cards antes de remover a raia.");
    }

    await db.from("legal_kanban_columns").delete().eq("id", columnId);
  },

  async createLabel(input: CreateLegalKanbanLabelInput) {
    const current = await db
      .from("legal_kanban_labels")
      .select("position")
      .eq("board_id", input.boardId)
      .order("position");

    const nextPosition =
      maybeArray(current.data).reduce((max: number, item: any) => Math.max(max, item.position || 0), 0) + 100;

    const response = await db
      .from("legal_kanban_labels")
      .insert({
        board_id: input.boardId,
        name: input.name,
        color: input.color || buildColorFromName(input.name),
        position: nextPosition,
      })
      .select("*")
      .single();

    return mapLabel(ensureData(response, "Não foi possível criar a etiqueta."));
  },

  async deleteLabel(labelId: string) {
    await db.from("legal_kanban_card_labels").delete().eq("label_id", labelId);
    await db.from("legal_kanban_labels").delete().eq("id", labelId);
  },

  async createCustomField(input: CreateLegalKanbanCustomFieldInput) {
    const current = await db
      .from("legal_kanban_custom_fields")
      .select("position")
      .eq("board_id", input.boardId)
      .order("position");

    const nextPosition =
      maybeArray(current.data).reduce((max: number, item: any) => Math.max(max, item.position || 0), 0) + 100;

    const response = await db
      .from("legal_kanban_custom_fields")
      .insert({
        board_id: input.boardId,
        name: input.name,
        field_type: input.fieldType,
        options: input.options || [],
        is_required: input.isRequired || false,
        position: nextPosition,
      })
      .select("*")
      .single();

    return mapCustomField(ensureData(response, "Não foi possível criar o campo personalizado."));
  },

  async deleteCustomField(fieldId: string) {
    await db.from("legal_kanban_card_custom_field_values").delete().eq("custom_field_id", fieldId);
    await db.from("legal_kanban_custom_fields").delete().eq("id", fieldId);
  },

  async setCardMembers(cardId: string, memberIds: string[]) {
    const actor = await getCurrentPublicUser();
    await db.from("legal_kanban_card_members").delete().eq("card_id", cardId);

    if (memberIds.length > 0) {
      await db.from("legal_kanban_card_members").insert(
        memberIds.map((memberId) => ({
          card_id: cardId,
          user_id: memberId,
        })),
      );
    }

    await logActivity(cardId, actor.id, "members_updated", "Atualizou os membros do card.", { memberIds });
  },

  async setCardLabels(cardId: string, labelIds: string[]) {
    const actor = await getCurrentPublicUser();
    await db.from("legal_kanban_card_labels").delete().eq("card_id", cardId);

    if (labelIds.length > 0) {
      await db.from("legal_kanban_card_labels").insert(
        labelIds.map((labelId) => ({
          card_id: cardId,
          label_id: labelId,
        })),
      );
    }

    await logActivity(cardId, actor.id, "labels_updated", "Atualizou as etiquetas do card.", { labelIds });
  },

  async addComment(cardId: string, content: string) {
    const actor = await getCurrentPublicUser();
    const response = await db
      .from("legal_kanban_comments")
      .insert({
        card_id: cardId,
        author_user_id: actor.id,
        content,
      })
      .select("*, author:author_user_id ( id, name, email, role, status )")
      .single();

    await logActivity(cardId, actor.id, "comment_added", "Adicionou um comentário.");
    return mapComment(ensureData(response, "Não foi possível salvar o comentário."));
  },

  async addChecklist(cardId: string, title: string) {
    const current = await db
      .from("legal_kanban_checklists")
      .select("position")
      .eq("card_id", cardId)
      .order("position");

    const nextPosition =
      maybeArray(current.data).reduce((max: number, item: any) => Math.max(max, item.position || 0), 0) + 100;

    const response = await db
      .from("legal_kanban_checklists")
      .insert({
        card_id: cardId,
        title,
        position: nextPosition,
      })
      .select("*")
      .single();

    const checklist = ensureData(response, "Não foi possível criar a checklist.");
    const actor = await getCurrentPublicUser();
    await logActivity(cardId, actor.id, "checklist_added", `Criou a checklist "${title}".`);

    return {
      id: checklist.id,
      cardId: checklist.card_id,
      title: checklist.title,
      position: checklist.position,
      items: [],
    } satisfies LegalKanbanChecklist;
  },

  async deleteChecklist(checklistId: string) {
    const response = await db
      .from("legal_kanban_checklists")
      .delete()
      .eq("id", checklistId)
      .select("id, card_id, title")
      .single();

    const checklist = ensureData(response, "Não foi possível excluir a checklist.");
    const actor = await getCurrentPublicUser();
    await logActivity(checklist.card_id, actor.id, "checklist_deleted", `Excluiu a checklist "${checklist.title}".`);

    return checklist;
  },

  async addChecklistItem(checklistId: string, content: string) {
    const current = await db
      .from("legal_kanban_checklist_items")
      .select("position")
      .eq("checklist_id", checklistId)
      .order("position");

    const nextPosition =
      maybeArray(current.data).reduce((max: number, item: any) => Math.max(max, item.position || 0), 0) + 100;

    const response = await db
      .from("legal_kanban_checklist_items")
      .insert({
        checklist_id: checklistId,
        content,
        position: nextPosition,
      })
      .select("*")
      .single();

    return mapChecklistItem(ensureData(response, "Não foi possível criar o item da checklist."));
  },

  async toggleChecklistItem(itemId: string, completed: boolean) {
    const actor = await getCurrentPublicUser();
    const response = await db
      .from("legal_kanban_checklist_items")
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by_user_id: completed ? actor.id : null,
      })
      .eq("id", itemId)
      .select("*")
      .single();

    return mapChecklistItem(ensureData(response, "Não foi possível atualizar o item da checklist."));
  },

  async saveCustomFieldValue(
    cardId: string,
    customFieldId: string,
    valueText: string | null,
    valueJson: Record<string, unknown>,
  ) {
    const response = await db
      .from("legal_kanban_card_custom_field_values")
      .upsert({
        card_id: cardId,
        custom_field_id: customFieldId,
        value_text: valueText,
        value_json: valueJson,
      })
      .select("*")
      .single();

    return mapCustomFieldValue(ensureData(response, "Não foi possível salvar o campo personalizado."));
  },

  async deleteCustomFieldValue(cardId: string, customFieldId: string) {
    const response = await db
      .from("legal_kanban_card_custom_field_values")
      .delete()
      .eq("card_id", cardId)
      .eq("custom_field_id", customFieldId);

    if (response.error) {
      throw new Error(response.error.message || "Não foi possível remover o valor do campo.");
    }
  },

  async addLinkAttachment(cardId: string, name: string, url: string) {
    const actor = await getCurrentPublicUser();
    const response = await db
      .from("legal_kanban_attachments")
      .insert({
        card_id: cardId,
        created_by_user_id: actor.id,
        attachment_type: "link",
        name,
        url,
      })
      .select("*")
      .single();

    await logActivity(cardId, actor.id, "attachment_added", `Anexou o link "${name}".`);
    return mapAttachment(ensureData(response, "Não foi possível salvar o link."));
  },

  async uploadAttachment(cardId: string, file: File) {
    const actor = await getCurrentPublicUser();
    const fileExt = file.name.split(".").pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${cardId}/${Date.now()}-${safeName}${fileExt ? "" : ""}`;

    const uploadResponse = await supabase.storage
      .from(LEGAL_KANBAN_STORAGE_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (uploadResponse.error) {
      throw new Error(uploadResponse.error.message);
    }

    const response = await db
      .from("legal_kanban_attachments")
      .insert({
        card_id: cardId,
        created_by_user_id: actor.id,
        attachment_type: "file",
        name: file.name,
        file_path: uploadResponse.data.path,
        mime_type: file.type,
        file_size: file.size,
      })
      .select("*")
      .single();

    await logActivity(cardId, actor.id, "attachment_added", `Enviou o arquivo "${file.name}".`);
    return mapAttachment(ensureData(response, "Não foi possível registrar o anexo."));
  },

  async getAttachmentUrl(attachment: LegalKanbanAttachment) {
    if (attachment.attachmentType === "link") {
      return attachment.url;
    }

    if (!attachment.filePath) {
      return null;
    }

    const response = await supabase.storage
      .from(LEGAL_KANBAN_STORAGE_BUCKET)
      .createSignedUrl(attachment.filePath, 60 * 5);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data.signedUrl;
  },
};
