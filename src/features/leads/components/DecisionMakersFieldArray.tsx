import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { useFieldArray } from "react-hook-form";

export default function DecisionMakersFieldArray<TForm extends FieldValues>({
  form,
  name,
  label = "Tomadores de decisão",
}: {
  form: UseFormReturn<TForm>;
  name: Path<TForm>;
  label?: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  const addDecisionMaker = () => {
    append("" as any, { shouldFocus: true });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            Nomes, cargos e contatos dos tomadores de decisão.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addDecisionMaker}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((f, idx) => {
          const path = `${name}.${idx}` as Path<TForm>;
          const error =
            (form.formState.errors as any)?.[String(name)]?.[idx]?.message;

          return (
            <div key={f.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  {...form.register(path as any)}
                  placeholder="Ex.: João Silva (Diretor)"
                />
                {error && (
                  <p className="text-xs text-destructive mt-1">{String(error)}</p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded-md p-3">
            Nenhum tomador de decisão adicionado.
          </div>
        )}
      </div>
    </div>
  );
}
