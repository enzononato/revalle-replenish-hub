import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtocolosProvider } from "@/contexts/ProtocolosContext";
import { MotoristaAuthProvider } from "@/contexts/MotoristaAuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { GuidedTour } from "@/components/GuidedTour";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Protocolos from "./pages/Protocolos";
import Motoristas from "./pages/Motoristas";
import Clientes from "./pages/Clientes";
import Unidades from "./pages/Unidades";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import AbrirProtocolo from "./pages/AbrirProtocolo";
import MotoristaLogin from "./pages/MotoristaLogin";
import MotoristaPortal from "./pages/MotoristaPortal";

import LogsAuditoria from "./pages/LogsAuditoria";
import Chat from "./pages/Chat";
import LogsChat from "./pages/LogsChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <ProtocolosProvider>
          <MotoristaAuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <KeyboardShortcutsModal />
                <GuidedTour />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/abrir-protocolo" element={<AbrirProtocolo />} />
                  <Route path="/motorista" element={<Navigate to="/motorista/login" replace />} />
                  <Route path="/motorista/login" element={<MotoristaLogin />} />
                  <Route path="/motorista/portal" element={<MotoristaPortal />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/protocolos" element={<Protocolos />} />
                    <Route 
                      path="/motoristas" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'distribuicao']}>
                          <Motoristas />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/clientes" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'distribuicao']}>
                          <Clientes />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/unidades" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <Unidades />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/usuarios" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <Usuarios />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/configuracoes" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <Configuracoes />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/logs-auditoria" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <LogsAuditoria />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/chat" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'distribuicao', 'conferente']}>
                          <Chat />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/logs-chat" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <LogsChat />
                        </ProtectedRoute>
                      } 
                    />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </MotoristaAuthProvider>
        </ProtocolosProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
