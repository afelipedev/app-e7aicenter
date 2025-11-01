import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { FirstAccessService } from '@/services/firstAccessService';
import { UserSyncService } from '@/services/userSyncService';

export const TestFirstAccess: React.FC = () => {
  const { user, firstAccessStatus, checkFirstAccessStatus, completeFirstAccess } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('test@example.com');

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testFirstAccessFlow = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔍 Iniciando teste do fluxo de primeiro acesso...');
      
      // 1. Testar verificação de status
      if (user) {
        addResult('✅ Usuário logado encontrado');
        
        const status = await FirstAccessService.checkFirstAccessStatus(user.id);
        addResult(`📊 Status atual: ${JSON.stringify(status)}`);
        
        // 2. Testar atualização do contexto
        await checkFirstAccessStatus();
        addResult(`🔄 Status no contexto: ${JSON.stringify(firstAccessStatus)}`);
        
        // 3. Se não completou primeiro acesso, simular conclusão
        if (!status.completed) {
          addResult('🚀 Simulando conclusão do primeiro acesso...');
          
          const completed = await completeFirstAccess();
          if (completed) {
            addResult('✅ Primeiro acesso completado com sucesso!');
          } else {
            addResult('❌ Falha ao completar primeiro acesso');
          }
        } else {
          addResult('ℹ️ Primeiro acesso já foi completado anteriormente');
        }
      } else {
        addResult('⚠️ Nenhum usuário logado para testar');
      }
      
      // 4. Testar diagnóstico de usuário
      addResult('🔍 Testando diagnóstico de usuário...');
      const diagnosis = await UserSyncService.diagnoseUser(testEmail);
      addResult(`📋 Diagnóstico: ${JSON.stringify(diagnosis, null, 2)}`);
      
      // 5. Testar busca de usuários que precisam de primeiro acesso
      addResult('👥 Buscando usuários que precisam de primeiro acesso...');
      const usersNeedingFirstAccess = await FirstAccessService.getUsersRequiringFirstAccess();
      addResult(`📊 Usuários encontrados: ${usersNeedingFirstAccess.length}`);
      
      addResult('🎉 Teste completo finalizado!');
      
    } catch (error) {
      addResult(`❌ Erro durante o teste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUserSync = async () => {
    setIsLoading(true);
    
    try {
      addResult('🔄 Testando sincronização de usuário...');
      
      const syncResult = await UserSyncService.syncUserWithAuth(testEmail);
      addResult(`📊 Resultado da sincronização: ${JSON.stringify(syncResult, null, 2)}`);
      
    } catch (error) {
      addResult(`❌ Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Teste do Sistema de Primeiro Acesso</CardTitle>
        <CardDescription>
          Ferramenta para testar todas as funcionalidades implementadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações do usuário atual */}
        <Alert>
          <AlertDescription>
            <strong>Usuário atual:</strong> {user ? `${user.name} (${user.email})` : 'Não logado'}
            <br />
            <strong>Status primeiro acesso:</strong> {firstAccessStatus ? JSON.stringify(firstAccessStatus) : 'Não verificado'}
          </AlertDescription>
        </Alert>

        {/* Campo para email de teste */}
        <div className="space-y-2">
          <Label htmlFor="testEmail">Email para teste de diagnóstico:</Label>
          <Input
            id="testEmail"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Digite um email para testar"
          />
        </div>

        {/* Botões de teste */}
        <div className="flex gap-4">
          <Button 
            onClick={testFirstAccessFlow}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Testando...' : '🚀 Testar Fluxo Completo'}
          </Button>
          
          <Button 
            onClick={testUserSync}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? 'Sincronizando...' : '🔄 Testar Sincronização'}
          </Button>
        </div>

        {/* Resultados dos testes */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <Label>📋 Resultados dos Testes:</Label>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};