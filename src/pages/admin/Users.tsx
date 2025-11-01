import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Loader2, UserCheck, UserX, Clock } from "lucide-react";
import { UserService, PaginationParams, PaginatedResponse } from "@/services/userService";
import { User } from "@/lib/supabase";
import { UserEditModal } from "@/components/UserEditModal";
import { UserCreateModal } from "@/components/UserCreateModal";
import { UsersPagination } from "@/components/UsersPagination";
import { toast } from "@/hooks/use-toast";

export default function Users() {
  console.log('Users component renderizado');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc');

  // Constantes
  const ITEMS_PER_PAGE = 10;

  // Estatísticas calculadas
  const users = paginatedData?.data || [];
  const totalUsers = paginatedData?.pagination.total || 0;
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
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  // Atualizar URL quando parâmetros mudarem
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (searchTerm) params.set('search', searchTerm);
    if (sortBy !== 'created_at') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    
    setSearchParams(params);
  }, [currentPage, searchTerm, sortBy, sortOrder, setSearchParams]);

  const loadUsers = async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Carregando usuários paginados...');
      
      const params: PaginationParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        sortBy,
        sortOrder
      };

      const data = await UserService.getUsersPaginated(params);
      
      console.log('Usuários carregados com sucesso:', data.data.length, 'de', data.pagination.total);
      setPaginatedData(data);
      
      // Só mostra toast de sucesso quando explicitamente solicitado (ex: botão "Tentar novamente")
      if (showSuccessToast) {
        toast({
          title: "Sucesso",
          description: `${data.data.length} usuários carregados`,
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

  // Função para lidar com mudança de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Função para lidar com mudança de busca
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset para primeira página ao buscar
  };

  const handleEditUser = (user: User) => {
    console.log('Editando usuário:', user.id);
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleUserUpdated = () => {
    console.log('Usuário atualizado - recarregando lista');
    setIsEditModalOpen(false);
    setEditingUser(null);
    loadUsers();
  };

  const handleUserCreated = () => {
    console.log('Usuário criado - recarregando lista');
    setIsCreateModalOpen(false);
    loadUsers();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Ativo</Badge>;
      case "inativo":
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "user":
        return <Badge variant="default">Usuário</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Funções auxiliares já definidas anteriormente

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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ai-blue mr-3" />
            <span className="text-muted-foreground">Carregando usuários...</span>
          </div>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && !error && paginatedData && (
        <Card className="hidden md:block">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Lista de Usuários</h2>
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} de {totalUsers} usuários
              </p>
            </div>
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.last_access)}
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
          
          {/* Pagination for Desktop */}
          {paginatedData.pagination.totalPages > 1 && (
            <div className="p-6 border-t border-border">
              <UsersPagination
                currentPage={currentPage}
                totalPages={paginatedData.pagination.totalPages}
                onPageChange={handlePageChange}
                totalItems={totalUsers}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </Card>
      )}

      {/* Mobile Cards */}
      {!isLoading && !error && paginatedData && (
        <div className="md:hidden space-y-4">
          <div className="px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Lista de Usuários</h2>
              <p className="text-sm text-muted-foreground">
                {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} de {totalUsers}
              </p>
            </div>
          </div>
          {users.map((user) => (
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
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    {getStatusBadge(user.status)}
                  </div>
                </div>
              
                <div className="text-xs text-muted-foreground">
                  <span>Último acesso: {formatDate(user.last_access)}</span>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Pagination for Mobile */}
          {paginatedData.pagination.totalPages > 1 && (
            <div className="px-4">
              <UsersPagination
                currentPage={currentPage}
                totalPages={paginatedData.pagination.totalPages}
                onPageChange={handlePageChange}
                totalItems={totalUsers}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && paginatedData && users.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Tente ajustar os filtros de busca" : "Nenhum usuário cadastrado no sistema"}
            </p>
            {searchTerm && (
              <Button onClick={() => handleSearchChange("")} variant="outline">
                Limpar busca
              </Button>
            )}
          </div>
        </Card>
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
