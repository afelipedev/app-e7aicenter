import { FormEvent, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileFormValues } from "../types";

interface ProfileFormProps {
  initialValues: ProfileFormValues;
  canEditEmail: boolean;
  loading?: boolean;
  onSubmit: (values: ProfileFormValues) => void;
}

export function ProfileForm({ initialValues, canEditEmail, loading = false, onSubmit }: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="profile-name">Nome</Label>
        <Input
          id="profile-name"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Digite seu nome"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-phone">Telefone</Label>
        <Input
          id="profile-phone"
          value={values.phone}
          onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
          placeholder="(00) 00000-0000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">E-mail de acesso</Label>
        <Input
          id="profile-email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
          disabled={!canEditEmail}
          required
        />
        {!canEditEmail ? (
          <p className="text-xs text-muted-foreground">
            Apenas Administrador, TI e Advogado Administrativo podem alterar o e-mail.
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salvar alterações
          </>
        )}
      </Button>
    </form>
  );
}
