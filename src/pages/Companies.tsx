import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Edit, 
  FileText, 
  Trash2, 
  Search,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyService } from '../services/companyService';
import { CompanyCreateModal } from '../components/CompanyCreateModal';
import { CompanyEditModal } from '../components/CompanyEditModal';
import type { CompanyWithStats } from '../../shared/types/company';
import { toast } from "@/hooks/use-toast";

export const Companies: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithStats | null>(null);

  // Delete confirmation
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estatísticas calculadas
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(company => company.status === 'ativo').length;
  const inactiveCompanies = companies.filter(company => company.status === 'inativo').length;
  const totalPayrollFiles = companies.reduce((sum, company) => sum + company.total_payroll_files, 0);

  // Handle search change with server-side search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Debounce a busca para evitar muitas requisições
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      loadCompanies(value);
    }, 300); // 300ms de delay
  };

  const loadCompanies = async (searchQuery?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let data: CompanyWithStats[];
      
      if (searchQuery && searchQuery.trim()) {
        // Usar busca server-side quando há termo de busca
        const searchResult = await CompanyService.searchCompanies(searchQuery.trim());
        if (searchResult.error) {
          throw new Error(searchResult.error.message || 'Erro na busca');
        }
        data = searchResult.data || [];
      } else {
        // Carregar todas as empresas quando não há busca
        data = await CompanyService.getAllWithStats();
      }
      
      setCompanies(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies(searchTerm);
  }, []);

  // Atualizar URL quando searchTerm mudar
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    
    setSearchParams(params);
  }, [searchTerm, setSearchParams]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateSuccess = async (newCompany?: CompanyWithStats) => {
    // Se a nova empresa foi retornada, adicionar à lista sem recarregar tudo
    if (newCompany) {
      // Adicionar estatísticas padrão se não vierem
      const companyWithStats: CompanyWithStats = {
        ...newCompany,
        total_payroll_files: newCompany.total_payroll_files || 0,
        files_this_week: newCompany.files_this_week || 0,
        files_this_month: newCompany.files_this_month || 0
      };
      
      setCompanies(prev => [...prev, companyWithStats].sort((a, b) => 
        a.name.localeCompare(b.name)
      ));
    } else {
      // Se não tiver a empresa, recarregar apenas se não houver busca ativa
      if (!searchTerm) {
        loadCompanies();
      }
    }
  };

  const handleEditClick = (company: CompanyWithStats) => {
    setSelectedCompany(company);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    loadCompanies();
    setSelectedCompany(null);
  };

  const handleManagePayrolls = (company: CompanyWithStats) => {
    navigate(`/companies/${company.id}/payrolls`);
  };

  const handleDeleteClick = (company: CompanyWithStats) => {
    setCompanyToDelete(company);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    setIsDeleting(true);
    try {
      await CompanyService.delete(companyToDelete.id);
      await loadCompanies();
      setCompanyToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      setError(error instanceof Error ? error.message : 'Erro ao deletar empresa');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setCompanyToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie suas empresas e acompanhe o processamento de holerites
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="w-5 h-5 text-ai-blue" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{totalCompanies}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total de Empresas</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="w-5 h-5 text-ai-green" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-ai-green mb-1">{activeCompanies}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Ativas</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="w-5 h-5 text-ai-orange" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-ai-orange mb-1">{inactiveCompanies}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Inativas</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-ai-blue" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-ai-blue mb-1">{totalPayrollFiles}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Holerites Processados</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
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
            <span className="text-muted-foreground">Carregando empresas...</span>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && !error && (
        <Card className="hidden md:block">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Lista de Empresas</h2>
              <p className="text-sm text-muted-foreground">
                {companies.length} empresa{companies.length !== 1 ? 's' : ''} encontrada{companies.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="hidden sm:table-cell">CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Holerites Processados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {company.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate sm:hidden">
                          {CompanyService.formatCnpj(company.cnpj)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono">
                    {CompanyService.formatCnpj(company.cnpj)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div>
                      <div className="font-medium">{company.total_payroll_files} total</div>
                      <div className="text-muted-foreground text-sm">
                        {company.files_this_month} este mês
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === 'ativo' ? 'default' : 'secondary'} 
                           className={company.status === 'ativo' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}>
                      {company.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(company)}
                        aria-label={`Editar empresa ${company.name}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleManagePayrolls(company)}
                        aria-label={`Gerenciar holerites de ${company.name}`}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(company)}
                        aria-label={`Deletar empresa ${company.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Lista de Empresas</h2>
              <p className="text-sm text-muted-foreground">
                {companies.length} empresa{companies.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {companies.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca'
                  : 'Comece cadastrando sua primeira empresa'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeira Empresa
                </Button>
              )}
            </Card>
          ) : (
            companies.map((company) => (
              <Card key={company.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{company.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {CompanyService.formatCnpj(company.cnpj)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={company.status === 'ativo' ? 'default' : 'secondary'} 
                         className={company.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {company.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">{company.total_payroll_files}</span> holerites processados
                    {' • '}
                    <span className="font-medium">{company.files_this_month}</span> este mês
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(company)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManagePayrolls(company)}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Holerites
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(company)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <CompanyCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <CompanyEditModal
        isOpen={isEditModalOpen}
        company={selectedCompany}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCompany(null);
        }}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  Confirmar Exclusão
                </h3>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Tem certeza que deseja excluir a empresa <strong>{companyToDelete.name}</strong>?
                Esta ação não pode ser desfeita e todos os holerites associados também serão removidos.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};