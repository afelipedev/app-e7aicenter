import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Trash2, Plus } from "lucide-react";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useFieldArray } from "react-hook-form";

type EmailItem = { email: string; is_primary: boolean };

export default function EmailsFieldArray<TForm extends FieldValues>({
  form,
  name,
  label = "E-mails",
}: {
  form: UseFormReturn<TForm>;
  name: Path<TForm>;
  label?: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  const setPrimary = (idx: number) => {
    const values = (form.getValues(name) as unknown as EmailItem[]) || [];
    values.forEach((_, i) => {
      form.setValue(`${name}.${i}.is_primary` as Path<any>, i === idx, {
        shouldDirty: true,
      });
    });
  };

  const addEmail = () => {
    const values = (form.getValues(name) as unknown as EmailItem[]) || [];
    const hasAny = values.length > 0;
    append({ email: "", is_primary: !hasAny } as any, { shouldFocus: true });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            Marque com estrela o email principal (usado no disparo Email).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addEmail}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((f, idx) => {
          const emailPath = `${name}.${idx}.email` as Path<any>;
          const primaryPath = `${name}.${idx}.is_primary` as Path<any>;
          const isPrimary = Boolean((form.watch(primaryPath) as any) ?? false);

          const error =
            (form.formState.errors as any)?.[String(name)]?.[idx]?.email?.message;

          return (
            <div key={f.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input {...form.register(emailPath)} placeholder="contato@empresa.com" />
                {error && (
                  <p className="text-xs text-destructive mt-1">{String(error)}</p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPrimary(idx)}
                title="Marcar como principal"
                className={cn(isPrimary && "text-yellow-500")}
              >
                <Star className={cn("w-4 h-4", isPrimary && "fill-yellow-500")} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  remove(idx);
                  setTimeout(() => {
                    const next = (form.getValues(name) as any[]) || [];
                    if (next.length > 0 && !next.some((x) => x?.is_primary)) {
                      form.setValue(`${name}.0.is_primary` as any, true, {
                        shouldDirty: true,
                      });
                    }
                  }, 0);
                }}
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded-md p-3">
            Nenhum email adicionado.
          </div>
        )}
      </div>
    </div>
  );
}

