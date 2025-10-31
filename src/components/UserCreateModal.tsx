import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { UserRole } from "@/lib/supabase";
import { UserService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "administrator", label: "Administrador" },
  { value: "it", label: "TI" },
  { value: "advogado_adm", label: "Advogado Administrativo" },
  { value: "advogado", label: "Advogado" },
  { value: "contabil", label: "Contábil" },
  { value: "financeiro", label: "Financeiro" },
];

export function UserCreateModal({ isOpen, onClose, onUserCreated }: UserCreateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as UserRole,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Formato de e-mail inválido";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Senha é obrigatória";
    } else if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    }

    if (!formData.role) {
      newErrors.role = "Função é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateDefaultPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + "123!";
  };

  const handleGeneratePassword = () => {
    const newPassword = generateDefaultPassword();
    setFormData({ ...formData, password: newPassword });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await UserService.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        status: "ativo",
      });

      if (error) {
        if (error.message?.includes("already registered")) {
          setErrors({ email: "Este e-mail já está cadastrado" });
        } else {
          toast({
            title: "Erro",
            description: "Erro ao criar usuário",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });

      onUserCreated();
      handleClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar usuário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", password: "", role: "" as UserRole });
    setErrors({});
    onClose();
  };

  // Real-time validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ ...errors, email: "Formato de e-mail inválido" });
    } else {
      const newErrors = { ...errors };
      delete newErrors.email;
      setErrors(newErrors);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name });
    
    if (name.trim()) {
      const newErrors = { ...errors };
      delete newErrors.name;
      setErrors(newErrors);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    
    if (password.length >= 6) {
      const newErrors = { ...errors };
      delete newErrors.password;
      setErrors(newErrors);
    } else if (password.length > 0) {
      setErrors({ ...errors, password: "Senha deve ter pelo menos 6 caracteres" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="create-user-description">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
          <p id="create-user-description" className="text-sm text-muted-foreground">
            Preencha as informações para criar um novo usuário
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nome Completo *</Label>
            <Input
              id="create-name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Digite o nome completo"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "create-name-error" : undefined}
            />
            {errors.name && (
              <p id="create-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">E-mail *</Label>
            <Input
              id="create-email"
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="Digite o e-mail"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "create-email-error" : undefined}
            />
            {errors.email && (
              <p id="create-email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Senha Padrão *</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handlePasswordChange}
                  placeholder="Digite a senha"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "create-password-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePassword}
              >
                Gerar
              </Button>
            </div>
            {errors.password && (
              <p id="create-password-error" className="text-sm text-destructive">
                {errors.password}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              O usuário deve alterar esta senha no primeiro login
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role">Função *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) => {
                setFormData({ ...formData, role: value });
                const newErrors = { ...errors };
                delete newErrors.role;
                setErrors(newErrors);
              }}
            >
              <SelectTrigger id="create-role" aria-invalid={!!errors.role}>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}