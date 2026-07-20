import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  Download,
  ExternalLink,
  File,
  FileText,
  Hash,
  History,
  Image as ImageIcon,
  Link2,
  ListChecks,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Plus,
  Save,
  ShieldAlert,
  Tag,
  Trash2,
  Unlink,
  UserPlus,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  LegalKanbanRichTextEditor,
  type LegalKanbanRichTextEditorHandle,
} from "@/features/legal-kanban/components/editor/LegalKanbanRichTextEditor";
import { createEmptyRichTextDoc } from "@/features/legal-kanban/components/editor/extensions";
import {
  LEGAL_KANBAN_ATTACHMENT_ACCEPT,
  LEGAL_KANBAN_ATTACHMENT_MAX_BYTES,
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
  useDeleteLegalKanbanAttachment,
  useDeleteLegalKanbanCard,
  useDeleteLegalKanbanChecklist,
  useLegalKanbanCardDetails,
  useMoveLegalKanbanCard,
  useSetLegalKanbanCardLabels,
  useSetLegalKanbanCardMembers,
  useToggleLegalKanbanChecklistItem,
  useUpdateLegalKanbanCard,
  useUploadLegalKanbanAttachment,
} from "../hooks/useLegalKanbanBoard";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ShareKanbanCardDialog } from "@/features/kanban-shared/components/ShareKanbanCardDialog";
import { DuplicateKanbanCardDialog } from "@/features/kanban-shared/components/DuplicateKanbanCardDialog";
import { MoveKanbanCardPopover } from "@/features/legal-kanban/components/MoveKanbanCardPopover";
import { KANBAN_MODULE_CONFIG, kanbanBoardDetailPath } from "@/features/kanban-shared/kanbanModuleConfig";
import { useKanbanModule } from "@/features/kanban-shared/KanbanModuleContext";
import { kanbanCardBridgeService } from "@/features/kanban-shared/services/kanbanCardBridgeService";
import { supabase } from "@/lib/supabase";
import { legalKanbanService } from "../services/legalKanbanService";
import type {
  KanbanPriority,
  KanbanStatus,
  LegalKanbanAttachment,
  LegalKanbanBoardData,
  LegalKanbanLabel,
  LegalKanbanUser,
  RichTextDoc,
} from "../types";
import {
  formatKanbanDatetimeLocal,
  formatRelativeDate,
  normalizeRichTextDoc,
} from "../utils";
import { MemberAvatar } from "./MemberAvatar";

const TIMELINE_PAGE_SIZE = 5;
const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrador",
  it: "TI",
  advogado_adm: "Advogado administrador",
  advogado: "Advogado",
  contabil: "Contábil",
  financeiro: "Financeiro",
};

function getRoleDisplayName(role: string | null | undefined) {
  if (!role) return "Perfil não informado";
  return ROLE_LABELS[role] ?? role;
}

interface LegalKanbanCardDetailsSheetProps {
  cardId: string | null;
  open: boolean;
  board: LegalKanbanBoardData;
  onOpenChange: (open: boolean) => void;
}

export function LegalKanbanCardDetailsSheet({
  cardId,
  open,
  board,
  onOpenChange,
}: LegalKanbanCardDetailsSheetProps) {
  type InlinePanel = "attachments" | null;

  const { data, isLoading, isFetching } = useLegalKanbanCardDetails(cardId);
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const kanbanModule = useKanbanModule();
  const queryClient = useQueryClient();

  const { data: linkedPost } = useQuery({
    queryKey: ["legal-kanban", "card-post-link", cardId],
    queryFn: async () => {
      if (!cardId) return null;
      const { data: link } = await supabase
        .from("post_kanban_links")
        .select("post_id, post:posts(id, channel_id, channel:channels(slug, team:teams(slug)))")
        .eq("card_id", cardId)
        .maybeSingle();
      if (!link?.post_id) return null;
      const post = Array.isArray(link.post) ? link.post[0] : (link.post as unknown as {
        id: string;
        channel: { slug: string; team: { slug: string } | { slug: string }[] | null } | null;
      } | null);
      if (!post) return { postId: link.post_id, url: null as string | null };
      const ch = Array.isArray(post.channel) ? post.channel[0] : post.channel;
      const team = ch ? (Array.isArray(ch.team) ? ch.team[0] : ch.team) : null;
      const url = ch && team ? `/teams/${team.slug}/${ch.slug}/${post.id}` : null;
      return { postId: link.post_id, url };
    },
    enabled: !!cardId && open,
  });
  const updateCard = useUpdateLegalKanbanCard(cardId || "");
  const moveCard = useMoveLegalKanbanCard();
  const deleteCard = useDeleteLegalKanbanCard();
  const setMembers = useSetLegalKanbanCardMembers(cardId || "");
  const setLabels = useSetLegalKanbanCardLabels(cardId || "");
  const addComment = useAddLegalKanbanComment(cardId || "");
  const deleteTimelineItem = useDeleteLegalKanbanTimelineItem(cardId || "");
  const addChecklist = useAddLegalKanbanChecklist(cardId || "");
  const deleteChecklist = useDeleteLegalKanbanChecklist(cardId || "");
  const addChecklistItem = useAddLegalKanbanChecklistItem(cardId || "");
  const toggleChecklistItem = useToggleLegalKanbanChecklistItem(cardId || "");
  const addLinkAttachment = useAddLegalKanbanLinkAttachment(cardId || "");
  const uploadAttachment = useUploadLegalKanbanAttachment(cardId || "");
  const deleteAttachment = useDeleteLegalKanbanAttachment(cardId || "");
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
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [linkDraft, setLinkDraft] = useState({ name: "", url: "" });
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
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [timelinePage, setTimelinePage] = useState(1);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [timelineDeleteTarget, setTimelineDeleteTarget] = useState<{
    kind: "comment" | "activity";
    sourceId: string;
  } | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [unlinkDuplicateConfirmOpen, setUnlinkDuplicateConfirmOpen] = useState(false);
  const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState<LegalKanbanAttachment | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const commentsSectionRef = useRef<HTMLElement | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const descriptionEditorRef = useRef<LegalKanbanRichTextEditorHandle | null>(null);
  const prevOpenRef = useRef(false);
  const lastHydratedSnapshotRef = useRef<{
    cardId: string;
    serverKey: string;
    title: string;
    descriptionJson: string;
    descriptionText: string;
    status: KanbanStatus;
    priority: KanbanPriority;
    startDate: string;
    dueDate: string;
    reminderAt: string;
  } | null>(null);
  const currentBoardCard = useMemo(
    () =>
      cardId
        ? board.columns.flatMap((column) => column.cards).find((card) => card.id === cardId) || null
        : null,
    [board.columns, cardId],
  );
  const cardData = data?.id === cardId ? data : null;
  const serverSnapshotKey = useMemo(() => {
    if (!cardData) return null;

    return JSON.stringify({
      id: cardData.id,
      updatedAt: cardData.updatedAt,
      title: cardData.title,
      descriptionText: cardData.descriptionText,
      status: cardData.status,
      priority: cardData.priority,
      startDate: cardData.startDate,
      dueDate: cardData.dueDate,
      reminderAt: cardData.reminderAt,
    });
  }, [cardData]);
  const cardDetailsStaleComparedToBoard = Boolean(
    currentBoardCard &&
      cardData &&
      (currentBoardCard.updatedAt !== cardData.updatedAt ||
        currentBoardCard.descriptionText !== cardData.descriptionText),
  );

  useLayoutEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      lastHydratedSnapshotRef.current = null;
      return;
    }
    if (!cardId || !cardData || !serverSnapshotKey) return;

    const justOpened = !prevOpenRef.current;
    const lastHydrated = lastHydratedSnapshotRef.current;
    const cardChanged = lastHydrated?.cardId !== cardData.id;
    const serverChanged = lastHydrated?.serverKey !== serverSnapshotKey;
    prevOpenRef.current = true;

    const descriptionJson = normalizeRichTextDoc(cardData.descriptionJson);
    const nextSnapshot = {
      cardId: cardData.id,
      serverKey: serverSnapshotKey,
      title: cardData.title,
      descriptionJson: JSON.stringify(descriptionJson),
      descriptionText: cardData.descriptionText || "",
      status: cardData.status,
      priority: cardData.priority,
      startDate: toInputDateTime(cardData.startDate),
      dueDate: toInputDateTime(cardData.dueDate),
      reminderAt: toInputDateTime(cardData.reminderAt),
    };

    const formStillMatchesLastHydrated =
      !lastHydrated ||
      (title === lastHydrated.title &&
        JSON.stringify(description) === lastHydrated.descriptionJson &&
        descriptionText === lastHydrated.descriptionText &&
        status === lastHydrated.status &&
        priority === lastHydrated.priority &&
        startDate === lastHydrated.startDate &&
        dueDate === lastHydrated.dueDate &&
        reminderAt === lastHydrated.reminderAt);

    if (!justOpened && !cardChanged && !(serverChanged && formStillMatchesLastHydrated)) {
      return;
    }

    lastHydratedSnapshotRef.current = nextSnapshot;
    setTitle(nextSnapshot.title);
    setDescription(descriptionJson);
    setDescriptionText(nextSnapshot.descriptionText);
    setEditorInstanceKey((current) => current + 1);
    setStatus(nextSnapshot.status);
    setPriority(nextSnapshot.priority);
    setStartDate(nextSnapshot.startDate);
    setDueDate(nextSnapshot.dueDate);
    setReminderAt(nextSnapshot.reminderAt);
  }, [
    cardData,
    cardId,
    description,
    descriptionText,
    dueDate,
    open,
    priority,
    reminderAt,
    serverSnapshotKey,
    startDate,
    status,
    title,
  ]);

  useEffect(() => {
    setTimelinePage(1);
    setTimelineDeleteTarget(null);
  }, [cardId]);

  useEffect(() => {
    if (!open) setTimelineDeleteTarget(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setArchiveConfirmOpen(false);
      setDeleteConfirmOpen(false);
      setAttachmentDeleteTarget(null);
      setMembersModalOpen(false);
      setMemberSearch("");
    }
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
  const cardActionsBusy =
    updateCard.isPending ||
    moveCard.isPending ||
    deleteCard.isPending ||
    setMembers.isPending;
  const canFinalizeOrArchive = ["administrator", "advogado_adm"].includes(authUser?.role || "");
  const archiveActionDisabled = status === "arquivado";
  // Card arquivado tem o status congelado: ele volta a "ativo" apenas ao ser desarquivado.
  const isCardArchived = cardData?.status === "arquivado";
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
  const mentionCandidates = useMemo(() => {
    if (mentionSearch == null) return [];
    const query = mentionSearch.trim().toLowerCase();
    if (!query) return board.members.slice(0, 6);
    return board.members
      .filter((member) => member.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [board.members, mentionSearch]);
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
      mentions: comment.mentions.map((member) => member.name),
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
        mentions: [] as string[],
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
      const snapshot = descriptionEditorRef.current?.getSnapshot();
      const descriptionJson = snapshot?.json ?? description;
      const descriptionPlain = snapshot?.plainText ?? descriptionText;

      await updateCard.mutateAsync({
        title: title.trim(),
        descriptionJson,
        descriptionText: descriptionPlain,
        status,
        priority,
        startDate: fromInputDateTime(startDate),
        dueDate: fromInputDateTime(dueDate),
        reminderAt: fromInputDateTime(reminderAt),
        recurrenceRule: "",
        completedAt: status === "concluido" ? new Date().toISOString() : null,
      });
      setDescription(descriptionJson);
      setDescriptionText(descriptionPlain);
      toast.success("Card atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o card.");
    }
  }

  async function handleToggleCompleted() {
    if (!data) return;
    if (isCardArchived) {
      toast.error("Desarquive o card para alterar o status.");
      return;
    }

    if (!canFinalizeOrArchive) {
      const nextStatus: KanbanStatus = data.status === "aguardando_aprovacao" ? "ativo" : "aguardando_aprovacao";

      try {
        await updateCard.mutateAsync({ status: nextStatus, completedAt: null });
        setStatus(nextStatus);
        toast.success(
          nextStatus === "aguardando_aprovacao"
            ? "Card enviado para aprovação."
            : "Envio para aprovação cancelado.",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar o status do card.");
      }
      return;
    }

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
    if (isCardArchived) {
      toast.error("Desarquive o card para alterar o status.");
      return;
    }
    if ((next === "concluido" || next === "arquivado") && !canFinalizeOrArchive) {
      toast.error("Somente Administrador e Advogado Administrativo podem concluir ou arquivar cards.");
      return;
    }
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

  async function handleIngressarComoMembro() {
    if (!cardId || !data || !authUser?.id) {
      toast.error("Não foi possível identificar o usuário.");
      return;
    }
    if (selectedMemberIds.has(authUser.id)) {
      toast.info("Você já é membro deste card.");
      return;
    }
    try {
      const next = [...data.members.map((member) => member.user.id), authUser.id];
      await setMembers.mutateAsync(next);
      toast.success("Você foi adicionado como membro responsável do card.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao ingressar no card.");
    }
  }

  async function confirmArchiveCard() {
    if (!cardId || !data) return;
    if (!canFinalizeOrArchive) {
      toast.error("Somente Administrador e Advogado Administrativo podem arquivar cards.");
      return;
    }
    try {
      // Arquivar apenas altera o status; o card permanece na coluna de origem
      // para poder retornar a ela ao ser desarquivado em "Itens Arquivados".
      if (status !== "arquivado") {
        await updateCard.mutateAsync({ status: "arquivado", completedAt: null });
        setStatus("arquivado");
      }
      setArchiveConfirmOpen(false);
      toast.success("Card arquivado.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar o card.");
    }
  }

  async function confirmUnlinkDuplicate() {
    if (!cardId) return;
    try {
      await kanbanCardBridgeService.unlink(cardId, "duplicate");
      await queryClient.invalidateQueries({ queryKey: [kanbanModule.queryKeyPrefix] });
      setUnlinkDuplicateConfirmOpen(false);
      toast.success("Cards desvinculados. As alterações deixam de ser sincronizadas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao desvincular as cópias.");
    }
  }

  async function confirmDeleteCard() {
    if (!cardId) return;
    if (!canFinalizeOrArchive) {
      toast.error("Somente Administrador e Advogado Administrativo podem excluir cards.");
      return;
    }
    try {
      await deleteCard.mutateAsync(cardId);
      setDeleteConfirmOpen(false);
      toast.success("Card excluído.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir o card.");
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
      const mentionUserIds = board.members
        .filter((member) =>
          new RegExp(`(^|\\s)@${member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i").test(commentDraft),
        )
        .map((member) => member.id);

      await addComment.mutateAsync({ content: commentDraft.trim(), mentionUserIds });
      setCommentDraft("");
      setMentionSearch(null);
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

  async function processUploadFile(file: File) {
    if (file.size > LEGAL_KANBAN_ATTACHMENT_MAX_BYTES) {
      const maxMb = Math.round(LEGAL_KANBAN_ATTACHMENT_MAX_BYTES / (1024 * 1024));
      toast.error(`Arquivo muito grande. O tamanho máximo é ${maxMb} MB.`);
      return;
    }

    try {
      await uploadAttachment.mutateAsync(file);
      toast.success("Arquivo anexado.");
    } catch (error) {
      toast.error(describeUploadError(error, file.name));
    }
  }

  // Aciona o input de arquivo (renderizado fora do Dialog/ScrollArea). Chamada
  // síncrona a partir do clique preserva a ativação do usuário exigida pelo browser.
  function handlePickAndUpload() {
    if (!cardId || uploadAttachment.isPending) return;
    attachmentFileInputRef.current?.click();
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

  async function handleDownloadAttachment(attachment: LegalKanbanAttachment) {
    if (attachment.attachmentType === "link" && attachment.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setAttachmentLoadingId(attachment.id);
      const url = await legalKanbanService.getAttachmentUrl(attachment);
      if (!url) {
        toast.error("Não foi possível obter o arquivo.");
        return;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Falha ao baixar o arquivo.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = attachment.name || "anexo";
      anchor.rel = "noopener";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao baixar o anexo.");
    } finally {
      setAttachmentLoadingId(null);
    }
  }

  async function confirmDeleteAttachment() {
    if (!attachmentDeleteTarget) return;
    try {
      await deleteAttachment.mutateAsync(attachmentDeleteTarget.id);
      toast.success("Anexo removido.");
      setAttachmentDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir o anexo.");
    }
  }

  function openFromAddMenu(kind: "labels" | "dates" | "checklists" | "members" | "attachments" | "comments") {
    setLabelsOpen(false);
    setDatesOpen(false);
    setChecklistsOpen(false);
    if (kind === "comments") {
      setInlinePanel(null);
      scrollToCommentsSection();
      return;
    }
    if (kind === "members") {
      setInlinePanel(null);
      setMemberSearch("");
      setMembersModalOpen(true);
      return;
    }
    if (kind === "attachments") {
      setInlinePanel("attachments");
      return;
    }
    setInlinePanel(null);
    setTimeout(() => {
      if (kind === "labels") setLabelsOpen(true);
      if (kind === "dates") setDatesOpen(true);
      if (kind === "checklists") setChecklistsOpen(true);
    }, 0);
  }

  function extractMentionQuery(value: string) {
    const match = value.match(/(?:^|\s)@([^\s@]*)$/);
    return match ? match[1] : null;
  }

  function replaceLastMentionWithUser(value: string, selectedUserName: string) {
    return value.replace(/(?:^|\s)@([^\s@]*)$/, (full) => {
      const hasLeadingSpace = full.startsWith(" ");
      return `${hasLeadingSpace ? " " : ""}@${selectedUserName} `;
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(900px,92vh)] w-[min(1240px,calc(100vw-1rem))] max-w-[min(1240px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden p-0",
          "[&>button]:hidden",
        )}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
        <DialogTitle>{cardData ? `Card ${cardData.cardNumber}: ${cardData.title}` : "Detalhes do card"}</DialogTitle>
          <DialogDescription>
            Painel com descrição, datas, anexos, checklist, comentários e demais detalhes do card do Kanban jurídico.
          </DialogDescription>
        </DialogHeader>
        {isLoading || !cardData || (isFetching && cardDetailsStaleComparedToBoard) ? (
          <div className="p-8 text-sm text-muted-foreground">Carregando card...</div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
              <MoveKanbanCardPopover
                cardId={cardData.id}
                board={board}
                currentColumn={currentColumn}
              />
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-md"
                      disabled={cardActionsBusy}
                      title="Ações do card"
                      aria-label="Ações do card"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      disabled={
                        cardActionsBusy ||
                        !authUser?.id ||
                        Boolean(authUser?.id && selectedMemberIds.has(authUser.id))
                      }
                      onClick={() => void handleIngressarComoMembro()}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Ingressar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={cardActionsBusy || archiveActionDisabled || !canFinalizeOrArchive}
                      onClick={() => setArchiveConfirmOpen(true)}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={cardActionsBusy} onClick={() => setDuplicateDialogOpen(true)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    {cardData?.duplicateInfo ? (
                      <DropdownMenuItem
                        disabled={cardActionsBusy}
                        onClick={() => setUnlinkDuplicateConfirmOpen(true)}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        Desvincular cópia
                      </DropdownMenuItem>
                    ) : null}
                    {kanbanModule.canShareToLegal && !cardData?.hasLinkedCard ? (
                      <DropdownMenuItem disabled={cardActionsBusy} onClick={() => setShareDialogOpen(true)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Compartilhar com Jurídico
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={cardActionsBusy || !canFinalizeOrArchive}
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

            {linkedPost?.url ? (
              <div className="flex shrink-0 items-center justify-end border-b border-border/70 px-4 py-2 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { onOpenChange(false); navigate(linkedPost.url!); }}
                >
                  <Hash className="mr-1.5 h-3.5 w-3.5" />
                  Ver Postagem
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            ) : null}

            {cardData?.linkedCard ? (
              <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border/70 px-4 py-2 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    const peerConfig = KANBAN_MODULE_CONFIG[cardData.linkedCard!.peerBoardDomain];
                    navigate(`${kanbanBoardDetailPath(peerConfig, cardData.linkedCard!.peerBoardSlug)}?card=${cardData.linkedCard!.peerCardId}`);
                  }}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  {cardData.linkedCard.isSource ? "Ver card no Jurídico" : "Ver card na Gestão Operacional"}
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </Button>
                {kanbanModule.canShareToLegal ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!cardId) return;
                      try {
                        await kanbanCardBridgeService.unlink(cardId, "share");
                        await queryClient.invalidateQueries({ queryKey: [kanbanModule.queryKeyPrefix] });
                        toast.success("Compartilhamento removido.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Erro ao desvincular card.");
                      }
                    }}
                  >
                    Desvincular
                  </Button>
                ) : null}
              </div>
            ) : null}

            {isCardArchived ? (
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 sm:px-5">
                <Archive className="h-4 w-4 shrink-0" aria-hidden />
                Card arquivado. Desarquive em Itens Arquivados para alterar o status — ele volta automaticamente para
                Ativo.
              </div>
            ) : null}

            {cardData?.status === "aguardando_aprovacao" ? (
              <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 sm:px-5">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                Este card está aguardando aprovação de um Administrador ou Advogado Administrativo.
              </div>
            ) : null}

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
                      disabled={updateCard.isPending || isCardArchived}
                      className={cn(
                        "mt-0.5 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-primary",
                        !canFinalizeOrArchive && "hover:text-amber-600 dark:hover:text-amber-400",
                        isCardArchived && "cursor-not-allowed opacity-60 hover:text-muted-foreground",
                      )}
                      title={
                        isCardArchived
                          ? "Desarquive o card para alterar o status."
                          : canFinalizeOrArchive
                          ? cardData.status === "concluido"
                            ? "Reabrir card"
                            : "Concluir card"
                          : cardData.status === "aguardando_aprovacao"
                            ? "Cancelar envio para aprovação"
                            : "Enviar para aprovação"
                      }
                    >
                      {canFinalizeOrArchive ? (
                        cardData.status === "concluido" ? (
                          <CheckCircle2 className="h-8 w-8 text-primary" />
                        ) : (
                          <Circle className="h-8 w-8" />
                        )
                      ) : cardData.status === "aguardando_aprovacao" ? (
                        <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
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
                          Card #{cardData.cardNumber}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={updateCard.isPending || isCardArchived}
                              title={
                                isCardArchived
                                  ? "Desarquive o card para alterar o status."
                                  : undefined
                              }
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity",
                                "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                LEGAL_KANBAN_STATUS_META[status].chip,
                                (updateCard.isPending || isCardArchived) && "pointer-events-none opacity-60",
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
                                disabled={(key === "concluido" || key === "arquivado") && !canFinalizeOrArchive}
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
                        {cardData.labels.map((label) => (
                          <Badge
                            key={label.id}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </Badge>
                        ))}
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

                    {cardData.members.length > 0 ? (
                      <div className="flex min-w-0 max-w-full flex-col gap-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Membros</p>
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <div className="flex max-w-[min(100%,14rem)] flex-wrap items-center gap-1.5 sm:max-w-[18rem]">
                            {cardData.members.map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                title={member.user.name}
                                aria-label={`Membro: ${member.user.name}. Abrir gestão de membros`}
                                onClick={() => {
                                  setMemberSearch("");
                                  setMembersModalOpen(true);
                                }}
                                className="shrink-0 rounded-full transition hover:opacity-95 hover:ring-2 hover:ring-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <MemberAvatar
                                  user={member.user}
                                  className="h-8 w-8 border border-white/20 text-[10px]"
                                />
                              </button>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full border border-border/80 bg-muted text-foreground"
                            title="Adicionar ou gerenciar membros"
                            aria-label="Adicionar ou gerenciar membros"
                            onClick={() => {
                              setMemberSearch("");
                              setMembersModalOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full"
                        title="Membros"
                        aria-label="Adicionar membros ao card"
                        onClick={() => {
                          setMemberSearch("");
                          setMembersModalOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
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
                            <Label>Arquivo</Label>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start font-normal"
                              disabled={uploadAttachment.isPending || !cardId}
                              onClick={handlePickAndUpload}
                            >
                              <Paperclip className="mr-2 h-4 w-4" />
                              {uploadAttachment.isPending ? "Enviando…" : "Escolher arquivo"}
                            </Button>
                          </div>
                        </TopPanelBlock>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Descrição</h3>
                    </div>
                    <LegalKanbanRichTextEditor
                      key={`${cardData.id}:${editorInstanceKey}`}
                      ref={descriptionEditorRef}
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
                        className="h-8 shrink-0 text-xs"
                        disabled={uploadAttachment.isPending || !cardId}
                        onClick={handlePickAndUpload}
                        title="Escolher arquivo para anexar"
                      >
                        {uploadAttachment.isPending ? "Enviando…" : "Adicionar"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {cardData.attachments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
                      ) : (
                        cardData.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-background px-2 py-2 text-sm sm:gap-3 sm:px-3 sm:py-2.5"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                                <AttachmentTypeIcon attachment={attachment} />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{attachment.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {attachmentKindLabel(attachment)} · {formatRelativeDate(attachment.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              {attachment.attachmentType === "link" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Abrir link em nova guia"
                                  aria-label="Abrir link em nova guia"
                                  disabled={attachmentLoadingId === attachment.id}
                                  onClick={() => void handleOpenAttachment(attachment.id)}
                                >
                                  {attachmentLoadingId === attachment.id ? (
                                    <span className="text-xs">…</span>
                                  ) : (
                                    <ExternalLink className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Baixar arquivo"
                                  aria-label="Baixar arquivo"
                                  disabled={attachmentLoadingId === attachment.id || uploadAttachment.isPending}
                                  onClick={() => void handleDownloadAttachment(attachment)}
                                >
                                  {attachmentLoadingId === attachment.id ? (
                                    <span className="text-xs">…</span>
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Excluir anexo"
                                aria-label="Excluir anexo"
                                disabled={deleteAttachment.isPending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAttachmentDeleteTarget(attachment);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setCommentDraft(nextValue);
                            const query = extractMentionQuery(nextValue);
                            setMentionSearch(query);
                          }}
                          placeholder="Escreva um comentário... use @ para mencionar alguém"
                          rows={3}
                          className="min-h-[96px] resize-y"
                        />
                        {mentionSearch !== null && mentionCandidates.length > 0 ? (
                          <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                            <p className="mb-2 text-xs text-muted-foreground">Mencionar usuário</p>
                            <div className="space-y-1">
                              {mentionCandidates.map((member) => (
                                <button
                                  key={member.id}
                                  type="button"
                                  className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-background"
                                  onClick={() => {
                                    const replaced = replaceLastMentionWithUser(commentDraft, member.name);
                                    setCommentDraft(replaced);
                                    setMentionSearch(null);
                                    commentTextareaRef.current?.focus();
                                  }}
                                >
                                  {member.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
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
                                <MemberAvatar
                                  user={item.author || ({ name: "Sistema" } as LegalKanbanUser)}
                                  className="h-9 w-9 text-xs"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 text-sm leading-snug text-foreground">
                                      <span className="font-semibold">{item.title}</span>
                                      {item.kind === "comment" ? (
                                        <>
                                          {" "}
                                          comentou: {renderCommentWithMentionHighlight(item.body, item.mentions)}
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

            <AlertDialog open={unlinkDuplicateConfirmOpen} onOpenChange={setUnlinkDuplicateConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desvincular cópia?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {cardData?.duplicateInfo?.isRoot
                      ? `Este é o card original de ${cardData.duplicateInfo.peerCount} cópia(s). Todos os cards continuarão existindo, mas deixarão de ser sincronizados entre si.`
                      : "Os cards continuarão existindo, mas esta cópia deixará de receber e enviar alterações."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                  <Button type="button" onClick={() => void confirmUnlinkDuplicate()}>
                    Desvincular
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar card?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O card sairá do quadro e ficará disponível em &quot;Itens Arquivados&quot;. Ao desarquivar,
                    ele retornará à raia atual.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" disabled={cardActionsBusy}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    disabled={cardActionsBusy}
                    onClick={() => void confirmArchiveCard()}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir card?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Comentários, anexos e demais dados deste card serão removidos
                    permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" disabled={deleteCard.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteCard.isPending}
                    onClick={() => void confirmDeleteCard()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir card
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
              open={attachmentDeleteTarget != null}
              onOpenChange={(next) => {
                if (!next) setAttachmentDeleteTarget(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
                  <AlertDialogDescription className="break-words">
                    {attachmentDeleteTarget ? (
                      <>
                        O arquivo{" "}
                        <span className="font-medium text-foreground break-all">{attachmentDeleteTarget.name}</span>{" "}
                        será removido do card
                        {attachmentDeleteTarget.attachmentType === "file"
                          ? " e o arquivo será apagado do armazenamento."
                          : "."}
                      </>
                    ) : null}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" disabled={deleteAttachment.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteAttachment.isPending}
                    onClick={() => void confirmDeleteAttachment()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir anexo
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DialogContent>
    </Dialog>

    <Dialog
      open={membersModalOpen && Boolean(cardId)}
      onOpenChange={(next) => {
        setMembersModalOpen(next);
        if (!next) setMemberSearch("");
      }}
    >
      <DialogContent
        className="z-[100] max-h-[min(540px,88vh)] gap-0 overflow-hidden border-border/70 p-0 sm:max-w-md"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6 text-center sm:text-center">
          <DialogTitle className="text-center text-base font-semibold">Membros</DialogTitle>
          <DialogDescription className="sr-only">
            Pesquise usuários com perfil advogado ou advogado administrador, marque ou desmarque para vincular ao
            card e use o X para remover membros do cartão.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(420px,60vh)] space-y-4 overflow-y-auto px-6 py-4">
          {!data || data.id !== cardId ? (
            <p className="text-center text-sm text-muted-foreground">Carregando membros...</p>
          ) : (
            <>
              <Input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Pesquisar membros"
                className="h-10 rounded-lg border-border/70"
              />

              <div>
                <p className="mb-2 text-sm font-semibold">Membros do cartão</p>
                {data.members.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
                    Nenhum membro ainda. Marque na lista abaixo para adicionar.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.members.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5"
                      >
                        <MemberAvatar user={member.user} className="h-9 w-9 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{member.user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{getRoleDisplayName(member.user.role)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remover do cartão"
                          aria-label={`Remover ${member.user.name} do cartão`}
                          disabled={setMembers.isPending}
                          onClick={() => void handleToggleMember(member.user.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-sm font-semibold text-muted-foreground">Membros</p>
                <div className="space-y-2 pr-1">
                  {filteredMembers.length === 0 ? (
                    <EmptyState text="Nenhum membro encontrado com a pesquisa." />
                  ) : (
                    filteredMembers.map((member) => {
                      const active = selectedMemberIds.has(member.id);
                      return (
                        <div
                          key={member.id}
                          onClick={() => void handleToggleMember(member.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void handleToggleMember(member.id);
                            }
                          }}
                          role="button"
                          tabIndex={setMembers.isPending ? -1 : 0}
                          aria-disabled={setMembers.isPending}
                          data-disabled={setMembers.isPending}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                            active ? "border-primary bg-primary/10" : "border-border/70 bg-background",
                            setMembers.isPending && "cursor-not-allowed opacity-70",
                          )}
                        >
                          <MemberAvatar user={member} className="h-8 w-8 text-xs" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{member.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{getRoleDisplayName(member.role)}</p>
                          </div>
                          <Checkbox checked={active} className="pointer-events-none shrink-0" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    {/* Input de arquivo fora do Dialog/ScrollArea do Radix: dentro do modal, o
        seletor nativo não abria. Acionado por ref.click() a partir dos botões. */}
    <input
      ref={attachmentFileInputRef}
      type="file"
      accept={LEGAL_KANBAN_ATTACHMENT_ACCEPT}
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void processUploadFile(file);
      }}
    />
    {cardId ? (
      <ShareKanbanCardDialog
        cardId={cardId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onShared={() => onOpenChange(false)}
      />
    ) : null}
    {cardId ? (
      <DuplicateKanbanCardDialog
        cardId={cardId}
        board={board}
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        onDuplicated={() => onOpenChange(false)}
      />
    ) : null}
    </>
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
    <div
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:border-primary/25"
    >
      <Checkbox checked={checked} />
      <span
        className="inline-flex flex-1 items-center rounded-lg px-3 py-2 font-medium text-white"
        style={{ backgroundColor: label.color }}
      >
        {label.name}
      </span>
    </div>
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

function renderCommentWithMentionHighlight(content: string, mentionNames: string[]): ReactNode {
  const explicitMentions = Array.from(
    new Set(
      mentionNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => `@${name}`),
    ),
  );

  const inferredMentions =
    explicitMentions.length === 0
      ? Array.from(new Set(content.match(/@[\p{L}\p{N}._-]+/gu) || []))
      : [];

  const mentions = [...explicitMentions, ...inferredMentions].sort((left, right) => right.length - left.length);

  if (!mentions.length) {
    return <span className="text-muted-foreground">{content}</span>;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  const lowerContent = content.toLowerCase();
  const lowerMentions = mentions.map((mention) => mention.toLowerCase());

  while (cursor < content.length) {
    let nextIndex = -1;
    let nextMentionIndex = -1;

    for (let i = 0; i < lowerMentions.length; i += 1) {
      const currentIndex = lowerContent.indexOf(lowerMentions[i], cursor);
      if (currentIndex === -1) continue;
      if (nextIndex === -1 || currentIndex < nextIndex) {
        nextIndex = currentIndex;
        nextMentionIndex = i;
      }
    }

    if (nextIndex === -1 || nextMentionIndex === -1) {
      parts.push(
        <span key={`text-${key++}`} className="text-muted-foreground">
          {content.slice(cursor)}
        </span>,
      );
      break;
    }

    if (nextIndex > cursor) {
      parts.push(
        <span key={`text-${key++}`} className="text-muted-foreground">
          {content.slice(cursor, nextIndex)}
        </span>,
      );
    }

    const matchedMention = content.slice(nextIndex, nextIndex + mentions[nextMentionIndex].length);
    parts.push(
      <span key={`mention-${key++}`} className="font-medium text-blue-600 dark:text-blue-400">
        {matchedMention}
      </span>,
    );

    cursor = nextIndex + mentions[nextMentionIndex].length;
  }

  return <>{parts}</>;
}

// Traduz erros técnicos do Storage (mime/tamanho) para mensagens claras ao usuário.
function describeUploadError(error: unknown, fileName: string): string {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();

  if (lower.includes("mime") || lower.includes("not supported") || lower.includes("invalid_mime_type")) {
    return `O tipo do arquivo "${fileName}" não é permitido para anexos.`;
  }
  if (lower.includes("maximum allowed size") || lower.includes("payload too large") || lower.includes("413")) {
    return "Arquivo muito grande. O tamanho máximo é 50 MB.";
  }
  if (lower.includes("duplicate") || lower.includes("already exists") || lower.includes("conflict")) {
    return "Este arquivo já está anexado a este card.";
  }
  return message || "Erro ao enviar o arquivo.";
}

function attachmentKindLabel(attachment: LegalKanbanAttachment) {
  if (attachment.attachmentType === "link") return "Link";
  const mime = attachment.mimeType || "";
  const name = attachment.name.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(name)) return "Imagem";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "Word";
  }
  return "Arquivo";
}

function AttachmentTypeIcon({ attachment }: { attachment: LegalKanbanAttachment }) {
  const base = "h-4 w-4 shrink-0";
  if (attachment.attachmentType === "link") {
    return <Link2 className={cn(base, "text-sky-600")} aria-hidden />;
  }
  const mime = attachment.mimeType || "";
  const name = attachment.name.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(name)) {
    return <ImageIcon className={cn(base, "text-violet-600")} aria-hidden />;
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return <FileText className={cn(base, "text-red-600")} aria-hidden />;
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return <FileText className={cn(base, "text-blue-600")} aria-hidden />;
  }
  return <File className={cn(base, "text-muted-foreground")} aria-hidden />;
}

function toInputDateTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function fromInputDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}
