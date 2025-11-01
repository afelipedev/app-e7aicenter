import React from 'react';
import { TestFirstAccess } from '@/components/TestFirstAccess';

export const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Página de Testes
          </h1>
          <p className="text-gray-600">
            Teste todas as funcionalidades do sistema de primeiro acesso e auditoria
          </p>
        </div>
        
        <TestFirstAccess />
      </div>
    </div>
  );
};