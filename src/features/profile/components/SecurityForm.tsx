import { FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SecurityFormProps {
  loading?: boolean;
  onSubmit: (password: string) => void;
}

export function SecurityForm({ loading = false, onSubmit }: SecurityFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    onSubmit(newPassword);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="profile-new-password">Nova senha</Label>
        <Input
          id="profile-new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Digite uma nova senha"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-confirm-password">Confirmar nova senha</Label>
        <Input
          id="profile-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirme a nova senha"
          required
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" variant="outline" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Atualizando...
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" />
            Atualizar senha
          </>
        )}
      </Button>
    </form>
  );
}
