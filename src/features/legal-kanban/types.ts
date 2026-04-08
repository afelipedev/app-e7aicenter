import type { UserRole } from "@/lib/supabase";

export type KanbanPriority = "baixa" | "media" | "alta" | "urgente";
export type KanbanStatus = "ativo" | "bloqueado" | "concluido" | "arquivado";
export type KanbanFieldType = "text" | "number" | "date" | "select" | "checkbox";
export type KanbanAttachmentType = "file" | "link";
export type KanbanDueFilter = "all" | "none" | "overdue" | "day" | "week" | "month";
export type KanbanMemberFilterMode = "all" | "unassigned" | "assignedToMe" | "specificMembers";

export type RichTextDoc = Record<string, unknown>;

export interface LegalKanbanUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "ativo" | "inativo";
}

export interface LegalKanbanBoard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  isLocked: boolean;
}

export interface LegalKanbanColumn {
  id: string;
  boardId: string;
  title: string;
  color: string;
  position: number;
  kind: string;
  isDefault: boolean;
  isArchived: boolean;
}

export interface LegalKanbanLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
}

export interface LegalKanbanCustomField {
  id: string;
  boardId: string;
  name: string;
  fieldType: KanbanFieldType;
  position: number;
  isRequired: boolean;
  options: string[];
}

export interface LegalKanbanCardMember {
  id: string;
  user: LegalKanbanUser;
}

export interface LegalKanbanChecklistItem {
  id: string;
  checklistId: string;
  content: string;
  position: number;
  isCompleted: boolean;
  completedAt: string | null;
  completedByUserId: string | null;
}

export interface LegalKanbanChecklist {
  id: string;
  cardId: string;
  title: string;
  position: number;
  items: LegalKanbanChecklistItem[];
}

export interface LegalKanbanAttachment {
  id: string;
  cardId: string;
  attachmentType: KanbanAttachmentType;
  name: string;
  url: string | null;
  filePath: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface LegalKanbanComment {
  id: string;
  cardId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: LegalKanbanUser | null;
}

export interface LegalKanbanActivity {
  id: string;
  cardId: string;
  activityType: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: LegalKanbanUser | null;
}

export interface LegalKanbanCustomFieldValue {
  id: string;
  cardId: string;
  customFieldId: string;
  valueText: string | null;
  valueJson: Record<string, unknown>;
}

export interface LegalKanbanCardBase {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  cardNumber: number;
  descriptionJson: RichTextDoc;
  descriptionText: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  coverColor: string | null;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  reminderAt: string | null;
  recurrenceRule: string | null;
  completedAt: string | null;
  processSnapshotId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegalKanbanCard extends LegalKanbanCardBase {
  members: LegalKanbanCardMember[];
  labels: LegalKanbanLabel[];
  checklistStats: {
    total: number;
    completed: number;
  };
  commentsCount: number;
  attachmentsCount: number;
  customFieldValues: LegalKanbanCustomFieldValue[];
}

export interface LegalKanbanCardDetails extends LegalKanbanCard {
  comments: LegalKanbanComment[];
  activities: LegalKanbanActivity[];
  attachments: LegalKanbanAttachment[];
  checklists: LegalKanbanChecklist[];
}

export interface LegalKanbanColumnWithCards extends LegalKanbanColumn {
  cards: LegalKanbanCard[];
}

export interface LegalKanbanBoardData {
  board: LegalKanbanBoard;
  columns: LegalKanbanColumnWithCards[];
  labels: LegalKanbanLabel[];
  customFields: LegalKanbanCustomField[];
  members: LegalKanbanUser[];
}

export interface LegalKanbanFiltersState {
  search: string;
  memberMode: KanbanMemberFilterMode;
  memberIds: string[];
  statuses: KanbanStatus[];
  dueFilter: KanbanDueFilter;
  labelIds: string[];
}

export interface CreateLegalKanbanCardInput {
  boardId: string;
  columnId: string;
  title: string;
}

export interface UpdateLegalKanbanCardInput {
  title?: string;
  descriptionJson?: RichTextDoc;
  descriptionText?: string;
  status?: KanbanStatus;
  priority?: KanbanPriority;
  coverColor?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  recurrenceRule?: string | null;
  completedAt?: string | null;
}

export interface CreateLegalKanbanColumnInput {
  boardId: string;
  title: string;
  color: string;
}

export interface CreateLegalKanbanLabelInput {
  boardId: string;
  name: string;
  color: string;
}

export interface CreateLegalKanbanCustomFieldInput {
  boardId: string;
  name: string;
  fieldType: KanbanFieldType;
  options?: string[];
  isRequired?: boolean;
}
