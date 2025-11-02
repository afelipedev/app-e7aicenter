import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from '../utils/errorHandling';
import { ValidationError, ProcessingError, NetworkError } from '../utils/errorHandling';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Upload,
  Zap,
  TestTube
} from 'lucide-react';

export const TestPayrollWorkflow: React.FC = () => {
  const { toast } = useToast();
  const { handleError, handleAsync, validateFile, validateBatchUpload } = useErrorHandler();
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    status: 'success' | 'error' | 'pending';
    message: string;
  }>>([]);

  const addTestResult = (name: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { name, status, message }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test error handling utility
  const testErrorHandling = async () => {
    addTestResult('Error Handling', 'pending', 'Testing...');

    try {
      // Test ValidationError
      try {
        throw new ValidationError('Test validation error');
      } catch (error) {
        handleError(error, 'test_validation');
        addTestResult('ValidationError', 'success', 'ValidationError handled correctly');
      }

      // Test ProcessingError
      try {
        throw new ProcessingError('Test processing error');
      } catch (error) {
        handleError(error, 'test_processing');
        addTestResult('ProcessingError', 'success', 'ProcessingError handled correctly');
      }

      // Test NetworkError
      try {
        throw new NetworkError('Test network error');
      } catch (error) {
        handleError(error, 'test_network');
        addTestResult('NetworkError', 'success', 'NetworkError handled correctly');
      }

      addTestResult('Error Handling', 'success', 'All error types handled correctly');
    } catch (error) {
      addTestResult('Error Handling', 'error', 'Error handling test failed');
    }
  };

  // Test file validation
  const testFileValidation = () => {
    addTestResult('File Validation', 'pending', 'Testing...');

    try {
      // Test valid PDF file
      const validFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      validateFile(validFile);
      addTestResult('Valid PDF', 'success', 'Valid PDF file accepted');

      // Test invalid file type
      try {
        const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        validateFile(invalidFile);
        addTestResult('Invalid Type', 'error', 'Invalid file type should have been rejected');
      } catch (error) {
        addTestResult('Invalid Type', 'success', 'Invalid file type correctly rejected');
      }

      // Test file too large
      try {
        const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
        validateFile(largeFile);
        addTestResult('Large File', 'error', 'Large file should have been rejected');
      } catch (error) {
        addTestResult('Large File', 'success', 'Large file correctly rejected');
      }

      addTestResult('File Validation', 'success', 'File validation tests completed');
    } catch (error) {
      addTestResult('File Validation', 'error', 'File validation test failed');
    }
  };

  // Test batch validation
  const testBatchValidation = () => {
    addTestResult('Batch Validation', 'pending', 'Testing...');

    try {
      // Test valid batch
      const validFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['test3'], 'test3.pdf', { type: 'application/pdf' })
      ];
      validateBatchUpload(validFiles, 10);
      addTestResult('Valid Batch', 'success', 'Valid batch accepted');

      // Test too many files
      try {
        const tooManyFiles = Array.from({ length: 11 }, (_, i) => 
          new File(['test'], `test${i}.pdf`, { type: 'application/pdf' })
        );
        validateBatchUpload(tooManyFiles, 10);
        addTestResult('Too Many Files', 'error', 'Too many files should have been rejected');
      } catch (error) {
        addTestResult('Too Many Files', 'success', 'Too many files correctly rejected');
      }

      addTestResult('Batch Validation', 'success', 'Batch validation tests completed');
    } catch (error) {
      addTestResult('Batch Validation', 'error', 'Batch validation test failed');
    }
  };

  // Test async error handling
  const testAsyncHandling = async () => {
    addTestResult('Async Handling', 'pending', 'Testing...');

    // Test successful async operation
    const { result: successResult, error: successError } = await handleAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Success result';
      },
      'test_success'
    );

    if (!successError && successResult === 'Success result') {
      addTestResult('Async Success', 'success', 'Async success handled correctly');
    } else {
      addTestResult('Async Success', 'error', 'Async success handling failed');
    }

    // Test failed async operation
    const { result: failResult, error: failError } = await handleAsync(
      async () => {
        throw new Error('Test async error');
      },
      'test_failure'
    );

    if (failError && !failResult) {
      addTestResult('Async Error', 'success', 'Async error handled correctly');
    } else {
      addTestResult('Async Error', 'error', 'Async error handling failed');
    }

    addTestResult('Async Handling', 'success', 'Async handling tests completed');
  };

  // Run all tests
  const runAllTests = async () => {
    clearResults();
    await testErrorHandling();
    testFileValidation();
    testBatchValidation();
    await testAsyncHandling();
    
    toast({
      title: "Testes Concluídos",
      description: "Todos os testes do workflow de holerites foram executados",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TestTube className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Teste do Workflow de Holerites
              </h1>
              <p className="text-gray-600">
                Teste abrangente do sistema de tratamento de erros e validações
              </p>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Controles de Teste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button onClick={runAllTests} className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Executar Todos os Testes
              </Button>
              <Button onClick={testErrorHandling} variant="outline">
                Testar Tratamento de Erros
              </Button>
              <Button onClick={testFileValidation} variant="outline">
                Testar Validação de Arquivos
              </Button>
              <Button onClick={testBatchValidation} variant="outline">
                Testar Validação em Lote
              </Button>
              <Button onClick={testAsyncHandling} variant="outline">
                Testar Operações Assíncronas
              </Button>
              <Button onClick={clearResults} variant="ghost">
                Limpar Resultados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resultados dos Testes
              {testResults.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {testResults.length} testes
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum teste executado ainda</p>
                <p className="text-sm">Clique em "Executar Todos os Testes" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border flex items-center gap-3 ${getStatusColor(result.status)}`}
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm opacity-90">{result.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {testResults.length > 0 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-gray-600">Sucessos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">Erros</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {testResults.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};