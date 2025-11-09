import React, { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyService } from '../services/companyService';
import type { Company, UpdateCompanyData } from '../../shared/types/company';
import { useToast } from '@/hooks/use-toast';

interface CompanyEditModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CompanyEditModal: React.FC<CompanyEditModalProps> = ({
  isOpen,
  company,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<UpdateCompanyData>({
    name: '',
    cnpj: '',
    status: 'ativo'
  });
  const [errors, setErrors] = useState<Partial<UpdateCompanyData>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Preencher formulário quando empresa mudar
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        cnpj: CompanyService.formatCnpj(company.cnpj),
        status: company.status || 'ativo'
      });
      setErrors({});
    }
  }, [company]);

  const handleInputChange = (field: keyof UpdateCompanyData, value: string) => {
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
    const newErrors: Partial<UpdateCompanyData> = {};

    // Validar nome
    if (!formData.name?.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar CNPJ
    if (!formData.cnpj?.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!CompanyService.validateCnpj(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company || !validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Preparar dados para atualização
      const updateData: UpdateCompanyData = {
        name: formData.name?.trim(),
        cnpj: formData.cnpj ? CompanyService.cleanCnpj(formData.cnpj) : undefined,
        status: formData.status
      };

      await CompanyService.update(company.id, updateData);
      
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso",
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      
      let errorMessage = 'Erro desconhecido ao atualizar empresa';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes('CNPJ') || error.message.includes('cnpj')) {
          setErrors({ cnpj: error.message });
        } else if (error.message.includes('Sessão expirada') || error.message.includes('não autenticado')) {
          setErrors({ name: error.message });
          toast({
            title: "Erro de Autenticação",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setErrors({ name: error.message });
          toast({
            title: "Erro ao atualizar empresa",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao atualizar empresa",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (company) {
      setFormData({
        name: company.name,
        cnpj: CompanyService.formatCnpj(company.cnpj),
        status: company.status || 'ativo'
      });
    }
    setErrors({});
    onClose();
  };

  if (!isOpen || !company) return null;

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
              Editar Empresa
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
            <label htmlFor="edit-company-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Empresa *
            </label>
            <Input
              id="edit-company-name"
              type="text"
              value={formData.name || ''}
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
            <label htmlFor="edit-company-cnpj" className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ *
            </label>
            <Input
              id="edit-company-cnpj"
              type="text"
              value={formData.cnpj || ''}
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

          {/* Status */}
          <div>
            <label htmlFor="edit-company-status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={formData.status || 'ativo'}
              onValueChange={(value) => handleInputChange('status', value as 'ativo' | 'inativo')}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
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
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};