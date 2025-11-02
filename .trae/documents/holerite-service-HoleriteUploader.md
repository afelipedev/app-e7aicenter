# Utilize o código abaixo como referencia para criaçao do arquivo de serviço HoleriteUploader.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const HoleriteUploader = () => {
  const [file, setFile] = useState(null);
  const [competencia, setCompetencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // URL do webhook do n8n
  const WEBHOOK_URL = 'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-folha-pagamento';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Por favor, selecione um arquivo PDF válido');
      setFile(null);
    }
  };

  const handleCompetenciaChange = (e) => {
    const value = e.target.value;
    // Formatar automaticamente para MM/AAAA
    const formatted = value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .substr(0, 7);
    setCompetencia(formatted);
  };

  const validateCompetencia = (comp) => {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    return regex.test(comp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!file) {
      setError('Por favor, selecione um arquivo PDF');
      return;
    }
    
    if (!validateCompetencia(competencia)) {
      setError('Competência deve estar no formato MM/AAAA');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Preparar FormData
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('competencia', competencia);
    formData.append('nomeArquivo', file.name);

    try {
      // Enviar para o webhook
      const response = await axios.post(WEBHOOK_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 segundos de timeout
      });

      if (response.data.success) {
        setResult(response.data.data);
        
        // Fazer download automático do Excel
        if (response.data.data.arquivos?.excel?.url) {
          downloadFile(
            response.data.data.arquivos.excel.url,
            response.data.data.arquivos.excel.nome
          );
        }
      } else {
        throw new Error(response.data.message || 'Erro ao processar o arquivo');
      }
    } catch (err) {
      console.error('Erro:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Erro ao processar o arquivo. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (url, filename) => {
    // Criar link temporário para download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'holerite_processado.xlsx';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setFile(null);
    setCompetencia('');
    setResult(null);
    setError(null);
    // Resetar input de arquivo
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Extrator de Holerites
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Faça upload do PDF do holerite para extrair os dados
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de Competência */}
            <div>
              <label 
                htmlFor="competencia" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Competência (MM/AAAA)
              </label>
              <input
                id="competencia"
                type="text"
                value={competencia}
                onChange={handleCompetenciaChange}
                placeholder="03/2025"
                maxLength="7"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Upload de Arquivo */}
            <div>
              <label 
                htmlFor="file-upload" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Arquivo PDF do Holerite
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>Clique para selecionar</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">ou arraste aqui</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Apenas arquivos PDF
                  </p>
                </div>
              </div>
              {file && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2 text-green-500" />
                  {file.name}
                </div>
              )}
            </div>

            {/* Mensagens de Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading || !file || !competencia}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Enviar e Processar
                </>
              )}
            </button>
          </form>

          {/* Resultado do Processamento */}
          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Processamento concluído com sucesso!
                  </p>
                  <div className="mt-2 text-sm text-green-700">
                    <p>• Competência: {result.competencia}</p>
                    <p>• Total de proventos: {result.totalProventos}</p>
                    <p>• Valor total: R$ {result.resumo?.valorTotal?.toFixed(2)}</p>
                    <p>• Crédito total: R$ {result.resumo?.creditoTotal?.toFixed(2)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => downloadFile(
                        result.arquivos.excel.url,
                        result.arquivos.excel.nome
                      )}
                      className="inline-flex items-center px-3 py-1 border border-green-300 text-sm leading-5 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar Excel
                    </button>
                    <button
                      onClick={resetForm}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Processar Outro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações Adicionais */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>
            O arquivo será processado e você receberá automaticamente
            <br />
            uma planilha Excel com os dados extraídos e calculados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HoleriteUploader;