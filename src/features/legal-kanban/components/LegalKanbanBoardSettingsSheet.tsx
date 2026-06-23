import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ImagePlus, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { LEGAL_KANBAN_COLOR_PRESETS } from "../constants";
import {
  useAssignableLegalKanbanUsers,
  useCreateLegalKanbanColumn,
  useCreateLegalKanbanLabel,
  useDeleteLegalKanbanColumn,
  useDeleteLegalKanbanLabel,
  useReorderLegalKanbanColumns,
  useUpsertLegalKanbanBoard,
  useUpdateLegalKanbanColumn,
} from "../hooks/useLegalKanbanBoard";
import type { LegalKanbanBoardData } from "../types";
import { legalKanbanService } from "../services/legalKanbanService";

interface LegalKanbanBoardSettingsSheetProps {
  board?: LegalKanbanBoardData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  onSaved?: (slug: string) => void;
}

export function LegalKanbanBoardSettingsSheet({
  board,
  open,
  onOpenChange,
  triggerLabel = "Configurar board",
  onSaved,
}: LegalKanbanBoardSettingsSheetProps) {
  const { user } = useAuth();
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const sheetOpen = isControlled ? open : internalOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  const createColumn = useCreateLegalKanbanColumn();
  const updateColumn = useUpdateLegalKanbanColumn();
  const reorderColumns = useReorderLegalKanbanColumns();
  const deleteColumn = useDeleteLegalKanbanColumn();
  const createLabel = useCreateLegalKanbanLabel();
  const deleteLabel = useDeleteLegalKanbanLabel();
  const upsertBoard = useUpsertLegalKanbanBoard();
  const assignableUsers = useAssignableLegalKanbanUsers();

  const [newColumn, setNewColumn] = useState({ title: "", color: LEGAL_KANBAN_COLOR_PRESETS[0] });
  const [newLabel, setNewLabel] = useState({ name: "", color: LEGAL_KANBAN_COLOR_PRESETS[1] });
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [membersPickerOpen, setMembersPickerOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverUpload, setCoverUpload] = useState<{ coverImagePath: string | null; coverImageUrl: string | null }>({
    coverImagePath: null,
    coverImageUrl: null,
  });

  const columnsByPosition = useMemo(
    () => (board ? [...board.columns].sort((a, b) => a.position - b.position) : []),
    [board],
  );

  useEffect(() => {
    if (!sheetOpen) return;
    const loggedUserId = user?.id;
    const boardMemberIds = board ? board.members.map((member) => member.id) : [];
    const initialMemberIds = loggedUserId
      ? Array.from(new Set([loggedUserId, ...boardMemberIds]))
      : boardMemberIds;
    setBoardName(board?.board.title || "");
    setBoardDescription(board?.board.description || "");
    setSelectedMemberIds(initialMemberIds);
    setCoverPreviewUrl(board?.board.coverImageUrl || null);
    setCoverUpload({
      coverImagePath: board?.board.coverImagePath || null,
      coverImageUrl: board?.board.coverImageUrl || null,
    });
    setCoverFile(null);
  }, [board, sheetOpen, user?.id]);

  function toggleMember(userId: string) {
    if (user?.id && userId === user.id) {
      return;
    }
    setSelectedMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  const selectedUsers = useMemo(
    () => {
      const options = [...(assignableUsers.data || []), ...(board?.members || [])];
      const uniqueById = Array.from(new Map(options.map((member) => [member.id, member])).values());
      return uniqueById.filter((member) => selectedMemberIds.includes(member.id));
    },
    [assignableUsers.data, board?.members, selectedMemberIds],
  );

  const memberOptions = useMemo(() => {
    const options = [...(assignableUsers.data || []), ...(board?.members || [])];
    return Array.from(new Map(options.map((member) => [member.id, member])).values());
  }, [assignableUsers.data, board?.members]);

  async function handleSaveBoard() {
    if (!boardName.trim()) {
      toast.error("Informe o nome do quadro.");
      return;
    }
    const memberIdsToSave = user?.id
      ? Array.from(new Set([user.id, ...selectedMemberIds]))
      : selectedMemberIds;

    try {
      let savedBoard = await upsertBoard.mutateAsync({
        boardId: board?.board.id,
        input: {
          title: boardName.trim(),
          description: boardDescription.trim() || null,
          memberIds: memberIdsToSave,
          coverImagePath: coverUpload.coverImagePath,
          coverImageUrl: coverUpload.coverImageUrl,
        },
      });

      if (coverFile) {
        const uploaded = await legalKanbanService.uploadBoardCover(savedBoard.id, coverFile);
        savedBoard = await upsertBoard.mutateAsync({
          boardId: savedBoard.id,
          input: {
            title: boardName.trim(),
            description: boardDescription.trim() || null,
            memberIds: memberIdsToSave,
            coverImagePath: uploaded.coverImagePath,
            coverImageUrl: uploaded.coverImageUrl,
          },
        });
      }

      toast.success(board ? "Configuração do quadro atualizada." : "Quadro criado com sucesso.");
      handleOpenChange(false);
      onSaved?.(savedBoard.slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar quadro.");
    }
  }

  async function handleCreateColumn() {
    if (!board) return;
    if (!newColumn.title.trim()) {
      toast.error("Informe o nome da nova raia.");
      return;
    }

    try {
      await createColumn.mutateAsync({
        boardId: board.board.id,
        title: newColumn.title.trim(),
        color: newColumn.color,
      });
      setNewColumn({ title: "", color: LEGAL_KANBAN_COLOR_PRESETS[0] });
      toast.success("Raia criada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar a raia.");
    }
  }

  async function handleMoveColumn(columnId: string, direction: -1 | 1) {
    if (!board) return;
    const index = columnsByPosition.findIndex((column) => column.id === columnId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= columnsByPosition.length) return;

    const nextColumns = [...columnsByPosition];
    const [moved] = nextColumns.splice(index, 1);
    nextColumns.splice(targetIndex, 0, moved);

    try {
      await reorderColumns.mutateAsync(nextColumns);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reordenar as raias.");
    }
  }

  async function handleUpdateColumn(columnId: string, title: string, color: string) {
    try {
      await updateColumn.mutateAsync({ columnId, input: { title, color, boardId: board.board.id } });
      toast.success("Raia atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar a raia.");
    }
  }

  async function handleDeleteColumn(columnId: string) {
    try {
      await deleteColumn.mutateAsync(columnId);
      toast.success("Raia removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover a raia.");
    }
  }

  async function handleCreateLabel() {
    if (!board) return;
    if (!newLabel.name.trim()) {
      toast.error("Informe o nome da etiqueta.");
      return;
    }

    try {
      await createLabel.mutateAsync({
        boardId: board.board.id,
        name: newLabel.name.trim(),
        color: newLabel.color,
      });
      setNewLabel({ name: "", color: LEGAL_KANBAN_COLOR_PRESETS[1] });
      toast.success("Etiqueta criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar a etiqueta.");
    }
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Settings2 className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/70 px-6 py-5">
            <SheetTitle>{board ? "Configurar Board" : "Novo Quadro"}</SheetTitle>
            <SheetDescription>
              Defina nome, capa e permissões de acesso do quadro.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-6">
            <div className="space-y-8 pb-10">
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Dados do quadro</h3>
                  <p className="text-sm text-muted-foreground">
                    O slug da rota será gerado automaticamente com base no nome do quadro.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                  <Label htmlFor="board-name">Nome do quadro</Label>
                  <Input
                    id="board-name"
                    value={boardName}
                    onChange={(event) => setBoardName(event.target.value)}
                    placeholder="Ex.: Contencioso Tributário"
                  />

                  <Label htmlFor="board-description">Descrição do quadro</Label>
                  <Textarea
                    id="board-description"
                    value={boardDescription}
                    onChange={(event) => setBoardDescription(event.target.value)}
                    placeholder="Descreva o objetivo e contexto deste quadro"
                    rows={3}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Capa</h3>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de uma imagem para exibir no card do quadro.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setCoverFile(file);
                      if (file) {
                        setCoverPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {coverPreviewUrl ? (
                    <div className="overflow-hidden rounded-xl border border-border/60">
                      <img src={coverPreviewUrl} alt="Pré-visualização da capa" className="h-36 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
                      <ImagePlus className="mr-2 h-4 w-4" /> Sem capa definida
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Permissões</h3>
                  <p className="text-sm text-muted-foreground">
                    Busque e selecione múltiplos usuários com acesso ao quadro.
                  </p>
                </div>

                <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedUsers.map((member) => (
                      <Badge key={member.id} variant="secondary" className="gap-1 rounded-full px-3 py-1">
                        <span>{member.name}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => toggleMember(member.id)}
                          disabled={Boolean(user?.id && member.id === user.id)}
                          aria-label={`Remover ${member.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                    {selectedUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum usuário selecionado.</p>
                    ) : null}
                  </div>

                  <Popover open={membersPickerOpen} onOpenChange={setMembersPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between">
                        Buscar e selecionar usuários
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar usuário por nome..." />
                        <CommandList>
                          <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                          <CommandGroup>
                            {memberOptions.map((member) => {
                              const selected = selectedMemberIds.includes(member.id);
                              return (
                                <CommandItem key={member.id} value={`${member.name} ${member.email}`} onSelect={() => toggleMember(member.id)}>
                                  <div className="flex w-full items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate">{member.name}</p>
                                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                                    </div>
                                    {selected ? <Check className="h-4 w-4 text-primary" /> : <div className="h-4 w-4" />}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </section>

              {board ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Raias</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuste o fluxo principal e crie novas raias conforme a operação dos advogados.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                  <Label>Nova raia</Label>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <Input
                      value={newColumn.title}
                      onChange={(event) => setNewColumn((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Ex.: Jurídico Preventivo"
                    />
                    <Input
                      type="color"
                      value={newColumn.color}
                      onChange={(event) => setNewColumn((current) => ({ ...current, color: event.target.value }))}
                      className="h-10"
                    />
                    <Button onClick={handleCreateColumn} disabled={createColumn.isPending}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {columnsByPosition.map((column, index) => (
                    <EditableColumnRow
                      key={column.id}
                      column={column}
                      disableLeft={index === 0}
                      disableRight={index === columnsByPosition.length - 1}
                      onMove={handleMoveColumn}
                      onSave={handleUpdateColumn}
                      onDelete={handleDeleteColumn}
                    />
                  ))}
                </div>
              </section>
              ) : null}

              {board ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Etiquetas</h3>
                  <p className="text-sm text-muted-foreground">
                    Etiquetas são compartilhadas em todos os quadros para reutilização.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <Input
                    value={newLabel.name}
                    onChange={(event) => setNewLabel((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex.: Prioridade Cliente"
                  />
                  <Input
                    type="color"
                    value={newLabel.color}
                    onChange={(event) => setNewLabel((current) => ({ ...current, color: event.target.value }))}
                    className="h-10"
                  />
                  <Button onClick={handleCreateLabel} disabled={createLabel.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {board.labels.map((label) => (
                    <div
                      key={label.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2"
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="text-sm font-medium">{label.name}</span>
                      <button
                        type="button"
                        onClick={() => deleteLabel.mutate(label.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-4">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void handleSaveBoard()} disabled={upsertBoard.isPending}>
                  Salvar
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditableColumnRow({
  column,
  disableLeft,
  disableRight,
  onMove,
  onSave,
  onDelete,
}: {
  column: LegalKanbanBoardData["columns"][number];
  disableLeft: boolean;
  disableRight: boolean;
  onMove: (columnId: string, direction: -1 | 1) => void;
  onSave: (columnId: string, title: string, color: string) => void;
  onDelete: (columnId: string) => void;
}) {
  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color);

  return (
    <div className="rounded-3xl border border-border/70 bg-background p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto_auto]">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10" />
        <div className="flex gap-2">
          <Button variant="outline" size="icon" disabled={disableLeft} onClick={() => onMove(column.id, -1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={disableRight} onClick={() => onMove(column.id, 1)}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(column.id, title, color)}>Salvar</Button>
          {!column.isDefault ? (
            <Button variant="outline" size="icon" onClick={() => onDelete(column.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
