import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Circle,
  FormInput,
  History,
  Link2,
  ListChecks,
  Pencil,
  Trash2,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Tag,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LegalKanbanRichTextEditor } from "@/features/legal-kanban/components/editor/LegalKanbanRichTextEditor";
import { createEmptyRichTextDoc } from "@/features/legal-kanban/components/editor/extensions";
import {
  LEGAL_KANBAN_COLOR_PRESETS,
  LEGAL_KANBAN_PRIORITY_META,
  LEGAL_KANBAN_STATUS_META,
} from "../constants";
import {
  useAddLegalKanbanChecklist,
  useAddLegalKanbanChecklistItem,
  useAddLegalKanbanComment,
  useDeleteLegalKanbanTimelineItem,
  useAddLegalKanbanLinkAttachment,
  useCreateLegalKanbanLabel,
  useDeleteLegalKanbanChecklist,
  useLegalKanbanCardDetails,
  useSaveLegalKanbanCustomFieldValue,
  useSetLegalKanbanCardLabels,
  useSetLegalKanbanCardMembers,
  useToggleLegalKanbanChecklistItem,
  useDeleteLegalKanbanCustomFieldValue,
  useUpdateLegalKanbanCard,
  useUploadLegalKanbanAttachment,
} from "../hooks/useLegalKanbanBoard";
import { legalKanbanService } from "../services/legalKanbanService";
import type {
  KanbanPriority,
  KanbanStatus,
  LegalKanbanBoardData,
  LegalKanbanCustomField,
  LegalKanbanCustomFieldValue,
  LegalKanbanLabel,
  LegalKanbanUser,
  RichTextDoc,
} from "../types";
import { formatKanbanDatetimeLocal, formatRelativeDate, getMemberInitials } from "../utils";

const TIMELINE_PAGE_SIZE = 5;

interface LegalKanbanCardDetailsSheetProps {
  cardId: string | null;
  open: boolean;
  board: LegalKanbanBoardData;
  onOpenChange: (open: boolean) => void;
  /** Fecha o card e abre o sheet Configurar board (apenas perfis com permissão). */
  onRequestBoardSettings?: () => void;
}

export function LegalKanbanCardDetailsSheet({
  cardId,
  open,
  board,
  onOpenChange,
  onRequestBoardSettings,
}: LegalKanbanCardDetailsSheetProps) {
  type InlinePanel = "members" | "attachments" | null;

  const { user } = useAuth();
  const canManageBoard = user?.role === "administrator" || user?.role === "advogado_adm";
  const { data, isLoading } = useLegalKanbanCardDetails(cardId);
  const updateCard = useUpdateLegalKanbanCard(cardId || "");
  const setMembers = useSetLegalKanbanCardMembers(cardId || "");
  const setLabels = useSetLegalKanbanCardLabels(cardId || "");
  const addComment = useAddLegalKanbanComment(cardId || "");
  const deleteTimelineItem = useDeleteLegalKanbanTimelineItem(cardId || "");
  const addChecklist = useAddLegalKanbanChecklist(cardId || "");
  const deleteChecklist = useDeleteLegalKanbanChecklist(cardId || "");
  const addChecklistItem = useAddLegalKanbanChecklistItem(cardId || "");
  const toggleChecklistItem = useToggleLegalKanbanChecklistItem(cardId || "");
  const saveCustomFieldValue = useSaveLegalKanbanCustomFieldValue(cardId || "");
  const deleteCustomFieldValue = useDeleteLegalKanbanCustomFieldValue(cardId || "");
  const addLinkAttachment = useAddLegalKanbanLinkAttachment(cardId || "");
  const uploadAttachment = useUploadLegalKanbanAttachment(cardId || "");
  const createLabel = useCreateLegalKanbanLabel();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<RichTextDoc>(createEmptyRichTextDoc());
  const [descriptionText, setDescriptionText] = useState("");
  const [status, setStatus] = useState<keyof typeof LEGAL_KANBAN_STATUS_META>("ativo");
  const [priority, setPriority] = useState<keyof typeof LEGAL_KANBAN_PRIORITY_META>("media");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [linkDraft, setLinkDraft] = useState({ name: "", url: "" });
  const [customFieldDrafts, setCustomFieldDrafts] = useState<Record<string, string | boolean>>({});
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [customFieldsEditDialogOpen, setCustomFieldsEditDialogOpen] = useState(false);
  const [attachmentLoadingId, setAttachmentLoadingId] = useState<string | null>(null);
  const [inlinePanel, setInlinePanel] = useState<InlinePanel>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [checklistsOpen, setChecklistsOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState("");
  const [newLabelDraft, setNewLabelDraft] = useState({
    name: "",
    color: LEGAL_KANBAN_COLOR_PRESETS[0],
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineDeleteTarget, setTimelineDeleteTarget] = useState<{
    kind: "comment" | "activity";
    sourceId: string;
  } | null>(null);
  const commentsSectionRef = useRef<HTMLElement | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!data) return;

    setTitle(data.title);
    setDescription((data.descriptionJson as RichTextDoc) || createEmptyRichTextDoc());
    setDescriptionText(data.descriptionText || "");
    setStatus(data.status);
    setPriority(data.priority);
    setStartDate(toInputDateTime(data.startDate));
    setDueDate(toInputDateTime(data.dueDate));
    setReminderAt(toInputDateTime(data.reminderAt));
    setCustomFieldDrafts(buildCustomFieldDrafts(board.customFields, data.customFieldValues));
  }, [board.customFields, data]);

  useEffect(() => {
    setTimelinePage(1);
    setTimelineDeleteTarget(null);
  }, [cardId]);

  useEffect(() => {
    if (!open) setTimelineDeleteTarget(null);
  }, [open]);

  const selectedMemberIds = useMemo(
    () => new Set(data?.members.map((member) => member.user.id) || []),
    [data?.members],
  );
  const selectedLabelIds = useMemo(() => new Set(data?.labels.map((label) => label.id) || []), [data?.labels]);
  const currentColumn = useMemo(
    () => board.columns.find((column) => column.id === data?.columnId) || null,
    [board.columns, data?.columnId],
  );
  const filteredLabels = useMemo(() => {
    const normalized = labelSearch.trim().toLowerCase();
    if (!normalized) return board.labels;
    return board.labels.filter((label) => label.name.toLowerCase().includes(normalized));
  }, [board.labels, labelSearch]);
  const filteredMembers = useMemo(() => {
    const normalized = memberSearch.trim().toLowerCase();
    if (!normalized) return board.members;
    return board.members.filter((member) => member.name.toLowerCase().includes(normalized));
  }, [board.members, memberSearch]);
  const statusKeys = useMemo(
    () => Object.keys(LEGAL_KANBAN_STATUS_META) as KanbanStatus[],
    [],
  );
  const priorityKeys = useMemo(
    () => Object.keys(LEGAL_KANBAN_PRIORITY_META) as KanbanPriority[],
    [],
  );
  const timeline = useMemo(() => {
    if (!data) return [];

    const comments = data.comments.map((comment) => ({
      id: `comment-${comment.id}`,
      sourceId: comment.id,
      kind: "comment" as const,
      createdAt: comment.createdAt,
      author: comment.author,
      title: comment.author?.name || "Usuário removido",
      body: comment.content,
    }));

    const activities = data.activities
      .filter(
        (activity) =>
          activity.activityType !== "comment_added" &&
          activity.message.trim() !== "Adicionou um comentário.",
      )
      .map((activity) => ({
        id: `activity-${activity.id}`,
        sourceId: activity.id,
        kind: "activity" as const,
        createdAt: activity.createdAt,
        author: activity.actor,
        title: activity.actor?.name || "Sistema",
        body: activity.message,
      }));

    return [...comments, ...activities].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [data]);

  const timelineTotalPages = Math.ceil(timeline.length / TIMELINE_PAGE_SIZE);
  const timelinePageSafe = timelineTotalPages > 0 ? Math.min(timelinePage, timelineTotalPages) : 1;
  const paginatedTimeline = useMemo(() => {
    const start = (timelinePageSafe - 1) * TIMELINE_PAGE_SIZE;
    return timeline.slice(start, start + TIMELINE_PAGE_SIZE);
  }, [timeline, timelinePageSafe]);

  useEffect(() => {
    if (timelineTotalPages > 0 && timelinePage > timelineTotalPages) {
      setTimelinePage(timelineTotalPages);
    }
  }, [timelinePage, timelineTotalPages]);

  async function handleSaveCard() {
    if (!cardId) return;
    try {
      await updateCard.mutateAsync({
        title: title.trim(),
        descriptionJson: description,
        descriptionText,
        status,
        priority,
        startDate: fromInputDateTime(startDate),
        dueDate: fromInputDateTime(dueDate),
        reminderAt: fromInputDateTime(reminderAt),
        recurrenceRule: "",
        completedAt: status === "concluido" ? new Date().toISOString() : null,
      });
      toast.success("Card atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o card.");
    }
  }

  async function handleToggleCompleted() {
    if (!data) return;

    const nextStatus = data.status === "concluido" ? "ativo" : "concluido";

    try {
      await updateCard.mutateAsync({
        status: nextStatus,
        completedAt: nextStatus === "concluido" ? new Date().toISOString() : null,
      });
      setStatus(nextStatus);
      toast.success(nextStatus === "concluido" ? "Card concluído." : "Card reaberto.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o status do card.");
    }
  }

  async function handleStatusChange(next: KanbanStatus) {
    if (!cardId || next === status) return;
    try {
      await updateCard.mutateAsync({
        status: next,
        completedAt: next === "concluido" ? new Date().toISOString() : null,
      });
      setStatus(next);
      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o status.");
    }
  }

  async function handlePriorityChange(next: KanbanPriority) {
    if (!cardId || next === priority) return;
    try {
      await updateCard.mutateAsync({ priority: next });
      setPriority(next);
      toast.success("Prioridade atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar a prioridade.");
    }
  }

  async function handleToggleMember(memberId: string) {
    if (!data || !cardId) return;
    const next = selectedMemberIds.has(memberId)
      ? data.members.map((member) => member.user.id).filter((id) => id !== memberId)
      : [...data.members.map((member) => member.user.id), memberId];

    try {
      await setMembers.mutateAsync(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar os membros.");
    }
  }

  async function handleToggleLabel(labelId: string) {
    if (!data || !cardId) return;
    const next = selectedLabelIds.has(labelId)
      ? data.labels.map((label) => label.id).filter((id) => id !== labelId)
      : [...data.labels.map((label) => label.id), labelId];

    try {
      await setLabels.mutateAsync(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar as etiquetas.");
    }
  }

  async function handleCreateLabel() {
    if (!newLabelDraft.name.trim()) {
      toast.error("Informe o nome da etiqueta.");
      return;
    }

    try {
      const label = await createLabel.mutateAsync({
        boardId: board.board.id,
        name: newLabelDraft.name.trim(),
        color: newLabelDraft.color,
      });
      await setLabels.mutateAsync([...data!.labels.map((item) => item.id), label.id]);
      setNewLabelDraft({ name: "", color: LEGAL_KANBAN_COLOR_PRESETS[0] });
      setLabelsOpen(true);
      toast.success("Etiqueta criada e vinculada ao card.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar etiqueta.");
    }
  }

  async function handleAddComment() {
    if (!commentDraft.trim()) return;
    try {
      await addComment.mutateAsync(commentDraft.trim());
      setCommentDraft("");
      setTimelinePage(1);
      toast.success("Comentário adicionado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o comentário.");
    }
  }

  async function confirmDeleteTimelineItem() {
    if (!timelineDeleteTarget) return;
    const { kind, sourceId } = timelineDeleteTarget;
    try {
      await deleteTimelineItem.mutateAsync({ kind, id: sourceId });
      toast.success(kind === "comment" ? "Comentário excluído." : "Atividade excluída.");
      setTimelineDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir.");
    }
  }

  function scrollToCommentsSection() {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      commentTextareaRef.current?.focus();
    }, 200);
  }

  async function handleAddChecklist() {
    if (!checklistDraft.trim()) return;
    try {
      await addChecklist.mutateAsync(checklistDraft.trim());
      setChecklistDraft("");
      setChecklistsOpen(false);
      toast.success("Checklist criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar checklist.");
    }
  }

  async function handleAddChecklistItem(checklistId: string, content: string) {
    if (!content.trim()) return;
    try {
      await addChecklistItem.mutateAsync({ checklistId, content: content.trim() });
      toast.success("Item adicionado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar item.");
    }
  }

  async function handleDeleteChecklist(checklistId: string) {
    try {
      await deleteChecklist.mutateAsync(checklistId);
      toast.success("Checklist excluída.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir checklist.");
    }
  }

  async function handleSaveCustomField(field: LegalKanbanCustomField) {
    const rawValue = customFieldDrafts[field.id];
    const valueText = typeof rawValue === "boolean" ? String(rawValue) : String(rawValue ?? "");
    const valueJson =
      field.fieldType === "checkbox"
        ? { checked: Boolean(rawValue) }
        : field.fieldType === "date"
          ? { date: valueText || null }
          : field.fieldType === "number"
            ? { number: valueText ? Number(valueText) : null }
            : field.fieldType === "select"
              ? { option: valueText || null }
              : { text: valueText || null };

    try {
      await saveCustomFieldValue.mutateAsync({
        customFieldId: field.id,
        valueText: valueText || null,
        valueJson,
      });
      setEditingCustomFieldId(null);
      toast.success(`Campo "${field.name}" salvo.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o campo.");
    }
  }

  async function handleRemoveCustomField(field: LegalKanbanCustomField) {
    if (!cardId) return;
    try {
      await deleteCustomFieldValue.mutateAsync(field.id);
      setCustomFieldDrafts((current) => ({
        ...current,
        [field.id]: field.fieldType === "checkbox" ? false : "",
      }));
      if (editingCustomFieldId === field.id) setEditingCustomFieldId(null);
      toast.success(`Valor do campo "${field.name}" removido do card.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover o campo.");
    }
  }

  async function handleAddLink() {
    if (!linkDraft.name.trim() || !linkDraft.url.trim()) {
      toast.error("Informe nome e URL do link.");
      return;
    }

    try {
      await addLinkAttachment.mutateAsync({
        name: linkDraft.name.trim(),
        url: linkDraft.url.trim(),
      });
      setLinkDraft({ name: "", url: "" });
      toast.success("Link anexado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao anexar o link.");
    }
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await uploadAttachment.mutateAsync(file);
      toast.success("Arquivo anexado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar o arquivo.");
    }
  }

  async function handleOpenAttachment(attachmentId: string) {
    if (!data) return;
    try {
      setAttachmentLoadingId(attachmentId);
      const attachment = data.attachments.find((item) => item.id === attachmentId);
      if (!attachment) return;
      const url = await legalKanbanService.getAttachmentUrl(attachment);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir o anexo.");
    } finally {
      setAttachmentLoadingId(null);
    }
  }

  function openFromAddMenu(kind: "labels" | "dates" | "checklists" | "members" | "attachments" | "customFields" | "comments") {
    setLabelsOpen(false);
    setDatesOpen(false);
    setChecklistsOpen(false);
    if (kind === "customFields") {
      setInlinePanel(null);
      setCustomFieldsEditDialogOpen(true);
      return;
    }
    if (kind === "comments") {
      setInlinePanel(null);
      scrollToCommentsSection();
      return;
    }
    if (kind === "members" || kind === "attachments") {
      setInlinePanel(kind);
      return;
    }
    setInlinePanel(null);
    setTimeout(() => {
      if (kind === "labels") setLabelsOpen(true);
      if (kind === "dates") setDatesOpen(true);
      if (kind === "checklists") setChecklistsOpen(true);
    }, 0);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(900px,92vh)] w-[min(1240px,calc(100vw-1rem))] max-w-[min(1240px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden p-0",
          "[&>button]:hidden",
        )}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{data ? `Card ${data.cardNumber}: ${data.title}` : "Detalhes do card"}</DialogTitle>
          <DialogDescription>
            Painel com descrição, datas, anexos, checklist, comentários e demais detalhes do card do Kanban jurídico.
          </DialogDescription>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="p-8 text-sm text-muted-foreground">Carregando card...</div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
              <p className="min-w-0 truncate rounded-md border border-border/80 bg-muted/60 px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                {currentColumn?.title || "Sem raia"}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md"
                  onClick={() => void handleSaveCard()}
                  disabled={updateCard.isPending}
                  title="Salvar alterações"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md"
                  onClick={() => onOpenChange(false)}
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "grid min-h-0 min-w-0 flex-1 grid-cols-1",
              )}
            >
              <ScrollArea className="min-h-0 min-w-0 max-h-[min(720px,calc(92vh-8rem))]">
                <div className="space-y-5 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={handleToggleCompleted}
                      className="mt-0.5 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-primary"
                      title={data.status === "concluido" ? "Reabrir card" : "Concluir card"}
                    >
                      {data.status === "concluido" ? (
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                      ) : (
                        <Circle className="h-8 w-8" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className={cn(
                          "h-auto min-h-[2.75rem] rounded-lg border border-transparent bg-transparent px-2 py-1.5 -mx-2 text-2xl font-semibold leading-tight tracking-tight shadow-none transition-[border-color,box-shadow,background-color]",
                          "placeholder:text-muted-foreground/80",
                          "hover:border-border/60 hover:bg-muted/20",
                          "focus-visible:border-primary/45 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                          "sm:text-3xl",
                        )}
                        placeholder="Nome da tarefa"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground sm:text-sm">
                          Card #{data.cardNumber}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={updateCard.isPending}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity",
                                "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                LEGAL_KANBAN_STATUS_META[status].chip,
                                updateCard.isPending && "pointer-events-none opacity-60",
                              )}
                              aria-label={`Status: ${LEGAL_KANBAN_STATUS_META[status].label}. Abrir opções`}
                            >
                              {LEGAL_KANBAN_STATUS_META[status].label}
                              <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52 rounded-xl p-1.5" sideOffset={6}>
                            {statusKeys.map((key) => (
                              <DropdownMenuItem
                                key={key}
                                className="w-full cursor-pointer justify-between gap-2 rounded-lg"
                                onSelect={() => void handleStatusChange(key)}
                              >
                                <span className={key === status ? "font-semibold" : undefined}>
                                  {LEGAL_KANBAN_STATUS_META[key].label}
                                </span>
                                {key === status ? (
                                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                ) : null}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={updateCard.isPending}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity",
                                "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                LEGAL_KANBAN_PRIORITY_META[priority].chip,
                                updateCard.isPending && "pointer-events-none opacity-60",
                              )}
                              aria-label={`Prioridade: ${LEGAL_KANBAN_PRIORITY_META[priority].label}. Abrir opções`}
                            >
                              {LEGAL_KANBAN_PRIORITY_META[priority].label}
                              <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52 rounded-xl p-1.5" sideOffset={6}>
                            {priorityKeys.map((key) => (
                              <DropdownMenuItem
                                key={key}
                                className="w-full cursor-pointer justify-between gap-2 rounded-lg"
                                onSelect={() => void handlePriorityChange(key)}
                              >
                                <span className="flex min-w-0 flex-1 items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/40 shadow-sm"
                                    style={{ backgroundColor: LEGAL_KANBAN_PRIORITY_META[key].color }}
                                    aria-hidden
                                  />
                                  <span className={key === priority ? "font-semibold" : undefined}>
                                    {LEGAL_KANBAN_PRIORITY_META[key].label}
                                  </span>
                                </span>
                                {key === priority ? (
                                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                ) : null}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="rounded-md font-medium">
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72 rounded-xl p-1.5" sideOffset={6}>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("comments")}
                        >
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Comentários</p>
                            <p className="text-xs text-muted-foreground">Adicionar comentário e ver atividade</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("labels")}
                        >
                          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Etiquetas</p>
                            <p className="text-xs text-muted-foreground">Selecionar ou criar etiquetas</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("dates")}
                        >
                          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Datas</p>
                            <p className="text-xs text-muted-foreground">Início, entrega e lembretes</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("checklists")}
                        >
                          <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Checklists</p>
                            <p className="text-xs text-muted-foreground">Nova lista de tarefas</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("members")}
                        >
                          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Membros</p>
                            <p className="text-xs text-muted-foreground">Atribuir responsáveis</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("attachments")}
                        >
                          <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Anexo</p>
                            <p className="text-xs text-muted-foreground">Arquivos e links</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5"
                          onSelect={() => openFromAddMenu("customFields")}
                        >
                          <FormInput className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium">Campos personalizados</p>
                            <p className="text-xs text-muted-foreground">Valores extras do board</p>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Popover
                      open={labelsOpen}
                      onOpenChange={(next) => {
                        setLabelsOpen(next);
                        if (next) {
                          setDatesOpen(false);
                          setChecklistsOpen(false);
                          setInlinePanel(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("rounded-md font-medium", labelsOpen && "border-primary bg-primary/10")}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          Etiquetas
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={8}
                        className="z-[100] w-[min(420px,calc(100vw-2rem))] max-h-[min(420px,55vh)] overflow-y-auto p-4"
                        onOpenAutoFocus={(event) => event.preventDefault()}
                      >
                        <TopPanelBlock title="Etiquetas" subtitle="Selecione, pesquise ou crie novas etiquetas.">
                          <Input
                            value={labelSearch}
                            onChange={(event) => setLabelSearch(event.target.value)}
                            placeholder="Buscar etiquetas..."
                          />
                          <div className="space-y-2">
                            {filteredLabels.map((label) => (
                              <LabelOptionRow
                                key={label.id}
                                label={label}
                                checked={selectedLabelIds.has(label.id)}
                                onToggle={() => handleToggleLabel(label.id)}
                              />
                            ))}
                            {filteredLabels.length === 0 ? <EmptyState text="Nenhuma etiqueta encontrada." /> : null}
                          </div>
                          <Separator />
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_72px_auto]">
                            <Input
                              value={newLabelDraft.name}
                              onChange={(event) =>
                                setNewLabelDraft((current) => ({ ...current, name: event.target.value }))
                              }
                              placeholder="Nova etiqueta"
                            />
                            <Input
                              type="color"
                              value={newLabelDraft.color}
                              onChange={(event) =>
                                setNewLabelDraft((current) => ({ ...current, color: event.target.value }))
                              }
                              className="h-9 w-full min-w-0"
                            />
                            <Button type="button" onClick={handleCreateLabel} disabled={createLabel.isPending}>
                              Criar
                            </Button>
                          </div>
                        </TopPanelBlock>
                      </PopoverContent>
                    </Popover>

                    <Popover
                      open={datesOpen}
                      onOpenChange={(next) => {
                        setDatesOpen(next);
                        if (next) {
                          setLabelsOpen(false);
                          setChecklistsOpen(false);
                          setInlinePanel(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("rounded-md font-medium", datesOpen && "border-primary bg-primary/10")}
                        >
                          <CalendarClock className="mr-2 h-4 w-4" />
                          Datas
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={8}
                        className="z-[100] w-[min(100vw-2rem,400px)] max-h-[min(80vh,520px)] overflow-y-auto overflow-x-hidden p-0 sm:w-[min(100vw-2rem,420px)]"
                        onOpenAutoFocus={(event) => event.preventDefault()}
                      >
                        <div className="border-b border-border/70 px-4 py-3">
                          <p className="font-semibold leading-none">Datas</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Defina início, entrega e lembrete com os campos abaixo.
                          </p>
                        </div>
                        <div className="flex flex-col gap-4 p-4">
                          <div className="flex min-w-0 flex-col gap-3">
                            <DateToggleField
                              accent="start"
                              label="Data de início"
                              inputId="kanban-start-at"
                              checked={Boolean(startDate)}
                              value={startDate}
                              onCheckedChange={(checked) =>
                                setStartDate(checked ? `${new Date().toISOString().slice(0, 10)}T09:00` : "")
                              }
                              onValueChange={setStartDate}
                            />
                            <DateToggleField
                              accent="due"
                              label="Data de entrega"
                              inputId="kanban-due-at"
                              checked={Boolean(dueDate)}
                              value={dueDate}
                              onCheckedChange={(checked) =>
                                setDueDate(checked ? `${new Date().toISOString().slice(0, 10)}T18:00` : "")
                              }
                              onValueChange={setDueDate}
                            />
                            <DateToggleField
                              accent="reminder"
                              label="Lembrete"
                              checked={Boolean(reminderAt)}
                              value={reminderAt}
                              onCheckedChange={(checked) =>
                                setReminderAt(checked ? `${new Date().toISOString().slice(0, 10)}T09:00` : "")
                              }
                              onValueChange={setReminderAt}
                              inputId="kanban-reminder-at"
                            />
                          </div>

                          <div className="flex justify-end border-t border-border/70 pt-3">
                            <Button type="button" size="sm" onClick={() => void handleSaveCard()} disabled={updateCard.isPending}>
                              Aplicar datas
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Popover
                      open={checklistsOpen}
                      onOpenChange={(next) => {
                        setChecklistsOpen(next);
                        if (next) {
                          setLabelsOpen(false);
                          setDatesOpen(false);
                          setInlinePanel(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("rounded-md font-medium", checklistsOpen && "border-primary bg-primary/10")}
                        >
                          <CheckSquare className="mr-2 h-4 w-4" />
                          Checklist
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={8}
                        className="z-[100] w-[min(360px,calc(100vw-2rem))] p-4"
                        onOpenAutoFocus={(event) => event.preventDefault()}
                      >
                        <TopPanelBlock title="Nova checklist" subtitle="Informe o título e adicione.">
                          <div className="space-y-2">
                            <Label htmlFor="kanban-checklist-title">Título</Label>
                            <Input
                              id="kanban-checklist-title"
                              value={checklistDraft}
                              onChange={(event) => setChecklistDraft(event.target.value)}
                              placeholder="Ex.: Documentação inicial"
                            />
                          </div>
                          <div className="flex justify-end pt-2">
                            <Button type="button" size="sm" onClick={() => void handleAddChecklist()}>
                              <Plus className="mr-2 h-4 w-4" />
                              Adicionar
                            </Button>
                          </div>
                        </TopPanelBlock>
                      </PopoverContent>
                    </Popover>

                    <Button type="button" variant="outline" size="sm" className="rounded-md font-medium" onClick={scrollToCommentsSection}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Comentários
                    </Button>
                  </div>

                  {(startDate || dueDate || reminderAt) && (
                    <div
                      role="status"
                      aria-label="Datas programadas neste card"
                      className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs sm:text-sm"
                    >
                      {startDate ? (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-hidden />
                          <span className="shrink-0 text-muted-foreground">Início</span>
                          <span className="min-w-0 font-medium text-foreground">{formatKanbanDatetimeLocal(startDate)}</span>
                        </span>
                      ) : null}
                      {dueDate ? (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-600" aria-hidden />
                          <span className="shrink-0 text-muted-foreground">Entrega</span>
                          <span className="min-w-0 font-medium text-foreground">{formatKanbanDatetimeLocal(dueDate)}</span>
                        </span>
                      ) : null}
                      {reminderAt ? (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
                          <span className="shrink-0 text-muted-foreground">Lembrete</span>
                          <span className="min-w-0 font-medium text-foreground">{formatKanbanDatetimeLocal(reminderAt)}</span>
                        </span>
                      ) : null}
                    </div>
                  )}

                  {inlinePanel ? (
                    <section className="rounded-xl border border-border/70 bg-muted/30 p-4">
                      {inlinePanel === "members" ? (
                        <TopPanelBlock title="Membros" subtitle="Pesquise e selecione um ou mais membros.">
                          <Input
                            value={memberSearch}
                            onChange={(event) => setMemberSearch(event.target.value)}
                            placeholder="Pesquisar membros"
                          />
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {filteredMembers.map((member) => {
                              const active = selectedMemberIds.has(member.id);
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => handleToggleMember(member.id)}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                                    active ? "border-primary bg-primary/10" : "border-border/70 bg-background",
                                  )}
                                >
                                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                    {getMemberInitials(member)}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{member.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                                  </div>
                                  <Checkbox checked={active} className="shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </TopPanelBlock>
                      ) : null}

                      {inlinePanel === "attachments" ? (
                        <TopPanelBlock title="Anexos" subtitle="Links e arquivos.">
                          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <Input
                              value={linkDraft.name}
                              onChange={(event) => setLinkDraft((current) => ({ ...current, name: event.target.value }))}
                              placeholder="Nome do link"
                            />
                            <Input
                              value={linkDraft.url}
                              onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))}
                              placeholder="https://..."
                            />
                            <Button type="button" className="shrink-0" onClick={() => void handleAddLink()}>
                              <Link2 className="mr-2 h-4 w-4" />
                              Link
                            </Button>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="kanban-file-upload">Arquivo</Label>
                            <Input id="kanban-file-upload" type="file" onChange={handleUploadFile} />
                          </div>
                        </TopPanelBlock>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="min-w-0 max-w-full rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Etiquetas</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setInlinePanel(null);
                          setLabelsOpen(true);
                        }}
                      >
                        Gerenciar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.labels.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma etiqueta neste card.</p>
                      ) : (
                        data.labels.map((label) => (
                          <Badge
                            key={label.id}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Descrição</h3>
                    </div>
                    <LegalKanbanRichTextEditor
                      value={description}
                      onChange={(json, plainText) => {
                        setDescription(json);
                        setDescriptionText(plainText);
                      }}
                      onImageUpload={(file) => legalKanbanService.uploadInlineImage(cardId!, file)}
                      className="w-full max-w-full rounded-xl"
                    />
                  </section>

                  <section className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Anexos</h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => openFromAddMenu("attachments")}
                      >
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {data.attachments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
                      ) : (
                        data.attachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => handleOpenAttachment(attachment.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/30"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.attachmentType === "file" ? "Arquivo" : "Link"} · {formatRelativeDate(attachment.createdAt)}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-primary">
                              {attachmentLoadingId === attachment.id ? "…" : "Abrir"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FormInput className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Campos personalizados</h3>
                      </div>
                      {board.customFields.length > 0 || (canManageBoard && onRequestBoardSettings) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                              Gerenciar
                              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {board.customFields.length > 0 ? (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onSelect={() => setCustomFieldsEditDialogOpen(true)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar valores no card
                              </DropdownMenuItem>
                            ) : null}
                            {canManageBoard && onRequestBoardSettings ? (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onSelect={() => onRequestBoardSettings()}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Criar campo no board
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                    {board.customFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {canManageBoard && onRequestBoardSettings
                          ? "Nenhum campo no board. Use Gerenciar para criar o primeiro campo personalizado."
                          : "Nenhum campo personalizado configurado neste board."}
                      </p>
                    ) : data.customFieldValues.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum valor salvo neste card. Use <span className="font-medium text-foreground">Gerenciar</span> para
                        editar valores ou criar novos campos no board.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {data.customFieldValues.map((cv) => {
                          const field = board.customFields.find((f) => f.id === cv.customFieldId);
                          if (!field) return null;
                          const isEditing = editingCustomFieldId === field.id;
                          return (
                            <li
                              key={cv.id}
                              className="rounded-lg border border-border/60 bg-muted/15 p-3"
                            >
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold">{field.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => setEditingCustomFieldId(null)}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                  <CustomFieldInput
                                    field={field}
                                    value={customFieldDrafts[field.id]}
                                    hideLabel
                                    onChange={(next) =>
                                      setCustomFieldDrafts((current) => ({
                                        ...current,
                                        [field.id]: next,
                                      }))
                                    }
                                    onSave={() => void handleSaveCustomField(field)}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-muted-foreground">{field.name}</p>
                                    <p className="mt-1 break-words text-sm text-foreground">
                                      {formatCustomFieldValueDisplay(field, cv)}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-0.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title="Editar"
                                      onClick={() => setEditingCustomFieldId(field.id)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      title="Remover valor do card"
                                      disabled={deleteCustomFieldValue.isPending}
                                      onClick={() => void handleRemoveCustomField(field)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Checklists</h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setInlinePanel(null);
                          setChecklistsOpen(true);
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {data.checklists.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma checklist.</p>
                      ) : (
                        data.checklists.map((checklist) => (
                          <ChecklistBlock
                            key={checklist.id}
                            checklist={checklist}
                            onToggle={(itemId, completed) => toggleChecklistItem.mutate({ itemId, completed })}
                            onAddItem={handleAddChecklistItem}
                            onDelete={handleDeleteChecklist}
                            deletePending={deleteChecklist.isPending}
                          />
                        ))
                      )}
                    </div>
                  </section>

                  <section ref={commentsSectionRef} className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <History className="h-4 w-4 shrink-0 text-primary" />
                        <h3 className="truncate text-sm font-semibold">Comentários e atividade</h3>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={scrollToCommentsSection}>
                        Adicionar comentário
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
                        <Textarea
                          ref={commentTextareaRef}
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="Escreva um comentário..."
                          rows={3}
                          className="min-h-[96px] resize-y"
                        />
                        <div className="flex justify-end">
                          <Button type="button" size="sm" onClick={() => void handleAddComment()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Comentar
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {timeline.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
                        ) : (
                          <>
                            {paginatedTimeline.map((item) => (
                              <div
                                key={item.id}
                                className="flex gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
                              >
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                  {getMemberInitials(item.author || ({ name: "Sistema" } as LegalKanbanUser))}
                                </span>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 text-sm leading-snug text-foreground">
                                      <span className="font-semibold">{item.title}</span>
                                      {item.kind === "comment" ? (
                                        <>
                                          {" "}
                                          comentou: <span className="text-muted-foreground">{item.body}</span>
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground"> {item.body}</span>
                                      )}
                                    </p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/15 hover:text-destructive"
                                      disabled={deleteTimelineItem.isPending}
                                      onClick={() =>
                                        setTimelineDeleteTarget({ kind: item.kind, sourceId: item.sourceId })
                                      }
                                      aria-label={item.kind === "comment" ? "Excluir comentário" : "Excluir atividade"}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {item.kind === "comment" ? "Comentário" : "Atividade"} ·{" "}
                                    <time dateTime={item.createdAt}>{formatKanbanDatetimeLocal(item.createdAt)}</time>
                                  </p>
                                </div>
                              </div>
                            ))}
                            {timelineTotalPages > 1 && (
                              <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-center text-xs text-muted-foreground sm:text-left">
                                  Página {timelinePageSafe} de {timelineTotalPages} · {timeline.length} registro
                                  {timeline.length !== 1 ? "s" : ""}
                                </p>
                                <Pagination className="mx-0 w-full justify-center sm:w-auto sm:justify-end">
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setTimelinePage((p) => Math.max(1, p - 1));
                                        }}
                                        className={timelinePageSafe <= 1 ? "pointer-events-none opacity-50" : ""}
                                        aria-disabled={timelinePageSafe <= 1}
                                      />
                                    </PaginationItem>
                                    {Array.from({ length: timelineTotalPages }, (_, i) => i + 1)
                                      .filter((p) => {
                                        if (timelineTotalPages <= 7) return true;
                                        if (p === 1 || p === timelineTotalPages) return true;
                                        if (Math.abs(p - timelinePageSafe) <= 1) return true;
                                        return false;
                                      })
                                      .reduce<number[]>((acc, p, idx, arr) => {
                                        if (idx > 0 && arr[idx - 1]! < p - 1) acc.push(-1);
                                        acc.push(p);
                                        return acc;
                                      }, [])
                                      .map((p, idx) =>
                                        p === -1 ? (
                                          <PaginationItem key={`ellipsis-${idx}`}>
                                            <PaginationEllipsis />
                                          </PaginationItem>
                                        ) : (
                                          <PaginationItem key={p}>
                                            <PaginationLink
                                              href="#"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                setTimelinePage(p);
                                              }}
                                              isActive={timelinePageSafe === p}
                                            >
                                              {p}
                                            </PaginationLink>
                                          </PaginationItem>
                                        ),
                                      )}
                                    <PaginationItem>
                                      <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setTimelinePage((p) => Math.min(timelineTotalPages, p + 1));
                                        }}
                                        className={
                                          timelinePageSafe >= timelineTotalPages ? "pointer-events-none opacity-50" : ""
                                        }
                                        aria-disabled={timelinePageSafe >= timelineTotalPages}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </div>
          </div>

            <Dialog open={customFieldsEditDialogOpen} onOpenChange={setCustomFieldsEditDialogOpen}>
              <DialogContent className="z-[100] max-h-[min(560px,85vh)] max-w-xl gap-0 overflow-hidden p-0 sm:max-w-xl">
                <DialogHeader className="border-b border-border/70 px-6 pb-4 pt-6">
                  <DialogTitle>Editar valores no card</DialogTitle>
                  <DialogDescription>Preencha e salve cada campo personalizado.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[min(400px,55vh)] px-6">
                  <div className="space-y-3 py-4">
                    {board.customFields.length === 0 ? (
                      <EmptyState text="Nenhum campo personalizado no board. Crie um campo em Configurar board." />
                    ) : (
                      board.customFields.map((field) => (
                        <CustomFieldInput
                          key={field.id}
                          field={field}
                          value={customFieldDrafts[field.id]}
                          onChange={(value) =>
                            setCustomFieldDrafts((current) => ({
                              ...current,
                              [field.id]: value,
                            }))
                          }
                          onSave={() => void handleSaveCustomField(field)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="border-t border-border/70 px-6 py-4 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setCustomFieldsEditDialogOpen(false)}>
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={timelineDeleteTarget != null}
              onOpenChange={(next) => {
                if (!next) setTimelineDeleteTarget(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {timelineDeleteTarget?.kind === "comment"
                      ? "Excluir comentário?"
                      : "Excluir atividade?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O item será removido do histórico do card.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" disabled={deleteTimelineItem.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteTimelineItem.isPending}
                    onClick={() => void confirmDeleteTimelineItem()}
                  >
                    Excluir
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TopPanelBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function LabelOptionRow({
  label,
  checked,
  onToggle,
}: {
  label: LegalKanbanLabel;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:border-primary/25"
    >
      <Checkbox checked={checked} />
      <span
        className="inline-flex flex-1 items-center rounded-lg px-3 py-2 font-medium text-white"
        style={{ backgroundColor: label.color }}
      >
        {label.name}
      </span>
    </button>
  );
}

function DateToggleField({
  accent,
  label,
  checked,
  value,
  onCheckedChange,
  onValueChange,
  inputId,
}: {
  accent: "start" | "due" | "reminder";
  label: string;
  checked: boolean;
  value: string;
  onCheckedChange: (checked: boolean) => void;
  onValueChange: (value: string) => void;
  inputId?: string;
}) {
  const markerClass =
    accent === "start" ? "bg-sky-600" : accent === "due" ? "bg-amber-600" : "bg-violet-600";
  const insetAccent =
    accent === "start"
      ? "shadow-[inset_4px_0_0_0_#0284c7]"
      : accent === "due"
        ? "shadow-[inset_4px_0_0_0_#d97706]"
        : "shadow-[inset_4px_0_0_0_#7c3aed]";

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-border/70 bg-background p-3 text-left sm:p-4",
        insetAccent,
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={(next) => onCheckedChange(Boolean(next))} />
        <span className={cn("h-2 w-2 shrink-0 rounded-full", markerClass)} aria-hidden />
        <Label htmlFor={inputId} className="cursor-default font-medium">
          {label}
        </Label>
      </div>
      <Input
        id={inputId}
        type="datetime-local"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={!checked}
        className="h-9 w-full min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function ChecklistBlock({
  checklist,
  onToggle,
  onAddItem,
  onDelete,
  deletePending,
}: {
  checklist: NonNullable<ReturnType<typeof useLegalKanbanCardDetails>["data"]>["checklists"][number];
  onToggle: (itemId: string, completed: boolean) => void;
  onAddItem: (checklistId: string, content: string) => Promise<void>;
  onDelete: (checklistId: string) => Promise<void>;
  deletePending: boolean;
}) {
  const [itemDraft, setItemDraft] = useState("");

  return (
    <div className="rounded-3xl border border-border/70 bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-medium">{checklist.title}</h4>
          <p className="text-sm text-muted-foreground">
            {checklist.items.filter((item) => item.isCompleted).length}/{checklist.items.length} concluídos
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {checklist.items.map((item) => (
          <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-border/60 px-3 py-2">
            <Checkbox checked={item.isCompleted} onCheckedChange={(checked) => onToggle(item.id, Boolean(checked))} />
            <span className={cn("text-sm", item.isCompleted && "text-muted-foreground line-through")}>
              {item.content}
            </span>
          </label>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex gap-2">
        <Input
          value={itemDraft}
          onChange={(event) => setItemDraft(event.target.value)}
          placeholder="Adicionar um item"
        />
        <Button
          variant="outline"
          onClick={async () => {
            await onAddItem(checklist.id, itemDraft);
            setItemDraft("");
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 text-destructive hover:text-destructive"
          aria-label={`Excluir checklist ${checklist.title}`}
          title="Excluir checklist"
          disabled={deletePending}
          onClick={() => void onDelete(checklist.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
  onSave,
  hideLabel,
}: {
  field: LegalKanbanCustomField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  onSave: () => void;
  hideLabel?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        {hideLabel ? <span className="sr-only">{field.name}</span> : <Label>{field.name}</Label>}
        <Button variant="ghost" size="sm" onClick={onSave}>
          Salvar
        </Button>
      </div>

      {field.fieldType === "checkbox" ? (
        <label className="flex items-center gap-3 rounded-2xl border border-border/60 px-3 py-3">
          <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} />
          <span className="text-sm text-muted-foreground">Marcar campo</span>
        </label>
      ) : field.fieldType === "select" ? (
        <Select value={String(value || "")} onValueChange={(next) => onChange(next)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.fieldType === "date" ? (
        <Input type="date" value={String(value || "")} onChange={(event) => onChange(event.target.value)} />
      ) : field.fieldType === "number" ? (
        <Input type="number" value={String(value || "")} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input value={String(value || "")} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function formatCustomFieldValueDisplay(
  field: LegalKanbanCustomField,
  cv: LegalKanbanCustomFieldValue,
): string {
  if (field.fieldType === "checkbox") {
    return cv.valueJson?.checked ? "Sim" : "Não";
  }
  if (field.fieldType === "date") {
    const raw = String(cv.valueJson?.date || cv.valueText || "").trim();
    return raw || "—";
  }
  if (field.fieldType === "number") {
    const n = cv.valueJson?.number ?? cv.valueText;
    if (n === null || n === undefined || n === "") return "—";
    return String(n);
  }
  if (field.fieldType === "select") {
    const raw = String(cv.valueJson?.option || cv.valueText || "").trim();
    return raw || "—";
  }
  const text = String(cv.valueJson?.text ?? cv.valueText ?? "").trim();
  return text || "—";
}

function buildCustomFieldDrafts(fields: LegalKanbanCustomField[], values: LegalKanbanCustomFieldValue[]) {
  const valueMap = new Map(values.map((value) => [value.customFieldId, value]));
  const next: Record<string, string | boolean> = {};

  fields.forEach((field) => {
    const current = valueMap.get(field.id);

    if (!current) {
      next[field.id] = field.fieldType === "checkbox" ? false : "";
      return;
    }

    if (field.fieldType === "checkbox") {
      next[field.id] = Boolean(current.valueJson?.checked);
      return;
    }

    if (field.fieldType === "date") {
      next[field.id] = String(current.valueJson?.date || current.valueText || "");
      return;
    }

    if (field.fieldType === "number") {
      next[field.id] = String(current.valueJson?.number ?? current.valueText ?? "");
      return;
    }

    if (field.fieldType === "select") {
      next[field.id] = String(current.valueJson?.option || current.valueText || "");
      return;
    }

    next[field.id] = String(current.valueJson?.text || current.valueText || "");
  });

  return next;
}

function toInputDateTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function fromInputDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}
