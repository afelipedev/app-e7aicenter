import React, { useState } from 'react';
import { X, Building2, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CompanyService } from '../services/companyService';
import type { CreateCompanyData } from '../../shared/types/company';
import { useToast } from '@/hooks/use-toast';

interface CompanyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company?: any) => void;
}

export const CompanyCreateModal: React.FC<CompanyCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateCompanyData>({
    name: '',
    cnpj: ''
  });
  const [errors, setErrors] = useState<Partial<CreateCompanyData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof CreateCompanyData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCnpjChange = (value: string) => {
    // Aplicar máscara de CNPJ
    const cleanValue = value.replace(/[^\d]/g, '');
    let maskedValue = cleanValue;

    if (cleanValue.length <= 14) {
      maskedValue = cleanValue
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }

    handleInputChange('cnpj', maskedValue);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateCompanyData> = {};

    // Validar nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar CNPJ
    if (!formData.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!CompanyService.validateCnpj(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Garantir que não há loading em andamento antes de iniciar
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    // Limpar erros anteriores
    setErrors({});

    try {
      // Limpar CNPJ antes de enviar
      const cleanedData = {
        ...formData,
        name: formData.name.trim(),
        cnpj: CompanyService.cleanCnpj(formData.cnpj)
      };

      const newCompany = await CompanyService.create(cleanedData);
      
      // Resetar formulário apenas se sucesso
      setFormData({ name: '', cnpj: '' });
      setErrors({});
      
      // Passar a empresa criada para o callback com estatísticas padrão
      const companyWithStats = {
        ...newCompany,
        total_payroll_files: 0,
        files_this_week: 0,
        files_this_month: 0
      };
      
      // Fechar modal e chamar callback de sucesso ANTES do toast
      onSuccess(companyWithStats);
      onClose();
      
      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      
      let errorMessage = 'Erro desconhecido ao criar empresa';
      let shouldShowToast = true;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Tratar diferentes tipos de erro
        if (error.message.includes('CNPJ') || error.message.includes('cnpj')) {
          setErrors({ cnpj: errorMessage });
          shouldShowToast = false; // Erro de validação não precisa de toast
        } else if (
          error.message.includes('Sessão expirada') || 
          error.message.includes('não autenticado') ||
          error.message.includes('expirou') ||
          error.message.includes('conexão')
        ) {
          setErrors({ name: errorMessage });
          toast({
            title: "Erro de Autenticação",
            description: errorMessage,
            variant: "destructive",
          });
          shouldShowToast = false; // Já mostrou toast
        } else {
          setErrors({ name: errorMessage });
        }
      }
      
      // Mostrar toast apenas se necessário
      if (shouldShowToast) {
        toast({
          title: "Erro ao criar empresa",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      // SEMPRE resetar o estado de loading, mesmo em caso de erro
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', cnpj: '' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Cadastrar Nova Empresa
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome da Empresa */}
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Empresa *
            </label>
            <Input
              id="company-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
              placeholder="Digite o nome da empresa"
              disabled={isLoading}
              maxLength={255}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* CNPJ */}
          <div>
            <label htmlFor="company-cnpj" className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ *
            </label>
            <Input
              id="company-cnpj"
              type="text"
              value={formData.cnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              className={errors.cnpj ? 'border-red-500' : ''}
              placeholder="00.000.000/0000-00"
              disabled={isLoading}
              maxLength={18}
            />
            {errors.cnpj && (
              <p className="mt-1 text-sm text-red-600">{errors.cnpj}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};