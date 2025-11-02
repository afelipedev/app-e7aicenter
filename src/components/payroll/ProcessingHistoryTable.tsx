import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter,
  Download,
  Eye,
  Calendar,
  Building,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader
} from "lucide-react";
import type { 
  ProcessingHistory, 
  ProcessingFilters, 
  ProcessingSort, 
  PaginatedResult 
} from "@/shared/types/payroll";

interface ProcessingHistoryTableProps {
  data: PaginatedResult<ProcessingHistory>;
  filters: ProcessingFilters;
  sort: ProcessingSort;
  loading: boolean;
  onFiltersChange: (filters: ProcessingFilters) => void;
  onSortChange: (sort: ProcessingSort) => void;
  onPageChange: (page: number) => void;
  onViewDetails: (processingId: string) => void;
  onDownload: (processingId: string) => void;
}

export function ProcessingHistoryTable({
  data,
  filters,
  sort,
  loading,
  onFiltersChange,
  onSortChange,
  onPageChange,
  onViewDetails,
  onDownload
}: ProcessingHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600">Concluído</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600">Processando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchTerm });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSortChange = (field: string) => {
    const newDirection = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction: newDirection });
  };

  const getSortIcon = (field: string) => {
    if (sort.field !== field) return null;
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por empresa, competência ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ 
                ...filters, 
                status: value === 'all' ? undefined : value 
              })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.company || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ 
                ...filters, 
                company: value === 'all' ? undefined : value 
              })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="empresa-a">Empresa A</SelectItem>
              <SelectItem value="empresa-b">Empresa B</SelectItem>
              <SelectItem value="empresa-c">Empresa C</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleSearch}>
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSortChange('created_at')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data {getSortIcon('created_at')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSortChange('company')}
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Empresa {getSortIcon('company')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSortChange('competencia')}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Competência {getSortIcon('competencia')}
                </div>
              </TableHead>
              <TableHead>Arquivos</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSortChange('status')}
              >
                <div className="flex items-center gap-2">
                  Status {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Carregando histórico...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum processamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((processing) => (
                <TableRow key={processing.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(processing.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{processing.company}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{processing.competencia}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {processing.total_files} arquivo(s)
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(processing.status)}
                      {getStatusBadge(processing.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(processing.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {processing.status === 'completed' && processing.excel_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(processing.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {((data.currentPage - 1) * data.pageSize) + 1} a{' '}
            {Math.min(data.currentPage * data.pageSize, data.totalItems)} de{' '}
            {data.totalItems} resultados
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.currentPage - 1)}
              disabled={data.currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const page = i + 1;
                const isCurrentPage = page === data.currentPage;
                
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
              
              {data.totalPages > 5 && (
                <>
                  <span className="text-gray-400">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(data.totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {data.totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.currentPage + 1)}
              disabled={data.currentPage === data.totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}