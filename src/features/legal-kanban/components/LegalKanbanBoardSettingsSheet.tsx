import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEGAL_KANBAN_COLOR_PRESETS } from "../constants";
import {
  useCreateLegalKanbanColumn,
  useCreateLegalKanbanCustomField,
  useCreateLegalKanbanLabel,
  useDeleteLegalKanbanColumn,
  useDeleteLegalKanbanCustomField,
  useDeleteLegalKanbanLabel,
  useReorderLegalKanbanColumns,
  useUpdateLegalKanbanColumn,
} from "../hooks/useLegalKanbanBoard";
import type { LegalKanbanBoardData, LegalKanbanCustomField, LegalKanbanFieldType } from "../types";

interface LegalKanbanBoardSettingsSheetProps {
  board: LegalKanbanBoardData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LegalKanbanBoardSettingsSheet({ board, open, onOpenChange }: LegalKanbanBoardSettingsSheetProps) {
  const createColumn = useCreateLegalKanbanColumn();
  const updateColumn = useUpdateLegalKanbanColumn();
  const reorderColumns = useReorderLegalKanbanColumns();
  const deleteColumn = useDeleteLegalKanbanColumn();
  const createLabel = useCreateLegalKanbanLabel();
  const deleteLabel = useDeleteLegalKanbanLabel();
  const createCustomField = useCreateLegalKanbanCustomField();
  const deleteCustomField = useDeleteLegalKanbanCustomField();

  const [newColumn, setNewColumn] = useState({ title: "", color: LEGAL_KANBAN_COLOR_PRESETS[0] });
  const [newLabel, setNewLabel] = useState({ name: "", color: LEGAL_KANBAN_COLOR_PRESETS[1] });
  const [newField, setNewField] = useState<{
    name: string;
    fieldType: LegalKanbanFieldType;
    options: string;
  }>({
    name: "",
    fieldType: "text",
    options: "",
  });

  const columnsByPosition = useMemo(() => [...board.columns].sort((a, b) => a.position - b.position), [board.columns]);

  async function handleCreateColumn() {
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

  async function handleCreateField() {
    if (!newField.name.trim()) {
      toast.error("Informe o nome do campo.");
      return;
    }

    try {
      await createCustomField.mutateAsync({
        boardId: board.board.id,
        name: newField.name.trim(),
        fieldType: newField.fieldType,
        options:
          newField.fieldType === "select"
            ? newField.options
                .split(",")
                .map((option) => option.trim())
                .filter(Boolean)
            : [],
      });
      setNewField({ name: "", fieldType: "text", options: "" });
      toast.success("Campo personalizado criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar o campo.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Settings2 className="mr-2 h-4 w-4" />
          Configurar board
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/70 px-6 py-5">
            <SheetTitle>Configuração do Kanban</SheetTitle>
            <SheetDescription>
              Gerencie raias, etiquetas e campos personalizados do board compartilhado do setor jurídico.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-6">
            <div className="space-y-8 pb-10">
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

              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Etiquetas</h3>
                  <p className="text-sm text-muted-foreground">
                    Organize prioridades, natureza da demanda e categorias internas.
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

              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Campos personalizados</h3>
                  <p className="text-sm text-muted-foreground">
                    Registre metadados específicos de cada fluxo jurídico.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={newField.name}
                      onChange={(event) => setNewField((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ex.: Vara responsável"
                    />
                    <Select
                      value={newField.fieldType}
                      onValueChange={(value: LegalKanbanFieldType) =>
                        setNewField((current) => ({ ...current, fieldType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="select">Seleção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newField.fieldType === "select" ? (
                    <Input
                      value={newField.options}
                      onChange={(event) => setNewField((current) => ({ ...current, options: event.target.value }))}
                      placeholder="Opções separadas por vírgula"
                    />
                  ) : null}

                  <div className="flex justify-end">
                    <Button onClick={handleCreateField} disabled={createCustomField.isPending}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar campo
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {board.customFields.map((field) => (
                    <CustomFieldRow
                      key={field.id}
                      field={field}
                      onDelete={() => deleteCustomField.mutate(field.id)}
                    />
                  ))}
                </div>
              </section>
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

function CustomFieldRow({
  field,
  onDelete,
}: {
  field: LegalKanbanCustomField;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-border/70 bg-background p-4">
      <div>
        <p className="font-medium">{field.name}</p>
        <p className="text-sm text-muted-foreground">
          Tipo: {field.fieldType}
          {field.options.length > 0 ? ` • ${field.options.join(", ")}` : ""}
        </p>
      </div>
      <Button variant="outline" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
