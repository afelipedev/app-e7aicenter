import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  TrendingUp,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  RefreshCw,
  Plus,
  File
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { CompanyService } from '../services/companyService';
import { PayrollService } from '../services/payrollService';
import type { Company } from '../../shared/types/company';
import type { PayrollFile, PayrollStats } from '../../shared/types/payroll';

export const PayrollManagement: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [payrollFiles, setPayrollFiles] = useState<PayrollFile[]>([]);
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [competencia, setCompetencia] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Delete confirmation
  const [fileToDelete, setFileToDelete] = useState<PayrollFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [companyData, filesData, statsData] = await Promise.all([
        CompanyService.getById(companyId),
        PayrollService.getByCompanyId(companyId),
        PayrollService.getStats(companyId)
      ]);

      setCompany(companyData);
      setPayrollFiles(filesData);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      setUploadError('Apenas arquivos PDF são permitidos');
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Máximo permitido: 10MB');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !companyId || !competencia) {
      setUploadError('Selecione um arquivo e informe a competência');
      return;
    }

    // Validar formato de competência
    if (!PayrollService.validateCompetencia(competencia)) {
      setUploadError('Competência deve estar no formato MM/AAAA (ex: 12/2024)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await PayrollService.uploadPdf({
        file: selectedFile,
        competencia: competencia,
        company_id: companyId
      });
      
      // Limpar formulário
      setSelectedFile(null);
      setCompetencia('');
      
      // Recarregar dados após upload
      await loadData();
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro no upload do arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDeleteClick = (file: PayrollFile) => {
    setFileToDelete(file);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      await PayrollService.delete(fileToDelete.id);
      await loadData();
      setFileToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      setError(error instanceof Error ? error.message : 'Erro ao deletar arquivo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setFileToDelete(null);
  };

  const handleDownload = async (file: PayrollFile) => {
    try {
      if (!file.excel_url) {
        throw new Error('Arquivo Excel não disponível');
      }

      const url = await PayrollService.getDownloadUrl(file.excel_url);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.filename.replace('.pdf', '')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro no download:', error);
      setError(error instanceof Error ? error.message : 'Erro no download do arquivo');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Empresa não encontrada</h2>
          <button
            onClick={() => navigate('/companies')}
            className="text-blue-600 hover:text-blue-700"
          >
            Voltar para lista de empresas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/companies')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-gray-600">CNPJ: {CompanyService.formatCnpj(company.cnpj)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                  <p className="text-2xl font-bold text-foreground">{stats.files_this_week}</p>
                </div>
                <Calendar className="w-8 h-8 text-ai-blue" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-bold text-foreground">{stats.files_this_month}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-ai-green" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_files}</p>
                </div>
                <FileText className="w-8 h-8 text-ai-orange" />
              </div>
            </Card>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload de Holerites
            </h2>
          </div>
          
          <div className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Arraste um arquivo PDF aqui
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ou clique para selecionar um arquivo
                  </p>
                  
                  {/* Campo de competência */}
                  <div className="mb-4 w-full max-w-xs">
                    <label htmlFor="competencia" className="block text-sm font-medium text-gray-700 mb-2">
                      Competência (MM/AAAA)
                    </label>
                    <input
                      type="text"
                      id="competencia"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      placeholder="12/2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isUploading}
                    />
                  </div>

                  {/* Arquivo selecionado */}
                  {selectedFile && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{selectedFile.name}</span>
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  
                  <div className="flex gap-2">
                    <label
                      htmlFor="file-upload"
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Selecionar Arquivo
                    </label>
                    
                    {selectedFile && competencia && (
                      <button
                        onClick={handleFileUpload}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4" />
                        Enviar
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Máximo 10MB • Apenas arquivos PDF
                  </p>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700">{uploadError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Arquivos Importados
            </h2>
            <button
              onClick={loadData}
              className="px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>

          {payrollFiles.length === 0 ? (
            <div className="p-12 text-center">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum arquivo importado
              </h3>
              <p className="text-gray-500">
                Faça o upload do primeiro arquivo PDF de holerite
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arquivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Importação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competência
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-red-100 rounded-lg mr-3">
                            <File className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.filename}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {PayrollService.formatDate(file.created_at || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.competencia}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {PayrollService.formatFileSize(file.file_size || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.status === 'processed'
                            ? 'bg-green-100 text-green-800'
                            : file.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {file.status === 'processed' ? 'Processado' : 
                           file.status === 'processing' ? 'Processando' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {file.excel_url && PayrollService.canDownload(file) && (
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download XLSX"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(file)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar arquivo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar Exclusão
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir o arquivo <strong>{fileToDelete.filename}</strong>?
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};