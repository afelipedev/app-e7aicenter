import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Key, Eye, EyeOff } from "lucide-react";
import { User, UserRole } from "@/lib/supabase";
import { UserService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "administrator", label: "Administrador" },
  { value: "it", label: "TI" },
  { value: "advogado_adm", label: "Advogado Administrativo" },
  { value: "advogado", label: "Advogado" },
  { value: "contabil", label: "Contábil" },
  { value: "financeiro", label: "Financeiro" },
];

export function UserEditModal({ user, isOpen, onClose, onUserUpdated }: UserEditModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "" as UserRole,
    status: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status === "ativo",
      });
      setTempPassword("");
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.role) {
      newErrors.role = "Função é obrigatória";
    }

    // Validação adicional: se uma senha foi gerada, avisar que ela será aplicada
    if (tempPassword) {
      console.log('UserEditModal: Validação - senha temporária será aplicada na atualização');
      console.log('UserEditModal: Comprimento da senha:', tempPassword.length);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = async () => {
    if (!user) return;

    setIsGeneratingPassword(true);
    try {
      const newPassword = generateTempPassword();
      setTempPassword(newPassword);
      
      toast({
        title: "Senha temporária gerada",
        description: "Nova senha gerada com sucesso. Ela será aplicada quando você salvar as alterações.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar senha temporária",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('UserEditModal: handleSubmit iniciado');
    console.log('UserEditModal: user:', user);
    console.log('UserEditModal: formData:', formData);
    console.log('UserEditModal: tempPassword:', tempPassword ? 'Senha gerada' : 'Nenhuma senha gerada');
    
    if (!user || !validateForm()) {
      console.log('UserEditModal: Validação falhou ou usuário não encontrado');
      return;
    }

    const updateData = {
      name: formData.name,
      role: formData.role,
      status: formData.status ? "ativo" : "inativo",
      ...(tempPassword && { password: tempPassword }) // Incluir senha apenas se foi gerada
    };
    
    // Validação extra para garantir que a senha está sendo incluída
    if (tempPassword && !updateData.password) {
      console.error('UserEditModal: ERRO - Senha temporária existe mas não foi incluída no updateData');
      toast({
        title: "Erro",
        description: "Erro interno: senha não foi incluída na atualização",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    console.log('UserEditModal: Dados que serão enviados para updateUser:', {
      ...updateData,
      password: updateData.password ? '[SENHA OCULTA - COMPRIMENTO: ' + updateData.password.length + ']' : undefined
    });

    setIsLoading(true);
    try {
      const { data, error } = await UserService.updateUser(user.id, updateData);
      
      console.log('UserEditModal: Resposta do updateUser:', { data, error });

      if (error) {
        console.error('UserEditModal: Erro retornado pelo updateUser:', error);
        toast({
          title: "Erro",
          description: `Erro ao atualizar usuário: ${error.message || 'Erro desconhecido'}`,
          variant: "destructive",
        });
        return;
      }

      console.log('UserEditModal: Usuário atualizado com sucesso');
      
      // Feedback específico para atualização de senha
      if (tempPassword) {
        toast({
          title: "Sucesso",
          description: "Usuário e senha atualizados com sucesso. A nova senha foi aplicada.",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso",
        });
      }

      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('UserEditModal: Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar usuário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", role: "" as UserRole, status: true });
    setTempPassword("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="edit-user-description">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <p id="edit-user-description" className="text-sm text-muted-foreground">
            Edite as informações do usuário abaixo
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome Completo *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome completo"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "edit-name-error" : undefined}
            />
            {errors.name && (
              <p id="edit-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">E-mail *</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Digite o e-mail"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "edit-email-error" : undefined}
            />
            {errors.email && (
              <p id="edit-email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Função *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger id="edit-role" aria-invalid={!!errors.role}>
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

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-status"
              checked={formData.status}
              onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
            />
            <Label htmlFor="edit-status">
              Status: {formData.status ? "Ativo" : "Inativo"}
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Resetar Senha</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePassword}
                disabled={isGeneratingPassword}
                className="flex-1"
              >
                {isGeneratingPassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Gerar Nova Senha
              </Button>
            </div>
            
            {tempPassword && (
              <div className="space-y-2">
                <Label htmlFor="temp-password">Senha Temporária</Label>
                <div className="flex gap-2">
                  <Input
                    id="temp-password"
                    type={showPassword ? "text" : "password"}
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Digite ou gere uma senha"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    ⚠️ Atenção: Esta senha será aplicada ao usuário quando você salvar as alterações.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Você pode editar a senha gerada ou digitar uma senha personalizada. Compartilhe esta senha com o usuário. Ela deve ser alterada no primeiro login.
                  </p>
                </div>
              </div>
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
              {tempPassword ? "Salvar e Aplicar Nova Senha" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}