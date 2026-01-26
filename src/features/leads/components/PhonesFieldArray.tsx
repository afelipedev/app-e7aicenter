import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Trash2, Plus } from "lucide-react";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useFieldArray } from "react-hook-form";
import { formatPhoneBR } from "../utils/masks";

type PhoneItem = { phone: string; is_primary: boolean };

export default function PhonesFieldArray<TForm extends FieldValues>({
  form,
  name,
  label = "Telefones",
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
    const values = (form.getValues(name) as unknown as PhoneItem[]) || [];
    values.forEach((_, i) => {
      form.setValue(`${name}.${i}.is_primary` as Path<TForm>, i === idx, {
        shouldDirty: true,
      });
    });
  };

  const addPhone = () => {
    const values = (form.getValues(name) as unknown as PhoneItem[]) || [];
    const hasAny = values.length > 0;
    append({ phone: "", is_primary: !hasAny } as any, { shouldFocus: true });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            Marque com estrela o telefone principal (usado no disparo WhatsApp).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addPhone}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((f, idx) => {
          const phonePath = `${name}.${idx}.phone` as Path<TForm>;
          const primaryPath = `${name}.${idx}.is_primary` as Path<TForm>;
          const isPrimary = Boolean((form.watch(primaryPath) as any) ?? false);

          const error =
            (form.formState.errors as any)?.[String(name)]?.[idx]?.phone?.message;

          return (
            <div key={f.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  {...form.register(phonePath as any, {
                    onChange: (e) => {
                      const next = formatPhoneBR(e.target.value);
                      form.setValue(phonePath as any, next, { shouldDirty: true });
                    },
                  })}
                  placeholder="+55 (11) 99999-9999"
                  inputMode="numeric"
                />
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
                  // se removeu o principal, garanta um principal no restante
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
            Nenhum telefone adicionado.
          </div>
        )}
      </div>
    </div>
  );
}

