import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Loader2, UserCheck, UserX, Clock } from "lucide-react";
import { UserService } from "@/services/userService";
import { User } from "@/lib/supabase";
import { UserEditModal } from "@/components/UserEditModal";
import { UserCreateModal } from "@/components/UserCreateModal";
import { toast } from "@/hooks/use-toast";

export default function Users() {
  console.log('Users component renderizado');
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Estatísticas calculadas
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'ativo').length;
  const inactiveUsers = users.filter(user => user.status === 'inativo').length;
  const recentLogins = users.filter(user => {
    if (!user.last_access) return false;
    const lastAccess = new Date(user.last_access);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastAccess > sevenDaysAgo;
  }).length;

  useEffect(() => {
    console.log('useEffect executado - iniciando loadUsers');
    loadUsers();
  }, []);

  const loadUsers = async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Carregando usuários...');
      
      const data = await UserService.getUsers();
      
      console.log('Usuários carregados com sucesso:', data.length);
      setUsers(data);
      
      // Só mostra toast de sucesso quando explicitamente solicitado (ex: botão "Tentar novamente")
      if (showSuccessToast) {
        toast({
          title: "Sucesso",
          description: `${data.length} usuários carregados`,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível carregar os usuários";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleUserUpdated = () => {
    loadUsers();
  };

  const handleUserCreated = () => {
    loadUsers();
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      administrator: "Administrador",
      it: "TI",
      advogado_adm: "Advogado Administrativo",
      advogado: "Advogado",
      contabil: "Contábil",
      financeiro: "Financeiro",
    };
    return roleLabels[role] || role;
  };

  const getStatusBadge = (status: string) => {
    return status === "ativo" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        Inativo
      </Badge>
    );
  };

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return "Nunca";
    return new Date(lastAccess).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Removido o return early para debug - vamos mostrar a interface completa

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <UserCheck className="w-5 h-5 text-ai-blue" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{totalUsers}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total de Usuários</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <UserCheck className="w-5 h-5 text-ai-green" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-ai-green mb-1">{activeUsers}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Ativos</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <UserX className="w-5 h-5 text-ai-orange" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-ai-orange mb-1">{inactiveUsers}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Inativos</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-ai-blue" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-ai-blue mb-1">{recentLogins}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Login Recente</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou função..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Desktop Table */}
      {!isLoading && !error && (
        <Card className="hidden md:block">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Lista de Usuários</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleLabel(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastAccess(user.last_access)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user)}
                      aria-label={`Editar usuário ${user.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Mobile Cards */}
      {!isLoading && !error && (
        <div className="md:hidden space-y-4">
          <div className="px-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Lista de Usuários</h2>
          </div>
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditUser(user)}
                    aria-label={`Editar usuário ${user.name}`}
                    className="ml-2"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Função:</span>
                  <span className="text-xs">{getRoleLabel(user.role)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  {getStatusBadge(user.status)}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <span>Último acesso: {formatLastAccess(user.last_access)}</span>
              </div>
            </div>
          </Card>
        ))}
        </div>
      )}

      {filteredUsers.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <UserX className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar usuários</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadUsers(true)} variant="outline">
              Tentar novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Modals */}
      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onUserUpdated={handleUserUpdated}
      />

      <UserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
}
