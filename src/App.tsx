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
import Payroll from "./pages/documents/Payroll";
import Cases from "./pages/documents/Cases";
import Reports from "./pages/documents/Reports";
import PowerBI from "./pages/integrations/PowerBI";
import Trello from "./pages/integrations/Trello";
import CalendarIntegration from "./pages/integrations/CalendarIntegration";
import Users from "./pages/admin/Users";
import Companies from "./pages/admin/Companies";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
              
              {/* Documents - accessible to all authenticated users */}
              <Route path="/documents/payroll" element={<Payroll />} />
              <Route path="/documents/cases" element={<Cases />} />
              <Route path="/documents/reports" element={<Reports />} />
              
              {/* Integrations - accessible to all authenticated users */}
              <Route path="/integrations/powerbi" element={<PowerBI />} />
              <Route path="/integrations/trello" element={<Trello />} />
              <Route path="/integrations/calendar" element={<CalendarIntegration />} />
              
              {/* Admin routes - require admin permission */}
              <Route path="/admin/users" element={
                <ProtectedRoute requiredPermission="admin">
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/admin/companies" element={
                <ProtectedRoute requiredPermission="companies">
                  <Companies />
                </ProtectedRoute>
              } />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
