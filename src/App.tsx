import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import ChatGeneral from "./pages/assistants/ChatGeneral";
import TaxLaw from "./pages/assistants/TaxLaw";
import CivilLaw from "./pages/assistants/CivilLaw";
import Financial from "./pages/assistants/Financial";
import Accounting from "./pages/assistants/Accounting";
import AILibrary from "./pages/assistants/AILibrary";
import AgentsByTheme from "./pages/assistants/AgentsByTheme";
import AgentChat from "./pages/assistants/AgentChat";
import Payroll from "./pages/documents/Payroll";
import Sped from "./pages/documents/Sped";
import Cases from "./pages/documents/Cases";
import Reports from "./pages/documents/Reports";
import PowerBI from "./pages/integrations/PowerBI";
import Trello from "./pages/integrations/Trello";
import CalendarIntegration from "./pages/integrations/CalendarIntegration";
import Users from "./pages/admin/Users";
import { Companies as CompaniesManagement } from "./pages/Companies";
import { PayrollManagement } from "./pages/PayrollManagement";
import { PayrollProcessingDetails } from "./components/payroll/PayrollProcessingDetails";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { TestPage } from "./pages/TestPage";
import { TestPayrollWorkflow } from "./pages/TestPayrollWorkflow";
import Leads from "./pages/leads/Leads";
import LeadTemplates from "./pages/leads/Templates";

// Configuração do QueryClient com cache otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      // Manter dados em cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Refetch quando a janela recebe foco
      refetchOnWindowFocus: true,
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
      // Não refetch automaticamente em background
      refetchOnMount: true,
      // Retry 3 vezes em caso de erro
      retry: 3,
      // Tempo entre retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations apenas 1 vez
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              
              {/* Assistants - accessible to all authenticated users */}
              <Route path="/assistants/chat" element={<ChatGeneral />} />
              <Route path="/assistants/tax" element={<TaxLaw />} />
              <Route path="/assistants/civil" element={<CivilLaw />} />
              <Route path="/assistants/financial" element={<Financial />} />
              <Route path="/assistants/accounting" element={<Accounting />} />
              
              {/* AI Library - accessible to all authenticated users */}
              <Route path="/assistants/library" element={<AILibrary />} />
              <Route path="/assistants/library/:themeId" element={<AgentsByTheme />} />
              <Route path="/assistants/library/agent/:agentId" element={<AgentChat />} />
              
              {/* Documents - accessible to all authenticated users */}
              <Route path="/documents/payroll" element={<Payroll />} />
              <Route path="/documents/sped" element={<Sped />} />
              <Route path="/documents/cases" element={<Cases />} />
              <Route path="/documents/reports" element={<Reports />} />
              
              {/* Payroll Processing Details */}
              <Route path="/payroll/processing/:processingId" element={<PayrollProcessingDetails />} />
              
              {/* Integrations - accessible to all authenticated users */}
              <Route path="/integrations/powerbi" element={<PowerBI />} />
              <Route path="/integrations/trello" element={<Trello />} />
              <Route path="/integrations/calendar" element={<CalendarIntegration />} />

              {/* Leads - accessible to all authenticated users */}
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/templates" element={<LeadTemplates />} />
              
              {/* Company Management - require companies permission */}
              <Route path="/companies" element={
                <ProtectedRoute requiredPermission="companies">
                  <CompaniesManagement />
                </ProtectedRoute>
              } />
              <Route path="/companies/:companyId/payrolls" element={<PayrollManagement />} />
              
              {/* Admin routes - require admin permission */}
              <Route path="/admin" element={
                <ProtectedRoute requiredPermission="admin">
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requiredPermission="admin">
                  <Users />
                </ProtectedRoute>
              } />
              
              {/* Test pages - accessible to all authenticated users */}
              <Route path="/test" element={<TestPage />} />
              <Route path="/test/payroll-workflow" element={<TestPayrollWorkflow />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
